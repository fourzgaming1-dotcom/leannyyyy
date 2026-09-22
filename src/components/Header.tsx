import React, { useState, useEffect, useRef } from "react";
import { TelegramUser, ServerConfig, UserWallet } from "../types";
import { DEMO_USERS } from "../hooks/useTelegram";
import {
  User,
  Radio,
  BookOpen,
  ChevronDown,
  Check,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface HeaderProps {
  user: TelegramUser;
  isTelegram: boolean;
  sseConnected: boolean;
  config: ServerConfig | null;
  wallet?: UserWallet | null;
  loading?: boolean;
  onRefresh?: () => void;
  onOpenDeposit?: (prefilledAmount?: number) => void;
  onSwitchUser: (user: TelegramUser) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isTelegram,
  sseConnected,
  config,
  wallet,
  loading = false,
  onRefresh,
  onOpenDeposit,
  onSwitchUser,
  onOpenGuide,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const prevBalanceRef = useRef<number | null>(null);

  const balance = wallet ? wallet.balance : 0.0;
  const currency = wallet?.currency || "GBP";
  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";
  const formattedBalance = balance.toFixed(2);
  const [intPart, decPart] = formattedBalance.split(".");

  // Flash animation on balance change
  useEffect(() => {
    if (prevBalanceRef.current !== null && prevBalanceRef.current !== balance) {
      setHasChanged(true);
      const timer = setTimeout(() => setHasChanged(false), 1400);
      return () => clearTimeout(timer);
    }
    prevBalanceRef.current = balance;
  }, [balance]);

  const handleRefreshClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRefresh) {
      setIsRotating(true);
      onRefresh();
      setTimeout(() => setIsRotating(false), 600);
    }
  };

  // Avatar initials
  const initials = (user.first_name?.[0] || "V") + (user.last_name?.[0] || "P");

  return (
    <header className="w-full bg-[#05010a]/90 backdrop-blur-xl border-b border-pink-500/20 sticky top-0 z-30 px-3.5 py-2.5 shadow-[0_4px_30px_rgba(0,0,0,0.7)]">
      <div className="max-w-md mx-auto space-y-2.5">
        {/* Top Control Bar: VIP Member & Account Controls */}
        <div className="flex items-center justify-between gap-2.5">
          {/* User Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex-shrink-0">
              {user.photo_url ? (
                <img
                  src={user.photo_url}
                  alt={user.first_name}
                  className="w-9 h-9 rounded-full border-2 border-pink-500/50 shadow-[0_0_10px_rgba(255,46,147,0.4)] object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-600 via-rose-600 to-fuchsia-700 flex items-center justify-center font-extrabold text-xs text-white shadow-[0_0_12px_rgba(255,46,147,0.35)]">
                  {initials}
                </div>
              )}
              {/* SSE Live Pulse */}
              <span
                title={sseConnected ? "Live balance push connected" : "Syncing..."}
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-black ${
                  sseConnected ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" : "bg-pink-400"
                }`}
              />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-pink-50 text-sm truncate leading-tight">
                  {user.first_name} {user.last_name || ""}
                </span>
                <span
                  title="VIP Member Status"
                  className="px-1.5 py-0.5 rounded-md bg-pink-500/20 border border-pink-500/40 text-[9px] font-extrabold text-pink-300 tracking-wider uppercase drop-shadow-[0_0_6px_rgba(255,46,147,0.4)]"
                >
                  VIP
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-pink-300/70">
                <span className="text-pink-400 font-mono text-[10px]">
                  {user.username ? `@${user.username}` : `ID: ${user.id}`}
                </span>
                <span className="text-pink-900">•</span>
                <span className="flex items-center gap-1 text-[10px]">
                  <Radio className={`w-2.5 h-2.5 ${sseConnected ? "text-emerald-400" : "text-pink-400"}`} />
                  {sseConnected ? "Live Sync" : "Syncing"}
                </span>
              </div>
            </div>
          </div>

          {/* Account and FAQ Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Account switcher */}
            {!isTelegram && (
              <div className="relative">
                <button
                  id="header-user-switcher"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-pink-950/60 border border-pink-500/30 text-xs text-pink-200 font-semibold transition-colors cursor-pointer shadow-[0_0_8px_rgba(255,46,147,0.1)]"
                  title="Account settings & switcher"
                >
                  <User className="w-3.5 h-3.5 text-pink-400" />
                  <span>Account</span>
                  <ChevronDown className="w-3 h-3 text-pink-400" />
                </button>

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                    <div className="absolute right-0 mt-1.5 w-56 bg-[#0c0214] border border-pink-500/40 rounded-2xl shadow-2xl py-1 z-50 text-xs divide-y divide-pink-950">
                      <div className="px-3 py-2 text-[11px] font-semibold text-pink-300/70 uppercase tracking-wider">
                        Active Telegram Profile
                      </div>
                      {DEMO_USERS.map((demo) => (
                        <button
                          key={demo.id}
                          onClick={() => {
                            onSwitchUser(demo);
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-2 flex items-center justify-between hover:bg-pink-950/50 transition-colors cursor-pointer"
                        >
                          <div>
                            <div className="font-semibold text-pink-100">{demo.first_name} {demo.last_name || ""}</div>
                            <div className="text-pink-400/80 text-[11px]">@{demo.username} (ID: {demo.id})</div>
                          </div>
                          {user.id === demo.id && <Check className="w-4 h-4 text-pink-400" />}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* FAQ & Help Guide */}
            <button
              id="header-faq-guide-btn"
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-950/50 hover:bg-pink-900/60 border border-pink-500/40 text-pink-200 text-xs font-semibold shadow-[0_0_10px_rgba(255,46,147,0.15)] transition-colors cursor-pointer"
              title="How It Works & FAQ"
            >
              <BookOpen className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden xs:inline">FAQ</span>
            </button>
          </div>
        </div>

        {/* Top Balance Bar: Positioned along the top close to VIP Member and Account */}
        <div
          id="top-balance-bar"
          onClick={() => onOpenDeposit && onOpenDeposit()}
          className="w-full flex items-center justify-between gap-3 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-[#0d0218]/95 via-[#18042b]/90 to-[#0d0218]/95 border border-pink-500/40 shadow-[0_4px_22px_rgba(255,46,147,0.22)] hover:border-pink-400/60 transition-all cursor-pointer relative overflow-hidden group"
        >
          {/* Subtle neon glow sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/10 to-transparent pointer-events-none" />

          {/* Balance side */}
          <div className="flex items-center gap-2.5 min-w-0 relative z-10">
            <div className="w-8 h-8 rounded-xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-[0_0_10px_rgba(255,46,147,0.25)] flex-shrink-0">
              <Wallet className="w-4 h-4 text-pink-400" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-400/80 leading-tight">
                  Available Balance
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 font-semibold">
                  <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
                {hasChanged && (
                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-pink-300 animate-bounce">
                    <TrendingUp className="w-2.5 h-2.5 text-pink-400" />
                    Updated!
                  </span>
                )}
              </div>

              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-extrabold text-pink-400 font-mono drop-shadow-[0_0_8px_rgba(255,46,147,0.5)]">
                  {currencySymbol}
                </span>
                <span
                  className={`text-lg sm:text-xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_12px_rgba(255,46,147,0.35)] transition-all ${
                    hasChanged ? "text-pink-200 scale-105" : ""
                  }`}
                >
                  {intPart}.{decPart}
                </span>
                <span className="text-[10px] font-bold text-pink-400/80 font-mono">
                  {currency}
                </span>
              </div>
            </div>
          </div>

          {/* Action side: Refresh and + Deposit button */}
          <div className="flex items-center gap-1.5 relative z-10 flex-shrink-0">
            <button
              id="top-bar-refresh-btn"
              onClick={handleRefreshClick}
              disabled={loading}
              title="Refresh Balance"
              className="p-1.5 rounded-xl text-pink-300/80 hover:text-pink-100 hover:bg-pink-950/70 border border-pink-500/30 active:scale-95 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRotating || loading ? "animate-spin text-pink-400" : ""}`} />
            </button>

            <button
              id="top-bar-deposit-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenDeposit && onOpenDeposit();
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(255,46,147,0.45)] hover:shadow-[0_0_20px_rgba(255,46,147,0.65)] active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Deposit</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
