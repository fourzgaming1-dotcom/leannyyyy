import React from "react";
import { Crown, Diamond, Sparkles, Flame, Zap, Shield, Star, Gem, CheckCircle2 } from "lucide-react";

export interface GroupTheme {
  id: string;
  flag: string;
  countryName: string;
  badgeLabel: string;
  gradient: string;
  cardBg: string;
  borderColor: string;
  shadowColor: string;
  accentBadgeBg: string;
  accentTextColor: string;
  priceBg: string;
  buttonBg: string;
  icon: React.ReactNode;
  ambientLight: string;
  overlayPattern: React.ReactNode;
  category: "bundle" | "uk" | "international" | "highroller";
  perks: string[];
}

export function getGroupTheme(groupId: string): GroupTheme {
  switch (groupId) {
    case "all-groups":
      return {
        id: "all-groups",
        flag: "👑",
        countryName: "VIP Master Pass",
        badgeLabel: "ALL INCLUSIVE · BEST VALUE",
        gradient: "from-[#2f1b01] via-[#472d02] to-[#1a0e00]",
        cardBg: "bg-gradient-to-r from-[#2c1a02] via-[#3d2403] to-[#1f1201]",
        borderColor: "border-yellow-400",
        shadowColor: "shadow-[0_0_40px_rgba(250,204,21,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black font-black",
        accentTextColor: "text-yellow-300",
        priceBg: "bg-yellow-950/90 border border-yellow-400/60 text-yellow-300",
        buttonBg: "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black shadow-[0_0_25px_rgba(250,204,21,0.5)]",
        icon: <Crown className="w-5 h-5 text-yellow-300" />,
        ambientLight: "bg-yellow-400/20",
        category: "bundle",
        perks: ["All 9 Exclusive Communities", "Lifetime Instant Access", "Save £45 vs Individual"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-yellow-400/25 blur-3xl" />
            <div className="absolute top-2 right-4 text-yellow-300/20 transform rotate-12">
              <Crown className="w-28 h-28 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(#eab308_1.2px,transparent_1.2px)] [background-size:16px_16px] opacity-25" />
          </div>
        ),
      };

    case "baller-bundle":
      return {
        id: "baller-bundle",
        flag: "💎",
        countryName: "High Roller Tier",
        badgeLabel: "HIGH ROLLER BUNDLE",
        gradient: "from-[#022b1f] via-[#053d2c] to-[#011a12]",
        cardBg: "bg-gradient-to-r from-[#03291d] via-[#053b2a] to-[#021c13]",
        borderColor: "border-emerald-400",
        shadowColor: "shadow-[0_0_35px_rgba(16,185,129,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-emerald-400 to-teal-400 text-black font-black",
        accentTextColor: "text-emerald-300",
        priceBg: "bg-emerald-950/90 border border-emerald-400/60 text-emerald-300",
        buttonBg: "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 hover:to-teal-300 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)]",
        icon: <Diamond className="w-5 h-5 text-emerald-300" />,
        ambientLight: "bg-emerald-400/20",
        category: "bundle",
        perks: ["Full Baller Tier Package", "High Roller Perks", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-30 overflow-hidden">
            <div className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-emerald-500/25 blur-3xl" />
            <div className="absolute top-2 right-4 text-emerald-300/20">
              <Diamond className="w-24 h-24 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(16,185,129,0.12)_50%,transparent_75%)] [background-size:24px_24px]" />
          </div>
        ),
      };

    case "irish":
      return {
        id: "irish",
        flag: "🇮🇪",
        countryName: "Ireland",
        badgeLabel: "🇮🇪 IRISH VIP EXCLUSIVE",
        gradient: "from-[#02381a] via-[#054d24] to-[#012410]",
        cardBg: "bg-gradient-to-r from-[#023318] via-[#044520] to-[#012210]",
        borderColor: "border-emerald-400",
        shadowColor: "shadow-[0_0_35px_rgba(16,185,129,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white font-black",
        accentTextColor: "text-emerald-300",
        priceBg: "bg-emerald-950/90 border border-emerald-400/60 text-emerald-300",
        buttonBg: "bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 hover:from-emerald-400 hover:to-green-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.5)]",
        icon: <span className="text-xl">🇮🇪</span>,
        ambientLight: "bg-emerald-400/25",
        category: "uk",
        perks: ["Exclusive Irish Community", "Daily Irish Content & Updates", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/25 rounded-full blur-3xl" />
            <div className="absolute top-3 right-4 text-emerald-400/20 text-6xl font-black select-none">
              ☘️
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1.3px,transparent_1.3px)] [background-size:16px_16px] opacity-30" />
          </div>
        ),
      };

    case "desi":
      return {
        id: "desi",
        flag: "🇮🇳",
        countryName: "India / Desi",
        badgeLabel: "🇮🇳 INDIAN VIP EXCLUSIVE",
        gradient: "from-[#3d1802] via-[#592303] to-[#240c00]",
        cardBg: "bg-gradient-to-r from-[#381602] via-[#4d1f04] to-[#210b00]",
        borderColor: "border-amber-400",
        shadowColor: "shadow-[0_0_35px_rgba(245,158,11,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-amber-500 via-orange-500 to-emerald-600 text-white font-black",
        accentTextColor: "text-amber-300",
        priceBg: "bg-amber-950/90 border border-amber-400/60 text-amber-300",
        buttonBg: "bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.5)]",
        icon: <span className="text-xl">🇮🇳</span>,
        ambientLight: "bg-amber-400/25",
        category: "international",
        perks: ["Indian & Desi VIP Network", "Exclusive Regional Content", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-44 h-44 bg-amber-500/25 rounded-full blur-3xl" />
            <div className="absolute top-2 right-4 text-amber-400/20">
              <Flame className="w-24 h-24 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(#f59e0b_1.3px,transparent_1.3px)] [background-size:16px_16px] opacity-30" />
          </div>
        ),
      };

    case "british":
      return {
        id: "british",
        flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
        countryName: "England & UK",
        badgeLabel: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 ENGLISH VIP EXCLUSIVE",
        gradient: "from-[#082257] via-[#0d3482] to-[#041233]",
        cardBg: "bg-gradient-to-r from-[#071f4f] via-[#0c2e73] to-[#03102b]",
        borderColor: "border-blue-400",
        shadowColor: "shadow-[0_0_35px_rgba(59,130,246,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 text-white font-black",
        accentTextColor: "text-blue-300",
        priceBg: "bg-blue-950/90 border border-blue-400/60 text-blue-300",
        buttonBg: "bg-gradient-to-r from-blue-600 via-indigo-600 to-rose-600 hover:from-blue-500 hover:to-rose-500 text-white shadow-[0_0_25px_rgba(59,130,246,0.5)]",
        icon: <span className="text-xl">🏴󠁧󠁢󠁥󠁮󠁧󠁿</span>,
        ambientLight: "bg-blue-400/25",
        category: "uk",
        perks: ["English & UK Exclusive Community", "Verified British Members", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/25 rounded-full blur-3xl" />
            <div className="absolute top-2 right-4 text-blue-400/20">
              <Shield className="w-24 h-24 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#3b82f612_25%,transparent_25%,transparent_50%,#3b82f612_50%,#3b82f612_75%,transparent_75%)] bg-[size:20px_20px]" />
          </div>
        ),
      };

    case "scottish":
      return {
        id: "scottish",
        flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
        countryName: "Scotland",
        badgeLabel: "🏴󠁧󠁢󠁳󠁣󠁴󠁿 SCOTTISH VIP EXCLUSIVE",
        gradient: "from-[#052d54] via-[#094178] to-[#02182e]",
        cardBg: "bg-gradient-to-r from-[#04284a] via-[#083b6e] to-[#021526]",
        borderColor: "border-sky-400",
        shadowColor: "shadow-[0_0_35px_rgba(56,189,248,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-500 text-black font-black",
        accentTextColor: "text-sky-300",
        priceBg: "bg-sky-950/90 border border-sky-400/60 text-sky-300",
        buttonBg: "bg-gradient-to-r from-sky-400 via-blue-500 to-cyan-500 hover:from-sky-300 hover:to-blue-400 text-black shadow-[0_0_25px_rgba(56,189,248,0.5)]",
        icon: <span className="text-xl">🏴󠁧󠁢󠁳󠁣󠁴󠁿</span>,
        ambientLight: "bg-sky-400/25",
        category: "uk",
        perks: ["Scottish Exclusive Community", "Highland & City Networks", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute -top-8 -right-8 w-44 h-44 bg-sky-500/25 rounded-full blur-3xl" />
            <div className="absolute top-2 right-4 text-sky-400/20">
              <Star className="w-24 h-24 stroke-[1]" />
            </div>
            {/* St Andrew's Saltire diagonals */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_45%,rgba(56,189,248,0.12)_45%,rgba(56,189,248,0.12)_55%,transparent_55%),linear-gradient(-45deg,transparent_45%,rgba(56,189,248,0.12)_45%,rgba(56,189,248,0.12)_55%,transparent_55%)] bg-[size:40px_40px]" />
          </div>
        ),
      };

    case "ebony":
      return {
        id: "ebony",
        flag: "👑",
        countryName: "Ebony VIP",
        badgeLabel: "👑 EBONY VIP EXCLUSIVE",
        gradient: "from-[#3d0326] via-[#590538] to-[#210114]",
        cardBg: "bg-gradient-to-r from-[#380222] via-[#4d0430] to-[#1e0112]",
        borderColor: "border-pink-400",
        shadowColor: "shadow-[0_0_35px_rgba(236,72,153,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 text-white font-black",
        accentTextColor: "text-pink-300",
        priceBg: "bg-pink-950/90 border border-pink-400/60 text-pink-300",
        buttonBg: "bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:to-rose-400 text-white shadow-[0_0_25px_rgba(236,72,153,0.5)]",
        icon: <Sparkles className="w-5 h-5 text-pink-300" />,
        ambientLight: "bg-pink-400/25",
        category: "international",
        perks: ["Top Rated Ebony Community", "Private VIP Content Hub", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-pink-500/25 rounded-full blur-3xl" />
            <div className="absolute -top-3 -right-3 text-pink-400/20">
              <Sparkles className="w-28 h-28 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(#ec4899_1.3px,transparent_1.3px)] [background-size:15px_15px] opacity-30" />
          </div>
        ),
      };

    case "chav":
      return {
        id: "chav",
        flag: "⚡",
        countryName: "Chav VIP",
        badgeLabel: "⚡ CHAV VIP EXCLUSIVE",
        gradient: "from-[#052b42] via-[#084266] to-[#021826]",
        cardBg: "bg-gradient-to-r from-[#04263b] via-[#073957] to-[#021521]",
        borderColor: "border-cyan-400",
        shadowColor: "shadow-[0_0_35px_rgba(6,182,212,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 text-black font-black",
        accentTextColor: "text-cyan-300",
        priceBg: "bg-cyan-950/90 border border-cyan-400/60 text-cyan-300",
        buttonBg: "bg-gradient-to-r from-cyan-400 via-teal-400 to-blue-500 hover:from-cyan-300 hover:to-teal-300 text-black shadow-[0_0_25px_rgba(6,182,212,0.5)]",
        icon: <Zap className="w-5 h-5 text-cyan-300" />,
        ambientLight: "bg-cyan-400/25",
        category: "uk",
        perks: ["Urban Streetwear Culture", "Underground VIP Community", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute -top-6 -right-6 w-44 h-44 bg-cyan-500/25 rounded-full blur-3xl" />
            <div className="absolute top-3 right-3 text-cyan-400/20">
              <Zap className="w-24 h-24 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d415_1px,transparent_1px),linear-gradient(to_bottom,#06b6d415_1px,transparent_1px)] bg-[size:18px_18px]" />
          </div>
        ),
      };

    case "baller-group":
    default:
      return {
        id: "baller-group",
        flag: "💎",
        countryName: "Baller Group",
        badgeLabel: "💎 BALLER VIP EXCLUSIVE",
        gradient: "from-[#033618] via-[#054a22] to-[#011c0c]",
        cardBg: "bg-gradient-to-r from-[#032f15] via-[#043f1d] to-[#01170a]",
        borderColor: "border-lime-400",
        shadowColor: "shadow-[0_0_35px_rgba(132,204,22,0.35)]",
        accentBadgeBg: "bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-500 text-black font-black",
        accentTextColor: "text-lime-300",
        priceBg: "bg-lime-950/90 border border-lime-400/60 text-lime-300",
        buttonBg: "bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-500 hover:from-lime-300 hover:to-emerald-300 text-black shadow-[0_0_25px_rgba(132,204,22,0.5)]",
        icon: <Gem className="w-5 h-5 text-lime-300" />,
        ambientLight: "bg-lime-400/25",
        category: "highroller",
        perks: ["High Roller Community", "VIP Baller Circle", "Instant Telegram Access"],
        overlayPattern: (
          <div className="absolute inset-0 pointer-events-none opacity-35 overflow-hidden">
            <div className="absolute -bottom-8 -right-8 w-44 h-44 bg-lime-500/25 rounded-full blur-3xl" />
            <div className="absolute top-2 right-2 text-lime-400/20">
              <Gem className="w-24 h-24 stroke-[1]" />
            </div>
            <div className="absolute inset-0 bg-[linear-gradient(45deg,#84cc1612_25%,transparent_25%,transparent_50%,#84cc1612_50%,#84cc1612_75%,transparent_75%)] bg-[size:18px_18px]" />
          </div>
        ),
      };
  }
}
