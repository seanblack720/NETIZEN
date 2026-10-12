"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Bell,
  Check,
  Eye,
  Lock,
  LogOut,
  Palette,
  Save,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ProfileEditorModal } from "@/components/netizen/profile-editor-modal";
import { SettingsModal } from "@/components/netizen/settings-modal";

type Profile = {
  name?: string;
  image?: string;
  bio?: string;
  location?: string;
  phone?: string;
  birthDate?: string;
  coverImage?: string;
};

type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type Preferences = {
  pushNotifications: boolean;
  emailNotifications: boolean;
  soundEffects: boolean;
  privateAccount: boolean;
  hideOnlineStatus: boolean;
  autoplayVideos: boolean;
  dataSaver: boolean;
  theme: "light" | "dark" | "system";
};

const DEFAULT_PREFERENCES: Preferences = {
  pushNotifications: true,
  emailNotifications: false,
  soundEffects: true,
  privateAccount: false,
  hideOnlineStatus: false,
  autoplayVideos: true,
  dataSaver: false,
  theme: "system",
};

const STORAGE_KEY = "netizen.preferences";

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#1c9d57]" : "bg-[#d5dedb]"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

function SettingRow({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 border-b border-[#eef3f0] px-4 py-4 last:border-b-0">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eef7f1] text-[#1c9d57]">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[#15271d]">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#68776f]">
          {description}
        </p>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profile, setProfile] = useState<Profile>({});
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [proReason, setProReason] = useState("");
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setPrefs({ ...DEFAULT_PREFERENCES, ...JSON.parse(stored) });
      }
    } catch {
      /* ignore corrupt storage */
    }

    Promise.all([
      fetch("/api/profile", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch("/api/auth/get-session", { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ])
      .then(([profileData, sessionData]) => {
        if (profileData) {
          setProfile({
            ...profileData.profile,
            name: profileData.user?.name || "",
            image: profileData.user?.image || "",
          });
        } else {
          setMessage("Sign in to edit your profile settings.");
        }
        if (sessionData?.user) setSessionUser(sessionData.user);
      })
      .finally(() => setLoading(false));
  }, []);

  function updatePref<K extends keyof Preferences>(key: K, value: Preferences[K]) {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
    setPrefsSaved(true);
    setMessage("");
    window.setTimeout(() => setPrefsSaved(false), 1500);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      setMessage(
        data.message || (response.ok ? "Profile saved." : "Could not save profile.")
      );
    } catch {
      setMessage("Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function requestPro() {
    try {
      const response = await fetch("/api/pro-requests", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: proReason }),
      });
      const data = await response.json();
      setMessage(data.message || "Request sent.");
    } catch {
      setMessage("Could not send your Pro request.");
    }
  }

  const field = (key: keyof Profile, label: string, type = "text") => (
    <label className="block text-sm font-medium text-[#273a2f]">
      {label}
      <input
        type={type}
        value={profile[key] || ""}
        onChange={(event) =>
          setProfile((current) => ({ ...current, [key]: event.target.value }))
        }
        className="mt-1.5 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2.5 outline-none transition focus:border-[#1c9d57]"
      />
    </label>
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7f4] p-6 text-[#15271d]">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-6 w-40 rounded-lg bg-[#e4ebe6]" />
          <div className="h-10 w-56 rounded-lg bg-[#e4ebe6]" />
          <div className="h-64 rounded-3xl bg-[#e4ebe6]" />
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#0f1d17]/30 backdrop-blur-[1px]">
      <div className="absolute inset-0" onClick={() => router.push("/")} />
      <div className="relative z-10">
        <SettingsModal
          onClose={() => router.push("/")}
          onOpenProfileEditor={() => setProfileEditorOpen(true)}
        />
        {profileEditorOpen && (
          <ProfileEditorModal onClose={() => setProfileEditorOpen(false)} />
        )}
      </div>
    </main>
  );
}