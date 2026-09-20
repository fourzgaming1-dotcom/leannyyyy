import React, { useState } from "react";
import { TelegramUser, ServerConfig } from "../types";
import { DEMO_USERS } from "../hooks/useTelegram";
import { User, Radio, BookOpen, ChevronDown, Check, Sparkles } from "lucide-react";

interface HeaderProps {
  user: TelegramUser;
  isTelegram: boolean;
  sseConnected: boolean;
  config: ServerConfig | null;
  onSwitchUser: (user: TelegramUser) => void;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  isTelegram,
  sseConnected,
  config,
  onSwitchUser,
  onOpenGuide,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Avatar initials
  const initials = (user.first_name?.[0] || "T") + (user.last_name?.[0] || "");

  return (
    <header className="w-full bg-[#05010a]/85 backdrop-blur-xl border-b border-pink-500/20 sticky top-0 z-30 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* User Identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex-shrink-0">
            {user.photo_url ? (
              <img
                src={user.photo_url}
                alt={user.first_name}
                className="w-10 h-10 rounded-full border-2 border-pink-500/50 shadow-[0_0_10px_rgba(255,46,147,0.4)] object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-600 via-rose-600 to-fuchsia-700 flex items-center justify-center font-extrabold text-sm text-white shadow-[0_0_12px_rgba(255,46,147,0.35)]">
                {initials}
              </div>
            )}
            {/* Online / SSE Live Pulse */}
            <span
              title={sseConnected ? "Real-time SSE push connected" : "Connecting to balance sync..."}
              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-black ${
                sseConnected ? "bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse" : "bg-pink-400"
              }`}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-pink-50 text-sm truncate leading-tight">
                {user.first_name} {user.last_name || ""}
              </span>
              {user.is_premium && (
                <span title="Telegram Premium User" className="text-pink-400 text-xs drop-shadow-[0_0_4px_#ff69b4]">
                  ★
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-pink-300/70">
              <span className="text-pink-400 font-mono text-[11px]">
                {user.username ? `@${user.username}` : `ID: ${user.id}`}
              </span>
              <span className="text-pink-900">•</span>
              <span className="flex items-center gap-1 text-[11px]">
                <Radio className={`w-2.5 h-2.5 ${sseConnected ? "text-emerald-400" : "text-pink-400"}`} />
                {sseConnected ? "Instant Sync" : "Syncing"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* User selector for desktop preview / testing */}
          {!isTelegram && (
            <div className="relative">
              <button
                id="header-user-switcher"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-black/70 hover:bg-pink-950/60 border border-pink-500/30 text-xs text-pink-200 font-medium transition-colors cursor-pointer"
                title="Switch test Telegram account"
              >
                <User className="w-3.5 h-3.5 text-pink-400" />
                <span className="hidden sm:inline">Account</span>
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

          {/* Bot & Render Deployment Guide */}
          <button
            id="header-bot-guide-btn"
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-pink-950/50 hover:bg-pink-900/60 border border-pink-500/40 text-pink-200 text-xs font-semibold shadow-[0_0_10px_rgba(255,46,147,0.15)] transition-colors cursor-pointer"
            title="Bot & Render Deployment Setup"
          >
            <BookOpen className="w-3.5 h-3.5 text-pink-400" />
            <span className="hidden xs:inline">Bot & Render</span>
          </button>
        </div>
      </div>
    </header>
  );
};
