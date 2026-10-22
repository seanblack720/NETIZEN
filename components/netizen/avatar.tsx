"use client";

import { useState } from "react";

function getInitials(name?: string | null) {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

export function Avatar({
  src,
  alt,
  className = "h-[42px] w-[42px] rounded-full object-cover",
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const hasSrc = !!src && typeof src === "string" && src.trim().length > 0 && !errored;
  if (!hasSrc) {
    const initials = getInitials(alt);
    return (
      <div className={className + " flex shrink-0 items-center justify-center bg-[#e8efe8] text-[#2f6b4f] font-semibold overflow-hidden"} aria-label={alt}>
        <span className="text-sm leading-none">{initials}</span>
      </div>
    );
  }
  return (
    <img className={className} src={String(src)} alt={alt} onError={() => setErrored(true)} />
  );
}
