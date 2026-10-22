"use client";

import { useState } from "react";
import { X, Share2, Copy, Check, MessageCircle } from "lucide-react";
import { Avatar } from "./app-shell";
import type { FeedPost } from "./feed";

function FacebookIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.99 3.657 9.125 8.438 9.879v-6.99h-2.54V12h2.54V9.56c0-2.507 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.77-1.63 1.558v1.86h2.77l-.443 2.66h-2.327v6.99C18.343 21.125 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
  );
}

function TwitterIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M18.244 2H21.5l-7.51 8.59L22 22h-6.37l-4.98-6.54L4.77 22H1.47l8.02-9.17L1.5 2h6.56l4.5 5.96L18.244 2zm-1.16 18h1.83L7.08 4H5.14l12.944 16z" />
    </svg>
  );
}

function InstagramIcon({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

type ShareModalProps = {
  post: FeedPost;
  isOpen: boolean;
  onClose: () => void;
  onReshare?: (post: FeedPost) => void;
  sessionUserId?: string | null;
};

export function ShareModal({ post, isOpen, onClose, onReshare, sessionUserId }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [reshared, setReshared] = useState(false);
  const [reshareText, setReshareText] = useState("");

  if (!isOpen) return null;

  const postUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/posts/${post._id ?? post.id}`;
  const shareText = `Check out this post by ${post.userName || "someone"}: ${post.content || ""}`;
  const originalUser = post.userName || "Unknown user";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + " " + postUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleFacebook = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`;
    window.open(url, "_blank", "noopener,norefener");
  };

  const handleInstagram = () => {
    // Instagram doesn't have a web share API; copy link as fallback
    handleCopyLink();
  };

  const handleReshare = async () => {
    if (!sessionUserId) return;
    if (reshared) return;
    setReshared(true);
    try {
      const response = await fetch(`/api/posts/${post._id ?? post.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reshare", reshareDescription: reshareText }),
      });

      if (response.ok) {
        const data = await response.json();
        // Single source of truth: parent just prepends the new post, no second fetch
        onReshare?.(data.post);
        // close modal after successful reshare
        setTimeout(() => {
          onClose();
          setReshared(false);
          setReshareText("");
        }, 500);
      } else {
        setReshared(false);
      }
    } catch (err) {
      console.error("Reshare failed:", err);
      setReshared(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[#15271d]">Share post</h3>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-[#5f7073] transition hover:bg-[#f1f5f2]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Original post preview */}
        <div className="mb-4 flex items-center gap-3 rounded-xl bg-[#f7faf8] p-3">
          <Avatar
            src={post.userImage || null}
            alt={post.userName || "User"}
            className="h-10 w-10 rounded-full"
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#15271d]">
              {originalUser}
            </p>
            <p className="truncate text-xs text-[#5f7073]">
              Original post
            </p>
          </div>
        </div>

        {/* Social share buttons */}
        <div className="grid grid-cols-4 gap-3">
          <button
            type="button"
            onClick={handleWhatsApp}
            className="flex flex-col items-center gap-2 rounded-xl bg-[#f7faf8] py-3 text-[#1c9d57] transition hover:bg-[#e7f7ed]"
          >
            <MessageCircle size={24} />
            <span className="text-xs font-medium">WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={handleFacebook}
            className="flex flex-col items-center gap-2 rounded-xl bg-[#f7faf8] py-3 text-[#1c9d57] transition hover:bg-[#e7f7ed]"
          >
            <FacebookIcon size={24} />
            <span className="text-xs font-medium">Facebook</span>
          </button>

          <button
            type="button"
            onClick={handleTwitter}
            className="flex flex-col items-center gap-2 rounded-xl bg-[#f7faf8] py-3 text-[#1c9d57] transition hover:bg-[#e7f7ed]"
          >
            <TwitterIcon size={24} />
            <span className="text-xs font-medium">Twitter</span>
          </button>

          <button
            type="button"
            onClick={handleInstagram}
            className="flex flex-col items-center gap-2 rounded-xl bg-[#f7faf8] py-3 text-[#1c9d57] transition hover:bg-[#e7f7ed]"
          >
            <InstagramIcon size={24} />
            <span className="text-xs font-medium">Instagram</span>
          </button>
        </div>

        {/* Copy link */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#dfe9df] bg-white py-3 text-sm font-semibold text-[#15271d] transition hover:bg-[#f7faf8]"
        >
          {copied ? <Check size={18} className="text-[#1c9d57]" /> : <Copy size={18} />}
          {copied ? "Link copied!" : "Copy link"}
        </button>

        {/* Reshare to feed */}
        <div className="mt-4 border-t border-[#e3ebe6] pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#9aa79f]">
            Reshare to your feed
          </p>
          <textarea
            value={reshareText}
            onChange={(e) => setReshareText(e.target.value)}
            placeholder="Add your thoughts..."
            maxLength={5000}
            rows={3}
            disabled={reshared}
            className="mb-3 w-full resize-none rounded-xl border border-[#dfe9df] bg-white px-3 py-2.5 text-sm text-[#1d2c23] outline-none placeholder:text-[#87948b] focus:border-[#6fb08a] focus:ring-1 focus:ring-[#6fb08a]/30 disabled:opacity-60"
          />
          <button
            type="button"
            onClick={handleReshare}
            disabled={!sessionUserId || reshared}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              reshared
                ? "bg-[#e7f7ed] text-[#1c9d57]"
                : "bg-[#1c9d57] text-white hover:bg-[#138647]"
            }`}
          >
            <Share2 size={18} />
            {reshared ? "Reshared!" : !sessionUserId ? "Sign in to reshare" : "Reshare to your feed"}
          </button>
        </div>
      </div>
    </div>
  );
}