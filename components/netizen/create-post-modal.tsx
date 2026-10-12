"use client";

import { ImageIcon, User as UserIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import Link from "next/link";

import { Avatar } from "./avatar";
import { useModalHistory } from "./use-modal-history";

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type CreatePostModalProps = {
  onClose: () => void;
  onPost?: (post: {
    id?: string;
    _id?: string;
    content?: string;
    images?: string[] | null;
    userId?: string;
    userName?: string | null;
    userImage?: string | null;
    likes?: number;
    comments?: number;
    shares?: number;
    likedBy?: string[];
    createdAt?: string | Date;
  }) => void;
};

const MAX_IMAGES = 4;
const MAX_RAW_FILE_SIZE = 10 * 1024 * 1024; // 10MB — generous, since we compress before upload
const MAX_DIMENSION = 1600; // longest edge, in pixels, after resizing
const JPEG_QUALITY = 0.82;

// Resize + re-encode an image client-side so large phone-camera photos
// (often 6–12MB) reliably fit within request/document size limits.
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      let { width, height } = img;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      URL.revokeObjectURL(objectUrl);

      if (!ctx) {
        reject(new Error("Canvas is not supported in this browser"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Couldn't load that image"));
    };

    img.src = objectUrl;
  });
}

export function CreatePostModal({ onClose, onPost }: CreatePostModalProps) {
  // Pressing the browser/Android back button closes the modal instead of
  // navigating away from the feed.
  useModalHistory(onClose);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  const [body, setBody] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [processingImages, setProcessingImages] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState("");

  // Load the current user from the session so we post with a real user id
  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) return;

        const data = await response.json();

        if (!cancelled && data?.user) {
          setUser(data.user);
        }
      } catch (err) {
        console.error("Failed to load user for post modal:", err);
      } finally {
        if (!cancelled) setLoadingUser(false);
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  // Close on Escape for keyboard users
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    // Reset immediately so selecting the same file again still fires onChange
    event.target.value = "";

    if (files.length === 0) return;

    setImageError("");

    const remainingSlots = MAX_IMAGES - images.length;

    if (remainingSlots <= 0) {
      setImageError(`You can attach up to ${MAX_IMAGES} photos.`);
      return;
    }

    const candidates = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setImageError(`You can attach up to ${MAX_IMAGES} photos.`);
    }

    const validFiles: File[] = [];

    for (const file of candidates) {
      if (!file.type.startsWith("image/")) {
        setImageError("Only image files are supported.");
        continue;
      }

      if (file.size > MAX_RAW_FILE_SIZE) {
        setImageError(`Each photo must be under ${MAX_RAW_FILE_SIZE / (1024 * 1024)}MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    setProcessingImages(true);

    try {
      const compressed = await Promise.all(validFiles.map(compressImage));
      setImages((prev) => [...prev, ...compressed].slice(0, MAX_IMAGES));
    } catch (err) {
      console.error("Image processing error:", err);
      setImageError("Couldn't process one of the images. Try again.");
    } finally {
      setProcessingImages(false);
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  const canPost =
    body.trim().length > 0 && !loading && !loadingUser && !processingImages && !!user?.id;

  async function handlePost() {
    const content = body.trim();

    if (!content || loading || !user?.id) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          userId: user.id,
          images, // base64 data-url strings, stored as-is on the post document
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to create post");
      }

      const createdPost = {
        id: data?.post?._id ? String(data.post._id) : undefined,
        _id: data?.post?._id ? String(data.post._id) : undefined,
        content: data?.post?.content ?? content,
        images: Array.isArray(data?.post?.images) ? data.post.images : images,
        userId: user.id,
        userName: user.name ?? null,
        userImage: user.image ?? null,
        likes: 0,
        comments: 0,
        shares: 0,
        likedBy: [],
        createdAt: new Date().toISOString(),
      };

      onPost?.(createdPost);
      setBody("");
      setImages([]);
      onClose();
    } catch (err) {
      console.error("Create post error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-0 pt-[134px] backdrop-blur-sm md:px-4 md:pt-[78px]"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-labelledby="create-post-title"
        aria-modal="true"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full flex-col overflow-hidden bg-white md:max-w-[560px] md:rounded-3xl md:border md:border-[#e3ebe6] md:shadow-2xl"
      >
        {/* Header */}
        <header className="grid shrink-0 grid-cols-[44px_1fr_44px] items-center border-b border-[#e3ebe6] bg-white px-3 py-3">
          <button
            aria-label="Close create post"
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full text-[#15271d] transition hover:bg-[#f0f4f1]"
          >
            <X size={20} aria-hidden="true" />
          </button>

          <h2 id="create-post-title" className="text-center text-base font-semibold text-[#15271d]">
            Create post
          </h2>

          <span aria-hidden="true" />
        </header>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Composer section */}
          <div className="border-b border-[#eef2ef] px-4 py-4">
            <div className="flex items-center gap-3">
              {user?.image ? (
                <Avatar src={user.image} alt={user?.name || "You"} />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef5f0] text-[#7c8b83]"
                >
                  <UserIcon size={20} />
                </span>
              )}

              <div>
                <p className="text-sm font-semibold text-[#15271d]">
                  {loadingUser ? "Loading..." : user?.name || "Unknown user"}
                </p>
                <span className="mt-1 inline-flex items-center rounded-full bg-[#f0f4f1] px-2 py-0.5 text-xs font-medium text-[#68776f]">
                  Public · Anyone on Netizen
                </span>
              </div>
            </div>

            {!loadingUser && !user && (
              <div className="mt-4 rounded-xl border border-[#cfe8d8] bg-[#f1faf4] p-3 text-sm text-[#28573d]">
                <p>You need to be logged in to create a post.</p>
                <Link href="/login" className="mt-2 inline-block font-semibold text-[#07843b] underline underline-offset-2">
                  Log in
                </Link>
              </div>
            )}

            <textarea
              autoFocus
              value={body}
              placeholder="What's on your mind?"
              onChange={(event) => setBody(event.target.value)}
              disabled={loading || !user}
              aria-label="Post content"
              className="mt-4 min-h-[140px] w-full resize-none border-none text-[15px] leading-6 text-[#15271d] placeholder:text-[#9aa79f] focus:outline-none focus:ring-0"
            />
          </div>

          {/* Photo previews section */}
          {images.length > 0 && (
            <div className="border-b border-[#eef2ef] px-4 py-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-[#9aa79f]">
                Photos
              </p>

              <div className="flex flex-wrap gap-2">
                {images.map((src, index) => (
                  <div
                    key={index}
                    className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#e3ebe6]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`Attachment ${index + 1}`}
                      className="h-full w-full object-cover"
                    />

                    <button
                      type="button"
                      aria-label="Remove image"
                      onClick={() => removeImage(index)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80"
                    >
                      <X size={13} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status messages */}
          {(error || imageError) && (
            <div className="px-4 pt-4">
              <p
                role="alert"
                className="rounded-xl border border-[#f0c7c7] bg-[#fff3f3] px-3 py-2 text-sm text-[#b42318]"
              >
                {error || imageError}
              </p>
            </div>
          )}
        </div>

        {/* Footer / attachment toolbar — pinned so both actions stay in thumb reach */}
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[#e3ebe6] bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <label
              className={`flex h-11 w-11 items-center justify-center rounded-full text-[#1c9d57] transition hover:bg-[#e7f7ed] ${
                loading || processingImages || images.length >= MAX_IMAGES
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer"
              }`}
            >
              <ImageIcon size={20} aria-hidden="true" />
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={loading || processingImages || images.length >= MAX_IMAGES}
              />
            </label>

            <span className="text-xs text-[#68776f]">
              {processingImages
                ? "Uploading photos…"
                : `${images.length}/${MAX_IMAGES} photos`}
            </span>
          </div>

          <button
            type="button"
            disabled={!canPost}
            onClick={handlePost}
            className="flex h-11 min-w-[92px] items-center justify-center rounded-full bg-[#1c9d57] px-5 text-sm font-semibold text-white transition hover:bg-[#138647] disabled:cursor-not-allowed disabled:bg-[#b7dfc6] disabled:text-white/80"
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </footer>
      </section>
    </div>
  );
}
