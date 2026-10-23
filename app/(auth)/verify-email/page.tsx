"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

type SessionData = {
  user: User;
  session?: {
    id?: string;
    expiresAt?: string | Date;
    token?: string;
  };
};

export default function UserPage() {
  const router = useRouter();

  const [session, setSession] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getSession() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          setSession(null);
          return;
        }

        const data = await response.json();

        if (!data?.user) {
          setSession(null);
          return;
        }

        setSession(data);
      } catch (err) {
        console.error("Failed to get session:", err);
        setSession(null);
        setError("Unable to check your session.");
      } finally {
        setLoading(false);
      }
    }

    getSession();
  }, []);

  async function handleLogout() {
    if (loggingOut) return;

    try {
      setLoggingOut(true);
      setError("");

      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to sign out.");
      }

      setSession(null);

      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while signing out."
      );
    } finally {
      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f5f7f4] text-[#11221a]">
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-3xl border border-[#dfe9e2] bg-white p-8 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#d9e9df] border-t-[#1c9d57]" />

            <h1 className="mt-5 text-xl font-semibold text-[#15271d]">
              Checking your session...
            </h1>

            <p className="mt-2 text-sm text-[#68776f]">
              Please wait while we check if you are logged in.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    return (
      <main className="min-h-screen bg-[#f5f7f4] text-[#11221a]">
        <div className="flex min-h-screen items-center justify-center px-6 py-12">
          <div className="w-full max-w-md rounded-3xl border border-[#dfe9e2] bg-white p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e7f7ed] text-2xl font-bold text-[#1c9d57]">
              N
            </div>

            <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[#15271d]">
              User not logged in
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#68776f]">
              There is currently no active session. Please sign in to view
              your account details.
            </p>

            {error && (
              <p className="mt-5 rounded-xl border border-[#f0c7c7] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]">
                {error}
              </p>
            )}

            <button
              onClick={() => router.push("/login")}
              className="mt-6 w-full rounded-xl bg-[#1c9d57] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#138647]"
            >
              Go to login
            </button>
          </div>
        </div>
      </main>
    );
  }

  const user = session.user;

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#11221a]">
      <div className="min-h-screen px-6 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto w-full max-w-5xl">
          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#3f7a59]">
                Account
              </p>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[#15271d] sm:text-4xl">
                Your profile
              </h1>

              <p className="mt-2 text-sm text-[#68776f]">
                Your account and session information.
              </p>
            </div>

            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-xl border border-[#d8e4dc] bg-white px-5 py-3 text-sm font-semibold text-[#b42318] transition hover:border-[#efcaca] hover:bg-[#fff8f8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-[#f0c7c7] bg-[#fff3f3] px-4 py-3 text-sm text-[#b42318]">
              {error}
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* Profile card */}
            <section className="rounded-3xl border border-[#dfe9e2] bg-white p-6">
              <div className="flex flex-col items-center text-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name || "User"}
                    className="h-24 w-24 rounded-3xl object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-[#e7f7ed] text-3xl font-bold text-[#1c9d57]">
                    {(user.name || user.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <h2 className="mt-5 text-xl font-semibold text-[#15271d]">
                  {user.name || "No name set"}
                </h2>

                <p className="mt-1 break-all text-sm text-[#68776f]">
                  {user.email || "No email available"}
                </p>

                <div className="mt-5">
                  {user.emailVerified ? (
                    <span className="inline-flex rounded-full bg-[#e7f7ed] px-3 py-1 text-xs font-semibold text-[#167a42]">
                      Email verified
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-[#fff5df] px-3 py-1 text-xs font-semibold text-[#9a6700]">
                      Email not verified
                    </span>
                  )}
                </div>
              </div>
            </section>

            {/* Details */}
            <section className="rounded-3xl border border-[#dfe9e2] bg-white p-6 sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[#3f7a59]">
                  User details
                </p>

                <h2 className="mt-2 text-xl font-semibold text-[#15271d]">
                  Account information
                </h2>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e3ebe6] bg-[#f9fbfa] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#718078]">
                    User ID
                  </p>

                  <p className="mt-2 break-all font-mono text-sm text-[#15271d]">
                    {user.id}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e3ebe6] bg-[#f9fbfa] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#718078]">
                    Name
                  </p>

                  <p className="mt-2 text-sm font-medium text-[#15271d]">
                    {user.name || "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e3ebe6] bg-[#f9fbfa] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#718078]">
                    Email
                  </p>

                  <p className="mt-2 break-all text-sm font-medium text-[#15271d]">
                    {user.email || "Not provided"}
                  </p>
                </div>

                <div className="rounded-2xl border border-[#e3ebe6] bg-[#f9fbfa] p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#718078]">
                    Email status
                  </p>

                  <p className="mt-2 text-sm font-medium text-[#15271d]">
                    {user.emailVerified ? "Verified" : "Not verified"}
                  </p>
                </div>

                {user.createdAt && (
                  <div className="rounded-2xl border border-[#e3ebe6] bg-[#f9fbfa] p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#718078]">
                      Account created
                    </p>

                    <p className="mt-2 text-sm font-medium text-[#15271d]">
                      {new Date(user.createdAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {session.session?.expiresAt && (
                  <div className="rounded-2xl border border-[#e3ebe6] bg-[#f9fbfa] p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#718078]">
                      Session expires
                    </p>

                    <p className="mt-2 text-sm font-medium text-[#15271d]">
                      {new Date(
                        session.session.expiresAt
                      ).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
