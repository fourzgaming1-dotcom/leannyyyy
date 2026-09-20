import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "wallet_store.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory + persistent store interface
interface Transaction {
  id: string;
  telegramId: number;
  type: 'deposit' | 'withdrawal' | 'adjustment';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  description: string;
  createdAt: string;
}

interface UserWallet {
  telegramId: number;
  username?: string;
  firstName: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  transactions: Transaction[];
}

interface DBStore {
  wallets: Record<string, UserWallet>;
  processedSessions: Record<string, boolean>;
}

// Load store from disk or initialize
function loadStore(): DBStore {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading store from disk, initializing new store:", err);
  }
  return { wallets: {}, processedSessions: {} };
}

const db: DBStore = loadStore();

function saveStore() {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving store to disk:", err);
  }
}

// SSE Listeners for real-time instant balance push
type SSEClient = {
  res: Response;
  telegramId: number;
};
const sseClients: Set<SSEClient> = new Set();

function broadcastToUser(telegramId: number, event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of sseClients) {
    if (client.telegramId === telegramId) {
      try {
        client.res.write(payload);
      } catch (err) {
        console.error("Failed writing to SSE client:", err);
      }
    }
  }
}

// Lazy Stripe initialization
let stripeInstance: Stripe | null = null;
function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeInstance) {
    stripeInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as any,
    });
  }
  return stripeInstance;
}

// Helper to get or create wallet
function getOrCreateWallet(telegramId: number, firstName = "Telegram User", username?: string): UserWallet {
  const key = String(telegramId);
  if (!db.wallets[key]) {
    db.wallets[key] = {
      telegramId,
      username: username || "",
      firstName: firstName || `User ${telegramId}`,
      balance: 0.0,
      currency: "GBP",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      transactions: [],
    };
    saveStore();
  } else {
    // Ensure currency is GBP
    if (db.wallets[key].currency !== "GBP") {
      db.wallets[key].currency = "GBP";
    }
    // Update name/username if provided
    if (firstName && firstName !== "Telegram User") {
      db.wallets[key].firstName = firstName;
    }
    if (username) {
      db.wallets[key].username = username;
    }
  }
  return db.wallets[key];
}

// Credit user wallet
function creditWallet(
  telegramId: number,
  amount: number,
  currency: string,
  description: string,
  stripeSessionId?: string,
  stripePaymentIntentId?: string
): { wallet: UserWallet; transaction: Transaction } {
  const wallet = getOrCreateWallet(telegramId);
  
  // Format amount to 2 decimal places
  const cleanAmount = Math.round(amount * 100) / 100;
  wallet.balance = Math.round((wallet.balance + cleanAmount) * 100) / 100;
  wallet.currency = currency.toUpperCase();
  wallet.updatedAt = new Date().toISOString();

  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    telegramId,
    type: 'deposit',
    amount: cleanAmount,
    currency: wallet.currency,
    status: 'completed',
    stripeSessionId,
    stripePaymentIntentId,
    description,
    createdAt: new Date().toISOString(),
  };

  wallet.transactions.unshift(transaction);
  if (stripeSessionId) {
    db.processedSessions[stripeSessionId] = true;
  }
  saveStore();

  // Instant notification via SSE
  broadcastToUser(telegramId, "BALANCE_UPDATED", {
    balance: wallet.balance,
    currency: wallet.currency,
    transaction,
  });

  return { wallet, transaction };
}

async function startServer() {
  const app = express();

  app.use(cors());

  // Webhook needs raw body parser for Stripe signature verification
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req: Request, res: Response) => {
      const sig = req.headers["stripe-signature"] as string | undefined;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      const stripe = getStripe();

      let event: Stripe.Event;

      try {
        if (stripe && webhookSecret && sig) {
          event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } else {
          // If no webhook secret configured or testing without webhook secret
          event = JSON.parse(req.body.toString());
        }
      } catch (err: any) {
        console.error(`⚠️ Webhook signature verification failed:`, err.message);
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
      }

      // Handle the event
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionId = session.id;

        // Check if already processed to prevent double crediting
        if (db.processedSessions[sessionId]) {
          console.log(`Session ${sessionId} already processed`);
          res.json({ received: true, message: "Already processed" });
          return;
        }

        const telegramIdStr = session.metadata?.telegramId;
        const telegramId = telegramIdStr ? parseInt(telegramIdStr, 10) : null;
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const currency = (session.currency || "usd").toUpperCase();

        if (telegramId && amountTotal > 0) {
          console.log(`💳 Stripe Checkout Completed: Crediting $${amountTotal} ${currency} to Telegram user ${telegramId}`);
          creditWallet(
            telegramId,
            amountTotal,
            currency,
            `Stripe Deposit (Card / Apple Pay / Google Pay)`,
            sessionId,
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined
          );
        }
      } else if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const telegramIdStr = paymentIntent.metadata?.telegramId;
        const telegramId = telegramIdStr ? parseInt(telegramIdStr, 10) : null;
        const amountTotal = paymentIntent.amount ? paymentIntent.amount / 100 : 0;
        const currency = (paymentIntent.currency || "usd").toUpperCase();

        if (telegramId && amountTotal > 0 && !db.processedSessions[paymentIntent.id]) {
          creditWallet(
            telegramId,
            amountTotal,
            currency,
            `Stripe Payment Intent Deposit`,
            undefined,
            paymentIntent.id
          );
        }
      }

      res.json({ received: true });
    }
  );

  // Standard JSON middleware for other routes
  app.use(express.json());

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Server configuration
  app.get("/api/config", (req, res) => {
    const stripeKey = process.env.STRIPE_SECRET_KEY || "";
    const isConfigured = Boolean(stripeKey && stripeKey.length > 5);
    const isLive = stripeKey.startsWith("sk_live_");
    const isTest = stripeKey.startsWith("sk_test_");

    let mode: 'live' | 'test' | 'simulated' = 'simulated';
    if (isLive) mode = 'live';
    else if (isTest) mode = 'test';

    // Get current app URL
    const host = req.get("host") || `localhost:${PORT}`;
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const appUrl = process.env.APP_URL || `${protocol}://${host}`;

    res.json({
      hasStripeKey: isConfigured,
      stripeMode: mode,
      appUrl,
      webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      hasTelegramToken: Boolean(process.env.TELEGRAM_BOT_TOKEN),
    });
  });

  // SSE Stream for instant balance updates
  app.get("/api/wallet/events/:telegramId", (req, res) => {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (!telegramId || isNaN(telegramId)) {
      res.status(400).send("Invalid Telegram ID");
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const client: SSEClient = { res, telegramId };
    sseClients.add(client);

    // Send initial ping
    res.write(`event: CONNECTED\ndata: ${JSON.stringify({ message: "Live balance stream connected", telegramId })}\n\n`);

    req.on("close", () => {
      sseClients.delete(client);
    });
  });

  // Get user wallet
  app.get("/api/user/:telegramId", (req, res) => {
    const telegramId = parseInt(req.params.telegramId, 10);
    if (!telegramId || isNaN(telegramId)) {
      res.status(400).json({ error: "Invalid Telegram ID" });
      return;
    }

    const firstName = (req.query.firstName as string) || "Telegram User";
    const username = (req.query.username as string) || "";
    const wallet = getOrCreateWallet(telegramId, firstName, username);

    res.json(wallet);
  });

  // Create Stripe Checkout Session
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { telegramId, amount, currency = "GBP", firstName, username } = req.body;
      const numericId = parseInt(telegramId, 10);
      const numericAmount = parseFloat(amount);

      if (!numericId || isNaN(numericId)) {
        res.status(400).json({ error: "Valid telegramId is required" });
        return;
      }

      if (!numericAmount || isNaN(numericAmount) || numericAmount < 1) {
        res.status(400).json({ error: "Amount must be at least £1.00" });
        return;
      }

      const host = req.get("host") || `localhost:${PORT}`;
      const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;

      const stripe = getStripe();

      // If Stripe is not configured or in sandbox simulation
      if (!stripe) {
        // Return simulated checkout session
        const mockSessionId = `mock_sess_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        res.json({
          simulated: true,
          sessionId: mockSessionId,
          checkoutUrl: `${appUrl}/?session_id=${mockSessionId}&simulated=true&amount=${numericAmount}&currency=${currency}&tg_id=${numericId}`,
          message: "Stripe key not configured. Simulated instant checkout prepared.",
        });
        return;
      }

      const cleanCurrency = (currency || "gbp").toLowerCase();
      const amountInCents = Math.round(numericAmount * 100);

      // Create genuine Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: cleanCurrency,
              product_data: {
                name: `Wallet Deposit: £${numericAmount.toFixed(2)} (${cleanCurrency.toUpperCase()})`,
                description: `Instant deposit to Telegram Wallet for user @${username || numericId}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}&tg_id=${numericId}&status=success`,
        cancel_url: `${appUrl}/?status=cancelled&tg_id=${numericId}`,
        metadata: {
          telegramId: String(numericId),
          firstName: firstName || "",
          username: username || "",
          depositAmount: String(numericAmount),
        },
      });

      res.json({
        sessionId: session.id,
        checkoutUrl: session.url,
        simulated: false,
      });
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      res.status(500).json({ error: err.message || "Failed to create Stripe Checkout session" });
    }
  });

  // Verify and credit session upon client return (handles instant crediting even without webhooks)
  app.post("/api/stripe/verify-session", async (req, res) => {
    try {
      const { sessionId, telegramId } = req.body;
      const numericId = parseInt(telegramId, 10);

      if (!sessionId || !numericId) {
        res.status(400).json({ error: "sessionId and telegramId are required" });
        return;
      }

      // Check if already processed
      if (db.processedSessions[sessionId]) {
        const wallet = getOrCreateWallet(numericId);
        res.json({
          success: true,
          alreadyCredited: true,
          wallet,
          message: "Session was already credited.",
        });
        return;
      }

      // If simulated session
      if (sessionId.startsWith("mock_sess_")) {
        const amount = parseFloat(req.body.amount || "25");
        const currency = req.body.currency || "GBP";
        const result = creditWallet(
          numericId,
          amount,
          currency,
          `Demo Instant Deposit (Simulated Stripe £${amount.toFixed(2)})`,
          sessionId
        );
        res.json({
          success: true,
          simulated: true,
          wallet: result.wallet,
          transaction: result.transaction,
          message: "Simulated deposit credited instantly!",
        });
        return;
      }

      const stripe = getStripe();
      if (!stripe) {
        res.status(400).json({ error: "Stripe not configured on server" });
        return;
      }

      // Retrieve real session from Stripe
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const currency = (session.currency || "usd").toUpperCase();
        const metaId = session.metadata?.telegramId ? parseInt(session.metadata.telegramId, 10) : numericId;

        const result = creditWallet(
          metaId,
          amountTotal,
          currency,
          `Stripe Checkout Deposit`,
          sessionId,
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined
        );

        res.json({
          success: true,
          wallet: result.wallet,
          transaction: result.transaction,
          message: "Stripe payment verified! Funds credited instantly.",
        });
      } else {
        res.status(400).json({
          success: false,
          status: session.payment_status,
          message: "Payment has not been completed yet.",
        });
      }
    } catch (err: any) {
      console.error("Error verifying session:", err);
      res.status(500).json({ error: err.message || "Failed to verify session" });
    }
  });

  // Instant Instant Test Deposit endpoint (for immediate testing in Mini App)
  app.post("/api/wallet/test-deposit", (req, res) => {
    const { telegramId, amount = 25, currency = "GBP" } = req.body;
    const numericId = parseInt(telegramId, 10);
    const numericAmount = parseFloat(amount);

    if (!numericId || isNaN(numericId)) {
      res.status(400).json({ error: "Valid telegramId is required" });
      return;
    }

    const mockSessionId = `test_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const result = creditWallet(
      numericId,
      numericAmount,
      currency,
      `Instant Test Deposit (£${numericAmount.toFixed(2)})`,
      mockSessionId
    );

    res.json({
      success: true,
      wallet: result.wallet,
      transaction: result.transaction,
      message: "Test funds added instantly!",
    });
  });

  // Serve production build if dist/index.html exists; otherwise use Vite middleware
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));

  if (process.env.NODE_ENV === "production" && hasDist) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Telegram Stripe Wallet server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
