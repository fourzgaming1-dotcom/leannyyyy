import React, { useState, useEffect, useRef } from "react";
import { DeezerTrack } from "../types";
import { api } from "../services/api";
import {
  Search,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  VolumeX,
  Repeat,
  Repeat1,
  Music2,
  ExternalLink,
  Flame,
  Radio,
  Sparkles,
  Loader2,
  ListMusic,
  Check,
} from "lucide-react";

interface MusicSectionProps {
  currentTrack: DeezerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isMuted: boolean;
  isLooping: boolean;
  volume: number;
  playlist: DeezerTrack[];
  onSelectTrack: (track: DeezerTrack, playlistContext?: DeezerTrack[]) => void;
  onTogglePlay: () => void;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onToggleMute: () => void;
  onToggleLoop: () => void;
  onSeek: (seconds: number) => void;
  onChangeVolume: (vol: number) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
}

const QUICK_TAGS = [
  "Trending Hits",
  "Central Cee",
  "Drake",
  "Travis Scott",
  "The Weeknd",
  "UK Drill",
  "Afrobeats",
  "R&B",
];

export const MusicSection: React.FC<MusicSectionProps> = ({
  currentTrack,
  isPlaying,
  currentTime,
  duration,
  isMuted,
  isLooping,
  volume,
  playlist,
  onSelectTrack,
  onTogglePlay,
  onPrevTrack,
  onNextTrack,
  onToggleMute,
  onToggleLoop,
  onSeek,
  onChangeVolume,
  triggerHaptic,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DeezerTrack[]>([]);
  const [chartTracks, setChartTracks] = useState<DeezerTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string>("Trending Hits");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load top chart tracks on mount
  useEffect(() => {
    setIsChartLoading(true);
    api
      .getTopMusicCharts()
      .then((res) => {
        if (res && res.data && res.data.length > 0) {
          setChartTracks(res.data);
          // If no track is currently playing, set initial playlist context to chart
          if (!currentTrack) {
            onSelectTrack(res.data[0], res.data);
          }
        }
      })
      .catch((err) => console.error("Failed to load charts:", err))
      .finally(() => setIsChartLoading(false));
  }, []);

  // Handle Search Input with debounce
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    if (!text.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.searchMusic(text.trim());
        if (res && res.data) {
          setSearchResults(res.data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 350);
  };

  const handleTagClick = (tag: string) => {
    triggerHaptic("light");
    setSelectedTag(tag);
    if (tag === "Trending Hits") {
      setSearchQuery("");
      setSearchResults([]);
    } else {
      setSearchQuery(tag);
      setIsLoading(true);
      api
        .searchMusic(tag)
        .then((res) => {
          if (res && res.data) {
            setSearchResults(res.data);
          }
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const displayedTracks = searchQuery.trim() ? searchResults : chartTracks;
  const albumCover = currentTrack?.album?.cover_big || currentTrack?.album?.cover_medium || currentTrack?.artist?.picture_medium;

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="relative rounded-3xl p-5 overflow-hidden bg-gradient-to-br from-[#1d0636] via-[#120224] to-[#080014] border border-pink-500/30 shadow-[0_0_35px_rgba(236,72,153,0.25)]">
        <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-pink-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_12px_rgba(236,72,153,0.5)]">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                <span>VIP Music Lounge</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/40 text-pink-300 font-extrabold uppercase tracking-wider">
                  DEEZER STREAM
                </span>
              </h2>
              <p className="text-xs text-pink-300/70 font-medium">
                Search any song & listen continuously while browsing groups
              </p>
            </div>
          </div>

          {isPlaying && (
            <div className="flex items-center gap-1 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-full text-emerald-300 text-[10px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Playing Now</span>
            </div>
          )}
        </div>

        {/* Search Input Bar */}
        <div className="relative z-10 mt-3">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 w-4 h-4 text-pink-400/80 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by song title, artist, or album..."
              className="w-full pl-10 pr-10 py-3 rounded-2xl bg-black/60 border border-pink-500/30 text-white placeholder-pink-300/50 text-xs sm:text-sm font-medium focus:outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-500/30 transition-all shadow-inner"
            />
            {isLoading ? (
              <Loader2 className="absolute right-3.5 w-4 h-4 text-pink-400 animate-spin" />
            ) : searchQuery ? (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSearchResults([]);
                }}
                className="absolute right-3.5 text-xs text-pink-300/70 hover:text-white"
              >
                Clear
              </button>
            ) : null}
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="relative z-10 flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3">
          {QUICK_TAGS.map((tag) => {
            const isSelected = selectedTag === tag && (tag === "Trending Hits" ? !searchQuery : searchQuery === tag);
            return (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  isSelected
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-[0_0_12px_rgba(236,72,153,0.4)]"
                    : "bg-black/50 text-pink-300/70 hover:text-white hover:bg-pink-950/40 border border-pink-500/20"
                }`}
              >
                {tag === "Trending Hits" && <Flame className="w-3 h-3 text-amber-400" />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Hero Now Playing Player Card */}
      {currentTrack && (
        <div className="relative rounded-3xl p-5 overflow-hidden bg-gradient-to-b from-[#140224] via-[#0d0117] to-[#08000f] border-2 border-pink-500/50 shadow-[0_0_40px_rgba(236,72,153,0.35)] space-y-4">
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Spinning Vinyl Album Artwork */}
            <div className="relative flex-shrink-0">
              <div
                className={`w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.5)] relative ${
                  isPlaying ? "animate-spin-slow" : ""
                }`}
              >
                {albumCover ? (
                  <img
                    src={albumCover}
                    alt={currentTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-900 to-purple-950 flex items-center justify-center text-pink-300">
                    <Music2 className="w-12 h-12" />
                  </div>
                )}
                {/* Center vinyl spindle hole */}
                <div className="absolute inset-0 m-auto w-7 h-7 rounded-full bg-black/80 border-2 border-pink-400 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-pink-400 shadow-[0_0_6px_#f472b6]" />
                </div>
              </div>

              {/* Real-time playing pulse indicator */}
              {isPlaying && (
                <div className="absolute -top-1.5 -right-1.5 flex items-center justify-center">
                  <span className="w-4 h-4 rounded-full bg-pink-500 animate-ping absolute" />
                  <span className="w-3 h-3 rounded-full bg-pink-400 relative border border-white" />
                </div>
              )}
            </div>

            {/* Song Meta & Audio Wave Visualizer */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5 w-full">
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-pink-500/20 text-pink-300 border border-pink-500/30">
                  NOW PLAYING
                </span>
                {currentTrack.album?.title && (
                  <span className="text-[11px] text-pink-400/80 font-medium truncate max-w-[200px]">
                    {currentTrack.album.title}
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate drop-shadow-md">
                {currentTrack.title}
              </h3>
              <p className="text-sm font-semibold text-pink-300/80 truncate">
                {currentTrack.artist?.name || "Unknown Artist"}
              </p>

              {/* Animated audio wave bars simulation */}
              <div className="flex items-center justify-center sm:justify-start gap-1 py-1 h-5">
                {[40, 75, 100, 60, 90, 45, 80, 65, 95, 50, 85, 30].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1 rounded-full bg-gradient-to-t from-pink-500 to-purple-400 transition-all duration-200 ${
                      isPlaying ? "animate-pulse" : "opacity-40"
                    }`}
                    style={{
                      height: isPlaying ? `${Math.max(20, (h * (currentTime % 2 === 0 ? 0.9 : 1.2)) % 100)}%` : "20%",
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scrub Timeline Slider */}
          <div className="space-y-1 pt-1">
            <div className="relative group">
              <input
                type="range"
                min={0}
                max={duration || 30}
                value={currentTime}
                onChange={(e) => onSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-pink-950/80 rounded-lg appearance-none cursor-pointer accent-pink-500 hover:accent-pink-400 focus:outline-none"
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-pink-300/70 font-semibold px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration || 30)}</span>
            </div>
          </div>

          {/* Playback Controls Hub */}
          <div className="flex items-center justify-between gap-3 pt-1">
            {/* Loop / Repeat button */}
            <button
              onClick={() => {
                triggerHaptic("light");
                onToggleLoop();
              }}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isLooping
                  ? "bg-pink-500/20 border-pink-400 text-pink-300 shadow-[0_0_12px_rgba(236,72,153,0.3)]"
                  : "bg-black/40 border-pink-500/20 text-pink-300/50 hover:text-white"
              }`}
              title={isLooping ? "Loop On" : "Loop Off"}
            >
              {isLooping ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
            </button>

            {/* Main playback control group: Prev / Play / Next */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  triggerHaptic("medium");
                  onPrevTrack();
                }}
                className="p-2.5 rounded-full bg-black/60 hover:bg-pink-950/60 text-white border border-pink-500/30 active:scale-90 transition-all cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  triggerHaptic("medium");
                  onTogglePlay();
                }}
                className="w-14 h-14 rounded-full bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white flex items-center justify-center shadow-[0_0_25px_rgba(236,72,153,0.6)] active:scale-95 transition-all cursor-pointer"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current ml-1" />
                )}
              </button>

              <button
                onClick={() => {
                  triggerHaptic("medium");
                  onNextTrack();
                }}
                className="p-2.5 rounded-full bg-black/60 hover:bg-pink-950/60 text-white border border-pink-500/30 active:scale-90 transition-all cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Volume / Mute Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  triggerHaptic("light");
                  onToggleMute();
                }}
                className="p-2.5 rounded-xl bg-black/40 border border-pink-500/20 text-pink-300/70 hover:text-white transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Track List Section (Search Results or Charts) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-pink-400" />
            <h4 className="text-xs font-black text-white uppercase tracking-wider">
              {searchQuery.trim() ? `Search Results (${displayedTracks.length})` : "Top Trending Songs on Deezer"}
            </h4>
          </div>
          <span className="text-[11px] text-pink-400/80 font-medium">
            Tap any song to play instantly
          </span>
        </div>

        {isChartLoading && displayedTracks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-black/40 border border-pink-500/20">
            <Loader2 className="w-6 h-6 text-pink-400 animate-spin mx-auto mb-2" />
            <p className="text-xs text-pink-300/70">Loading music charts...</p>
          </div>
        ) : displayedTracks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-black/40 border border-pink-500/20 space-y-2">
            <Music2 className="w-8 h-8 text-pink-400/40 mx-auto" />
            <p className="text-sm font-bold text-white">No tracks found</p>
            <p className="text-xs text-pink-300/60">
              Try searching for another song title, artist, or genre above
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedTracks.map((track) => {
              const isThisTrackPlaying = currentTrack?.id === track.id && isPlaying;
              const isThisTrackSelected = currentTrack?.id === track.id;
              const coverImg = track.album?.cover_medium || track.album?.cover_small || track.artist?.picture_medium;

              return (
                <div
                  key={track.id}
                  onClick={() => {
                    triggerHaptic("medium");
                    if (isThisTrackSelected) {
                      onTogglePlay();
                    } else {
                      onSelectTrack(track, displayedTracks);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isThisTrackSelected
                      ? "bg-gradient-to-r from-pink-950/80 via-purple-950/60 to-black/80 border-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                      : "bg-[#0b0114]/80 hover:bg-pink-950/30 border-pink-500/20 hover:border-pink-500/40"
                  }`}
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 border border-pink-500/30 group-hover:scale-105 transition-transform">
                      {coverImg ? (
                        <img
                          src={coverImg}
                          alt={track.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-pink-950 flex items-center justify-center text-pink-300">
                          <Music2 className="w-5 h-5" />
                        </div>
                      )}
                      {/* Play overlay on hover or active */}
                      <div
                        className={`absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity ${
                          isThisTrackSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        }`}
                      >
                        {isThisTrackPlaying ? (
                          <Pause className="w-4 h-4 text-pink-300 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 text-pink-300 fill-current ml-0.5" />
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-black truncate leading-tight ${
                            isThisTrackSelected ? "text-pink-300" : "text-white group-hover:text-pink-200"
                          }`}
                        >
                          {track.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-pink-300/70 font-medium truncate mt-0.5">
                        {track.artist?.name || "Artist"}
                        {track.album?.title && ` · ${track.album.title}`}
                      </p>
                    </div>
                  </div>

                  {/* Right: Controls & Duration */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-mono text-pink-300/60 font-medium">
                      {formatTime(track.duration || 30)}
                    </span>

                    {/* Play/Pause Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        triggerHaptic("medium");
                        if (isThisTrackSelected) {
                          onTogglePlay();
                        } else {
                          onSelectTrack(track, displayedTracks);
                        }
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                        isThisTrackSelected
                          ? "bg-pink-500 text-white shadow-[0_0_12px_rgba(236,72,153,0.6)]"
                          : "bg-black/60 group-hover:bg-pink-500 text-pink-300 group-hover:text-white border border-pink-500/30"
                      }`}
                    >
                      {isThisTrackPlaying ? (
                        <Pause className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
