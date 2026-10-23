"use client";

// Facebook-style image grid layouts, keyed by number of tiles shown (2-5)
const gridClass: Record<number, string> = {
  2: "grid-cols-2 grid-rows-1 h-[260px] sm:h-[340px]",
  3: "grid-cols-2 grid-rows-[3fr_2fr] h-[360px] sm:h-[420px]",
  4: "grid-cols-2 grid-rows-2 h-[340px] sm:h-[420px]",
  5: "grid-cols-6 grid-rows-2 h-[340px] sm:h-[420px]",
};

// Column span per tile, by total number of tiles shown
const tileSpan: Record<number, string[]> = {
  2: ["", ""],
  3: ["col-span-2", "", ""],
  4: ["", "", "", ""],
  5: ["col-span-3", "col-span-3", "col-span-2", "col-span-2", "col-span-2"],
};

export function PostImageGrid({
  images,
  onImageClick,
}: {
  images: string[];
  onImageClick?: (index: number) => void;
}) {
  if (!images || images.length === 0) return null;

  if (images.length === 1) {
    return (
      <button
        type="button"
        onClick={() => onImageClick?.(0)}
        className="block w-full cursor-pointer overflow-hidden"
        aria-label="Open image"
      >
        <img
          src={images[0]}
          alt="Post"
          className="block h-auto max-h-[620px] min-h-[220px] w-full object-cover"
        />
      </button>
    );
  }

  const shown = images.slice(0, 5);
  const extra = images.length - 5;

  return (
    <div
      className={`grid gap-[2px] bg-white dark:bg-[#0d1914] ${gridClass[shown.length]}`}
    >
      {shown.map((src, index) => (
        <button
          key={`${index}-${src}`}
          type="button"
          onClick={() => onImageClick?.(index)}
          aria-label={`Open image ${index + 1}`}
          className={`relative min-h-0 cursor-pointer overflow-hidden ${tileSpan[shown.length][index]}`}
        >
          <img
            src={src}
            alt={`Post ${index + 1}`}
            className="h-full w-full object-cover"
          />

          {index === 4 && extra > 0 && (
            <span className="absolute inset-0 grid place-items-center bg-black/50 text-2xl font-semibold text-white">
              +{extra}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}