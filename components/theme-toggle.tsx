"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./theme-provider";

export function ThemeToggle({
  variant = "ghost",
}: {
  variant?: "ghost" | "pill";
}) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-95 ${
          isDark
            ? "border-[#23473a] bg-[#143a26] text-[#b7dfc6]"
            : "border-[#dfe7e4] bg-white text-[#5f7073]"
        }`}
      >
        {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
        {isDark ? "Light" : "Dark"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={`flex h-11 w-11 items-center justify-center rounded-xl transition active:scale-95 ${
        isDark
          ? "bg-[#143a26] text-[#7ee0b0] hover:bg-[#1a4a30]"
          : "bg-[#e7f7ed] text-[#07843b] hover:bg-[#d6f0df]"
      }`}
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}