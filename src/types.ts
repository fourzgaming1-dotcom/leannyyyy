export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface Transaction {
  id: string;
  telegramId: number;
  type: 'deposit' | 'withdrawal' | 'adjustment' | 'purchase';
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  description: string;
  createdAt: string;
}

export interface UserWallet {
  telegramId: number;
  username?: string;
  firstName: string;
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  transactions: Transaction[];
  purchasedGroups?: string[];
}

export interface GroupItem {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  tag?: string;
  isPurchased?: boolean;
  inviteLink?: string;
  defaultLink?: string;
}

export interface GroupPurchaseResponse {
  success: boolean;
  group: GroupItem;
  inviteLink: string;
  wallet: UserWallet;
  message: string;
}

export interface ServerConfig {
  hasStripeKey: boolean;
  stripeMode: 'live' | 'test' | 'simulated';
  appUrl: string;
  webhookConfigured: boolean;
}

export interface CheckoutSessionResponse {
  checkoutUrl?: string;
  sessionId?: string;
  simulated?: boolean;
  error?: string;
}

export type NavTab = 'home' | 'bundles' | 'groups' | 'game' | 'music' | 'wallet';

export interface DeezerTrack {
  id: number;
  title: string;
  title_short?: string;
  artist: {
    id: number;
    name: string;
    picture_medium?: string;
  };
  album: {
    id: number;
    title: string;
    cover_small?: string;
    cover_medium?: string;
    cover_big?: string;
  };
  preview: string;
  duration: number;
  link?: string;
  youtubeId?: string;
  isFullSong?: boolean;
}

export interface GameStatusResponse {
  spinsLeft: number;
  freeSpins: number;
  spinCost: number;
  balance: number;
  canSpin: boolean;
  totalWon: number;
  totalSpins: number;
  totalXp: number;
  vouchers: string[];
  lastSpin?: string;
  sectors?: WheelSectorItem[];
}

export interface WheelSectorItem {
  id: string;
  label: string;
  shortLabel: string;
  sub: string;
  type: 'group' | 'credit' | 'xp' | 'spin' | 'voucher' | 'mystery';
  groupId?: string;
  groupName?: string;
  amount?: number;
  xp?: number;
  code?: string;
  color: string;
  textColor?: string;
  weight: number;
}

export interface SpinWheelResponse {
  success: boolean;
  prizeIndex: number;
  prize: WheelSectorItem;
  usedFreeSpin: boolean;
  freeSpinsLeft: number;
  totalWon: number;
  totalXp: number;
  totalSpins: number;
  creditWon?: number;
  inviteLink?: string;
  groupName?: string;
  rewardMessage: string;
  wallet: UserWallet;
}

export interface GameClaimResponse {
  success: boolean;
  prizeType?: string;
  rewardMessage?: string;
  creditAmount?: number;
  spinsLeft?: number;
  wallet?: UserWallet;
}

export type RouletteBetType =
  | 'straight'
  | 'red'
  | 'black'
  | 'even'
  | 'odd'
  | 'low'
  | 'high'
  | 'dozen1'
  | 'dozen2'
  | 'dozen3'
  | 'green';

export interface RouletteBet {
  type: RouletteBetType;
  number?: number;
  amount: number;
  won?: boolean;
  payout?: number;
}

export interface RouletteHistoryItem {
  number: number;
  color: 'red' | 'black' | 'green';
  timestamp: string;
}

export interface RouletteSpinResponse {
  success: boolean;
  winningNumber: number;
  winningColor: 'red' | 'black' | 'green';
  totalBet: number;
  totalPayout: number;
  netProfit: number;
  isWin: boolean;
  bets: RouletteBet[];
  wallet: UserWallet;
  history: RouletteHistoryItem[];
}

export interface CrossyJumpMilestone {
  step: number;
  label: string;
  amount: number;
  name: string;
}

export interface CrossyStartResponse {
  success: boolean;
  runId: string;
  fee: number;
  wallet: UserWallet;
  message: string;
}

export interface CrossyJumpResponse {
  success: boolean;
  step: number;
  amountEarned: number;
  totalRunEarnings: number;
  wallet: UserWallet;
  message: string;
  ballerGroupUnlocked?: boolean;
  ballerInviteLink?: string;
}

export interface CrossyCashoutResponse {
  success: boolean;
  step: number;
  amountCashedOut: number;
  wallet: UserWallet;
  transaction?: Transaction;
  message: string;
}

export interface CrossyRunStats {
  highScoreLane: number;
  totalEarnings: number;
  totalRuns: number;
}

export interface AdminGroupLinksResponse {
  success: boolean;
  groupLinks: Record<string, string>;
  groups: {
    id: string;
    name: string;
    price: number;
    currency: string;
    description: string;
    defaultLink: string;
    currentLink: string;
  }[];
}

export interface FlappyStartResponse {
  success: boolean;
  runId: string;
  fee: number;
  wallet: UserWallet;
  message: string;
}

export interface FlappyGapResponse {
  success: boolean;
  gaps: number;
  pot: number;
  isRestZone1: boolean;
  isRestZone2: boolean;
  canCashout: boolean;
  ballerGroupUnlocked?: boolean;
  ballerInviteLink?: string;
  wallet: UserWallet;
  message: string;
}

export interface FlappyCashoutResponse {
  success: boolean;
  gaps: number;
  amountCashedOut: number;
  wallet: UserWallet;
  ballerUnlocked?: boolean;
  ballerInviteLink?: string;
  transaction?: Transaction;
  message: string;
}

export interface FlappyStats {
  highScoreGaps: number;
  totalEarnings: number;
  totalRuns: number;
  ballerUnlocked: boolean;
}

