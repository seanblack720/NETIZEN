"use client";

import { type NavId, destinations } from "@/lib/netizen-data";
import { NetizenIcon } from "./icon";
import { PostButton } from "./post-button";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import {
  Bookmark,
  LifeBuoy,
  RefreshCw,
  Settings,
  SquareChevronUp,
  SquarePen,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

/** The icon names the app's own NetizenIcon accepts. */
type NetizenIconName = ComponentProps<typeof NetizenIcon>["name"];

export type CreateAction = "post" | "taxi-spot" | "video" | "phanda" | "khuluma";

type BottomNavProps = {
  active: NavId;
  onNavigate: (id: NavId) => void;
  /**
   * Called when a tile in the create sheet is tapped (taxi-spot, video, phanda, khuluma).
   * "Make a post" never goes through this: it always calls onCreate.
   */
  onCreateAction?: (action: CreateAction) => void;
  /**
   * Your existing "open the create post modal" handler.
   * ONLY called by the "Make a post" tile (and as a fallback for tiles with no destination).
   */
  onCreate?: () => void;
  /** Called by the "Refresh feed" button, e.g. () => setRefreshKey((k) => k + 1) */
  onRefreshFeed?: () => void;
};

type MenuItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void;
};

export function BottomNav({
  active,
  onNavigate,
  onCreateAction,
  onCreate,
  onRefreshFeed,
}: BottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(64);
  const navRef = useRef<HTMLElement | null>(null);

  const items = destinations.filter((item) =>
    ["search", "petitions", "jobs"].includes(item.id),
  );

  const closeMenu = () => setMenuOpen(false);
  const closeCreate = () => setCreateOpen(false);
  const closeAll = () => {
    setMenuOpen(false);
    setCreateOpen(false);
  };

  const anyOpen = menuOpen || createOpen;

  // While anything is open: measure the nav (so panels sit right above it),
  // close on Escape, and stop the page scrolling behind the blur.
  useEffect(() => {
    if (!anyOpen) return;

    const measure = () => {
      const height = navRef.current?.getBoundingClientRect().height;
      if (height) setNavHeight(height);
    };
    measure();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setCreateOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", measure);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", measure);
      document.body.style.overflow = previous;
    };
  }, [anyOpen]);

  function handleRefreshFeed() {
    closeMenu();
    if (active !== "feed") onNavigate("feed");

    if (onRefreshFeed) onRefreshFeed();
    else window.location.reload(); // fallback if the parent doesn't pass onRefreshFeed
  }

  const hasDestination = (id: string) => destinations.some((item) => String(item.id) === id);

  function handleCreateAction(action: CreateAction) {
    closeCreate();

    // "Make a post" ALWAYS opens the create-post modal, nothing else does
    if (action === "post") {
      onCreate?.();
      return;
    }

    if (onCreateAction) {
      onCreateAction(action);
      return;
    }

    // Fallbacks so every other tile still does something before onCreateAction is wired up
    if (action === "video") {
      onCreate?.();
      return;
    }

    const target = action === "taxi-spot" ? "taxis" : action; // "phanda" | "khuluma"
    if (hasDestination(target)) onNavigate(target as NavId);
    else onCreate?.();
  }

  // Placeholder options: swap each onSelect for the real action later.
  // Listed top to bottom, so the options nearest your thumb are at the end.
  const placeholder = (name: string) => () => {
    console.log(`[menu] "${name}" tapped (not wired up yet)`);
    closeMenu();
  };

  const menuItems: MenuItem[] = [
    { id: "settings", label: "Settings", icon: Settings, onSelect: placeholder("Settings") },
    { id: "help", label: "Help & feedback", icon: LifeBuoy, onSelect: placeholder("Help & feedback") },
    { id: "invite", label: "Invite friends", icon: UserPlus, onSelect: placeholder("Invite friends") },
    { id: "trending", label: "Trending now", icon: TrendingUp, onSelect: placeholder("Trending now") },
    { id: "saved", label: "Saved posts", icon: Bookmark, onSelect: placeholder("Saved posts") },
  ];

  const renderItem = (item: (typeof items)[number]) => (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        closeAll();
        onNavigate(item.id);
      }}
      aria-current={active === item.id ? "page" : undefined}
      className={`flex min-h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-0 px-0.5 text-[10px] font-medium transition-all duration-200 active:scale-95 ${
        active === item.id
          ? "bg-[#e7f7ed] text-[#07843b] dark:bg-[#143a26] dark:text-[#7ee0b0]"
          : "bg-transparent text-[#65756f] hover:bg-[#f2f6f3] hover:text-[#163d28] dark:text-[#8aa39b] dark:hover:bg-[#18231f] dark:hover:text-[#e6ece9]"
      }`}
    >
      <NetizenIcon name={item.icon} className="h-5 w-5" strokeWidth={2} />
      <span className="whitespace-nowrap tracking-tight">
        {item.id === "jobs" ? "Phanda & Jobs" : item.label}
      </span>
    </button>
  );

  return (
    <>
      {/* Expand menu: blurred backdrop + menu. Sits BELOW the nav (z-39 vs z-40), so the nav stays visible and tappable. */}
      <div
        className={`fixed inset-0 z-[39] transition-[visibility] duration-200 md:hidden ${
          menuOpen ? "visible" : "invisible"
        }`}
        aria-hidden={!menuOpen}
      >
        {/* Blur */}
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-[#102218]/25 backdrop-blur-md dark:bg-black/40 transition-opacity duration-200 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Menu: bottom right, just above the nav */}
        <div
          role="menu"
          aria-label="More options"
          style={{ bottom: navHeight + 10 }}
          className={`absolute right-3 w-[11.5rem] origin-bottom-right rounded-2xl border border-[#e3ebe6] bg-white dark:border-[#1e3a2f] dark:bg-[#101a17] p-1.5 shadow-[0_12px_36px_rgba(15,39,28,0.22)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.5)] transition duration-200 ease-out ${
            menuOpen ? "scale-100 opacity-100" : "scale-90 opacity-0"
          }`}
        >
          <ul>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={item.onSelect}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition active:bg-[#f2f6f3] dark:active:bg-[#1f332b]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef7f1] text-[#1c9d57] dark:bg-[#143a26] dark:text-[#7ee0b0]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate text-[13px] font-semibold text-[#15271d] dark:text-[#e6ece9]">
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Refresh feed: closest to the thumb */}
          <button
            type="button"
            role="menuitem"
            onClick={handleRefreshFeed}
            className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c9d57] py-2.5 text-[13px] font-semibold text-white transition active:scale-[0.97] active:bg-[#168b45]"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh feed
          </button>
        </div>
      </div>

      {/*
        Create sheet. Same trick as the Expand menu: it sits BELOW the nav (z-39 vs z-40),
        so the green + stays visible on top and turns into an X to close it.
        The background is blurred, not darkened.
      */}
      <div
        className={`fixed inset-0 z-[39] transition-[visibility] duration-200 md:hidden ${
          createOpen ? "visible" : "invisible"
        }`}
        aria-hidden={!createOpen}
      >
        {/* Blur only: a very light tint so the feed behind is softened, not dimmed */}
        <div
          onClick={closeCreate}
          className={`absolute inset-0 bg-white/10 backdrop-blur-lg dark:bg-black/30 transition-opacity duration-200 ${
            createOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Full width, and it runs all the way down behind the nav so there is no seam between them */}
        <div
          role="dialog"
          aria-label="Create"
          style={{ paddingBottom: navHeight + 20, maxHeight: "calc(100dvh - 5rem)" }}
          className={`absolute inset-x-0 bottom-0 overflow-y-auto overscroll-contain rounded-t-[1.75rem] border-t border-[#e3ebe6] bg-white dark:border-[#1e3a2f] dark:bg-[#101a17] px-4 pt-3 shadow-[0_-12px_36px_rgba(15,39,28,0.16)] dark:shadow-[0_-12px_36px_rgba(0,0,0,0.5)] transition duration-200 ease-out ${
            createOpen ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
          }`}
        >
          <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[#dfe7e2] dark:bg-[#2a4a3e]" aria-hidden="true" />

          <div className="grid grid-cols-2 gap-3">
            {/* Make a post: tall tile, spans two rows. The ONLY thing that opens the create-post modal. */}
            <button
              type="button"
              onClick={() => handleCreateAction("post")}
              className="row-span-2 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[#e8f5ec] dark:bg-[#143a26] p-4 text-center transition active:scale-[0.98]"
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white text-[#1c9d57] shadow-sm dark:bg-[#18231f] dark:text-[#7ee0b0]">
                <SquarePen className="h-6 w-6" strokeWidth={2} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold text-[#15271d] dark:text-[#e6ece9]">Make a post</span>
                <span className="mt-1 block text-xs leading-snug text-[#68776f] dark:text-[#9bb0a8]">
                  Share your thoughts with the community
                </span>
              </span>
            </button>

            <CreateTile
              icon="car"
              title="Upload taxi spot"
              description="Share a rank or stop"
              onClick={() => handleCreateAction("taxi-spot")}
            />

            <CreateTile
              icon="play"
              title="Upload video"
              description="Share a video"
              onClick={() => handleCreateAction("video")}
            />

            <CreateTile
              icon="briefcase"
              title="Phanda"
              description="Services, sales and rentals"
              onClick={() => handleCreateAction("phanda")}
            />

            <CreateTile
              icon="megaphone"
              title="Khuluma"
              description="Anonymous. You confess, we listen."
              onClick={() => handleCreateAction("khuluma")}
            />
          </div>
        </div>
      </div>

      <nav
        ref={navRef}
        className={`fixed inset-x-0 bottom-0 z-40 border-t px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200 md:hidden ${
          createOpen
            ? "border-transparent bg-white shadow-none dark:border-transparent dark:bg-[#101a17] dark:shadow-none"
            : "border-[#dbe7df]/80 bg-white/95 shadow-[0_-6px_20px_rgba(20,48,34,0.08)] dark:border-[#1e3a2f] dark:bg-[#101a17]/95 dark:shadow-[0_-6px_20px_rgba(0,0,0,0.4)]"
        }`}
        aria-label="Secondary navigation"
      >
        <div className="mx-auto flex max-w-md items-end justify-between gap-1">
          {items.slice(0, 2).map(renderItem)}
          <div className="flex min-h-10 flex-1 justify-center">
            {/* The + opens the create options sheet (and becomes an X to close it) */}
            <PostButton
              compact
              open={createOpen}
              onClick={() => {
                closeMenu();
                setCreateOpen((open) => !open);
              }}
            />
          </div>
          {items.slice(2).map(renderItem)}

          {/* Expand */}
          <button
            type="button"
            onClick={() => {
              closeCreate();
              setMenuOpen((open) => !open);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex min-h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-0 px-0.5 text-[10px] font-medium transition-all duration-200 active:scale-95 ${
              menuOpen
                ? "bg-[#e7f7ed] text-[#07843b] dark:bg-[#143a26] dark:text-[#7ee0b0]"
                : "bg-transparent text-[#65756f] hover:bg-[#f2f6f3] hover:text-[#163d28] dark:text-[#8aa39b] dark:hover:bg-[#18231f] dark:hover:text-[#e6ece9]"
            }`}
          >
            <SquareChevronUp
              className={`h-5 w-5 transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span className="whitespace-nowrap tracking-tight">Expand</span>
          </button>
        </div>
      </nav>
    </>
  );
}

function CreateTile({
  icon,
  title,
  description,
  onClick,
}: {
  icon: NetizenIconName;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[7.5rem] flex-col items-start justify-between rounded-2xl border border-[#e8eeea] bg-white dark:border-[#233d32] dark:bg-[#18231f] p-3.5 text-left transition active:scale-[0.98]"
    >
      {/* Same green icon chip as the Expand menu, same icon renderer as the nav */}
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef7f1] text-[#1c9d57] dark:bg-[#143a26] dark:text-[#7ee0b0]">
        <NetizenIcon name={icon} className="h-5 w-5" strokeWidth={2} />
      </span>
      <span>
        <span className="block text-sm font-bold text-[#15271d] dark:text-[#e6ece9]">{title}</span>
        <span className="mt-0.5 block text-xs leading-snug text-[#68776f] dark:text-[#9bb0a8]">{description}</span>
      </span>
    </button>
  );
}