import React, { useState } from "react";
import { ServerConfig } from "../types";
import { X, Copy, Check, Terminal, Bot, Globe, CreditCard } from "lucide-react";

interface BotSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
  config: ServerConfig | null;
}

export const BotSetupGuide: React.FC<BotSetupGuideProps> = ({ isOpen, onClose, config }) => {
  const [activeTab, setActiveTab] = useState<"bot" | "render" | "stripe">("bot");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentAppUrl = config?.appUrl || window.location.origin;
  const webhookUrl = `${currentAppUrl}/api/stripe/webhook`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const pythonBotCode = `# Python (python-telegram-bot v20+)
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes

APP_URL = "${currentAppUrl}"

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    keyboard = [
        [InlineKeyboardButton("Open Wallet (£ GBP) 💳", web_app=WebAppInfo(url=APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    await update.message.reply_text(
        f"👋 Welcome to your Wallet, {update.effective_user.first_name}!\\n"
        "Tap below to open your Mini App & deposit funds instantly with Stripe in £ GBP:",
        reply_markup=reply_markup
    )

app = ApplicationBuilder().token("YOUR_BOT_TOKEN").build()
app.add_handler(CommandHandler("start", start))
app.run_polling()`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-[#090212] border border-pink-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(255,46,147,0.25)] max-h-[90vh] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-500/20 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-950/70 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Bot, GitHub & Render Setup</h2>
              <p className="text-xs text-pink-300/70">Connect your bot with instant GBP balance sync</p>
            </div>
          </div>
          <button
            id="btn-close-guide-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-pink-300/70 hover:text-white hover:bg-pink-950/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 py-3 border-b border-pink-500/20 flex-shrink-0 relative z-10">
          <button
            onClick={() => setActiveTab("bot")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "bot"
                ? "bg-pink-500/25 border border-pink-400 text-pink-100 shadow-[0_0_12px_rgba(255,46,147,0.3)]"
                : "text-pink-300/70 hover:text-pink-100 hover:bg-pink-950/40"
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>1. Telegram Bot</span>
          </button>
          <button
            onClick={() => setActiveTab("render")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "render"
                ? "bg-pink-500/25 border border-pink-400 text-pink-100 shadow-[0_0_12px_rgba(255,46,147,0.3)]"
                : "text-pink-300/70 hover:text-pink-100 hover:bg-pink-950/40"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>2. Render & GitHub</span>
          </button>
          <button
            onClick={() => setActiveTab("stripe")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "stripe"
                ? "bg-pink-500/25 border border-pink-400 text-pink-100 shadow-[0_0_12px_rgba(255,46,147,0.3)]"
                : "text-pink-300/70 hover:text-pink-100 hover:bg-pink-950/40"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>3. Stripe Webhook</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 text-xs relative z-10">
          {activeTab === "bot" && (
            <div className="space-y-4">
              <div className="bg-black/70 p-4 rounded-2xl border border-pink-500/20 space-y-3">
                <div className="font-bold text-white flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-300 flex items-center justify-center text-[11px]">
                    A
                  </span>
                  Attach Menu Button with @BotFather
                </div>
                <p className="text-pink-300/70 leading-relaxed">
                  Give your users a persistent "Open Wallet (£)" menu button right inside Telegram:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-pink-200 pl-1">
                  <li>Message <strong className="text-pink-400">@BotFather</strong></li>
                  <li>Send: <code className="bg-pink-950/80 px-1.5 py-0.5 rounded text-pink-300">/setmenubutton</code></li>
                  <li>Select your bot</li>
                  <li>Set URL to your deployed Render URL (or this app URL):</li>
                </ol>
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-pink-500/30 font-mono text-pink-300">
                  <span className="truncate pr-2">{currentAppUrl}</span>
                  <button
                    onClick={() => copyToClipboard(currentAppUrl, "app_url")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-950/70 hover:bg-pink-900 border border-pink-500/40 text-pink-200 text-[11px] cursor-pointer"
                  >
                    {copiedKey === "app_url" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "app_url" ? "Copied" : "Copy"}</span>
                  </button>
                </div>
              </div>

              <div className="bg-black/70 p-4 rounded-2xl border border-pink-500/20 space-y-2">
                <div className="font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-pink-400" />
                    Python Bot Example Code
                  </span>
                  <button
                    onClick={() => copyToClipboard(pythonBotCode, "py_code")}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-950/70 hover:bg-pink-900 border border-pink-500/40 text-pink-200 text-[11px] cursor-pointer"
                  >
                    {copiedKey === "py_code" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy Code</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-black text-pink-300/90 font-mono text-[11px] overflow-x-auto border border-pink-500/20">
                  {pythonBotCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === "render" && (
            <div className="space-y-4">
              <div className="bg-black/70 p-4 rounded-2xl border border-pink-500/20 space-y-3">
                <div className="font-bold text-white">Deploying on Render with GitHub</div>
                <p className="text-pink-300/70 leading-relaxed">
                  In your Render dashboard, create a <strong>Web Service</strong> linked to your GitHub repo:
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 bg-black rounded-xl border border-pink-500/20">
                    <span className="text-pink-400/60">Build Command:</span>
                    <div className="text-pink-200 font-bold mt-0.5">npm install && npm run build</div>
                  </div>
                  <div className="p-2.5 bg-black rounded-xl border border-pink-500/20">
                    <span className="text-pink-400/60">Start Command:</span>
                    <div className="text-pink-200 font-bold mt-0.5">npm start</div>
                  </div>
                </div>

                <div className="font-bold text-white pt-2">Environment Variables on Render:</div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="p-2 bg-black rounded-lg border border-pink-500/20 text-pink-300">
                    STRIPE_SECRET_KEY=sk_live_... (or sk_test_...)
                  </div>
                  <div className="p-2 bg-black rounded-lg border border-pink-500/20 text-pink-300">
                    STRIPE_WEBHOOK_SECRET=whsec_...
                  </div>
                  <div className="p-2 bg-black rounded-lg border border-pink-500/20 text-pink-300">
                    APP_URL=https://your-app-name.onrender.com
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stripe" && (
            <div className="space-y-4">
              <div className="bg-black/70 p-4 rounded-2xl border border-pink-500/20 space-y-3">
                <div className="font-bold text-white">Configuring Stripe Webhook for Instant Balance Update</div>
                <p className="text-pink-300/70 leading-relaxed">
                  Stripe sends a webhook event the millisecond a payment succeeds, immediately updating the user's balance via real-time SSE stream.
                </p>

                <div>
                  <label className="text-[11px] text-pink-400/80 font-bold block mb-1">Webhook Endpoint URL:</label>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black border border-pink-500/30 font-mono text-pink-300">
                    <span className="truncate pr-2">{webhookUrl}</span>
                    <button
                      onClick={() => copyToClipboard(webhookUrl, "webhook_url")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-950/70 hover:bg-pink-900 border border-pink-500/40 text-pink-200 text-[11px] cursor-pointer"
                    >
                      {copiedKey === "webhook_url" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedKey === "webhook_url" ? "Copied" : "Copy"}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1 text-pink-200/90 pt-1">
                  <div className="font-semibold text-white">Events to listen for in Stripe Dashboard:</div>
                  <div className="p-2 bg-black rounded-lg border border-pink-500/20 font-mono text-pink-400 text-[11px]">
                    checkout.session.completed
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
