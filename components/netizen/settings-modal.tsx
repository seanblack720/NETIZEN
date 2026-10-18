"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BadgeCheck,
  Bookmark,
  Check,
  ChevronRight,
  FileText,
  LoaderCircle,
  LogOut,
  Moon,
  Pencil,
  UserRound,
} from "lucide-react";

const MODE_KEY = "netizen-ui-mode"; // same key the register page writes
const LEGACY_PREFS_KEY = "netizen.preferences"; // kept in sync in case other code reads it

/* ------------------------------------------------------------------ */
/* Small building blocks                                               */
/* ------------------------------------------------------------------ */
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

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6 first:mt-0">
      <h3 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#68776f]">{title}</h3>
      <div className="overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-sm">{children}</div>
    </section>
  );
}

type RowTone = "green" | "blue" | "red";

const TONE: Record<RowTone, string> = {
  green: "bg-[#eef7f1] text-[#1c9d57]",
  blue: "bg-[#e8f0fd] text-[#1267d6]",
  red: "bg-[#fdecec] text-[#c0392b]",
};

function Row({
  icon,
  title,
  description,
  tone = "green",
  onClick,
  disabled,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  tone?: RowTone;
  onClick?: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  const content = (
    <>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${TONE[tone]}`}>{icon}</span>
      <span className="min-w-0 flex-1 text-left">
        <span className={`block text-sm font-semibold ${tone === "red" ? "text-[#c0392b]" : "text-[#15271d]"}`}>
          {title}
        </span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-[#68776f]">{description}</span>}
      </span>
      {children}
    </>
  );

  const base = "flex w-full items-center gap-4 border-b border-[#eef3f0] px-4 py-4 last:border-b-0";

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`${base} transition hover:bg-[#f7faf8] active:bg-[#eef3f0] disabled:opacity-60`}
      >
        {content}
        <ChevronRight className="h-5 w-5 shrink-0 text-[#b3c0b9]" aria-hidden="true" />
      </button>
    );
  }

  return <div className={base}>{content}</div>;
}

/** Centered dialog rendered in a portal so no parent transform/filter can break `fixed`. */
function Dialog({
  labelledBy,
  onBackdrop,
  children,
}: {
  labelledBy: string;
  onBackdrop: () => void;
  children: React.ReactNode;
}) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#102218]/55 px-4 py-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onBackdrop();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="w-full max-w-sm rounded-3xl border border-[#dfe9e2] bg-white p-6 shadow-2xl"
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */
export function SettingsModal({
  onClose,
  onOpenProfileEditor,
  onOpenProfile,
  onOpenSavedPosts,
  onOpenTerms,
}: {
  onClose: () => void;
  onOpenProfileEditor: () => void;
  /** Optional: view your own profile. Falls back to the profile editor. */
  onOpenProfile?: () => void;
  /** Optional: falls back to router.push("/saved") */
  onOpenSavedPosts?: () => void;
  /** Optional: falls back to router.push("/terms") */
  onOpenTerms?: () => void;
}) {
  const router = useRouter();

  const [darkMode, setDarkMode] = useState(false);

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const [showPremium, setShowPremium] = useState(false);
  const [proReason, setProReason] = useState("");
  const [requestingPro, setRequestingPro] = useState(false);
  const [proSent, setProSent] = useState(false);
  const [proMessage, setProMessage] = useState("");
  const [proError, setProError] = useState("");

  /* ---- initial dark mode ---- */
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MODE_KEY);
      if (stored === "dark" || stored === "light") {
        setDarkMode(stored === "dark");
        return;
      }
    } catch {
      /* ignore */
    }
    setDarkMode(document.documentElement.classList.contains("dark"));
  }, []);

  /* ---- lock body scroll ---- */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* ---- Escape: closes the top-most layer ---- */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || loggingOut) return;
      if (showLogoutConfirm) setShowLogoutConfirm(false);
      else if (showPremium) setShowPremium(false);
      else onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, showLogoutConfirm, showPremium, loggingOut]);

  /* ---- dark mode ---- */
  function toggleDarkMode(next: boolean) {
    setDarkMode(next);
    const mode = next ? "dark" : "light";

    document.documentElement.classList.toggle("dark", next);
    document.documentElement.dataset.theme = mode;

    try {
      window.localStorage.setItem(MODE_KEY, mode);

      const legacy = window.localStorage.getItem(LEGACY_PREFS_KEY);
      const parsed = legacy ? JSON.parse(legacy) : {};
      window.localStorage.setItem(
        LEGACY_PREFS_KEY,
        JSON.stringify({ ...(parsed && typeof parsed === "object" ? parsed : {}), theme: mode }),
      );
    } catch {
      /* storage unavailable, ignore */
    }
  }

  /* ---- logout ---- */
  async function postSignOut(withJsonBody: boolean) {
    return fetch("/api/auth/sign-out", {
      method: "POST",
      credentials: "include",
      ...(withJsonBody
        ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) }
        : {}),
    });
  }

  async function handleLogout() {
    if (loggingOut) return;

    setLoggingOut(true);
    setLogoutError("");

    try {
      // better-auth rejects a JSON request with an empty body, so send "{}".
      let response = await postSignOut(true);

      // Fallback: some setups only accept a plain POST with no body.
      if (!response.ok && response.status !== 401) {
        response = await postSignOut(false);
      }

      // 401 means the session is already gone, which is what we want anyway.
      if (!response.ok && response.status !== 401) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || `Sign out failed (${response.status}). Please try again.`);
      }

      // Full navigation so the login page loads with fresh cookies/session state.
      window.location.replace("/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLogoutError(
        error instanceof Error ? error.message : "Unable to sign out. Check your connection and try again.",
      );
      setLoggingOut(false);
    }
  }

  /* ---- premium request ---- */
  async function requestPro() {
    if (requestingPro) return;

    setRequestingPro(true);
    setProError("");

    try {
      const response = await fetch("/api/pro-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: proReason }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Could not send your request.");
      }

      setProMessage(data?.message || "Your request was sent. We will review it soon.");
      setProReason("");
      setProSent(true);
    } catch (error) {
      setProError(error instanceof Error ? error.message : "Could not send your request.");
    } finally {
      setRequestingPro(false);
    }
  }

  function openPremium() {
    setProSent(false);
    setProError("");
    setProMessage("");
    setShowPremium(true);
  }

  return (
    <>
      <div className="fixed inset-0 z-[70] flex flex-col bg-[#f5f7f4]">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-[#edf3ef] bg-white px-4 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            disabled={loggingOut}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#5b6b62] transition hover:bg-[#e8efe8] disabled:opacity-50"
            aria-label="Close settings"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-semibold text-[#15271d]">Settings</h2>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-5">
          <div className="mx-auto w-full max-w-xl">
            <SectionCard title="Account">
              <Row
                icon={<UserRound className="h-5 w-5" aria-hidden="true" />}
                title="My profile"
                description="View your public profile, posts and bio."
                onClick={onOpenProfile ?? onOpenProfileEditor}
              />
              <Row
                icon={<Bookmark className="h-5 w-5" aria-hidden="true" />}
                title="Saved posts"
                description="Posts you have bookmarked."
                onClick={() => (onOpenSavedPosts ? onOpenSavedPosts() : router.push("/saved"))}
              />
            </SectionCard>

            <SectionCard title="Personal details & appearance">
              <Row
                icon={<Pencil className="h-5 w-5" aria-hidden="true" />}
                title="Edit profile"
                description="Update your name, photo and details."
                onClick={onOpenProfileEditor}
              />
              <Row
                icon={<Moon className="h-5 w-5" aria-hidden="true" />}
                title="Dark mode"
                description="Switch between bright and dark on this device."
              >
                <Toggle label="Dark mode" checked={darkMode} onChange={toggleDarkMode} />
              </Row>
            </SectionCard>

            <SectionCard title="More">
              <Row
                icon={<BadgeCheck className="h-5 w-5" aria-hidden="true" />}
                tone="blue"
                title="Premium Verified"
                description="Apply for a blue tick."
                onClick={openPremium}
              />
              <Row
                icon={<FileText className="h-5 w-5" aria-hidden="true" />}
                title="Terms & Conditions"
                description="How Netizen works and what we expect from you."
                onClick={() => (onOpenTerms ? onOpenTerms() : router.push("/terms"))}
              />
              <Row
                icon={<LogOut className="h-5 w-5" aria-hidden="true" />}
                tone="red"
                title="Log out"
                description="Sign out of Netizen on this device."
                onClick={() => {
                  setLogoutError("");
                  setShowLogoutConfirm(true);
                }}
                disabled={loggingOut}
              />
            </SectionCard>

            <p className="mt-8 text-center text-xs text-[#9aa8a1]">Netizen · Settings v1.0</p>
          </div>
        </div>
      </div>

      {/* Logout confirmation */}
      {showLogoutConfirm && (
        <Dialog
          labelledBy="logout-dialog-title"
          onBackdrop={() => {
            if (!loggingOut) setShowLogoutConfirm(false);
          }}
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#fdecec] text-[#c0392b]">
            <LogOut className="h-6 w-6" aria-hidden="true" />
          </div>

          <h3 id="logout-dialog-title" className="mt-4 text-center text-xl font-bold text-[#15271d]">
            Sign out of Netizen?
          </h3>

          <p className="mt-2 text-center text-sm leading-6 text-[#68776f]">
            Are you sure you want to sign out? You will need to log in again to access your account.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c0392b] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#a93226] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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

            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              disabled={loggingOut}
              className="rounded-xl border border-[#dfe9e2] bg-white px-4 py-3 text-sm font-semibold text-[#52635a] transition hover:bg-[#f5f7f4] active:scale-[0.98] disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          {logoutError && (
            <p role="alert" className="mt-4 flex items-start gap-2 text-sm text-[#c0392b]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{logoutError}</span>
            </p>
          )}
        </Dialog>
      )}

      {/* Premium Verified */}
      {showPremium && (
        <Dialog labelledBy="premium-dialog-title" onBackdrop={() => !requestingPro && setShowPremium(false)}>
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8f0fd] text-[#1267d6]">
            {proSent ? <Check className="h-6 w-6" aria-hidden="true" /> : <BadgeCheck className="h-6 w-6" aria-hidden="true" />}
          </div>

          <h3 id="premium-dialog-title" className="mt-4 text-center text-xl font-bold text-[#15271d]">
            {proSent ? "Request sent" : "Premium Verified"}
          </h3>

          {proSent ? (
            <>
              <p className="mt-2 text-center text-sm leading-6 text-[#68776f]">{proMessage}</p>
              <button
                type="button"
                onClick={() => setShowPremium(false)}
                className="mt-6 w-full rounded-xl bg-[#1267d6] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
              >
                Done
              </button>
            </>
          ) : (
            <>
              <p className="mt-2 text-center text-sm leading-6 text-[#68776f]">
                Apply for a blue tick. It will be R200/month once payments are enabled.
              </p>

              <textarea
                value={proReason}
                onChange={(event) => setProReason(event.target.value)}
                placeholder="Tell us why you need Premium"
                rows={3}
                disabled={requestingPro}
                className="mt-4 w-full resize-none rounded-xl border border-[#dfe9e2] px-3 py-2.5 text-sm outline-none transition focus:border-[#1267d6]"
              />

              {proError && (
                <p role="alert" className="mt-3 flex items-start gap-2 text-sm text-[#c0392b]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{proError}</span>
                </p>
              )}

              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={requestPro}
                  disabled={requestingPro}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1267d6] px-4 py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {requestingPro ? (
                    <>
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send request"
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPremium(false)}
                  disabled={requestingPro}
                  className="rounded-xl border border-[#dfe9e2] bg-white px-4 py-3 text-sm font-semibold text-[#52635a] transition hover:bg-[#f5f7f4] active:scale-[0.98] disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </Dialog>
      )}
    </>
  );
}