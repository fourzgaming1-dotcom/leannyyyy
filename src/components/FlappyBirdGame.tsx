import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Sparkles,
  Zap,
  Volume2,
  VolumeX,
  Trophy,
  CheckCircle2,
  Coins,
  Crown,
  Flame,
  AlertTriangle,
  Play,
  RotateCcw,
  Check,
  Shield,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { api } from "../services/api";
import { UserWallet, FlappyStats } from "../types";

interface FlappyBirdGameProps {
  telegramId: number;
  wallet: UserWallet | null;
  onRewardWon: (amount: number, message: string, newWallet?: UserWallet) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  onOpenDeposit?: (amount?: number) => void;
  onRefreshWallet?: () => void;
  onNavigateToGroups?: () => void;
  onSwitchGame?: (game: "wheel" | "crossy" | "flappy") => void;
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomHeight: number;
  gapSize: number;
  passed: boolean;
  pipeNumber: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  vy: number;
}

export const FlappyBirdGame: React.FC<FlappyBirdGameProps> = ({
  telegramId,
  wallet,
  onRewardWon,
  triggerHaptic,
  onOpenDeposit,
  onRefreshWallet,
  onNavigateToGroups,
  onSwitchGame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Game lifecycle states
  const [gameState, setGameState] = useState<"idle" | "playing" | "rest_zone_1" | "rest_zone_2" | "crashed" | "cashed_out">("idle");
  const [currentRunId, setCurrentRunId] = useState<string>("");
  const [gapsPassed, setGapsPassed] = useState<number>(0);
  const [pendingPot, setPendingPot] = useState<number>(0.0);
  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [isCashingOut, setIsCashingOut] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Rest Zone / Victory modals
  const [showRestZone1Modal, setShowRestZone1Modal] = useState<boolean>(false);
  const [showRestZone2Modal, setShowRestZone2Modal] = useState<boolean>(false);
  const [ballerUnlockedUrl, setBallerUnlockedUrl] = useState<string | null>(null);

  // Persistent Stats
  const [stats, setStats] = useState<FlappyStats>({
    highScoreGaps: 0,
    totalEarnings: 0,
    totalRuns: 0,
    ballerUnlocked: false,
  });

  // Audio Context for synthetic arcade SFX
  const audioCtxRef = useRef<AudioContext | null>(null);
  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) audioCtxRef.current = new AudioCtx();
    }
    if (audioCtxRef.current && audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playSound = useCallback((type: "jump" | "coin" | "rest" | "crash" | "win") => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      if (type === "jump") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(750, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === "coin") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, now); // A5
        osc.frequency.setValueAtTime(1174.66, now + 0.06); // D6
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === "rest") {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, now + i * 0.08);
          gain.gain.setValueAtTime(0.15, now + i * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.35);
        });
      } else if (type === "crash") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(60, now + 0.28);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === "win") {
        [587.33, 739.99, 880, 1174.66, 1479.98].forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0.2, now + i * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.5);
        });
      }
    } catch {}
  }, [soundEnabled, getAudioContext]);

  // Load stats on mount
  const loadStats = useCallback(async () => {
    if (!telegramId) return;
    try {
      const res = await api.getFlappyBirdStats(telegramId);
      if (res && res.stats) {
        setStats(res.stats);
      }
    } catch (e) {
      console.warn("Failed to load flappy stats:", e);
    }
  }, [telegramId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Canvas Physics & Game Entities
  const birdRef = useRef<{
    x: number;
    y: number;
    vy: number;
    radius: number;
    angle: number;
    wingPhase: number;
  }>({
    x: 80,
    y: 220,
    vy: 0,
    radius: 15,
    angle: 0,
    wingPhase: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const animFrameIdRef = useRef<number | null>(null);
  const nextPipeNumberRef = useRef<number>(1);
  const lastPipeSpawnXRef = useRef<number>(400);

  // Background cloud offset
  const bgOffsetRef = useRef<number>(0);

  // Jump / Flap action
  const handleFlap = useCallback(() => {
    if (gameState !== "playing") return;
    birdRef.current.vy = -6.6;
    birdRef.current.angle = -0.45;
    playSound("jump");
    triggerHaptic("light");

    // Spawn tiny flap feather particles
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: birdRef.current.x - 12,
        y: birdRef.current.y + 6,
        vx: -1 - Math.random() * 2,
        vy: -1 + Math.random() * 2,
        alpha: 1,
        color: i % 2 === 0 ? "#f43f5e" : "#fbbf24",
        size: 2.5,
      });
    }
  }, [gameState, playSound, triggerHaptic]);

  // Start new flight run (£1.00 fee)
  const handleStartFlight = async () => {
    if (!telegramId) return;
    setErrorMessage(null);

    const balance = wallet ? wallet.balance : 0;
    if (balance < 1.0) {
      triggerHaptic("warning");
      setErrorMessage("Insufficient balance (£1.00 required). Please top up your wallet via Stripe.");
      return;
    }

    try {
      setIsStarting(true);
      triggerHaptic("medium");
      const res = await api.startFlappyBird(telegramId);

      if (res.wallet && onRewardWon) {
        onRewardWon(0, "VIP Flappy Bird Wager: -£1.00", res.wallet);
      }
      if (onRefreshWallet) onRefreshWallet();

      setCurrentRunId(res.runId);
      setGapsPassed(0);
      setPendingPot(0.0);
      setShowRestZone1Modal(false);
      setShowRestZone2Modal(false);

      // Reset entities
      birdRef.current = {
        x: 80,
        y: 200,
        vy: -2,
        radius: 15,
        angle: 0,
        wingPhase: 0,
      };

      pipesRef.current = [];
      particlesRef.current = [];
      floatingTextsRef.current = [];
      nextPipeNumberRef.current = 1;
      lastPipeSpawnXRef.current = 320;

      // Spawn initial 2 pipes
      spawnPipe(380, 1);
      spawnPipe(590, 2);
      nextPipeNumberRef.current = 3;

      setGameState("playing");
      triggerHaptic("success");
    } catch (err: any) {
      console.error("Failed to start Flappy Bird run:", err);
      setErrorMessage(err.message || "Failed to start flight");
      triggerHaptic("error");
    } finally {
      setIsStarting(false);
    }
  };

  // Helper to spawn a pipe
  const spawnPipe = (x: number, pipeNum: number) => {
    if (pipeNum > 20) return; // Maximum 20 pipes total (no pipes after gap 20)
    const gapSize = 135;
    const canvasHeight = 440;
    const minTop = 60;
    const maxTop = canvasHeight - gapSize - 60;
    const topHeight = Math.floor(minTop + Math.random() * (maxTop - minTop));
    const bottomHeight = canvasHeight - (topHeight + gapSize);

    pipesRef.current.push({
      x,
      topHeight,
      bottomHeight,
      gapSize,
      passed: false,
      pipeNumber: pipeNum,
    });
    lastPipeSpawnXRef.current = x;
  };

  // Handle cashout at Rest Zone 1 or 2
  const handleCashOut = async (explicitGaps?: number) => {
    if (!telegramId || !currentRunId) return;
    const finalGaps = explicitGaps || gapsPassed;
    if (finalGaps < 10) return;

    try {
      setIsCashingOut(true);
      triggerHaptic("heavy");
      const res = await api.cashoutFlappyBird(telegramId, finalGaps, currentRunId);

      triggerHaptic("success");
      playSound("win");
      setGameState("cashed_out");
      setShowRestZone1Modal(false);

      if (res.wallet && onRewardWon) {
        onRewardWon(res.amountCashedOut, `VIP Flappy Bird Cashout: +£${res.amountCashedOut.toFixed(2)}`, res.wallet);
      }
      if (res.ballerUnlocked && res.ballerInviteLink) {
        setBallerUnlockedUrl(res.ballerInviteLink);
      }
      if (onRefreshWallet) onRefreshWallet();
      loadStats();
    } catch (err: any) {
      console.error("Cashout error:", err);
      setErrorMessage(err.message || "Failed to cash out");
      triggerHaptic("error");
    } finally {
      setIsCashingOut(false);
    }
  };

  // Resume flight from Rest Zone 1
  const handleContinueFromRestZone1 = () => {
    setShowRestZone1Modal(false);
    setGameState("playing");
    triggerHaptic("medium");

    // Respawn pipes for 11 through 20 starting slightly ahead
    birdRef.current.y = 200;
    birdRef.current.vy = -3;
    pipesRef.current = [];
    nextPipeNumberRef.current = 11;
    spawnPipe(380, 11);
    spawnPipe(590, 12);
    nextPipeNumberRef.current = 13;
  };

  // Handle crash
  const handleCrash = useCallback(async () => {
    if (gameState !== "playing") return;
    setGameState("crashed");
    playSound("crash");
    triggerHaptic("heavy");

    // Burst crash particles
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x: birdRef.current.x,
        y: birdRef.current.y,
        vx: (Math.random() - 0.5) * 6,
        vy: (Math.random() - 0.5) * 6,
        alpha: 1,
        color: i % 2 === 0 ? "#f43f5e" : "#ef4444",
        size: 3 + Math.random() * 3,
      });
    }

    try {
      await api.crashFlappyBird(telegramId, gapsPassed, currentRunId);
      if (onRefreshWallet) onRefreshWallet();
      loadStats();
    } catch (e) {
      console.warn("Crash report error:", e);
    }
  }, [gameState, playSound, triggerHaptic, telegramId, gapsPassed, currentRunId, onRefreshWallet, loadStats]);

  // Main Canvas Render & Game Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isRunning = true;
    const canvasWidth = 380;
    const canvasHeight = 440;

    const gameLoop = () => {
      if (!isRunning) return;

      // 1. UPDATE LOGIC
      if (gameState === "playing") {
        const bird = birdRef.current;
        bird.vy += 0.35; // gravity
        bird.y += bird.vy;
        bird.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.vy * 0.08));
        bird.wingPhase = (bird.wingPhase + 0.25) % (Math.PI * 2);

        // Ceiling and Floor collision
        if (bird.y - bird.radius <= 0) {
          bird.y = bird.radius;
          bird.vy = 0;
        }
        if (bird.y + bird.radius >= canvasHeight - 20) {
          handleCrash();
        }

        // Scroll and update pipes
        const scrollSpeed = 2.4;
        bgOffsetRef.current = (bgOffsetRef.current + scrollSpeed * 0.4) % canvasWidth;

        // Check if we should spawn another pipe (up to 20)
        const lastPipe = pipesRef.current[pipesRef.current.length - 1];
        if (lastPipe && lastPipe.x < canvasWidth - 190 && nextPipeNumberRef.current <= 20) {
          // If we just passed 10 and haven't hit rest zone yet, don't spawn pipe 11 until after rest zone 1!
          if (nextPipeNumberRef.current === 11 && gapsPassed < 10) {
            // waiting for player to reach gap 10 rest zone
          } else {
            spawnPipe(canvasWidth + 20, nextPipeNumberRef.current);
            nextPipeNumberRef.current += 1;
          }
        }

        // Move pipes and check collision / gap clearing
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const pipe = pipesRef.current[i];
          pipe.x -= scrollSpeed;

          // Check if bird passed the gap
          if (!pipe.passed && pipe.x + 40 < bird.x) {
            pipe.passed = true;
            const newGapCount = pipe.pipeNumber;
            setGapsPassed(newGapCount);
            const newPot = Math.round(newGapCount * 0.10 * 100) / 100;
            setPendingPot(newPot);
            playSound("coin");
            triggerHaptic("medium");

            // Floating +10p popup text
            floatingTextsRef.current.push({
              x: bird.x + 10,
              y: bird.y - 15,
              text: "+10p",
              alpha: 1,
              color: "#fbbf24",
              vy: -1.2,
            });

            // Sparkle particles
            for (let p = 0; p < 8; p++) {
              particlesRef.current.push({
                x: pipe.x + 25,
                y: pipe.topHeight + pipe.gapSize / 2,
                vx: (Math.random() - 0.5) * 4,
                vy: (Math.random() - 0.5) * 4,
                alpha: 1,
                color: "#10b981",
                size: 2.5,
              });
            }

            // Sync with backend API
            api.flappyBirdGap(telegramId, newGapCount, currentRunId).catch(console.warn);

            // Check if Milestone 10 reached: Rest Zone 1!
            if (newGapCount === 10) {
              setGameState("rest_zone_1");
              setShowRestZone1Modal(true);
              playSound("rest");
              triggerHaptic("success");
            }

            // Check if Milestone 20 reached: Rest Zone 2 & Free Baller Group!
            if (newGapCount === 20) {
              setGameState("rest_zone_2");
              setShowRestZone2Modal(true);
              playSound("win");
              triggerHaptic("heavy");
              handleCashOut(20);
            }
          }

          // AABB Collision with pipe columns
          const pipeWidth = 48;
          const inHorizontalBounds = bird.x + bird.radius > pipe.x && bird.x - bird.radius < pipe.x + pipeWidth;
          if (inHorizontalBounds) {
            // Hit top pipe or bottom pipe?
            const hitTop = bird.y - bird.radius < pipe.topHeight;
            const hitBottom = bird.y + bird.radius > canvasHeight - pipe.bottomHeight;
            if (hitTop || hitBottom) {
              handleCrash();
            }
          }

          // Remove off-screen pipes
          if (pipe.x < -60) {
            pipesRef.current.splice(i, 1);
          }
        }
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.025;
        if (p.alpha <= 0) particlesRef.current.splice(i, 1);
      }

      // Update floating texts
      for (let i = floatingTextsRef.current.length - 1; i >= 0; i--) {
        const ft = floatingTextsRef.current[i];
        ft.y += ft.vy;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) floatingTextsRef.current.splice(i, 1);
      }

      // 2. RENDER GRAPHICS
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      // Deep Cosmic Night-Sky Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasHeight);
      if (gameState === "rest_zone_1") {
        bgGrad.addColorStop(0, "#2c1502");
        bgGrad.addColorStop(0.5, "#422104");
        bgGrad.addColorStop(1, "#180a00");
      } else if (gameState === "rest_zone_2") {
        bgGrad.addColorStop(0, "#012918");
        bgGrad.addColorStop(0.5, "#034026");
        bgGrad.addColorStop(1, "#00170d");
      } else {
        bgGrad.addColorStop(0, "#090116");
        bgGrad.addColorStop(0.6, "#150228");
        bgGrad.addColorStop(1, "#070010");
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Distant Stars / Nebula Glow
      ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
      for (let s = 0; s < 25; s++) {
        const sx = ((s * 37) - bgOffsetRef.current * 0.2 + canvasWidth * 2) % canvasWidth;
        const sy = (s * 23) % (canvasHeight - 40);
        ctx.fillRect(sx, sy, s % 3 === 0 ? 2 : 1, s % 3 === 0 ? 2 : 1);
      }

      // Render Pipes
      for (const pipe of pipesRef.current) {
        const pipeWidth = 48;
        const isHighlightGap = pipe.pipeNumber === 10 || pipe.pipeNumber === 20;

        // Top Pipe
        const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + pipeWidth, 0);
        if (isHighlightGap) {
          topGrad.addColorStop(0, "#78350f");
          topGrad.addColorStop(0.5, "#f59e0b");
          topGrad.addColorStop(1, "#b45309");
        } else {
          topGrad.addColorStop(0, "#3b0764");
          topGrad.addColorStop(0.5, "#a855f7");
          topGrad.addColorStop(1, "#581c87");
        }
        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);

        // Pipe rim/cap at the bottom of top pipe
        ctx.fillStyle = isHighlightGap ? "#fbbf24" : "#c084fc";
        ctx.fillRect(pipe.x - 3, pipe.topHeight - 14, pipeWidth + 6, 14);

        // Bottom Pipe
        const bottomY = canvasHeight - pipe.bottomHeight;
        const bottomGrad = ctx.createLinearGradient(pipe.x, bottomY, pipe.x + pipeWidth, bottomY);
        if (isHighlightGap) {
          bottomGrad.addColorStop(0, "#78350f");
          bottomGrad.addColorStop(0.5, "#f59e0b");
          bottomGrad.addColorStop(1, "#b45309");
        } else {
          bottomGrad.addColorStop(0, "#3b0764");
          bottomGrad.addColorStop(0.5, "#a855f7");
          bottomGrad.addColorStop(1, "#581c87");
        }
        ctx.fillStyle = bottomGrad;
        ctx.fillRect(pipe.x, bottomY, pipeWidth, pipe.bottomHeight);

        // Pipe rim/cap at the top of bottom pipe
        ctx.fillStyle = isHighlightGap ? "#fbbf24" : "#c084fc";
        ctx.fillRect(pipe.x - 3, bottomY, pipeWidth + 6, 14);

        // Pipe Label: Gap # and Flag
        ctx.font = "bold 10px monospace";
        ctx.fillStyle = isHighlightGap ? "#fef08a" : "#e9d5ff";
        ctx.textAlign = "center";
        ctx.fillText(`#${pipe.pipeNumber}`, pipe.x + pipeWidth / 2, pipe.topHeight - 20);

        if (isHighlightGap) {
          ctx.font = "bold 9px sans-serif";
          ctx.fillStyle = "#fbbf24";
          ctx.fillText(pipe.pipeNumber === 10 ? "🌿 REST 1" : "👑 BALLER", pipe.x + pipeWidth / 2, pipe.topHeight - 6);
        }
      }

      // Rest Zone Safe Cloud Platform
      if (gameState === "rest_zone_1" || gameState === "rest_zone_2") {
        ctx.save();
        const cloudX = birdRef.current.x - 40;
        const cloudY = birdRef.current.y + 18;
        ctx.fillStyle = gameState === "rest_zone_1" ? "rgba(251, 191, 36, 0.45)" : "rgba(16, 185, 129, 0.45)";
        ctx.shadowColor = gameState === "rest_zone_1" ? "#fbbf24" : "#10b981";
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.ellipse(cloudX + 40, cloudY, 50, 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Particles
      for (const p of particlesRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Cyber Bird
      const bird = birdRef.current;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.angle);

      // Glow behind bird
      ctx.shadowColor = "#f43f5e";
      ctx.shadowBlur = 12;

      // Body Gradient (Fuchsia to Gold)
      const birdGrad = ctx.createLinearGradient(-15, -15, 15, 15);
      birdGrad.addColorStop(0, "#fbbf24");
      birdGrad.addColorStop(0.5, "#f43f5e");
      birdGrad.addColorStop(1, "#9333ea");
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();

      // Wing (animated flapping)
      const wingY = Math.sin(bird.wingPhase) * 6;
      ctx.fillStyle = "#fed7aa";
      ctx.beginPath();
      ctx.ellipse(-4, wingY, 9, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(7, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#090116";
      ctx.beginPath();
      ctx.arc(8, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.moveTo(12, -2);
      ctx.lineTo(20, 2);
      ctx.lineTo(12, 6);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      // Floating Texts (+10p)
      for (const ft of floatingTextsRef.current) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, ft.alpha);
        ctx.font = "black 14px monospace";
        ctx.fillStyle = ft.color;
        ctx.shadowColor = ft.color;
        ctx.shadowBlur = 8;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      // Ground Bar
      const groundGrad = ctx.createLinearGradient(0, canvasHeight - 20, 0, canvasHeight);
      groundGrad.addColorStop(0, "#1f0636");
      groundGrad.addColorStop(1, "#080112");
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, canvasHeight - 20, canvasWidth, 20);
      ctx.fillStyle = "#ec4899";
      ctx.fillRect(0, canvasHeight - 20, canvasWidth, 2);

      // In-canvas Tap-to-Flap prompt when waiting
      if (gameState === "idle") {
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        ctx.font = "900 20px sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("VIP FLAPPY BIRD", canvasWidth / 2, 170);

        ctx.font = "bold 12px sans-serif";
        ctx.fillStyle = "#f43f5e";
        ctx.fillText("£1.00 Entry · +10p per Gap", canvasWidth / 2, 195);

        ctx.fillStyle = "#fbbf24";
        ctx.fillText("Gap 10 = Rest Zone 1 (Cashout £1.00)", canvasWidth / 2, 225);

        ctx.fillStyle = "#10b981";
        ctx.fillText("Gap 20 = Free Baller Pass + £2.00 Cash!", canvasWidth / 2, 245);
      }

      animFrameIdRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameIdRef.current = requestAnimationFrame(gameLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [gameState, gapsPassed, handleCrash, playSound, triggerHaptic, telegramId, currentRunId]);

  // Spacebar and touch listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        handleFlap();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleFlap]);

  const balance = wallet ? wallet.balance : 0;
  const canAfford = balance >= 1.0;

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      {/* VIP Arcade Header */}
      <div className="relative rounded-3xl p-4 overflow-hidden bg-gradient-to-r from-[#24032e] via-[#140124] to-[#1e021a] border-2 border-fuchsia-500/70 shadow-[0_0_35px_rgba(217,70,239,0.25)]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-950/90 border border-fuchsia-400/60 text-fuchsia-300 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-3 h-3 text-fuchsia-400 animate-spin" />
            <span>VIP ARCADE FLIGHT</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-1.5 rounded-lg bg-black/60 text-fuchsia-300 hover:text-white border border-fuchsia-500/30 cursor-pointer"
              title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
            </button>
            <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-black/70 px-2.5 py-1 rounded-xl border border-emerald-500/40">
              <span>Balance:</span>
              <span className="text-white font-black">£{balance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
              <span className="text-xl">🐦</span>
              <span className="bg-gradient-to-r from-fuchsia-300 via-rose-300 to-amber-300 bg-clip-text text-transparent">
                VIP Flappy Bird: +10p / Gap
              </span>
            </h2>
            <p className="text-xs text-fuchsia-200/90 mt-1 leading-snug">
              £1.00 per go · +10p added for each gap! <strong>Reach 10 gaps</strong> to hit Rest Zone 1 and choose to cash out £1.00 or risk it all. <strong>Reach 20 gaps</strong> to win £2.00 & <strong>FREE 💎 Baller Group Access (£10 Value)</strong>!
            </p>
          </div>
        </div>

        {/* Milestone Ladder Banner */}
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="p-2 rounded-xl bg-black/60 border border-fuchsia-500/30">
            <span className="text-[10px] text-fuchsia-300 block font-bold">Gaps 1 - 9</span>
            <span className="text-xs font-black text-white">+10p / Gap</span>
            <span className="text-[9px] text-rose-300/80 block mt-0.5">Crash = Lose All</span>
          </div>

          <div className="p-2 rounded-xl bg-amber-950/60 border border-amber-500/50">
            <span className="text-[10px] text-amber-300 block font-bold">🌿 Rest Zone 1</span>
            <span className="text-xs font-black text-yellow-300">10 Gaps = £1.00</span>
            <span className="text-[9px] text-amber-200/90 block mt-0.5">Cash Out or Risk</span>
          </div>

          <div className="p-2 rounded-xl bg-emerald-950/60 border border-emerald-500/50">
            <span className="text-[10px] text-emerald-300 block font-bold">👑 Rest Zone 2</span>
            <span className="text-xs font-black text-emerald-300">20 Gaps = £2.00</span>
            <span className="text-[9px] text-emerald-200/90 block mt-0.5">+ Free Baller Pass!</span>
          </div>
        </div>
      </div>

      {/* Quick Game Switcher (Wheel / Crossy / Flappy) */}
      {onSwitchGame && (
        <div className="p-1 rounded-2xl bg-[#0b0014]/90 border border-fuchsia-500/30 flex items-center gap-1 shadow-lg">
          <button
            onClick={() => onSwitchGame("flappy")}
            className="flex-1 py-2 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]"
          >
            <span>🐦 Flappy (£1)</span>
          </button>

          <button
            onClick={() => onSwitchGame("wheel")}
            className="flex-1 py-2 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer text-white/60 hover:text-white hover:bg-white/5"
          >
            <span>🎡 Wheel (£1)</span>
          </button>

          <button
            onClick={() => onSwitchGame("crossy")}
            className="flex-1 py-2 px-2 rounded-xl font-black text-xs flex items-center justify-center gap-1 transition-all cursor-pointer text-white/60 hover:text-white hover:bg-white/5"
          >
            <span>🚗 Crossy (£1)</span>
          </button>
        </div>
      )}

      {/* Main Flappy Bird Arena Card */}
      <div className="relative rounded-3xl p-4 overflow-hidden bg-[#0d011c] border-2 border-fuchsia-500/40 shadow-[0_0_40px_rgba(217,70,239,0.2)]">
        {/* Live HUD Bar */}
        <div className="flex items-center justify-between gap-2 mb-3 bg-black/70 p-2.5 rounded-2xl border border-fuchsia-500/30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-500 to-rose-500 flex items-center justify-center text-white font-black text-sm shadow">
              {gapsPassed}
            </div>
            <div>
              <span className="text-[10px] text-fuchsia-300 font-bold block uppercase tracking-wider">
                Gaps Cleared
              </span>
              <span className="text-xs font-black text-white font-mono">
                {gapsPassed} / 20 Gaps
              </span>
            </div>
          </div>

          {/* Current Pending Pot */}
          <div className="text-right">
            <span className="text-[10px] text-yellow-300 font-bold block uppercase tracking-wider">
              Pending Pot
            </span>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="text-xl font-black text-white font-mono text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]">
                £{pendingPot.toFixed(2)}
              </span>
              <span className="text-[10px] text-pink-300 font-bold">GBP</span>
            </div>
          </div>
        </div>

        {/* 20-Gap Progress Indicator Bar */}
        <div className="mb-3 space-y-1">
          <div className="flex items-center justify-between text-[10px] font-bold text-fuchsia-200/80">
            <span>Course Progress</span>
            <span>
              {gapsPassed < 10
                ? `${10 - gapsPassed} gaps to Rest Zone 1 (£1.00)`
                : gapsPassed < 20
                ? `${20 - gapsPassed} gaps to Free Baller Pass (£2.00)`
                : "Course Mastered! 👑"}
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/80 border border-fuchsia-500/30 overflow-hidden relative">
            {/* 10-gap rest zone tick */}
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-yellow-400 z-10" />
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 via-rose-500 to-emerald-400 transition-all duration-200"
              style={{ width: `${Math.min(100, (gapsPassed / 20) * 100)}%` }}
            />
          </div>
        </div>

        {/* Error Notice */}
        {errorMessage && (
          <div className="mb-3 p-3 rounded-2xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-between gap-2 text-xs text-rose-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes("balance") && onOpenDeposit && (
              <button
                onClick={() => onOpenDeposit(10)}
                className="py-1 px-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] whitespace-nowrap cursor-pointer"
              >
                Top Up
              </button>
            )}
          </div>
        )}

        {/* Interactive Canvas Box */}
        <div
          onClick={handleFlap}
          className="relative rounded-2xl overflow-hidden border border-fuchsia-500/30 cursor-pointer shadow-inner select-none touch-none"
          style={{ width: "100%", maxWidth: "380px", margin: "0 auto" }}
        >
          <canvas
            ref={canvasRef}
            width={380}
            height={440}
            className="w-full h-auto block"
          />

          {/* Tap overlay instructions while playing */}
          {gameState === "playing" && (
            <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-fuchsia-200 text-[11px] font-bold border border-fuchsia-500/30">
                <span>Tap Screen or Press Space to Flap</span>
              </span>
            </div>
          )}

          {/* Crashed Screen Overlay */}
          {gameState === "crashed" && (
            <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-rose-950 border border-rose-500 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.4)]">
                <AlertTriangle className="w-7 h-7 animate-bounce" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">CRASHED AT GAP {gapsPassed}!</h3>
                <p className="text-xs text-rose-200/90 mt-1 max-w-xs mx-auto leading-relaxed">
                  Your £1.00 wager and accumulated pot of £{pendingPot.toFixed(2)} were lost. The course resets!
                </p>
              </div>

              <div className="w-full max-w-xs p-3 rounded-2xl bg-[#140024] border border-fuchsia-500/30 text-xs flex items-center justify-between text-fuchsia-200">
                <span>Best Record:</span>
                <span className="font-mono font-black text-amber-300">{stats.highScoreGaps} Gaps</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartFlight();
                }}
                disabled={isStarting}
                className="w-full max-w-xs py-3.5 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 hover:from-fuchsia-400 hover:to-rose-400 text-white font-black text-sm shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Fly Again (£1.00)</span>
              </button>
            </div>
          )}

          {/* Cashed Out Screen Overlay */}
          {gameState === "cashed_out" && (
            <div className="absolute inset-0 z-20 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 animate-in fade-in duration-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-950 border border-emerald-500 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">CASHED OUT SUCCESSFULLY!</h3>
                <p className="text-xs text-emerald-200/90 mt-1 max-w-xs mx-auto leading-relaxed">
                  £{(gapsPassed >= 20 ? 2.00 : 1.00).toFixed(2)} was credited directly to your live wallet balance!
                </p>
              </div>

              {ballerUnlockedUrl && (
                <a
                  href={ballerUnlockedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-xs py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-extrabold text-xs shadow-[0_0_15px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5"
                >
                  <Crown className="w-4 h-4 text-yellow-300" />
                  <span>Join Baller VIP Group ↗</span>
                </a>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartFlight();
                }}
                className="w-full max-w-xs py-3 px-5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 hover:from-fuchsia-400 hover:to-rose-400 text-white font-black text-sm shadow-[0_0_20px_rgba(217,70,239,0.5)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                <span>Start Next Run (£1.00)</span>
              </button>
            </div>
          )}
        </div>

        {/* Start Game Action Button when idle */}
        {gameState === "idle" && (
          <div className="mt-3">
            <button
              onClick={handleStartFlight}
              disabled={isStarting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-rose-500 to-amber-500 hover:from-fuchsia-400 hover:via-rose-400 hover:to-amber-400 text-white font-black text-base shadow-[0_0_30px_rgba(217,70,239,0.5)] active:scale-98 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Flight (£1.00 Wager)</span>
            </button>
          </div>
        )}

        {/* Flight Controls Bar when Playing */}
        {gameState === "playing" && (
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={handleFlap}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-rose-500 active:scale-95 text-white font-black text-sm shadow-[0_0_20px_rgba(217,70,239,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>FLAP / JUMP 🚀</span>
            </button>
          </div>
        )}
      </div>

      {/* REST ZONE 1 DECISION MODAL (Gap 10 Reached) */}
      {showRestZone1Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#170802] border-2 border-amber-400 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_50px_rgba(251,191,36,0.4)] relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-950 border border-amber-400 flex items-center justify-center text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
              <span className="text-3xl">🌿</span>
            </div>

            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                Rest Zone 1 Reached!
              </span>
              <h3 className="text-xl font-black text-white mt-1.5">
                10 GAPS CLEARED
              </h3>
              <p className="text-xs text-amber-200/90 mt-1">
                You have reached the safe sanctuary! Your pot is currently at <strong>£1.00 GBP</strong> (your original stake is recovered).
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/60 border border-amber-400/40 text-xs space-y-1">
              <div className="flex justify-between text-amber-200">
                <span>Safe Cashout Option:</span>
                <span className="font-bold text-emerald-400">£1.00 (Zero Risk)</span>
              </div>
              <div className="flex justify-between text-amber-200">
                <span>Risk & Continue:</span>
                <span className="font-bold text-yellow-300">Aim for £2.00 & Free Baller Pass</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {/* Option 1: Cashout £1.00 */}
              <button
                onClick={() => handleCashOut(10)}
                disabled={isCashingOut}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-extrabold text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Coins className="w-4 h-4" />
                <span>💰 Safe Cash Out: Take £1.00</span>
              </button>

              {/* Option 2: Continue Flying */}
              <button
                onClick={handleContinueFromRestZone1}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black font-black text-sm shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🚀 Risk It & Continue (Gaps 11 - 20)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REST ZONE 2 VICTORY MODAL (Gap 20 Cleared - Course Mastered) */}
      {showRestZone2Modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-[#041a12] border-2 border-emerald-400 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_60px_rgba(16,185,129,0.5)] relative">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950 border border-emerald-400 flex items-center justify-center text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
              <Crown className="w-8 h-8 text-yellow-300 animate-bounce" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-yellow-400 to-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                👑 COURSE COMPLETED!
              </span>
              <h3 className="text-xl font-black text-white mt-2">
                20 GAPS CLEARED · REST ZONE 2
              </h3>
              <p className="text-xs text-emerald-200/90 mt-1">
                You conquered the entire course! You earned <strong>£2.00 Cash</strong> and unlocked <strong>FREE ACCESS TO THE BALLER VIP GROUP</strong>!
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/70 border border-emerald-400/50 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-bold">Cash Earnings:</span>
                <span className="font-mono font-black text-white text-base">£2.00 GBP</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-300 font-bold">Group Reward:</span>
                <span className="font-bold text-yellow-300">💎 Baller VIP Group (£10 Value)</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {ballerUnlockedUrl && (
                <a
                  href={ballerUnlockedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black font-black text-sm shadow-[0_0_25px_rgba(250,204,21,0.6)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Join Baller VIP Group Now ↗</span>
                </a>
              )}

              <button
                onClick={() => {
                  setShowRestZone2Modal(false);
                  setGameState("idle");
                }}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-200 font-bold text-xs cursor-pointer"
              >
                Close & Return to Arena
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary Card */}
      <div className="p-3.5 rounded-2xl bg-[#090014]/80 border border-fuchsia-500/30 flex items-center justify-between text-xs text-fuchsia-200">
        <div>
          <span className="text-[10px] text-fuchsia-400/80 font-bold block uppercase">High Score</span>
          <span className="font-black text-white text-sm">{stats.highScoreGaps} Gaps</span>
        </div>
        <div className="text-center">
          <span className="text-[10px] text-fuchsia-400/80 font-bold block uppercase">Total Won</span>
          <span className="font-black text-emerald-400 text-sm">£{stats.totalEarnings.toFixed(2)}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-fuchsia-400/80 font-bold block uppercase">Baller Pass</span>
          <span className={`font-black text-sm ${stats.ballerUnlocked ? "text-yellow-300" : "text-fuchsia-400/60"}`}>
            {stats.ballerUnlocked ? "👑 UNLOCKED" : "🔒 20 Gaps"}
          </span>
        </div>
      </div>
    </div>
  );
};
