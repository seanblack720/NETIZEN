"use client";

import { useEffect, useRef } from "react";
import {
  Briefcase,
  Image as ImageIcon,
  Megaphone,
  Newspaper,
  PenSquare,
  Users,
  Video,
} from "lucide-react";

export type CreateAction =
  | "post"
  | "photo"
  | "video"
  | "news"
  | "job"
  | "group"
  | "notice";

type Tile = {
  action: CreateAction;
  title: string;
  subtitle: string;
  Icon: typeof ImageIcon;
  iconClass: string;
  tileClass: string;
};

const baseTile =
  "flex flex-col gap-2 rounded-2xl border border-[#eef2ef] p-4 text-left transition active:scale-[0.98]";

const tiles: Tile[] = [
  {
    action: "photo",
    title: "Upload photo",
    subtitle: "Share a photo",
    Icon: ImageIcon,
    iconClass: "text-[#16a34a]",
    tileClass: "bg-white",
  },
  {
    action: "video",
    title: "Upload video",
    subtitle: "Share a video",
    Icon: Video,
    iconClass: "text-[#7c3aed]",
    tileClass: "bg-white",
  },
  {
    action: "news",
    title: "Add news",
    subtitle: "Share important news",
    Icon: Newspaper,
    iconClass: "text-[#f97316]",
    tileClass: "bg-[#fff7ed]",
  },
  {
    action: "job",
    title: "New Job",
    subtitle: "Post a job opportunity",
    Icon: Briefcase,
    iconClass: "text-[#2563eb]",
    tileClass: "bg-[#eff6ff]",
  },
  {
    action: "group",
    title: "New Group",
    subtitle: "Create a new group",
    Icon: Users,
    iconClass: "text-[#0d9488]",
    tileClass: "bg-[#f0fdfa]",
  },
  {
    action: "notice",
    title: "Upload notice",
    subtitle: "Share a notice or announcement",
    Icon: Megaphone,
    iconClass: "text-[#dc2626]",
    tileClass: "bg-[#fef2f2]",
  },
];

let nextMenuId = 0;

/**
 * Bottom-sheet action menu behind the green + button.
 *
 * It owns its own history entry so that pressing the browser/Android back
 * button closes the menu (or, after picking an action, hands control over to
 * the modal that opens instead of navigating away from the page).
 */
export function CreateMenu({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (action: CreateAction) => void;
}) {
  const idRef = useRef(0);
  const settledRef = useRef(false);
  const pendingRef = useRef<CreateAction | null>(null);
  const onSelectRef = useRef(onSelect);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onSelectRef.current = onSelect;
    onCloseRef.current = onClose;
  }, [onSelect, onClose]);

  useEffect(() => {
    const id = ++nextMenuId;
    idRef.current = id;
    settledRef.current = false;

    window.history.pushState(
      { ...window.history.state, __netizenMenu: id },
      "",
    );

    function handlePopState() {
      window.removeEventListener("popstate", handlePopState);
      if (settledRef.current) return;
      settledRef.current = true; // our entry is gone — don't touch history

      const pending = pendingRef.current;
      pendingRef.current = null;

      if (pending) onSelectRef.current(pending);
      else onCloseRef.current();
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (settledRef.current) return; // closed via the back button

      // Closed some other way (backdrop / close button): drop the entry, but
      // only if it is still ours. Deferred one tick for StrictMode remounts.
      window.setTimeout(() => {
        if (!settledRef.current && window.history.state?.__netizenMenu === id) {
          settledRef.current = true;
          window.history.back();
        }
      }, 0);
    };
  }, []);

  function handleSelect(action: CreateAction) {
    // Pop our own history entry first; `handlePopState` then runs the action,
    // so whatever opens next (composer, navigation) starts from a clean stack.
    pendingRef.current = action;
    window.history.back();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={onClose}
      role="presentation"
    >
      <section
        aria-label="Create"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-t-3xl bg-white px-4 pb-8 pt-3 shadow-[0_-10px_40px_rgba(16,42,30,0.25)]"
      >
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-[#dbe4df]" />

        <div className="grid grid-cols-2 gap-3">
          {/* Big primary tile — spans two rows, like the reference design */}
          <button
            type="button"
            onClick={() => handleSelect("post")}
            className={`${baseTile} row-span-2 items-center justify-center bg-[#eaf6ee] text-center`}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#16a34a] shadow-sm">
              <PenSquare className="h-7 w-7" aria-hidden="true" />
            </span>
            <span className="mt-2 text-base font-bold text-[#15271d]">
              Make a post
            </span>
            <span className="text-xs leading-snug text-[#68776f]">
              Share your thoughts with the community
            </span>
          </button>

          {tiles.map((tile) => (
            <button
              key={tile.action}
              type="button"
              onClick={() => handleSelect(tile.action)}
              className={`${baseTile} ${tile.tileClass}`}
            >
              <tile.Icon
                className={`h-6 w-6 ${tile.iconClass}`}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <span className="text-sm font-bold text-[#15271d]">
                {tile.title}
              </span>
              <span className="text-xs leading-snug text-[#68776f]">
                {tile.subtitle}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}