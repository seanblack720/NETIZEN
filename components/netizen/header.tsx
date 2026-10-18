"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { type NavId } from "@/lib/netizen-data";
import { AlertCircle, Check, ChevronRight, LoaderCircle, Menu, UserPlus, Users } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

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

export function Header({
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
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  const [peopleOpen, setPeopleOpen] = useState(false);
  const [requests, setRequests] = useState<NetizenRequest[]>([]);
  const [requestsStatus, setRequestsStatus] = useState<RequestsStatus>("idle");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");

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

  return (
    <header className="flex h-20 shrink-0 items-center border-b border-[#dfe7e4] bg-white px-[15px] dark:border-[#1e3a2f] dark:bg-[#101a17]">
      <div className="flex w-full flex-row items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-2.5 border-0 bg-transparent pt-0 text-[25px] tracking-[-0.04em] text-[#162022] dark:text-zinc-100"
          onClick={() => onNavigate("feed")}
        >
          <img src="/netgreen.png" alt="Netizen logo" className="h-8 w-8 rounded-lg object-cover" />

          <b className="pt-1">NETIZEN</b>
        </button>

        {/* Right side buttons */}
        <div className="flex flex-row items-center gap-1">
          <ThemeToggle variant="ghost" />
          {/* People / Login */}
          <button
            type="button"
            className="relative flex h-11 items-center gap-2 rounded-xl bg-[#e7f7ed] px-3 text-sm font-semibold text-[#07843b] transition active:scale-95 dark:bg-[#143a26] dark:text-[#7ee0b0]"
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
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e7f7ed] text-[#07843b] transition active:scale-95 dark:bg-[#143a26] dark:text-[#7ee0b0]"
            aria-label="Settings"
            onClick={handleSettings}
          >
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* People panel: blurs the feed, header stays visible */}
      {peopleOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-x-0 bottom-0 top-20 z-[60] flex justify-center bg-[#102218]/30 px-3 pt-3 backdrop-blur-md"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPeopleOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="people-title"
              className="flex max-h-[calc(100dvh-10rem)] w-full max-w-[880px] flex-col self-start overflow-hidden rounded-3xl border border-[#dfe9e2] bg-white shadow-2xl dark:border-[#23473a] dark:bg-[#18231f]"
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
                        <div key={item} className="flex items-center gap-3 rounded-2xl border border-[#eef3f0] p-3">
                          <span className="h-11 w-11 animate-pulse rounded-full bg-[#e8efe9]" />
                          <span className="flex-1 space-y-2">
                            <span className="block h-3 w-1/3 animate-pulse rounded-full bg-[#e8efe9]" />
                            <span className="block h-2.5 w-1/4 animate-pulse rounded-full bg-[#eff4f0]" />
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
                      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-[#eef7f1] text-[#1c9d57]">
                        <Users className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <p className="text-sm font-semibold text-[#15271d]">No requests right now</p>
                      <p className="max-w-[28ch] text-xs leading-relaxed text-[#68776f]">
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
                            className="flex items-center gap-3 rounded-2xl border border-[#eef3f0] bg-white p-3"
                          >
                            <Avatar src={request.userImage} name={request.userName} className="h-11 w-11 rounded-full" />

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-[#15271d]">{request.userName}</p>
                              <p className="truncate text-xs text-[#68776f]">
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
                                className="inline-flex h-9 items-center justify-center rounded-xl bg-[#f1f5f2] px-3.5 text-xs font-semibold text-[#5f7073] transition active:scale-95 disabled:opacity-60"
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
  );
}