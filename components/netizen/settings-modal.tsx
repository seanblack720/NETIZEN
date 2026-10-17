"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Check,
  Eye,
  Lock,
  LogOut,
  Palette,
  Save,
  Sparkles,
  UserRound,
  X,
  LoaderCircle,
  AlertCircle,
} from "lucide-react";

type Preferences = {
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEffects: boolean;
  privateAccount: boolean;
  hideOnlineStatus: boolean;
  autoplayVideos: boolean;
  dataSaver: boolean;
  theme: "light" | "dark" | "system";
};

const DEFAULT_PREFERENCES: Preferences = {
  pushNotifications: true,
  emailNotifications: false,
  soundEffects: true,
  privateAccount: false,
  hideOnlineStatus: false,
  autoplayVideos: true,
  dataSaver: false,
  theme: "system",
};

const STORAGE_KEY = "netizen.preferences";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#1c9d57]" : "bg-[#d5dedb]"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#eef3f0] px-4 py-4 last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef7f1] text-[#1c9d57]">
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#15271d]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#68776f]">
          {description}
        </p>
      </div>

      {children}
    </div>
  );
}

export function SettingsModal({
  onClose,
  onOpenProfileEditor,
}: {
  onClose: () => void;
  onOpenProfileEditor: () => void;
}) {
  const router = useRouter();

  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [prefsSaved, setPrefsSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [proReason, setProReason] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [requestingPro, setRequestingPro] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);

      if (stored) {
        const parsed: unknown = JSON.parse(stored);

        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          const saved = parsed as Partial<Preferences>;

          setPrefs({
            ...DEFAULT_PREFERENCES,
            ...saved,
            theme:
              saved.theme === "light" ||
              saved.theme === "dark" ||
              saved.theme === "system"
                ? saved.theme
                : DEFAULT_PREFERENCES.theme,
          });
        }
      }
    } catch {
      // Ignore corrupt or unavailable storage.
    }
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loggingOut) {
        if (showLogoutConfirm) {
          setShowLogoutConfirm(false);
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, showLogoutConfirm, loggingOut]);

  function updatePref<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    const next = { ...prefs, [key]: value };

    setPrefs(next);

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setPrefsSaved(true);
      setMessage("");

      window.setTimeout(() => setPrefsSaved(false), 1500);
    } catch {
      setPrefsSaved(false);
      setMessage("Your preference changed, but could not be saved on this device.");
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Unable to sign out. Please try again.");
      }

      setShowLogoutConfirm(false);
      onClose();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to sign out. Please try again.",
      );

      setShowLogoutConfirm(false);
    } finally {
      setLoggingOut(false);
    }
  }

  async function requestPro() {
    if (requestingPro) return;

    try {
      setRequestingPro(true);
      setMessage("");

      const response = await fetch("/api/pro-requests", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: proReason }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Could not send your Pro request.",
        );
      }

      setMessage(data?.message || "Your Pro request was sent successfully.");
      setProReason("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not send your Pro request.",
      );
    } finally {
      setRequestingPro(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[70] flex items-stretch justify-center bg-[#102218]/45"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget && !loggingOut) {
            onClose();
          }
        }}
      >
        <div className="h-full w-full overflow-hidden border-0 bg-[#f5f7f4] shadow-none sm:rounded-none">
          <div className="flex items-center justify-between border-b border-[#edf3ef] bg-white px-5 py-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loggingOut}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#5b6b62] transition hover:bg-[#e8efe8] disabled:opacity-50"
                aria-label="Close settings"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>

              <div>
                <h2 className="text-lg font-semibold text-[#15271d]">
                  Settings
                </h2>
                <p className="text-xs text-[#68776f]">
                  Manage your account and preferences.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={loggingOut}
              aria-label="Close settings"
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#5b6b62] transition hover:bg-[#e8efe8] disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="h-[calc(100%-73px)] overflow-y-auto p-4 sm:p-5">
            {(message || prefsSaved) && (
              <p
                role="status"
                className="mb-4 flex items-center gap-2 rounded-xl bg-[#eaf4ed] px-4 py-3 text-sm text-[#204d39]"
              >
                {prefsSaved && (
                  <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
                )}
                {prefsSaved ? "Preference saved." : message}
              </p>
            )}

            <section className="overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-sm">
              <div className="border-b border-[#eef3f0] px-4 py-4">
                <h3 className="text-lg font-semibold text-[#15271d]">
                  Account
                </h3>
              </div>

              <SettingRow
                icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
                title="Profile"
                description="Your public profile, posts and bio."
              >
                <button
                  type="button"
                  onClick={onOpenProfileEditor}
                  className="rounded-xl bg-[#e7f7ed] px-3 py-2 text-xs font-semibold text-[#07843b] transition active:scale-95"
                >
                  Edit
                </button>
              </SettingRow>

              <SettingRow
                icon={<LogOut className="h-5 w-5" aria-hidden="true" />}
                title="Sign out"
                description="End your session on this device."
              >
                <button
                  type="button"
                  onClick={() => {
                    setMessage("");
                    setShowLogoutConfirm(true);
                  }}
                  disabled={loggingOut}
                  className="rounded-xl bg-[#fdecec] px-3 py-2 text-xs font-semibold text-[#c0392b] transition hover:bg-[#fbdcda] active:scale-95 disabled:opacity-50"
                >
                  Sign out
                </button>
              </SettingRow>
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-sm">
              <div className="border-b border-[#eef3f0] px-4 py-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-[#15271d]">
                  <Bell className="h-5 w-5 text-[#1c9d57]" aria-hidden="true" />
                  Notifications
                </h3>
              </div>

              <SettingRow
                icon={<Bell className="h-5 w-5" aria-hidden="true" />}
                title="Push notifications"
                description="Get notified about likes, comments and follows."
              >
                <Toggle
                  label="Push notifications"
                  checked={prefs.pushNotifications}
                  onChange={(next) => updatePref("pushNotifications", next)}
                />
              </SettingRow>

              <SettingRow
                icon={<Save className="h-5 w-5" aria-hidden="true" />}
                title="Email updates"
                description="Weekly summary of what you missed."
              >
                <Toggle
                  label="Email updates"
                  checked={prefs.emailNotifications}
                  onChange={(next) => updatePref("emailNotifications", next)}
                />
              </SettingRow>

              <SettingRow
                icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
                title="In-app sounds"
                description="Play a sound for new activity while Netizen is open."
              >
                <Toggle
                  label="In-app sounds"
                  checked={prefs.soundEffects}
                  onChange={(next) => updatePref("soundEffects", next)}
                />
              </SettingRow>
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-sm">
              <div className="border-b border-[#eef3f0] px-4 py-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-[#15271d]">
                  <Lock className="h-5 w-5 text-[#1c9d57]" aria-hidden="true" />
                  Privacy
                </h3>
              </div>

              <SettingRow
                icon={<Lock className="h-5 w-5" aria-hidden="true" />}
                title="Private account"
                description="Only approved followers can see your posts."
              >
                <Toggle
                  label="Private account"
                  checked={prefs.privateAccount}
                  onChange={(next) => updatePref("privateAccount", next)}
                />
              </SettingRow>

              <SettingRow
                icon={<Eye className="h-5 w-5" aria-hidden="true" />}
                title="Hide online status"
                description="Others won't see when you're active."
              >
                <Toggle
                  label="Hide online status"
                  checked={prefs.hideOnlineStatus}
                  onChange={(next) => updatePref("hideOnlineStatus", next)}
                />
              </SettingRow>
            </section>

            <section className="mt-5 overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-sm">
              <div className="border-b border-[#eef3f0] px-4 py-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-[#15271d]">
                  <Palette className="h-5 w-5 text-[#1c9d57]" aria-hidden="true" />
                  Appearance &amp; data
                </h3>
              </div>

              <div className="border-b border-[#eef3f0] px-4 py-4">
                <p className="text-sm font-semibold text-[#15271d]">Theme</p>
                <p className="mt-0.5 text-xs text-[#68776f]">
                  Choose how Netizen looks on this device.
                </p>

                <div className="mt-3 flex gap-2">
                  {(["light", "dark", "system"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updatePref("theme", option)}
                      aria-pressed={prefs.theme === option}
                      className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize transition active:scale-95 ${
                        prefs.theme === option
                          ? "bg-[#1c9d57] text-white"
                          : "bg-[#f1f5f2] text-[#5f7073]"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              <SettingRow
                icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
                title="Autoplay videos"
                description="Play videos in the feed automatically."
              >
                <Toggle
                  label="Autoplay videos"
                  checked={prefs.autoplayVideos}
                  onChange={(next) => updatePref("autoplayVideos", next)}
                />
              </SettingRow>

              <SettingRow
                icon={<Eye className="h-5 w-5" aria-hidden="true" />}
                title="Data saver"
                description="Load fewer images to save mobile data."
              >
                <Toggle
                  label="Data saver"
                  checked={prefs.dataSaver}
                  onChange={(next) => updatePref("dataSaver", next)}
                />
              </SettingRow>
            </section>

            <section className="mt-5 rounded-3xl border border-[#cfe4d5] bg-white p-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-[#15271d]">
                <Sparkles className="h-5 w-5 text-[#1267d6]" aria-hidden="true" />
                Netizen Pro
              </h3>

              <p className="mt-1 text-sm text-[#68776f]">
                Apply for a blue tick. It will be R200/month once payments are enabled.
              </p>

              <textarea
                value={proReason}
                onChange={(event) => setProReason(event.target.value)}
                placeholder="Tell us why you need Pro"
                rows={3}
                className="mt-4 w-full rounded-xl border border-[#dfe9e2] px-3 py-2.5 text-sm outline-none transition focus:border-[#1267d6]"
              />

              <button
                type="button"
                onClick={requestPro}
                disabled={requestingPro}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[#1267d6] px-5 py-3 text-sm font-semibold text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {requestingPro && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                {requestingPro ? "Sending request..." : "Request blue tick"}
              </button>
            </section>

            <p className="mt-6 text-center text-xs text-[#9aa8a1]">
              Netizen · Settings v1.0
            </p>
          </div>
        </div>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102218]/55 px-4 py-6 backdrop-blur-[2px]"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loggingOut
            ) {
              setShowLogoutConfirm(false);
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
            className="w-full max-w-sm rounded-3xl border border-[#dfe9e2] bg-white p-6 shadow-2xl"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdecec] text-[#c0392b]">
              <LogOut className="h-6 w-6" aria-hidden="true" />
            </div>

            <h3
              id="logout-dialog-title"
              className="mt-4 text-center text-xl font-bold text-[#15271d]"
            >
              Sign out of Netizen?
            </h3>

            <p
              id="logout-dialog-description"
              className="mt-2 text-center text-sm leading-6 text-[#68776f]"
            >
              Are you sure you want to sign out? You will need to log in again
              to access your account.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
                className="rounded-xl border border-[#dfe9e2] bg-white px-4 py-3 text-sm font-semibold text-[#52635a] transition hover:bg-[#f5f7f4] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c0392b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a93226] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loggingOut ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Signing out...
                  </>
                ) : (
                  "Yes, sign out"
                )}
              </button>
            </div>

            {message && !loggingOut && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 text-sm text-[#c0392b]"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{message}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
