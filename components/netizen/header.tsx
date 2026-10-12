"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type NavId } from "@/lib/netizen-data";
import { UserRound, Menu } from "lucide-react";

export function Header({
  onNavigate,
  onOpenProfile,
  onOpenSettings,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}) {
  const router = useRouter();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/get-session", {
      credentials: "include",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled) {
          setIsSignedIn(Boolean(data?.user?.id));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIsSignedIn(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  function handleProfile() {
    if (isSignedIn) {
      if (onOpenProfile) {
        onOpenProfile();
        return;
      }

      onNavigate("profile");
      return;
    }

    router.push("/login");
  }

  function handleSettings() {
    if (onOpenSettings) {
      onOpenSettings();
      return;
    }
  }

  return (
    <header className="flex h-20 shrink-0 items-center border-b border-[#dfe7e4] bg-white px-[15px]">
      <div className="flex w-full flex-row items-center justify-between">
        {/* Logo */}
        <button
          type="button"
          className="flex items-center gap-2.5 border-0 bg-transparent pt-0 text-[25px] tracking-[-0.04em] text-[#162022]"
          onClick={() => onNavigate("feed")}
        >
          <img
            src="/netgreen.png"
            alt="Netizen logo"
            className="h-8 w-8 rounded-lg object-cover"
          />

          <b className="pt-1">NETIZEN</b>
        </button>

        {/* Right side buttons */}
        <div className="flex flex-row items-center space-x-1">
          {/* Profile / Login */}
          <button
            type="button"
            className="flex h-11 items-center gap-2 rounded-xl bg-[#e7f7ed] px-3 text-sm font-semibold text-[#07843b] transition active:scale-95"
            aria-label={isSignedIn ? "Open profile" : "Log in"}
            onClick={handleProfile}
          >
            <UserRound
              className="h-5 w-5"
              aria-hidden="true"
            />

            <span>
              {isSignedIn ? "Profile" : "Log in"}
            </span>
          </button>

          {/* Settings Menu */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e7f7ed] text-[#07843b] transition active:scale-95"
            aria-label="Settings"
            onClick={handleSettings}
          >
            <Menu
              className="h-6 w-6"
              aria-hidden="true"
            />
          </button>
        </div>
      </div>
    </header>
  );
}