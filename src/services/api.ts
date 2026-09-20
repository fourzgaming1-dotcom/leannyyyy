import { UserWallet, ServerConfig, CheckoutSessionResponse, Transaction } from "../types";

export const api = {
  async getConfig(): Promise<ServerConfig> {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error("Failed to fetch server config");
    return res.json();
  },

  async getWallet(telegramId: number, firstName?: string, username?: string): Promise<UserWallet> {
    const params = new URLSearchParams();
    if (firstName) params.set("firstName", firstName);
    if (username) params.set("username", username);
    
    const res = await fetch(`/api/user/${telegramId}?${params.toString()}`);
    if (!res.ok) throw new Error("Failed to fetch user wallet");
    return res.json();
  },

  async createCheckoutSession(params: {
    telegramId: number;
    amount: number;
    currency: string;
    firstName?: string;
    username?: string;
  }): Promise<CheckoutSessionResponse> {
    const res = await fetch("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Checkout creation failed" }));
      throw new Error(err.error || "Failed to create checkout session");
    }
    return res.json();
  },

  async verifySession(sessionId: string, telegramId: number, amount?: number, currency?: string): Promise<{
    success: boolean;
    wallet: UserWallet;
    transaction?: Transaction;
    message: string;
    alreadyCredited?: boolean;
  }> {
    const res = await fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, telegramId, amount, currency }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Verification failed" }));
      throw new Error(err.error || "Failed to verify payment session");
    }
    return res.json();
  },

  async testDeposit(telegramId: number, amount: number, currency: string = "GBP"): Promise<{
    success: boolean;
    wallet: UserWallet;
    transaction: Transaction;
    message: string;
  }> {
    const res = await fetch("/api/wallet/test-deposit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, amount, currency }),
    });
    if (!res.ok) throw new Error("Test deposit failed");
    return res.json();
  }
};
