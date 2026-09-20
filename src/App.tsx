import React, { useEffect, useState, useCallback, useRef } from "react";
import { UserWallet, ServerConfig } from "./types";
import { api } from "./services/api";
import { useTelegram } from "./hooks/useTelegram";
import { Header } from "./components/Header";
import { BalanceCard } from "./components/BalanceCard";
import { DepositModal } from "./components/DepositModal";
import { TransactionList } from "./components/TransactionList";
import { BotSetupGuide } from "./components/BotSetupGuide";
import { CelebrationToast } from "./components/CelebrationToast";
import { NightSky } from "./components/NightSky";
import { Shield, Sparkles, Bot, ChevronRight } from "lucide-react";

export default function App() {
  const { user, isTelegram, switchDemoUser, triggerHaptic, openUrl } = useTelegram();

  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [config, setConfig] = useState<ServerConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [sseConnected, setSseConnected] = useState<boolean>(false);

  // Modals & Toasts
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState<boolean>(false);
  const [isQuickDepositing, setIsQuickDepositing] = useState<boolean>(false);
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

    es.onerror = () => {
      setSseConnected(false);
    };

    return () => {
      es.close();
    };
  }, [user.id, triggerHaptic]);

  // Handle return from Stripe Checkout redirect with session_id query param
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get("session_id");
    const amount = urlParams.get("amount");
    const currency = urlParams.get("currency") || "GBP";

    if (sessionId) {
      // Verify session immediately so balance updates without waiting
      api.verifySession(sessionId, user.id, amount ? parseFloat(amount) : undefined, currency)
        .then((res) => {
          if (res.wallet) {
            setWallet(res.wallet);
          }
          if (res.transaction) {
            triggerHaptic("success");
            setCelebration({
              amount: res.transaction.amount,
              currency: res.transaction.currency || "GBP",
              txId: res.transaction.id,
            });
          }
        })
        .catch(console.error)
        .finally(() => {
          // Clean up query params from URL
          const cleanUrl = window.location.pathname;
          window.history.replaceState({}, document.title, cleanUrl);
        });
    }
  }, [user.id, triggerHaptic]);

  // Initial load
  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  // Quick 1-click test deposit in GBP
  const handleQuickDeposit = async (amount: number) => {
    try {
      setIsQuickDepositing(true);
      triggerHaptic("medium");
      const targetCurrency = wallet?.currency || "GBP";
      const res = await api.testDeposit(user.id, amount, targetCurrency);
      setWallet(res.wallet);
      triggerHaptic("success");
      setCelebration({
        amount: res.transaction.amount,
        currency: res.transaction.currency || "GBP",
        txId: res.transaction.id,
      });
    } catch (err) {
      console.error("Quick deposit error:", err);
      triggerHaptic("error");
    } finally {
      setIsQuickDepositing(false);
    }
  };

  const handleDepositSuccess = (amount: number, currency: string, txId?: string) => {
    loadWallet();
    setCelebration({ amount, currency, txId });
  };

  return (
    <div className="min-h-screen bg-[#030006] text-pink-50 flex flex-col font-sans selection:bg-pink-500/30 selection:text-pink-200 relative overflow-x-hidden">
      {/* Night Sky Cosmic Starfield Backdrop */}
      <NightSky />

      {/* Header */}
      <Header
        user={user}
        isTelegram={isTelegram}
        sseConnected={sseConnected}
        config={config}
        onSwitchUser={switchDemoUser}
        onOpenGuide={() => setIsGuideModalOpen(true)}
      />

      {/* Main Mini App Container */}
      <main className="flex-1 w-full max-w-md mx-auto px-4 py-5 space-y-4 relative z-10">
        {/* Celebration Toast */}
        {celebration && (
          <CelebrationToast
            amount={celebration.amount}
            currency={celebration.currency}
            txId={celebration.txId}
            onDismiss={() => setCelebration(null)}
          />
        )}

        {/* Telegram Mini App Banner (if inside browser/preview) */}
        {!isTelegram && (
          <div className="bg-[#0b0216]/80 border border-pink-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 text-xs backdrop-blur-xl shadow-[0_4px_20px_rgba(255,46,147,0.12)]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-pink-950/80 text-pink-400 border border-pink-500/30 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <p className="text-pink-200/90 leading-tight">
                Telegram WebApp SDK active. Test profiles ready or link to your bot & Render.
              </p>
            </div>
            <button
              onClick={() => setIsGuideModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-pink-950/80 hover:bg-pink-900 border border-pink-500/40 text-pink-200 font-bold text-[11px] whitespace-nowrap transition-colors cursor-pointer shadow-[0_0_10px_rgba(255,46,147,0.2)]"
            >
              Bot Guide
            </button>
          </div>
        )}

        {/* Available Balance Card: Hero element */}
        <BalanceCard
          wallet={wallet}
          config={config}
          loading={loading}
          onRefresh={loadWallet}
          onOpenDeposit={() => setIsDepositModalOpen(true)}
          onInstantQuickDeposit={handleQuickDeposit}
          isQuickDepositing={isQuickDepositing}
        />

        {/* Quick Help Callouts */}
        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <button
            onClick={() => setIsDepositModalOpen(true)}
            className="p-3.5 rounded-2xl bg-[#080112]/80 border border-pink-500/20 hover:border-pink-500/50 text-left transition-all flex items-center justify-between group cursor-pointer backdrop-blur-xl"
          >
            <div>
              <span className="font-bold text-pink-100 block">Stripe Checkout</span>
              <span className="text-[11px] text-pink-300/70">Card, Apple & Google Pay</span>
            </div>
            <ChevronRight className="w-4 h-4 text-pink-500/70 group-hover:text-pink-300 group-hover:translate-x-0.5 transition-all" />
          </button>

          <button
            onClick={() => setIsGuideModalOpen(true)}
            className="p-3.5 rounded-2xl bg-[#080112]/80 border border-pink-500/20 hover:border-pink-500/50 text-left transition-all flex items-center justify-between group cursor-pointer backdrop-blur-xl"
          >
            <div>
              <span className="font-bold text-pink-100 block">Bot & Render</span>
              <span className="text-[11px] text-pink-300/70">Setup & Webhooks</span>
            </div>
            <ChevronRight className="w-4 h-4 text-pink-500/70 group-hover:text-pink-300 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>

        {/* Transactions & Activity Feed */}
        <TransactionList
          transactions={wallet?.transactions || []}
          onOpenDeposit={() => setIsDepositModalOpen(true)}
        />
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-pink-400/50 text-xs border-t border-pink-950/40 relative z-10">
        <div className="max-w-md mx-auto px-4 flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-pink-300/60">
            <Shield className="w-3.5 h-3.5 text-pink-400" />
            256-Bit Encrypted Stripe Payments
          </span>
          <span className="text-pink-400/70 font-mono">GBP (£) • Live Sync</span>
        </div>
      </footer>

      {/* Deposit Modal */}
      <DepositModal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        user={user}
        config={config}
        onDepositSuccess={handleDepositSuccess}
        openUrl={openUrl}
        triggerHaptic={triggerHaptic}
      />

      {/* Bot & Render Setup Guide Modal */}
      <BotSetupGuide
        isOpen={isGuideModalOpen}
        onClose={() => setIsGuideModalOpen(false)}
        config={config}
      />
    </div>
  );
}
