"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface ImageGalleryProps {
  images: string[];
}

export function ImageGallery({ images }: ImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const imageList = images.filter((image): image is string => 
    typeof image === "string" && image.trim().length > 0
  );

  if (!imageList.length) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-[20px] border border-[#edf2ee] bg-[#f5f7f5]"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Main Image */}
      <div className="relative h-[420px] w-full overflow-hidden bg-black">
        <img
          src={imageList[currentIndex]}
          alt={`Gallery image ${currentIndex + 1}`}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Navigation Controls - Only show if more than 1 image */}
      {imageList.length > 1 && (
        <>
          {/* Previous Button */}
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70 transition"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black bg-opacity-50 p-2 text-white hover:bg-opacity-70 transition"
            aria-label="Next image"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Image Counter */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black bg-opacity-60 px-3 py-1 text-sm font-medium text-white">
            {currentIndex + 1} / {imageList.length}
          </div>
        </>
      )}
    </div>
  );
}
