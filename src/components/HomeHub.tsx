import React, { useState, useEffect } from "react";
import {
  Crown,
  Sparkles,
  Zap,
  ArrowRight,
  Shield,
  CreditCard,
  Gift,
  Coins,
  ChevronRight,
  Flame,
  Users,
  CheckCircle2,
  Star,
} from "lucide-react";
import { GroupItem, UserWallet, TelegramUser, NavTab } from "../types";
import { getGroupTheme } from "../utils/groupThemes";

interface HomeHubProps {
  user: TelegramUser;
  wallet: UserWallet | null;
  groups: GroupItem[];
  onNavigate: (tab: NavTab) => void;
  onNavigateToGame?: (game: "wheel" | "crossy") => void;
  onOpenDeposit: (amt?: number) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  openUrl: (url: string) => void;
  spinsLeft?: number;
}

const RECENT_ACTIVITY = [
  { user: "@alex_vip", action: "unlocked Ebony VIP", time: "2m ago", badge: "VIP" },
  { user: "@jordan99", action: "won £5 from Lucky Wheel", time: "4m ago", badge: "WINNER" },
  { user: "@sophie_x", action: "unlocked All Groups Master Pass (65 VIPs)", time: "7m ago", badge: "MASTER" },
  { user: "@kyle_b", action: "unlocked Chav VIP", time: "11m ago", badge: "VIP" },
  { user: "@leo_baller", action: "unlocked 💎 Baller Bundle", time: "16m ago", badge: "BUNDLE" },
  { user: "@marcus_t", action: "hit 10 hops & got free 💎 Baller Group!", time: "22m ago", badge: "WINNER" },
];

export const HomeHub: React.FC<HomeHubProps> = ({
  user,
  wallet,
  groups,
  onNavigate,
  onNavigateToGame,
  onOpenDeposit,
  triggerHaptic,
  openUrl,
  spinsLeft = 3,
}) => {
  const [activityIndex, setActivityIndex] = useState(0);

  // Cycle live ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setActivityIndex((prev) => (prev + 1) % RECENT_ACTIVITY.length);
    }, 3800);
    return () => clearInterval(timer);
  }, []);

  const currentActivity = RECENT_ACTIVITY[activityIndex];
  const balance = wallet ? wallet.balance : 0;
  const purchasedCount = groups.filter((g) => g.isPurchased).length;

  const masterGroup = groups.find((g) => g.id === "all-groups");
  const ballerGroup = groups.find((g) => g.id === "baller-bundle");

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Live Member Activity Ticker */}
      <div className="bg-[#0e011d]/90 border border-pink-500/30 rounded-2xl px-3.5 py-2 flex items-center justify-between text-xs backdrop-blur-xl shadow-[0_0_15px_rgba(236,72,153,0.15)]">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-400 flex-shrink-0">
            LIVE:
          </span>
          <p className="text-pink-100 font-medium truncate text-[11px]">
            <span className="text-yellow-300 font-bold">{currentActivity.user}</span>{" "}
            {currentActivity.action}
          </p>
        </div>
        <span className="text-[10px] text-pink-400/60 font-mono ml-2 flex-shrink-0">
          {currentActivity.time}
        </span>
      </div>

      {/* VIP Member Hero Card */}
      <div className="relative rounded-3xl p-5 overflow-hidden bg-gradient-to-br from-[#1d0330] via-[#10011c] to-[#07000e] border border-pink-500/40 shadow-[0_0_35px_rgba(236,72,153,0.25)]">
        <div className="absolute top-0 right-0 w-44 h-44 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-600 to-purple-600 p-0.5 shadow-[0_0_15px_rgba(236,72,153,0.5)] flex items-center justify-center">
              <div className="w-full h-full rounded-2xl bg-[#090014] flex items-center justify-center font-black text-pink-300 text-lg">
                {user.first_name ? user.first_name[0].toUpperCase() : "V"}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-white text-base leading-tight">
                  {user.first_name}
                </h3>
                <span className="px-1.5 py-0.5 rounded-full bg-pink-950 text-pink-300 border border-pink-500/40 text-[9px] font-black tracking-wider uppercase">
                  VIP
                </span>
              </div>
              <p className="text-[11px] text-pink-300/70 font-mono">
                {user.username ? `@${user.username}` : `ID: ${user.id}`}
              </p>
            </div>
          </div>

          {/* Unlocked Groups Count */}
          <button
            onClick={() => onNavigate("groups")}
            className="text-right cursor-pointer group"
          >
            <span className="text-[10px] text-pink-400 font-bold block uppercase tracking-wider">
              My Passes
            </span>
            <span className="text-base font-black text-white font-mono group-hover:text-pink-300 transition-colors">
              {purchasedCount} / {groups.length}
            </span>
          </button>
        </div>

        {/* Live Wallet Balance Sub-bar */}
        <div className="mt-4 pt-3.5 border-t border-pink-900/40 flex items-center justify-between">
          <div>
            <span className="text-[10px] text-pink-300/70 font-bold block uppercase tracking-wider">
              Wallet Balance
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-black text-white font-mono tracking-tight drop-shadow-[0_0_10px_rgba(255,46,147,0.5)]">
                £{balance.toFixed(2)}
              </span>
              <span className="text-xs text-pink-400 font-bold">GBP</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDeposit()}
              className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(236,72,153,0.4)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Top Up</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive VIP Games Banners Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Interactive Lucky Mini-Game Banner (£1 Spin & 25 Prizes) */}
        <div
          onClick={() => {
            triggerHaptic("medium");
            if (onNavigateToGame) {
              onNavigateToGame("wheel");
            } else {
              onNavigate("game");
            }
          }}
          className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-[#2a0438] via-[#1a012b] to-[#250133] border-2 border-yellow-400/70 shadow-[0_0_25px_rgba(250,204,21,0.2)] cursor-pointer group active:scale-[0.99] transition-all flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-yellow-400/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-950/80 border border-yellow-400/50 text-yellow-300 text-[10px] font-extrabold uppercase tracking-wider">
                <Sparkles className="w-3 h-3 text-yellow-300 animate-spin" />
                <span>25 Prizes · £1 Spin</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-400 to-amber-500 p-0.5 shadow flex-shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-xl bg-[#140024] flex items-center justify-center text-yellow-300">
                  <Gift className="w-4 h-4 animate-bounce" />
                </div>
              </div>
            </div>

            <h3 className="text-base font-black text-white tracking-tight">
              Lucky Wheel: <span className="bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">Win £100</span>
            </h3>

            <p className="text-[11px] text-pink-200/80 mt-1 leading-snug">
              Spin to unlock Ebony, Chav, Baller VIP passes or up to £100 instant wallet credits!
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-yellow-500/20 flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-yellow-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              Instant Credited
            </span>
            <span className="text-pink-300 font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
              <span>Play Wheel</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Interactive VIP Crossy Road Banner (1p to £2.00 Progression) */}
        <div
          onClick={() => {
            triggerHaptic("heavy");
            if (onNavigateToGame) {
              onNavigateToGame("crossy");
            } else {
              onNavigate("game");
            }
          }}
          className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-[#1c080d] via-[#10031a] to-[#0a0014] border-2 border-amber-500/70 shadow-[0_0_25px_rgba(245,158,11,0.25)] cursor-pointer group active:scale-[0.99] transition-all flex flex-col justify-between"
        >
          <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
                <Crown className="w-3 h-3 text-amber-400" />
                <span>13 Jumps · 1p to £2.00</span>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow flex-shrink-0 flex items-center justify-center">
                <div className="w-full h-full rounded-xl bg-[#12001c] flex items-center justify-center text-amber-300">
                  <Flame className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
              </div>
            </div>

            <h3 className="text-base font-black text-white tracking-tight">
              VIP Crossy Road: <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-pink-400 bg-clip-text text-transparent">Hop For Cash</span>
            </h3>

            <p className="text-[11px] text-amber-200/80 mt-1 leading-snug">
              Dodge speeding cars and trucks! Each safe jump progressively credits your live wallet: 1p, 2p, 3p, 6p, 10p, 20p, 25p, 35p, 40p, 55p, 60p, 80p, £2.00!
            </p>
          </div>

          <div className="mt-3 pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs">
            <span className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
              <Coins className="w-3 h-3 text-emerald-400" />
              Instant Spendable Credits
            </span>
            <span className="text-amber-300 font-extrabold flex items-center gap-1 text-[11px] group-hover:translate-x-1 transition-transform">
              <span>Play Crossy Road</span>
              <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Featured VIP Bundles Showcase */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-yellow-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Featured VIP Passes
            </h3>
          </div>
          <button
            onClick={() => onNavigate("bundles")}
            className="text-xs text-pink-400 hover:text-pink-300 font-bold flex items-center gap-1 cursor-pointer"
          >
            <span>View All Bundles</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Master Access Pass Spotlight */}
        {masterGroup && (
          <div
            onClick={() => onNavigate("bundles")}
            className="relative rounded-3xl p-4 overflow-hidden bg-gradient-to-br from-[#2a0438] via-[#1a0128] to-[#0c0014] border-2 border-yellow-400/80 shadow-[0_0_35px_rgba(250,204,21,0.35)] cursor-pointer group hover:border-yellow-400 transition-all"
          >
            {getGroupTheme("all-groups").overlayPattern}

            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                  BEST VALUE · ALL INCLUSIVE
                </span>
                <div className="text-right">
                  <span className="text-2xl font-black text-white font-mono">
                    £{masterGroup.price}
                  </span>
                  <span className="text-[10px] text-pink-300 font-bold ml-1">GBP</span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  <span>{masterGroup.name}</span>
                </h4>
                <p className="text-xs text-pink-200/80 mt-0.5">
                  {masterGroup.description}
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-yellow-500/25">
                <div className="flex items-center gap-2 text-[11px] text-yellow-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="font-extrabold">Includes all 65 VIP communities</span>
                </div>
                <span className="text-xs font-extrabold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Unlock VIP</span>
                  <ArrowRight className="w-3.5 h-3.5 text-yellow-400" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Baller Bundle Spotlight with 💎 Diamond Emoji */}
        {ballerGroup && (
          <div
            onClick={() => onNavigate("bundles")}
            className="relative rounded-3xl p-4 overflow-hidden bg-gradient-to-br from-[#04281f] via-[#091b26] to-[#09021a] border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.3)] cursor-pointer group hover:border-emerald-300 transition-all"
          >
            {getGroupTheme("baller-bundle").overlayPattern}

            <div className="relative z-10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-black text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  💎 HIGH ROLLER TIER
                </span>
                <div className="text-right">
                  <span className="text-2xl font-black text-white font-mono">
                    £{ballerGroup.price}
                  </span>
                  <span className="text-[10px] text-emerald-300 font-bold ml-1">GBP</span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-black text-white flex items-center gap-1.5">
                  <span className="text-lg">💎</span>
                  <span>{ballerGroup.name}</span>
                </h4>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  You can get 54 groups for that price! Full Baller tier bundle access package with lifetime private invite links.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-emerald-500/25">
                <div className="flex items-center gap-2 text-[11px] text-emerald-300 font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>💎 Includes 54 VIP groups for this price (£30)</span>
                </div>
                <span className="text-xs font-extrabold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Get 💎 Baller Bundle</span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                </span>
              </div>
            </div>
          </div>
        )}

        {/* BRIGHT, BIG, CONTRASTING INDIVIDUAL GROUPS SPOTLIGHT with ⭐ Star Emoji */}
        <div
          onClick={() => {
            triggerHaptic("medium");
            onNavigate("groups");
          }}
          className="relative rounded-3xl p-4 overflow-hidden bg-gradient-to-br from-[#2f0438] via-[#1a0133] to-[#0e0024] border-2 border-fuchsia-400/80 shadow-[0_0_35px_rgba(217,70,239,0.35)] cursor-pointer group hover:border-fuchsia-300 transition-all"
        >
          {/* Radiant Contrast Glow in Background */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-fuchsia-400 via-pink-400 to-rose-400 text-black text-[9px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(236,72,153,0.5)] flex items-center gap-1">
                <Star className="w-3 h-3 fill-black text-black" />
                <span>⭐ INDIVIDUAL VIP GROUPS</span>
              </span>
              <div className="text-right">
                <span className="text-2xl font-black text-white font-mono">
                  £10.00
                </span>
                <span className="text-[10px] text-fuchsia-300 font-bold ml-1">each</span>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-black text-white flex items-center gap-1.5">
                <span className="text-lg">⭐</span>
                <span>Individual VIP Groups</span>
              </h4>
              <p className="text-xs text-pink-200/90 mt-0.5">
                Choose your favorite channels individually at £10 each. Instant private Telegram link delivered to your bot immediately!
              </p>
            </div>

            {/* Bright contrasting group pill previews with £10 pricing */}
            <div className="grid grid-cols-3 gap-1.5 pt-1">
              {[
                { name: "Ebony VIP", price: "£10" },
                { name: "Chav VIP", price: "£10" },
                { name: "Asian VIP", price: "£10" },
                { name: "British VIP", price: "£10" },
                { name: "Irish VIP", price: "£10" },
                { name: "Scottish VIP", price: "£10" },
              ].map((grp) => (
                <div
                  key={grp.name}
                  className="py-1 px-1.5 rounded-xl bg-black/60 border border-fuchsia-400/40 text-center flex items-center justify-between text-[10px] font-bold text-white shadow-sm"
                >
                  <span className="truncate">⭐ {grp.name}</span>
                  <span className="text-fuchsia-300 font-mono ml-1 font-extrabold">{grp.price}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-fuchsia-500/30">
              <div className="flex items-center gap-2 text-[11px] text-fuchsia-300 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>⭐ Includes all individual channels (65 Communities · £10 each)</span>
              </div>
              <span className="text-xs font-extrabold text-white flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                <span>View All Groups</span>
                <ArrowRight className="w-3.5 h-3.5 text-fuchsia-400" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          onClick={() => {
            triggerHaptic("light");
            onNavigate("groups");
          }}
          className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1c0228] to-[#0d0119] border-2 border-fuchsia-400/60 hover:border-fuchsia-400 text-left transition-all group cursor-pointer shadow-[0_0_15px_rgba(217,70,239,0.2)]"
        >
          <div className="w-8 h-8 rounded-xl bg-fuchsia-950/80 border border-fuchsia-500/50 flex items-center justify-center text-fuchsia-300 mb-2 group-hover:scale-105 transition-transform">
            <Star className="w-4 h-4 fill-fuchsia-400 text-fuchsia-400" />
          </div>
          <span className="font-extrabold text-white text-xs block">⭐ Individual Groups</span>
          <span className="text-[10px] text-fuchsia-200/80">Ebony, Chav, Desi & more (£10)</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic("light");
            onNavigate("wallet");
          }}
          className="p-3.5 rounded-2xl bg-[#0d0119] border border-pink-500/30 hover:border-pink-500/60 text-left transition-all group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center text-purple-400 mb-2 group-hover:scale-105 transition-transform">
            <Coins className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-white text-xs block">Wallet & Stripe</span>
          <span className="text-[10px] text-pink-300/70">Instant Top Up & History</span>
        </button>
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="p-3.5 rounded-2xl bg-[#070010]/80 border border-pink-950/80 flex items-center justify-between text-[11px] text-pink-300/70">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>Instant Private Telegram Links Delivered 24/7</span>
        </div>
        <span className="font-mono text-emerald-400 font-bold">100% Verified</span>
      </div>
    </div>
  );
};
