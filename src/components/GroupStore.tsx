import React, { useState } from "react";
import { GroupItem, UserWallet } from "../types";
import { api } from "../services/api";
import {
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Copy,
  Zap,
  CreditCard,
  AlertCircle,
  Loader2,
  Crown,
  Search,
  ShieldCheck,
  ArrowRight,
  Flame,
} from "lucide-react";
import { getGroupTheme } from "../utils/groupThemes";

interface GroupStoreProps {
  groups: GroupItem[];
  wallet: UserWallet | null;
  telegramId: number;
  onRefresh: () => void;
  onOpenDeposit: () => void;
  openUrl: (url: string) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  mode?: "all" | "bundles_only" | "groups_only";
}

export const GroupStore: React.FC<GroupStoreProps> = ({
  groups,
  wallet,
  telegramId,
  onRefresh,
  onOpenDeposit,
  openUrl,
  triggerHaptic,
  mode = "all",
}) => {
  const [purchasingGroupId, setPurchasingGroupId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalGroup, setSuccessModalGroup] = useState<{ group: GroupItem; link: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | "uk_ireland" | "international" | "unlocked">("all");

  const balance = wallet ? wallet.balance : 0;

  const handlePurchaseWithBalance = async (group: GroupItem) => {
    setErrorMessage(null);

    // If balance is lower than group price
    if (balance < group.price) {
      triggerHaptic("warning");
      const diff = (group.price - balance).toFixed(2);
      setErrorMessage(`Insufficient balance for ${group.name}. You need £${diff} more. Please deposit via Stripe first.`);
      return;
    }

    try {
      setPurchasingGroupId(group.id);
      triggerHaptic("medium");

      const res = await api.purchaseGroup(telegramId, group.id);
      triggerHaptic("success");
      setSuccessModalGroup({
        group: res.group,
        link: res.inviteLink,
      });
      onRefresh();
    } catch (err: any) {
      console.error("Purchase error:", err);
      setErrorMessage(err.message || "Failed to complete group purchase");
      triggerHaptic("error");
    } finally {
      setPurchasingGroupId(null);
    }
  };

  const handleDirectStripeGroupCheckout = async (group: GroupItem) => {
    try {
      setPurchasingGroupId(group.id);
      setErrorMessage(null);
      triggerHaptic("medium");

      const res = await api.createCheckoutSession({
        telegramId,
        amount: group.price,
        currency: "GBP",
        groupId: group.id,
      });

      if (res.checkoutUrl) {
        triggerHaptic("light");
        openUrl(res.checkoutUrl);
      }
    } catch (err: any) {
      console.error("Stripe group checkout error:", err);
      setErrorMessage(err.message || "Stripe checkout failed. Please verify payment configuration.");
      triggerHaptic("error");
    } finally {
      setPurchasingGroupId(null);
    }
  };

  const handleCopyLink = (groupId: string, link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedGroupId(groupId);
    triggerHaptic("light");
    setTimeout(() => setCopiedGroupId(null), 2000);
  };

  // Filter based on mode and active tab
  const filteredGroups = groups.filter((g) => {
    const isBundle = g.id === "all-groups" || g.id === "baller-bundle";
    if (mode === "bundles_only" && !isBundle) return false;
    if (mode === "groups_only" && isBundle) return false;

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const theme = getGroupTheme(g.id);
      if (
        !g.name.toLowerCase().includes(q) &&
        !g.description.toLowerCase().includes(q) &&
        !theme.countryName.toLowerCase().includes(q) &&
        !theme.badgeLabel.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    // Category filter in groups_only mode
    if (mode === "groups_only") {
      const theme = getGroupTheme(g.id);
      if (categoryFilter === "unlocked") return g.isPurchased;
      if (categoryFilter === "uk_ireland") return theme.category === "uk";
      if (categoryFilter === "international") return theme.category === "international" || theme.category === "highroller";
    }

    return true;
  });

  const unlockedCount = groups.filter((g) => g.isPurchased).length;

  return (
    <div className="space-y-4">
      {/* Bundles Header Banner if in bundles_only mode */}
      {mode === "bundles_only" && (
        <div className="relative rounded-3xl p-5 overflow-hidden bg-gradient-to-r from-[#2f1b01] via-[#472d02] to-[#1a0e00] border-2 border-yellow-400 shadow-[0_0_40px_rgba(250,204,21,0.35)] text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-black text-xs font-black uppercase tracking-wider shadow-md">
            <Crown className="w-3.5 h-3.5" />
            <span>VIP Bundles & Master Passes</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Unlock Full Access & <span className="text-yellow-300">Save Up to £45</span>
          </h2>
          <p className="text-xs text-yellow-100/90 max-w-sm mx-auto font-medium">
            Get lifetime membership to all VIP groups in one pass with instant automated Telegram invite link delivery.
          </p>
        </div>
      )}

      {/* Groups Filter & Search Bar if in groups_only mode */}
      {mode === "groups_only" && (
        <div className="space-y-2.5">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-pink-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search VIP groups (e.g. Irish 🇮🇪, Desi 🇮🇳, English 🏴󠁧󠁢󠁥󠁮󠁧󠁿, Scottish 🏴󠁧󠁢󠁳󠁣󠁴󠁿)..."
              className="w-full bg-[#0a0014]/90 border border-pink-500/30 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-pink-400/40 focus:outline-none focus:border-pink-500 transition-colors"
            />
          </div>

          {/* Sub Categories Tabs with Flags */}
          <div className="flex items-center gap-1.5 p-1 bg-black/70 border border-pink-900/40 rounded-xl overflow-x-auto text-[11px]">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`py-1.5 px-3 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === "all"
                  ? "bg-pink-600 text-white font-black shadow-[0_0_12px_rgba(236,72,153,0.4)]"
                  : "text-pink-300/70 hover:text-white"
              }`}
            >
              All Groups ({groups.filter(g => g.id !== "all-groups" && g.id !== "baller-bundle").length})
            </button>
            <button
              onClick={() => setCategoryFilter("uk_ireland")}
              className={`py-1.5 px-3 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === "uk_ireland"
                  ? "bg-blue-600 text-white font-black shadow-[0_0_12px_rgba(59,130,246,0.4)]"
                  : "text-pink-300/70 hover:text-white"
              }`}
            >
              🏴󠁧󠁢󠁥󠁮󠁧󠁿 🏴󠁧󠁢󠁳󠁣󠁴󠁿 🇮🇪 UK & Ireland
            </button>
            <button
              onClick={() => setCategoryFilter("international")}
              className={`py-1.5 px-3 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === "international"
                  ? "bg-amber-600 text-white font-black shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  : "text-pink-300/70 hover:text-white"
              }`}
            >
              🇮🇳 International & Desi
            </button>
            <button
              onClick={() => setCategoryFilter("unlocked")}
              className={`py-1.5 px-3 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === "unlocked"
                  ? "bg-emerald-600 text-white font-black shadow-[0_0_12px_rgba(16,185,129,0.4)]"
                  : "text-pink-300/70 hover:text-white"
              }`}
            >
              Unlocked Passes ({unlockedCount})
            </button>
          </div>
        </div>
      )}

      {/* Error notification banner if any */}
      {errorMessage && (
        <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium">{errorMessage}</p>
            {errorMessage.includes("Insufficient balance") && (
              <button
                onClick={onOpenDeposit}
                className="mt-2 px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-white font-bold text-[11px] transition-all cursor-pointer shadow-[0_0_10px_rgba(236,72,153,0.4)]"
              >
                Deposit via Stripe Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* ALL GROUPS RENDERED AS WIDE HIGH-CONTRAST HORIZONTAL RECTANGLES */}
      <div className="grid grid-cols-1 gap-4">
        {filteredGroups.map((group) => {
          const theme = getGroupTheme(group.id);
          const isMaster = group.id === "all-groups";
          const isPurchased = group.isPurchased;
          const isProcessing = purchasingGroupId === group.id;

          return (
            <div
              key={group.id}
              className={`relative rounded-3xl p-4 sm:p-5 transition-all duration-300 overflow-hidden border-2 ${theme.borderColor} ${theme.shadowColor} ${theme.cardBg} group hover:scale-[1.008]`}
            >
              {/* Rich Visual Thematic Backdrop Pattern */}
              {theme.overlayPattern}

              {/* Ambient Thematic Colored Flare */}
              <div className={`absolute top-0 right-0 w-44 h-44 rounded-full blur-3xl pointer-events-none ${theme.ambientLight}`} />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Left/Main Information Section */}
                <div className="space-y-2.5 flex-1 min-w-0">
                  {/* Top Badges Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 ${theme.accentBadgeBg}`}>
                      <span>{theme.flag}</span>
                      <span>{theme.badgeLabel}</span>
                    </span>

                    {isPurchased && (
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-900 border-2 border-emerald-400 text-white flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
                        <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                        Unlocked & Active
                      </span>
                    )}

                    <span className="text-[10px] font-bold text-white/80 bg-black/60 px-2 py-0.5 rounded-lg border border-white/10 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Instant Invite
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      <span className="text-2xl drop-shadow-md">{theme.flag}</span>
                      <span>{group.name}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-pink-100 font-medium mt-1 leading-relaxed">
                      {group.description}
                    </p>
                  </div>

                  {/* Perks Pills Grid */}
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    {theme.perks.map((perk, pIdx) => (
                      <span
                        key={pIdx}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-black/50 border border-white/15 text-white/90 flex items-center gap-1"
                      >
                        <span className="text-yellow-400 font-bold">✓</span>
                        <span>{perk}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right / Pricing & Action Section */}
                <div className="md:w-64 flex-shrink-0 flex flex-col justify-center space-y-3 pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-white/15 md:pl-5">
                  {/* Price Tag with High Contrast */}
                  <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-pink-200">
                      Lifetime Access Price
                    </span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_12px_rgba(255,255,255,0.6)]">
                        £{group.price}
                      </span>
                      <span className="text-xs font-black text-yellow-300 font-mono">
                        GBP
                      </span>
                    </div>
                  </div>

                  {/* Action Button: Instant Join or Purchase */}
                  <div>
                    {isPurchased ? (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => {
                            triggerHaptic("success");
                            if (group.inviteLink) {
                              openUrl(group.inviteLink);
                            }
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-green-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] active:scale-[0.98] transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>Join on Telegram ↗</span>
                        </button>

                        <button
                          onClick={() => handleCopyLink(group.id, group.inviteLink || "")}
                          className="w-full py-1.5 px-3 rounded-xl bg-black/80 hover:bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                        >
                          {copiedGroupId === group.id ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Invite Link Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Invite Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    ) : balance >= group.price ? (
                      <button
                        onClick={() => handlePurchaseWithBalance(group)}
                        disabled={isProcessing}
                        className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 ${theme.buttonBg}`}
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Unlocking VIP...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            <span>Unlock with Balance (£{group.price})</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-1.5">
                        <button
                          onClick={() => handleDirectStripeGroupCheckout(group)}
                          disabled={isProcessing}
                          className="w-full flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:to-rose-400 text-white font-black text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(236,72,153,0.4)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                        >
                          <CreditCard className="w-4 h-4 flex-shrink-0" />
                          <span>Stripe Checkout (£{group.price})</span>
                        </button>

                        <button
                          onClick={onOpenDeposit}
                          className="w-full py-1.5 px-3 rounded-xl bg-black/80 hover:bg-pink-950/70 border border-pink-500/50 text-pink-200 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center"
                        >
                          <span>Top Up Wallet</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="p-8 text-center bg-[#090014]/60 border border-pink-950/60 rounded-3xl space-y-2">
          <p className="text-pink-300/70 text-xs">No groups match your current filter.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
            }}
            className="text-pink-400 font-bold text-xs hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Success Modal for freshly unlocked group */}
      {successModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0a0115] border-2 border-emerald-500/60 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_60px_rgba(16,185,129,0.35)] relative">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/90 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Sparkles className="w-7 h-7 animate-pulse text-emerald-300" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40">
                VIP Access Unlocked
              </span>
              <h3 className="text-xl font-black text-white mt-1.5">
                {successModalGroup.group.name}
              </h3>
              <p className="text-xs text-pink-200/80 mt-1">
                Your private Telegram invite link is generated and ready to join!
              </p>
            </div>

            {/* Link Box */}
            <div className="p-3.5 rounded-2xl bg-black/90 border border-emerald-500/40 text-left space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 block tracking-wider">
                Private Telegram Invite Link:
              </span>
              <p className="text-xs font-mono text-emerald-200 break-all select-all">
                {successModalGroup.link}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  triggerHaptic("success");
                  openUrl(successModalGroup.link);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Join Group on Telegram ↗</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => handleCopyLink(successModalGroup.group.id, successModalGroup.link)}
                  className="flex-1 py-2 px-3 rounded-xl bg-black border border-pink-500/30 hover:border-pink-500/60 text-pink-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </button>

                <button
                  onClick={() => setSuccessModalGroup(null)}
                  className="py-2 px-4 rounded-xl bg-pink-950/60 hover:bg-pink-900/60 text-pink-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
