import React, { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Key,
  CheckCircle2,
  ExternalLink,
  Save,
  AlertCircle,
  X,
  ShieldCheck,
  Sparkles,
  Loader2,
  Copy,
  Info,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";

interface AdminGroupLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
  triggerHaptic: (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => void;
  onLinksUpdated?: () => void;
}

interface GroupEntry {
  id: string;
  name: string;
  price: number;
  currency: string;
  description: string;
  defaultLink: string;
  currentLink: string;
}

export const AdminGroupLinksModal: React.FC<AdminGroupLinksModalProps> = ({
  isOpen,
  onClose,
  triggerHaptic,
  onLinksUpdated,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [groups, setGroups] = useState<GroupEntry[]>([]);
  const [editingLinks, setEditingLinks] = useState<Record<string, string>>({});
  const [savingGroupId, setSavingGroupId] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Load group links
  const loadGroupLinks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminGroupLinks();
      if (data && data.groups) {
        setGroups(data.groups);
        const map: Record<string, string> = {};
        data.groups.forEach((g) => {
          map[g.id] = g.currentLink || g.defaultLink;
        });
        setEditingLinks(map);
      }
    } catch (err) {
      console.error("Failed to load admin group links:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadGroupLinks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Owner PIN is strictly 7777
    if (pinInput.trim() === "7777") {
      setIsAuthenticated(true);
      setPinError(false);
      triggerHaptic("success");
    } else {
      setPinError(true);
      triggerHaptic("error");
    }
  };

  const handleSaveLink = async (groupId: string) => {
    const link = (editingLinks[groupId] || "").trim();
    if (!link) {
      triggerHaptic("warning");
      return;
    }

    try {
      setSavingGroupId(groupId);
      triggerHaptic("medium");
      const res = await api.updateGroupLink(groupId, link);
      triggerHaptic("success");
      setSaveSuccessMsg(`Saved link for ${groupId}!`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);

      // Refresh groups list
      await loadGroupLinks();
      if (onLinksUpdated) onLinksUpdated();
    } catch (err: any) {
      console.error("Failed to save link:", err);
      triggerHaptic("error");
    } finally {
      setSavingGroupId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-in fade-in overflow-y-auto">
      <div className="w-full max-w-lg bg-[#0e021a] border-2 border-yellow-500/60 rounded-3xl p-5 shadow-[0_0_60px_rgba(250,204,21,0.35)] relative my-8 space-y-4">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-pink-300 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-yellow-500 to-amber-600 p-0.5 shadow flex-shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-[#140024] flex items-center justify-center text-yellow-300">
              <Key className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-extrabold text-white text-lg">
                Owner: Group Links Manager
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-yellow-950 border border-yellow-400/40 text-[9px] font-black text-yellow-300 uppercase">
                Private Admin
              </span>
            </div>
            <p className="text-xs text-pink-200/70">
              Configure real Telegram invite links sent to customers upon payment.
            </p>
          </div>
        </div>

        {/* Success Alert Banner */}
        {saveSuccessMsg && (
          <div className="p-3 rounded-2xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{saveSuccessMsg} Customers will now receive this link automatically.</span>
          </div>
        )}

        {/* PIN Authentication Screen if not unlocked */}
        {!isAuthenticated ? (
          <form onSubmit={handlePinSubmit} className="p-6 rounded-3xl bg-[#090114]/90 border border-yellow-500/30 text-center space-y-4 shadow-[0_0_30px_rgba(250,204,21,0.15)]">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-yellow-950/90 border border-yellow-400/50 flex items-center justify-center text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.3)]">
              <Lock className="w-7 h-7" />
            </div>
            <div>
              <h4 className="font-black text-white text-base tracking-tight">Owner Access Required</h4>
              <p className="text-xs text-pink-200/80 mt-1 max-w-xs mx-auto">
                Enter your secret 4-digit owner PIN to access and manage real customer invite links.
              </p>
            </div>

            <div className="max-w-xs mx-auto space-y-2">
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                placeholder="Enter 4-digit PIN"
                className="w-full bg-[#18002b] border-2 border-yellow-500/50 rounded-2xl px-4 py-3.5 text-center text-xl font-mono tracking-widest text-white placeholder-pink-400/40 focus:outline-none focus:border-yellow-400 shadow-inner"
              />
              {pinError && (
                <p className="text-xs text-rose-400 font-bold animate-shake">Incorrect PIN. Please try again.</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full max-w-xs mx-auto py-3.5 px-5 rounded-2xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(250,204,21,0.6)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border-2 border-yellow-300/80 select-none"
            >
              <Unlock className="w-4 h-4 text-black flex-shrink-0" />
              <span className="text-black font-black tracking-wider text-xs sm:text-sm">UNLOCK ADMIN PANEL</span>
              <ArrowRight className="w-4 h-4 text-black flex-shrink-0" />
            </button>
          </form>
        ) : (
          /* Authenticated: List of All 9 Groups with custom link input */
          <div className="space-y-4">
            <div className="p-3 rounded-2xl bg-black/70 border border-yellow-500/30 flex items-start gap-2.5 text-xs text-pink-200/90">
              <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white">How it works:</p>
                <p className="text-[11px] text-pink-200/80 leading-snug mt-0.5">
                  Paste your actual Telegram group invite link below (from Telegram: <em>Group Settings → Invite Links → Create Link</em>). When a client pays via Stripe or Wallet, the Mini App displays this link with a <strong>"Join on Telegram ↗"</strong> button and delivers it via the Bot!
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-pink-300/60 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading groups...</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                {groups.map((group) => {
                  const currentEdit = editingLinks[group.id] || "";
                  const isSaving = savingGroupId === group.id;

                  return (
                    <div
                      key={group.id}
                      className="p-3.5 rounded-2xl bg-black/60 border border-white/10 hover:border-yellow-500/40 transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                          <h4 className="font-extrabold text-white text-xs">
                            {group.name}
                          </h4>
                          <span className="text-[10px] text-pink-300/60 font-mono">
                            (£{group.price})
                          </span>
                        </div>

                        {group.currentLink && (
                          <a
                            href={group.currentLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-yellow-300 hover:text-white font-bold flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <span>Test Link</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentEdit}
                          onChange={(e) =>
                            setEditingLinks((prev) => ({
                              ...prev,
                              [group.id]: e.target.value,
                            }))
                          }
                          placeholder="Paste https://t.me/+... or https://t.me/joinchat/..."
                          className="flex-1 bg-[#150024] border border-white/15 focus:border-yellow-400 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-pink-400/30 focus:outline-none transition-colors"
                        />

                        <button
                          onClick={() => handleSaveLink(group.id)}
                          disabled={isSaving}
                          className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(250,204,21,0.4)] active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
                        >
                          {isSaving ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={onClose}
                className="py-2.5 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-pink-200 font-bold text-xs cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
