"use client";

import { useState } from "react";

export function Avatar({
  src,
  alt,
  className = "h-[42px] w-[42px] rounded-full object-cover",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <img
      className={className}
      src={imgSrc}
      alt={alt}
      onError={() => setImgSrc("/shadow.png")}
    />
  );
}
