"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";

import { VerifiedBadge } from "./post-extras";

/* =========================================================
   PRO-ONLY VERIFIED BADGE + FOLLOW, and ADD NETIZEN for everyone.

   - The verified check and the Follow button only show when the author
     has isPro = true on their user document.
   - Add (netizen request) shows for everyone except on your own posts.

   Where isPro comes from: if the post / comment already carries
   `userIsPro` (or `authorIsPro`) that is used straight away. Otherwise it
   is read once per person from GET /api/profile?userId=... (targetUser.isPro,
   the same route the profile page uses) and shared by every card, so five
   posts from the same person cost one request.

   Routes used:
     POST  /api/follows            { userId }              toggle follow
     GET   /api/netizen-requests?userId=...                request status
     POST  /api/netizen-requests   { toUserId }            send request
     PATCH /api/netizen-requests   { requestId, action }   cancel / accept
========================================================== */

type Netizen = "none" | "sent" | "received" | "accepted";

type Snapshot = {
  /** null = not known yet (nothing is shown while we wait, so no flicker) */
  isPro: boolean | null;
  following: boolean;
  netizen: Netizen;
  requestId: string | null;
};

type Entry = {
  snap: Snapshot;
  profile: Promise<void> | null;
  netizen: Promise<void> | null;
  subs: Set<() => void>;
};

const EMPTY: Snapshot = { isPro: null, following: false, netizen: "none", requestId: null };

const store = new Map<string, Entry>();
const keyOf = (viewer: string, user: string) => `${viewer || "anon"}:${user}`;

function entryFor(key: string): Entry {
  let entry = store.get(key);
  if (!entry) {
    entry = { snap: EMPTY, profile: null, netizen: null, subs: new Set() };
    store.set(key, entry);
  }
  return entry;
}

function patch(key: string, partial: Partial<Snapshot>) {
  const entry = entryFor(key);
  entry.snap = { ...entry.snap, ...partial };
  entry.subs.forEach((notify) => notify());
}

/** true, "true" and 1 all count as Pro (a value typed by hand in Compass is a string) */
function asBool(value: unknown): boolean {
  return value === true || value === 1 || (typeof value === "string" && value.trim().toLowerCase() === "true");
}

/** Reads a Pro flag a route may already have put on a post or comment */
export function proHint(source: unknown): boolean | undefined {
  const s = source as Record<string, unknown> | null | undefined;
  const value = s?.userIsPro ?? s?.authorIsPro;
  return value === undefined || value === null ? undefined : asBool(value);
}

function loadProfile(key: string, user: string) {
  const entry = entryFor(key);
  if (entry.profile) return;

  entry.profile = fetch(`/api/profile?userId=${encodeURIComponent(user)}`, {
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      patch(key, {
        isPro: asBool(data?.targetUser?.isPro),
        following: !!data?.isFollowing,
      });
    })
    .catch(() => {
      // unknown means "not Pro": the badge and Follow stay hidden
      if (entryFor(key).snap.isPro === null) patch(key, { isPro: false });
    });
}

function loadNetizen(key: string, viewer: string, user: string) {
  const entry = entryFor(key);
  if (entry.netizen) return;

  entry.netizen = fetch(`/api/netizen-requests?userId=${encodeURIComponent(user)}`, {
    credentials: "include",
    cache: "no-store",
  })
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => {
      const doc = data?.request;
      if (!doc) return;

      const requestId = String(doc._id ?? doc.id ?? "") || null;
      if (doc.status === "accepted") {
        patch(key, { netizen: "accepted", requestId });
      } else if (doc.status === "pending") {
        patch(key, {
          netizen: String(doc.fromUserId) === String(viewer) ? "sent" : "received",
          requestId,
        });
      }
    })
    .catch(() => {});
}

function useAuthor({
  userId,
  viewerId,
  hint,
  buttons,
}: {
  userId?: string | null;
  viewerId?: string | null;
  hint?: boolean;
  buttons: boolean;
}) {
  const user = userId ? String(userId) : "";
  const viewer = viewerId ? String(viewerId) : "";
  const key = keyOf(viewer, user);

  const [snap, setSnap] = useState<Snapshot>(() => entryFor(key).snap);

  useEffect(() => {
    if (!user) return;

    const entry = entryFor(key);
    const sync = () => setSnap(entry.snap);
    entry.subs.add(sync);
    sync();

    if (typeof hint === "boolean" && entry.snap.isPro !== hint) {
      patch(key, { isPro: hint });
    }

    // the badge only needs isPro; the buttons also need "do I follow them"
    const needProfile = typeof hint !== "boolean" || (buttons && !!viewer);
    if (needProfile) loadProfile(key, user);

    if (buttons && viewer && viewer !== user) loadNetizen(key, viewer, user);

    return () => {
      entry.subs.delete(sync);
    };
  }, [key, user, viewer, hint, buttons]);

  return { snap, key, user, viewer };
}

/* =========================================================
   Verified check: only for Pro people
========================================================== */
export function AuthorBadge({
  userId,
  viewerId,
  isPro,
  size,
}: {
  userId?: string | null;
  viewerId?: string | null;
  /** pass post.userIsPro / comment.userIsPro when the API already sends it */
  isPro?: boolean;
  size?: number;
}) {
  const { snap } = useAuthor({ userId, viewerId, hint: isPro, buttons: false });

  if (snap.isPro !== true) return null;
  return size ? <VerifiedBadge size={size} /> : <VerifiedBadge />;
}

/* =========================================================
   Follow (blue, Pro only) + Add netizen (everyone)
========================================================== */
export function PostFollowButtons({
  userId,
  viewerId,
  isPro,
}: {
  /** the author of the post */
  userId?: string | null;
  /** the logged in user (null when signed out) */
  viewerId?: string | null;
  isPro?: boolean;
}) {
  const { snap, key, user: target, viewer } = useAuthor({
    userId,
    viewerId,
    hint: isPro,
    buttons: true,
  });

  const [followBusy, setFollowBusy] = useState(false);
  const [netizenBusy, setNetizenBusy] = useState(false);
  const [failed, setFailed] = useState<"follow" | "netizen" | null>(null);

  // red hint for a moment when something fails
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(null), 2500);
    return () => clearTimeout(t);
  }, [failed]);

  const isOwn = !!viewer && viewer === target;

  // your own posts, or a post with no author id, get no buttons
  if (!target || isOwn) return null;

  const showFollow = snap.isPro === true;

  function needLogin() {
    window.location.assign("/login");
  }

  async function toggleFollow(e: React.MouseEvent) {
    e.stopPropagation();
    if (!viewer) return needLogin();
    if (followBusy) return;

    setFollowBusy(true);
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: target }),
      });
      if (!response.ok) throw new Error("Follow failed");
      const data = await response.json().catch(() => ({}));
      patch(key, { following: !!data.following });
    } catch {
      setFailed("follow");
    } finally {
      setFollowBusy(false);
    }
  }

  async function sendRequest() {
    const response = await fetch("/api/netizen-requests", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUserId: target }),
    });
    const data = await response.json().catch(() => ({}));

    if (response.status === 409) {
      if (data?.message === "Already netizens.") {
        patch(key, { netizen: "accepted", requestId: null });
      } else if (data?.incoming) {
        // they already sent you one: you can accept it right here
        patch(key, { netizen: "received", requestId: data.requestId ?? null });
      } else {
        patch(key, { netizen: "sent" });
      }
      return;
    }

    if (!response.ok) throw new Error(data?.message || "Send failed");
    patch(key, { netizen: "sent", requestId: data.requestId ?? null });
  }

  async function patchRequest(action: "cancel" | "accept") {
    if (!snap.requestId) return;
    const response = await fetch("/api/netizen-requests", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: snap.requestId, action }),
    });
    if (!response.ok) throw new Error("Request failed");

    if (action === "cancel") patch(key, { netizen: "none", requestId: null });
    else patch(key, { netizen: "accepted" });
  }

  async function onNetizenClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!viewer) return needLogin();
    if (netizenBusy || snap.netizen === "accepted") return;

    setNetizenBusy(true);
    try {
      if (snap.netizen === "none") await sendRequest();
      else if (snap.netizen === "sent") await patchRequest("cancel");
      else if (snap.netizen === "received") await patchRequest("accept");
    } catch {
      setFailed("netizen");
    } finally {
      setNetizenBusy(false);
    }
  }

  const base =
    "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold leading-none transition active:scale-95 disabled:opacity-70";

  /* ---- Follow: blue ---- */
  const followClass = snap.following
    ? "border border-[#1d9bf0] bg-transparent text-[#1d9bf0] dark:border-[#4db3ff] dark:text-[#4db3ff]"
    : "bg-[#1d9bf0] text-white hover:bg-[#1a8cd8]";

  /* ---- Add netizen ---- */
  let netizenClass =
    "border border-[#b9d9c6] bg-transparent text-[#168b45] hover:bg-[#f0f8f3] dark:border-[#1e3a2f] dark:text-[#7ee0b0] dark:hover:bg-[#1f332b]";
  let netizenLabel = "Add";
  let netizenIcon = <UserPlus size={13} />;
  let netizenTitle = "Send a netizen request";

  if (snap.netizen === "sent") {
    netizenLabel = "Requested";
    netizenTitle = "Tap to cancel your request";
    netizenClass =
      "border border-[#b9d9c6] bg-[#f0f8f3] text-[#168b45] dark:border-[#1e3a2f] dark:bg-[#143a26] dark:text-[#7ee0b0]";
  } else if (snap.netizen === "received") {
    netizenLabel = "Accept";
    netizenTitle = "They sent you a request. Tap to accept";
    netizenClass = "bg-[#1c9d57] text-white hover:bg-[#168b45]";
  } else if (snap.netizen === "accepted") {
    netizenLabel = "Netizen";
    netizenIcon = <UserCheck size={13} />;
    netizenTitle = "You are netizens";
    netizenClass =
      "border border-transparent bg-[#e6f4ec] text-[#168b45] dark:bg-[#143a26] dark:text-[#7ee0b0]";
  }

  if (failed === "netizen") {
    netizenLabel = "Try again";
    netizenClass = "border border-[#f3b5b0] bg-[#fff4f1] text-[#c0392b]";
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {showFollow && (
        <button
          type="button"
          onClick={toggleFollow}
          disabled={followBusy}
          className={`${base} ${
            failed === "follow" ? "border border-[#f3b5b0] bg-[#fff4f1] text-[#c0392b]" : followClass
          }`}
        >
          {followBusy ? (
            <Loader2 size={13} className="animate-spin" />
          ) : failed === "follow" ? (
            "Try again"
          ) : snap.following ? (
            "Following"
          ) : (
            "Follow"
          )}
        </button>
      )}

      <button
        type="button"
        onClick={onNetizenClick}
        disabled={netizenBusy || snap.netizen === "accepted"}
        title={netizenTitle}
        className={`${base} ${netizenClass}`}
      >
        {netizenBusy ? <Loader2 size={13} className="animate-spin" /> : netizenIcon}
        {netizenLabel}
      </button>
    </div>
  );
}