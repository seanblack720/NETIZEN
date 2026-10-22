"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Camera,
  CalendarDays,
  Check,
  Globe,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Save,
  Settings,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

import { PostCard } from "./post-card";
import { PostDetailModal } from "./post-detail-modal";
import { ProfileImageModal } from "./profile-image-modal";
import { VerifiedBadge, n } from "./post-extras";
import { useModalHistory } from "./use-modal-history";

/* =========================================================
   API ENDPOINTS
   /api/profile is your route (use profile-route.ts so photo
   uploads work). The post routes are the same ones the feed
   and the post page already use. Edit and delete are my guess.
========================================================== */
const API = {
  posts: (id: string) => `/api/profile/posts?userId=${encodeURIComponent(id)}`,
  profile: (id: string) => `/api/profile?userId=${encodeURIComponent(id)}`,
  updateProfile: "/api/profile",
  post: (id: string) => `/api/posts/${id}`,
  highlight: (id: string) => `/api/posts/${id}/highlight`,
  bookmarks: "/api/bookmarks",
  settingsPage: "/settings",
  // Page the profile photo button sends you to. Change this to your real route.
  profileSettingsPage: "/settings/profile",
};

type Post = Record<string, any>;

type TargetUser = {
  id?: string;
  name?: string;
  userHandle?: string;
  image?: string;
  avatar?: string;
  country?: string;
  gender?: string;
  interests?: string[];
  isPro?: boolean;
  emailVerified?: boolean;
  createdAt?: string | Date;
  bio?: string;
  location?: string;
  coverImage?: string;
};

type ProfileDoc = {
  bio?: string;
  location?: string;
  phone?: string;
  birthDate?: string;
  coverImage?: string;
};

/* Same theme tokens as the post page, so every screen matches */
const ui = {
  page: "bg-white dark:bg-[#101a17]",
  // the gap colour between post cards
  gap: "bg-[#eaf0ec] dark:bg-[#0a110e]",
  text: "text-[#15271d] dark:text-[#e6ece9]",
  muted: "text-[#718078] dark:text-[#9bb0a8]",
  border: "border-[#e3ebe6] dark:border-[#1e3a2f]",
  bubble: "bg-[#f0f2f1] dark:bg-[#24382f]",
  hover: "hover:bg-[#f2f6f3] dark:hover:bg-[#1f332b]",
  accent: "text-[#168b45] dark:text-[#7ee0b0]",
  panel: "border-[#dcebe1] bg-white dark:border-[#1e3a2f] dark:bg-[#18231f]",
};

const postId = (post: Post) => String(post.id ?? post._id ?? "");

function initialsOf(name?: string | null) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(value);
}

function imagesFor(post: Post): string[] {
  const source =
    post.reshareOf && Array.isArray(post.reshareData?.originalImages)
      ? post.reshareData.originalImages
      : post.images;
  return (Array.isArray(source) ? source : []).filter(
    (x: unknown): x is string => typeof x === "string" && x.trim().length > 0
  );
}

function deriveHighlight(post: Post, viewerId?: string | null) {
  const list: string[] = Array.isArray(post.highlightedBy)
    ? post.highlightedBy
    : Array.isArray(post.highlightedByUser)
      ? post.highlightedByUser
      : Array.isArray(post.likedBy)
        ? post.likedBy
        : [];
  return {
    highlightCount: n(list.length || post.highlightCount || 0),
    highlighted: viewerId ? list.map(String).includes(String(viewerId)) : false,
  };
}

/* Shrinks a picked photo in the browser so uploads stay small and fast */
function prepareImage(
  file: File,
  { max, square }: { max: number; square?: boolean }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("That file is not a valid image"));
      img.onload = () => {
        let sx = 0;
        let sy = 0;
        let sw = img.width;
        let sh = img.height;

        if (square) {
          const side = Math.min(sw, sh);
          sx = (sw - side) / 2;
          sy = (sh - side) / 2;
          sw = side;
          sh = side;
        }

        const scale = Math.min(1, max / Math.max(sw, sh));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(sw * scale);
        canvas.height = Math.round(sh * scale);

        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process the image"));
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/* Round avatar: picture, or initials when there is none */
function Face({
  src,
  name,
  className,
  textClass = "text-xs",
}: {
  src?: string | null;
  name?: string | null;
  className: string;
  textClass?: string;
}) {
  const [errored, setErrored] = useState(false);
  const ok = !!src && src.trim().length > 0 && !errored;

  useEffect(() => setErrored(false), [src]);

  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#e8efe8] font-semibold text-[#2f6b4f] dark:bg-[#24382f] dark:text-[#7ee0b0] ${className}`}
    >
      {ok ? (
        <img
          src={String(src)}
          alt={name || "User"}
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span className={`leading-none ${textClass}`}>{initialsOf(name)}</span>
      )}
    </div>
  );
}

/* Menu for YOUR posts: edit or delete. It replaces the dummy 3-dot menu on the card. */
function OwnPostMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Your post options"
        aria-expanded={open}
        className="grid h-9 w-9 place-items-center rounded-full text-[#647994] transition hover:bg-[#f0f8f3] dark:text-[#9bb0a8] dark:hover:bg-[#1f332b]"
      >
        <MoreHorizontal size={22} />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[55] cursor-default bg-transparent"
          />
          <div
            role="menu"
            className={`absolute right-0 top-full z-[56] mt-1 w-48 overflow-hidden rounded-2xl border py-1 shadow-[0_12px_36px_rgba(15,39,28,0.22)] ${ui.panel}`}
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
                Your post
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className={`grid h-7 w-7 place-items-center rounded-full ${ui.muted} ${ui.hover}`}
              >
                <X size={16} />
              </button>
            </div>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm ${ui.text} ${ui.hover}`}
            >
              <Pencil size={16} className="shrink-0" />
              Edit post
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-[#e0344f] ${ui.hover}`}
            >
              <Trash2 size={16} className="shrink-0" />
              Delete post
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   ONE POST ON THE PROFILE
   Its own separated card, with edit / delete for your posts
========================================================== */
function ProfilePostItem({
  post,
  isOwn,
  renderCard,
  onSave,
  onDelete,
}: {
  post: Post;
  isOwn: boolean;
  renderCard: (menuSlot?: ReactNode) => ReactNode;
  onSave: (id: string, content: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const id = postId(post);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content ?? "");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const hasImages = imagesFor(post).length > 0;
  const canSave =
    !busy &&
    draft.trim() !== String(post.content ?? "").trim() &&
    (draft.trim().length > 0 || hasImages);

  async function save() {
    if (!canSave) return;
    setBusy(true);
    const ok = await onSave(id, draft.trim());
    setBusy(false);
    if (ok) setEditing(false);
  }

  async function remove() {
    setBusy(true);
    const ok = await onDelete(id);
    if (!ok) {
      setBusy(false);
      setConfirming(false);
    }
  }

  const menu = isOwn ? (
    <OwnPostMenu
      onEdit={() => {
        setDraft(post.content ?? "");
        setEditing(true);
        setConfirming(false);
      }}
      onDelete={() => {
        setConfirming(true);
        setEditing(false);
      }}
    />
  ) : undefined;

  return (
    <div
      className={`overflow-hidden border-y md:rounded-2xl md:border ${ui.border} ${ui.page}`}
    >
      {confirming && (
        <div
          className={`flex items-center justify-between gap-3 border-b px-3 py-3 ${ui.border} ${ui.bubble}`}
        >
          <p className={`text-sm font-medium ${ui.text}`}>
            Delete this post? This can&apos;t be undone.
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${ui.border} ${ui.text}`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={remove}
              className="flex items-center gap-1 rounded-full bg-[#e0344f] px-3 py-1 text-xs font-semibold text-white disabled:opacity-60"
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="px-3 py-3">
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${ui.muted}`}>
            Edit post
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            maxLength={5000}
            autoFocus
            className={`w-full resize-y rounded-2xl px-3 py-2 text-[15px] leading-[1.55] outline-none focus:ring-2 focus:ring-[#1c9d57]/30 ${ui.bubble} ${ui.text}`}
          />
          {hasImages && (
            <p className={`mt-1 text-xs ${ui.muted}`}>Photos can&apos;t be changed here.</p>
          )}
          <div className="mt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              className={`rounded-full border px-3 py-1.5 text-sm ${ui.border} ${ui.text}`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={save}
              className="flex items-center gap-1.5 rounded-full bg-[#1c9d57] px-4 py-1.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
          </div>
        </div>
      ) : (
        renderCard(menu)
      )}
    </div>
  );
}

/* =========================================================
   PROFILE MODAL
   Own profile  -> change photo / cover, edit profile (settings),
                   edit and delete your posts
   Other people -> Follow + Add netizen at the top
========================================================== */
export function ProfileModal({
  userId,
  userName,
  userImage,
  sessionUserId,
  onClose,
  onOpenSettings,
  onOpenProfileSettings,
}: {
  userId: string;
  userName?: string | null;
  userImage?: string | null;
  /** Optional. If you don't pass it, the logged in user comes from /api/profile */
  sessionUserId?: string | null;
  onClose: () => void;
  /** Called by "Edit profile" / the gear. Falls back to going to the settings page */
  onOpenSettings?: () => void;
  /** Called by the profile photo button. Falls back to going to the profile settings page */
  onOpenProfileSettings?: () => void;
}) {
  useModalHistory(onClose);

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [target, setTarget] = useState<TargetUser | null>(null);
  const [profile, setProfile] = useState<ProfileDoc | null>(null);
  const [followersBase, setFollowersBase] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [netizensCount, setNetizensCount] = useState(0);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [apiViewerId, setApiViewerId] = useState<string | null>(null);

  const [avatar, setAvatar] = useState<string | null>(userImage ?? null);
  const [cover, setCover] = useState<string | null>(null);
  const [profileImageOpen, setProfileImageOpen] = useState(false);
  const [uploading, setUploading] = useState<"avatar" | "cover" | null>(null);
  const [toast, setToast] = useState("");

  // Real follow / netizen state (wired to the API below)
  const [following, setFollowing] = useState(false);
  const [followerDelta, setFollowerDelta] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [netizenStatus, setNetizenStatus] = useState<"pending" | "accepted" | "rejected" | null>(null);
  const [netizenDirection, setNetizenDirection] = useState<"sent" | "received" | null>(null);
  const [netizenRequestId, setNetizenRequestId] = useState<string | null>(null);
  const [followBusy, setFollowBusy] = useState(false);
  const [netizenBusy, setNetizenBusy] = useState(false);
  const [incomingRequests, setIncomingRequests] = useState<Array<{
    id: string;
    fromUserId: string;
    fromName: string;
    fromImage: string | null;
  }>>([]);

  // Own-profile inline editor
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    name: string;
    bio: string;
    location: string;
    gender: string;
    country: string;
    phone: string;
    birthDate: string;
    interests: string;
  }>({ name: "", bio: "", location: "", gender: "", country: "", phone: "", birthDate: "", interests: "" });

  // post actions
  const [postHighlights, setPostHighlights] = useState<
    Record<string, { highlightCount: number; highlighted: boolean }>
  >({});
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Is this MY profile? Compare the profile's user id with the logged in user's id
  const viewerId = (sessionUserId ?? apiViewerId) || null;
  const isOwn = !!viewerId && String(viewerId) === String(userId);

  const coverInput = useRef<HTMLInputElement>(null);

  // Posts
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API.posts(String(userId)), {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to load posts");

        const data = await response.json();
        if (!cancelled) setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch {
        if (!cancelled) setError("Unable to load posts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  // Profile details + who is logged in
  useEffect(() => {
    let cancelled = false;

    fetch(API.profile(String(userId)), { cache: "no-store", credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;

        const t: TargetUser | null = data.targetUser ?? null;
        const p: ProfileDoc | null = data.profile ?? null;

        setApiViewerId(data.user?.id ? String(data.user.id) : null);
        setTarget(t);
        setProfile(p);
        setFollowersBase(n(data.followers));
        setFollowingCount(n(data.following));
        setNetizensCount(n(data.netizens));
        setIsFollowing(!!data.isFollowing);

        const viewerIdForDir =
          sessionUserId ?? (data.user?.id ? String(data.user.id) : null);
        if (data.netizenRequestStatus) {
          setNetizenStatus(data.netizenRequestStatus);
          setNetizenDirection(
            data.netizenRequestFrom === viewerIdForDir ? "sent" : "received"
          );
          setNetizenRequestId(data.netizenRequestId ?? null);
        }

        // Load incoming netizen requests for your own profile
        if (String(data.user?.id) === String(userId)) {
          loadIncomingRequests();
        }

        const img = t?.image || t?.avatar;
        if (img) setAvatar(img);
        const cv = p?.coverImage || t?.coverImage;
        if (cv) setCover(cv);

        setProfileLoaded(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Which posts the viewer has bookmarked
  useEffect(() => {
    let cancelled = false;
    fetch(API.bookmarks, { credentials: "include" })
      .then((r) => r.json().catch(() => ({})))
      .then((d: any) => {
        if (!cancelled && Array.isArray(d?.bookmarkedIds)) {
          setBookmarkedIds(new Set(d.bookmarkedIds.map(String)));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Lock background scroll while the page is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Close on Escape (the post page handles its own Escape first)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectedPost) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, selectedPost]);

  // Toast auto-hide
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const displayName = target?.name || userName || "User";
  const rawHandle = target?.userHandle || "";
  const handle = rawHandle ? `@${rawHandle.replace(/^@/, "")}` : "no handle";
  const bio = (profile?.bio || target?.bio || "").trim();
  const location = (profile?.location || target?.location || "").trim();
  const country = (target?.country || "").trim();
  const gender = (target?.gender || "").trim();
  const interests = Array.isArray(target?.interests) ? target!.interests!.filter(Boolean) : [];
  const followers = n(followersBase + followerDelta);
  const postCount = n(posts.length);
  const joined = target?.createdAt
    ? new Date(target.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })
    : "";

  function openSettings() {
    if (onOpenSettings) onOpenSettings();
    else window.location.assign(API.settingsPage);
  }

  function openProfileSettings() {
    if (onOpenProfileSettings) onOpenProfileSettings();
    else window.location.assign(API.profileSettingsPage);
  }

  function openEdit() {
    setEditDraft({
      name: target?.name || "",
      bio: (profile?.bio || target?.bio || "").trim(),
      location: (profile?.location || target?.location || "").trim(),
      gender: (target?.gender || "").trim(),
      country: (target?.country || "").trim(),
      phone: profile?.phone ?? "",
      birthDate: profile?.birthDate ?? "",
      interests: (Array.isArray(target?.interests) ? target.interests : []).join(", "),
    });
    setEditMode(true);
  }

  /* ---------- follow / unfollow (real) ---------- */
  async function toggleFollow() {
    if (!viewerId || isOwn || followBusy) return;
    setFollowBusy(true);
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: String(userId) }),
      });
      if (!response.ok) throw new Error("Follow failed");
      const data = await response.json();
      setFollowing(!!data.following);
      setIsFollowing(!!data.following);
      setFollowerDelta((d) => (data.following ? d + 1 : d - 1));
      setToast(data.following ? "Now following" : "Unfollowed");
    } catch {
      setToast("Could not follow. Try again.");
    } finally {
      setFollowBusy(false);
    }
  }

  /* ---------- netizen requests (real) ---------- */
  async function handleNetizenRequest(action: "send" | "accept" | "reject" | "cancel") {
    if (netizenBusy) return;
    setNetizenBusy(true);
    try {
      if (action === "send") {
        const response = await fetch("/api/netizen-requests", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toUserId: String(userId) }),
        });
        if (response.status === 409) {
          const data = await response.json().catch(() => ({}));
          if (data.message === "Already netizens.") {
            setNetizenStatus("accepted");
            setNetizenDirection(null);
            setToast("Already netizens.");
            return;
          }
          setToast("Request already sent.");
          return;
        }
        if (!response.ok) throw new Error("Send failed");
        const created = await response.json().catch(() => ({}));
        setNetizenStatus("pending");
        setNetizenDirection("sent");
        setNetizenRequestId(created.requestId ?? null);
        setToast("Netizen request sent.");
        return;
      }

      const response = await fetch("/api/netizen-requests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: netizenRequestId, action }),
      });
      if (!response.ok) throw new Error("Request failed");

      if (action === "accept") {
        setNetizenStatus("accepted");
        setNetizenDirection(null);
        setNetizensCount((c) => c + 1);
        setToast("Netizen request accepted.");
      } else if (action === "reject") {
        setNetizenStatus("rejected");
        setToast("Request rejected.");
      } else if (action === "cancel") {
        setNetizenStatus(null);
        setNetizenDirection(null);
        setNetizenRequestId(null);
        setToast("Request cancelled.");
      }
    } catch {
      setToast("Could not complete the request. Try again.");
    } finally {
      setNetizenBusy(false);
    }
  }

  async function saveEdit() {
    if (!isOwn) return;
    try {
      const response = await fetch(API.updateProfile, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editDraft.name.trim(),
          bio: editDraft.bio.trim(),
          location: editDraft.location.trim(),
          gender: editDraft.gender.trim(),
          country: editDraft.country.trim(),
          phone: editDraft.phone.trim(),
          birthDate: editDraft.birthDate.trim(),
          interests: editDraft.interests
            .split(",")
            .map((i) => i.trim().toLowerCase())
            .filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error("Save failed");
      const data = await response.json();
      setToast(data.message || "Profile saved.");
      setEditMode(false);
      setReloadKey((k) => k + 1);
    } catch {
      setToast("Could not save profile.");
    }
  }

  async function loadIncomingRequests() {
    try {
      const response = await fetch("/api/netizen-requests", {
        credentials: "include",
      });
      if (!response.ok) return;
      const data = await response.json();
      const received = Array.isArray(data?.received) ? data.received : [];
      setIncomingRequests(
        received.map((r: any) => ({
          id: String(r._id ?? r.id),
          fromUserId: String(r.fromUserId),
          fromName: r.user?.name || "Someone",
          fromImage: r.user?.image || r.user?.avatar || null,
        }))
      );
    } catch {}
  }

  async function handleIncomingRequest(requestId: string, action: "accept" | "reject") {
    if (netizenBusy) return;
    setNetizenBusy(true);
    try {
      const response = await fetch("/api/netizen-requests", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      if (!response.ok) throw new Error("Request failed");
      setToast(action === "accept" ? "Netizen request accepted." : "Request rejected.");
      await loadIncomingRequests();
      setNetizensCount((c) => c + (action === "accept" ? 1 : 0));
    } catch {
      setToast("Could not complete the request. Try again.");
    } finally {
      setNetizenBusy(false);
    }
  }

  /* ---------- photo upload ----------
     Avatar now goes through exactly the same steps as the cover:
     resize -> show instantly -> PATCH /api/profile -> keep state in sync.
     The avatar is sent as `image` AND `avatar` so it lands on the user
     document whichever field your schema uses, and after saving we
     re-read the profile to make sure the server really stored it. */
  async function handleFile(kind: "avatar" | "cover", file?: File | null) {
    if (!file) return;
    if (!isOwn) return setToast("You can only change your own photos");
    if (!profileLoaded) return setToast("Profile is still loading, try again in a moment");
    if (!file.type.startsWith("image/")) return setToast("Please choose an image file");
    if (file.size > 15 * 1024 * 1024) return setToast("That image is too large (15 MB max)");

    const previous = kind === "avatar" ? avatar : cover;
    const previousServerImage = target?.image || target?.avatar || "";
    setUploading(kind);

    try {
      const dataUrl = await prepareImage(
        file,
        kind === "avatar" ? { max: 512, square: true } : { max: 1400 }
      );

      // show it straight away, undo if saving fails
      if (kind === "avatar") setAvatar(dataUrl);
      else setCover(dataUrl);

      // Always send the other profile fields too, so nothing gets cleared
      const body: Record<string, string> = {
        bio: profile?.bio ?? "",
        location: profile?.location ?? "",
        phone: profile?.phone ?? "",
        birthDate: profile?.birthDate ?? "",
        coverImage: kind === "cover" ? dataUrl : cover ?? "",
      };
      if (kind === "avatar") {
        body.image = dataUrl;
        body.avatar = dataUrl; // in case your user schema uses "avatar"
      }

      const response = await fetch(API.updateProfile, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Upload failed");

      if (kind === "cover") {
        setProfile((p) => ({ ...(p ?? {}), coverImage: dataUrl }));
      } else {
        // Re-read the profile: proves the server stored it, and picks up
        // the final URL if your route uploads the image to storage.
        const check = await fetch(API.profile(String(userId)), {
          cache: "no-store",
          credentials: "include",
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null);

        const saved: string = check?.targetUser?.image || check?.targetUser?.avatar || "";
        if (!saved || saved === previousServerImage) {
          throw new Error("Server did not save the avatar");
        }

        setAvatar(saved);
        setTarget((t) => ({ ...(t ?? {}), image: saved, avatar: saved }));
      }

      setToast(kind === "avatar" ? "Profile photo updated" : "Cover photo updated");
    } catch {
      if (kind === "avatar") setAvatar(previous);
      else setCover(previous);
      setToast("Could not save the photo. Try again.");
    } finally {
      setUploading(null);
    }
  }

  /* ---------- edit / delete posts ---------- */
  async function savePost(id: string, content: string) {
    const before = posts;
    setPosts((list) => list.map((p) => (postId(p) === id ? { ...p, content } : p)));

    try {
      const response = await fetch(API.post(id), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", content }),
      });
      if (!response.ok) throw new Error("Edit failed");
      setToast("Post updated");
      return true;
    } catch {
      setPosts(before);
      setToast("Could not update the post");
      return false;
    }
  }

  async function deletePost(id: string) {
    const before = posts;
    setPosts((list) => list.filter((p) => postId(p) !== id));

    try {
      const response = await fetch(API.post(id), {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Delete failed");
      setToast("Post deleted");
      return true;
    } catch {
      setPosts(before);
      setToast("Could not delete the post");
      return false;
    }
  }

  /* ---------- the same actions the feed has ---------- */
  async function highlightPost(post: Post) {
    const id = postId(post);
    const current = postHighlights[id] ?? deriveHighlight(post, viewerId);
    const next = {
      highlighted: !current.highlighted,
      highlightCount: n(current.highlightCount + (current.highlighted ? -1 : 1)),
    };

    setPostHighlights((m) => ({ ...m, [id]: next }));

    try {
      const response = await fetch(API.highlight(id), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ highlighted: next.highlighted }),
      });
      if (!response.ok) throw new Error("Highlight failed");

      const data = await response.json().catch(() => ({}));
      if (typeof data?.highlightCount === "number") {
        setPostHighlights((m) => ({
          ...m,
          [id]: { ...next, highlightCount: n(data.highlightCount) },
        }));
      }
    } catch {
      setPostHighlights((m) => ({ ...m, [id]: current }));
    }
  }

  async function bookmarkPost(post: Post) {
    const id = postId(post);
    if (!id || !viewerId) return;
    const next = !bookmarkedIds.has(id);

    const apply = (value: boolean) =>
      setBookmarkedIds((set) => {
        const copy = new Set(set);
        if (value) copy.add(id);
        else copy.delete(id);
        return copy;
      });

    apply(next);

    try {
      const response = await fetch(API.bookmarks, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: id, bookmarked: next }),
      });
      if (!response.ok) throw new Error("Bookmark failed");
    } catch {
      apply(!next);
    }
  }

  async function resharePost(post: Post) {
    const id = postId(post);
    try {
      const response = await fetch(API.post(id), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reshare" }),
      });
      if (!response.ok) throw new Error("Reshare failed");
      setToast("Reshared to your profile");
      if (isOwn) setReloadKey((k) => k + 1);
    } catch {
      setToast("Could not reshare the post");
    }
  }

  const noop = () => {};

  const statItems = [
    { label: "Posts", value: postCount },
    { label: "Followers", value: followers },
    { label: "Netizens", value: netizensCount },
  ];

  const missingBio = isOwn && !bio;

  return (
    <div className={`fixed inset-0 z-50 flex flex-col overflow-y-auto ${ui.gap} ${ui.text}`}>
      {/* Sticky header */}
      <header
        className={`sticky top-0 z-20 flex items-center justify-between gap-2 border-b px-3 py-2.5 backdrop-blur ${ui.border} bg-white/95 dark:bg-[#101a17]/95`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close profile"
          className={`grid h-10 w-10 place-items-center rounded-full transition ${ui.text} ${ui.hover}`}
        >
          <X size={20} />
        </button>

        <h1 className="flex min-w-0 flex-1 items-center gap-1.5 text-base font-semibold">
          <span className="truncate">{isOwn ? "My profile" : displayName}</span>
          {isOwn && (
            <span className="rounded-full bg-[#e6f4ec] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#168b45] dark:bg-[#143a26] dark:text-[#7ee0b0]">
              You
            </span>
          )}
        </h1>

        {isOwn && (
          <button
            type="button"
            onClick={openSettings}
            aria-label="Settings"
            className={`grid h-10 w-10 place-items-center rounded-full transition ${ui.text} ${ui.hover}`}
          >
            <Settings size={20} />
          </button>
        )}
      </header>

      <main className="w-full flex-1 pb-16">
        {/* =====================================================
            PROFILE HEADER
        ====================================================== */}
        <div className={`${ui.page} pb-5`}>
          {/* Cover photo */}
          <div
            className="relative h-40 w-full overflow-hidden sm:h-56"
            style={{ background: "linear-gradient(135deg,#1c9d57 0%,#168b45 45%,#0f5f33 100%)" }}
          >
            {cover && <img src={cover} alt="Cover" className="h-full w-full object-cover" />}
            {/* soft fade so the buttons stay readable on any photo */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.35), transparent)" }} />

            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => coverInput.current?.click()}
                  disabled={uploading === "cover"}
                  aria-label="Change cover photo"
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition active:scale-95 disabled:opacity-70"
                >
                  {uploading === "cover" ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                  {cover ? "Edit cover" : "Add cover"}
                </button>
                <input
                  ref={coverInput}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    handleFile("cover", e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
              </>
            )}
          </div>

          <div className="mx-auto w-full max-w-2xl">
            {/* Photo + action buttons */}
            <div className="flex items-end justify-between gap-3 px-4">
              <div className="relative -mt-14 shrink-0">
                <div
                  className={`rounded-full p-1 shadow-sm ${ui.page}`}
                  onClick={() => {
                    if (avatar) {
                      setProfileImageOpen(true);
                    }
                  }}
                  style={{ cursor: avatar ? "pointer" : "default" }}
                >
                  <Face
                    src={avatar}
                    name={displayName}
                    className="h-28 w-28"
                    textClass="text-3xl"
                  />
                </div>

                {isOwn && (
                  <button
                    type="button"
                    onClick={openProfileSettings}
                    aria-label="Edit profile photo"
                    className="absolute bottom-1.5 right-1.5 grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-[#1c9d57] text-white shadow transition active:scale-95 dark:border-[#101a17]"
                  >
                    <Camera size={15} />
                  </button>
                )}
              </div>

              {/* Top of the profile: Edit profile for you, Follow + Add netizen for everyone else */}
              <div className="flex items-center gap-2 pb-1">
                {isOwn ? (
                  <button
                    type="button"
                    onClick={openEdit}
                    className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${ui.border} ${ui.text} ${ui.hover}`}
                  >
                    <Pencil size={15} />
                    Edit profile
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={toggleFollow}
                      disabled={followBusy}
                      className={`rounded-full px-5 py-2 text-sm font-semibold transition active:scale-95 ${
                        following
                          ? `border ${ui.border} ${ui.accent}`
                          : "bg-[#1c9d57] text-white hover:bg-[#168b45]"
                      }`}
                    >
                      {followBusy ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        following ? "Following" : "Follow"
                      )}
                    </button>

                    {netizenStatus === "accepted" ? (
                      <button
                        type="button"
                        disabled
                        className="flex items-center gap-1.5 rounded-full border-transparent bg-[#e6f4ec] text-[#168b45] text-sm font-semibold dark:bg-[#143a26] dark:text-[#7ee0b0]"
                      >
                        <UserCheck size={15} /> Added
                      </button>
                    ) : netizenStatus === "pending" && netizenDirection === "sent" ? (
                      <button
                        type="button"
                        onClick={() => handleNetizenRequest("cancel")}
                        disabled={netizenBusy}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${ui.border} ${ui.accent} ${ui.hover}`}
                      >
                        {netizenBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserPlus size={15} />
                        )}
                        {netizenBusy ? "Sending…" : "Request sent"}
                      </button>
                    ) : netizenStatus === "pending" && netizenDirection === "received" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleNetizenRequest("accept")}
                          disabled={netizenBusy}
                          className="rounded-full bg-[#1c9d57] text-white px-4 py-2 text-sm font-semibold transition active:scale-95 disabled:opacity-60"
                        >
                          {netizenBusy ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleNetizenRequest("reject")}
                          disabled={netizenBusy}
                          className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${ui.border} ${ui.text} ${ui.hover}`}
                        >
                          Decline
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleNetizenRequest("send")}
                        disabled={netizenBusy}
                        className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 ${ui.border} ${ui.accent} ${ui.hover}`}
                      >
                        {netizenBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <UserPlus size={15} />
                        )}
                        {netizenBusy ? "Sending…" : "Add netizen"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Name, handle, bio */}
            <section className="px-4 pt-3">
              <h2 className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-2xl font-bold leading-tight">
                <span className="min-w-0 break-words">{displayName}</span>
                <VerifiedBadge size={22} />
                {target?.isPro && (
                  <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white" style={{ background: "linear-gradient(90deg,#1c9d57,#0f7a42)" }}>
                    Pro
                  </span>
                )}
              </h2>
              <p className={`text-sm ${ui.muted}`}>{handle}</p>

              {bio ? (
                <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-[1.6]">
                  {bio}
                </p>
              ) : missingBio ? (
                <button
                  type="button"
                  onClick={openSettings}
                  className={`mt-3 flex items-center gap-1.5 rounded-full border border-dashed px-3 py-1.5 text-sm font-medium ${ui.border} ${ui.accent} ${ui.hover}`}
                >
                  <Plus size={14} />
                  Add a bio
                </button>
              ) : null}

              {/* Details: gender & country alongside bio - always show with fallback */}
              <div className={`mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm ${ui.muted}`}>
                <span className="flex items-center gap-1.5">
                  <UserRound size={15} />
                  <span className="font-medium">Gender:</span> {gender || "Not available"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Globe size={15} />
                  <span className="font-medium">Country:</span> {country || "Not available"}
                </span>
                {location && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={15} />
                    {location}
                  </span>
                )}
                {joined && (
                  <span className="flex items-center gap-1.5">
                    <CalendarDays size={15} />
                    Joined {joined}
                  </span>
                )}
              </div>

              {/* Interests */}
              {interests.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {interests.slice(0, 8).map((interest) => (
                    <span
                      key={interest}
                      className="rounded-full bg-[#e6f4ec] px-2.5 py-1 text-xs font-medium capitalize text-[#168b45] dark:bg-[#143a26] dark:text-[#7ee0b0]"
                    >
                      {interest.replace(/-/g, " ")}
                    </span>
                  ))}
                  {interests.length > 8 && (
                    <span className={`px-1 py-1 text-xs font-medium ${ui.muted}`}>
                      +{interests.length - 8}
                    </span>
                  )}
                </div>
              )}
            </section>

            {/* Own profile: inline editor for user-schema fields */}
            {isOwn && editMode && (
              <section className="mx-4 mt-5 rounded-2xl border p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#68776f]">Edit profile</h3>
                  <button type="button" onClick={() => setEditMode(false)} className="grid h-7 w-7 place-items-center rounded-full text-[#5b6b62] hover:bg-[#e8efe8]"><X size={16} /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <label className="text-xs font-medium text-[#68776f] block"><span>Display name</span><input value={editDraft.name} onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                    <label className="text-xs font-medium text-[#68776f] block sm:col-span-2"><span>Bio</span><textarea value={editDraft.bio} onChange={(e) => setEditDraft((d) => ({ ...d, bio: e.target.value }))} rows={3} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <label className="text-xs font-medium text-[#68776f] block"><span>Location</span><input value={editDraft.location} onChange={(e) => setEditDraft((d) => ({ ...d, location: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                    <label className="text-xs font-medium text-[#68776f] block"><span>Gender</span><input value={editDraft.gender} onChange={(e) => setEditDraft((d) => ({ ...d, gender: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <label className="text-xs font-medium text-[#68776f] block"><span>Country</span><input value={editDraft.country} onChange={(e) => setEditDraft((d) => ({ ...d, country: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                    <label className="text-xs font-medium text-[#68776f] block"><span>Phone</span><input value={editDraft.phone} onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <label className="text-xs font-medium text-[#68776f] block"><span>Birth date</span><input type="date" value={editDraft.birthDate} onChange={(e) => setEditDraft((d) => ({ ...d, birthDate: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                    <label className="text-xs font-medium text-[#68776f] block sm:col-span-2"><span>Interests (comma separated)</span><input value={editDraft.interests} onChange={(e) => setEditDraft((d) => ({ ...d, interests: e.target.value }))} className="mt-1 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2 outline-none focus:border-[#1c9d57]" /></label>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button type="button" onClick={() => setEditMode(false)} className="rounded-xl border border-[#dfe9e2] px-4 py-2 text-sm font-semibold text-[#42534d] hover:bg-[#f7faf8]">Cancel</button>
                    <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#1c9d57] px-5 py-2 text-sm font-semibold text-white active:scale-95"><Save size={16} /> Save</button>
                  </div>
                </form>
              </section>
            )}

            {/* Own profile: incoming netizen requests */}
            {isOwn && incomingRequests.length > 0 && !editMode && (
              <section className="mx-4 mt-5 rounded-2xl border p-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-[#68776f]">Netizen requests</h3>
                </div>
                <div className="space-y-2">
                  {incomingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl border bg-white">
                      <Face src={req.fromImage} name={req.fromName} className="h-9 w-9" textClass="text-sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#15271d]">{req.fromName} wants to add you as a netizen</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleIncomingRequest(req.id, "accept")} disabled={netizenBusy} className="rounded-full bg-[#1c9d57] text-white px-3 py-1.5 text-xs font-semibold transition active:scale-95 disabled:opacity-60">Accept</button>
                        <button type="button" onClick={() => handleIncomingRequest(req.id, "reject")} disabled={netizenBusy} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${ui.border} ${ui.text} ${ui.hover} disabled:opacity-60`}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Stats card */}
            <div
              className={`mx-4 mt-5 grid grid-cols-3 divide-x rounded-2xl border py-3 ${ui.border} divide-[#e3ebe6] dark:divide-[#1e3a2f]`}
            >
              {statItems.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p className="text-lg font-bold leading-tight">
                    {stat.value > 0 ? compact(stat.value) : "–"}
                  </p>
                  <p className={`text-xs ${ui.muted}`}>
                    {stat.label === "Posts" && stat.value === 1
                      ? "Post"
                      : stat.label === "Followers" && stat.value === 1
                        ? "Follower"
                        : stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* =====================================================
            POSTS: each one is its own separated card
        ====================================================== */}
        <section className="mx-auto mt-3 w-full max-w-2xl">
          <h3
            className={`px-4 pb-2 pt-1 text-sm font-semibold uppercase tracking-wide ${ui.muted}`}
          >
            {isOwn ? "Your posts" : "Posts"}
          </h3>

          {loading ? (
            <div className={`space-y-3`}>
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className={`animate-pulse space-y-3 border-y px-3 py-4 ${ui.border} ${ui.page}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-full ${ui.bubble}`} />
                    <div className="space-y-2">
                      <div className={`h-3 w-28 rounded ${ui.bubble}`} />
                      <div className={`h-2.5 w-16 rounded ${ui.bubble}`} />
                    </div>
                  </div>
                  <div className={`h-3 w-full rounded ${ui.bubble}`} />
                  <div className={`h-3 w-2/3 rounded ${ui.bubble}`} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className={`border-y px-3 py-10 text-center ${ui.border} ${ui.page}`}>
              <p className="text-sm text-[#e0344f]">{error}</p>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className={`mt-3 rounded-full border px-4 py-1.5 text-sm font-semibold ${ui.border} ${ui.accent}`}
              >
                Try again
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div
              className={`border-y px-3 py-12 text-center text-sm ${ui.border} ${ui.page} ${ui.muted}`}
            >
              {isOwn ? "You haven't posted anything yet." : "No posts yet"}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => {
                const id = postId(post);
                const base = deriveHighlight(post, viewerId);

                // keep the newest profile photo and name on this person's own posts
                const cardPost = {
                  ...post,
                  userName: post.userName || displayName,
                  userImage:
                    String(post.userId ?? "") === String(userId) ? avatar : post.userImage,
                  userHandle: post.userHandle || rawHandle || undefined,
                };

                return (
                  <ProfilePostItem
                    key={id}
                    post={post}
                    isOwn={isOwn && String(post.userId ?? userId) === String(userId)}
                    onSave={savePost}
                    onDelete={deletePost}
                    renderCard={(menuSlot) => (
                      <PostCard
                        post={cardPost as any}
                        postId={id}
                        imageList={imagesFor(post)}
                        isLiked={base.highlighted}
                        isHighlighted={base.highlighted}
                        sessionUserId={viewerId}
                        onOpenProfile={noop}
                        onSelectPost={(p: any) => setSelectedPost(p)}
                        onLike={noop}
                        onComment={(p: any) => setSelectedPost(p)}
                        onShare={noop}
                        onReshare={(p: any) => resharePost(p ?? post)}
                        onHighlight={(p: any) => highlightPost(p ?? post)}
                        postHighlights={postHighlights}
                        onCommentDraftChange={noop}
                        commentDraft=""
                        commenting={false}
                        onToggleCommenting={noop}
                        postLikes={{}}
                        onHandleComment={noop}
                        bookmarkedIds={bookmarkedIds}
                        onBookmark={(p: any) => bookmarkPost(p ?? post)}
                        hideFollow
                        menuSlot={menuSlot}
                      />
                    )}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Post page: opens on top of the profile */}
      {selectedPost && (
        <PostDetailModal
          post={selectedPost as any}
          onClose={() => setSelectedPost(null)}
          onSelectPost={(p: any) => setSelectedPost(p)}
          sessionUserId={viewerId}
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#15271d] px-4 py-2 text-sm font-medium text-white shadow-lg dark:bg-[#e6ece9] dark:text-[#101a17]"
        >
          {toast}
        </div>
      )}

      {/* Full screen profile image viewer */}
      {profileImageOpen && avatar && (
        <ProfileImageModal
          src={avatar}
          alt={displayName}
          onClose={() => setProfileImageOpen(false)}
        />
      )}
    </div>
  );
}