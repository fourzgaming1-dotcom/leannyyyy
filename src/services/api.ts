import {
  UserWallet,
  ServerConfig,
  CheckoutSessionResponse,
  Transaction,
  GroupItem,
  GroupPurchaseResponse,
  GameStatusResponse,
  SpinWheelResponse,
  RouletteBet,
  RouletteSpinResponse,
  RouletteHistoryItem,
  CrossyJumpResponse,
  CrossyCashoutResponse,
  CrossyRunStats,
  CrossyJumpMilestone,
  CrossyStartResponse,
  AdminGroupLinksResponse,
  FlappyStartResponse,
  FlappyGapResponse,
  FlappyCashoutResponse,
  FlappyStats,
} from "../types";

async function parseResponse<T = any>(res: Response, fallbackError = "Request failed"): Promise<T> {
  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${text.slice(0, 100) || fallbackError}`);
    }
    return {} as T;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  async getConfig(): Promise<ServerConfig> {
    const res = await fetch("/api/config");
    return parseResponse<ServerConfig>(res, "Failed to fetch server config");
  },

  async getWallet(telegramId: number, firstName?: string, username?: string): Promise<UserWallet> {
    const params = new URLSearchParams();
    if (firstName) params.set("firstName", firstName);
    if (username) params.set("username", username);
    
    const res = await fetch(`/api/user/${telegramId}?${params.toString()}`);
    return parseResponse<UserWallet>(res, "Failed to fetch user wallet");
  },

  async getGroups(telegramId: number): Promise<{ groups: GroupItem[]; purchasedCount: number }> {
    const res = await fetch(`/api/groups?telegramId=${telegramId}`);
    return parseResponse<{ groups: GroupItem[]; purchasedCount: number }>(res, "Failed to fetch groups");
  },

  async purchaseGroup(telegramId: number, groupId: string): Promise<GroupPurchaseResponse> {
    const res = await fetch("/api/groups/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, groupId }),
    });
    return parseResponse<GroupPurchaseResponse>(res, "Failed to purchase group");
  },

  async updateGroupLink(groupId: string, inviteLink: string): Promise<{ success: boolean; groupId: string; inviteLink: string }> {
    const res = await fetch("/api/admin/update-group-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, inviteLink }),
    });
    return parseResponse<{ success: boolean; groupId: string; inviteLink: string }>(res, "Failed to update group link");
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
    return parseResponse<CheckoutSessionResponse>(res, "Failed to create checkout session");
  },

  async verifySession(
    sessionId: string,
    telegramId: number,
    groupIdOrAmount?: string | number,
    currency?: string,
    groupId?: string
  ): Promise<{
    success: boolean;
    wallet: UserWallet;
    transaction?: Transaction;
    unlockedGroup?: any;
    message: string;
    alreadyCredited?: boolean;
  }> {
    const targetGroupId = typeof groupIdOrAmount === "string" ? groupIdOrAmount : groupId;
    const res = await fetch("/api/stripe/verify-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, telegramId, groupId: targetGroupId }),
    });
    return parseResponse(res, "Failed to verify payment session");
  },

  async getGameStatus(telegramId: number): Promise<GameStatusResponse> {
    const res = await fetch(`/api/game/status?telegramId=${telegramId}`);
    return parseResponse<GameStatusResponse>(res, "Failed to fetch game status");
  },

  async spinWheel(telegramId: number, targetPrizeIndex?: number): Promise<SpinWheelResponse> {
    const res = await fetch("/api/game/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, targetPrizeIndex }),
    });
    return parseResponse<SpinWheelResponse>(res, "Failed to spin wheel");
  },

  async addTestCredit(telegramId: number): Promise<{ success: boolean; wallet: UserWallet; message: string }> {
    const res = await fetch("/api/game/add-test-credit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    return parseResponse(res, "Failed to add test credit");
  },

  async claimGameReward(telegramId: number, prizeType: string): Promise<{
    success: boolean;
    prizeType?: string;
    rewardMessage?: string;
    creditAmount?: number;
    spinsLeft?: number;
    wallet?: UserWallet;
  }> {
    const res = await fetch("/api/game/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, prizeType }),
    });
    return parseResponse(res, "Failed to claim game reward");
  },

  async resetGameSpins(telegramId: number): Promise<{ success: boolean; spinsLeft: number; freeSpins?: number; message: string }> {
    const res = await fetch("/api/game/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    return parseResponse(res, "Failed to reset game spins");
  },

  async getRouletteHistory(): Promise<{ history: RouletteHistoryItem[] }> {
    const res = await fetch("/api/roulette/history");
    return parseResponse<{ history: RouletteHistoryItem[] }>(res, "Failed to fetch roulette history");
  },

  async spinRoulette(telegramId: number, bets: RouletteBet[]): Promise<RouletteSpinResponse> {
    const res = await fetch("/api/roulette/spin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, bets }),
    });
    return parseResponse<RouletteSpinResponse>(res, "Failed to execute roulette spin");
  },

  async getAdminGroupLinks(): Promise<AdminGroupLinksResponse> {
    const res = await fetch("/api/admin/group-links");
    return parseResponse<AdminGroupLinksResponse>(res, "Failed to fetch admin group links");
  },

  async startCrossyRoad(telegramId: number): Promise<CrossyStartResponse> {
    const res = await fetch("/api/crossy-road/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    return parseResponse<CrossyStartResponse>(res, "Failed to start Crossy Road run");
  },

  async crossyRoadJump(telegramId: number, step: number, runId: string): Promise<CrossyJumpResponse> {
    const res = await fetch("/api/crossy-road/jump", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, step, runId }),
    });
    return parseResponse<CrossyJumpResponse>(res, "Failed to process crossy road jump");
  },

  async getCrossyRoadStats(telegramId: number): Promise<{ stats: CrossyRunStats; milestones: CrossyJumpMilestone[] }> {
    const res = await fetch(`/api/crossy-road/stats?telegramId=${telegramId}`);
    return parseResponse<{ stats: CrossyRunStats; milestones: CrossyJumpMilestone[] }>(res, "Failed to fetch crossy road stats");
  },

  async cashoutCrossyRoad(telegramId: number, step: number, runId: string): Promise<CrossyCashoutResponse> {
    const res = await fetch("/api/crossy-road/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, step, runId }),
    });
    return parseResponse<CrossyCashoutResponse>(res, "Failed to cash out");
  },

  async searchMusic(query: string): Promise<{ data: import("../types").DeezerTrack[]; total?: number }> {
    const res = await fetch(`/api/deezer/search?q=${encodeURIComponent(query)}`);
    return parseResponse<{ data: import("../types").DeezerTrack[]; total?: number }>(res, "Failed to search Deezer tracks");
  },

  async getTopMusicCharts(): Promise<{ data: import("../types").DeezerTrack[]; total?: number }> {
    const res = await fetch("/api/deezer/chart");
    return parseResponse<{ data: import("../types").DeezerTrack[]; total?: number }>(res, "Failed to load top chart tracks");
  },

  async resolveMusic(artist: string, title: string): Promise<{ success: boolean; videoId?: string; title?: string; duration?: number }> {
    const res = await fetch(`/api/music/resolve?artist=${encodeURIComponent(artist)}&title=${encodeURIComponent(title)}`);
    return parseResponse(res, "Failed to resolve full song stream");
  },

  async startFlappyBird(telegramId: number): Promise<FlappyStartResponse> {
    const res = await fetch("/api/flappy-bird/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId }),
    });
    return parseResponse<FlappyStartResponse>(res, "Failed to start Flappy Bird flight");
  },

  async flappyBirdGap(telegramId: number, gapNumber: number, runId: string): Promise<FlappyGapResponse> {
    const res = await fetch("/api/flappy-bird/gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, gapNumber, runId }),
    });
    return parseResponse<FlappyGapResponse>(res, "Failed to record gap cleared");
  },

  async crashFlappyBird(telegramId: number, gaps: number, runId: string): Promise<{ success: boolean; message: string; wallet?: UserWallet }> {
    const res = await fetch("/api/flappy-bird/crash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, gaps, runId }),
    });
    return parseResponse(res, "Failed to record crash");
  },

  async cashoutFlappyBird(telegramId: number, gaps: number, runId: string): Promise<FlappyCashoutResponse> {
    const res = await fetch("/api/flappy-bird/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId, gaps, runId }),
    });
    return parseResponse<FlappyCashoutResponse>(res, "Failed to cash out Flappy Bird");
  },

  async getFlappyBirdStats(telegramId: number): Promise<{ success: boolean; stats: FlappyStats }> {
    const res = await fetch(`/api/flappy-bird/stats?telegramId=${telegramId}`);
    return parseResponse<{ success: boolean; stats: FlappyStats }>(res, "Failed to fetch Flappy Bird stats");
  }
};
