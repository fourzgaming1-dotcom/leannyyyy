import React, { useState } from "react";
import { ServerConfig, TelegramUser } from "../types";
import { api } from "../services/api";
import { X, CreditCard, Sparkles, Shield, AlertCircle, Loader2, ExternalLink } from "lucide-react";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: TelegramUser;
  config: ServerConfig | null;
  initialAmount?: number;
  onDepositSuccess: (amount: number, currency: string, txId?: string) => void;
  openUrl: (url: string) => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
}

const PRESET_AMOUNTS = [5, 10, 20, 30, 50, 100];
const CURRENCIES = ["GBP", "USD", "EUR"];

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  user,
  config,
  initialAmount = 20,
  onDepositSuccess,
  openUrl,
  triggerHaptic,
}) => {
  const [selectedAmount, setSelectedAmount] = useState<number>(initialAmount);
  const [customAmount, setCustomAmount] = useState<string>("");

  React.useEffect(() => {
    if (initialAmount && isOpen) {
      setSelectedAmount(initialAmount);
      setCustomAmount("");
    }
  }, [initialAmount, isOpen]);
  const [selectedCurrency, setSelectedCurrency] = useState<string>("GBP");
  const [isProcessingStripe, setIsProcessingStripe] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeAmount = customAmount ? parseFloat(customAmount) || 0 : selectedAmount;
  const currencySymbol = selectedCurrency === "EUR" ? "€" : selectedCurrency === "USD" ? "$" : "£";

  const handleSelectPreset = (amt: number) => {
    triggerHaptic("light");
    setSelectedAmount(amt);
    setCustomAmount("");
    setErrorMessage(null);
    setCheckoutUrl(null);
  };

  const handleCustomChange = (val: string) => {
    if (/^\d*\.?\d{0,2}$/.test(val)) {
      setCustomAmount(val);
      setSelectedAmount(0);
      setErrorMessage(null);
      setCheckoutUrl(null);
    }
  };

  const handleStripeCheckout = async () => {
    if (activeAmount < 1) {
      setErrorMessage(`Minimum deposit is ${currencySymbol}1.00`);
      triggerHaptic("error");
      return;
    }

    try {
      setIsProcessingStripe(true);
      setErrorMessage(null);
      triggerHaptic("medium");

      const res = await api.createCheckoutSession({
        telegramId: user.id,
        amount: activeAmount,
        currency: selectedCurrency,
        firstName: user.first_name,
        username: user.username,
      });

      if (res.checkoutUrl) {
        setCheckoutUrl(res.checkoutUrl);
        triggerHaptic("light");
        openUrl(res.checkoutUrl);
      } else {
        throw new Error("No checkout URL returned from Stripe");
      }
    } catch (err: any) {
      console.error("Checkout session error:", err);
      setErrorMessage(
        err.message ||
          "Stripe checkout could not be initiated. Please check that STRIPE_SECRET_KEY is configured on your server."
      );
      triggerHaptic("error");
    } finally {
      setIsProcessingStripe(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#090212] border border-pink-500/30 rounded-t-3xl sm:rounded-3xl p-6 shadow-[0_0_50px_rgba(255,46,147,0.25)] overflow-hidden max-h-[90vh] overflow-y-auto relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient pink nebula glow in modal */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-pink-500/20 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-pink-950/70 border border-pink-500/40 flex items-center justify-center text-pink-400 shadow-[0_0_10px_rgba(255,46,147,0.25)]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Deposit via Stripe</h2>
              <p className="text-xs text-pink-300/80">Instant Credit in {selectedCurrency} ({currencySymbol})</p>
            </div>
          </div>
          <button
            id="btn-close-deposit-modal"
            onClick={onClose}
            className="p-1.5 rounded-xl text-pink-300/70 hover:text-white hover:bg-pink-950/60 border border-transparent hover:border-pink-500/30 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency & Amount Selection */}
        <div className="py-4 space-y-4 relative z-10">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-pink-200 uppercase tracking-wider">Choose Currency</label>
              <span className="text-[11px] text-pink-400/80 font-medium">Default: GBP (£)</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((cur) => (
                <button
                  key={cur}
                  type="button"
                  onClick={() => {
                    setSelectedCurrency(cur);
                    triggerHaptic("light");
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    selectedCurrency === cur
                      ? "bg-pink-500/25 border-pink-400 text-pink-100 shadow-[0_0_15px_rgba(255,46,147,0.3)] scale-[1.02]"
                      : "bg-black/60 border-pink-900/40 text-pink-300/70 hover:bg-pink-950/40 hover:text-pink-200"
                  }`}
                >
                  {cur === "GBP" ? "£ GBP" : cur === "USD" ? "$ USD" : "€ EUR"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-pink-200 uppercase tracking-wider block mb-2">
              Select Preset Amount ({currencySymbol})
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {PRESET_AMOUNTS.map((amt) => {
                const isSelected = !customAmount && selectedAmount === amt;
                return (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => handleSelectPreset(amt)}
                    className={`py-2.5 rounded-xl font-mono text-xs font-extrabold border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-gradient-to-r from-pink-500 to-rose-500 border-pink-300 text-white shadow-[0_0_15px_rgba(255,46,147,0.45)] scale-[1.05]"
                        : "bg-black/60 border-pink-900/40 text-pink-200 hover:bg-pink-950/40 hover:border-pink-500/40"
                    }`}
                  >
                    {currencySymbol}{amt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-pink-200 uppercase tracking-wider block mb-1.5">
              Or Enter Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-pink-400 font-mono font-bold text-base">
                {currencySymbol}
              </span>
              <input
                id="input-custom-deposit-amount"
                type="text"
                inputMode="decimal"
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="0.00"
                className="w-full bg-black/80 border border-pink-500/30 rounded-xl pl-8 pr-16 py-3 text-base font-mono text-white placeholder-pink-900 focus:outline-none focus:border-pink-400 focus:shadow-[0_0_15px_rgba(255,46,147,0.3)] transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-pink-300/80">
                {selectedCurrency}
              </span>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Deposit Summary Box */}
          <div className="bg-black/70 border border-pink-500/20 rounded-2xl p-3.5 text-xs space-y-2">
            <div className="flex justify-between text-pink-300/70">
              <span>Deposit Amount</span>
              <span className="font-mono font-bold text-white">
                {currencySymbol}{activeAmount.toFixed(2)} {selectedCurrency}
              </span>
            </div>
            <div className="flex justify-between text-pink-300/70">
              <span>Credit Destination</span>
              <span className="text-pink-400 font-mono font-semibold">
                @{user.username || `tg_${user.id}`}
              </span>
            </div>
            <div className="flex justify-between text-pink-300/70">
              <span>Speed</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-400" /> Instant Reflection
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-3 border-t border-pink-500/20 relative z-10">
          {checkoutUrl && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/40 text-center space-y-2 animate-in fade-in duration-200 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-300 font-bold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Stripe Session Ready ({currencySymbol}{activeAmount.toFixed(2)})</span>
              </div>
              <a
                id="btn-open-stripe-tab"
                href={checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => triggerHaptic("light")}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open Stripe Checkout Tab ↗</span>
              </a>
              <p className="text-[10px] text-emerald-300/70">
                Tap above if your browser blocked the automatic payment window
              </p>
            </div>
          )}

          {/* Main Stripe Button */}
          <button
            id="btn-stripe-checkout-confirm"
            type="button"
            disabled={isProcessingStripe || activeAmount < 1}
            onClick={handleStripeCheckout}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-600 hover:from-pink-400 hover:via-rose-400 hover:to-fuchsia-500 disabled:opacity-50 text-white font-extrabold text-sm shadow-[0_0_25px_rgba(255,46,147,0.4)] active:scale-[0.98] transition-all cursor-pointer"
          >
            {isProcessingStripe ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Connecting to Stripe Checkout...</span>
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4 text-white drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]" />
                <span>
                  Proceed to Stripe Payment ({currencySymbol}{activeAmount.toFixed(2)})
                </span>
              </>
            )}
          </button>

          <p className="text-center text-[11px] text-pink-300/60 pt-1 flex items-center justify-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-pink-400" />
            Official Stripe Checkout • Card, Apple Pay & Google Pay
          </p>
        </div>
      </div>
    </div>
  );
};
