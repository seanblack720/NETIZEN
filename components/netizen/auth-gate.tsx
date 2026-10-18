"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function LoadingScreen() {
  return (
    <main
      aria-label="Loading Netizen"
      className="flex min-h-[100dvh] items-center justify-center bg-[#07843b] text-white"
    >
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex size-24 items-center justify-center">
          <div className="absolute inset-0 rounded-[2rem] border border-white/30 bg-white/10 shadow-2xl shadow-[#034d24]/30 backdrop-blur-sm" />
          <img
            src="/netwhite.png"
            alt="Netizen"
            className="relative size-16 rounded-2xl object-contain"
          />
        </div>
        <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
          <span className="text-sm font-medium tracking-[0.24em] text-white/80">NETIZEN</span>
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.3s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-white [animation-delay:-0.15s]" />
            <span className="size-1.5 animate-bounce rounded-full bg-white" />
          </div>
        </div>
      </div>
    </main>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const response = await fetch("/api/auth/get-session", {
          credentials: "include",
          cache: "no-store",
        });
        const data = response.ok ? await response.json() : null;

        if (!data?.user) {
          router.replace("/login");
          return;
        }

        if (active) setAuthorized(true);
      } catch {
        router.replace("/login");
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [router]);

  if (!authorized) return <LoadingScreen />;

  return <>{children}</>;
}
