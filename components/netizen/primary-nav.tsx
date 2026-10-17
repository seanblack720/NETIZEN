"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BriefcaseBusiness,
  CarFront,
  FileText,
  Home,
  Megaphone,
  MessageCircle,
  Search,
  Users,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import type { NavId } from "@/lib/netizen-data";

const iconMap: Record<string, LucideIcon> = {
  home: Home,
  megaphone: Megaphone,
  message: MessageCircle,
  bell: Bell,
  car: CarFront,
  search: Search,
  wallet: WalletCards,
  file: FileText,
  briefcase: BriefcaseBusiness,
  users: Users,
  user: UserRound,
};

const navItems: Array<{
  id: NavId;
  label: string;
  icon: keyof typeof iconMap;
  badge?: number;
}> = [
  { id: "feed", label: "Feed", icon: "home" },
  { id: "khuluma", label: "Khuluma", icon: "megaphone" },
  { id: "messages", label: "Messages", icon: "message" },
  {
    id: "notifications",
    label: "Notifications",
    icon: "bell",
  },
  { id: "taxis", label: "Taxis", icon: "car" },
  { id: "search", label: "Search", icon: "search" },
  { id: "funds", label: "Funds", icon: "wallet" },
  { id: "petitions", label: "Petitions", icon: "file" },
  { id: "jobs", label: "Jobs", icon: "briefcase" },
  { id: "groups", label: "Groups", icon: "users" },
  { id: "profile", label: "Profile", icon: "user" },
];

function NavIcon({
  name,
}: {
  name: keyof typeof iconMap;
}) {
  const Icon = iconMap[name];

  return (
    <Icon
      aria-hidden="true"
      className="
        h-[18px] w-[18px]
        min-h-[18px] min-w-[18px]
        sm:h-5 sm:w-5
        sm:min-h-5 sm:min-w-5
      "
      strokeWidth={2}
    />
  );
}

export function PrimaryNav({
  active,
  onNavigate,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
}) {
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadNotificationCount() {
      try {
        const response = await fetch("/api/notifications?unreadOnly=true&limit=100", {
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) setNotificationCount(0);
          return;
        }

        const data = await response.json();
        const unreadCount = Array.isArray(data?.notifications) ? data.notifications.length : 0;

        if (!cancelled) {
          setNotificationCount(Number.isFinite(unreadCount) ? unreadCount : 0);
        }
      } catch {
        if (!cancelled) setNotificationCount(0);
      }
    }

    loadNotificationCount();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav
      className="
        flex
        w-full
        shrink-0
        items-stretch

        overflow-x-auto
        overscroll-x-contain

        border-b
        border-[#dfe7e4]
        bg-white

        px-1

        md:hidden

        [&::-webkit-scrollbar]:hidden
        [scrollbar-width:none]
      "
    >
      {navItems.slice(0, 5).map((item) => {
        const isActive = active === item.id;
        const badgeCount = item.id === "notifications" ? notificationCount : 0;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`
              relative

              flex
              min-w-[72px]
              flex-1
              shrink-0
              flex-col
              items-center
              justify-center

              gap-1

              px-1
              py-2.5
              sm:min-w-[82px]
              sm:gap-1.5
              sm:py-3

              text-[10px]
              font-medium
              leading-none

              transition-colors
              duration-150

              focus:outline-none

              ${
                isActive
                  ? "text-[#16a34a]"
                  : "text-slate-500 hover:text-slate-800"
              }
            `}
          >
            <span
              className={`
                relative
                flex
                items-center
                justify-center

                transition-transform
                duration-150

                ${
                  isActive
                    ? "scale-105"
                    : "scale-100"
                }
              `}
            >
              <NavIcon name={item.icon} />

              {badgeCount > 0 && (
                <span
                  className="
                    absolute
                    -right-2.5
                    -top-2

                    flex
                    h-[15px]
                    min-w-[15px]
                    items-center
                    justify-center

                    rounded-full
                    bg-red-500

                    px-1

                    text-[8px]
                    font-bold
                    leading-none
                    text-white

                    ring-2
                    ring-white

                    sm:-right-3
                    sm:-top-2.5
                    sm:h-[17px]
                    sm:min-w-[17px]
                    sm:text-[9px]
                  "
                >
                  {badgeCount}
                </span>
              )}
            </span>

            <span
              className="
                max-w-[70px]
                truncate

                text-[10px]
                sm:max-w-[80px]
                sm:text-[11px]
              "
            >
              {item.label}
            </span>

            {isActive && (
              <span
                className="
                  absolute
                  bottom-0
                  left-1/2

                  h-[3px]
                  w-7
                  -translate-x-1/2

                  rounded-t-full
                  bg-[#16a34a]

                  sm:w-8
                "
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}