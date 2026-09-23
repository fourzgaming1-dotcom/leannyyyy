import React, { useState } from "react";
import { GroupItem, UserWallet } from "../types";
import { api } from "../services/api";
import {
  Sparkles,
  ExternalLink,
  CheckCircle2,
  Copy,
  Lock,
  Zap,
  ShoppingBag,
  CreditCard,
  Settings,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Share2,
} from "lucide-react";

interface GroupStoreProps {
  groups: GroupItem[];
  wallet: UserWallet | null;
  telegramId: number;
  onRefresh: () => void;
  onOpenDeposit: () => void;
  openUrl: (url: string) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
}

export const GroupStore: React.FC<GroupStoreProps> = ({
  groups,
  wallet,
  telegramId,
  onRefresh,
  onOpenDeposit,
  openUrl,
  triggerHaptic,
}) => {
  const [purchasingGroupId, setPurchasingGroupId] = useState<string | null>(null);
  const [copiedGroupId, setCopiedGroupId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successModalGroup, setSuccessModalGroup] = useState<{ group: GroupItem; link: string } | null>(null);
  const [activeStripeRedirect, setActiveStripeRedirect] = useState<{ group: GroupItem; checkoutUrl: string } | null>(null);
  const [showAdminLinks, setShowAdminLinks] = useState<boolean>(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [customLinkInput, setCustomLinkInput] = useState<string>("");
  const [isSavingLink, setIsSavingLink] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<"all" | "unlocked" | "bundles">("all");

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
        setActiveStripeRedirect({ group, checkoutUrl: res.checkoutUrl });
        triggerHaptic("light");
        openUrl(res.checkoutUrl);
      }
    } catch (err: any) {
      console.error("Stripe group checkout error:", err);
      setErrorMessage(err.message || "Stripe checkout failed. Check server STRIPE_SECRET_KEY.");
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

  const handleSaveCustomLink = async (groupId: string) => {
    if (!customLinkInput.trim()) return;
    try {
      setIsSavingLink(true);
      await api.updateGroupLink(groupId, customLinkInput.trim());
      triggerHaptic("success");
      setEditingGroupId(null);
      setCustomLinkInput("");
      onRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update invite link");
      triggerHaptic("error");
    } finally {
      setIsSavingLink(false);
    }
  };

  const filteredGroups = groups.filter((g) => {
    if (filterTab === "unlocked") return g.isPurchased;
    if (filterTab === "bundles") return g.id === "all-groups" || g.id === "baller-bundle";
    return true;
  });

  const unlockedCount = groups.filter((g) => g.isPurchased).length;

  return (
    <div className="w-full space-y-4">
      {/* Brand Header */}
      <div className="flex flex-col items-center justify-center text-center pt-2 pb-1">
        <h1 className="text-3xl sm:text-4xl font-black tracking-wider text-pink-500 drop-shadow-[0_0_20px_rgba(255,46,147,0.5)]">
          sxnti
        </h1>
        <span className="text-xs sm:text-sm font-bold tracking-[0.28em] text-white uppercase -mt-0.5 opacity-90">
          app
        </span>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-black/60 border border-pink-900/30 rounded-xl">
        <button
          onClick={() => setFilterTab("all")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
            filterTab === "all"
              ? "bg-pink-500/30 text-pink-100 border border-pink-500/50 shadow-[0_0_10px_rgba(255,46,147,0.2)]"
              : "text-pink-400/60 hover:text-pink-200"
          }`}
        >
          All Groups ({groups.length})
        </button>
        <button
          onClick={() => setFilterTab("bundles")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
            filterTab === "bundles"
              ? "bg-pink-500/30 text-pink-100 border border-pink-500/50 shadow-[0_0_10px_rgba(255,46,147,0.2)]"
              : "text-pink-400/60 hover:text-pink-200"
          }`}
        >
          Bundles (VIP)
        </button>
        <button
          onClick={() => setFilterTab("unlocked")}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
            filterTab === "unlocked"
              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/50"
              : "text-pink-400/60 hover:text-pink-200"
          }`}
        >
          My Links ({unlockedCount})
        </button>
      </div>

      {/* Error notification banner if any */}
      {errorMessage && (
        <div className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-start gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            {errorMessage.includes("Insufficient balance") && (
              <button
                onClick={onOpenDeposit}
                className="mt-1.5 px-3 py-1 rounded-lg bg-pink-500 hover:bg-pink-400 text-white font-bold text-[11px] transition-all cursor-pointer"
              >
                Deposit via Stripe Now
              </button>
            )}
          </div>
        </div>
      )}

      {/* Admin Invite Link Editor Panel */}
      {showAdminLinks && (
        <div className="p-4 rounded-2xl bg-[#090114]/95 border border-pink-500/40 space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between pb-2 border-b border-pink-900/40">
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-pink-400" />
                <span>Configure Telegram Invite Links</span>
              </h3>
              <p className="text-[10px] text-pink-300/70">
                Buyers will receive these links immediately when they purchase
              </p>
            </div>
            <button
              onClick={() => setShowAdminLinks(false)}
              className="text-[11px] text-pink-400 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {groups.map((g) => (
              <div
                key={`admin-${g.id}`}
                className="p-2.5 rounded-xl bg-black/70 border border-pink-950/60 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-pink-100">{g.name} (£{g.price})</span>
                  {editingGroupId === g.id ? (
                    <button
                      onClick={() => setEditingGroupId(null)}
                      className="text-[10px] text-pink-400"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingGroupId(g.id);
                        setCustomLinkInput(g.inviteLink || "");
                      }}
                      className="text-[10px] text-pink-300 hover:text-white underline font-semibold"
                    >
                      Edit Link
                    </button>
                  )}
                </div>

                {editingGroupId === g.id ? (
                  <div className="flex items-center gap-1.5 pt-1">
                    <input
                      type="text"
                      value={customLinkInput}
                      onChange={(e) => setCustomLinkInput(e.target.value)}
                      placeholder="https://t.me/+YourPrivateLink"
                      className="flex-1 bg-black border border-pink-500/40 rounded-lg px-2.5 py-1 text-xs text-white placeholder-pink-900 focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveCustomLink(g.id)}
                      disabled={isSavingLink}
                      className="px-2.5 py-1 bg-pink-500 hover:bg-pink-400 text-white rounded-lg text-xs font-bold disabled:opacity-50"
                    >
                      {isSavingLink ? "..." : "Save"}
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] font-mono text-pink-400/80 truncate">
                    {g.inviteLink || "https://t.me/..."}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Groups Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredGroups.map((group) => {
          const isMaster = group.id === "all-groups";
          const isBallerBundle = group.id === "baller-bundle";
          const isPurchased = group.isPurchased;
          const isProcessing = purchasingGroupId === group.id;

          return (
            <div
              key={group.id}
              className={`relative rounded-2xl p-4 transition-all duration-300 overflow-hidden flex flex-col justify-between ${
                isMaster
                  ? "sm:col-span-2 bg-gradient-to-br from-[#120220] via-[#1a0429] to-[#0a0115] border-2 border-pink-500/60 shadow-[0_0_30px_rgba(255,46,147,0.3)]"
                  : isBallerBundle
                  ? "bg-[#0c0218]/90 border border-fuchsia-500/40 shadow-[0_0_20px_rgba(217,70,239,0.15)]"
                  : "bg-[#080210]/90 border border-pink-500/25 hover:border-pink-500/45 shadow-[0_4px_15px_rgba(0,0,0,0.3)]"
              }`}
            >
              {/* Subtle ambient light in card */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-pink-600/10 rounded-full blur-2xl pointer-events-none" />

              <div>
                {/* Top Badge & Tag Row */}
                <div className="flex items-center justify-between gap-2 mb-2 relative z-10">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {group.tag && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-500 text-white shadow-[0_0_8px_rgba(255,46,147,0.6)]">
                        {group.tag}
                      </span>
                    )}
                    {isPurchased && (
                      <span className="text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/50 text-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        Unlocked
                      </span>
                    )}
                  </div>

                  {/* Price Tag */}
                  <div className="text-right">
                    <span className="text-xl font-black font-mono text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,46,147,0.5)]">
                      £{group.price}
                    </span>
                    <span className="text-[10px] text-pink-400 font-bold ml-1">GBP</span>
                  </div>
                </div>

                {/* Group Name & Description */}
                <div className="relative z-10 mb-3">
                  <h3 className="text-base font-extrabold text-white tracking-wide">
                    {group.name}
                  </h3>
                  <p className="text-xs text-pink-200/70 line-clamp-2 mt-0.5">
                    {group.description}
                  </p>
                </div>
              </div>

              {/* Action Area: If Unlocked, show instant link; If Locked, show purchase options */}
              <div className="relative z-10 pt-2 border-t border-pink-900/30 space-y-2">
                {isPurchased ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-emerald-300 font-semibold px-1">
                      <span className="flex items-center gap-1">
                        <Zap className="w-3 h-3 text-emerald-400" />
                        Instant VIP Access Link
                      </span>
                      <span className="text-pink-300/70">Available Now</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          triggerHaptic("success");
                          if (group.inviteLink) {
                            openUrl(group.inviteLink);
                          }
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(16,185,129,0.35)] active:scale-[0.98] transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Join Group</span>
                      </button>

                      <button
                        onClick={() => handleCopyLink(group.id, group.inviteLink || "")}
                        className="p-2.5 rounded-xl bg-black/80 hover:bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                        title="Copy Link"
                      >
                        {copiedGroupId === group.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {/* Primary Button: Buy with Wallet Balance or Direct Stripe */}
                    {balance >= group.price ? (
                      <button
                        onClick={() => handlePurchaseWithBalance(group)}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:to-fuchsia-500 text-white font-extrabold text-xs shadow-[0_0_20px_rgba(255,46,147,0.35)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Unlocking...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Unlock with Balance (£{group.price})</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => handleDirectStripeGroupCheckout(group)}
                          disabled={isProcessing}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(255,46,147,0.3)] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 text-center"
                        >
                          <CreditCard className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">Stripe (£{group.price})</span>
                        </button>

                        <button
                          onClick={onOpenDeposit}
                          className="flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-black/80 hover:bg-pink-950/60 border border-pink-500/30 text-pink-200 font-bold text-xs transition-all active:scale-[0.98] cursor-pointer text-center"
                        >
                          <span>Deposit First</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Success Modal for freshly unlocked group */}
      {successModalGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-sm bg-[#0a0115] border-2 border-emerald-500/50 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.3)] relative">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                Purchase Confirmed
              </span>
              <h3 className="text-lg font-black text-white mt-1">
                {successModalGroup.group.name} Unlocked!
              </h3>
              <p className="text-xs text-pink-200/80 mt-1">
                Your VIP invite link is ready. Click below to join the Telegram group immediately.
              </p>
            </div>

            {/* Link Container */}
            <div className="p-3 rounded-xl bg-black/80 border border-emerald-500/30 text-left space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 block">Your Private Invite Link:</span>
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
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(16,185,129,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Join Group on Telegram</span>
              </button>

              <button
                onClick={() => handleCopyLink(successModalGroup.group.id, successModalGroup.link)}
                className="w-full py-2.5 px-4 rounded-xl bg-black/70 hover:bg-emerald-950/50 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>
                  {copiedGroupId === successModalGroup.group.id ? "Link Copied!" : "Copy Link"}
                </span>
              </button>

              <button
                onClick={() => setSuccessModalGroup(null)}
                className="text-xs text-pink-400/80 hover:text-white pt-1 block mx-auto cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stripe Payment Redirect Modal (Fallback if automatic pop-up was blocked) */}
      {activeStripeRedirect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-[#090212] border border-pink-500/40 rounded-3xl p-6 shadow-[0_0_50px_rgba(255,46,147,0.35)] text-center space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-pink-600 via-rose-500 to-fuchsia-600 flex items-center justify-center mx-auto text-white shadow-[0_0_20px_rgba(255,46,147,0.5)]">
              <CreditCard className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white">
                Stripe Payment Ready
              </h3>
              <p className="text-xs text-pink-200/80 mt-1">
                {activeStripeRedirect.group.name} (£{activeStripeRedirect.group.price.toFixed(2)})
              </p>
            </div>

            <p className="text-xs text-pink-300/70">
              Your secure Stripe session is open. Tap the button below if your browser did not redirect automatically:
            </p>

            <div className="space-y-2 pt-1">
              <a
                href={activeStripeRedirect.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic("light")}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(255,46,147,0.45)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Continue to Stripe Checkout ↗</span>
              </a>

              <button
                onClick={() => setActiveStripeRedirect(null)}
                className="text-xs text-pink-400/80 hover:text-white pt-1 block mx-auto cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
