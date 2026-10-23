"use client";

import { type ReactNode } from "react";
import { type NavId } from "@/lib/netizen-data";
import { Header } from "./header";
import { PrimaryNav } from "./primary-nav";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";

export { Avatar } from "./avatar";
export { CreatePostModal } from "./create-post-modal";

export function AppShell({
  active,
  onNavigate,
  onCreate,
  onCreateBottomNav,
  children,
  rightRail,
  mobileOnly,
  onOpenProfile,
  onOpenSettings,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onCreate: () => void;
  onCreateBottomNav?: () => void;
  children: ReactNode;
  rightRail: ReactNode;
  mobileOnly?: boolean;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}) {
  if (mobileOnly) {
    const onFeed = active === "feed";
    return (
      <>
        <div
          className={`sticky top-0 z-40 shrink-0 ${
            onFeed
              ? "bg-transparent"
              : "bg-white shadow-[0_1px_0_rgba(22,32,34,0.03)] dark:bg-[#101a17] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]"
          }`}
        >
          <Header active={active} onNavigate={onNavigate} onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
          <PrimaryNav active={active} onNavigate={onNavigate} />
        </div>

        <main
          className={`min-h-[calc(100vh-140px)] overflow-y-auto bg-[#f3f7f5] pb-[90px] dark:bg-[#0a1210] ${
            onFeed ? "pt-0" : "pt-4"
          }`}
        >
          {children}
        </main>

        <BottomNav active={active} onNavigate={onNavigate} onCreate={onCreateBottomNav ?? onCreate} />
      </>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-40 shrink-0 bg-white shadow-[0_1px_0_rgba(22,32,34,0.03)] dark:bg-[#101a17] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <Header active={active} onNavigate={onNavigate} onOpenProfile={onOpenProfile} onOpenSettings={onOpenSettings} />
        <PrimaryNav active={active} onNavigate={onNavigate} />
      </div>
      <div className="mx-auto grid h-[calc(100vh-74px)] min-h-0 max-w-[1440px] grid-cols-[260px_minmax(0,1fr)_345px] bg-[#f3f7f5] md:grid-cols-[260px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)_345px] max-md:block max-md:h-auto max-md:min-h-[calc(100vh-250px)] dark:bg-[#0a1210]">
        <Sidebar active={active} onNavigate={onNavigate} onCreate={onCreate} />
        <main className="min-w-0 overflow-y-auto max-md:overflow-visible max-md:px-[15px] max-md:pb-[110px] max-md:pt-6">{children}</main>
        <aside className="h-full overflow-y-auto border-l border-transparent px-[18px] pb-[60px] pt-[26px] max-lg:hidden dark:border-[#1a2e26]">{rightRail}</aside>
      </div>
      <BottomNav active={active} onNavigate={onNavigate} onCreate={onCreateBottomNav ?? onCreate} />
    </>
  );
}

export function PageHeading({ id }: { id: NavId }) {
  return (
    <h1 className="mb-6 text-[30px] text-[#162022] dark:text-zinc-100">
      {id === "feed" ? "Home" : id.charAt(0).toUpperCase() + id.slice(1)}
    </h1>
  );
}
