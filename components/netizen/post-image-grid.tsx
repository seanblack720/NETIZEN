"use client";
import { useCallback, useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  images: string[];
  onOpen?: (index: number) => void;
  onImageClick?: (index: number) => void;
  rounded?: boolean;
  maxHeight?: string;
};

/**
 * Facebook-like image grid — now supports up to 10 images
 * 1 -> single large cover
 * 2 -> two side-by-side equal
 * 3 -> one tall left + two stacked right on desktop; on mobile: top full width + 2 below
 * 4 -> 2x2 grid
 * 5-10 -> 2-column grid showing all images (last tile shows +N if count > 10, shouldn't happen)
 */
export function PostImageGrid({ images, onOpen, onImageClick, rounded = true }: Props) {
  const list = images.filter((s) => typeof s === "string" && s.trim().length > 0);
  const count = list.length;
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const externalOpen = onImageClick ?? onOpen;
  const handle = (idx: number) => () => {
    if (externalOpen) externalOpen(idx);
    else setLightboxIndex(idx);
  };
  const closeLightbox = useCallback(() => setLightboxIndex(null), []);
  const prev = useCallback(() => setLightboxIndex((i) => (i === null ? i : Math.max(0, i - 1))), []);
  const next = useCallback(() => setLightboxIndex((i) => (i === null ? i : Math.min(list.length - 1, i + 1))), [list.length]);
  useEffect(() => {
    if (lightboxIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxIndex, closeLightbox, prev, next]);

  const wrap = rounded
    ? "overflow-hidden rounded-xl border border-[#e9efe9] bg-[#f5f7f5] sm:rounded-xl"
    : "overflow-hidden bg-[#f5f7f5]";

  const onImgError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.style.display = "none";
    const parent = img.parentElement;
    if (parent && !parent.querySelector("[data-fallback]")) {
      const fb = document.createElement("div");
      fb.setAttribute("data-fallback", "1");
      fb.className = "absolute inset-0 grid place-items-center bg-[#eef3ef] text-xs font-medium text-[#6b7f75]";
      fb.textContent = "Image unavailable";
      parent.appendChild(fb);
    }
  };

  let grid: React.ReactNode = null;
  if (count === 1) {
    grid = (
      <div className={`${wrap} w-full`}>
        <button type="button" onClick={handle(0)} className="relative block w-full overflow-hidden bg-[#0f1a14]" aria-label="Open image">
          <img src={list[0]} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30 blur-2xl" />
          <img src={list[0]} alt="Post image" onError={onImgError} className="relative mx-auto h-auto max-h-[520px] w-full object-contain" loading="lazy" />
        </button>
      </div>
    );
  } else if (count === 2) {
    grid = (
      <div className={`${wrap} grid w-full grid-cols-2 gap-[2px]`}>
        {list.slice(0, 2).map((src, i) => (
          <button key={i} type="button" onClick={handle(i)} className="relative block aspect-[4/3] overflow-hidden bg-[#eef3ef]" aria-label={`Open image ${i + 1}`}>
            <img src={src} alt={`Post image ${i + 1}`} onError={onImgError} className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    );
  } else if (count === 3) {
    grid = (
      <div className={`${wrap} grid w-full grid-cols-2 gap-[2px] sm:h-[360px]`}>
        <button type="button" onClick={handle(0)} className="relative col-span-2 aspect-[16/10] overflow-hidden bg-[#eef3ef] sm:col-span-1 sm:row-span-2 sm:aspect-auto sm:h-full" aria-label="Open image 1">
          <img src={list[0]} alt="Post image 1" onError={onImgError} className="h-full w-full object-cover" loading="lazy" />
        </button>
        <button type="button" onClick={handle(1)} className="relative aspect-[4/3] overflow-hidden bg-[#eef3ef] sm:aspect-auto sm:h-[179px]" aria-label="Open image 2">
          <img src={list[1]} alt="Post image 2" onError={onImgError} className="h-full w-full object-cover" loading="lazy" />
        </button>
        <button type="button" onClick={handle(2)} className="relative aspect-[4/3] overflow-hidden bg-[#eef3ef] sm:aspect-auto sm:h-[179px]" aria-label="Open image 3">
          <img src={list[2]} alt="Post image 3" onError={onImgError} className="h-full w-full object-cover" loading="lazy" />
        </button>
      </div>
    );
  } else {
    // Facebook style: 4 images in 2x2, if more than 4 show +N overlay on 4th tile
    // e.g. 5 images -> +1, 10 images -> +6 — tapping opens lightbox with all images
    const visible = list.slice(0, 4);
    const extra = count - 4;
    grid = (
      <div className={`${wrap} grid w-full grid-cols-2 gap-[2px]`}>
        {visible.map((src, i) => {
          const isLast = i === 3 && extra > 0;
          return (
            <button key={i} type="button" onClick={handle(i)} className="relative aspect-square overflow-hidden bg-[#eef3ef]" aria-label={`Open image ${i + 1}`}>
              <img src={src} alt={`Post image ${i + 1}`} onError={onImgError} className="h-full w-full object-cover" loading="lazy" />
              {isLast && <span className="absolute inset-0 grid place-items-center bg-black/55 text-xl font-bold text-white">+{extra}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <>
      {grid}
      {lightboxIndex !== null && !externalOpen && (
        <div className="fixed inset-0 z-[70] flex flex-col bg-black/90 backdrop-blur-sm" onClick={closeLightbox} role="dialog" aria-modal="true">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-medium tabular-nums">{lightboxIndex + 1} / {list.length}</span>
            <button type="button" onClick={closeLightbox} className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20" aria-label="Close">
              <X size={20} />
            </button>
          </div>
          <div className="relative flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img src={list[lightboxIndex]} alt={`Post image ${lightboxIndex + 1}`} className="max-h-[78vh] max-w-full object-contain shadow-2xl" />
            {list.length > 1 && lightboxIndex > 0 && (
              <button type="button" onClick={prev} className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/20" aria-label="Previous image">
                <ChevronLeft size={22} />
              </button>
            )}
            {list.length > 1 && lightboxIndex < list.length - 1 && (
              <button type="button" onClick={next} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/20" aria-label="Next image">
                <ChevronRight size={22} />
              </button>
            )}
          </div>
          {list.length > 1 && (
            <div className="flex justify-center gap-2 pb-6 pt-2">
              {list.map((_, idx) => (
                <button key={idx} type="button" onClick={() => setLightboxIndex(idx)} className={`h-1.5 rounded-full transition-all ${idx === lightboxIndex ? "w-8 bg-white" : "w-3 bg-white/40"}`} aria-label={`Go to image ${idx + 1}`} />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
