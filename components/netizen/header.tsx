"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { type NavId } from "@/lib/netizen-data";
import {
  AlertCircle,
  Bell,
  Check,
  ChevronRight,
  CarFront,
  Home,
  LoaderCircle,
  Megaphone,
  Menu,
  MessageCircle,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

/* =========================================================
   HEADER + TOP NAV IN ONE FIXED BAR
   - one block, no line between the logo row and the tabs
   - sticks to the top of the screen
   - on the Feed tab it is solid green so it melts into the
     green hero below it; on other tabs it is white / dark
========================================================== */

type SessionUser = {
  id: string;
  name?: string | null;
  image?: string | null;
  userHandle?: string | null;
  username?: string | null;
};

type NetizenRequest = {
  id: string;
  userId?: string;
  userName: string;
  userHandle?: string;
  userImage?: string | null;
  createdAt?: string;
};

type RequestsStatus = "idle" | "loading" | "ready" | "error";

const tabs: Array<{ id: NavId; label: string; icon: LucideIcon }> = [
  { id: "feed", label: "Feed", icon: Home },
  { id: "khuluma", label: "Khuluma", icon: Megaphone },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "taxis", label: "Taxis", icon: CarFront },
];

function timeAgo(value?: string) {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";

  const minutes = Math.max(1, Math.round((Date.now() - time) / 60000));
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function Avatar({ src, name, className }: { src?: string | null; name?: string | null; className: string }) {
  if (src) {
    return <img src={src} alt="" className={`${className} shrink-0 object-cover`} />;
  }

  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      aria-hidden="true"
      className={`${className} grid shrink-0 place-items-center bg-[#1c9d57] font-semibold text-white`}
    >
      {initial}
    </span>
  );
}

/* The tab row (phones only) */
function TopNav({
  active,
  onNavigate,
  onHero,
  notificationCount,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onHero: boolean;
  notificationCount: number;
}) {
  return (
    <nav
      className="flex h-[54px] w-full shrink-0 items-stretch overflow-x-auto overscroll-x-contain px-1 md:hidden [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
    >
      {tabs.map((item) => {
        const isActive = active === item.id;
        const badgeCount = item.id === "notifications" ? notificationCount : 0;
        const Icon = item.icon;

        const color = onHero
          ? isActive
            ? "text-white"
            : "text-white/70 hover:text-white"
          : isActive
            ? "text-[#16a34a]"
            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200";

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`relative flex min-w-[72px] flex-1 shrink-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-medium leading-none transition-colors duration-150 focus:outline-none sm:min-w-[82px] ${color}`}
          >
            <span
              className={`relative flex items-center justify-center transition-transform duration-150 ${
                isActive ? "scale-105" : "scale-100"
              }`}
            >
              <Icon aria-hidden="true" className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={2} />

              {badgeCount > 0 && (
                <span
                  className={`absolute -right-2.5 -top-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold leading-none text-white ring-2 sm:-right-3 sm:-top-2.5 sm:h-[17px] sm:min-w-[17px] sm:text-[9px] ${
                    onHero ? "ring-[#15803d] dark:ring-[#052e1a]" : "ring-white dark:ring-[#101a17]"
                  }`}
                >
                  {badgeCount}
                </span>
              )}
            </span>

            <span className="max-w-[70px] truncate text-[10px] sm:max-w-[80px] sm:text-[11px]">{item.label}</span>

            {isActive && (
              <span
                className={`absolute bottom-0 left-1/2 h-[3px] w-7 -translate-x-1/2 rounded-t-full sm:w-8 ${
                  onHero ? "bg-[#bbf7d0]" : "bg-[#16a34a]"
                }`}
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export function Header({
  active,
  onNavigate,
  onOpenProfile,
  onOpenSettings,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}) {
  const router = useRouter();
  const barRef = useRef<HTMLElement>(null);
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [panelTop, setPanelTop] = useState(120);
  const [requests, setRequests] = useState<NetizenRequest[]>([]);
  const [requestsStatus, setRequestsStatus] = useState<RequestsStatus>("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

  // The bar is green on the feed so it blends into the green hero under it
  const onHero = active === "feed";

  /* ---- session ---- */
  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/get-session", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const user = data?.user;
        setIsSignedIn(Boolean(user?.id));
        setSessionUser(user?.id ? (user as SessionUser) : null);
      })
      .catch(() => {
        if (!cancelled) setIsSignedIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- unread notifications badge ---- */
  useEffect(() => {
    let cancelled = false;

    async function loadNotificationCount() {
      try {
        const response = await fetch("/api/notifications?unreadOnly=true&limit=100", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setNotificationCount(0);
          return;
        }

        const data = await response.json();
        const unreadCount = Array.isArray(data?.notifications) ? data.notifications.length : 0;

        if (!cancelled) {
          setNotificationCount(Number.isFinite(unreadCount) ? unreadCount : 0);
        }
      } catch {
        if (!cancelled) setNotificationCount(0);
      }
    }

    loadNotificationCount();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- netizen requests ---- */
  const loadRequests = useCallback(async () => {
    setRequestsStatus("loading");

    try {
      const response = await fetch("/api/netizen-requests", {
        credentials: "include",
        cache: "no-store",
      });

      // No endpoint yet, or not signed in: just show the empty state
      if (response.status === 404 || response.status === 401) {
        setRequests([]);
        setRequestsStatus("ready");
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Could not load requests.");

      const list = Array.isArray(data?.requests) ? data.requests : [];

      setRequests(
        list.map(
          (item: Record<string, unknown>): NetizenRequest => ({
            id: String(item.id ?? item._id ?? ""),
            userId: item.userId ? String(item.userId) : undefined,
            userName: String(item.userName ?? item.name ?? "Netizen"),
            userHandle: item.userHandle ? String(item.userHandle) : undefined,
            userImage: typeof item.userImage === "string" ? item.userImage : null,
            createdAt: typeof item.createdAt === "string" ? item.createdAt : undefined,
          }),
        ),
      );
      setRequestsStatus("ready");
    } catch {
      setRequestsStatus("error");
    }
  }, []);

  // Load once we know the person is signed in, so the badge on the button is accurate
  useEffect(() => {
    if (isSignedIn) loadRequests();
  }, [isSignedIn, loadRequests]);

  // Refresh every time the panel opens
  useEffect(() => {
    if (peopleOpen) {
      setNotice("");
      setActionError("");
      loadRequests();
    }
  }, [peopleOpen, loadRequests]);

  /* ---- panel behaviour: Escape closes, page behind does not scroll ---- */
  useEffect(() => {
    if (!peopleOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPeopleOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [peopleOpen]);

  async function respond(request: NetizenRequest, action: "accept" | "decline") {
    if (busyId) return;

    setBusyId(request.id);
    setActionError("");
    setNotice("");

    try {
      const response = await fetch("/api/netizen-requests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, action }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || "Something went wrong. Please try again.");

      setRequests((current) => current.filter((item) => item.id !== request.id));
      setNotice(action === "accept" ? `Accepted ${request.userName}.` : `Declined ${request.userName}.`);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  /* ---- header buttons ---- */
  function handlePeople() {
    if (isSignedIn === null) return;

    if (!isSignedIn) {
      router.push("/login");
      return;
    }

    // the panel opens right under the whole bar (logo row + tabs)
    const bottom = barRef.current?.getBoundingClientRect().bottom;
    if (typeof bottom === "number") setPanelTop(Math.round(bottom));

    setPeopleOpen((open) => !open);
  }

  function openMyProfile() {
    setPeopleOpen(false);

    if (onOpenProfile) {
      onOpenProfile();
      return;
    }

    onNavigate("profile");
  }

  function handleSettings() {
    if (onOpenSettings) {
      onOpenSettings();
    }
  }

  const handle = sessionUser?.userHandle || (sessionUser?.username ? `@${sessionUser.username}` : "");
  const requestCount = requests.length;

  const glassButton = onHero
    ? "bg-white/15 text-white hover:bg-white/25"
    : "bg-[#e7f7ed] text-[#07843b] dark:bg-[#143a26] dark:text-[#7ee0b0]";

  // same shade forced onto the ThemeToggle's own button so all three match
  const toggleWrap = onHero
    ? "[&_button]:!h-11 [&_button]:!w-11 [&_button]:!rounded-xl [&_button]:!border-0 [&_button]:!bg-white/15 [&_button]:!text-white hover:[&_button]:!bg-white/25 [&_svg]:!text-white"
    : "[&_button]:!h-11 [&_button]:!w-11 [&_button]:!rounded-xl [&_button]:!border-0 [&_button]:!bg-[#e7f7ed] [&_button]:!text-[#07843b] dark:[&_button]:!bg-[#143a26] dark:[&_button]:!text-[#7ee0b0] [&_svg]:!text-current";

  return (
    <>
    {/* spacer: the bar is fixed (out of the layout flow), so this holds its place.
        64px logo row + 54px tab row on phones; tabs are hidden from md up. */}
    <div aria-hidden="true" className="h-[118px] shrink-0 md:h-16" />

    <header
      ref={barRef}
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-200 ${
        onHero
          ? "bg-[#15803d] text-white dark:bg-[#052e1a]"
          : "border-b border-[#dfe7e4] bg-white dark:border-[#1e3a2f] dark:bg-[#101a17]"
      }`}
    >
      {/* Row 1: logo + buttons */}
      <div className="flex h-16 w-full items-center justify-between px-[15px]">
        {/* Logo */}
        <button
          type="button"
          className={`flex items-center gap-2.5 border-0 bg-transparent pt-0 text-[25px] tracking-[-0.04em] ${
            onHero ? "text-white" : "text-[#162022] dark:text-zinc-100"
          }`}
          onClick={() => onNavigate("feed")}
        >
          <img src="/netgreen.png" alt="Netizen logo" className="h-8 w-8 rounded-lg object-cover" />

          <b className="pt-1">NETIZEN</b>
        </button>

        {/* Right side buttons */}
        <div className="flex flex-row items-center gap-1">
          <div className={toggleWrap}>
            <ThemeToggle variant="ghost" />
          </div>

          {/* People / Login */}
          <button
            type="button"
            className={`relative flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold transition active:scale-95 ${glassButton}`}
            aria-label={isSignedIn ? "People" : "Log in"}
            aria-haspopup={isSignedIn ? "dialog" : undefined}
            aria-expanded={isSignedIn ? peopleOpen : undefined}
            onClick={handlePeople}
          >
            <Users className="h-5 w-5" aria-hidden="true" />

            <span>{isSignedIn ? "People" : "Log in"}</span>

            {isSignedIn && requestCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#e5484d] px-1 text-[11px] font-bold leading-none text-white">
                {requestCount > 9 ? "9+" : requestCount}
              </span>
            )}
          </button>

          {/* Settings Menu */}
          <button
            type="button"
            className={`flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95 ${glassButton}`}
            aria-label="Settings"
            onClick={handleSettings}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Row 2: tabs (same block, no divider line) */}
      <TopNav active={active} onNavigate={onNavigate} onHero={onHero} notificationCount={notificationCount} />

      {/* People panel: blurs the feed, the bar stays visible */}
      {peopleOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-x-0 bottom-0 z-[60] flex justify-center bg-[#102218]/30 px-3 pt-3 backdrop-blur-md"
            style={{ top: panelTop }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPeopleOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="people-title"
              className="flex w-full max-w-[880px] flex-col self-start overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-2xl dark:border-[#23473a] dark:bg-[#18231f]"
              style={{ maxHeight: `calc(100dvh - ${panelTop}px - 2rem)` }}
            >
              {/* My profile */}
              <div className="shrink-0 border-b border-[#eef3f0] p-3 dark:border-[#1e3a2f]">
                <button
                  type="button"
                  onClick={openMyProfile}
                  className="flex w-full items-center gap-3 rounded-2xl bg-[#f1faf4] p-3 text-left transition hover:bg-[#e7f7ed] active:scale-[0.99] dark:bg-[#1a2e26] dark:hover:bg-[#143a26]"
                >
                  <Avatar src={sessionUser?.image} name={sessionUser?.name} className="h-12 w-12 rounded-full" />

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#15271d] dark:text-zinc-100">
                      {sessionUser?.name || "Your profile"}
                    </span>
                    <span className="block truncate text-xs text-[#68776f] dark:text-zinc-400">
                      {handle ? `${handle} · ` : ""}View your profile
                    </span>
                  </span>

                  <ChevronRight className="h-5 w-5 shrink-0 text-[#9fb3a6]" aria-hidden="true" />
                </button>
              </div>

              {/* Netizen requests */}
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex shrink-0 items-center justify-between px-5 pb-2 pt-4">
                  <h2 id="people-title" className="flex items-center gap-2 text-sm font-semibold text-[#15271d] dark:text-zinc-100">
                    <UserPlus className="h-4 w-4 text-[#1c9d57]" aria-hidden="true" />
                    Netizen requests
                  </h2>

                  {requestCount > 0 && (
                    <span className="rounded-full bg-[#e7f7ed] px-2.5 py-1 text-xs font-semibold text-[#07843b] dark:bg-[#143a26] dark:text-[#7ee0b0]">
                      {requestCount}
                    </span>
                  )}
                </div>

                {(notice || actionError) && (
                  <p
                    role={actionError ? "alert" : "status"}
                    className={`mx-4 mb-2 flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${
                      actionError ? "bg-[#fff4f1] text-[#7f362f] dark:bg-[#3a1a1a] dark:text-red-200" : "bg-[#eaf4ed] text-[#204d39] dark:bg-[#143a26] dark:text-[#7ee0b0]"
                    }`}
                  >
                    {actionError ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    ) : (
                      <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    )}
                    <span>{actionError || notice}</span>
                  </p>
                )}

                <div className="min-h-[220px] flex-1 overflow-y-auto overscroll-contain px-3 pb-3">
                  {requestsStatus === "loading" && requests.length === 0 && (
                    <div className="space-y-2 px-1" aria-busy="true">
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#eef3f0] p-3 dark:border-[#1e3a2f]">
                          <span className="h-11 w-11 animate-pulse rounded-full bg-[#e8efe9] dark:bg-[#24382f]" />
                          <span className="flex-1 space-y-2">
                            <span className="block h-3 w-1/3 animate-pulse rounded-full bg-[#e8efe9] dark:bg-[#24382f]" />
                            <span className="block h-2.5 w-1/4 animate-pulse rounded-full bg-[#eff4f0] dark:bg-[#1f332b]" />
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {requestsStatus === "error" && requests.length === 0 && (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 px-6 text-center">
                      <AlertCircle className="h-8 w-8 text-[#c0392b]" aria-hidden="true" />
                      <p className="text-sm text-[#68776f]">We could not load your requests.</p>
                      <button
                        type="button"
                        onClick={loadRequests}
                        className="rounded-xl bg-[#1c9d57] px-4 py-2 text-sm font-semibold text-white transition active:scale-95"
                      >
                        Try again
                      </button>
                    </div>
                  )}

                  {requestsStatus === "ready" && requests.length === 0 && (
                    <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 px-6 text-center">
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef7f1] text-[#1c9d57] dark:bg-[#143a26]">
                        <Users className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold text-[#15271d] dark:text-zinc-100">No requests right now</p>
                      <p className="max-w-[28ch] text-xs leading-relaxed text-[#68776f] dark:text-zinc-400">
                        When someone wants to connect with you, their request will show up here.
                      </p>
                    </div>
                  )}

                  {requests.length > 0 && (
                    <ul className="space-y-2">
                      {requests.map((request) => {
                        const busy = busyId === request.id;

                        return (
                          <li
                            key={request.id}
                            className="flex items-center gap-3 rounded-2xl border border-[#eef3f0] bg-white p-3 dark:border-[#1e3a2f] dark:bg-[#1a2e26]"
                          >
                            <Avatar src={request.userImage} name={request.userName} className="h-11 w-11 rounded-full" />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#15271d] dark:text-zinc-100">{request.userName}</p>
                              <p className="truncate text-xs text-[#68776f] dark:text-zinc-400">
                                {[request.userHandle, timeAgo(request.createdAt)].filter(Boolean).join(" · ")}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => respond(request, "accept")}
                                disabled={Boolean(busyId)}
                                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#1c9d57] px-3.5 text-xs font-semibold text-white transition active:scale-95 disabled:opacity-60"
                              >
                                {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
                                Accept
                              </button>

                              <button
                                type="button"
                                onClick={() => respond(request, "decline")}
                                disabled={Boolean(busyId)}
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#f1f5f2] px-3.5 text-xs font-semibold text-[#5f7073] transition active:scale-95 disabled:opacity-60 dark:bg-[#24382f] dark:text-zinc-300"
                              >
                                Decline
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </header>
    </>
  );
}