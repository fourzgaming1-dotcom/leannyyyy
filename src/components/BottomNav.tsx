import React from "react";
import { Home, Layers, Sparkles, Wallet, Music2 } from "lucide-react";
import { NavTab } from "../types";

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  balance: number;
  spinsLeft?: number;
  isMusicPlaying?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  triggerHaptic,
  balance,
  spinsLeft = 3,
  isMusicPlaying = false,
}) => {
  const tabs = [
    {
      id: "home" as NavTab,
      label: "Home",
      icon: Home,
    },
    {
      id: "groups" as NavTab,
      label: "VIP Groups",
      icon: Layers,
    },
    {
      id: "music" as NavTab,
      label: "Music",
      icon: Music2,
      badge: isMusicPlaying ? "LIVE" : undefined,
      highlight: isMusicPlaying,
    },
    {
      id: "game" as NavTab,
      label: "Games",
      icon: Sparkles,
      badge: "WIN",
    },
    {
      id: "wallet" as NavTab,
      label: "Wallet",
      icon: Wallet,
      badge: balance > 0 ? `£${Math.floor(balance)}` : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#080012]/95 backdrop-blur-2xl border-t border-pink-500/25 py-2 px-3 shadow-[0_-8px_30px_rgba(0,0,0,0.8)] max-w-md mx-auto">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                triggerHaptic("light");
                onSelectTab(tab.id);
              }}
              className={`relative flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "text-pink-400 scale-105"
                  : "text-pink-200/50 hover:text-pink-200 hover:scale-100"
              }`}
            >
              {/* Highlight Glow for active tab */}
              {isActive && (
                <div className="absolute -top-1 w-8 h-1 rounded-full bg-pink-500 shadow-[0_0_12px_#ec4899]" />
              )}

              {/* Icon Container with Badge */}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform ${
                    isActive ? "stroke-[2.5px] drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "stroke-2"
                  } ${tab.highlight && !isActive ? "text-yellow-400 animate-pulse" : ""}`}
                />

                {tab.badge && (
                  <span
                    className={`absolute -top-1.5 -right-3 text-[8px] font-black px-1.5 py-0.2 rounded-full leading-tight uppercase tracking-tighter ${
                      tab.highlight
                        ? "bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.6)] font-extrabold"
                        : "bg-pink-600 text-white"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Text label */}
              <span
                className={`text-[10px] mt-1 font-bold tracking-tight transition-all ${
                  isActive ? "text-pink-300 font-extrabold" : "text-pink-200/60"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
