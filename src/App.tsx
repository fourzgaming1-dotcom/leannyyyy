import React, { useEffect, useState, useCallback, useRef } from "react";
import { UserWallet, ServerConfig, GroupItem, NavTab } from "./types";
import { api } from "./services/api";
import { useTelegram } from "./hooks/useTelegram";
import { Header } from "./components/Header";
import { DepositModal } from "./components/DepositModal";
import { GroupStore } from "./components/GroupStore";
import { TransactionList } from "./components/TransactionList";
import { BalanceCard } from "./components/BalanceCard";
import { BotSetupGuide } from "./components/BotSetupGuide";
import { CelebrationToast } from "./components/CelebrationToast";
import { NightSky } from "./components/NightSky";
import { BottomNav } from "./components/BottomNav";
import { HomeHub } from "./components/HomeHub";
import { LuckyWheelGame } from "./components/LuckyWheelGame";
import { CrossyRoadGame } from "./components/CrossyRoadGame";
import { AdminGroupLinksModal } from "./components/AdminGroupLinksModal";
import { Shield, Sparkles, ExternalLink, Copy, CheckCircle2, Zap, ArrowLeft } from "lucide-react";

export default function App() {
  const { user, isTelegram, switchDemoUser, triggerHaptic, openUrl } = useTelegram();

  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [groups, setGroups] = useState<GroupItem[]>([]);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [groupsLoading, setGroupsLoading] = useState<boolean>(false);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  // Navigation
  const [activeNavTab, setActiveNavTab] = useState<NavTab>("home");
  const [activeGameSubTab, setActiveGameSubTab] = useState<"wheel" | "crossy">("wheel");
  const [spinsLeft, setSpinsLeft] = useState<number>(3);

  // Modals & Toasts
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [isAdminLinksOpen, setIsAdminLinksOpen] = useState<boolean>(false);
  const [depositPrefillAmount, setDepositPrefillAmount] = useState<number>(20);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [unlockedGroupModal, setUnlockedGroupModal] = useState<{
    name: string;
    link: string;
    id: string;
  } | null>(null);
  const [copiedModalLink, setCopiedModalLink] = useState<boolean>(false);
  const [celebration, setCelebration] = useState<{
    amount: number;
    currency: string;
    txId?: string;
  } | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  // Load wallet data
  const loadWallet = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getWallet(user.id, user.first_name, user.username);
      setWallet(data);
    } catch (err) {
      console.error("Failed to fetch wallet:", err);
    } finally {
      setLoading(false);
    }
  }, [user.id, user.first_name, user.username]);

  // Load groups data
  const loadGroups = useCallback(async () => {
    try {
      setGroupsLoading(true);
      const data = await api.getGroups(user.id);
      setGroups(data.groups);
    } catch (err) {
      console.error("Failed to fetch groups:", err);
    } finally {
      setGroupsLoading(false);
    }
  }, [user.id]);

  // Load game status
  const loadGameStatus = useCallback(async () => {
    try {
      const data = await api.getGameStatus(user.id);
      setSpinsLeft(data.spinsLeft ?? 3);
    } catch (err) {
      console.warn("Failed to fetch game status:", err);
    }
  }, [user.id]);

  // Refresh everything
  const refreshAll = useCallback(() => {
    loadWallet();
    loadGroups();
    loadGameStatus();
  }, [loadWallet, loadGroups, loadGameStatus]);

  // Load configuration
  useEffect(() => {
    api.getConfig().then(setConfig).catch(console.error);
  }, []);

  // Connect to SSE stream for real-time instant balance push
  useEffect(() => {
    if (!user.id) return;

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/wallet/events/${user.id}`);
    eventSourceRef.current = es;

    es.addEventListener("CONNECTED", () => {
      setSseConnected(true);
    });

    es.addEventListener("BALANCE_UPDATED", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        setWallet((prev) => {
          if (!prev) return prev;
          const updatedTransactions = payload.transaction
            ? [payload.transaction, ...prev.transactions.filter((t) => t.id !== payload.transaction.id)]
            : prev.transactions;
          return {
            ...prev,
            balance: payload.balance,
            currency: payload.currency || "GBP",
            transactions: updatedTransactions,
          };
        });

        if (payload.transaction) {
          triggerHaptic("success");
          setCelebration({
            amount: payload.transaction.amount,
            currency: payload.transaction.currency || "GBP",
            txId: payload.transaction.id,
          });
        }
      } catch (err) {
        console.error("Error processing SSE balance update:", err);
      }
    });

    es.addEventListener("GROUP_PURCHASED", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        loadGroups();
        loadWallet();
        triggerHaptic("success");
        if (payload.inviteLink) {
          setUnlockedGroupModal({
            name: payload.groupName || payload.groupId,
            link: payload.inviteLink,
            id: payload.groupId,
          });
        }
        setCelebration({
          amount: 0,
          currency: "GBP",
          txId: `Unlocked: ${payload.groupName || payload.groupId}!`,
        });
      } catch (err) {
        console.error("SSE group purchased error:", err);
      }
    });

    es.addEventListener("GROUP_UNLOCKED", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data);
        loadGroups();
        loadWallet();
        triggerHaptic("success");
        if (payload.inviteLink) {
          setUnlockedGroupModal({
            name: payload.groupName || payload.groupId,
            link: payload.inviteLink,
            id: payload.groupId,
          });
        }
      } catch (err) {
        console.error("SSE group unlocked error:", err);
      }
    });

    return () => {
      es.close();
    };
  }, [user.id, triggerHaptic, loadGroups, loadWallet]);

  // Handle return from Stripe redirect in URL query
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const depositStatus = urlParams.get("deposit");
    const unlockedGroupId = urlParams.get("unlocked_group");

    if (sessionId && depositStatus === "success") {
      api.verifySession(sessionId, user.id)
        .then((res) => {
          triggerHaptic("success");
          loadWallet();
          loadGroups();

          if (res.unlockedGroup && res.unlockedGroup.inviteLink) {
            setUnlockedGroupModal({
              name: res.unlockedGroup.group?.name || res.unlockedGroup.groupId,
              link: res.unlockedGroup.inviteLink,
              id: res.unlockedGroup.groupId,
            });
          } else if (unlockedGroupId) {
            setCelebration({
              amount: res.transaction?.amount || 0,
              currency: res.transaction?.currency || "GBP",
              txId: "🎉 Access Unlocked! Your invite link is ready.",
            });
          } else if (res.transaction) {
            setCelebration({
              amount: res.transaction.amount,
              currency: res.transaction.currency || "GBP",
              txId: res.transaction.id,
            });
          }
        })
        .catch(console.error)
        .finally(() => {
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        });
    }
  }, [user.id, triggerHaptic, loadGroups, loadWallet]);

  // Initial load
  useEffect(() => {
    loadWallet();
    loadGroups();
    loadGameStatus();
  }, [loadWallet, loadGroups, loadGameStatus]);

  const handleDepositSuccess = (amount: number, currency: string, txId?: string) => {
    refreshAll();
    setCelebration({ amount, currency, txId });
  };

  const handleGameRewardWon = (amount: number, message: string, newWallet?: UserWallet) => {
    if (newWallet) {
      setWallet(newWallet);
    }
    loadWallet();
    loadGroups();
    loadGameStatus();
    if (amount > 0) {
      setCelebration({
        amount,
        currency: "GBP",
        txId: message,
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#030006] text-pink-50 flex flex-col font-sans selection:bg-pink-500/30 selection:text-pink-200 relative overflow-x-hidden">
      {/* Night Sky Cosmic Starfield Backdrop */}
      <NightSky />

      {/* Header with Top Balance Bar */}
      <Header
        user={user}
        isTelegram={isTelegram}
        sseConnected={sseConnected}
        config={config}
        wallet={wallet}
        loading={loading}
        onRefresh={refreshAll}
        onOpenDeposit={(amt?: number) => {
          if (amt) setDepositPrefillAmount(amt);
          setIsDepositModalOpen(true);
        }}
        onSwitchUser={switchDemoUser}
        onOpenGuide={() => setIsGuideModalOpen(true)}
        onOpenAdminLinks={() => setIsAdminLinksOpen(true)}
      />

      {/* Main Mini App Container - pb-24 leaves room for bottom navigation */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4 relative z-10 pb-24">
        {/* Celebration Toast */}
        {celebration && (
          <CelebrationToast
            amount={celebration.amount}
            currency={celebration.currency}
            txId={celebration.txId}
            onDismiss={() => setCelebration(null)}
          />
        )}

        {/* Section Header with Back-to-Home button if not on Home */}
        {activeNavTab !== "home" && (
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => {
                triggerHaptic("light");
                setActiveNavTab("home");
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-pink-300 hover:text-white transition-colors cursor-pointer py-1 px-2.5 rounded-xl bg-pink-950/50 border border-pink-500/30"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </button>

            <span className="text-xs font-black uppercase tracking-wider text-pink-300/80">
              {activeNavTab === "bundles" && "👑 VIP Bundles (Master Pass & 💎 Baller Bundle)"}
              {activeNavTab === "groups" && "⭐ Individual Groups (65 Communities)"}
              {activeNavTab === "game" && (activeGameSubTab === "crossy" ? "🚗 VIP Crossy Road (£1/Go · Free Baller Group)" : "🎡 VIP Lucky Wheel (£1/Spin · Win £100)")}
              {activeNavTab === "wallet" && "💳 Wallet & Ledger"}
            </span>
          </div>
        )}

        {/* TAB 1: HOME PAGE */}
        {activeNavTab === "home" && (
          <HomeHub
            user={user}
            wallet={wallet}
            groups={groups}
            onNavigate={(tab) => {
              triggerHaptic("light");
              setActiveNavTab(tab);
            }}
            onNavigateToGame={(gameType) => {
              triggerHaptic("medium");
              setActiveGameSubTab(gameType);
              setActiveNavTab("game");
            }}
            onOpenDeposit={(amt) => {
              if (amt) setDepositPrefillAmount(amt);
              setIsDepositModalOpen(true);
            }}
            triggerHaptic={triggerHaptic}
            openUrl={openUrl}
            spinsLeft={spinsLeft}
          />
        )}

        {/* TAB 2: VIP BUNDLES */}
        {activeNavTab === "bundles" && (
          <GroupStore
            groups={groups}
            wallet={wallet}
            telegramId={user.id}
            onRefresh={refreshAll}
            openUrl={openUrl}
            triggerHaptic={triggerHaptic}
            mode="bundles_only"
            onOpenDeposit={() => {
              setDepositPrefillAmount(30);
              setIsDepositModalOpen(true);
            }}
          />
        )}

        {/* TAB 3: ALL INDIVIDUAL GROUPS */}
        {activeNavTab === "groups" && (
          <GroupStore
            groups={groups}
            wallet={wallet}
            telegramId={user.id}
            onRefresh={refreshAll}
            openUrl={openUrl}
            triggerHaptic={triggerHaptic}
            mode="groups_only"
            onOpenDeposit={() => {
              setDepositPrefillAmount(10);
              setIsDepositModalOpen(true);
            }}
          />
        )}

        {/* TAB 4: VIP GAMES HUB (LUCKY WHEEL £1 & VIP CROSSY ROAD 1p-£2) */}
        {activeNavTab === "game" && (
          <div className="space-y-3">
            {/* Prominent VIP Arcade Arena Header (Never Blank) */}
            <div className="relative overflow-hidden rounded-3xl p-4 bg-gradient-to-r from-[#220436] via-[#120121] to-[#240120] border-2 border-amber-500/70 shadow-[0_0_30px_rgba(245,158,11,0.25)]">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-950/90 border border-amber-400/60 text-amber-300 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
                  <span>VIP ARCADE ARENA</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-400 bg-black/70 px-2.5 py-1 rounded-xl border border-emerald-500/40">
                  <span>Balance:</span>
                  <span className="text-white font-black">£{(wallet?.balance || 0).toFixed(2)}</span>
                </div>
              </div>

              {activeGameSubTab === "crossy" ? (
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span className="text-xl">🚗</span>
                    <span className="bg-gradient-to-r from-amber-300 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">
                      VIP Crossy Road: Cash Hopper
                    </span>
                  </h2>
                  <p className="text-xs text-amber-200/90 mt-1 leading-snug">
                    £1 per go · Dodge speeding cars & trucks! 1st hops: 1p each · Rest 1: +10p · 2nd hops: 5p each · Rest 2: +10p · 3rd hops: 10p each. <strong>Hop 10 unlocks Free 💎 Baller Group!</strong> Cash out anytime after 3 hops.
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-extrabold">
                      £1.00 / Go
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
                      💰 Cash Out at 3+ Hops
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-purple-950/80 border border-purple-500/40 text-yellow-300 text-[10px] font-extrabold">
                      👑 Hop 10 = Free Baller Pass
                    </span>
                  </div>
                </div>
              ) : (
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                    <span className="text-xl">🎡</span>
                    <span className="bg-gradient-to-r from-yellow-300 via-amber-300 to-pink-400 bg-clip-text text-transparent">
                      VIP Lucky Wheel: 25 Prizes
                    </span>
                  </h2>
                  <p className="text-xs text-yellow-200/90 mt-1 leading-snug">
                    £1 per spin · Win up to £100 instant cash credit or win exclusive access to Ebony, Chav, Baller VIP & Master All Groups Passes!
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-lg bg-yellow-950/80 border border-yellow-500/40 text-yellow-300 text-[10px] font-extrabold">
                      £1.00 / Spin
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-[10px] font-extrabold">
                      💎 Up to £100 Cash Jackpot
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-pink-950/80 border border-pink-500/40 text-pink-300 text-[10px] font-extrabold">
                      🎟️ 8 VIP Group Passes
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* VIP Arcade Mode Switcher */}
            <div className="p-1 rounded-2xl bg-[#0b0014]/90 border border-yellow-500/30 flex items-center gap-1 shadow-lg">
              <button
                onClick={() => {
                  triggerHaptic("light");
                  setActiveGameSubTab("wheel");
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeGameSubTab === "wheel"
                    ? "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 text-black shadow-[0_0_18px_rgba(250,204,21,0.6)] scale-[1.01]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🎡 Lucky Wheel (£1/Spin)</span>
              </button>

              <button
                onClick={() => {
                  triggerHaptic("light");
                  setActiveGameSubTab("crossy");
                }}
                className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeGameSubTab === "crossy"
                    ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-[0_0_18px_rgba(245,158,11,0.6)] scale-[1.01]"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
              >
                <span>🚗 VIP Crossy Road (£1/Go)</span>
              </button>
            </div>

            {activeGameSubTab === "wheel" ? (
              <LuckyWheelGame
                telegramId={user.id}
                wallet={wallet}
                onRewardWon={handleGameRewardWon}
                triggerHaptic={triggerHaptic}
                onNavigateToGroups={() => setActiveNavTab("groups")}
                onOpenDeposit={(amt) => {
                  if (amt) setDepositPrefillAmount(amt);
                  setIsDepositModalOpen(true);
                }}
                onRefreshWallet={refreshAll}
                onSwitchToRoulette={() => {
                  triggerHaptic("medium");
                  setActiveGameSubTab("crossy");
                }}
              />
            ) : (
              <CrossyRoadGame
                telegramId={user.id}
                wallet={wallet}
                onRewardWon={handleGameRewardWon}
                triggerHaptic={triggerHaptic}
                onOpenDeposit={(amt) => {
                  if (amt) setDepositPrefillAmount(amt);
                  setIsDepositModalOpen(true);
                }}
                onRefreshWallet={refreshAll}
                onSwitchToWheel={() => {
                  triggerHaptic("medium");
                  setActiveGameSubTab("wheel");
                }}
              />
            )}
          </div>
        )}

        {/* TAB 5: WALLET & STRIPE DEPOSITS */}
        {activeNavTab === "wallet" && (
          <div className="space-y-4">
            <BalanceCard
              wallet={wallet}
              config={config}
              loading={loading}
              onRefresh={refreshAll}
              onOpenDeposit={(amt) => {
                if (amt) setDepositPrefillAmount(amt);
                setIsDepositModalOpen(true);
              }}
              onScrollToStore={() => setActiveNavTab("bundles")}
            />

            <TransactionList
              transactions={wallet?.transactions || []}
              onOpenDeposit={() => setIsDepositModalOpen(true)}
            />
          </div>
        )}
      </main>

      {/* Modern Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeNavTab}
        onSelectTab={setActiveNavTab}
        triggerHaptic={triggerHaptic}
        balance={wallet?.balance || 0}
        spinsLeft={spinsLeft}
      />

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        user={user}
        config={config}
        initialAmount={depositPrefillAmount}
        onDepositSuccess={handleDepositSuccess}
        openUrl={openUrl}
        triggerHaptic={triggerHaptic}
      />

      {/* Instant VIP Access Unlocked Modal */}
      {unlockedGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="w-full max-w-sm bg-[#090116] border-2 border-emerald-500/60 rounded-3xl p-6 text-center space-y-4 shadow-[0_0_60px_rgba(16,185,129,0.4)] relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-950/90 border border-emerald-500/60 flex items-center justify-center text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.5)]">
              <Sparkles className="w-8 h-8 animate-pulse text-emerald-400" />
            </div>

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500/40">
                VIP Access Unlocked
              </span>
              <h3 className="text-xl font-black text-white mt-1.5">
                {unlockedGroupModal.name}
              </h3>
              <p className="text-xs text-pink-200/80 mt-1">
                Your private Telegram invite link is generated and ready to join!
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/90 border border-emerald-500/40 text-left space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 block tracking-wider">
                Private Telegram Invite Link:
              </span>
              <p className="text-xs font-mono text-emerald-200 break-all select-all">
                {unlockedGroupModal.link}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                onClick={() => {
                  triggerHaptic("success");
                  openUrl(unlockedGroupModal.link);
                }}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Join Group on Telegram ↗</span>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(unlockedGroupModal.link);
                    setCopiedModalLink(true);
                    triggerHaptic("light");
                    setTimeout(() => setCopiedModalLink(false), 2000);
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-black border border-pink-500/30 hover:border-pink-500/60 text-pink-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  {copiedModalLink ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setUnlockedGroupModal(null)}
                  className="py-2 px-4 rounded-xl bg-pink-950/60 hover:bg-pink-900/60 text-pink-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bot Setup Guide Modal */}
      <BotSetupGuide
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        config={config}
      />

      {/* Owner: Admin Group Links Manager Modal */}
      <AdminGroupLinksModal
        isOpen={isAdminLinksOpen}
        onClose={() => setIsAdminLinksOpen(false)}
        triggerHaptic={triggerHaptic}
        onLinksUpdated={refreshAll}
      />
    </div>
  );
}
