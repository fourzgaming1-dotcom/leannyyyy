import { useState, useEffect, useCallback } from "react";
import { TelegramUser } from "../types";

// Telegram WebApp window type
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe: {
          query_id?: string;
          user?: TelegramUser;
          receiver?: TelegramUser;
          start_param?: string;
          auth_date?: string;
          hash?: string;
        };
        themeParams: {
          bg_color?: string;
          text_color?: string;
          hint_color?: string;
          link_color?: string;
          button_color?: string;
          button_text_color?: string;
          secondary_bg_color?: string;
        };
        colorScheme?: "light" | "dark";
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
        headerColor: string;
        backgroundColor: string;
        isClosingConfirmationEnabled: boolean;
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
        openTelegramLink: (url: string) => void;
        HapticFeedback: {
          impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
          notificationOccurred: (type: "error" | "success" | "warning") => void;
          selectionChanged: () => void;
        };
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          isProgressVisible: boolean;
          setText: (text: string) => void;
          onClick: (fn: () => void) => void;
          offClick: (fn: () => void) => void;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
        };
      };
    };
  }
}

// Fallback live profiles for browser preview
export const DEMO_USERS: TelegramUser[] = [
  {
    id: 100001,
    first_name: "VIP Member",
    username: "vip_member",
    is_premium: true,
  },
  {
    id: 100002,
    first_name: "Oshae",
    username: "oshae_dev",
    is_premium: true,
  },
];

// Audio chime using Web Audio API for deposit celebration feedback
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    // Nice pleasant two-tone chime
    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(now);
    osc1.stop(now + 0.45);
  } catch (e) {
    // Audio might be blocked before first user interaction
  }
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState(false);
  const [currentUser, setCurrentUser] = useState<TelegramUser>(DEMO_USERS[0]);
  const [colorScheme, setColorScheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg && tg.initDataUnsafe?.user) {
      setIsTelegram(true);
      setCurrentUser(tg.initDataUnsafe.user);
      if (tg.colorScheme) {
        setColorScheme(tg.colorScheme);
      }
      try {
        tg.ready();
        tg.expand();
      } catch (err) {
        console.warn("Telegram WebApp initialization warning:", err);
      }
    } else {
      setIsTelegram(false);
      // Retrieve saved user from localStorage if present and valid
      const savedUser = localStorage.getItem("tma_active_demo_user");
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id && parsed.id !== 84920194 && parsed.id !== 987654321) {
            setCurrentUser(parsed);
          } else {
            setCurrentUser(DEMO_USERS[0]);
            localStorage.removeItem("tma_active_demo_user");
          }
        } catch {
          setCurrentUser(DEMO_USERS[0]);
        }
      } else {
        setCurrentUser(DEMO_USERS[0]);
      }
    }
  }, []);

  const switchDemoUser = useCallback((user: TelegramUser) => {
    setCurrentUser(user);
    localStorage.setItem("tma_active_demo_user", JSON.stringify(user));
  }, []);

  const triggerHaptic = useCallback((type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
    const tg = window.Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === "success" || type === "warning" || type === "error") {
        tg.HapticFeedback.notificationOccurred(type);
      } else {
        tg.HapticFeedback.impactOccurred(type);
      }
    }
    if (type === "success") {
      playSuccessChime();
    }
  }, []);

  const openUrl = useCallback((url: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg && typeof tg.openLink === "function") {
      try {
        tg.openLink(url);
        return;
      } catch (err) {
        console.warn("Telegram openLink error, falling back to window:", err);
      }
    }

    try {
      // In browser/iframe, opening in a new tab allows Stripe Checkout to load safely without frame restrictions
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) {
        window.location.href = url;
      }
    } catch {
      window.location.href = url;
    }
  }, []);

  return {
    isTelegram,
    user: currentUser,
    colorScheme,
    switchDemoUser,
    triggerHaptic,
    openUrl,
    webApp: typeof window !== "undefined" ? window.Telegram?.WebApp : undefined,
  };
}
