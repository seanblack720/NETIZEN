"use client";

import { type NavId, destinations } from "@/lib/netizen-data";
import { NetizenIcon } from "./icon";
import { PostButton } from "./post-button";
import { useEffect, useRef, useState } from "react";
import {
  Bookmark,
  LifeBuoy,
  RefreshCw,
  Settings,
  SquareChevronUp,
  TrendingUp,
  UserPlus,
  type LucideIcon,
} from "lucide-react";

type BottomNavProps = {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onCreate: () => void;
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
  onCreate,
  onRefreshFeed,
}: BottomNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [navHeight, setNavHeight] = useState(64);
  const navRef = useRef<HTMLElement | null>(null);

  const items = destinations.filter((item) =>
    ["search", "petitions", "jobs"].includes(item.id),
  );

  const closeMenu = () => setMenuOpen(false);

  // While open: measure the nav (so the menu sits right above it),
  // close on Escape, and stop the page scrolling behind the blur.
  useEffect(() => {
    if (!menuOpen) return;

    const measure = () => {
      const height = navRef.current?.getBoundingClientRect().height;
      if (height) setNavHeight(height);
    };
    measure();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
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
  }, [menuOpen]);

  function handleRefreshFeed() {
    closeMenu();
    if (active !== "feed") onNavigate("feed");

    if (onRefreshFeed) onRefreshFeed();
    else window.location.reload(); // fallback if the parent doesn't pass onRefreshFeed
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
        closeMenu();
        onNavigate(item.id);
      }}
      aria-current={active === item.id ? "page" : undefined}
      className={`flex min-h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-0 px-1 text-[10px] font-medium transition-all duration-200 active:scale-95 ${
        active === item.id
          ? "bg-[#e7f7ed] text-[#07843b]"
          : "bg-transparent text-[#65756f] hover:bg-[#f2f6f3] hover:text-[#163d28]"
      }`}
    >
      <NetizenIcon name={item.icon} className="h-5 w-5" strokeWidth={2} />
      <span>{item.label}</span>
    </button>
  );

  return (
    <>
      {/* Blurred backdrop + menu. Sits BELOW the nav (z-39 vs z-40), so the nav stays visible and tappable. */}
      <div
        className={`fixed inset-0 z-[39] transition-[visibility] duration-200 md:hidden ${
          menuOpen ? "visible" : "invisible"
        }`}
        aria-hidden={!menuOpen}
      >
        {/* Blur */}
        <div
          onClick={closeMenu}
          className={`absolute inset-0 bg-[#102218]/25 backdrop-blur-md transition-opacity duration-200 ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Menu: bottom right, just above the nav */}
        <div
          role="menu"
          aria-label="More options"
          style={{ bottom: navHeight + 10 }}
          className={`absolute right-3 w-[11.5rem] origin-bottom-right rounded-2xl border border-[#e3ebe6] bg-white p-1.5 shadow-[0_12px_36px_rgba(15,39,28,0.22)] transition duration-200 ease-out ${
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
                    className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition active:bg-[#f2f6f3]"
                  >
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#eef7f1] text-[#1c9d57]">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="truncate text-[13px] font-semibold text-[#15271d]">
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

      <nav
        ref={navRef}
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dbe7df]/80 bg-white/95 px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-6px_20px_rgba(20,48,34,0.08)] backdrop-blur-xl md:hidden"
        aria-label="Secondary navigation"
      >
        <div className="mx-auto flex max-w-md items-end justify-between gap-1">
          {items.slice(0, 2).map(renderItem)}
          <div className="flex min-h-10 flex-1 justify-center">
            <PostButton
              compact
              onClick={() => {
                closeMenu();
                onCreate();
              }}
            />
          </div>
          {items.slice(2).map(renderItem)}

          {/* Expand */}
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className={`flex min-h-10 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border-0 px-1 text-[10px] font-medium transition-all duration-200 active:scale-95 ${
              menuOpen
                ? "bg-[#e7f7ed] text-[#07843b]"
                : "bg-transparent text-[#65756f] hover:bg-[#f2f6f3] hover:text-[#163d28]"
            }`}
          >
            <SquareChevronUp
              className={`h-5 w-5 transition-transform duration-200 ${
                menuOpen ? "rotate-180" : ""
              }`}
              strokeWidth={2}
              aria-hidden="true"
            />
            <span>Expand</span>
          </button>
        </div>
      </nav>
    </>
  );
}