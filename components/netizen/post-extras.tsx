"use client";

import { useEffect, useState } from "react";
import {
  Flag,
  MoreHorizontal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";

/** Never lets a count go below 0 (or be NaN / a decimal). */
export function n(value: unknown): number {
  return Math.max(0, Math.floor(Number(value) || 0));
}

/* =========================================================
   DUMMY VERIFIED CHECKMARK (bright blue, every user for now)
========================================================== */
export function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role="img"
      aria-label="Verified"
      className="shrink-0"
    >
      <title>Verified</title>
      <path
        d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"
        fill="#1d9bf0"
        stroke="#1d9bf0"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      <path
        d="m8.5 12.3 2.4 2.4 4.6-4.9"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* =========================================================
   DUMMY 3-DOT MENU
   See more, See less, Report, Remove + a close button.
   Sticks to whatever it sits in, and tapping anywhere
   outside it closes it.
========================================================== */
export function PostMenu({
  size = 22,
  label = "Options",
  buttonClassName,
  onSelect,
}: {
  size?: number;
  label?: string;
  buttonClassName?: string;
  onSelect?: (option: "See more" | "See less" | "Report" | "Remove") => void;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const items = [
    { label: "See more" as const, icon: ThumbsUp, danger: false },
    { label: "See less" as const, icon: ThumbsDown, danger: false },
    { label: "Report" as const, icon: Flag, danger: false },
    { label: "Remove" as const, icon: Trash2, danger: true },
  ];

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        className={
          buttonClassName ??
          "grid h-9 w-9 place-items-center rounded-full text-[#647994] transition hover:bg-[#f0f8f3] dark:text-[#9bb0a8] dark:hover:bg-[#1f332b]"
        }
      >
        <MoreHorizontal size={size} />
      </button>

      {open && (
        <>
          {/* Full-screen catcher: touching anywhere outside the menu closes it */}
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            className="fixed inset-0 z-[55] cursor-default bg-transparent"
          />

          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            className="absolute right-0 top-full z-[56] mt-1 w-52 overflow-hidden rounded-2xl border border-[#dcebe1] bg-white py-1 shadow-[0_12px_36px_rgba(15,39,28,0.22)] dark:border-[#1e3a2f] dark:bg-[#18231f] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between px-4 pb-1 pt-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-[#718078] dark:text-[#9bb0a8]">
                Options
              </span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full text-[#647994] transition hover:bg-[#f0f8f3] dark:text-[#9bb0a8] dark:hover:bg-[#1f332b]"
              >
                <X size={16} />
              </button>
            </div>

            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  // dummy action for now
                  console.log(`[menu] ${item.label}`);
                  onSelect?.(item.label);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-[#f0f8f3] dark:hover:bg-[#1f332b] ${
                  item.danger
                    ? "text-[#e0344f]"
                    : "text-[#15271d] dark:text-[#e6ece9]"
                }`}
              >
                <item.icon size={16} className="shrink-0" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   DUMMY FOLLOW + ADD NETIZEN BUTTONS
   Just local state for now, no backend.
========================================================== */
export function FollowButtons() {
  const [following, setFollowing] = useState(false);
  const [added, setAdded] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setFollowing((v) => !v);
        }}
        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition active:scale-95 ${
          following
            ? "border border-[#cfe3d6] bg-transparent text-[#168b45] dark:border-[#1e3a2f] dark:text-[#7ee0b0]"
            : "border border-transparent bg-[#1c9d57] text-white hover:bg-[#168b45]"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setAdded((v) => !v);
        }}
        aria-label={added ? "Netizen added" : "Add netizen"}
        title={added ? "Netizen added" : "Add netizen"}
        className={`flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-semibold transition active:scale-95 ${
          added
            ? "border-transparent bg-[#e6f4ec] text-[#168b45] dark:bg-[#143a26] dark:text-[#7ee0b0]"
            : "border-[#cfe3d6] text-[#168b45] hover:bg-[#f0f8f3] dark:border-[#1e3a2f] dark:text-[#7ee0b0] dark:hover:bg-[#1f332b]"
        }`}
      >
        {added ? <UserCheck size={13} /> : <UserPlus size={13} />}
        <span>{added ? "Added" : "Add"}</span>
      </button>
    </div>
  );
}