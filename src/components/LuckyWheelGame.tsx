import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Trophy,
  RotateCcw,
  Zap,
  Gift,
  CheckCircle2,
  ExternalLink,
  Copy,
  Coins,
  Crown,
  CreditCard,
  Ticket,
  Flame,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import { UserWallet, WheelSectorItem } from "../types";

interface LuckyWheelGameProps {
  telegramId: number;
  wallet: UserWallet | null;
  onRewardWon: (amount: number, message: string, newWallet?: UserWallet) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  onNavigateToGroups: () => void;
  onOpenDeposit?: (amount?: number) => void;
  onRefreshWallet?: () => void;
  onSwitchToRoulette?: () => void;
}

// 25 PRIZES ON THE WHEEL (Exact match to specification)
export const WHEEL_SECTORS: WheelSectorItem[] = [
  { id: "premium_group", label: "Premium Group", shortLabel: "PREMIUM", sub: "GROUP", type: "group", groupId: "baller-group", groupName: "Premium Baller Group", color: "#8b5cf6", weight: 3 },
  { id: "baller_bundle", label: "Baller Bundle", shortLabel: "BALLER", sub: "BUNDLE", type: "group", groupId: "baller-bundle", groupName: "Baller Bundle VIP", color: "#10b981", weight: 2 },
  { id: "ebony_group", label: "Ebony Group", shortLabel: "EBONY", sub: "GROUP", type: "group", groupId: "ebony", groupName: "Ebony VIP", color: "#ec4899", weight: 3 },
  { id: "asian_group", label: "Asian Group", shortLabel: "ASIAN", sub: "GROUP", type: "group", groupId: "asian", groupName: "Asian VIP", color: "#f59e0b", weight: 3 },
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

export const LuckyWheelGame: React.FC<LuckyWheelGameProps> = ({
  telegramId,
  wallet,
  onRewardWon,
  triggerHaptic,
  onNavigateToGroups,
  onOpenDeposit,
  onRefreshWallet,
  onSwitchToRoulette,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [totalXp, setTotalXp] = useState(0);
  const [unlockedVouchers, setUnlockedVouchers] = useState<string[]>([]);
  const [wonPrize, setWonPrize] = useState<{
    prize: WheelSectorItem;
    message: string;
    creditWon?: number;
    inviteLink?: string;
    groupName?: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [activePrizeTab, setActivePrizeTab] = useState<"all" | "groups" | "cash" | "perks">("all");
  const audioContextRef = useRef<AudioContext | null>(null);

  const balance = wallet ? wallet.balance : 0;
  const canAffordSpin = balance >= 1.0;

  // Sound synthesis
  const playTickSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(650, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Audio might not be allowed before user interaction
    }
  };

  const playFanfare = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const time = ctx.currentTime + idx * 0.12;
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.16, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.4);
      });
    } catch {}
  };

  // Load game status on mount
  useEffect(() => {
    api.getGameStatus(telegramId)
      .then((data) => {
        setTotalWon(data.totalWon ?? 0);
        setTotalXp(data.totalXp ?? 0);
        setUnlockedVouchers(data.vouchers ?? []);
      })
      .catch((err) => console.warn("Could not fetch game status:", err));
  }, [telegramId]);

  const handleSpin = async () => {
    if (isSpinning) return;

    if (!canAffordSpin) {
      triggerHaptic("warning");
      if (onOpenDeposit) {
        onOpenDeposit(1.0);
      }
      return;
    }

    setIsSpinning(true);
    setWonPrize(null);
    triggerHaptic("heavy");

    try {
      // Execute spin on server (costs £1.00 directly from wallet balance)
      const res = await api.spinWheel(telegramId);
      const chosenIndex = res.prizeIndex;
      const prize = res.prize;

      // Calculate exact rotation landing angle
      // 25 sectors: each is 14.4 deg.
      // Sector i center is at angle (chosenIndex + 0.5) * 14.4
      // Pointer is at TOP: 270 degrees
      const sliceAngle = 360 / WHEEL_SECTORS.length;
      const sectorCenter = (chosenIndex + 0.5) * sliceAngle;
      const targetAngle = 270 - sectorCenter;
      const normalizedTarget = ((targetAngle % 360) + 360) % 360;
      const currentMod = ((rotation % 360) + 360) % 360;
      const delta = ((normalizedTarget - currentMod + 360) % 360);

      // 8 full spins for excitement
      const newRotation = rotation + 360 * 8 + delta;
      setRotation(newRotation);

      // Play rapid ticking sounds that decelerate
      let tickCount = 0;
      const tickInterval = setInterval(() => {
        playTickSound();
        triggerHaptic("light");
        tickCount++;
        if (tickCount > 28) {
          clearInterval(tickInterval);
        }
      }, 140);

      // Wait for spin animation (4.5s)
      setTimeout(() => {
        clearInterval(tickInterval);
        setIsSpinning(false);
        setTotalWon(res.totalWon);
        setTotalXp(res.totalXp);

        if (res.wallet && onRewardWon) {
          onRewardWon(res.creditWon || 0, res.rewardMessage, res.wallet);
        }
        if (onRefreshWallet) {
          onRefreshWallet();
        }

        // Check if won something major
        if (prize.type === "credit" && (prize.amount || 0) >= 1) {
          playFanfare();
          triggerHaptic("success");
        } else if (prize.type === "group") {
          playFanfare();
          triggerHaptic("success");
        } else {
          triggerHaptic("medium");
        }

        setWonPrize({
          prize,
          message: res.rewardMessage,
          creditWon: res.creditWon,
          inviteLink: res.inviteLink,
          groupName: res.groupName,
        });
      }, 4500);
    } catch (err: any) {
      setIsSpinning(false);
      triggerHaptic("error");
      console.error("Spin error:", err);
      if (err.message?.includes("Insufficient") && onOpenDeposit) {
        onOpenDeposit(1.0);
      }
    }
  };

  const handleResetSpins = async () => {
    setIsResetting(true);
    try {
      await api.resetGameSpins(telegramId);
      setWonPrize(null);
      triggerHaptic("light");
    } finally {
      setIsResetting(false);
    }
  };

  const handleAddTestFunds = async () => {
    try {
      const res = await api.addTestCredit(telegramId);
      if (onRefreshWallet) onRefreshWallet();
      triggerHaptic("success");
      setWonPrize({
        prize: {
          id: "test_credit",
          label: "£5.00 Test Funds",
          shortLabel: "£5.00",
          sub: "ADDED",
          type: "credit",
          amount: 5,
          color: "#10b981",
          weight: 0,
        },
        message: "£5.00 test credit added! You now have 5 more spins.",
      });
    } catch (err) {
      console.error("Failed adding test credit:", err);
    }
  };

  const handleCopyInviteLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    triggerHaptic("light");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Group prizes by category for prize browser
  const groupsList = WHEEL_SECTORS.filter((s) => s.type === "group");
  const cashList = WHEEL_SECTORS.filter((s) => s.type === "credit");
  const perksList = WHEEL_SECTORS.filter((s) => s.type !== "group" && s.type !== "credit");

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Game Header Bar */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#24023b] via-[#120021] to-[#080010] border-2 border-yellow-400/60 shadow-[0_0_35px_rgba(250,204,21,0.25)] text-center">
        <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-400/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-yellow-950/80 border border-yellow-400/50 text-yellow-300 text-[10px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(250,204,21,0.4)]">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span>VIP Lucky Wheel · 25 Prizes · £1 Per Spin</span>
          </div>

          {onSwitchToRoulette && (
            <button
              onClick={() => {
                triggerHaptic("light");
                onSwitchToRoulette();
              }}
              className="px-2.5 py-1 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 hover:text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
            >
              <span>🔴⚫ Roulette (£1-£100)</span>
            </button>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white mt-1.5 tracking-tight">
          Spin For <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-pink-400 bg-clip-text text-transparent">VIP Passes & £100 Cash</span>
        </h2>
        <p className="text-xs text-pink-200/80 mt-1 max-w-xs mx-auto">
          Every spin gives you a chance to unlock Ebony, Chav, Baller, or win up to £100 instant wallet credits!
        </p>

        {/* Live Wallet & Status Row */}
        <div className="mt-3 flex items-center justify-center gap-2.5 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-black/70 border border-pink-500/40 flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] text-pink-300/80">Wallet:</span>
            <span className="text-xs font-mono font-black text-white">
              £{balance.toFixed(2)}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/70 border border-yellow-500/40 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-[11px] text-yellow-300/80">Cost:</span>
            <span className="text-xs font-mono font-black text-yellow-300">
              £1.00 / spin
            </span>
          </div>
        </div>
      </div>

      {/* The Wheel Canvas */}
      <div className="relative flex flex-col items-center justify-center py-2">
        {/* Top Pointer Indicator */}
        <div className="absolute top-0 z-30 flex flex-col items-center pointer-events-none">
          <div
            className="w-7 h-7 bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-500 shadow-[0_0_20px_rgba(250,204,21,1)] transform rotate-180 drop-shadow-lg"
            style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
          />
          <div className="w-3 h-3 rounded-full bg-yellow-200 shadow-[0_0_10px_#fde047] -mt-1" />
        </div>

        {/* Outer Glow Halo Ring */}
        <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full p-2.5 bg-gradient-to-tr from-pink-600 via-yellow-400 to-purple-600 shadow-[0_0_60px_rgba(250,204,21,0.35)]">
          {/* Wheel Disc */}
          <div
            className="w-full h-full rounded-full relative overflow-hidden transition-transform shadow-inner bg-[#0b0014]"
            style={{
              transform: `rotate(${rotation}deg)`,
              transitionDuration: isSpinning ? "4.5s" : "0s",
              transitionTimingFunction: "cubic-bezier(0.12, 0.94, 0.18, 1)",
            }}
          >
            {/* SVG Wheel Sectors */}
            <svg viewBox="0 0 100 100" className="w-full h-full transform">
              {WHEEL_SECTORS.map((sector, index) => {
                const angle = 360 / WHEEL_SECTORS.length;
                const startAngle = index * angle;
                const endAngle = startAngle + angle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                return (
                  <path
                    key={sector.id + index}
                    d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                    fill={sector.color}
                    stroke="#0b0014"
                    strokeWidth="0.5"
                  />
                );
              })}
            </svg>

            {/* Radial Sector Labels */}
            {WHEEL_SECTORS.map((sector, index) => {
              const sliceAngle = 360 / WHEEL_SECTORS.length;
              const midAngle = index * sliceAngle + sliceAngle / 2;
              return (
                <div
                  key={`label-${index}`}
                  className="absolute inset-0 flex items-start justify-center pt-2 pointer-events-none"
                  style={{
                    transform: `rotate(${midAngle + 90}deg)`,
                    transformOrigin: "50% 50%",
                  }}
                >
                  <div className="text-center transform rotate-90 origin-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                    <span className="text-[7.5px] sm:text-[8.5px] font-black text-white block uppercase tracking-tighter whitespace-nowrap">
                      {sector.shortLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Central Hub Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className={`absolute inset-0 m-auto w-20 h-20 sm:w-22 sm:h-22 rounded-full bg-gradient-to-br from-[#2a043d] via-[#150024] to-[#25013f] border-2 ${
              canAffordSpin ? "border-yellow-400 hover:border-yellow-300" : "border-pink-500/50"
            } text-white font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.7)] cursor-pointer hover:scale-105 active:scale-95 transition-all z-20 disabled:opacity-60`}
          >
            <Sparkles className="w-4 h-4 text-yellow-400 mb-0.5" />
            <span className="text-[11px] font-black text-yellow-300">
              {isSpinning ? "ROLLING" : "SPIN £1"}
            </span>
            <span className="text-[8px] text-pink-300/80 font-bold">
              {isSpinning ? "..." : "£1.00"}
            </span>
          </button>
        </div>
      </div>

      {/* Won Prize Celebration Modal */}
      {wonPrize && (
        <div className="p-4 rounded-3xl bg-[#0e011d] border-2 border-yellow-400/80 shadow-[0_0_40px_rgba(250,204,21,0.4)] text-center space-y-3 animate-in zoom-in-95">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-yellow-950/80 border border-yellow-400/60 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]">
            <Gift className="w-6 h-6 animate-bounce" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 px-2.5 py-0.5 rounded-full bg-yellow-950 border border-yellow-400/40">
              {wonPrize.prize.type === "group" ? "👑 VIP GROUP UNLOCKED" : "🎉 PRIZE WON"}
            </span>
            <h3 className="text-xl font-black text-white mt-1">
              {wonPrize.prize.label}
            </h3>
            <p className="text-xs text-pink-200/90 mt-0.5">{wonPrize.message}</p>
          </div>

          {/* Group Invite Link Box if a Group was won */}
          {wonPrize.inviteLink && (
            <div className="p-3.5 rounded-2xl bg-black/90 border border-emerald-500/50 text-left space-y-2">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 block tracking-wider">
                Your Private Telegram Invite Link:
              </span>
              <p className="text-xs font-mono text-emerald-200 break-all select-all">
                {wonPrize.inviteLink}
              </p>

              <div className="flex gap-2 pt-1">
                <a
                  href={wonPrize.inviteLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Join on Telegram</span>
                </a>

                <button
                  onClick={() => handleCopyInviteLink(wonPrize.inviteLink!)}
                  className="py-2 px-3 rounded-xl bg-black border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  {copiedLink ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-1 flex gap-2">
            {canAffordSpin ? (
              <button
                onClick={handleSpin}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black text-xs shadow-[0_0_20px_rgba(250,204,21,0.5)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Spin Again (£1.00)</span>
              </button>
            ) : (
              <button
                onClick={() => onOpenDeposit && onOpenDeposit(1.0)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white font-black text-xs shadow-[0_0_20px_rgba(236,72,153,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Top Up £1 to Spin</span>
              </button>
            )}

            <button
              onClick={() => setWonPrize(null)}
              className="py-2.5 px-4 rounded-xl bg-pink-950/60 hover:bg-pink-900/60 text-pink-300 font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Spin Action Bar */}
      <div className="space-y-2 text-center">
        {canAffordSpin ? (
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-pink-500 hover:from-yellow-300 hover:to-pink-400 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(250,204,21,0.5)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>
              {isSpinning ? "Spinning VIP Wheel..." : "SPIN WHEEL FOR £1.00"}
            </span>
          </button>
        ) : (
          <button
            onClick={() => onOpenDeposit && onOpenDeposit(1.0)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(236,72,153,0.45)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>TOP UP £1.00 TO SPIN (Balance: £{balance.toFixed(2)})</span>
          </button>
        )}
      </div>

      {/* Complete 25 Prizes Showcase Grid */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              All 25 Wheel Prizes
            </h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-[10px]">
            <button
              onClick={() => setActivePrizeTab("all")}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activePrizeTab === "all" ? "bg-yellow-400 text-black font-black" : "text-pink-300/70 hover:text-white"
              }`}
            >
              All (25)
            </button>
            <button
              onClick={() => setActivePrizeTab("groups")}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activePrizeTab === "groups" ? "bg-purple-600 text-white font-black" : "text-pink-300/70 hover:text-white"
              }`}
            >
              VIP Groups (9)
            </button>
            <button
              onClick={() => setActivePrizeTab("cash")}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activePrizeTab === "cash" ? "bg-emerald-600 text-white font-black" : "text-pink-300/70 hover:text-white"
              }`}
            >
              Cash (6)
            </button>
            <button
              onClick={() => setActivePrizeTab("perks")}
              className={`px-2 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                activePrizeTab === "perks" ? "bg-pink-600 text-white font-black" : "text-pink-300/70 hover:text-white"
              }`}
            >
              Perks (10)
            </button>
          </div>
        </div>

        {/* Prize Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-56 overflow-y-auto p-1 rounded-2xl bg-black/50 border border-pink-950/70">
          {(activePrizeTab === "all"
            ? WHEEL_SECTORS
            : activePrizeTab === "groups"
            ? groupsList
            : activePrizeTab === "cash"
            ? cashList
            : perksList
          ).map((sector, idx) => (
            <div
              key={sector.id + idx}
              className="p-2 rounded-xl border border-white/10 bg-[#0e001a] flex items-center justify-between gap-1 text-[11px]"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: sector.color }}
                />
                <span className="font-bold text-white truncate text-[10px]">
                  {sector.label}
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold text-yellow-400 flex-shrink-0">
                {sector.sub}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rules Notice */}
      <div className="p-3.5 rounded-2xl bg-[#080012]/90 border border-pink-950/80 text-[11px] text-pink-300/70 space-y-1.5">
        <span className="font-bold text-pink-200 block uppercase tracking-wider text-[10px]">
          How The £1 VIP Lucky Wheel Works:
        </span>
        <ul className="space-y-1 list-disc list-inside text-[10.5px] leading-relaxed">
          <li>Each spin costs <strong className="text-white">£1.00</strong> from your live spendable wallet balance.</li>
          <li>Landing on <strong className="text-yellow-300">All Groups, Ebony, Chav, Baller</strong> instantly unlocks the community and delivers your invite link.</li>
          <li>Landing on <strong className="text-emerald-400">£100, £20, £2, £1.50, 10p, 5p, 1p</strong> immediately credits real GBP to your wallet!</li>
        </ul>
      </div>
    </div>
  );
};
