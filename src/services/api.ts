import { UserWallet, ServerConfig, CheckoutSessionResponse, Transaction, GroupItem, GroupPurchaseResponse } from "../types";

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

  async getGroups(telegramId: number): Promise<{ groups: GroupItem[]; purchasedCount: number }> {
    const res = await fetch(`/api/groups?telegramId=${telegramId}`);
    if (!res.ok) throw new Error("Failed to fetch groups");
    return res.json();
  },

  async purchaseGroup(telegramId: number, groupId: string): Promise<GroupPurchaseResponse> {
    const res = await fetch("/api/groups/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, groupId }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to purchase group");
    }
    return data;
  },

  async updateGroupLink(groupId: string, inviteLink: string): Promise<{ success: boolean; groupId: string; inviteLink: string }> {
    const res = await fetch("/api/admin/update-group-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, inviteLink }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to update group link");
    }
    return data;
  },

  async createCheckoutSession(params: {
    telegramId: number;
    amount: number;
    currency: string;
    firstName?: string;
    username?: string;
    groupId?: string;
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
    unlockedGroup?: any;
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
  }
};
