"use client";

export function Avatar({
  src,
  alt,
  className = "h-[42px] w-[42px] rounded-full object-cover",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return <img className={className} src={src} alt={alt} />;
}
