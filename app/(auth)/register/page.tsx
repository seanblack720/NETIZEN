"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Registration failed.");
      }

      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f5f7f4] text-[#11221a]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
        <section className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#17a34a] via-[#15964a] to-[#0f6d3a] px-6 py-10 text-white sm:px-10 lg:px-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />

          <div className="relative z-10 w-full max-w-xl">
            <div className="mb-8 flex items-center gap-3">
              <img
                src="/netwhite.png"
                alt="Netizen logo"
                className="h-10 w-10 rounded-xl object-cover"
              />
              <span className="text-xl font-semibold">Netizen</span>
            </div>

            <h1 className="max-w-[10ch] text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Build your local network.
            </h1>

            <p className="mt-5 max-w-lg text-base text-white/80 sm:text-lg">
              Create an account to follow community updates, discover events, and
              connect with people nearby.
            </p>

            <div className="mt-10 grid gap-4 sm:max-w-md">
              {/**
               * <div key={title} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
               *   <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/65">{title}</p>
               *   <p className="mt-2 text-sm text-white/90">{detail}</p>
               * </div>
               */}
              {["Local news", "Groups", "Community action"].map((title) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.15em] text-white/65">
                    {title}
                  </p>
                  <p className="mt-2 text-sm text-white/90">
                    {title === "Local news" &&
                      "Fresh updates from your street and neighborhood"}
                    {title === "Groups" && "Join the interests and movements that matter"}
                    {title === "Community action" && "Back causes and stay involved"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-8 lg:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="text-sm font-medium uppercase tracking-[0.18em] text-[#3f7a59]">
                Join now
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[#15271d]">
                Create account
              </h2>
            </div>

            <form
              onSubmit={handleRegister}
              className="space-y-5"
              noValidate
            >
              <div>
                <label
                  htmlFor="register-name"
                  className="mb-2 block text-sm font-medium text-[#273a2f]"
                >
                  Full name
                </label>
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Smith"
                  autoComplete="name"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-[#dfe9e2] bg-white px-3.5 py-3 text-[15px] text-[#12221b] outline-none transition focus:border-[#1f9d58] focus:ring-4 focus:ring-[#1f9d58]/10 disabled:cursor-not-allowed disabled:bg-[#f3f5f4]"
                />
              </div>

              <div>
                <label
                  htmlFor="register-email"
                  className="mb-2 block text-sm font-medium text-[#273a2f]"
                >
                  Email address
                </label>
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-[#dfe9e2] bg-white px-3.5 py-3 text-[15px] text-[#12221b] outline-none transition focus:border-[#1f9d58] focus:ring-4 focus:ring-[#1f9d58]/10 disabled:cursor-not-allowed disabled:bg-[#f3f5f4]"
                />
              </div>

              <div>
                <label
                  htmlFor="register-password"
                  className="mb-2 block text-sm font-medium text-[#273a2f]"
                >
                  Password
                </label>
                <input
                  id="register-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  disabled={loading}
                  className="w-full rounded-xl border border-[#dfe9e2] bg-white px-3.5 py-3 text-[15px] text-[#12221b] outline-none transition focus:border-[#1f9d58] focus:ring-4 focus:ring-[#1f9d58]/10 disabled:cursor-not-allowed disabled:bg-[#f3f5f4]"
                />
              </div>

              {error && (
                <p className="rounded-xl border border-[#f0c7c7] bg-[#fff3f3] px-3.5 py-2.5 text-sm text-[#b42318]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-[#1c9d57] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#138647] disabled:cursor-not-allowed disabled:bg-[#9ac7af]"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#54645d]">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#157b45] hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}