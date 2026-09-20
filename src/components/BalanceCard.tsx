import React, { useState, useEffect, useRef } from "react";
import { ServerConfig, UserWallet } from "../types";
import { RefreshCw, Zap, ShieldCheck, CreditCard, Sparkles, TrendingUp } from "lucide-react";

interface BalanceCardProps {
  wallet: UserWallet | null;
  config: ServerConfig | null;
  loading: boolean;
  onRefresh: () => void;
  onOpenDeposit: (prefilledAmount?: number) => void;
  onScrollToStore?: () => void;
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  wallet,
  config,
  loading,
  onRefresh,
  onOpenDeposit,
  onScrollToStore,
}) => {
  const [isRotating, setIsRotating] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  const balance = wallet ? wallet.balance : 0.0;
  const currency = wallet?.currency || "GBP";
  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";

  // Optical typography
  const formattedBalance = balance.toFixed(2);
  const [intPart, decPart] = formattedBalance.split(".");

  // Trigger flash animation on balance change
  useEffect(() => {
    if (prevBalanceRef.current !== null && prevBalanceRef.current !== balance) {
      setHasChanged(true);
      const timer = setTimeout(() => setHasChanged(false), 1200);
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  const handleRefreshClick = () => {
    setIsRotating(true);
    onRefresh();
    setTimeout(() => setIsRotating(false), 600);
  };

  return (
    <div className="w-full relative rounded-3xl overflow-hidden p-6 sm:p-7 bg-[#08020e]/90 border border-pink-500/30 backdrop-blur-2xl shadow-[0_12px_45px_rgba(255,46,147,0.18)] transition-all duration-300">
      {/* Radiant Pink & Fuchsia Nebula Core in the Card Background */}
      <div className="absolute -top-24 -right-16 w-56 h-56 bg-gradient-to-br from-pink-500/25 to-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-16 w-60 h-60 bg-gradient-to-tr from-fuchsia-600/20 to-rose-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Tiny celestial sparkles inside card */}
      <div className="absolute top-4 right-20 w-1 h-1 bg-pink-300 rounded-full animate-twinkle-fast shadow-[0_0_4px_#ff69b4]" />
      <div className="absolute bottom-6 right-10 w-1.5 h-1.5 bg-white rounded-full animate-twinkle-slow shadow-[0_0_6px_#ffffff]" />
      <div className="absolute top-12 left-10 w-1 h-1 bg-pink-400 rounded-full animate-twinkle-fast shadow-[0_0_4px_#ff2e93]" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-3 relative z-10 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-widest font-bold text-pink-300/80">
            Available Balance
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-pink-950/70 text-pink-300 border border-pink-500/30 shadow-[0_0_8px_rgba(255,46,147,0.2)]">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-ping" />
            Live Sync Active
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] px-2.5 py-0.5 rounded-full font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            {config?.hasStripeKey && config.stripeMode ? `Stripe ${config.stripeMode.toUpperCase()} Active` : "Stripe LIVE Active"}
          </span>
        </div>

        <button
          id="btn-refresh-balance"
          onClick={handleRefreshClick}
          disabled={loading}
          title="Refresh balance"
          className="p-2 rounded-xl text-pink-300/80 hover:text-pink-100 hover:bg-pink-950/60 border border-pink-500/20 active:scale-95 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRotating || loading ? "animate-spin text-pink-400" : ""}`} />
        </button>
      </div>

      {/* Prominent Balance Display: Centerpiece with glowing pink accent */}
      <div className="relative z-10 my-4 py-2">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          {/* Glowing Currency Symbol */}
          <span className="text-3xl sm:text-4xl font-extrabold text-pink-400/95 font-mono drop-shadow-[0_0_12px_rgba(255,46,147,0.6)]">
            {currencySymbol}
          </span>

          {/* Big, bold integer part */}
          <span
            className={`text-5xl sm:text-6xl font-black text-white tracking-tight font-mono transition-all duration-300 drop-shadow-[0_0_18px_rgba(255,46,147,0.35)] ${
              hasChanged ? "animate-balance-flash text-pink-200" : ""
            }`}
          >
            {intPart}
          </span>

          {/* Decimal part */}
          <span
            className={`text-3xl sm:text-4xl font-bold font-mono text-pink-400/90 transition-all drop-shadow-[0_0_10px_rgba(255,46,147,0.5)] ${
              hasChanged ? "text-pink-100" : ""
            }`}
          >
            .{decPart}
          </span>

          {/* Currency Pill */}
          <span className="ml-2 inline-flex items-center text-xs font-bold text-pink-200 bg-pink-900/50 border border-pink-500/40 px-2.5 py-1 rounded-lg tracking-wider">
            {currency}
          </span>
        </div>

        {/* Change alert bar when updated */}
        {hasChanged && (
          <div className="mt-2 text-xs font-semibold text-pink-300 flex items-center gap-1 animate-bounce">
            <TrendingUp className="w-3.5 h-3.5 text-pink-400" />
            <span>Balance updated instantly!</span>
          </div>
        )}
      </div>

      {/* Instant Sync Notice with Night-sky Pink/Emerald styling */}
      <div className="relative z-10 flex items-center gap-2 text-xs text-pink-200/90 mb-6 bg-pink-950/40 border border-pink-500/25 rounded-xl px-3.5 py-2">
        <div className="p-1 rounded-md bg-pink-500/20 text-pink-300 flex-shrink-0">
          <Zap className="w-3.5 h-3.5" />
        </div>
        <span className="leading-snug text-[12px]">
          Deposits via Stripe reflect <strong>instantly in £ GBP</strong> on this mini app.
        </span>
      </div>

      {/* Quick Deposit Chips in GBP - Opens Stripe Deposit with that amount */}
      <div className="relative z-10 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-pink-300/70">
            Deposit Amount Presets (£ GBP)
          </span>
          <span className="text-[10px] text-pink-400/80">Stripe Card & Pay</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {[5, 10, 20, 30, 50, 100].map((amt) => (
            <button
              key={amt}
              onClick={() => onOpenDeposit(amt)}
              className="py-2.5 px-1 rounded-xl bg-black/60 hover:bg-pink-950/70 border border-pink-500/30 hover:border-pink-400 text-pink-200 font-bold text-xs active:scale-95 transition-all cursor-pointer text-center shadow-[0_2px_10px_rgba(255,46,147,0.1)]"
            >
              +£{amt}
            </button>
          ))}
        </div>
      </div>

      {/* Primary Action Buttons */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          id="btn-open-deposit-modal"
          onClick={() => onOpenDeposit()}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:via-rose-400 hover:to-fuchsia-500 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(255,46,147,0.45)] hover:shadow-[0_0_35px_rgba(255,46,147,0.65)] active:scale-[0.98] transition-all cursor-pointer"
        >
          <CreditCard className="w-4 h-4 text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.7)]" />
          <span>Deposit via Stripe</span>
        </button>

        <button
          id="btn-scroll-to-store"
          onClick={() => {
            if (onScrollToStore) {
              onScrollToStore();
            } else {
              const el = document.getElementById("exclusive-groups-store");
              el?.scrollIntoView({ behavior: "smooth" });
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-black/80 hover:bg-pink-950/60 border border-pink-500/40 hover:border-pink-400 text-pink-200 font-bold text-sm active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
        >
          <Sparkles className="w-4 h-4 text-pink-400" />
          <span>Buy VIP Groups (£5 - £50)</span>
        </button>
      </div>
    </div>
  );
};
