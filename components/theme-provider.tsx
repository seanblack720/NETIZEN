"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "netizen-ui-mode";
const LEGACY_KEY = "netizen.preferences";

type ThemeContextValue = {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.dataset.theme = resolved;
  root.style.colorScheme = resolved;
  try {
    // legacy sync for older code paths reading preferences
    const legacy = window.localStorage.getItem(LEGACY_KEY);
    const parsed = legacy ? JSON.parse(legacy) : {};
    const nextLegacy = {
      ...(parsed && typeof parsed === "object" ? parsed : {}),
      theme: resolved,
    };
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify(nextLegacy));
  } catch {
    /* ignore */
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // init from storage
  useEffect(() => {
    let initial: Theme = "system";
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark" || stored === "light" || stored === "system") {
        initial = stored as Theme;
      } else if (stored === "dark" || stored === "light") {
        initial = stored as Theme;
      }
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    const resolved =
      initial === "system" ? getSystemTheme() : (initial as "light" | "dark");
    setResolvedTheme(resolved);
    applyTheme(resolved);
    setMounted(true);
  }, []);

  // react to system changes when in system mode
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const next = mql.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyTheme(next);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      const resolved = next === "system" ? getSystemTheme() : (next as "light" | "dark");
      setResolvedTheme(resolved);
      applyTheme(resolved);
      try {
        window.localStorage.setItem(STORAGE_KEY, next === "system" ? getSystemTheme() : next);
        // also store resolved for FOUC script that reads only light/dark
        window.localStorage.setItem(STORAGE_KEY, next === "system" ? resolved : next);
      } catch {
        /* ignore */
      }
    },
    []
  );

  // convenience toggle light<->dark
  const toggleTheme = useCallback(() => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }, [resolvedTheme, setTheme]);

  // keep DOM in sync when resolvedTheme changes (e.g. system)
  useEffect(() => {
    if (!mounted) return;
    applyTheme(resolvedTheme);
  }, [resolvedTheme, mounted]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
