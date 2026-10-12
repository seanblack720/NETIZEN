"use client";

import { type NavId, destinations } from "@/lib/netizen-data";
import { NetizenIcon } from "./icon";
import { PostButton } from "./post-button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BottomNavProps = {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onCreate: () => void;
};

export function BottomNav({ active, onNavigate, onCreate }: BottomNavProps) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const items = destinations.filter((item) =>
    ["feed", "search", "jobs", "profile"].includes(item.id),
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/get-session", { credentials: "include" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) setIsSignedIn(Boolean(data?.user?.id));
      })
      .catch(() => {
        if (!cancelled) setIsSignedIn(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const renderItem = (item: (typeof items)[number]) => (
    <button
      key={item.id}
      type="button"
      onClick={() => {
        if (item.id === "profile" && !isSignedIn) {
          router.push("/login");
          return;
        }
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
      <span>{item.id === "profile" && !isSignedIn ? "Log in" : item.label}</span>
    </button>
  );

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[#dbe7df]/80 bg-white/95 px-2 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 shadow-[0_-6px_20px_rgba(20,48,34,0.08)] backdrop-blur-xl md:hidden"
      aria-label="Secondary navigation"
    >
      <div className="mx-auto flex max-w-md items-end justify-between gap-1">
        {items.slice(0, 2).map(renderItem)}
        <div className="flex min-h-10 flex-1 justify-center">
          <PostButton compact onClick={onCreate} />
        </div>
        {items.slice(2).map(renderItem)}
      </div>
    </nav>
  );
}
