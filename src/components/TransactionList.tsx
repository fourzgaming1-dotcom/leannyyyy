import React, { useState } from "react";
import { Transaction } from "../types";
import { ArrowDownLeft, CheckCircle2, FileText, ChevronRight, X, ShieldCheck, Sparkles } from "lucide-react";

interface TransactionListProps {
  transactions: Transaction[];
  onOpenDeposit: () => void;
}

export const TransactionList: React.FC<TransactionListProps> = ({ transactions, onOpenDeposit }) => {
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  return (
    <div className="w-full bg-[#080112]/85 border border-pink-500/25 rounded-3xl p-5 sm:p-6 backdrop-blur-xl shadow-[0_8px_30px_rgba(255,46,147,0.12)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-pink-950/60 border border-pink-500/30 flex items-center justify-center text-pink-400">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-xs font-bold text-pink-100 uppercase tracking-widest">
            Recent Activity
          </h3>
        </div>
        <span className="text-[11px] text-pink-400/70 font-mono">
          {transactions.length} {transactions.length === 1 ? "deposit" : "deposits"}
        </span>
      </div>

      {transactions.length === 0 ? (
        <div className="text-center py-9 px-4 border border-dashed border-pink-500/20 rounded-2xl bg-black/40">
          <div className="w-12 h-12 rounded-full bg-pink-950/40 border border-pink-500/20 flex items-center justify-center mx-auto mb-3 text-pink-400 shadow-[0_0_10px_rgba(255,46,147,0.2)]">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-pink-100 mb-1">No deposits yet</h4>
          <p className="text-xs text-pink-300/60 max-w-xs mx-auto mb-4">
            Deposit funds via Stripe to see your balance reflect instantly right here in £ GBP.
          </p>
          <button
            id="btn-first-deposit-cta"
            onClick={onOpenDeposit}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(255,46,147,0.35)] transition-all cursor-pointer"
          >
            Make First Deposit
          </button>
        </div>
      ) : (
        <div className="divide-y divide-pink-950/60">
          {transactions.map((tx) => {
            const date = new Date(tx.createdAt);
            const timeFormatted = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const dateFormatted = date.toLocaleDateString([], { month: "short", day: "numeric" });
            const currencySymbol = tx.currency === "EUR" ? "€" : tx.currency === "USD" ? "$" : "£";

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="py-3.5 px-2 -mx-2 rounded-2xl hover:bg-pink-950/30 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-pink-950/70 border border-pink-500/30 flex items-center justify-center flex-shrink-0 text-pink-400 group-hover:scale-105 group-hover:shadow-[0_0_10px_rgba(255,46,147,0.3)] transition-all">
                    <ArrowDownLeft className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-pink-50 text-xs truncate">
                      {tx.description || "Stripe Deposit"}
                    </div>
                    <div className="text-[11px] text-pink-400/60 flex items-center gap-1.5 mt-0.5 font-mono">
                      <span>{dateFormatted}, {timeFormatted}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-sans font-medium flex items-center gap-0.5">
                        <Sparkles className="w-2.5 h-2.5" /> Instant
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-xs sm:text-sm font-mono font-black text-pink-300 drop-shadow-[0_0_8px_rgba(255,46,147,0.4)]">
                      +{currencySymbol}{tx.amount.toFixed(2)}
                    </div>
                    <div className="text-[10px] uppercase font-bold text-pink-400/70">
                      {tx.currency || "GBP"}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-pink-900 group-hover:text-pink-400 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
          <div
            className="w-full max-w-sm bg-[#0a0214] border border-pink-500/40 rounded-3xl p-6 shadow-[0_0_40px_rgba(255,46,147,0.3)] space-y-4 relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute -top-16 -right-16 w-36 h-36 bg-pink-600/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between pb-3 border-b border-pink-500/20 relative z-10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-pink-100">
                  Deposit Receipt
                </span>
              </div>
              <button
                id="btn-close-receipt-modal"
                onClick={() => setSelectedTx(null)}
                className="p-1 rounded-xl text-pink-300/70 hover:text-white hover:bg-pink-950/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center py-2 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-pink-950/60 border border-pink-500/40 flex items-center justify-center mx-auto mb-2 text-pink-400 shadow-[0_0_15px_rgba(255,46,147,0.3)]">
                <CheckCircle2 className="w-7 h-7 text-pink-400" />
              </div>
              <div className="text-3xl font-mono font-black text-white drop-shadow-[0_0_12px_rgba(255,46,147,0.5)]">
                +{selectedTx.currency === "EUR" ? "€" : selectedTx.currency === "USD" ? "$" : "£"}
                {selectedTx.amount.toFixed(2)}
              </div>
              <p className="text-xs text-pink-300 font-semibold mt-1">Payment Succeeded & Credited</p>
            </div>

            <div className="bg-black/80 rounded-2xl p-4 space-y-2 text-xs font-mono relative z-10 border border-pink-500/20">
              <div className="flex justify-between text-pink-300/70">
                <span>Status</span>
                <span className="text-emerald-400 font-sans font-bold uppercase">
                  {selectedTx.status}
                </span>
              </div>
              <div className="flex justify-between text-pink-300/70">
                <span>Date & Time</span>
                <span className="text-pink-100">
                  {new Date(selectedTx.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-pink-300/70">
                <span>Telegram ID</span>
                <span className="text-pink-400 font-bold">{selectedTx.telegramId}</span>
              </div>
              <div className="flex justify-between text-pink-300/70">
                <span>Transaction Ref</span>
                <span className="text-pink-200 truncate max-w-[140px]" title={selectedTx.id}>
                  {selectedTx.id}
                </span>
              </div>
              {selectedTx.stripeSessionId && (
                <div className="flex justify-between text-pink-300/70">
                  <span>Stripe Ref</span>
                  <span className="text-pink-200 truncate max-w-[140px]" title={selectedTx.stripeSessionId}>
                    {selectedTx.stripeSessionId.substring(0, 16)}...
                  </span>
                </div>
              )}
            </div>

            <button
              id="btn-done-receipt-modal"
              onClick={() => setSelectedTx(null)}
              className="w-full py-3 rounded-xl bg-pink-950/70 hover:bg-pink-900/80 border border-pink-500/40 text-pink-100 font-bold text-xs shadow-[0_0_10px_rgba(255,46,147,0.2)] transition-colors cursor-pointer relative z-10"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
