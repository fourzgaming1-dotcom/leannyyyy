import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Zap,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  Lock,
  Unlock,
  Check,
  DollarSign,
  AlertTriangle,
} from "lucide-react";
import { api } from "../services/api";
import { UserWallet, CrossyJumpMilestone } from "../types";

interface CrossyRoadGameProps {
  telegramId: number;
  wallet: UserWallet | null;
  onRewardWon: (amount: number, message: string, newWallet?: UserWallet) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  onOpenDeposit?: (amount?: number) => void;
  onRefreshWallet?: () => void;
  onSwitchToWheel?: () => void;
}

// 13 Jump Milestones:
// 1st hops before rest point: 1p each (1, 2, 3)
// Rest point 1: 10p (4)
// 2nd hops: 5p each (5, 6, 7)
// Rest point 2: 10p (8)
// 3rd hops: 10p each (9, 10, 11, 12) - Hop 10 unlocks Free Baller Group!
// Rest point 3 / Penthouse Finish: 10p (13)
export const MILESTONES: CrossyJumpMilestone[] = [
  { step: 1, label: "1p", amount: 0.01, name: "City Hop 1" },
  { step: 2, label: "1p", amount: 0.01, name: "City Hop 2" },
  { step: 3, label: "1p", amount: 0.01, name: "City Hop 3 · Cash Out Ready" },
  { step: 4, label: "10p", amount: 0.10, name: "🌿 Rest Point 1" },
  { step: 5, label: "5p", amount: 0.05, name: "Expressway 1" },
  { step: 6, label: "5p", amount: 0.05, name: "Expressway 2" },
  { step: 7, label: "5p", amount: 0.05, name: "Expressway 3" },
  { step: 8, label: "10p", amount: 0.10, name: "🌿 Rest Point 2" },
  { step: 9, label: "10p", amount: 0.10, name: "Highway 1" },
  { step: 10, label: "10p", amount: 0.10, name: "💎 Hop 10 · Free Baller Group!" },
  { step: 11, label: "10p", amount: 0.10, name: "Highway 3" },
  { step: 12, label: "10p", amount: 0.10, name: "Turbo Strip" },
  { step: 13, label: "10p", amount: 0.10, name: "👑 Rest Point 3 · Penthouse" },
];

// Helper to compute cumulative pot up to a given lane
export function getPotForLane(lane: number): number {
  let pot = 0;
  for (let s = 1; s <= Math.min(lane, 13); s++) {
    const m = MILESTONES.find((item) => item.step === s);
    if (m) pot += m.amount;
  }
  return Math.round(pot * 100) / 100;
}

interface Vehicle {
  x: number;
  lane: number;
  speed: number;
  width: number;
  height: number;
  type: "car" | "taxi" | "sports" | "truck" | "bus" | "limo";
  color: string;
}

interface FloatingText {
  id: number;
  x: number;
  laneY: number;
  text: string;
  color: string;
  opacity: number;
}

export const CrossyRoadGame: React.FC<CrossyRoadGameProps> = ({
  telegramId,
  wallet,
  onRewardWon,
  triggerHaptic,
  onOpenDeposit,
  onRefreshWallet,
  onSwitchToWheel,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [gameState, setGameState] = useState<"playing" | "crashed" | "cashed_out" | "won">("playing");
  const [runId, setRunId] = useState<string>(() => `run_${Date.now()}`);
  const [currentLane, setCurrentLane] = useState(0);
  const [runEarnings, setRunEarnings] = useState(0);
  const [claimedSteps, setClaimedSteps] = useState<number[]>([]);
  const [highScore, setHighScore] = useState(0);
  const [crashReason, setCrashReason] = useState<string>("");
  const [isCashingOut, setIsCashingOut] = useState(false);
  const [cashedOutAmount, setCashedOutAmount] = useState(0);
  const [cashoutLane, setCashoutLane] = useState(0);
  const [hasStartedActiveRun, setHasStartedActiveRun] = useState(false);
  const [isPayingEntry, setIsPayingEntry] = useState(false);
  const [entryError, setEntryError] = useState<string | null>(null);
  const [ballerUnlockedModal, setBallerUnlockedModal] = useState<{
    unlocked: boolean;
    link: string;
  } | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const requestRef = useRef<number | null>(null);

  const LANE_HEIGHT = 48;
  const CANVAS_WIDTH = 360;
  const CANVAS_HEIGHT = 440;

  // Player state
  const playerRef = useRef({
    x: 180,
    lane: 0,
    targetX: 180,
    targetLane: 0,
    hopProgress: 1, // 0 to 1
    facing: "up" as "up" | "down" | "left" | "right",
    isHopping: false,
  });

  const cameraYRef = useRef<number>(CANVAS_HEIGHT - 90);
  const vehiclesRef = useRef<Vehicle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const claimedStepsRef = useRef<Set<number>>(new Set());
  const runEarningsRef = useRef<number>(0);
  const runIdRef = useRef<string>(runId);
  const gameStateRef = useRef<"playing" | "crashed" | "cashed_out" | "won">("playing");

  const balance = wallet ? wallet.balance : 0.0;
  const canCashout = currentLane >= 3 && gameState === "playing" && !isCashingOut;

  useEffect(() => {
    runIdRef.current = runId;
  }, [runId]);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Load stats from server
  useEffect(() => {
    api.getCrossyRoadStats(telegramId)
      .then((data) => {
        if (data.stats) {
          setHighScore(data.stats.highScoreLane || 0);
        }
      })
      .catch((err) => console.warn("Failed to fetch crossy road stats:", err));
  }, [telegramId]);

  // Sound generator
  const playSynthSound = useCallback((type: "hop" | "coin" | "crash" | "win") => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;

      if (type === "hop") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(640, ctx.currentTime + 0.07);
        gain.gain.setValueAtTime(0.14, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.07);
      } else if (type === "coin") {
        [987.77, 1318.51].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          const startTime = ctx.currentTime + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.2);
        });
      } else if (type === "crash") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "win") {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = ctx.currentTime + i * 0.1;
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      }
    } catch {}
  }, [soundEnabled]);

  // Initialize Traffic Vehicles
  // Note: Lanes 4, 8, and 13 are Safe Rest Points and have NO vehicles
  const initVehicles = useCallback(() => {
    const list: Vehicle[] = [];

    const laneConfigs: {
      lane: number;
      speed: number;
      count: number;
      width: number;
      type: Vehicle["type"];
      color: string;
    }[] = [
      { lane: 1, speed: 1.5, count: 2, width: 46, type: "car", color: "#38bdf8" },
      { lane: 2, speed: -1.8, count: 2, width: 48, type: "taxi", color: "#facc15" },
      { lane: 3, speed: 2.2, count: 2, width: 50, type: "sports", color: "#f43f5e" },
      // Lane 4: 🌿 Rest Point 1 (NO vehicles)
      { lane: 5, speed: -2.5, count: 2, width: 56, type: "bus", color: "#a855f7" },
      { lane: 6, speed: 2.8, count: 2, width: 50, type: "sports", color: "#f97316" },
      { lane: 7, speed: -3.2, count: 3, width: 48, type: "car", color: "#ec4899" },
      // Lane 8: 🌿 Rest Point 2 (NO vehicles)
      { lane: 9, speed: 2.7, count: 2, width: 80, type: "truck", color: "#10b981" },
      { lane: 10, speed: -3.6, count: 2, width: 54, type: "sports", color: "#eab308" }, // 💎 Baller Supercars
      { lane: 11, speed: 3.3, count: 2, width: 88, type: "truck", color: "#6366f1" },
      { lane: 12, speed: -4.0, count: 3, width: 62, type: "limo", color: "#06b6d4" },
      // Lane 13: 👑 Rest Point 3 / Penthouse Finish (NO vehicles)
    ];

    laneConfigs.forEach((cfg) => {
      const spacing = 360 / cfg.count;
      for (let i = 0; i < cfg.count; i++) {
        list.push({
          lane: cfg.lane,
          speed: cfg.speed,
          x: i * spacing + (i % 2 === 0 ? 15 : 60),
          width: cfg.width,
          height: 24,
          type: cfg.type,
          color: cfg.color,
        });
      }
    });

    vehiclesRef.current = list;
  }, []);

  // Start fresh run state
  const resetRunState = useCallback((newId: string) => {
    setRunId(newId);
    runIdRef.current = newId;
    setGameState("playing");
    gameStateRef.current = "playing";
    setCurrentLane(0);
    setRunEarnings(0);
    runEarningsRef.current = 0;
    setCashedOutAmount(0);
    setCashoutLane(0);
    setIsCashingOut(false);
    setClaimedSteps([]);
    claimedStepsRef.current = new Set();
    setCrashReason("");

    playerRef.current = {
      x: 180,
      lane: 0,
      targetX: 180,
      targetLane: 0,
      hopProgress: 1,
      facing: "up",
      isHopping: false,
    };

    cameraYRef.current = CANVAS_HEIGHT - 90;
    floatingTextsRef.current = [];
    initVehicles();
    triggerHaptic("medium");
  }, [initVehicles, triggerHaptic, CANVAS_HEIGHT]);

  // Start a run paying £1.00 Entry Fee
  const handleStartRun = useCallback(async () => {
    setEntryError(null);

    if (balance < 1.0) {
      setEntryError("Insufficient balance (£1.00 required). Please top up your wallet.");
      triggerHaptic("error");
      if (onOpenDeposit) onOpenDeposit(5);
      return;
    }

    setIsPayingEntry(true);
    triggerHaptic("medium");

    try {
      const res = await api.startCrossyRoad(telegramId);
      if (res.success) {
        setHasStartedActiveRun(true);
        if (onRefreshWallet) onRefreshWallet();
        if (res.wallet) {
          onRewardWon(0, "🎮 Crossy Road Run Started (-£1.00)", res.wallet);
        }
        resetRunState(res.runId);
      }
    } catch (err: any) {
      console.error("Start run error:", err);
      setEntryError(err.message || "Failed to start run");
      triggerHaptic("error");
    } finally {
      setIsPayingEntry(false);
    }
  }, [balance, telegramId, onOpenDeposit, onRefreshWallet, onRewardWon, triggerHaptic, resetRunState]);

  useEffect(() => {
    initVehicles();
  }, [initVehicles]);

  // Execute Cash Out: Requires at least 3 hops
  const executeCashout = useCallback(async (laneToCashout = currentLane) => {
    if (laneToCashout < 3) return;
    if (gameStateRef.current === "crashed" || gameStateRef.current === "cashed_out") return;
    if (isCashingOut) return;

    setIsCashingOut(true);
    try {
      const res = await api.cashoutCrossyRoad(telegramId, laneToCashout, runIdRef.current);
      if (res.success && res.amountCashedOut > 0) {
        setGameState("cashed_out");
        gameStateRef.current = "cashed_out";
        setHasStartedActiveRun(false);
        setCashedOutAmount(res.amountCashedOut);
        setCashoutLane(res.step);
        playSynthSound("win");
        triggerHaptic("heavy");

        if (res.wallet) {
          onRewardWon(res.amountCashedOut, res.message, res.wallet);
        }
        if (onRefreshWallet) {
          onRefreshWallet();
        }
      }
    } catch (err: any) {
      console.error("Cash out error:", err);
    } finally {
      setIsCashingOut(false);
    }
  }, [currentLane, isCashingOut, telegramId, playSynthSound, triggerHaptic, onRewardWon, onRefreshWallet]);

  // Claim jump milestone & accumulate pot
  const claimLaneMilestone = useCallback(async (laneNum: number) => {
    if (laneNum < 1 || laneNum > 13) return;
    if (claimedStepsRef.current.has(laneNum)) return;

    claimedStepsRef.current.add(laneNum);
    setClaimedSteps((prev) => [...prev, laneNum]);

    const milestone = MILESTONES.find((m) => m.step === laneNum);
    if (!milestone) return;

    // Calculate progressive accumulated pot up to this step
    const pot = getPotForLane(laneNum);
    runEarningsRef.current = pot;
    setRunEarnings(pot);

    if (laneNum === 3) {
      playSynthSound("win");
      triggerHaptic("success");
      floatingTextsRef.current.push({
        id: Date.now() + Math.random(),
        x: playerRef.current.x,
        laneY: -laneNum * LANE_HEIGHT,
        text: `+1p! 🔓 CASHOUT UNLOCKED!`,
        color: "#10b981",
        opacity: 1.2,
      });
    } else if (laneNum === 4 || laneNum === 8 || laneNum === 13) {
      playSynthSound("win");
      triggerHaptic("success");
      floatingTextsRef.current.push({
        id: Date.now() + Math.random(),
        x: playerRef.current.x,
        laneY: -laneNum * LANE_HEIGHT,
        text: `🌿 REST POINT! +${milestone.label} (Pot: £${pot.toFixed(2)})`,
        color: "#34d399",
        opacity: 1.3,
      });
    } else {
      playSynthSound("coin");
      triggerHaptic("light");
      floatingTextsRef.current.push({
        id: Date.now() + Math.random(),
        x: playerRef.current.x,
        laneY: -laneNum * LANE_HEIGHT,
        text: `+${milestone.label}! (Pot: £${pot.toFixed(2)})`,
        color: "#fde047",
        opacity: 1,
      });
    }

    try {
      const res = await api.crossyRoadJump(telegramId, laneNum, runIdRef.current);
      if (res.ballerGroupUnlocked) {
        setBallerUnlockedModal({
          unlocked: true,
          link: res.ballerInviteLink || "https://t.me/BallerGroupAccess",
        });
        playSynthSound("win");
        triggerHaptic("heavy");
        if (onRefreshWallet) onRefreshWallet();
      }
    } catch (err) {
      console.warn("Crossy road jump tracking error:", err);
    }

    // Lane 13: Final VIP Penthouse automatically cashes out full jackpot!
    if (laneNum === 13) {
      executeCashout(13);
    }
  }, [telegramId, playSynthSound, triggerHaptic, LANE_HEIGHT, executeCashout, onRefreshWallet]);

  // Player Hop Handler
  const handleHop = useCallback((direction: "up" | "down" | "left" | "right") => {
    if (
      !hasStartedActiveRun ||
      gameStateRef.current === "crashed" ||
      gameStateRef.current === "cashed_out" ||
      gameStateRef.current === "won"
    ) {
      handleStartRun();
      return;
    }

    const p = playerRef.current;
    if (p.isHopping) return;

    p.facing = direction;
    p.isHopping = true;
    p.hopProgress = 0;
    playSynthSound("hop");
    triggerHaptic("light");

    if (direction === "up") {
      if (p.lane < 13) {
        p.targetLane = p.lane + 1;
      }
    } else if (direction === "down") {
      if (p.lane > 0) {
        p.targetLane = p.lane - 1;
      }
    } else if (direction === "left") {
      p.targetX = Math.max(30, p.x - 36);
    } else if (direction === "right") {
      p.targetX = Math.min(330, p.x + 36);
    }
  }, [playSynthSound, triggerHaptic, handleStartRun, hasStartedActiveRun]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "KeyW", "Space"].includes(e.code)) {
        e.preventDefault();
        handleHop("up");
      } else if (["ArrowDown", "KeyS"].includes(e.code)) {
        e.preventDefault();
        handleHop("down");
      } else if (["ArrowLeft", "KeyA"].includes(e.code)) {
        e.preventDefault();
        handleHop("left");
      } else if (["ArrowRight", "KeyD"].includes(e.code)) {
        e.preventDefault();
        handleHop("right");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleHop]);

  // Main Canvas Animation and Drawing Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = performance.now();

    const renderLoop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const p = playerRef.current;

      // Hop progress animation
      if (p.isHopping) {
        p.hopProgress += dt * 8.0; // ~125ms hop
        if (p.hopProgress >= 1) {
          p.hopProgress = 1;
          p.isHopping = false;
          p.x = p.targetX;
          p.lane = p.targetLane;
          setCurrentLane(p.lane);
          setHighScore((prev) => Math.max(prev, p.lane));

          if (p.lane > 0 && !claimedStepsRef.current.has(p.lane)) {
            claimLaneMilestone(p.lane);
          }
        } else {
          p.x = p.x + (p.targetX - p.x) * p.hopProgress;
        }
      }

      // Parabolic jump arc
      const jumpArc = Math.sin(p.hopProgress * Math.PI) * 16;

      // Update vehicles
      vehiclesRef.current.forEach((v) => {
        v.x += v.speed * (dt * 60);
        if (v.speed > 0 && v.x > CANVAS_WIDTH + 80) {
          v.x = -v.width - 30;
        } else if (v.speed < 0 && v.x < -v.width - 80) {
          v.x = CANVAS_WIDTH + 30;
        }
      });

      // Target camera Y to keep player near bottom-center
      const playerWorldY = -(p.lane + (p.targetLane - p.lane) * p.hopProgress) * LANE_HEIGHT;
      const targetCameraY = (CANVAS_HEIGHT - 90) - playerWorldY;

      // Smooth camera interpolation
      cameraYRef.current += (targetCameraY - cameraYRef.current) * 0.18;
      const cameraY = cameraYRef.current;

      // Clear Canvas
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Background Sky / Distant Horizon at top
      ctx.fillStyle = "#030008";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      // Translate camera
      ctx.translate(0, cameraY);

      // Draw bottom grass ground extension below Lane 0
      ctx.fillStyle = "#14532d";
      ctx.fillRect(0, 48, CANVAS_WIDTH, 120);

      // Draw All 14 Lanes (Lane 0 to 13)
      for (let l = 0; l <= 13; l++) {
        const laneY = -l * LANE_HEIGHT;

        if (l === 0) {
          // Lane 0: Starting Sidewalk
          ctx.fillStyle = "#15803d"; // Lush green grass
          ctx.fillRect(0, laneY, CANVAS_WIDTH, LANE_HEIGHT);

          // Grass blades
          ctx.fillStyle = "#22c55e";
          for (let gx = 12; gx < CANVAS_WIDTH; gx += 24) {
            ctx.fillRect(gx, laneY + 12, 3, 8);
            ctx.fillRect(gx + 5, laneY + 22, 2, 6);
          }

          // Concrete Curb
          ctx.fillStyle = "#475569";
          ctx.fillRect(0, laneY, CANVAS_WIDTH, 4);

          // Checkered start line
          for (let cx = 0; cx < CANVAS_WIDTH; cx += 16) {
            ctx.fillStyle = cx % 32 === 0 ? "#ffffff" : "#1e293b";
            ctx.fillRect(cx, laneY + 4, 16, 6);
          }

          ctx.fillStyle = "#ffffff";
          ctx.font = "900 10px monospace";
          ctx.fillText("🏁 START LINE (HOP UP ⬆)", 16, laneY + 30);
        } else if (l === 4 || l === 8) {
          // Lanes 4 & 8: Safe Rest Points (Lush Greenery & Safe Oasis)
          ctx.fillStyle = "#047857";
          ctx.fillRect(0, laneY, CANVAS_WIDTH, LANE_HEIGHT);

          // Paved walkway in rest point
          ctx.fillStyle = "#065f46";
          ctx.fillRect(0, laneY + 6, CANVAS_WIDTH, LANE_HEIGHT - 12);

          // Flowers / Trees deco
          ctx.fillStyle = "#34d399";
          for (let gx = 18; gx < CANVAS_WIDTH; gx += 32) {
            ctx.fillRect(gx, laneY + 12, 3, 7);
            ctx.fillRect(gx + 4, laneY + 22, 2, 5);
          }

          // Rest point curb borders
          ctx.fillStyle = "#10b981";
          ctx.fillRect(0, laneY, CANVAS_WIDTH, 3);
          ctx.fillRect(0, laneY + LANE_HEIGHT - 3, CANVAS_WIDTH, 3);

          const m = MILESTONES.find((item) => item.step === l);
          ctx.fillStyle = "#a7f3d0";
          ctx.font = "900 10px monospace";
          ctx.fillText(`🌿 REST POINT ${l === 4 ? "1" : "2"} · SAFE ZONE (+${m?.label || "10p"})`, 16, laneY + 28);
        } else if (l === 13) {
          // Lane 13: Rest Point 3 & Golden Penthouse Finish Line
          ctx.fillStyle = "#831843"; // Rich royal ruby carpet
          ctx.fillRect(0, laneY, CANVAS_WIDTH, LANE_HEIGHT);

          // Gold border stripes
          ctx.fillStyle = "#facc15";
          ctx.fillRect(0, laneY, CANVAS_WIDTH, 4);
          ctx.fillRect(0, laneY + LANE_HEIGHT - 4, CANVAS_WIDTH, 4);

          // Finish banner text
          ctx.fillStyle = "#fef08a";
          ctx.font = "900 11px monospace";
          ctx.fillText("👑 REST POINT 3 · VIP PENTHOUSE FINISH (+10p)", 16, laneY + 28);
        } else {
          // Road Lanes (1, 2, 3, 5, 6, 7, 9, 10, 11, 12)
          ctx.fillStyle = l === 10 ? "#1e1b4b" : l % 2 === 0 ? "#111827" : "#0f172a";
          ctx.fillRect(0, laneY, CANVAS_WIDTH, LANE_HEIGHT);

          // White dashed center line
          ctx.fillStyle = l === 10 ? "#eab308" : "#64748b";
          for (let dashX = 8; dashX < CANVAS_WIDTH; dashX += 28) {
            ctx.fillRect(dashX, laneY + LANE_HEIGHT / 2 - 1, 14, 2);
          }

          // Baller Lane 10 special road badge
          if (l === 10) {
            ctx.fillStyle = "rgba(234, 179, 8, 0.25)";
            ctx.fillRect(10, laneY + 12, 180, 20);
            ctx.fillStyle = "#fef08a";
            ctx.font = "900 9px monospace";
            ctx.fillText("💎 HOP 10: FREE BALLER GROUP!", 14, laneY + 25);
          }

          // Top and bottom asphalt lane borders
          ctx.fillStyle = "#1e293b";
          ctx.fillRect(0, laneY, CANVAS_WIDTH, 1);
          ctx.fillRect(0, laneY + LANE_HEIGHT - 1, CANVAS_WIDTH, 1);

          // Milestone badge on right edge
          const m = MILESTONES.find((item) => item.step === l);
          if (m) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(CANVAS_WIDTH - 64, laneY + 12, 54, 18);
            ctx.fillStyle = claimedStepsRef.current.has(l) ? "#34d399" : "#fde047";
            ctx.font = "900 10px monospace";
            ctx.fillText(`+${m.label}`, CANVAS_WIDTH - 54, laneY + 25);
          }
        }
      }

      // Draw Moving Vehicles
      vehiclesRef.current.forEach((v) => {
        const vy = -v.lane * LANE_HEIGHT + (LANE_HEIGHT - v.height) / 2;

        // Shadow under car
        ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
        ctx.fillRect(v.x + 2, vy + 4, v.width, v.height);

        // Main Car Body
        ctx.fillStyle = v.color;
        ctx.beginPath();
        ctx.roundRect(v.x, vy, v.width, v.height, 5);
        ctx.fill();

        // Top Roof / Windows
        ctx.fillStyle = "#0f172a";
        const isRight = v.speed > 0;
        if (isRight) {
          // Windshield forward (right)
          ctx.fillRect(v.x + v.width - 14, vy + 3, 6, v.height - 6);
          // Headlights (Right side)
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(v.x + v.width - 2, vy + 2, 2, 5);
          ctx.fillRect(v.x + v.width - 2, vy + v.height - 7, 2, 5);
          // Taillights (Left side)
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(v.x, vy + 2, 2, 5);
          ctx.fillRect(v.x, vy + v.height - 7, 2, 5);
        } else {
          // Windshield forward (left)
          ctx.fillRect(v.x + 8, vy + 3, 6, v.height - 6);
          // Headlights (Left side)
          ctx.fillStyle = "#fef08a";
          ctx.fillRect(v.x, vy + 2, 2, 5);
          ctx.fillRect(v.x, vy + v.height - 7, 2, 5);
          // Taillights (Right side)
          ctx.fillStyle = "#ef4444";
          ctx.fillRect(v.x + v.width - 2, vy + 2, 2, 5);
          ctx.fillRect(v.x + v.width - 2, vy + v.height - 7, 2, 5);
        }

        // Roof cab
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(v.x + 10, vy + 4, v.width - 22, v.height - 8);

        // Collision Check: Only when on road and not already crashed
        if (
          gameStateRef.current === "playing" &&
          p.lane === v.lane &&
          jumpArc < 9
        ) {
          const px = p.x;
          const pLeft = px - 10;
          const pRight = px + 10;
          const vLeft = v.x;
          const vRight = v.x + v.width;

          if (pRight > vLeft && pLeft < vRight) {
            setGameState("crashed");
            gameStateRef.current = "crashed";
            setCrashReason(`BUMPED by a ${v.type} on Lane ${v.lane}!`);
            playSynthSound("crash");
            triggerHaptic("error");
          }
        }
      });

      // Draw Player Character
      const currentVisualLaneY = -(p.lane + (p.targetLane - p.lane) * p.hopProgress) * LANE_HEIGHT;
      const playerGroundY = currentVisualLaneY + LANE_HEIGHT / 2;
      const playerY = playerGroundY - jumpArc;

      // Shadow on ground
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      const shadowScale = Math.max(0.4, 1 - jumpArc / 25);
      ctx.beginPath();
      ctx.ellipse(p.x, playerGroundY + 8, 12 * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();

      if (gameStateRef.current === "crashed") {
        // Splat graphic
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.ellipse(p.x, playerGroundY + 4, 18, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "900 10px sans-serif";
        ctx.fillText("💥 SPLAT!", p.x - 22, playerGroundY - 8);
      } else {
        // Crossy Chicken / Hopper
        ctx.save();
        ctx.translate(p.x, playerY);

        // Body (Chunky white/yellow voxel)
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.roundRect(-10, -14, 20, 20, 5);
        ctx.fill();

        // Shading on body
        ctx.fillStyle = "#e2e8f0";
        ctx.fillRect(-10, 0, 20, 6);

        // Red Comb
        ctx.fillStyle = "#ef4444";
        ctx.beginPath();
        ctx.arc(0, -15, 4, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = "#f97316";
        if (p.facing === "up") {
          ctx.beginPath();
          ctx.moveTo(-3, -14);
          ctx.lineTo(3, -14);
          ctx.lineTo(0, -19);
          ctx.fill();
        } else if (p.facing === "down") {
          ctx.beginPath();
          ctx.moveTo(-3, 6);
          ctx.lineTo(3, 6);
          ctx.lineTo(0, 11);
          ctx.fill();
        } else if (p.facing === "left") {
          ctx.beginPath();
          ctx.moveTo(-10, -4);
          ctx.lineTo(-10, 2);
          ctx.lineTo(-15, -1);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.moveTo(10, -4);
          ctx.lineTo(10, 2);
          ctx.lineTo(15, -1);
          ctx.fill();
        }

        // Cool Sunglasses (VIP shades)
        ctx.fillStyle = "#0f172a";
        ctx.fillRect(-8, -10, 16, 5);
        ctx.fillStyle = "#38bdf8";
        ctx.fillRect(-6, -9, 4, 2);
        ctx.fillRect(2, -9, 4, 2);

        // Gold VIP medal chain
        ctx.strokeStyle = "#eab308";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI);
        ctx.stroke();

        ctx.restore();
      }

      // Draw Floating Reward Texts
      floatingTextsRef.current.forEach((ft) => {
        ft.laneY -= dt * 30;
        ft.opacity -= dt * 0.85;
        if (ft.opacity > 0) {
          ctx.fillStyle = `rgba(250, 204, 21, ${Math.max(0, ft.opacity)})`;
          ctx.font = "900 15px sans-serif";
          ctx.fillText(ft.text, ft.x - 14, ft.laneY);
        }
      });
      floatingTextsRef.current = floatingTextsRef.current.filter((ft) => ft.opacity > 0);

      ctx.restore();

      requestRef.current = requestAnimationFrame(renderLoop);
    };

    requestRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [claimLaneMilestone, playSynthSound, triggerHaptic, LANE_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT]);

  const nextMilestone = MILESTONES.find((m) => m.step === currentLane + 1);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* VIP ARCADE GAME HEADER BAR */}
      <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#260515] via-[#12011f] to-[#080012] border-2 border-amber-500/70 shadow-[0_0_40px_rgba(245,158,11,0.3)] text-center">
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Badges Row */}
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black text-[10px] font-black uppercase tracking-wider shadow-[0_0_12px_rgba(245,158,11,0.5)]">
            <Crown className="w-3.5 h-3.5" />
            <span>🚗 VIP Crossy Road · £1.00 Per Go</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 rounded-xl bg-black/60 border border-white/15 text-pink-300 hover:text-white transition-colors cursor-pointer"
              title={soundEnabled ? "Mute" : "Unmute"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
            </button>

            {onSwitchToWheel && (
              <button
                onClick={() => {
                  triggerHaptic("light");
                  onSwitchToWheel();
                }}
                className="px-2.5 py-1 rounded-xl bg-yellow-950/90 border border-yellow-500/60 text-yellow-200 hover:text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-[0_0_10px_rgba(250,204,21,0.3)]"
              >
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span>Play Lucky Wheel (£1)</span>
              </button>
            )}
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <span>🚗</span>
          <span>VIP Crossy Road · <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-emerald-400 bg-clip-text text-transparent">Hop For Cash</span></span>
        </h2>

        <p className="text-xs text-pink-200/90 mt-1 max-w-md mx-auto leading-relaxed">
          £1 per go · 1st hops: <span className="text-yellow-300 font-bold">1p each</span> · Rest 1: <span className="text-emerald-300 font-bold">+10p</span> · 2nd hops: <span className="text-yellow-300 font-bold">5p each</span> · Rest 2: <span className="text-emerald-300 font-bold">+10p</span> · 3rd hops: <span className="text-yellow-300 font-bold">10p each</span>. Hop 10 unlocks <span className="text-amber-300 font-black">👑 FREE 💎 Baller Group!</span> Cash out anytime after 3 hops!
        </p>

        {/* Live HUD Sub-bar */}
        <div className="mt-3 grid grid-cols-3 gap-2 bg-black/80 p-2.5 rounded-2xl border border-white/15 text-xs">
          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-pink-300/80 text-[10px] uppercase font-bold flex items-center gap-1">
              <Coins className="w-3 h-3 text-emerald-400" />
              Wallet
            </span>
            <span className="font-mono font-black text-white text-xs sm:text-sm mt-0.5">
              £{balance.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-gradient-to-b from-yellow-500/15 to-transparent border border-yellow-500/30">
            <span className="text-yellow-300 text-[10px] uppercase font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-yellow-400 animate-pulse" />
              Run Pot
            </span>
            <span className="font-mono font-black text-yellow-300 text-xs sm:text-sm mt-0.5">
              +£{runEarnings.toFixed(2)}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center p-1.5 rounded-xl bg-white/5 border border-white/5">
            <span className="text-pink-300/80 text-[10px] uppercase font-bold flex items-center gap-1">
              <Trophy className="w-3 h-3 text-amber-400" />
              Lane
            </span>
            <span className="font-mono font-black text-amber-300 text-xs sm:text-sm mt-0.5">
              {currentLane} / 13
            </span>
          </div>
        </div>

        {/* Cash Out Status Indicator */}
        <div className="mt-2.5 flex items-center justify-center gap-2 flex-wrap text-center">
          {currentLane < 3 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-700 text-zinc-300 text-[11px] font-bold">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Hop {3 - currentLane} more time{3 - currentLane === 1 ? "" : "s"} to unlock Cash Out ({currentLane}/3)</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-emerald-950/90 border border-emerald-400 text-emerald-300 text-[11px] font-black animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]">
              <Unlock className="w-3 h-3 text-emerald-400" />
              <span>CASH OUT UNLOCKED · Take £{runEarnings.toFixed(2)} whenever you like!</span>
            </span>
          )}

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-950/70 border border-purple-500/40 text-purple-300 text-[10px] font-bold">
            <Crown className="w-3 h-3 text-yellow-400" />
            <span>Hop 10 = Free Baller Pass</span>
          </span>
        </div>

        {entryError && (
          <div className="mt-2.5 p-2 rounded-xl bg-red-950/90 border border-red-500/50 text-red-200 text-xs flex items-center justify-center gap-1.5 animate-bounce">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
            <span>{entryError}</span>
          </div>
        )}
      </div>

      {/* 13 Milestones Progression Ribbon */}
      <div className="p-2.5 rounded-2xl bg-[#090014]/90 border border-white/10 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[10px] font-black uppercase text-pink-300/80 tracking-wider mr-1">
            Ladders:
          </span>
          {MILESTONES.map((m) => {
            const isClaimed = claimedSteps.includes(m.step);
            const isCurrent = currentLane === m.step;
            const isRestPoint = m.step === 4 || m.step === 8 || m.step === 13;
            const isBallerHop = m.step === 10;

            return (
              <div
                key={m.step}
                className={`py-1 px-2 rounded-xl text-[10px] font-mono font-bold flex items-center gap-1 transition-all ${
                  isClaimed
                    ? "bg-emerald-950 border border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                    : isCurrent
                    ? "bg-yellow-400 text-black font-black scale-105 shadow-[0_0_12px_rgba(250,204,21,0.6)]"
                    : isBallerHop
                    ? "bg-purple-950 border border-yellow-400/60 text-yellow-300 font-extrabold"
                    : isRestPoint
                    ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                    : "bg-black/60 border border-white/10 text-white/60"
                }`}
              >
                {isClaimed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {isBallerHop && !isClaimed && <Crown className="w-3 h-3 text-yellow-400" />}
                <span>#{m.step}:</span>
                <span className={isClaimed ? "text-emerald-300" : isCurrent ? "text-black" : isBallerHop ? "text-yellow-300 font-black" : "text-white"}>
                  {m.label}
                </span>
                {isRestPoint && <span className="text-[9px] text-emerald-400">🌿</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Game Canvas Container */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] bg-[#030006]">
        {/* In-Canvas Top Left Banner: Next Hop */}
        {nextMilestone && gameState === "playing" && (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/85 backdrop-blur-md border border-yellow-400/40 pointer-events-none">
            <Zap className="w-3 h-3 text-yellow-400 animate-pulse" />
            <span className="text-[11px] text-yellow-300 font-bold">
              Hop #{nextMilestone.step}: +{nextMilestone.label}
              {nextMilestone.step === 4 || nextMilestone.step === 8 ? " (🌿 Rest Point)" : nextMilestone.step === 10 ? " (💎 Free Baller Group!)" : ""}
            </span>
          </div>
        )}

        {/* In-Canvas Top Right Floating Cash Out Button */}
        {gameState === "playing" && (
          <div className="absolute top-2 right-2 z-20">
            {currentLane >= 3 ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  executeCashout();
                }}
                disabled={isCashingOut}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.8)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer animate-pulse"
              >
                <Coins className="w-3.5 h-3.5 text-black" />
                <span>{isCashingOut ? "Claiming..." : `CASH OUT £${runEarnings.toFixed(2)}`}</span>
              </button>
            ) : (
              <div className="px-2.5 py-1 rounded-xl bg-black/80 border border-white/15 text-zinc-400 text-[10px] font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-zinc-400" />
                <span>Cashout: {currentLane}/3</span>
              </div>
            )}
          </div>
        )}

        {/* The Game Canvas Screen */}
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onClick={() => handleHop("up")}
          className="w-full h-[420px] object-cover cursor-pointer block select-none touch-none"
        />

        {/* CRASHED GAME OVER OVERLAY (You Lose If Car Crashes Into You) */}
        {gameState === "crashed" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="w-full max-w-xs bg-[#150005] border-2 border-red-500/80 rounded-3xl p-5 text-center space-y-3 shadow-[0_0_45px_rgba(239,68,68,0.6)]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-red-950 border border-red-500/60 flex items-center justify-center text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                <Flame className="w-7 h-7 animate-bounce text-red-500" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400 px-2.5 py-0.5 rounded-full bg-red-950 border border-red-500/40">
                  Crash! You Lose!
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  BUMPED BY TRAFFIC!
                </h3>
                <p className="text-xs text-red-200/90 mt-0.5">
                  {crashReason || "The vehicle crashed into you and you lost the round!"}
                </p>
              </div>

              {/* Pot Summary Box */}
              <div className="p-3.5 rounded-2xl bg-black/85 border border-red-500/40 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-red-400 block tracking-wider">
                  Uncashed Pot Lost:
                </span>
                <div className="text-3xl font-mono font-black text-red-400 drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]">
                  £{runEarnings.toFixed(2)}
                </div>
                <span className="text-[10px] text-pink-200/80 block pt-1 border-t border-white/10">
                  Tip: You can cash out whenever you like after 3 hops to lock in your money!
                </span>
              </div>

              <button
                onClick={handleStartRun}
                disabled={isPayingEntry}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.6)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isPayingEntry ? "Starting..." : "Hop Again (£1.00)"}</span>
              </button>
            </div>
          </div>
        )}

        {/* CASHED OUT SUCCESS OVERLAY */}
        {gameState === "cashed_out" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="w-full max-w-xs bg-[#031c12] border-2 border-emerald-400 rounded-3xl p-5 text-center space-y-3 shadow-[0_0_50px_rgba(16,185,129,0.6)]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950 border border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <Coins className="w-8 h-8 animate-bounce text-emerald-400" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-400/40">
                  Cashed Out!
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  WINNINGS SECURED!
                </h3>
                <p className="text-xs text-emerald-200/90 mt-0.5">
                  You cashed out at Lane #{cashoutLane || currentLane} ({cashoutLane || currentLane} safe hops)!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/90 border border-emerald-400/60 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block tracking-wider">
                  Credited To Your Live Wallet:
                </span>
                <div className="text-3xl font-mono font-black text-emerald-300 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]">
                  +£{cashedOutAmount.toFixed(2)}
                </div>
                <span className="text-[10px] text-emerald-400 font-bold block">
                  ✓ Instantly added to your wallet for VIP passes & games!
                </span>
              </div>

              <button
                onClick={handleStartRun}
                disabled={isPayingEntry}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-300 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.6)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isPayingEntry ? "Starting..." : "Play Next Run (£1.00)"}</span>
              </button>
            </div>
          </div>
        )}

        {/* WON FINISH LINE OVERLAY */}
        {gameState === "won" && (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="w-full max-w-xs bg-[#1a0c00] border-2 border-yellow-400 rounded-3xl p-5 text-center space-y-3 shadow-[0_0_50px_rgba(250,204,21,0.6)]">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-950 border border-yellow-400 flex items-center justify-center text-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.5)]">
                <Crown className="w-8 h-8 animate-bounce text-yellow-400" />
              </div>

              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400 px-2.5 py-0.5 rounded-full bg-yellow-950 border border-yellow-400/40">
                  Jackpot Cleared!
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  VIP PENTHOUSE CONQUERED!
                </h3>
                <p className="text-xs text-yellow-200/90 mt-0.5">
                  You hopped across all 13 traffic lanes safely to the penthouse!
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/90 border border-yellow-400/60 text-center space-y-1">
                <span className="text-[10px] uppercase font-bold text-yellow-400 block tracking-wider">
                  Total Cash Credited This Run:
                </span>
                <div className="text-3xl font-mono font-black text-yellow-300 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">
                  £{(cashedOutAmount || runEarnings).toFixed(2)}
                </div>
                <span className="text-[10px] text-emerald-400 font-bold block">
                  ✓ Available to spend on VIP passes & arcade games!
                </span>
              </div>

              <button
                onClick={handleStartRun}
                disabled={isPayingEntry}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(250,204,21,0.6)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{isPayingEntry ? "Starting..." : "Play Another Run (£1.00)"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CASHOUT ACTION BAR */}
      <div className="space-y-2">
        {currentLane >= 3 && gameState === "playing" ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/90 via-black to-emerald-950/90 border-2 border-emerald-400/80 shadow-[0_0_30px_rgba(16,185,129,0.35)] text-center space-y-1.5">
            <button
              onClick={() => executeCashout()}
              disabled={isCashingOut}
              className="w-full py-4 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 hover:from-emerald-300 hover:to-green-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(16,185,129,0.8)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse"
            >
              <Coins className="w-5 h-5 text-black" />
              <span>
                {isCashingOut ? "CASHING OUT..." : `💰 CASH OUT NOW · SECURE £${runEarnings.toFixed(2)} CASH`}
              </span>
            </button>
            <p className="text-[11px] text-emerald-300 font-semibold">
              ✓ Unlocked! Tap to lock in your money instantly onto your spendable balance.
            </p>
          </div>
        ) : (
          <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/10 text-center space-y-1">
            <button
              disabled
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 border border-white/10 text-zinc-500 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-not-allowed opacity-70"
            >
              <Lock className="w-4 h-4 text-zinc-500" />
              <span>
                CASH OUT (Unlock after 3 hops · Current: {currentLane}/3)
              </span>
            </button>
            <p className="text-[10px] text-pink-300/60 font-medium">
              Hop at least 3 times across traffic to unlock Cash Out! After 3 hops, cash out whenever you like.
            </p>
          </div>
        )}
      </div>

      {/* ARCADE MISSION RADAR & TRAFFIC SENSOR DASHBOARD OVER HOP BAR */}
      <div className="rounded-2xl p-3.5 bg-gradient-to-br from-[#1b022b] via-[#0d0017] to-[#04000a] border-2 border-pink-500/40 shadow-[0_0_25px_rgba(236,72,153,0.2)] space-y-3">
        {/* Mission Trail Checkpoints */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-wider text-pink-300/80">
            <span>Arcade Course Radar</span>
            <span className="text-yellow-400 font-mono">Fee: £1.00 / Run</span>
          </div>

          <div className="grid grid-cols-5 gap-1 text-[9px] font-mono text-center">
            <div className={`p-1.5 rounded-lg border transition-all ${
              currentLane === 0 ? "bg-amber-400 text-black font-black border-amber-300 shadow" : "bg-black/60 border-white/10 text-white/60"
            }`}>
              🏁 Start
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              currentLane >= 4 ? "bg-emerald-500 text-black font-black border-emerald-400 shadow" : "bg-black/60 border-white/10 text-emerald-400"
            }`}>
              🌿 Rest 1 (+10p)
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              currentLane >= 8 ? "bg-emerald-500 text-black font-black border-emerald-400 shadow" : "bg-black/60 border-white/10 text-emerald-400"
            }`}>
              🌿 Rest 2 (+10p)
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              currentLane >= 10 ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black font-black border-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.6)]" : "bg-purple-950/80 border-purple-500/40 text-yellow-300 font-bold"
            }`}>
              👑 Baller VIP (10)
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              currentLane >= 13 ? "bg-amber-400 text-black font-black border-yellow-300 shadow" : "bg-black/60 border-white/10 text-white/60"
            }`}>
              👑 Finish (+10p)
            </div>
          </div>
        </div>

        {/* Live Traffic Sensor Status Bar */}
        <div className="p-2.5 rounded-xl bg-black/80 border border-white/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <span className="text-[11px] font-bold text-white">
              {currentLane === 4 || currentLane === 8 || currentLane === 13 ? (
                <span className="text-emerald-400">🛡️ You are in a Safe Rest Zone! No cars here.</span>
              ) : currentLane === 10 ? (
                <span className="text-yellow-300 font-black">💎 Hop 10 Cleared: Free Baller VIP Unlocked!</span>
              ) : (
                <span className="text-pink-200">⚠️ Traffic Active: Watch for speed gaps & hop!</span>
              )}
            </span>
          </div>

          <div className="text-right flex items-center gap-1 font-mono font-bold text-[11px] text-yellow-300">
            <span>Pot:</span>
            <span className="text-white text-xs font-black">+£{runEarnings.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Arcade Mobile Touch Controls */}
      <div className="p-3 rounded-2xl bg-[#090014]/90 border border-white/10 space-y-2">
        {/* VIBRANT HIGH-TECH DISPLAY DIRECTLY OVER HOP BAR */}
        <div className="relative overflow-hidden rounded-2xl p-2.5 bg-gradient-to-r from-[#20032b] via-[#0e0117] to-[#1c0024] border-2 border-yellow-400/60 shadow-[0_0_20px_rgba(250,204,21,0.25)]">
          <div className="flex items-center justify-between gap-2 text-xs">
            {/* Pulsing Radar Signal */}
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-yellow-500"></span>
              </span>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-wider text-yellow-300 flex items-center gap-1">
                  <span>TRAFFIC RADAR</span>
                  <span className="text-white/40">·</span>
                  <span className="text-emerald-400 font-mono">
                    {currentLane === 4 || currentLane === 8 || currentLane === 13 ? "🌿 REST POINT" : `LANE #${currentLane}`}
                  </span>
                </span>
                <span className="text-[10px] text-pink-200 font-bold">
                  {currentLane < 3
                    ? `⚠️ Hop ${3 - currentLane} more to unlock Cash Out`
                    : currentLane < 10
                    ? `🎯 ${10 - currentLane} hops to Free 💎 Baller Group!`
                    : "👑 Free Baller Group Unlocked!"}
                </span>
              </div>
            </div>

            {/* Live Pot Counter */}
            <div className="text-right flex flex-col items-end">
              <span className="text-[9px] font-bold text-pink-300 uppercase tracking-wider">Run Pot</span>
              <span className="text-sm font-mono font-black text-emerald-300 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]">
                +£{runEarnings.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Animated Course Progress Bar */}
          <div className="mt-2 w-full bg-black/70 rounded-full h-1.5 overflow-hidden flex border border-white/10">
            <div
              className="bg-gradient-to-r from-yellow-400 via-amber-400 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${Math.max(5, Math.min(100, (currentLane / 13) * 100))}%` }}
            />
          </div>
        </div>

        {/* Large Primary Hop / Start Run Button (The Hop Bar) */}
        {!hasStartedActiveRun || gameState === "crashed" || gameState === "cashed_out" || gameState === "won" ? (
          <button
            onClick={handleStartRun}
            disabled={isPayingEntry}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,11,0.6)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 animate-pulse"
          >
            <Zap className="w-5 h-5 text-black" />
            <span>{isPayingEntry ? "Starting Run..." : "START RUN (£1.00) 🎮"}</span>
          </button>
        ) : (
          <button
            onClick={() => handleHop("up")}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <ArrowUp className="w-5 h-5 text-black animate-bounce" />
            <span>HOP FORWARD ⬆ (Tap to Jump)</span>
          </button>
        )}

        {/* Directional Pad (Left, Back, Right) */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleHop("left")}
            className="py-2.5 px-3 rounded-xl bg-black/70 hover:bg-white/10 border border-white/15 text-pink-200 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>LEFT</span>
          </button>

          <button
            onClick={() => handleHop("down")}
            className="py-2.5 px-3 rounded-xl bg-black/70 hover:bg-white/10 border border-white/15 text-pink-200 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowDown className="w-4 h-4" />
            <span>BACK</span>
          </button>

          <button
            onClick={() => handleHop("right")}
            className="py-2.5 px-3 rounded-xl bg-black/70 hover:bg-white/10 border border-white/15 text-pink-200 font-black text-xs flex items-center justify-center gap-1 active:scale-95 transition-all cursor-pointer"
          >
            <span>RIGHT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-center text-pink-300/60 font-mono">
          Tip: Tap the game screen or press Keyboard Arrow Keys / Space to hop!
        </p>
      </div>

      {/* BALLER GROUP UNLOCKED CELEBRATION MODAL */}
      {ballerUnlockedModal && ballerUnlockedModal.unlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#240333] via-[#12001c] to-[#080010] border-2 border-yellow-400 p-6 text-center space-y-4 shadow-[0_0_50px_rgba(250,204,21,0.5)]">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-yellow-950 border-2 border-yellow-400 flex items-center justify-center text-yellow-300 shadow-[0_0_25px_rgba(250,204,21,0.6)]">
              <Crown className="w-9 h-9 animate-bounce text-yellow-400" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-yellow-950 border border-yellow-400 text-yellow-300 text-[10px] font-black uppercase tracking-wider">
                👑 10 Hops Milestone Reached!
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                BALLER VIP GROUP UNLOCKED!
              </h3>
              <p className="text-xs text-yellow-200/90 mt-1">
                Congratulations! You safely cleared 10 hops and won free lifetime access to the <strong>Baller VIP Group</strong> (Worth £10.00)!
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/80 border border-yellow-400/40 text-left space-y-1">
              <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider block">
                Your Exclusive VIP Invite Link:
              </span>
              <div className="font-mono text-xs text-white break-all p-2 rounded-xl bg-white/5 border border-white/10 select-all">
                {ballerUnlockedModal.link}
              </div>
            </div>

            <div className="space-y-2">
              <a
                href={ballerUnlockedModal.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic("heavy")}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 text-black font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(250,204,21,0.6)] active:scale-95 transition-all flex items-center justify-center gap-1.5"
              >
                <span>Join Baller VIP Group Now 🚀</span>
              </a>

              <button
                onClick={() => {
                  triggerHaptic("light");
                  setBallerUnlockedModal(null);
                }}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 font-bold text-xs cursor-pointer"
              >
                Continue Hopping 🎮
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
