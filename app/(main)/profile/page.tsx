"use client";

import { Heart, MessageCircle, MoreHorizontal, Send } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type SessionData = {
  user: User;
  session?: {
    id?: string;
    expiresAt?: string | Date;
    token?: string;
  };
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

function initials(
  name?: string | null,
  email?: string | null
) {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);

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

function TrashIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 7h16" />
      <path d="M9 7V4.8c0-.44.36-.8.8-.8h4.4c.44 0 .8.36.8.8V7" />
      <path d="M6 7l1 13.2c.04.98.86 1.8 1.84 1.8h6.32c.98 0 1.8-.82 1.84-1.8L18 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
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

export default function UserPage() {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const [posts, setPosts] = useState<Post[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function getSession() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          setSession(null);
          return;
        }

        const data = await response.json();

        if (!data?.user) {
          setSession(null);
          return;
        }

        setSession(data);

        await getUserPosts(data.user.id);
      } catch (err) {
        console.error("Failed to get session:", err);
        setSession(null);
        setError("Unable to check your session.");
      } finally {
        setLoading(false);
      }
    }

    async function getUserPosts(userId: string) {
      try {
        const response = await fetch("/api/posts", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch posts.");
        }

        const data = await response.json();
        const fetchedPosts: Post[] = Array.isArray(data.posts) ? data.posts : [];

        setPosts(
          fetchedPosts.filter((post) => {
            const postUserId = post.userId ? String(post.userId) : "";
            const sessionUserName = session?.user?.name ?? "";
            return (
              postUserId === String(userId) ||
              (post.userName && post.userName === sessionUserName)
            );
          })
        );
      } catch (err) {
        console.error("Failed to fetch posts:", err);
        setError("Unable to fetch posts.");
      }
    }

    getSession();
  }, []);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      router.push("/");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
      setError("Unable to log out. Try again.");
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleDeletePost(postId: string) {
    const previous = posts;

    try {
      setDeletingId(postId);
      setError("");

      setPosts((currentPosts) =>
        currentPosts.filter((post) => {
          const currentId = post.id || String(post._id || "");
          return currentId !== postId;
        })
      );

      const response = await fetch(`/api/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || `Delete failed with status ${response.status}`
        );
      }
    } catch (err) {
      console.error("Delete post error:", err);
      setPosts(previous);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete post. Try again."
      );
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F3F6F1]">
        <div className="mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:px-6">
          <div className="h-32 animate-pulse rounded-2xl bg-[#E1E8DE] sm:h-40" />
          <div className="-mt-10 flex items-end gap-4 px-2 sm:-mt-12">
            <div className="h-20 w-20 animate-pulse rounded-full border-4 border-[#F3F6F1] bg-[#D3DDCE] sm:h-24 sm:w-24" />
          </div>
          <div className="mt-4 space-y-2 px-2">
            <div className="h-5 w-40 animate-pulse rounded bg-[#E1E8DE]" />
            <div className="h-4 w-56 animate-pulse rounded bg-[#E1E8DE]" />
          </div>
          <div className="mt-8 space-y-4">
            {[0, 1].map((i) => (
              <div key={i} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="h-40 w-full animate-pulse rounded-xl bg-[#E1E8DE]" />
                <div className="mt-3 h-4 w-2/3 animate-pulse rounded bg-[#E1E8DE]" />
                <div className="mt-2 h-3 w-full animate-pulse rounded bg-[#E1E8DE]" />
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F3F6F1] px-4 text-center">
        <div className="max-w-sm">
          <h1 className="text-xl font-semibold text-[#11221A]">You&apos;re signed out</h1>
          <p className="mt-2 text-sm text-[#5B6B62]">
            Sign in to see your profile and posts.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-full bg-[#2F6B4F] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1F4D38]"
          >
            Go to sign in
          </button>
        </div>
      </main>
    );
  }

  const { user } = session;
  const joined = formatDate(user.createdAt);

  return (
    <main className="min-h-screen bg-[#F3F6F1] text-[#11221A]">
      <div className="mx-auto w-full max-w-2xl pb-16 sm:px-6">
        <div className="relative">
          <div
            className="h-32 w-full sm:h-40 sm:rounded-b-2xl"
            style={{
              background:
                "linear-gradient(135deg, #2F6B4F 0%, #3F8A66 55%, #6FAE87 100%)",
            }}
          />

          <div className="absolute -bottom-10 left-4 sm:-bottom-12 sm:left-6">
            <div className="h-20 w-20 overflow-hidden rounded-full border-4 border-[#F3F6F1] bg-[#DCE6D6] shadow-sm sm:h-24 sm:w-24">
              {user.image ? (
                <img
                  src={user.image}
                  alt={user.name || "Profile photo"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-[#2F6B4F] sm:text-xl">
                  {initials(user.name, user.email)}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="absolute right-4 top-4 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-[#11221A] shadow-sm backdrop-blur transition-colors hover:bg-white disabled:opacity-60 sm:right-6"
          >
            {loggingOut ? "Logging out…" : "Log out"}
          </button>
        </div>

        <div className="mt-12 px-4 sm:mt-14 sm:px-0">
          <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
            {user.name || "Unnamed user"}
          </h1>

          {user.email && (
            <p className="mt-0.5 text-sm text-[#5B6B62]">{user.email}</p>
          )}

          <div className="mt-3 flex items-center gap-4 text-sm text-[#5B6B62]">
            <span>
              <span className="font-semibold text-[#11221A]">{posts.length}</span>{" "}
              {posts.length === 1 ? "post" : "posts"}
            </span>
            {joined && <span>Joined {joined}</span>}
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-6 rounded-xl border border-[#E7B7AA] bg-[#FBEDE9] px-4 py-3 text-sm text-[#8A3A28] sm:mx-0">
            {error}
          </div>
        )}

        <section className="mt-8 px-4 sm:px-0">
          <div className="space-y-5">
            {posts.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#D3DDCE] bg-white/60 px-6 py-12 text-center">
                <ImageFallbackIcon className="h-8 w-8 text-[#9CB3A3]" />
                <p className="mt-3 text-sm font-medium text-[#11221A]">No posts yet</p>
                <p className="mt-1 text-sm text-[#5B6B62]">
                  Anything you share will show up here.
                </p>
              </div>
            ) : (
              posts.map((post) => {
                const postId = post.id || String(post._id || "");
                const created = formatRelativeTime(post.createdAt);
                const imageList: string[] = Array.isArray(post.images)
                  ? post.images.filter(
                      (image): image is string =>
                        typeof image === "string" && image.trim().length > 0
                    )
                  : [];
                const isDeleting = deletingId === postId;

                return (
                  <article
                    key={postId || `${post.userId}-${post.createdAt}`}
                    className="rounded-[22px] border border-[#ecf0ec] bg-white p-4 shadow-[0_1px_2px_rgba(17,34,26,0.05),0_10px_24px_rgba(17,34,26,0.03)]"
                    style={{ opacity: isDeleting ? 0.6 : 1 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-sm font-semibold text-[#2f6b4f]">
                          {post.userImage ? (
                            <img
                              src={post.userImage}
                              alt={post.userName || user.name || "User"}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials(post.userName || user.name, user.email)
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <b className="text-[15px] font-semibold text-[#111827]">
                              {post.userName || user.name || "Unnamed user"}
                            </b>
                          </div>
                          <div className="mt-0.5 text-sm text-[#5b6b62]">
                            @{(post.userName || user.name || "user")
                              .toLowerCase()
                              .replace(/\s+/g, ".")} · {created}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="More options"
                        className="rounded-full p-1 text-[#697770] transition hover:bg-[#f2f6f3]"
                      >
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>

                    <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-[#111827]">
                      {post.content}
                    </p>

                    {imageList.length > 0 && (
                      <div className="mt-4 overflow-hidden rounded-[18px] border border-[#edf2ee] bg-[#f5f7f5]">
                        {imageList.length === 1 ? (
                          <div className="relative h-96 w-full overflow-hidden">
                            <img
                              src={imageList[0]}
                              alt="Post"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1">
                            {imageList.slice(0, 4).map((image, index) => {
                              const extra = imageList.length - 4;
                              const isLast = index === 3 && extra > 0;
                              return (
                                <div
                                  key={`${postId}-image-${index}`}
                                  className={`relative overflow-hidden ${
                                    imageList.length === 3 && index === 2 ? "col-span-2 h-56" : "h-52"
                                  }`}
                                >
                                  <img
                                    src={image}
                                    alt={`Post ${index + 1}`}
                                    className="h-full w-full object-cover"
                                  />
                                  {isLast && (
                                    <span className="absolute inset-0 grid place-items-center bg-black/55 text-xl font-bold text-white">
                                      +{extra}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-4 flex items-center gap-6 text-sm text-[#5b6d62]">
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[#f4f7f4]"
                      >
                        <Heart className="h-4 w-4" />
                        <span>{post.likes ?? 0}</span>
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[#f4f7f4]"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.comments ?? 0}</span>
                      </button>

                      <button
                        type="button"
                        className="inline-flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-[#f4f7f4]"
                      >
                        <Send className="h-4 w-4" />
                        <span>{post.shares ?? 0}</span>
                      </button>

                      {postId ? (
                        <Link
                          href={`/posts/${postId}`}
                          className="ml-auto inline-flex items-center rounded-full border border-[#dbe7dd] bg-[#f4f8f4] px-3 py-1.5 text-xs font-medium text-[#17372d] transition hover:bg-[#eaf3eb]"
                        >
                          View post
                        </Link>
                      ) : null}

                      {String(post.userId) === String(user.id) && (
                        <button
                          type="button"
                          onClick={() => handleDeletePost(postId)}
                          disabled={isDeleting}
                          aria-label="Delete post"
                          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[#9CB3A3] transition hover:bg-[#FBEDE9] hover:text-[#C4432B] disabled:opacity-50"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>{isDeleting ? "Deleting..." : "Delete"}</span>
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
