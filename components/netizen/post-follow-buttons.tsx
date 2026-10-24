"use client";

import { useEffect, useState } from "react";
import { Loader2, UserCheck, UserPlus } from "lucide-react";

/* =========================================================
   FOLLOW (blue) + ADD NETIZEN buttons for a post author.
   Used in the post card and in the post page, and they talk to
   the same routes as the profile and the People panel:
     POST  /api/follows            { userId }              toggle follow
     GET   /api/netizen-requests?userId=...                request status
     POST  /api/netizen-requests   { toUserId }            send request
     PATCH /api/netizen-requests   { requestId, action }   cancel / accept
   The status of each author is fetched once and shared, so a feed with
   many posts from the same person only asks the server one time, and
   pressing a button updates every card of that person.
========================================================== */

type Netizen = "none" | "sent" | "received" | "accepted";

type Relation = {
  following: boolean;
  netizen: Netizen;
  requestId: string | null;
};

const EMPTY: Relation = { following: false, netizen: "none", requestId: null };

const cache = new Map<string, Promise<Relation>>();
const subscribers = new Map<string, Set<(relation: Relation) => void>>();

const keyOf = (viewerId: string, userId: string) => `${viewerId}:${userId}`;

async function fetchRelation(viewerId: string, userId: string): Promise<Relation> {
  const id = encodeURIComponent(userId);

  const [requestRes, profileRes] = await Promise.all([
    fetch(`/api/netizen-requests?userId=${id}`, { credentials: "include", cache: "no-store" }).catch(() => null),
    fetch(`/api/profile?userId=${id}`, { credentials: "include", cache: "no-store" }).catch(() => null),
  ]);

  let netizen: Netizen = "none";
  let requestId: string | null = null;

  if (requestRes?.ok) {
    const data = await requestRes.json().catch(() => null);
    const doc = data?.request;

    if (doc) {
      requestId = String(doc._id ?? doc.id ?? "") || null;

      if (doc.status === "accepted") netizen = "accepted";
      else if (doc.status === "pending") {
        netizen = String(doc.fromUserId) === String(viewerId) ? "sent" : "received";
      }
    }
  }

  let following = false;
  if (profileRes?.ok) {
    const data = await profileRes.json().catch(() => null);
    following = !!data?.isFollowing;
  }

  return { following, netizen, requestId };
}

function publish(key: string, relation: Relation) {
  cache.set(key, Promise.resolve(relation));
  subscribers.get(key)?.forEach((listener) => listener(relation));
}

export function PostFollowButtons({
  userId,
  viewerId,
}: {
  /** the author of the post */
  userId?: string | null;
  /** the logged in user (null when signed out) */
  viewerId?: string | null;
}) {
  const target = userId ? String(userId) : "";
  const viewer = viewerId ? String(viewerId) : "";
  const isOwn = !!viewer && viewer === target;

  const [relation, setRelation] = useState<Relation>(EMPTY);
  const [followBusy, setFollowBusy] = useState(false);
  const [netizenBusy, setNetizenBusy] = useState(false);
  const [failed, setFailed] = useState<"follow" | "netizen" | null>(null);

  // load (once per author) and stay in sync with other cards of the same author
  useEffect(() => {
    if (!viewer || !target || isOwn) return;

    const key = keyOf(viewer, target);
    let cancelled = false;

    let promise = cache.get(key);
    if (!promise) {
      promise = fetchRelation(viewer, target);
      cache.set(key, promise);
    }
    promise.then((value) => {
      if (!cancelled) setRelation(value);
    });

    const listener = (value: Relation) => setRelation(value);
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key)!.add(listener);

    return () => {
      cancelled = true;
      subscribers.get(key)?.delete(listener);
    };
  }, [viewer, target, isOwn]);

  // red hint for a moment when something fails
  useEffect(() => {
    if (!failed) return;
    const t = setTimeout(() => setFailed(null), 2500);
    return () => clearTimeout(t);
  }, [failed]);

  // your own posts, or a post with no author id, get no buttons
  if (!target || isOwn) return null;

  const key = viewer ? keyOf(viewer, target) : "";

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
      publish(key, { ...relation, following: !!data.following });
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
        publish(key, { ...relation, netizen: "accepted", requestId: null });
      } else if (data?.incoming) {
        // they already sent you one: you can accept it right here
        publish(key, { ...relation, netizen: "received", requestId: data.requestId ?? null });
      } else {
        publish(key, { ...relation, netizen: "sent" });
      }
      return;
    }

    if (!response.ok) throw new Error(data?.message || "Send failed");
    publish(key, { ...relation, netizen: "sent", requestId: data.requestId ?? null });
  }

  async function patchRequest(action: "cancel" | "accept") {
    if (!relation.requestId) return;
    const response = await fetch("/api/netizen-requests", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: relation.requestId, action }),
    });
    if (!response.ok) throw new Error("Request failed");

    if (action === "cancel") publish(key, { ...relation, netizen: "none", requestId: null });
    else publish(key, { ...relation, netizen: "accepted" });
  }

  async function onNetizenClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!viewer) return needLogin();
    if (netizenBusy || relation.netizen === "accepted") return;

    setNetizenBusy(true);
    try {
      if (relation.netizen === "none") await sendRequest();
      else if (relation.netizen === "sent") await patchRequest("cancel");
      else if (relation.netizen === "received") await patchRequest("accept");
    } catch {
      setFailed("netizen");
    } finally {
      setNetizenBusy(false);
    }
  }

  const base =
    "inline-flex h-7 shrink-0 items-center justify-center gap-1 rounded-full px-3 text-xs font-semibold leading-none transition active:scale-95 disabled:opacity-70";

  /* ---- Follow: blue ---- */
  const followClass = relation.following
    ? "border border-[#1d9bf0] bg-transparent text-[#1d9bf0] dark:border-[#4db3ff] dark:text-[#4db3ff]"
    : "bg-[#1d9bf0] text-white hover:bg-[#1a8cd8]";

  /* ---- Add netizen ---- */
  let netizenClass =
    "border border-[#b9d9c6] bg-transparent text-[#168b45] hover:bg-[#f0f8f3] dark:border-[#1e3a2f] dark:text-[#7ee0b0] dark:hover:bg-[#1f332b]";
  let netizenLabel = "Add";
  let netizenIcon = <UserPlus size={13} />;
  let netizenTitle = "Send a netizen request";

  if (relation.netizen === "sent") {
    netizenLabel = "Requested";
    netizenTitle = "Tap to cancel your request";
    netizenClass =
      "border border-[#b9d9c6] bg-[#f0f8f3] text-[#168b45] dark:border-[#1e3a2f] dark:bg-[#143a26] dark:text-[#7ee0b0]";
  } else if (relation.netizen === "received") {
    netizenLabel = "Accept";
    netizenTitle = "They sent you a request. Tap to accept";
    netizenClass = "bg-[#1c9d57] text-white hover:bg-[#168b45]";
  } else if (relation.netizen === "accepted") {
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
      <button
        type="button"
        onClick={toggleFollow}
        disabled={followBusy}
        className={`${base} ${failed === "follow" ? "border border-[#f3b5b0] bg-[#fff4f1] text-[#c0392b]" : followClass}`}
      >
        {followBusy ? (
          <Loader2 size={13} className="animate-spin" />
        ) : failed === "follow" ? (
          "Try again"
        ) : relation.following ? (
          "Following"
        ) : (
          "Follow"
        )}
      </button>

      <button
        type="button"
        onClick={onNetizenClick}
        disabled={netizenBusy || relation.netizen === "accepted"}
        title={netizenTitle}
        className={`${base} ${netizenClass}`}
      >
        {netizenBusy ? <Loader2 size={13} className="animate-spin" /> : netizenIcon}
        {netizenLabel}
      </button>
    </div>
  );
}
