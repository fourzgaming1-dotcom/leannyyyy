import React, { useMemo } from "react";

export const NightSky: React.FC = () => {
  // Generate deterministic stars
  const stars = useMemo(() => {
    const starList = [];
    const count = 75;
    for (let i = 0; i < count; i++) {
      const top = Math.sin(i * 997.3) * 50 + 50; // 0 to 100%
      const left = Math.cos(i * 353.7) * 50 + 50; // 0 to 100%
      const size = (i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1.2);
      const delay = (i * 0.23) % 4;
      const duration = 2 + ((i * 0.41) % 3);
      const isPinkStar = i % 4 === 0;
      starList.push({
        id: i,
        top: `${top.toFixed(2)}%`,
        left: `${left.toFixed(2)}%`,
        size,
        delay: `${delay.toFixed(1)}s`,
        duration: `${duration.toFixed(1)}s`,
        color: isPinkStar ? "#ff69b4" : "#ffffff",
        glow: isPinkStar ? "rgba(255, 105, 180, 0.8)" : "rgba(255, 255, 255, 0.7)",
      });
    }
    return starList;
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#040108]">
      {/* Deep Obsidian-to-Night sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#020005] via-[#080112] to-[#040008]" />

      {/* Floating Pink & Magenta Cosmic Nebula Clouds */}
      <div
        className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-gradient-to-tr from-pink-600/25 via-fuchsia-700/15 to-transparent blur-[90px] animate-float-nebula"
        style={{ animationDuration: "16s" }}
      />
      <div
        className="absolute top-1/4 -right-28 w-[420px] h-[420px] rounded-full bg-gradient-to-bl from-pink-500/20 via-rose-600/15 to-transparent blur-[110px] animate-float-nebula"
        style={{ animationDuration: "20s", animationDelay: "-6s" }}
      />
      <div
        className="absolute bottom-10 left-1/3 w-[360px] h-[360px] rounded-full bg-gradient-to-t from-fuchsia-950/40 via-pink-900/15 to-transparent blur-[100px] animate-float-nebula"
        style={{ animationDuration: "14s", animationDelay: "-3s" }}
      />

      {/* Celestial Crescent Moon with Soft Pink Halo in the Night Sky */}
      <div className="absolute top-6 right-8 opacity-75">
        <div className="relative w-14 h-14">
          {/* Moon glow aura */}
          <div className="absolute inset-0 bg-pink-500/25 rounded-full blur-xl animate-pulse-glow" />
          {/* SVG Crescent Moon */}
          <svg
            viewBox="0 0 24 24"
            className="w-12 h-12 text-pink-200/90 drop-shadow-[0_0_12px_rgba(255,105,180,0.6)]"
            fill="currentColor"
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          {/* Subtle star near moon */}
          <div className="absolute -left-2 top-2 w-1.5 h-1.5 bg-pink-300 rounded-full animate-twinkle-fast shadow-[0_0_6px_#ff69b4]" />
        </div>
      </div>

      {/* Constellation lines / cosmic dust overlay */}
      <svg className="absolute inset-0 w-full h-full opacity-20 stroke-pink-400/40">
        <line x1="12%" y1="18%" x2="26%" y2="24%" strokeWidth="0.75" strokeDasharray="3 3" />
        <line x1="26%" y1="24%" x2="34%" y2="12%" strokeWidth="0.75" strokeDasharray="3 3" />
        <line x1="34%" y1="12%" x2="48%" y2="20%" strokeWidth="0.75" strokeDasharray="3 3" />

        <line x1="68%" y1="35%" x2="80%" y2="42%" strokeWidth="0.75" strokeDasharray="3 3" />
        <line x1="80%" y1="42%" x2="92%" y2="30%" strokeWidth="0.75" strokeDasharray="3 3" />

        {/* Constellation nodes */}
        <circle cx="12%" cy="18%" r="2" fill="#ff69b4" />
        <circle cx="26%" cy="24%" r="2.5" fill="#f43f5e" />
        <circle cx="34%" cy="12%" r="2" fill="#ffffff" />
        <circle cx="48%" cy="20%" r="2.5" fill="#ff2e93" />
        <circle cx="68%" cy="35%" r="2" fill="#ff69b4" />
        <circle cx="80%" cy="42%" r="2.5" fill="#f472b6" />
        <circle cx="92%" cy="30%" r="2" fill="#ffffff" />
      </svg>

      {/* Twinkling Celestial Stars */}
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            backgroundColor: s.color,
            boxShadow: `0 0 ${s.size * 3}px ${s.glow}`,
            animation: `twinkle ${s.duration} ease-in-out infinite`,
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* Faint Shooting Star in Night Sky */}
      <div className="absolute top-16 left-1/4 w-32 h-[1px] bg-gradient-to-r from-transparent via-pink-400 to-white -rotate-25 opacity-40 blur-[0.5px]" />
    </div>
  );
};
