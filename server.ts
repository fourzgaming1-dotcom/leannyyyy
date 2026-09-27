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
  type: 'deposit' | 'withdrawal' | 'adjustment' | 'purchase';
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
    defaultLink: "https://t.me/AllGroupsMasterVIP",
  },
  {
    id: "baller-bundle",
    name: "Baller Bundle",
    price: 30,
    currency: "GBP",
    description: "Full Baller tier bundle access package",
    tag: "POPULAR",
    defaultLink: "https://t.me/BallerBundleVIP",
  },
  {
    id: "ebony",
    name: "Ebony VIP",
    price: 10,
    currency: "GBP",
    description: "Exclusive Ebony VIP community access & private content hub",
    defaultLink: "https://t.me/EbonyVIPAccess",
  },
  {
    id: "chav",
    name: "Chav VIP",
    price: 10,
    currency: "GBP",
    description: "Exclusive Chav VIP community access & underground culture",
    defaultLink: "https://t.me/ChavVIPAccess",
  },
  {
    id: "desi",
    name: "Desi VIP",
    price: 10,
    currency: "GBP",
    description: "Exclusive Indian & Desi VIP community access & South Asian network",
    defaultLink: "https://t.me/DesiVIPAccess",
  },
  {
    id: "british",
    name: "English VIP",
    price: 10,
    currency: "GBP",
    description: "Exclusive English & British VIP community access & verified members",
    defaultLink: "https://t.me/BritishVIPAccess",
  },
  {
    id: "scottish",
    name: "Scottish VIP",
    price: 10,
    currency: "GBP",
    description: "Exclusive Scottish VIP community access & Celtic networks",
    defaultLink: "https://t.me/ScottishVIPAccess",
  },
  {
    id: "irish",
    name: "Irish VIP",
    price: 10,
    currency: "GBP",
    description: "Exclusive Irish VIP community access & Emerald Isle network",
    defaultLink: "https://t.me/IrishVIPAccess",
  },
  {
    id: "baller-group",
    name: "Baller VIP Group",
    price: 5,
    currency: "GBP",
    description: "Direct Baller community access & high-roller inner circle",
    defaultLink: "https://t.me/BallerGroupAccess",
  },
];

interface DBStore {
  wallets: Record<string, UserWallet>;
  processedSessions: Record<string, boolean>;
  groupLinks: Record<string, string>;
  userPurchases: Record<string, string[]>;
  rouletteHistory?: Array<{ number: number; color: "red" | "black" | "green"; timestamp: string }>;
  crossyRuns?: Record<string, { [runId: string]: number[] }>;
  crossyCashedOutRuns?: Record<string, { [runId: string]: { step: number; amount: number; timestamp: string } }>;
  crossyStats?: Record<string, {
    highScoreLane: number;
    totalEarnings: number;
    totalRuns: number;
  }>;
  gameStats?: Record<string, {
    lastSpin: string;
    spinsLeft: number;
    freeSpins?: number;
    totalWon: number;
    totalSpins?: number;
    totalXp?: number;
    unlockedVouchers?: string[];
  }>;
}

// ==========================================
// VIP CROSSY ROAD: REWARD LADDER & REST POINTS
// 1st hops before rest point: 1p each (1, 2, 3)
// Rest point 1: 10p (4)
// 2nd hops: 5p each (5, 6, 7)
// Rest point 2: 10p (8)
// 3rd hops: 10p each (9, 10, 11, 12) - Hop 10 unlocks Free Baller Group!
// Rest point 3 / Finish: 10p (13)
// ==========================================
export const CROSSY_ROAD_JUMPS = [
  { step: 1, label: "1p", amount: 0.01, name: "First Hop", isRestPoint: false },
  { step: 2, label: "1p", amount: 0.01, name: "Second Hop", isRestPoint: false },
  { step: 3, label: "1p", amount: 0.01, name: "Third Hop (Cashout Unlocked)", isRestPoint: false },
  { step: 4, label: "10p", amount: 0.10, name: "🌿 Rest Point 1", isRestPoint: true },
  { step: 5, label: "5p", amount: 0.05, name: "Expressway Sprint 1", isRestPoint: false },
  { step: 6, label: "5p", amount: 0.05, name: "Expressway Sprint 2", isRestPoint: false },
  { step: 7, label: "5p", amount: 0.05, name: "Expressway Sprint 3", isRestPoint: false },
  { step: 8, label: "10p", amount: 0.10, name: "🌿 Rest Point 2", isRestPoint: true },
  { step: 9, label: "10p", amount: 0.10, name: "High Speed Run 1", isRestPoint: false },
  { step: 10, label: "10p", amount: 0.10, name: "💎 Hop 10 · Free Baller Group!", isRestPoint: false, unlocksBaller: true },
  { step: 11, label: "10p", amount: 0.10, name: "High Speed Run 3", isRestPoint: false },
  { step: 12, label: "10p", amount: 0.10, name: "Turbo Alley Sprint", isRestPoint: false },
  { step: 13, label: "10p", amount: 0.10, name: "👑 Rest Point 3 · Penthouse", isRestPoint: true },
];

// ==========================================
// VIP LUCKY WHEEL: 25 PRIZES SPECIFICATION
// ==========================================
interface WheelPrizeDef {
  id: string;
  label: string;
  shortLabel: string;
  sub: string;
  type: "group" | "credit" | "xp" | "spin" | "voucher" | "mystery";
  groupId?: string;
  groupName?: string;
  amount?: number;
  xp?: number;
  code?: string;
  color: string;
  textColor?: string;
  weight: number;
}

const WHEEL_PRIZES: WheelPrizeDef[] = [
  { id: "premium_group", label: "Premium Group", shortLabel: "PREMIUM", sub: "GROUP", type: "group", groupId: "baller-group", groupName: "Premium Baller Group", color: "#8b5cf6", weight: 3 },
  { id: "baller_bundle", label: "Baller Bundle", shortLabel: "BALLER", sub: "BUNDLE", type: "group", groupId: "baller-bundle", groupName: "Baller Bundle VIP", color: "#10b981", weight: 2 },
  { id: "ebony_group", label: "Ebony Group", shortLabel: "EBONY", sub: "GROUP", type: "group", groupId: "ebony", groupName: "Ebony VIP", color: "#ec4899", weight: 3 },
  { id: "desi_group", label: "Desi Group", shortLabel: "DESI", sub: "GROUP", type: "group", groupId: "desi", groupName: "Desi VIP", color: "#f59e0b", weight: 3 },
  { id: "irish_group", label: "Irish Group", shortLabel: "IRISH", sub: "GROUP", type: "group", groupId: "irish", groupName: "Irish VIP", color: "#059669", weight: 3 },
  { id: "british_group", label: "British Group", shortLabel: "BRITISH", sub: "GROUP", type: "group", groupId: "british", groupName: "British VIP", color: "#3b82f6", weight: 3 },
  { id: "scottish_group", label: "Scottish Group", shortLabel: "SCOTTISH", sub: "GROUP", type: "group", groupId: "scottish", groupName: "Scottish VIP", color: "#6366f1", weight: 3 },
  { id: "chav_group", label: "Chav Group", shortLabel: "CHAV", sub: "GROUP", type: "group", groupId: "chav", groupName: "Chav VIP", color: "#06b6d4", weight: 3 },
  { id: "all_groups", label: "All Groups", shortLabel: "ALL VIP", sub: "JACKPOT", type: "group", groupId: "all-groups", groupName: "All Groups Master Pass", color: "#eab308", weight: 1 },
  { id: "credit_1_50", label: "£1.50 Credit", shortLabel: "£1.50", sub: "CASH", type: "credit", amount: 1.50, color: "#06b6d4", weight: 7 },
  { id: "credit_2", label: "£2 Credit", shortLabel: "£2.00", sub: "CASH", type: "credit", amount: 2.00, color: "#10b981", weight: 6 },
  { id: "xp_50", label: "50 VIP XP", shortLabel: "50 XP", sub: "BOOST", type: "xp", xp: 50, color: "#f97316", weight: 8 },
  { id: "xp_100", label: "100 VIP XP", shortLabel: "100 XP", sub: "BOOST", type: "xp", xp: 100, color: "#ea580c", weight: 5 },
  { id: "xp_20", label: "20 VIP XP", shortLabel: "20 XP", sub: "BOOST", type: "xp", xp: 20, color: "#fb923c", weight: 9 },
  { id: "xp_5", label: "5 VIP XP", shortLabel: "5 XP", sub: "BOOST", type: "xp", xp: 5, color: "#fdba74", weight: 10 },
  { id: "xp_1", label: "1 VIP XP", shortLabel: "1 XP", sub: "BOOST", type: "xp", xp: 1, color: "#fed7aa", weight: 12 },
  { id: "mystery_drop", label: "Mystery Drop", shortLabel: "MYSTERY", sub: "LOOT", type: "mystery", color: "#d946ef", weight: 6 },
  { id: "voucher_10", label: "10% OFF Voucher", shortLabel: "10% OFF", sub: "CODE", type: "voucher", code: "VIP10", color: "#a855f7", weight: 7 },
  { id: "voucher_5", label: "5% OFF Voucher", shortLabel: "5% OFF", sub: "CODE", type: "voucher", code: "VIP5", color: "#c084fc", weight: 8 },
  { id: "voucher_20", label: "20% OFF Voucher", shortLabel: "20% OFF", sub: "CODE", type: "voucher", code: "VIP20", color: "#9333ea", weight: 4 },
  { id: "credit_0_10", label: "10p Credit", shortLabel: "10p", sub: "CASH", type: "credit", amount: 0.10, color: "#14b8a6", weight: 10 },
  { id: "credit_0_05", label: "5p Credit", shortLabel: "5p", sub: "CASH", type: "credit", amount: 0.05, color: "#2dd4bf", weight: 10 },
  { id: "credit_0_01", label: "1p Credit", shortLabel: "1p", sub: "CASH", type: "credit", amount: 0.01, color: "#5eead4", weight: 10 },
  { id: "credit_20", label: "£20 Credit", shortLabel: "£20.00", sub: "JACKPOT", type: "credit", amount: 20.00, color: "#22c55e", weight: 2 },
  { id: "credit_100", label: "£100 Credit", shortLabel: "£100.00", sub: "MEGA", type: "credit", amount: 100.00, color: "#eab308", weight: 1 },
];

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
        crossyRuns: parsed.crossyRuns || {},
        crossyCashedOutRuns: parsed.crossyCashedOutRuns || {},
        crossyStats: parsed.crossyStats || {},
        gameStats: parsed.gameStats || {},
      };
    }
  } catch (err) {
    console.error("Error reading store from disk, initializing new store:", err);
  }
  return { wallets: {}, processedSessions: {}, groupLinks: initialLinks, userPurchases: {}, crossyRuns: {}, crossyCashedOutRuns: {}, crossyStats: {}, gameStats: {} };
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

// Debit user wallet
function debitWallet(
  telegramId: number,
  amount: number,
  currency: string,
  description: string,
  type: 'purchase' | 'withdrawal' | 'adjustment' = 'purchase'
): { wallet: UserWallet; transaction: Transaction } {
  const wallet = getOrCreateWallet(telegramId);
  const cleanAmount = Math.round(amount * 100) / 100;
  wallet.balance = Math.max(0, Math.round((wallet.balance - cleanAmount) * 100) / 100);
  wallet.currency = currency.toUpperCase();
  wallet.updatedAt = new Date().toISOString();

  const transaction: Transaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    telegramId,
    type,
    amount: -cleanAmount,
    currency: wallet.currency,
    status: 'completed',
    description,
    createdAt: new Date().toISOString(),
  };

  wallet.transactions.unshift(transaction);
  saveStore();

  broadcastToUser(telegramId, "BALANCE_UPDATED", {
    balance: wallet.balance,
    currency: wallet.currency,
    transaction,
  });

  return { wallet, transaction };
}

// Send automated Telegram message with the invite link directly to the buyer's Telegram chat
async function sendTelegramInviteMessage(telegramId: number, group: GroupConfig, inviteLink: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log(`ℹ️ [Telegram Bot] TELEGRAM_BOT_TOKEN is not set; link was broadcasted via SSE/App for user ${telegramId}`);
    return;
  }

  const messageText =
    `🎉 <b>Payment Confirmed & Access Unlocked!</b>\n\n` +
    `You now have VIP access to <b>${group.name}</b>.\n\n` +
    `🔗 <b>Your Exclusive Invite Link:</b>\n` +
    `${inviteLink}\n\n` +
    `<i>Tap the button below to join the group immediately!</i>`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId,
        text: messageText,
        parse_mode: "HTML",
        disable_web_page_preview: false,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `🚀 Join ${group.name}`,
                url: inviteLink,
              },
            ],
          ],
        },
      }),
    });
    const data: any = await res.json();
    if (data.ok) {
      console.log(`✅ [Telegram Bot] Successfully delivered invite link to chat ${telegramId}`);
    } else {
      console.error(`⚠️ [Telegram Bot] sendMessage failed:`, data.description);
    }
  } catch (err: any) {
    console.error(`⚠️ [Telegram Bot] Error sending invite link to ${telegramId}:`, err.message);
  }
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

  const customLink = db.groupLinks[groupId]?.trim();
  const inviteLink = customLink && customLink.length > 0 ? customLink : group.defaultLink;

  broadcastToUser(telegramId, "GROUP_PURCHASED", {
    groupId,
    groupName: group.name,
    inviteLink,
    purchasedGroups: db.userPurchases[key],
  });

  // Automatically send message to Telegram chat
  sendTelegramInviteMessage(telegramId, group, inviteLink).catch((err) => {
    console.error("Failed sending Telegram invite message:", err);
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
          if (groupId) {
            console.log(`💳 Stripe Checkout Completed: Unlocking Group ${groupId} for user ${telegramId} (Direct Purchase - No Wallet Credit)`);
            const unlocked = unlockGroup(telegramId, groupId);
            const wallet = getOrCreateWallet(telegramId);
            const purchaseTx: Transaction = {
              id: `tx_stripe_${sessionId}`,
              telegramId,
              type: "purchase",
              amount: -amountTotal,
              currency,
              status: "completed",
              description: `Stripe Direct Purchase: ${unlocked.group?.name || groupId}`,
              createdAt: new Date().toISOString(),
              stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
            };
            wallet.transactions.unshift(purchaseTx);
            wallet.updatedAt = new Date().toISOString();
            db.processedSessions[sessionId] = true;
            saveStore();
            broadcastToUser(telegramId, "TRANSACTION_CREATED", { transaction: purchaseTx, wallet });
            broadcastToUser(telegramId, "BALANCE_UPDATED", { wallet });
          } else {
            console.log(`💳 Stripe Checkout Completed: Crediting deposit of $${amountTotal} ${currency} to Telegram user ${telegramId}`);
            creditWallet(
              telegramId,
              amountTotal,
              currency,
              `Stripe Deposit (Card / Apple Pay / Google Pay)`,
              sessionId,
              typeof session.payment_intent === 'string' ? session.payment_intent : undefined
            );
          }
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

  // Telegram Bot Webhook endpoint to reply to /balance or /start and remember balances
  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const update = req.body;
      const message = update?.message;
      if (!message || !message.chat?.id) {
        res.json({ ok: true });
        return;
      }

      const chatId = message.chat.id;
      const text = (message.text || "").trim();
      const from = message.from || {};
      const firstName = from.first_name || "Member";
      const username = from.username || "";

      // Ensure wallet exists & remembered
      const wallet = getOrCreateWallet(chatId, firstName, username);
      const token = process.env.TELEGRAM_BOT_TOKEN;

      if (token && text.startsWith("/")) {
        let reply = "";
        if (text.startsWith("/balance")) {
          reply = `💰 <b>Account Balance:</b> £${wallet.balance.toFixed(2)} GBP\n\n` +
            `Your funds are permanently saved and ready to spend!\n` +
            `🎮 Hop across VIP Crossy Road to win up to £2.00, spin the Lucky Wheel, or purchase VIP Group access!`;
        } else if (text.startsWith("/start")) {
          reply = `👋 <b>Welcome, ${firstName}!</b>\n\n` +
            `💰 <b>Your Current Balance:</b> £${wallet.balance.toFixed(2)} GBP\n\n` +
            `🕹️ <b>Available in Mini App:</b>\n` +
            `• 🚗 <b>VIP Crossy Road:</b> Hop traffic, cash out whenever you like after 3 hops to claim real wallet cash!\n` +
            `• 🎡 <b>VIP Lucky Wheel:</b> Win cash prizes & VIP Group passes!\n` +
            `• 👑 <b>9 VIP Telegram Communities</b> ready to unlock.\n\n` +
            `<i>Your account balance is remembered permanently across all visits.</i>`;
        }

        if (reply) {
          await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: reply,
              parse_mode: "HTML",
            }),
          });
        }
      }

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Telegram webhook error:", err);
      res.json({ ok: true });
    }
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
        success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}&tg_id=${numericId}&status=success${groupId ? `&unlocked=${groupId}&unlocked_group=${groupId}` : ""}`,
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

      // Check if already processed (e.g. by Webhook)
      if (db.processedSessions[sessionId]) {
        const wallet = getOrCreateWallet(numericId);
        const targetGroupId = (req.body.groupId as string) || undefined;
        let unlockedGroup = null;
        if (targetGroupId) {
          const group = DEFAULT_GROUPS.find((g) => g.id === targetGroupId);
          const customLink = db.groupLinks[targetGroupId]?.trim();
          const inviteLink = customLink && customLink.length > 0 ? customLink : group?.defaultLink;
          if (group && inviteLink) {
            unlockedGroup = { success: true, group, inviteLink };
          }
        }
        res.json({
          success: true,
          alreadyCredited: true,
          wallet,
          unlockedGroup,
          message: "Session verified and access confirmed.",
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
        const targetGroupId = (req.body.groupId as string) || session.metadata?.groupId;

        let unlockedGroup = null;
        let wallet = getOrCreateWallet(metaId);
        let transaction: Transaction;

        if (targetGroupId) {
          unlockedGroup = unlockGroup(metaId, targetGroupId);
          transaction = {
            id: `tx_stripe_${sessionId}`,
            telegramId: metaId,
            type: "purchase",
            amount: -amountTotal,
            currency,
            status: "completed",
            description: `Stripe Direct Purchase: ${unlockedGroup?.group?.name || targetGroupId}`,
            createdAt: new Date().toISOString(),
            stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
          };
          wallet.transactions.unshift(transaction);
          wallet.updatedAt = new Date().toISOString();
          db.processedSessions[sessionId] = true;
          saveStore();
          broadcastToUser(metaId, "TRANSACTION_CREATED", { transaction, wallet });
          broadcastToUser(metaId, "BALANCE_UPDATED", { wallet });
        } else {
          const result = creditWallet(
            metaId,
            amountTotal,
            currency,
            `Stripe Card / Apple Pay Deposit`,
            sessionId,
            typeof session.payment_intent === 'string' ? session.payment_intent : undefined
          );
          wallet = result.wallet;
          transaction = result.transaction;
        }

        res.json({
          success: true,
          wallet,
          transaction,
          unlockedGroup,
          message: targetGroupId
            ? "Stripe payment verified! VIP group access unlocked."
            : "Deposit successful! Funds added to your balance.",
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

  // Admin endpoint: get all groups with current links for admin management
  app.get("/api/admin/group-links", (_req, res) => {
    const list = DEFAULT_GROUPS.map((g) => ({
      id: g.id,
      name: g.name,
      price: g.price,
      currency: g.currency,
      description: g.description,
      defaultLink: g.defaultLink,
      currentLink: db.groupLinks[g.id] || g.defaultLink,
    }));
    res.json({
      success: true,
      groupLinks: db.groupLinks,
      groups: list,
    });
  });

  // ==========================================
  // VIP CROSSY ROAD: PROGRESSIVE JUMP ENDPOINTS
  // 1p, 2p, 3p, 6p, 10p, 20p, 25p, 35p, 40p, 55p, 60p, 80p, £2.00
  // ==========================================
  app.get("/api/crossy-road/stats", (req, res) => {
    const telegramIdStr = req.query.telegramId as string;
    const numericId = telegramIdStr ? parseInt(telegramIdStr, 10) : null;
    if (!numericId) {
      res.status(400).json({ error: "telegramId is required" });
      return;
    }
    const userKey = String(numericId);
    const stats = (db.crossyStats && db.crossyStats[userKey]) || {
      highScoreLane: 0,
      totalEarnings: 0,
      totalRuns: 0,
    };
    res.json({
      stats,
      milestones: CROSSY_ROAD_JUMPS,
    });
  });

  // Start Crossy Road Run (£1.00 Entry Fee)
  app.post("/api/crossy-road/start", (req, res) => {
    try {
      const { telegramId } = req.body;
      const numericId = parseInt(telegramId, 10);
      if (!numericId || isNaN(numericId)) {
        res.status(400).json({ error: "Valid telegramId is required" });
        return;
      }

      const wallet = getOrCreateWallet(numericId);
      if (wallet.balance < 1.00) {
        res.status(400).json({
          error: "Insufficient balance (£1.00 required). Please top up your wallet to play Crossy Road.",
          insufficientBalance: true,
          balance: wallet.balance,
        });
        return;
      }

      const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const debitRes = debitWallet(
        numericId,
        1.00,
        "GBP",
        "🎮 Crossy Road Game Entry (£1.00)",
        "purchase"
      );

      res.json({
        success: true,
        runId,
        fee: 1.00,
        wallet: debitRes.wallet,
        transaction: debitRes.transaction,
        message: "Run started for £1.00. Good luck hopping across traffic!",
      });
    } catch (err: any) {
      console.error("Crossy road start error:", err);
      res.status(500).json({ error: err.message || "Failed to start run" });
    }
  });

  app.post("/api/crossy-road/jump", (req, res) => {
    try {
      const { telegramId, step, runId } = req.body;
      const numericId = parseInt(telegramId, 10);
      const numericStep = parseInt(step, 10);

      if (!numericId || isNaN(numericId)) {
        res.status(400).json({ error: "Valid telegramId is required" });
        return;
      }

      if (!numericStep || numericStep < 1 || numericStep > CROSSY_ROAD_JUMPS.length) {
        res.status(400).json({ error: `Invalid step. Must be between 1 and ${CROSSY_ROAD_JUMPS.length}` });
        return;
      }

      const milestone = CROSSY_ROAD_JUMPS.find((j) => j.step === numericStep);
      if (!milestone) {
        res.status(400).json({ error: "Milestone not found" });
        return;
      }

      const cleanRunId = runId || `run_${Date.now()}`;
      const userKey = String(numericId);

      if (!db.crossyRuns) db.crossyRuns = {};
      if (!db.crossyRuns[userKey]) db.crossyRuns[userKey] = {};
      const runClaims = db.crossyRuns[userKey][cleanRunId] || [];

      if (!runClaims.includes(numericStep)) {
        runClaims.push(numericStep);
        db.crossyRuns[userKey][cleanRunId] = runClaims;
      }

      // Progressive Run Pot: calculate accumulated pot from reached hops
      let currentPot = 0;
      for (let s = 1; s <= Math.min(numericStep, 13); s++) {
        const m = CROSSY_ROAD_JUMPS.find((j) => j.step === s);
        if (m) currentPot += m.amount;
      }
      currentPot = Math.round(currentPot * 100) / 100;

      // Check for Hop 10 Baller Group Free Unlock:
      let ballerGroupUnlocked = false;
      let ballerInviteLink = "";
      if (numericStep >= 10) {
        const userPasses = db.userPurchases[userKey] || [];
        if (!userPasses.includes("baller-group")) {
          const unlockRes = unlockGroup(numericId, "baller-group");
          if (unlockRes.success) {
            ballerGroupUnlocked = true;
            ballerInviteLink = unlockRes.inviteLink || "";
            const group = DEFAULT_GROUPS.find((g) => g.id === "baller-group");
            if (group && ballerInviteLink) {
              sendTelegramInviteMessage(numericId, group, ballerInviteLink).catch(console.error);
            }
          }
        }
      }

      // Update high score lane in stats without crediting wallet yet
      if (!db.crossyStats) db.crossyStats = {};
      const stats = db.crossyStats[userKey] || { highScoreLane: 0, totalEarnings: 0, totalRuns: 1 };
      stats.highScoreLane = Math.max(stats.highScoreLane, numericStep);
      db.crossyStats[userKey] = stats;
      saveStore();

      const wallet = getOrCreateWallet(numericId);

      let stepMessage = numericStep >= 3
        ? `🎉 Lane #${numericStep} Cleared! Current Pot: £${currentPot.toFixed(2)} — Cash Out is now UNLOCKED!`
        : `Hop #${numericStep} Cleared! Current Pot: £${currentPot.toFixed(2)} (Cash Out unlocks at 3 hops: ${numericStep}/3)`;

      if (ballerGroupUnlocked) {
        stepMessage = `👑 10 HOPS ACHIEVED! You unlocked FREE access to Baller VIP Group!`;
      }

      res.json({
        success: true,
        step: numericStep,
        amountEarned: milestone.amount,
        totalRunEarnings: currentPot,
        canCashout: numericStep >= 3,
        label: milestone.label,
        name: milestone.name,
        ballerGroupUnlocked,
        ballerInviteLink,
        wallet,
        message: stepMessage,
      });
    } catch (err: any) {
      console.error("Crossy road jump error:", err);
      res.status(500).json({ error: err.message || "Failed to process jump" });
    }
  });

  // Crossy Road Cashout endpoint (Requires at least 3 hops)
  app.post("/api/crossy-road/cashout", (req, res) => {
    try {
      const { telegramId, step, runId } = req.body;
      const numericId = parseInt(telegramId, 10);
      const numericStep = parseInt(step, 10);

      if (!numericId) {
        res.status(400).json({ error: "telegramId is required" });
        return;
      }

      if (!numericStep || numericStep < 3) {
        res.status(400).json({
          error: "Cash out is only available after completing at least 3 hops.",
        });
        return;
      }

      const cleanRunId = runId || `run_${Date.now()}`;
      const userKey = String(numericId);

      if (!db.crossyCashedOutRuns) db.crossyCashedOutRuns = {};
      if (!db.crossyCashedOutRuns[userKey]) db.crossyCashedOutRuns[userKey] = {};

      if (db.crossyCashedOutRuns[userKey][cleanRunId]) {
        const wallet = getOrCreateWallet(numericId);
        res.status(400).json({
          error: "This run has already been cashed out.",
          wallet,
        });
        return;
      }

      // Calculate total earned from milestone ladder up to numericStep
      const maxStep = Math.min(numericStep, 13);
      let totalToCashOut = 0;
      for (let s = 1; s <= maxStep; s++) {
        const m = CROSSY_ROAD_JUMPS.find((j) => j.step === s);
        if (m) {
          totalToCashOut += m.amount;
        }
      }
      totalToCashOut = Math.round(totalToCashOut * 100) / 100;

      // Mark run as cashed out
      db.crossyCashedOutRuns[userKey][cleanRunId] = {
        step: maxStep,
        amount: totalToCashOut,
        timestamp: new Date().toISOString(),
      };

      // Credit wallet instantly
      const creditResult = creditWallet(
        numericId,
        totalToCashOut,
        "GBP",
        `🎮 Crossy Road Cashout: +£${totalToCashOut.toFixed(2)} (Lane #${maxStep})`,
        `crossy_cashout_${cleanRunId}`
      );

      // Check if Baller Group was unlocked
      if (maxStep >= 10) {
        const userPasses = db.userPurchases[userKey] || [];
        if (!userPasses.includes("baller-group")) {
          unlockGroup(numericId, "baller-group");
        }
      }

      // Update aggregate crossy stats
      if (!db.crossyStats) db.crossyStats = {};
      const stats = db.crossyStats[userKey] || { highScoreLane: 0, totalEarnings: 0, totalRuns: 1 };
      stats.highScoreLane = Math.max(stats.highScoreLane, maxStep);
      stats.totalEarnings = Math.round((stats.totalEarnings + totalToCashOut) * 100) / 100;
      stats.totalRuns = (stats.totalRuns || 0) + 1;
      db.crossyStats[userKey] = stats;

      saveStore();

      // Broadcast real-time balance update via SSE
      broadcastToUser(numericId, "BALANCE_UPDATED", {
        balance: creditResult.wallet.balance,
        currency: creditResult.wallet.currency,
        transaction: creditResult.transaction,
      });

      res.json({
        success: true,
        step: maxStep,
        amountCashedOut: totalToCashOut,
        wallet: creditResult.wallet,
        transaction: creditResult.transaction,
        message: `💰 Cashed Out! +£${totalToCashOut.toFixed(2)} credited instantly to your spendable balance!`,
      });
    } catch (err: any) {
      console.error("Crossy road cashout error:", err);
      res.status(500).json({ error: err.message || "Failed to cash out" });
    }
  });

  // Get user's game spin status and stats (Spins cost £1.00 each)
  app.get("/api/game/status", (req, res) => {
    try {
      const telegramIdStr = req.query.telegramId as string;
      const numericId = telegramIdStr ? parseInt(telegramIdStr, 10) : null;
      if (!numericId) {
        res.status(400).json({ error: "telegramId is required" });
        return;
      }

      if (!db.gameStats) db.gameStats = {};
      const key = String(numericId);
      const userStats = db.gameStats[key] || {
        lastSpin: "",
        spinsLeft: 0,
        freeSpins: 0,
        totalWon: 0,
        totalSpins: 0,
        totalXp: 0,
        unlockedVouchers: [],
      };

      const wallet = getOrCreateWallet(numericId);

      res.json({
        spinsLeft: 0,
        freeSpins: 0,
        spinCost: 1.00,
        balance: wallet.balance,
        canSpin: wallet.balance >= 1.00,
        totalWon: userStats.totalWon || 0,
        totalSpins: userStats.totalSpins || 0,
        totalXp: userStats.totalXp || 0,
        vouchers: userStats.unlockedVouchers || [],
        lastSpin: userStats.lastSpin || "",
        sectors: WHEEL_PRIZES,
      });
    } catch (err: any) {
      console.error("Error getting game status:", err);
      res.status(500).json({ error: "Failed to get game status" });
    }
  });

  // Execute a £1 Spin (Costs £1.00 directly from wallet balance)
  app.post("/api/game/spin", (req, res) => {
    try {
      const { telegramId, targetPrizeIndex } = req.body;
      const numericId = parseInt(telegramId, 10);
      if (!numericId) {
        res.status(400).json({ error: "telegramId is required" });
        return;
      }

      if (!db.gameStats) db.gameStats = {};
      const key = String(numericId);
      const userStats = db.gameStats[key] || {
        lastSpin: "",
        spinsLeft: 0,
        freeSpins: 0,
        totalWon: 0,
        totalSpins: 0,
        totalXp: 0,
        unlockedVouchers: [],
      };

      const wallet = getOrCreateWallet(numericId);

      // Charge £1.00 from wallet balance
      if (wallet.balance < 1.00) {
        res.status(400).json({
          error: "Insufficient wallet balance. Each spin costs £1.00. Please top up your wallet.",
          balance: wallet.balance,
          cost: 1.00,
        });
        return;
      }

      wallet.balance = Math.max(0, Math.round((wallet.balance - 1.00) * 100) / 100);
      const spinTx: Transaction = {
        id: `tx_spin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        telegramId: numericId,
        type: "purchase",
        amount: -1.00,
        currency: "GBP",
        status: "completed",
        description: "🎰 VIP Wheel Spin (£1.00 Entry)",
        createdAt: new Date().toISOString(),
      };
      wallet.transactions.unshift(spinTx);
      wallet.updatedAt = new Date().toISOString();
      saveStore();

      broadcastToUser(numericId, "BALANCE_UPDATED", {
        balance: wallet.balance,
        currency: wallet.currency,
        transaction: spinTx,
      });

      // Pick winning sector
      let chosenIndex: number;
      if (typeof targetPrizeIndex === "number" && targetPrizeIndex >= 0 && targetPrizeIndex < WHEEL_PRIZES.length) {
        chosenIndex = targetPrizeIndex;
      } else {
        const totalWeight = WHEEL_PRIZES.reduce((acc, p) => acc + p.weight, 0);
        let rand = Math.random() * totalWeight;
        chosenIndex = 0;
        for (let i = 0; i < WHEEL_PRIZES.length; i++) {
          if (rand < WHEEL_PRIZES[i].weight) {
            chosenIndex = i;
            break;
          }
          rand -= WHEEL_PRIZES[i].weight;
        }
      }

      const prize = WHEEL_PRIZES[chosenIndex];
      let rewardMessage = "";
      let creditWon = 0;
      let unlockedInviteLink = "";
      let unlockedGroupName = "";

      if (prize.type === "credit" && prize.amount) {
        creditWon = prize.amount;
        userStats.totalWon = Math.round(((userStats.totalWon || 0) + prize.amount) * 100) / 100;
        creditWallet(
          numericId,
          prize.amount,
          "GBP",
          `🎰 VIP Wheel Prize: ${prize.label}`,
          `spin_win_${Date.now()}`
        );
        rewardMessage = `🎉 JACKPOT! £${prize.amount.toFixed(2)} has been credited directly to your live wallet balance!`;
      } else if (prize.type === "group" && prize.groupId) {
        const unlockRes = unlockGroup(numericId, prize.groupId);
        unlockedInviteLink = unlockRes.inviteLink || "";
        unlockedGroupName = unlockRes.group?.name || prize.groupName || prize.label;
        rewardMessage = `👑 UNBELIEVABLE WIN! You unlocked VIP access to ${unlockedGroupName}!`;
      } else if (prize.type === "xp" && prize.xp) {
        userStats.totalXp = (userStats.totalXp || 0) + prize.xp;
        rewardMessage = `⚡ Level Up! +${prize.xp} VIP XP added to your status profile!`;
      } else if (prize.type === "voucher" && prize.code) {
        if (!userStats.unlockedVouchers) userStats.unlockedVouchers = [];
        if (!userStats.unlockedVouchers.includes(prize.code)) {
          userStats.unlockedVouchers.push(prize.code);
        }
        rewardMessage = `🎟️ Voucher Unlocked! Use code ${prize.code} for ${prize.shortLabel} discounts on VIP bundles.`;
      } else if (prize.type === "mystery") {
        creditWon = 1.00;
        userStats.totalWon = Math.round(((userStats.totalWon || 0) + 1.00) * 100) / 100;
        userStats.totalXp = (userStats.totalXp || 0) + 25;
        creditWallet(numericId, 1.00, "GBP", "🎰 VIP Wheel Mystery Drop: £1.00 + 25 XP", `spin_mystery_${Date.now()}`);
        rewardMessage = `💎 MYSTERY BOX OPENED! You won £1.00 instant wallet credit + 25 VIP XP!`;
      }

      userStats.lastSpin = new Date().toISOString();
      userStats.totalSpins = (userStats.totalSpins || 0) + 1;
      db.gameStats[key] = userStats;
      saveStore();

      const latestWallet = getOrCreateWallet(numericId);

      res.json({
        success: true,
        prizeIndex: chosenIndex,
        prize,
        usedFreeSpin: false,
        freeSpinsLeft: 0,
        totalWon: userStats.totalWon || 0,
        totalXp: userStats.totalXp || 0,
        totalSpins: userStats.totalSpins || 0,
        creditWon,
        inviteLink: unlockedInviteLink,
        groupName: unlockedGroupName,
        rewardMessage,
        wallet: latestWallet,
      });
    } catch (err: any) {
      console.error("Error executing spin:", err);
      res.status(500).json({ error: "Failed to execute spin" });
    }
  });

  // Legacy claim support
  app.post("/api/game/claim", (req, res) => {
    try {
      const { telegramId, prizeType } = req.body;
      const numericId = parseInt(telegramId, 10);
      if (!numericId) {
        res.status(400).json({ error: "telegramId is required" });
        return;
      }
      const wallet = getOrCreateWallet(numericId);
      res.json({ success: true, wallet });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to claim" });
    }
  });

  // Reset game spins and add £5 test credit for test mode
  app.post("/api/game/reset", (req, res) => {
    const { telegramId } = req.body;
    const numericId = parseInt(telegramId, 10);
    if (!numericId) {
      res.status(400).json({ error: "telegramId is required" });
      return;
    }
    if (!db.gameStats) db.gameStats = {};
    const key = String(numericId);
    db.gameStats[key] = {
      lastSpin: "",
      spinsLeft: 2,
      freeSpins: 2,
      totalWon: db.gameStats[key]?.totalWon || 0,
      totalSpins: db.gameStats[key]?.totalSpins || 0,
      totalXp: db.gameStats[key]?.totalXp || 0,
      unlockedVouchers: db.gameStats[key]?.unlockedVouchers || [],
    };
    saveStore();
    res.json({ success: true, spinsLeft: 2, freeSpins: 2, message: "Free spins reset to 2." });
  });

  // Quick test credit top up for testing the £1 spin
  app.post("/api/game/add-test-credit", (req, res) => {
    const { telegramId } = req.body;
    const numericId = parseInt(telegramId, 10);
    if (!numericId) {
      res.status(400).json({ error: "telegramId is required" });
      return;
    }
    const result = creditWallet(
      numericId,
      5.00,
      "GBP",
      "🎰 VIP Wheel Bonus Credit (+£5.00)",
      `bonus_credit_${Date.now()}`
    );
    res.json({ success: true, wallet: result.wallet, message: "£5.00 credit added for VIP spins!" });
  });

  // ==========================================
  // VIP ROULETTE GAME: £1 TO £100 BETS
  // ==========================================
  const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const BLACK_NUMBERS = new Set([2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35]);

  // Get recent roulette history
  app.get("/api/roulette/history", (_req, res) => {
    if (!db.rouletteHistory) {
      db.rouletteHistory = [
        { number: 14, color: "red", timestamp: new Date(Date.now() - 60000).toISOString() },
        { number: 22, color: "black", timestamp: new Date(Date.now() - 120000).toISOString() },
        { number: 0, color: "green", timestamp: new Date(Date.now() - 180000).toISOString() },
        { number: 7, color: "red", timestamp: new Date(Date.now() - 240000).toISOString() },
        { number: 31, color: "black", timestamp: new Date(Date.now() - 300000).toISOString() },
      ];
      saveStore();
    }
    res.json({ history: db.rouletteHistory.slice(0, 15) });
  });

  // Place bet and spin roulette
  app.post("/api/roulette/spin", (req, res) => {
    try {
      const { telegramId, bets } = req.body;
      const numericId = parseInt(telegramId, 10);

      if (!numericId) {
        res.status(400).json({ error: "telegramId is required" });
        return;
      }

      if (!Array.isArray(bets) || bets.length === 0) {
        res.status(400).json({ error: "At least one bet is required" });
        return;
      }

      // Calculate total bet amount
      let totalBet = 0;
      for (const b of bets) {
        const amt = parseFloat(b.amount);
        if (isNaN(amt) || amt <= 0) {
          res.status(400).json({ error: "Invalid bet amount" });
          return;
        }
        totalBet += amt;
      }

      totalBet = Math.round(totalBet * 100) / 100;

      // Validate betting bounds: minimum £1, maximum £100
      if (totalBet < 1.00) {
        res.status(400).json({ error: "Minimum total bet is £1.00" });
        return;
      }
      if (totalBet > 100.00) {
        res.status(400).json({ error: "Maximum total bet is £100.00 per spin" });
        return;
      }

      const wallet = getOrCreateWallet(numericId);

      // Check balance
      if (wallet.balance < totalBet) {
        res.status(400).json({
          error: `Insufficient balance. Bet: £${totalBet.toFixed(2)}, Available: £${wallet.balance.toFixed(2)}`,
          balance: wallet.balance,
          required: totalBet,
        });
        return;
      }

      // Deduct bet from wallet
      wallet.balance = Math.max(0, Math.round((wallet.balance - totalBet) * 100) / 100);
      const betTx: Transaction = {
        id: `tx_roulette_bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        telegramId: numericId,
        type: "purchase",
        amount: -totalBet,
        currency: "GBP",
        status: "completed",
        description: `🔴⚫ VIP Roulette Bet (£${totalBet.toFixed(2)})`,
        createdAt: new Date().toISOString(),
      };
      wallet.transactions.unshift(betTx);
      wallet.updatedAt = new Date().toISOString();
      saveStore();

      // Pick winning number between 0 and 36
      const winningNumber = Math.floor(Math.random() * 37);
      let winningColor: "red" | "black" | "green" = "green";
      if (winningNumber === 0) {
        winningColor = "green";
      } else if (RED_NUMBERS.has(winningNumber)) {
        winningColor = "red";
      } else {
        winningColor = "black";
      }

      // Evaluate bets
      let totalPayout = 0;
      const evaluatedBets = bets.map((b: any) => {
        let win = false;
        let payout = 0;
        const amt = parseFloat(b.amount);

        switch (b.type) {
          case "straight":
            if (parseInt(b.number, 10) === winningNumber) {
              win = true;
              payout = amt * 36; // 35:1 + original
            }
            break;
          case "red":
            if (winningColor === "red") {
              win = true;
              payout = amt * 2;
            }
            break;
          case "black":
            if (winningColor === "black") {
              win = true;
              payout = amt * 2;
            }
            break;
          case "even":
            if (winningNumber > 0 && winningNumber % 2 === 0) {
              win = true;
              payout = amt * 2;
            }
            break;
          case "odd":
            if (winningNumber > 0 && winningNumber % 2 === 1) {
              win = true;
              payout = amt * 2;
            }
            break;
          case "low": // 1-18
            if (winningNumber >= 1 && winningNumber <= 18) {
              win = true;
              payout = amt * 2;
            }
            break;
          case "high": // 19-36
            if (winningNumber >= 19 && winningNumber <= 36) {
              win = true;
              payout = amt * 2;
            }
            break;
          case "dozen1": // 1-12
            if (winningNumber >= 1 && winningNumber <= 12) {
              win = true;
              payout = amt * 3;
            }
            break;
          case "dozen2": // 13-24
            if (winningNumber >= 13 && winningNumber <= 24) {
              win = true;
              payout = amt * 3;
            }
            break;
          case "dozen3": // 25-36
            if (winningNumber >= 25 && winningNumber <= 36) {
              win = true;
              payout = amt * 3;
            }
            break;
          case "green":
            if (winningNumber === 0) {
              win = true;
              payout = amt * 36;
            }
            break;
        }

        payout = Math.round(payout * 100) / 100;
        totalPayout += payout;

        return {
          ...b,
          won: win,
          payout,
        };
      });

      totalPayout = Math.round(totalPayout * 100) / 100;

      // Credit winnings if any
      let winTx: Transaction | null = null;
      if (totalPayout > 0) {
        const creditResult = creditWallet(
          numericId,
          totalPayout,
          "GBP",
          `🎉 VIP Roulette Win: Pocket #${winningNumber} (${winningColor.toUpperCase()}) +£${totalPayout.toFixed(2)}`,
          `roulette_win_${Date.now()}`
        );
        winTx = creditResult.transaction;
      } else {
        // Broadcast deduction
        broadcastToUser(numericId, "BALANCE_UPDATED", {
          balance: wallet.balance,
          currency: wallet.currency,
          transaction: betTx,
        });
      }

      // Record in roulette history
      if (!db.rouletteHistory) db.rouletteHistory = [];
      db.rouletteHistory.unshift({
        number: winningNumber,
        color: winningColor,
        timestamp: new Date().toISOString(),
      });
      if (db.rouletteHistory.length > 30) {
        db.rouletteHistory = db.rouletteHistory.slice(0, 30);
      }
      saveStore();

      const latestWallet = getOrCreateWallet(numericId);
      const netProfit = Math.round((totalPayout - totalBet) * 100) / 100;

      res.json({
        success: true,
        winningNumber,
        winningColor,
        totalBet,
        totalPayout,
        netProfit,
        isWin: totalPayout > 0,
        bets: evaluatedBets,
        wallet: latestWallet,
        history: db.rouletteHistory.slice(0, 15),
      });
    } catch (err: any) {
      console.error("Error executing roulette spin:", err);
      res.status(500).json({ error: "Failed to execute roulette spin" });
    }
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
