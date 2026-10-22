"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function ProfileImageModal({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Profile image"
      onClick={onClose}
    >
      <div
        className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition active:scale-90"
          aria-label="Close image"
        >
          <X size={22} />
        </button>
      </div>

      <div className="h-full w-full flex items-center justify-center p-4">
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}
