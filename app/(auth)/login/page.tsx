"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";

// Swap this for your own photo, e.g. "/auth-bg.jpg" placed in /public.
// A street / neighbourhood photo with some depth works best.
const BG_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80";

const inputClass =
  "h-14 w-full rounded-2xl border border-white/20 bg-white/10 pl-12 pr-4 text-base text-white placeholder:text-white/45 outline-none transition focus:border-white/60 focus:bg-white/15 focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Login failed.");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#0b3d27] text-white">
      {/* Background photo: sharp at the top, blurred by the glass sheet below */}
      <img
        src={BG_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b3d27]/30 via-[#0b3d27]/40 to-[#04170f]/95" />
      <div className="absolute -left-24 top-1/3 -z-10 h-72 w-72 rounded-full bg-[#22c55e]/30 blur-3xl" />
      <div className="absolute -right-24 top-10 -z-10 h-64 w-64 rounded-full bg-[#86efac]/20 blur-3xl" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <header className="flex items-center gap-2.5 px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <img
            src="/netwhite.png"
            alt="Netizen logo"
            className="h-10 w-10 rounded-xl border border-white/25 bg-white/10 object-cover backdrop-blur-md"
          />
          <span className="text-xl font-semibold tracking-tight">Netizen</span>
        </header>

        <section className="flex flex-1 flex-col justify-end px-6 pb-8 pt-24">
          <h1 className="text-[2.5rem] font-semibold leading-[1.05] tracking-tight">
            Welcome back to your community.
          </h1>
          <p className="mt-3 max-w-[30ch] text-base text-white/75">
            Catch up on local news, groups and events near you.
          </p>
        </section>

        {/* Glass sheet */}
        <section className="rounded-t-[2rem] border-x border-t border-white/25 bg-white/10 px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-7 shadow-[0_-24px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="mx-auto mb-6 h-1 w-10 rounded-full bg-white/30" />

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>

          <form onSubmit={handleLogin} className="mt-5 space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="mb-1.5 block text-sm font-medium text-white/80">
                Email address
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  disabled={loading}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="login-password" className="text-sm font-medium text-white/80">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm font-medium text-white underline-offset-4 hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-white/60 transition hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <p
                className="rounded-2xl border border-red-300/40 bg-red-500/20 px-4 py-3 text-sm text-red-50"
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#0b3d27] shadow-lg shadow-black/20 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/70">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-white underline-offset-4 hover:underline">
              Create one
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-white/55">
            Staff?{" "}
            <Link href="/admin" className="font-semibold text-white/80 underline-offset-4 hover:underline">
              Open admin dashboard
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}