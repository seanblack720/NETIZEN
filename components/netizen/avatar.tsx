"use client";

import { useState } from "react";

function initials(name: string) {
  return name
    .trim()
    .split(/\\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
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
  const [imageFailed, setImageFailed] = useState(false);
  const hasImage = Boolean(src) && !imageFailed;

  return hasImage ? (
    <img
      className={className}
      src={src as string}
      alt={alt}
      onError={() => setImageFailed(true)}
    />
  ) : (
    <span
      className={`${className} inline-flex items-center justify-center bg-[#dff1e5] font-semibold text-[#176b3a]`}
      aria-label={alt}
    >
      {initials(alt)}
    </span>
  );
}
