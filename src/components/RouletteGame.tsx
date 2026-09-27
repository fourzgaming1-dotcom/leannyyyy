import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Coins,
  RotateCcw,
  Volume2,
  VolumeX,
  CreditCard,
  Trophy,
  History,
  Info,
  CheckCircle2,
  Crown,
  Flame,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import { UserWallet, RouletteBet, RouletteHistoryItem, RouletteSpinResponse } from "../types";

interface RouletteGameProps {
  telegramId: number;
  wallet: UserWallet | null;
  onRewardWon: (amount: number, message: string, newWallet?: UserWallet) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  onOpenDeposit?: (amount?: number) => void;
  onRefreshWallet?: () => void;
  onSwitchToWheel?: () => void;
}

// European Roulette Wheel Numbers Order (37 pockets: 0 to 36)
const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26,
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

function getNumberColor(num: number): "red" | "black" | "green" {
  if (num === 0) return "green";
  return RED_NUMBERS.has(num) ? "red" : "black";
}

// Chip Denominations: £1, £2, £5, £10, £25, £50, £100
const CHIP_VALUES = [
  { value: 1, label: "£1", color: "from-blue-600 to-indigo-800", ring: "border-blue-400" },
  { value: 2, label: "£2", color: "from-emerald-600 to-teal-800", ring: "border-emerald-400" },
  { value: 5, label: "£5", color: "from-red-600 to-rose-800", ring: "border-red-400" },
  { value: 10, label: "£10", color: "from-purple-600 to-violet-900", ring: "border-purple-400" },
  { value: 25, label: "£25", color: "from-amber-600 to-yellow-700", ring: "border-amber-400" },
  { value: 50, label: "£50", color: "from-pink-600 to-fuchsia-900", ring: "border-pink-400" },
  { value: 100, label: "£100", color: "from-yellow-400 via-amber-300 to-yellow-600 text-black", ring: "border-yellow-200" },
];

export const RouletteGame: React.FC<RouletteGameProps> = ({
  telegramId,
  wallet,
  onRewardWon,
  triggerHaptic,
  onOpenDeposit,
  onRefreshWallet,
  onSwitchToWheel,
}) => {
  const [selectedChip, setSelectedChip] = useState<number>(1);
  const [bets, setBets] = useState<RouletteBet[]>([]);
  const [lastBets, setLastBets] = useState<RouletteBet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [history, setHistory] = useState<RouletteHistoryItem[]>([]);
  const [spinResult, setSpinResult] = useState<RouletteSpinResponse | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const balance = wallet ? wallet.balance : 0;
  const totalBet = bets.reduce((acc, b) => acc + b.amount, 0);

  // Sound generator
  const playSound = (type: "chip" | "ball" | "win" | "click") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;

      if (type === "chip") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else if (type === "win") {
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = ctx.currentTime + idx * 0.1;
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t);
          osc.stop(t + 0.35);
        });
      }
    } catch {}
  };

  // Load history on mount
  useEffect(() => {
    api.getRouletteHistory()
      .then((res) => {
        if (res.history) setHistory(res.history);
      })
      .catch((err) => console.warn("Could not fetch roulette history:", err));
  }, []);

  // Place a bet on a target
  const handlePlaceBet = (type: RouletteBet["type"], number?: number) => {
    if (isSpinning) return;

    // Check if adding this chip exceeds £100 max bet
    if (totalBet + selectedChip > 100) {
      triggerHaptic("warning");
      return;
    }

    // Check if adding this chip exceeds wallet balance
    if (totalBet + selectedChip > balance) {
      triggerHaptic("warning");
      if (onOpenDeposit) onOpenDeposit(selectedChip);
      return;
    }

    playSound("chip");
    triggerHaptic("light");

    setBets((prev) => {
      const idx = prev.findIndex((b) => b.type === type && b.number === number);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = {
          ...updated[idx],
          amount: Math.round((updated[idx].amount + selectedChip) * 100) / 100,
        };
        return updated;
      } else {
        return [...prev, { type, number, amount: selectedChip }];
      }
    });
  };

  // Clear all bets
  const handleClearBets = () => {
    if (isSpinning || bets.length === 0) return;
    triggerHaptic("light");
    setBets([]);
  };

  // Double all bets (capped at £100)
  const handleDoubleBets = () => {
    if (isSpinning || bets.length === 0) return;
    const doubledTotal = totalBet * 2;
    if (doubledTotal > 100 || doubledTotal > balance) {
      triggerHaptic("warning");
      return;
    }
    triggerHaptic("medium");
    setBets((prev) => prev.map((b) => ({ ...b, amount: b.amount * 2 })));
  };

  // Rebet previous spin
  const handleRebet = () => {
    if (isSpinning || lastBets.length === 0) return;
    const rebetTotal = lastBets.reduce((a, b) => a + b.amount, 0);
    if (rebetTotal > balance || rebetTotal > 100) {
      triggerHaptic("warning");
      return;
    }
    triggerHaptic("light");
    setBets(lastBets);
  };

  // Spin the roulette
  const handleSpin = async () => {
    if (isSpinning) return;

    if (totalBet < 1.0) {
      triggerHaptic("warning");
      return;
    }

    if (totalBet > balance) {
      triggerHaptic("warning");
      if (onOpenDeposit) onOpenDeposit(totalBet);
      return;
    }

    setIsSpinning(true);
    setSpinResult(null);
    setLastBets(bets);
    triggerHaptic("heavy");

    try {
      const res = await api.spinRoulette(telegramId, bets);

      // Find index of winning number in WHEEL_ORDER
      const winningIndex = WHEEL_ORDER.indexOf(res.winningNumber);
      const pocketAngle = 360 / WHEEL_ORDER.length; // ~9.73 deg

      // Wheel spins forward 5-6 full turns
      const nextWheelRot = wheelRotation + 360 * 6 + (winningIndex * pocketAngle);
      // Ball spins in opposite direction with rapid deceleration
      const nextBallRot = ballRotation - (360 * 9 + (winningIndex * pocketAngle));

      setWheelRotation(nextWheelRot);
      setBallRotation(nextBallRot);

      // Play roulette rolling sounds
      const ballRollInterval = setInterval(() => {
        playSound("chip");
        triggerHaptic("light");
      }, 160);

      setTimeout(() => {
        clearInterval(ballRollInterval);
        setIsSpinning(false);
        setSpinResult(res);
        setHistory(res.history);

        if (res.wallet && onRewardWon) {
          onRewardWon(
            res.totalPayout,
            res.isWin
              ? `🎉 ROULETTE WIN: Number ${res.winningNumber} (${res.winningColor.toUpperCase()})! Payout: +£${res.totalPayout.toFixed(2)}`
              : `Roulette Result: Number ${res.winningNumber} (${res.winningColor.toUpperCase()})`,
            res.wallet
          );
        }

        if (onRefreshWallet) onRefreshWallet();

        if (res.isWin) {
          playSound("win");
          triggerHaptic("success");
        } else {
          triggerHaptic("medium");
        }
      }, 4600);
    } catch (err: any) {
      setIsSpinning(false);
      triggerHaptic("error");
      console.error("Roulette spin failed:", err);
      if (err.message?.includes("Insufficient") && onOpenDeposit) {
        onOpenDeposit(totalBet);
      }
    }
  };

  // Helper to check bet on spot
  const getBetAmountOn = (type: RouletteBet["type"], number?: number) => {
    const found = bets.find((b) => b.type === type && b.number === number);
    return found ? found.amount : 0;
  };

  // Add £5 test funds
  const handleAddTestFunds = async () => {
    try {
      await api.addTestCredit(telegramId);
      if (onRefreshWallet) onRefreshWallet();
      triggerHaptic("success");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#1a052e] via-[#0d001a] to-[#05000c] border-2 border-amber-400/60 shadow-[0_0_35px_rgba(251,191,36,0.2)] text-center">
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-950/80 border border-amber-400/50 text-amber-300 text-[10px] font-black uppercase tracking-widest">
            <Crown className="w-3 h-3 text-amber-400" />
            <span>VIP European Roulette · £1 to £100 Bets</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onSwitchToWheel && (
              <button
                onClick={() => {
                  triggerHaptic("light");
                  onSwitchToWheel();
                }}
                className="px-2.5 py-1 rounded-xl bg-purple-950/80 border border-purple-400/40 text-purple-200 hover:text-white text-[10px] font-black flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-yellow-300" />
                <span>Wheel (£1)</span>
              </button>
            )}

            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-xl bg-black/60 border border-white/10 text-white/70 hover:text-white cursor-pointer"
              title="Toggle Sound"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
          VIP Roulette <span className="bg-gradient-to-r from-red-500 via-amber-300 to-yellow-400 bg-clip-text text-transparent">36x Payouts</span>
        </h2>
        <p className="text-xs text-amber-100/70 mt-0.5">
          Select chips from £1 up to £100. Bet on Red/Black, Evens/Odds, Dozens, or Straight-up numbers!
        </p>

        {/* Live Wallet & Current Bet Status */}
        <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-pink-500/40 flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-pink-400" />
            <span className="text-[11px] text-pink-300/80">Wallet:</span>
            <span className="text-xs font-mono font-black text-white">£{balance.toFixed(2)}</span>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-black/80 border border-amber-500/50 flex items-center gap-2">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-amber-300/80">Current Bet:</span>
            <span className="text-xs font-mono font-black text-amber-300">£{totalBet.toFixed(2)}</span>
            <span className="text-[10px] text-white/40">(Max £100)</span>
          </div>
        </div>

        {/* Recent History Ribbon */}
        {history.length > 0 && (
          <div className="mt-3 flex items-center justify-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[10px] font-bold text-white/50 flex items-center gap-1 uppercase tracking-wider mr-1">
              <History className="w-3 h-3 text-amber-400" />
              Recent:
            </span>
            {history.slice(0, 8).map((h, i) => (
              <span
                key={i}
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border ${
                  h.color === "green"
                    ? "bg-emerald-600 border-emerald-400 text-white"
                    : h.color === "red"
                    ? "bg-red-600 border-red-400 text-white"
                    : "bg-neutral-900 border-neutral-600 text-white"
                } shadow-sm`}
              >
                {h.number}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Animated Roulette Wheel Cylinder */}
      <div className="relative flex flex-col items-center justify-center py-2">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full p-3 bg-gradient-to-tr from-amber-600 via-yellow-700 to-amber-900 border-4 border-yellow-400/80 shadow-[0_0_50px_rgba(251,191,36,0.35)] flex items-center justify-center">
          {/* Wheel Disc */}
          <div
            className="w-full h-full rounded-full relative overflow-hidden transition-transform shadow-2xl bg-[#0d0017]"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transitionDuration: isSpinning ? "4.5s" : "0s",
              transitionTimingFunction: "cubic-bezier(0.1, 0.9, 0.2, 1)",
            }}
          >
            {/* SVG Pockets */}
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {WHEEL_ORDER.map((num, idx) => {
                const angle = 360 / WHEEL_ORDER.length;
                const startAngle = idx * angle;
                const endAngle = startAngle + angle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                const color = getNumberColor(num);
                const fillColor = color === "green" ? "#059669" : color === "red" ? "#dc2626" : "#171717";

                return (
                  <path
                    key={num}
                    d={`M50,50 L${x1},${y1} A50,50 0 0,1 ${x2},${y2} Z`}
                    fill={fillColor}
                    stroke="#d4af37"
                    strokeWidth="0.3"
                  />
                );
              })}
            </svg>

            {/* Pockets Numbers */}
            {WHEEL_ORDER.map((num, idx) => {
              const sliceAngle = 360 / WHEEL_ORDER.length;
              const midAngle = idx * sliceAngle + sliceAngle / 2;
              return (
                <div
                  key={`num-${num}`}
                  className="absolute inset-0 flex items-start justify-center pt-2 pointer-events-none"
                  style={{
                    transform: `rotate(${midAngle + 90}deg)`,
                    transformOrigin: "50% 50%",
                  }}
                >
                  <span className="text-[7.5px] font-black text-white transform rotate-90 origin-center drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                    {num}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Center Brass Hub */}
          <div className="absolute w-20 h-20 rounded-full bg-gradient-to-br from-amber-300 via-yellow-500 to-amber-700 border-2 border-yellow-200 shadow-inner flex flex-col items-center justify-center text-center z-10 pointer-events-none">
            <span className="text-[9px] font-black tracking-widest text-black/80 uppercase">VIP</span>
            <span className="text-[7.5px] font-bold text-black/70">ROULETTE</span>
          </div>

          {/* Pointer Marker at Top */}
          <div className="absolute -top-1 z-20 flex flex-col items-center pointer-events-none">
            <div
              className="w-5 h-5 bg-gradient-to-b from-yellow-200 to-amber-400 shadow-[0_0_15px_#fde047] transform rotate-180"
              style={{ clipPath: "polygon(50% 0%, 0% 100%, 100% 100%)" }}
            />
          </div>
        </div>
      </div>

      {/* Win Celebration Alert */}
      {spinResult && (
        <div
          className={`p-4 rounded-3xl border-2 text-center space-y-2 animate-in zoom-in-95 ${
            spinResult.isWin
              ? "bg-[#11240c] border-emerald-400/80 shadow-[0_0_35px_rgba(16,185,129,0.4)]"
              : "bg-[#1c0818] border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
          }`}
        >
          <div className="inline-flex items-center gap-2">
            <span
              className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-black border-2 ${
                spinResult.winningColor === "green"
                  ? "bg-emerald-600 border-emerald-300 text-white"
                  : spinResult.winningColor === "red"
                  ? "bg-red-600 border-red-300 text-white"
                  : "bg-black border-neutral-400 text-white"
              }`}
            >
              {spinResult.winningNumber}
            </span>
            <div className="text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/70 block">
                Pocket #{spinResult.winningNumber} ({spinResult.winningColor.toUpperCase()})
              </span>
              <h3 className="text-lg font-black text-white">
                {spinResult.isWin ? `YOU WON £${spinResult.totalPayout.toFixed(2)}!` : "No Win This Round"}
              </h3>
            </div>
          </div>

          {spinResult.isWin && (
            <p className="text-xs text-emerald-200 font-bold">
              +£{spinResult.totalPayout.toFixed(2)} credited straight to your live wallet balance! (Net Profit: +£{spinResult.netProfit.toFixed(2)})
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSpin}
              disabled={isSpinning || totalBet === 0 || totalBet > balance}
              className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-black font-black text-xs cursor-pointer shadow-md disabled:opacity-50"
            >
              Spin Again (£{totalBet.toFixed(2)})
            </button>
            <button
              onClick={() => setSpinResult(null)}
              className="py-2 px-3 rounded-xl bg-black/60 text-white/70 hover:text-white font-bold text-xs cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Chip Selector Bar (£1 to £100) */}
      <div className="p-3 rounded-2xl bg-[#0b0014] border border-amber-500/30 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-amber-300 font-extrabold flex items-center gap-1 uppercase tracking-wider">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            Select Chip Value:
          </span>
          <span className="text-white/60 font-mono text-[10px]">
            Active: <strong className="text-amber-300">£{selectedChip}</strong>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {CHIP_VALUES.map((chip) => {
            const isSelected = selectedChip === chip.value;
            return (
              <button
                key={chip.value}
                onClick={() => {
                  setSelectedChip(chip.value);
                  playSound("chip");
                  triggerHaptic("light");
                }}
                className={`h-11 sm:h-12 rounded-xl flex flex-col items-center justify-center font-black transition-all cursor-pointer bg-gradient-to-b ${
                  chip.color
                } border-2 ${
                  isSelected
                    ? "border-yellow-300 scale-105 shadow-[0_0_15px_rgba(253,224,71,0.6)]"
                    : "border-white/20 opacity-80 hover:opacity-100 hover:scale-100"
                }`}
              >
                <span className="text-[11px] sm:text-xs tracking-tight">{chip.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Betting Table Layout */}
      <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-[#08180c] to-[#040c06] border-2 border-emerald-600/60 shadow-[0_0_30px_rgba(5,150,105,0.2)] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-emerald-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            Roulette Betting Board
          </span>

          <div className="flex items-center gap-1.5 text-[10px]">
            {lastBets.length > 0 && bets.length === 0 && (
              <button
                onClick={handleRebet}
                className="px-2 py-1 rounded-lg bg-emerald-950 border border-emerald-500/50 text-emerald-300 font-bold hover:bg-emerald-900 cursor-pointer"
              >
                Rebet (£{lastBets.reduce((a, b) => a + b.amount, 0).toFixed(0)})
              </button>
            )}
            {bets.length > 0 && (
              <>
                <button
                  onClick={handleDoubleBets}
                  className="px-2 py-1 rounded-lg bg-amber-950 border border-amber-500/50 text-amber-300 font-bold hover:bg-amber-900 cursor-pointer"
                >
                  2x Bet
                </button>
                <button
                  onClick={handleClearBets}
                  className="px-2 py-1 rounded-lg bg-red-950 border border-red-500/50 text-red-300 font-bold hover:bg-red-900 cursor-pointer"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>

        {/* 0 Green Row */}
        <button
          onClick={() => handlePlaceBet("straight", 0)}
          className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-400 text-white font-black text-xs flex items-center justify-between px-3 cursor-pointer shadow-sm relative overflow-hidden"
        >
          <span>0 (GREEN · 36x PAYOUT)</span>
          {getBetAmountOn("straight", 0) > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-300 text-black text-[10px] font-black shadow">
              £{getBetAmountOn("straight", 0)}
            </span>
          )}
        </button>

        {/* 1-36 Numbers Grid (12 columns x 3 rows) */}
        <div className="grid grid-cols-12 gap-1">
          {Array.from({ length: 36 }, (_, i) => i + 1).map((num) => {
            const isRed = RED_NUMBERS.has(num);
            const betAmt = getBetAmountOn("straight", num);
            return (
              <button
                key={num}
                onClick={() => handlePlaceBet("straight", num)}
                className={`h-9 rounded-lg flex flex-col items-center justify-center font-black text-[11px] relative transition-transform active:scale-95 cursor-pointer border ${
                  isRed
                    ? "bg-red-600 hover:bg-red-500 border-red-400 text-white"
                    : "bg-neutral-900 hover:bg-neutral-800 border-neutral-700 text-white"
                }`}
              >
                <span>{num}</span>
                {betAmt > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 rounded-full bg-yellow-400 text-black text-[8px] font-extrabold shadow">
                    £{betAmt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Dozens (3x Payout) */}
        <div className="grid grid-cols-3 gap-1.5 pt-1">
          {[
            { id: "dozen1", label: "1st 12 (1-12)", pay: "3x" },
            { id: "dozen2", label: "2nd 12 (13-24)", pay: "3x" },
            { id: "dozen3", label: "3rd 12 (25-36)", pay: "3x" },
          ].map((d) => {
            const betAmt = getBetAmountOn(d.id as any);
            return (
              <button
                key={d.id}
                onClick={() => handlePlaceBet(d.id as any)}
                className="py-2 px-1 rounded-xl bg-black/70 hover:bg-black/90 border border-emerald-500/50 text-emerald-200 text-[10px] font-black flex flex-col items-center justify-center relative cursor-pointer"
              >
                <span>{d.label}</span>
                <span className="text-[8.5px] text-amber-300 font-bold">{d.pay} Payout</span>
                {betAmt > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-yellow-400 text-black text-[8px] font-black shadow">
                    £{betAmt}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Outside Bets (2x Payout): 1-18, EVEN, RED, BLACK, ODD, 19-36 */}
        <div className="grid grid-cols-6 gap-1 pt-0.5">
          {[
            { id: "low", label: "1-18", color: "bg-black/80 border-emerald-500/40 text-emerald-300" },
            { id: "even", label: "EVEN", color: "bg-black/80 border-emerald-500/40 text-emerald-300" },
            { id: "red", label: "RED", color: "bg-red-600 border-red-400 text-white font-black" },
            { id: "black", label: "BLACK", color: "bg-neutral-900 border-neutral-600 text-white font-black" },
            { id: "odd", label: "ODD", color: "bg-black/80 border-emerald-500/40 text-emerald-300" },
            { id: "high", label: "19-36", color: "bg-black/80 border-emerald-500/40 text-emerald-300" },
          ].map((item) => {
            const betAmt = getBetAmountOn(item.id as any);
            return (
              <button
                key={item.id}
                onClick={() => handlePlaceBet(item.id as any)}
                className={`py-2 rounded-xl border text-[10px] font-black flex flex-col items-center justify-center relative cursor-pointer transition-transform active:scale-95 ${item.color}`}
              >
                <span>{item.label}</span>
                <span className="text-[8px] opacity-80">2x</span>
                {betAmt > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-yellow-300 text-black text-[8px] font-black shadow">
                    £{betAmt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Spin Action Bar */}
      <div className="space-y-2 text-center">
        {totalBet === 0 ? (
          <div className="py-3 px-4 rounded-2xl bg-black/60 border border-white/10 text-white/60 text-xs font-bold flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-amber-400" />
            <span>Place bets on the board above (Min £1.00 · Max £100.00)</span>
          </div>
        ) : totalBet > balance ? (
          <button
            onClick={() => onOpenDeposit && onOpenDeposit(totalBet)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(236,72,153,0.45)] cursor-pointer flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            <span>TOP UP £{(totalBet - balance).toFixed(2)} TO SPIN ROULETTE</span>
          </button>
        ) : (
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-red-500 hover:from-yellow-300 hover:to-red-400 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(251,191,36,0.5)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-black" />
            <span>
              {isSpinning
                ? "Roulette Wheel Spinning..."
                : `SPIN ROULETTE (WAGER £${totalBet.toFixed(2)})`}
            </span>
          </button>
        )}
      </div>

      {/* Rules Notice */}
      <div className="p-3.5 rounded-2xl bg-[#080012]/90 border border-amber-950/80 text-[11px] text-amber-200/70 space-y-1.5">
        <span className="font-bold text-amber-200 block uppercase tracking-wider text-[10px]">
          VIP Roulette Rules & Payouts:
        </span>
        <ul className="space-y-1 list-disc list-inside text-[10.5px] leading-relaxed">
          <li>Straight-up number (0-36): pays <strong className="text-yellow-300">36x (35 to 1)</strong></li>
          <li>Dozens (1-12, 13-24, 25-36): pays <strong className="text-yellow-300">3x (2 to 1)</strong></li>
          <li>Outside bets (Red/Black, Even/Odd, 1-18/19-36): pays <strong className="text-yellow-300">2x (1 to 1)</strong></li>
          <li>Bets start from <strong className="text-white">£1.00</strong> up to <strong className="text-white">£100.00</strong> per spin.</li>
        </ul>
      </div>
    </div>
  );
};
