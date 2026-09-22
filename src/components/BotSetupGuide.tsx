import React, { useState } from "react";
import { ServerConfig } from "../types";
import { X, CreditCard, ShieldCheck, HelpCircle, Sparkles, CheckCircle2, Zap, Users } from "lucide-react";

interface BotSetupGuideProps {
  isOpen: boolean;
  onClose: () => void;
  config?: ServerConfig | null;
}

export const BotSetupGuide: React.FC<BotSetupGuideProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"deposits" | "groups" | "security">("deposits");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-[#090212] border border-pink-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(255,46,147,0.25)] max-h-[90vh] flex flex-col relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-24 -left-24 w-56 h-56 bg-pink-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-500/20 flex-shrink-0 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-pink-950/70 border border-pink-500/40 flex items-center justify-center text-pink-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">How It Works & FAQ</h2>
              <p className="text-xs text-pink-300/70">Instant wallet top-ups & VIP community access</p>
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
            onClick={() => setActiveTab("deposits")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "deposits"
                ? "bg-pink-500/25 border border-pink-400 text-pink-100 shadow-[0_0_12px_rgba(255,46,147,0.3)]"
                : "text-pink-300/70 hover:text-pink-100 hover:bg-pink-950/40"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>1. Deposits & Wallet</span>
          </button>
          <button
            onClick={() => setActiveTab("groups")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "groups"
                ? "bg-pink-500/25 border border-pink-400 text-pink-100 shadow-[0_0_12px_rgba(255,46,147,0.3)]"
                : "text-pink-300/70 hover:text-pink-100 hover:bg-pink-950/40"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>2. VIP Groups</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "security"
                ? "bg-pink-500/25 border border-pink-400 text-pink-100 shadow-[0_0_12px_rgba(255,46,147,0.3)]"
                : "text-pink-300/70 hover:text-pink-100 hover:bg-pink-950/40"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. Security & Safety</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 text-xs relative z-10">
          {activeTab === "deposits" && (
            <div className="space-y-3">
              <div className="bg-black/60 p-4 rounded-2xl border border-pink-500/20 space-y-2.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <Zap className="w-4 h-4 text-pink-400" />
                  Instant Wallet Top-Up in £ GBP
                </div>
                <p className="text-pink-200/80 leading-relaxed">
                  You can top up your balance securely anytime using official Stripe Checkout.
                </p>
                <div className="space-y-2 pt-1 text-pink-300/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Accepted Methods:</strong> Apple Pay, Google Pay, Visa, Mastercard, and American Express.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Real-time Balance:</strong> The exact amount in £ GBP is credited to your Telegram account immediately upon payment.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Direct Purchases:</strong> You can also unlock any group directly at checkout without pre-depositing.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "groups" && (
            <div className="space-y-3">
              <div className="bg-black/60 p-4 rounded-2xl border border-pink-500/20 space-y-2.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-pink-400" />
                  Unlocking VIP Communities
                </div>
                <p className="text-pink-200/80 leading-relaxed">
                  Join exclusive private channels and group communities in a single tap:
                </p>
                <div className="space-y-2.5 pt-1 text-pink-300/90">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-300 flex items-center justify-center text-[10px] shrink-0 font-bold">1</span>
                    <span>Browse available groups and tap <strong>"Unlock with Balance"</strong> or <strong>"Pay via Stripe"</strong>.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-300 flex items-center justify-center text-[10px] shrink-0 font-bold">2</span>
                    <span>Once unlocked, an official <strong>private Telegram invite link</strong> is generated exclusively for your account.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/30 text-pink-300 flex items-center justify-center text-[10px] shrink-0 font-bold">3</span>
                    <span>Tap <strong>"Join Group"</strong> to instantly enter the community on Telegram.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-3">
              <div className="bg-black/60 p-4 rounded-2xl border border-pink-500/20 space-y-2.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Stripe Certified Buyer Protection
                </div>
                <p className="text-pink-200/80 leading-relaxed">
                  All transactions are handled through Stripe's banking-grade infrastructure:
                </p>
                <div className="space-y-2 pt-1 text-pink-300/90">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <span><strong>PCI-DSS Level 1:</strong> Your financial and card details are encrypted directly by Stripe. No payment info is stored on our servers.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <span><strong>Telegram Account Binding:</strong> Your purchases and balance stay permanently attached to your Telegram user ID.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <span><strong>Instant Receipts:</strong> Every deposit and unlock is logged with a permanent transaction reference.</span>
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

