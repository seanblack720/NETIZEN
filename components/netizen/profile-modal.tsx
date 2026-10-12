"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

type Post = {
  id?: string | { toString(): string };
  _id?: string | { toString(): string };
  content?: string;
  images?: string[] | null;
  userId?: string;
  userName?: string | null;
  userImage?: string | null;
  likes?: number;
  comments?: number;
  shares?: number;
  createdAt?: string | Date;
};

export function ProfileModal({
  userId,
  userName,
  userImage,
  onClose,
}: {
  userId: string;
  userName?: string | null;
  userImage?: string | null;
  onClose: () => void;
}) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`/api/profile/posts?userId=${encodeURIComponent(String(userId))}`, {
          cache: "no-store",
          credentials: "include",
        });

        if (!response.ok) throw new Error("Failed to load posts");

        const data = await response.json();
        if (!cancelled) setPosts(Array.isArray(data.posts) ? data.posts : []);
      } catch (err) {
        if (!cancelled) setError("Unable to load posts.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Lock background scroll while the page is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const initials = (userName || "?").slice(0, 2).toUpperCase();
  const handle = (userName || "user").toLowerCase().replace(/\s+/g, ".");

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-white">
      {/* Sticky header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#edf2ee] bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-semibold text-[#111827]">Profile</h1>
        <button
          onClick={onClose}
          aria-label="Close profile"
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#5b6b62] transition hover:bg-[#e8efe8]"
        >
          <X className="h-5 w-5" />
        </button>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10">
        {/* Profile info */}
        <section className="flex flex-col items-center py-8 text-center">
          <div className="h-24 w-24 overflow-hidden rounded-full bg-[#e8efe8] text-2xl font-semibold text-[#2f6b4f]">
            {userImage ? (
              <img src={userImage} alt={userName || "User"} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">{initials}</div>
            )}
          </div>
          <div className="mt-3 text-xl font-semibold text-[#111827]">{userName || "User"}</div>
          <div className="text-sm text-[#5b6b62]">@{handle}</div>
          {!loading && !error && (
            <div className="mt-3 text-sm text-[#5b6b62]">
              <span className="font-semibold text-[#111827]">{posts.length}</span>{" "}
              {posts.length === 1 ? "post" : "posts"}
            </div>
          )}
        </section>

        <div className="border-t border-[#edf2ee] pt-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#5b6b62]">Posts</h2>

          {loading ? (
            <div className="text-sm text-[#5b6b62]">Loading posts…</div>
          ) : error ? (
            <div className="text-sm text-[#8a3a28]">{error}</div>
          ) : posts.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#5b6b62]">No posts yet</div>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => {
                const postId = String(post.id ?? post._id ?? "");
                const imageList: string[] = Array.isArray(post.images)
                  ? (post.images.filter(Boolean) as string[])
                  : [];

                return (
                  <article key={postId} className="rounded-xl border border-[#edf2ee] bg-white p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#e8efe8] text-sm font-semibold text-[#2f6b4f]">
                        {userImage ? (
                          <img src={userImage} alt={userName || "User"} className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="whitespace-pre-wrap break-words text-sm text-[#111827]">{post.content}</div>
                        {imageList.length > 0 && (
                          <img src={imageList[0]} alt="Post" className="mt-2 w-full rounded-lg object-cover" />
                        )}
                        <div className="mt-2 flex gap-4 text-xs text-[#5b6d62]">
                          <span>{post.likes ?? 0} likes</span>
                          <span>{post.comments ?? 0} comments</span>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}