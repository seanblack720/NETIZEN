"use client";

import {
  Bell,
  BriefcaseBusiness,
  CarFront,
  FileText,
  Home,
  Megaphone,
  MessageCircle,
  Search,
  Settings,
  Users,
  UserRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { NavId } from "@/lib/netizen-data";
import { Avatar } from "./avatar";
import { PostButton } from "./post-button";


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

function NavIcon({ name }: { name: keyof typeof iconMap }) {
  const Icon = iconMap[name];

  return <Icon aria-hidden="true" />;
}

type SidebarProps = {
  active: NavId;
  onNavigate: (id: NavId) => void;
  onCreate: () => void;
};

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type SessionData = {
  user?: User | null;
};

export function Sidebar({
  active,
  onNavigate,
  onCreate,
}: SidebarProps) {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;

    async function getSession() {
      try {
        setLoadingUser(true);

        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (!cancelled) {
            setUser(null);
          }

          return;
        }

        const data: SessionData = await response.json();

        if (!cancelled) {
          setUser(data?.user ?? null);
        }
      } catch (error) {
        console.error("Failed to get user session:", error);

        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoadingUser(false);
        }
      }
    }

    getSession();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

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

  function handleLogin() {
    router.push("/login");
  }

  function handleProfileClick() {
    if (user) {
      router.push("/profile");
    } else {
      handleLogin();
    }
  }

  function renderUserProfile() {
    if (!mounted || loadingUser) {
      return (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-[#e5ebe7]" />

          <div className="min-w-0">
            <div className="h-4 w-24 animate-pulse rounded bg-[#e5ebe7]" />

            <div className="mt-2 h-3 w-32 animate-pulse rounded bg-[#edf1ee]" />
          </div>
        </div>
      );
    }

    if (user) {
      return (
        <button
          type="button"
          className="flex w-full items-center gap-3 border-0 bg-transparent p-0 text-left"
          onClick={handleProfileClick}
        >
          <Avatar
            src={user.image || "/avatar-2.png"}
            alt={user.name || user.email || "User"}
          />

          <div className="min-w-0">
            <b className="block truncate">
              {user.name || "User"}
            </b>

            <span className="block truncate">
              {user.email || "No email"}
            </span>
          </div>
        </button>
      );
    }

    return (
      <button
        type="button"
          className="flex w-full items-center gap-3 border-0 bg-transparent p-0 text-left"
        onClick={handleProfileClick}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e7f7ed] text-sm font-bold text-[#1c9d57]">
          N
        </div>

        <div className="min-w-0">
          <b className="block truncate">
            Login to see profile
          </b>

          <span className="block truncate text-[#1c9d57]">
            Click to login
          </span>
        </div>
      </button>
    );
  }

  return (
    <aside className="h-full overflow-y-auto overscroll-contain border-r border-[#dfe7e4] bg-white px-[18px] py-[38px] max-md:hidden dark:border-[#1e3a2f] dark:bg-[#101a17]">
      {renderUserProfile()}

      <PostButton onClick={onCreate} />

      <nav className="flex flex-col gap-1" aria-label="Primary navigation">
        {navItems.map((item, index) => {
          const badgeCount = item.id === "notifications" ? notificationCount : 0;

          return (
            <div key={item.id}>
              {index === 5 && <hr className="mx-[5px] my-[17px] border-0 border-t border-[#dfe7e4]" />}

              <button
                className={
                  active === item.id
                    ? "flex w-full items-center gap-4 rounded-xl bg-[#e7f7ed] px-[15px] py-[13px] text-left font-semibold text-[#07843b] [&>svg]:w-[22px] [&>svg]:text-[#20ad56] [&>em]:ml-auto [&>em]:grid [&>em]:h-[23px] [&>em]:min-w-[23px] [&>em]:place-items-center [&>em]:rounded-[20px] [&>em]:bg-[#ed4561] [&>em]:px-[6px] [&>em]:text-xs [&>em]:not-italic [&>em]:text-white"
                    : "flex w-full items-center gap-4 rounded-xl px-[15px] py-[13px] text-left font-semibold text-[#162022] [&>svg]:w-[22px] [&>svg]:text-[#5f7073] [&>em]:ml-auto [&>em]:grid [&>em]:h-[23px] [&>em]:min-w-[23px] [&>em]:place-items-center [&>em]:rounded-[20px] [&>em]:bg-[#ed4561] [&>em]:px-[6px] [&>em]:text-xs [&>em]:not-italic [&>em]:text-white"
                }
                type="button"
                onClick={() => onNavigate(item.id)}
              >
                <NavIcon name={item.icon} />

                <span>{item.label}</span>

                {badgeCount > 0 && <em>{badgeCount}</em>}
              </button>
            </div>
          );
        })}
      </nav>

      <div className="mt-6 flex items-center gap-[14px] px-[15px] py-[13px] text-[13px] text-[#5f7073] [&>svg]:w-5">
        <Settings aria-hidden="true" />

        <span>Community guidelines</span>
      </div>
    </aside>
  );
}
