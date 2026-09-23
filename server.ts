import express from "express";
import type { Request, Response } from "express";
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
  purchasedGroups?: string[];
}

export interface GroupConfig {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  tag?: string;
  defaultLink: string;
}

// User's 9 groups for sale
export const DEFAULT_GROUPS: GroupConfig[] = [
  {
    id: "all-groups",
    name: "All Groups Access",
    price: 50,
    currency: "GBP",
    description: "Complete master access to every single exclusive group",
    tag: "BEST VALUE",
    defaultLink: "https://t.me/+AllGroupsMasterVIP",
  },
  {
    id: "baller-bundle",
    name: "Baller Bundle",
    price: 30,
    currency: "GBP",
    description: "Full Baller tier bundle access package",
    tag: "POPULAR",
    defaultLink: "https://t.me/+BallerBundleVIP",
  },
  {
    id: "ebony",
    name: "Ebony",
    price: 10,
    currency: "GBP",
    description: "Exclusive Ebony group access",
    defaultLink: "https://t.me/+EbonyVIPAccess",
  },
  {
    id: "chav",
    name: "Chav",
    price: 10,
    currency: "GBP",
    description: "Exclusive Chav group access",
    defaultLink: "https://t.me/+ChavVIPAccess",
  },
  {
    id: "desi",
    name: "Desi",
    price: 10,
    currency: "GBP",
    description: "Exclusive Desi group access",
    defaultLink: "https://t.me/+DesiVIPAccess",
  },
  {
    id: "british",
    name: "British",
    price: 10,
    currency: "GBP",
    description: "Exclusive British group access",
    defaultLink: "https://t.me/+BritishVIPAccess",
  },
  {
    id: "scottish",
    name: "Scottish",
    price: 10,
    currency: "GBP",
    description: "Exclusive Scottish group access",
    defaultLink: "https://t.me/+ScottishVIPAccess",
  },
  {
    id: "irish",
    name: "Irish",
    price: 10,
    currency: "GBP",
    description: "Exclusive Irish group access",
    defaultLink: "https://t.me/+IrishVIPAccess",
  },
  {
    id: "baller-group",
    name: "Baller Group",
    price: 5,
    currency: "GBP",
    description: "Direct Baller community access",
    defaultLink: "https://t.me/+BallerGroupAccess",
  },
];

interface DBStore {
  wallets: Record<string, UserWallet>;
  processedSessions: Record<string, boolean>;
  groupLinks: Record<string, string>;
  userPurchases: Record<string, string[]>;
}

// Load store from disk or initialize
function loadStore(): DBStore {
  const initialLinks: Record<string, string> = {};
  for (const g of DEFAULT_GROUPS) {
    initialLinks[g.id] = g.defaultLink;
  }

  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return {
        wallets: parsed.wallets || {},
        processedSessions: parsed.processedSessions || {},
        groupLinks: { ...initialLinks, ...(parsed.groupLinks || {}) },
        userPurchases: parsed.userPurchases || {},
      };
    }
  } catch (err) {
    console.error("Error reading store from disk, initializing new store:", err);
  }
  return { wallets: {}, processedSessions: {}, groupLinks: initialLinks, userPurchases: {} };
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
  const key = process.env.STRIPE_SECRET_KEY;console.log("Stripe key loaded:", !!key);
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

// Unlock group access for Telegram user
function unlockGroup(telegramId: number, groupId: string): { success: boolean; group?: GroupConfig; inviteLink?: string } {
  const group = DEFAULT_GROUPS.find((g) => g.id === groupId);
  if (!group) return { success: false };

  const key = String(telegramId);
  if (!db.userPurchases[key]) {
    db.userPurchases[key] = [];
  }

  // If all-groups is purchased, unlock all groups
  if (groupId === "all-groups") {
    for (const g of DEFAULT_GROUPS) {
      if (!db.userPurchases[key].includes(g.id)) {
        db.userPurchases[key].push(g.id);
      }
    }
  } else {
    if (!db.userPurchases[key].includes(groupId)) {
      db.userPurchases[key].push(groupId);
    }
  }

  const wallet = getOrCreateWallet(telegramId);
  wallet.purchasedGroups = Array.from(new Set([...(wallet.purchasedGroups || []), ...db.userPurchases[key]]));
  wallet.updatedAt = new Date().toISOString();
  saveStore();

  const inviteLink = db.groupLinks[groupId] || group.defaultLink;

  broadcastToUser(telegramId, "GROUP_PURCHASED", {
    groupId,
    groupName: group.name,
    inviteLink,
    purchasedGroups: db.userPurchases[key],
  });

  return { success: true, group, inviteLink };
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
        const currency = (session.currency || "gbp").toUpperCase();
        const groupId = session.metadata?.groupId;

        if (telegramId && amountTotal > 0) {
          console.log(`💳 Stripe Checkout Completed: Crediting $${amountTotal} ${currency} to Telegram user ${telegramId}`);
          if (groupId) {
            unlockGroup(telegramId, groupId);
          }
          creditWallet(
            telegramId,
            amountTotal,
            currency,
            groupId ? `Stripe Purchase: Group ${groupId}` : `Stripe Deposit (Card / Apple Pay / Google Pay)`,
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

  // Create Stripe Checkout Session (Real Stripe - no simulated free money)
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      const { telegramId, amount, currency = "GBP", firstName, username, groupId } = req.body;
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

      const stripe = getStripe();
      if (!stripe) {
        res.status(400).json({
          error: "Stripe is not configured yet on your server. Please add your STRIPE_SECRET_KEY (sk_live_... or sk_test_...) into your Render environment variables or .env file to enable real payments.",
          configured: false,
        });
        return;
      }

      const host = req.get("host") || `localhost:${PORT}`;
      const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const appUrl = process.env.APP_URL || `${protocol}://${host}`;

      const cleanCurrency = (currency || "gbp").toLowerCase();
      const amountInCents = Math.round(numericAmount * 100);

      const targetGroup = groupId ? DEFAULT_GROUPS.find((g) => g.id === groupId) : null;
      const productName = targetGroup
        ? `VIP Group: ${targetGroup.name} (£${numericAmount.toFixed(2)})`
        : `Wallet Deposit: £${numericAmount.toFixed(2)} (${cleanCurrency.toUpperCase()})`;
      const productDesc = targetGroup
        ? `Instant Telegram VIP group access link for @${username || numericId}`
        : `Instant balance deposit to Telegram Wallet for @${username || numericId}`;

      // Create genuine Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: cleanCurrency,
              product_data: {
                name: productName,
                description: productDesc,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}&tg_id=${numericId}&status=success${groupId ? `&unlocked=${groupId}` : ""}`,
        cancel_url: `${appUrl}/?status=cancelled&tg_id=${numericId}`,
        metadata: {
          telegramId: String(numericId),
          firstName: firstName || "",
          username: username || "",
          depositAmount: String(numericAmount),
          groupId: groupId || "",
        },
      });

      res.json({
        sessionId: session.id,
        checkoutUrl: session.url,
      });
    } catch (err: any) {
      console.error("Error creating checkout session:", err);
      res.status(500).json({ error: err.message || "Failed to create Stripe Checkout session" });
    }
  });

  // Verify and credit session upon client return (requires real paid Stripe session)
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

      const stripe = getStripe();
      if (!stripe) {
        res.status(400).json({ error: "Stripe not configured on server" });
        return;
      }

      // Retrieve real session from Stripe API
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status === "paid") {
        const amountTotal = session.amount_total ? session.amount_total / 100 : 0;
        const currency = (session.currency || "gbp").toUpperCase();
        const metaId = session.metadata?.telegramId ? parseInt(session.metadata.telegramId, 10) : numericId;
        const groupId = session.metadata?.groupId;

        let unlockedGroup = null;
        if (groupId) {
          unlockedGroup = unlockGroup(metaId, groupId);
        }

        const result = creditWallet(
          metaId,
          amountTotal,
          currency,
          groupId ? `Stripe Purchase: ${unlockedGroup?.group?.name || groupId}` : `Stripe Card / Apple Pay Deposit`,
          sessionId,
          typeof session.payment_intent === 'string' ? session.payment_intent : undefined
        );

        res.json({
          success: true,
          wallet: result.wallet,
          transaction: result.transaction,
          unlockedGroup,
          message: "Stripe payment verified! Funds & access granted instantly.",
        });
      } else {
        res.status(400).json({
          success: false,
          status: session.payment_status,
          message: "Payment has not been completed yet on Stripe.",
        });
      }
    } catch (err: any) {
      console.error("Error verifying session:", err);
      res.status(500).json({ error: err.message || "Failed to verify session" });
    }
  });

  // Get all groups and user's purchase status
  app.get("/api/groups", (req, res) => {
    const telegramIdStr = req.query.telegramId as string;
    const numericId = telegramIdStr ? parseInt(telegramIdStr, 10) : null;
    const key = numericId ? String(numericId) : "";
    const userPurchases = key && db.userPurchases[key] ? db.userPurchases[key] : [];

    const groups = DEFAULT_GROUPS.map((g) => {
      const isPurchased = userPurchases.includes(g.id);
      const inviteLink = isPurchased ? (db.groupLinks[g.id] || g.defaultLink) : undefined;
      return {
        id: g.id,
        name: g.name,
        price: g.price,
        currency: g.currency,
        description: g.description,
        tag: g.tag,
        isPurchased,
        inviteLink,
      };
    });

    res.json({ groups, purchasedCount: userPurchases.length });
  });

  // Purchase group with wallet balance
  app.post("/api/groups/purchase", (req, res) => {
    try {
      const { telegramId, groupId } = req.body;
      const numericId = parseInt(telegramId, 10);
      if (!numericId || !groupId) {
        res.status(400).json({ error: "telegramId and groupId are required" });
        return;
      }

      const group = DEFAULT_GROUPS.find((g) => g.id === groupId);
      if (!group) {
        res.status(404).json({ error: "Group not found" });
        return;
      }

      const key = String(numericId);
      const userPurchases = db.userPurchases[key] || [];

      // If already purchased, return existing link without charging
      if (userPurchases.includes(groupId)) {
        const inviteLink = db.groupLinks[groupId] || group.defaultLink;
        const wallet = getOrCreateWallet(numericId);
        res.json({
          success: true,
          alreadyOwned: true,
          group,
          inviteLink,
          wallet,
          message: `You already own access to ${group.name}!`,
        });
        return;
      }

      const wallet = getOrCreateWallet(numericId);
      if (wallet.balance < group.price) {
        res.status(400).json({
          error: `Insufficient balance. ${group.name} is £${group.price.toFixed(2)}, but you currently have £${wallet.balance.toFixed(2)}.`,
          required: group.price,
          balance: wallet.balance,
          difference: Math.round((group.price - wallet.balance) * 100) / 100,
        });
        return;
      }

      // Deduct price from wallet balance
      wallet.balance = Math.round((wallet.balance - group.price) * 100) / 100;
      wallet.updatedAt = new Date().toISOString();

      const tx: Transaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        telegramId: numericId,
        type: "withdrawal",
        amount: -group.price,
        currency: "GBP",
        status: "completed",
        description: `Unlocked: ${group.name} (£${group.price.toFixed(2)})`,
        createdAt: new Date().toISOString(),
      };
      wallet.transactions.unshift(tx);

      // Unlock group access & link
      const { inviteLink } = unlockGroup(numericId, groupId);

      // Broadcast real-time balance update
      broadcastToUser(numericId, "BALANCE_UPDATED", {
        balance: wallet.balance,
        currency: wallet.currency,
        transaction: tx,
      });

      res.json({
        success: true,
        group,
        inviteLink,
        wallet,
        message: `🎉 Successfully unlocked ${group.name}! Click below to join now.`,
      });
    } catch (err: any) {
      console.error("Error purchasing group:", err);
      res.status(500).json({ error: err.message || "Failed to purchase group" });
    }
  });

  // Admin endpoint: update custom telegram invite link for a group
  app.post("/api/admin/update-group-link", (req, res) => {
    const { groupId, inviteLink } = req.body;
    if (!groupId || !inviteLink) {
      res.status(400).json({ error: "groupId and inviteLink are required" });
      return;
    }
    const group = DEFAULT_GROUPS.find((g) => g.id === groupId);
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    db.groupLinks[groupId] = String(inviteLink).trim();
    saveStore();
    res.json({
      success: true,
      groupId,
      inviteLink: db.groupLinks[groupId],
      message: `Updated invite link for ${group.name}`,
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
      server: { middlewareMode: true, allowedHosts: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Telegram Stripe Wallet server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
