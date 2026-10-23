"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save, X } from "lucide-react";

type Profile = {
  name?: string;
  image?: string;
  bio?: string;
  location?: string;
  phone?: string;
  birthDate?: string;
  coverImage?: string;
};

export function ProfileEditorModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<Profile>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const response = await fetch("/api/profile", {
          credentials: "include",
        });

        if (!response.ok) {
          if (!cancelled) setMessage("Sign in to edit your profile.");
          return;
        }

        const data = await response.json();
        const nextProfile = {
          ...(data?.profile || {}),
          name: data?.user?.name || data?.profile?.name || "",
          image: data?.user?.image || data?.profile?.image || "",
        };

        if (!cancelled) setProfile(nextProfile);
      } catch {
        if (!cancelled) setMessage("Could not load your profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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
        data.message ||
          (response.ok ? "Profile saved." : "Could not save profile.")
      );
    } catch {
      setMessage("Could not save profile.");
    } finally {
      setSaving(false);
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

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-[#102218]/45">
      <div className="h-full w-full overflow-hidden border-0 bg-white shadow-none">
        <div className="flex items-center justify-between border-b border-[#edf3ef] px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#15271d]">Edit profile</h2>
            <p className="text-xs text-[#68776f]">
              Keep your public details up to date.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close profile editor"
            className="flex h-9 w-9 items-center justify-center rounded-full text-[#5b6b62] transition hover:bg-[#e8efe8]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={saveProfile} className="h-[calc(100%-73px)] overflow-y-auto p-5">
          {message && (
            <p className="mb-4 rounded-xl bg-[#eaf4ed] px-3 py-2 text-sm text-[#204d39]">
              {message}
            </p>
          )}

          {loading ? (
            <div className="space-y-3 py-3">
              <div className="h-10 animate-pulse rounded-xl bg-[#edf4ef]" />
              <div className="h-10 animate-pulse rounded-xl bg-[#edf4ef]" />
              <div className="h-24 animate-pulse rounded-xl bg-[#edf4ef]" />
            </div>
          ) : (
            <div className="space-y-4">
              {field("name", "Display name")}
              {field("location", "Neighbourhood / town")}
              {field("phone", "Phone number", "tel")}
              {field("birthDate", "Date of birth", "date")}
              {field("image", "Profile photo URL")}
              {field("coverImage", "Cover image URL")}

              <label className="block text-sm font-medium text-[#273a2f]">
                Bio
                <textarea
                  value={profile.bio || ""}
                  onChange={(event) =>
                    setProfile((current) => ({ ...current, bio: event.target.value }))
                  }
                  maxLength={500}
                  rows={4}
                  placeholder="Tell people a little about you..."
                  className="mt-1.5 w-full rounded-xl border border-[#dfe9e2] bg-white px-3 py-2.5 outline-none transition focus:border-[#1c9d57]"
                />
              </label>
            </div>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-[#dfe9e2] bg-white px-4 py-2.5 text-sm font-semibold text-[#42534d]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || loading}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1c9d57] px-5 py-2.5 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
