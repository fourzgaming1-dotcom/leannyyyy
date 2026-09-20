import React, { useEffect } from "react";
import { CheckCircle2, Sparkles, X } from "lucide-react";

interface CelebrationToastProps {
  amount: number;
  currency: string;
  txId?: string;
  onDismiss: () => void;
}

export const CelebrationToast: React.FC<CelebrationToastProps> = ({
  amount,
  currency,
  txId,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const currencySymbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";

  return (
    <div className="fixed top-16 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-top-4 duration-300">
      <div className="bg-[#0b0217]/95 border-2 border-pink-500/60 rounded-3xl p-4 shadow-[0_0_35px_rgba(255,46,147,0.4)] flex items-center justify-between gap-3 backdrop-blur-xl relative overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-pink-500/25 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-pink-950/80 border border-pink-400/50 flex items-center justify-center flex-shrink-0 text-pink-400 shadow-[0_0_12px_rgba(255,46,147,0.4)]">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-pink-400">
              <span>Instant Deposit Credited!</span>
            </div>
            <div className="text-lg font-black text-white font-mono mt-0.5 drop-shadow-[0_0_10px_rgba(255,46,147,0.6)]">
              +{currencySymbol}{amount.toFixed(2)} {currency}
            </div>
            {txId && (
              <div className="text-[10px] text-pink-300/60 font-mono">
                Ref: {txId.substring(0, 18)}...
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="p-1.5 rounded-xl text-pink-300/70 hover:text-white hover:bg-pink-950/60 transition-colors cursor-pointer relative z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
