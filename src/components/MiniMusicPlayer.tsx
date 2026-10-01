import React from "react";
import { DeezerTrack } from "../types";
import { Play, Pause, SkipForward, Music2, X, Volume2, VolumeX } from "lucide-react";

interface MiniMusicPlayerProps {
  currentTrack: DeezerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  onTogglePlay: () => void;
  onNextTrack: () => void;
  onToggleMute: () => void;
  onOpenMusicTab: () => void;
  onClosePlayer: () => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
}

export const MiniMusicPlayer: React.FC<MiniMusicPlayerProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  onTogglePlay,
  onNextTrack,
  onToggleMute,
  onOpenMusicTab,
  onClosePlayer,
  triggerHaptic,
}) => {
  if (!currentTrack) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const albumCover = currentTrack.album?.cover_medium || currentTrack.album?.cover_small || currentTrack.artist?.picture_medium;

  return (
    <div className="fixed bottom-[64px] left-0 right-0 z-30 max-w-md mx-auto px-3 pointer-events-auto transition-all duration-300 animate-in slide-in-from-bottom-3">
      <div
        onClick={onOpenMusicTab}
        className="relative overflow-hidden rounded-2xl bg-[#0d021a]/95 backdrop-blur-xl border border-pink-500/40 p-2 shadow-[0_8px_30px_rgba(236,72,153,0.35)] cursor-pointer group hover:border-pink-400 transition-all flex items-center justify-between gap-3"
      >
        {/* Subtle animated gradient glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Real-time progress bar along the very top of the mini player */}
        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-pink-950/80">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-fuchsia-400 to-purple-400 transition-all duration-150"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Left: Album cover with rotating vinyl effect when playing */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            {albumCover ? (
              <img
                src={albumCover}
                alt={currentTrack.title}
                className={`w-10 h-10 rounded-xl object-cover border border-pink-500/40 shadow-[0_0_10px_rgba(236,72,153,0.3)] ${
                  isPlaying ? "animate-spin-slow" : ""
                }`}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-pink-950/80 border border-pink-500/40 flex items-center justify-center text-pink-300">
                <Music2 className="w-5 h-5" />
              </div>
            )}
            {isPlaying && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            )}
          </div>

          {/* Track and Artist Text */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-white truncate group-hover:text-pink-300 transition-colors">
                {currentTrack.title}
              </span>
            </div>
            <p className="text-[11px] text-pink-300/70 truncate font-medium">
              {currentTrack.artist?.name || "Unknown Artist"}
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {/* Mute button */}
          <button
            onClick={() => {
              triggerHaptic("light");
              onToggleMute();
            }}
            className="p-1.5 text-pink-300/70 hover:text-pink-200 transition-colors cursor-pointer"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Play/Pause Button */}
          <button
            onClick={() => {
              triggerHaptic("medium");
              onTogglePlay();
            }}
            className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white flex items-center justify-center shadow-[0_0_12px_rgba(236,72,153,0.5)] active:scale-90 transition-all cursor-pointer"
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            )}
          </button>

          {/* Skip Next */}
          <button
            onClick={() => {
              triggerHaptic("light");
              onNextTrack();
            }}
            className="p-1.5 text-pink-300/70 hover:text-pink-200 transition-colors cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          {/* Close mini player */}
          <button
            onClick={() => {
              triggerHaptic("light");
              onClosePlayer();
            }}
            className="p-1.5 text-pink-300/50 hover:text-pink-200 transition-colors cursor-pointer"
            title="Close Player"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
