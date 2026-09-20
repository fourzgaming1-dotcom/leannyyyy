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
  type: 'deposit' | 'withdrawal' | 'adjustment';
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
