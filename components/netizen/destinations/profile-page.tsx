"use client";

import { Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  createdAt?: string | Date;
};

type Post = {
  _id?: string | { toString(): string };
  id?: string;
  title?: string | null;
  content: string;
  images?: string[] | null;
  createdAt?: string | Date;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
};

function initials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "N";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function formatDate(value?: string | Date) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(value?: string | Date) {
  if (!value) return "Just now";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  const diffMinutes = Math.max(
    1,
    Math.round((Date.now() - date.getTime()) / 60000)
  );

  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.round(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours} hr`;
  }

  const diffDays = Math.round(diffHours / 24);

  return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
}

function ImageFallbackIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="M21 16l-5.2-5.2a2 2 0 0 0-2.8 0L4 19" />
    </svg>
  );
}

export function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        setLoading(true);

        const sessionResponse = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!sessionResponse.ok) {
          if (!cancelled) {
            setUser(null);
            setPosts([]);
          }
          return;
        }

        const sessionData = await sessionResponse.json();
        const currentUser = sessionData?.user;

        if (!currentUser?.id || cancelled) {
          return;
        }

        if (!cancelled) {
          setUser(currentUser);
        }

        const postsResponse = await fetch(`/api/posts/${currentUser.id}`, {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (postsResponse.ok) {
          const postsData = await postsResponse.json();

          if (!cancelled) {
            setPosts(postsData.posts || []);
          }
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
        if (!cancelled) {
          setUser(null);
          setPosts([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-3xl border border-[#e9efe9] bg-white p-4 shadow-sm">
        <div className="h-28 animate-pulse rounded-2xl bg-[#e8efe7]" />
        <div className="-mt-10 flex items-end gap-3 px-2">
          <div className="h-20 w-20 animate-pulse rounded-full border-4 border-white bg-[#dfe9df]" />
          <div className="h-5 w-28 animate-pulse rounded bg-[#e8efe7]" />
        </div>
        <div className="mt-4 space-y-2 px-2">
          <div className="h-4 w-40 animate-pulse rounded bg-[#e8efe7]" />
          <div className="h-3 w-full animate-pulse rounded bg-[#edf1ee]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-3xl border border-dashed border-[#d7e0d7] bg-[#f8faf8] p-6 text-center text-[#506157] shadow-sm">
        <h2 className="text-lg font-semibold text-[#122219]">Profile</h2>
        <p className="mt-2 text-sm">Sign in to see your profile and activity.</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-xl bg-[#07843b] px-4 py-2.5 text-sm font-semibold text-white"
        >
          Log in to continue
        </Link>
      </div>
    );
  }

  const joinedDate = formatDate(user.createdAt);

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e9efe9] bg-white shadow-[0_1px_2px_rgba(17,34,26,0.05),0_8px_24px_rgba(17,34,26,0.04)]">
      <div
        className="relative h-28 w-full"
        style={{
          background:
            "linear-gradient(135deg, #2f6b4f 0%, #4a8a67 48%, #8db79a 100%)",
        }}
      >
        <div className="absolute -bottom-10 left-5 flex items-end gap-3">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-[#e7efe8] text-lg font-semibold text-[#2f6b4f] shadow-sm">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name || user.email || "User profile"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials(user.name, user.email)
            )}
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 pt-14">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[#122219]">
              {user.name || "Unnamed user"}
            </h2>
            {user.email && (
              <p className="mt-1 text-sm text-[#5f7168]">{user.email}</p>
            )}
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = "/settings"; }}
            className="rounded-full bg-[#eaf4ed] px-3 py-1.5 text-xs font-medium text-[#204d39]"
          >
            Edit profile
          </button>
        </div>

        <p className="mt-4 text-sm leading-6 text-[#3b4d45]">
          Community organiser, local volunteer, and neighbourhood advocate.
          Sharing ideas, events, and opportunities with people who care about
          where they live.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-[#5b6d62]">
          <span>
            <span className="font-semibold text-[#122219]">{posts.length}</span> posts
          </span>
          <span>
            <span className="font-semibold text-[#122219]">243</span> followers
          </span>
          <span>
            <span className="font-semibold text-[#122219]">186</span> following
          </span>
          {joinedDate && <span>Joined {joinedDate}</span>}
        </div>
      </div>

      <div className="border-t border-[#edf2ee] px-4 py-4">
        <h3 className="text-base font-semibold text-[#122219]">Recent posts</h3>

        {posts.length === 0 ? (
          <div className="mt-3 flex flex-col items-center rounded-2xl border border-dashed border-[#dfe8df] bg-[#f9fbf9] px-4 py-6 text-center text-sm text-[#5f7168]">
            <ImageFallbackIcon className="h-6 w-6" />
            <p className="mt-2">No posts yet</p>
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            {posts.map((post) => {
              const postId = post.id || String(post._id || "");
              const created = formatRelativeTime(post.createdAt);
              const imageList: string[] = Array.isArray(post.images)
                ? post.images.filter(
                    (image): image is string =>
                      typeof image === "string" && image.trim().length > 0
                  )
                : [];

              return (
                <article
                  key={postId}
                  className="rounded-[18px] border border-[#edf2ee] bg-[#f9fbf9] p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-xs font-semibold text-[#2f6b4f]">
                      {post.userImage ? (
                        <img
                          src={post.userImage}
                          alt={post.userName || "User"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        initials(post.userName || user?.name, user?.email)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <b className="text-sm font-semibold text-[#111827]">
                          {post.userName || user?.name || "User"}
                        </b>
                      </div>
                      <div className="text-xs text-[#5b6b62]">
                        @{(post.userName || user?.name || "user")
                          .toLowerCase()
                          .replace(/\s+/g, ".")} · {created}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="More options"
                      className="text-[#697770]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#111827]">
                    {post.content}
                  </p>

                  {imageList.length > 0 && (
                    <div className="mt-3 overflow-hidden rounded-[14px] border border-[#edf2ee] bg-[#f5f7f5]">
                      {imageList.length === 1 ? (
                        <div className="relative h-64 w-full overflow-hidden">
                          <img
                            src={imageList[0]}
                            alt="Post"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-1">
                          {imageList.slice(0, 4).map((image, index) => (
                            <div
                              key={`${postId}-image-${index}`}
                              className={`relative overflow-hidden ${
                                imageList.length === 3 && index === 2
                                  ? "col-span-2 h-40"
                                  : "h-40"
                              }`}
                            >
                              <img
                                src={image}
                                alt={`Post ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 flex items-center gap-4 text-xs text-[#5b6d62]">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-[#f4f7f4]"
                    >
                      <Heart className="h-3.5 w-3.5" />
                      <span>{post.likes ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-[#f4f7f4]"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                      <span>{post.comments ?? 0}</span>
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition hover:bg-[#f4f7f4]"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{post.shares ?? 0}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
