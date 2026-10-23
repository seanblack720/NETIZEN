"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";

const BG_IMAGE =
  "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?auto=format&fit=crop&w=1200&q=80";

const inputClass =
  "h-14 w-full rounded-2xl border border-white/20 bg-white/10 pl-12 pr-4 text-base text-white placeholder:text-white/45 outline-none transition focus:border-white/60 focus:bg-white/15 focus:ring-4 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-60";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function handleReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Reset failed.");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-[100dvh] overflow-hidden bg-[#0b3d27] text-white">
      <img
        src={BG_IMAGE}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0b3d27]/30 via-[#0b3d27]/40 to-[#04170f]/95" />
      <div className="absolute -left-24 top-1/4 -z-10 h-72 w-72 rounded-full bg-[#22c55e]/30 blur-3xl" />
      <div className="absolute -right-24 top-10 -z-10 h-64 w-64 rounded-full bg-[#86efac]/20 blur-3xl" />

      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col">
        <header className="flex items-center gap-2.5 px-6 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img
            src="/netwhite.png"
            alt="Netizen logo"
            className="h-10 w-10 rounded-xl border border-white/25 bg-white/10 object-cover backdrop-blur-md ml-auto"
          />
          <span className="text-xl font-semibold tracking-tight ml-auto">Netizen</span>
        </header>

        <section className="flex flex-1 flex-col justify-end px-6 pb-6 pt-14">
          {sent ? (
            <>
              <h1 className="text-[2.25rem] font-semibold leading-[1.05] tracking-tight">
                Check your email
              </h1>
              <p className="mt-3 max-w-[32ch] text-base text-white/75">
                We sent a password reset link to {email}. Follow the instructions to reset your password.
              </p>
              <div className="mt-8 flex flex-col items-center gap-3">
                <button
                  onClick={() => router.push("/login")}
                  className="h-14 w-full rounded-2xl bg-white text-base font-semibold text-[#0b3d27] shadow-lg shadow-black/20 transition active:scale-[0.98]"
                >
                  Sign in
                </button>
                <p className="text-sm text-white/70">
                  Didn't receive an email?{" "}
                  <button
                    type="button"
                    onClick={() => setSent(false)}
                    className="font-semibold text-white underline-offset-4 hover:underline"
                  >
                    Try again
                  </button>
                </p>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-[2.25rem] font-semibold leading-[1.05] tracking-tight">
                Reset your password
              </h1>
              <p className="mt-3 max-w-[32ch] text-base text-white/75">
                Enter your email and we'll send you a link to reset your password.
              </p>

              <form onSubmit={handleReset} className="mt-5 space-y-4" noValidate>
                <div>
                  <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-white/80">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" />
                    <input
                      id="reset-email"
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
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-white/70">
                Remember your password?{" "}
                <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
