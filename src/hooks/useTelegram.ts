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
    id: 8570354008,
    first_name: "sxnti",
    username: "imbashing",
    is_premium: true,
  },
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

// Resolve the active Telegram or visitor identity
function resolveInitialUser(): TelegramUser {
  if (typeof window === "undefined") {
    return {
      id: 100001,
      first_name: "VIP Member",
      username: "",
      is_premium: false,
    };
  }

  // 1. Direct WebApp user object from Telegram client
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (tgUser && tgUser.id) {
    return tgUser;
  }

  // 2. Parse initData query string if present
  try {
    const rawInitData = window.Telegram?.WebApp?.initData;
    if (rawInitData) {
      const searchParams = new URLSearchParams(rawInitData);
      const userStr = searchParams.get("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed && parsed.id) return parsed;
      }
    }
  } catch (e) {}

  // 3. Parse URL hash (Telegram WebApp often loads with #tgWebAppData=...)
  try {
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash);
      const tgWebAppData = hashParams.get("tgWebAppData") || hash;
      const innerParams = new URLSearchParams(tgWebAppData);
      const userStr = innerParams.get("user");
      if (userStr) {
        const parsed = JSON.parse(userStr);
        if (parsed && parsed.id) return parsed;
      }
    }
  } catch (e) {}

  // 4. URL query parameters (e.g. ?tg_id=... from return redirect)
  const urlParams = new URLSearchParams(window.location.search);
  const urlTgId = urlParams.get("tg_id") || urlParams.get("telegramId");
  if (urlTgId) {
    const idNum = parseInt(urlTgId, 10);
    if (idNum && !isNaN(idNum) && idNum > 0) {
      const matchDemo = DEMO_USERS.find((u) => u.id === idNum);
      if (matchDemo) return matchDemo;
      const firstName = urlParams.get("first_name") || `Member ${idNum.toString().slice(-4)}`;
      const username = urlParams.get("username") || "";
      return {
        id: idNum,
        first_name: firstName,
        username,
        is_premium: true,
      };
    }
  }

  // 5. User explicitly selected in demo account switcher
  const savedUser = localStorage.getItem("tma_active_demo_user");
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.id) {
        return parsed;
      }
    } catch {}
  }

  // 6. Each separate browser visitor gets their OWN persistent unique guest ID
  // NEVER default everyone to sxnti (8570354008) so users never cross-share wallets or links!
  const guestSaved = localStorage.getItem("tma_unique_guest_user");
  if (guestSaved) {
    try {
      const parsed = JSON.parse(guestSaved);
      if (parsed && parsed.id) return parsed;
    } catch {}
  }

  const generatedId = Math.floor(100000000 + Math.random() * 899999999);
  const newGuest: TelegramUser = {
    id: generatedId,
    first_name: `Member ${generatedId.toString().slice(-4)}`,
    username: "",
    is_premium: false,
  };
  localStorage.setItem("tma_unique_guest_user", JSON.stringify(newGuest));
  return newGuest;
}

export function useTelegram() {
  const [isTelegram, setIsTelegram] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return Boolean(window.Telegram?.WebApp?.initDataUnsafe?.user?.id);
    }
    return false;
  });

  const [currentUser, setCurrentUser] = useState<TelegramUser>(resolveInitialUser);

  const [colorScheme, setColorScheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.colorScheme) {
      return window.Telegram.WebApp.colorScheme;
    }
    return "dark";
  });

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand();
      } catch (err) {
        console.warn("Telegram WebApp initialization warning:", err);
      }

      // Check if user is now available via Telegram SDK
      if (tg.initDataUnsafe?.user?.id) {
        setIsTelegram(true);
        setCurrentUser(tg.initDataUnsafe.user);
        if (tg.colorScheme) {
          setColorScheme(tg.colorScheme);
        }
        return;
      }

      // Fallback check if initData is parseable
      if (tg.initData) {
        try {
          const searchParams = new URLSearchParams(tg.initData);
          const userStr = searchParams.get("user");
          if (userStr) {
            const parsed = JSON.parse(userStr);
            if (parsed && parsed.id) {
              setIsTelegram(true);
              setCurrentUser(parsed);
              return;
            }
          }
        } catch {}
      }
    }

    // Outside Telegram WebApp: keep unique individual visitor ID
    setIsTelegram(false);
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

  const openUrl = useCallback((rawUrl: string) => {
    if (!rawUrl) return;
    const url = rawUrl.trim();
    const tg = window.Telegram?.WebApp;

    const isTelegramLink =
      url.startsWith("https://t.me/") ||
      url.startsWith("http://t.me/") ||
      url.startsWith("t.me/") ||
      url.startsWith("tg://");

    if (tg) {
      if (isTelegramLink && typeof tg.openTelegramLink === "function") {
        try {
          const fullTelegramUrl = url.startsWith("t.me/") ? `https://${url}` : url;
          tg.openTelegramLink(fullTelegramUrl);
          return;
        } catch (err) {
          console.warn("Telegram openTelegramLink failed, trying external openLink:", err);
        }
      }

      if (typeof tg.openLink === "function") {
        try {
          tg.openLink(url);
          return;
        } catch (err) {
          console.warn("Telegram openLink error, falling back to window:", err);
        }
      }
    }

    try {
      const opened = window.open(url, "_blank");
      if (!opened) {
        window.location.href = url;
      }
    } catch {
      try {
        window.location.href = url;
      } catch (e) {
        console.error("Failed to redirect to URL:", e);
      }
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
