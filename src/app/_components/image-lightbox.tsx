"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MAX_SCALE = 4;
const MIN_SWIPE_DISTANCE = 50;

interface Transform {
  scale: number;
  x: number;
  y: number;
}

const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

const distanceBetween = (a: Touch, b: Touch) =>
  Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export default function ImageLightbox({
  images,
  alt,
  index,
  onIndexChange,
  onClose,
}: ImageLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [dragOffset, setDragOffset] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Gesture bookkeeping lives in refs so touchmove never triggers a re-render
  // it doesn't need — only the resulting transform does.
  const gesture = useRef<{
    mode: "none" | "swipe" | "pan" | "pinch";
    startX: number;
    startY: number;
    startDistance: number;
    startTransform: Transform;
    // Pinch midpoint relative to the stage centre, used to zoom towards fingers
    focalX: number;
    focalY: number;
  }>({
    mode: "none",
    startX: 0,
    startY: 0,
    startDistance: 0,
    startTransform: IDENTITY,
    focalX: 0,
    focalY: 0,
  });
  const lastTapRef = useRef(0);
  const [isGesturing, setIsGesturing] = useState(false);

  // Mirrors of state for the native listeners, which close over stale values
  const transformRef = useRef(transform);
  transformRef.current = transform;
  const indexRef = useRef(index);
  indexRef.current = index;

  const hasMultipleImages = images.length > 1;

  useEffect(() => setMounted(true), []);

  // Reset zoom whenever the visible image changes
  useEffect(() => {
    setTransform(IDENTITY);
  }, [index]);

  const goTo = useCallback(
    (next: number) => {
      if (images.length === 0) return;
      onIndexChange((next + images.length) % images.length);
    },
    [images.length, onIndexChange],
  );

  // Keep panning inside the image: at scale S the image can move at most
  // half its overflow (size * (S - 1) / 2) in each direction.
  const clampTransform = useCallback((next: Transform): Transform => {
    const rect = stageRef.current?.getBoundingClientRect();
    const scale = clamp(next.scale, 1, MAX_SCALE);
    if (!rect || scale <= 1) return { scale, x: 0, y: 0 };
    const maxX = (rect.width * (scale - 1)) / 2;
    const maxY = (rect.height * (scale - 1)) / 2;
    return {
      scale,
      x: clamp(next.x, -maxX, maxX),
      y: clamp(next.y, -maxY, maxY),
    };
  }, []);

  // Lock background scroll while open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") goTo(index + 1);
      if (event.key === "ArrowLeft") goTo(index - 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goTo, index, onClose]);

  // Touch gestures are registered natively with { passive: false } — React's
  // synthetic touchmove is passive, so preventDefault() there is a no-op and
  // the browser would keep its own page zoom / scroll going.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const onTouchStart = (event: TouchEvent) => {
      const g = gesture.current;
      setIsGesturing(true);
      g.startTransform = transformRef.current;
      if (event.touches.length === 2) {
        const [a, b] = [event.touches[0]!, event.touches[1]!];
        const rect = stage.getBoundingClientRect();
        g.mode = "pinch";
        g.startDistance = distanceBetween(a, b);
        g.focalX = (a.clientX + b.clientX) / 2 - (rect.left + rect.width / 2);
        g.focalY = (a.clientY + b.clientY) / 2 - (rect.top + rect.height / 2);
        setDragOffset(0);
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      g.startX = touch.clientX;
      g.startY = touch.clientY;
      g.mode = transformRef.current.scale > 1 ? "pan" : "swipe";
    };

    const onTouchMove = (event: TouchEvent) => {
      const g = gesture.current;
      if (g.mode === "pinch" && event.touches.length === 2) {
        event.preventDefault();
        const [a, b] = [event.touches[0]!, event.touches[1]!];
        const ratio = distanceBetween(a, b) / (g.startDistance || 1);
        const scale = clamp(g.startTransform.scale * ratio, 1, MAX_SCALE);
        const growth = scale / g.startTransform.scale;
        setTransform(
          clampTransform({
            scale,
            // Zoom about the finger midpoint rather than the image centre
            x: g.focalX - (g.focalX - g.startTransform.x) * growth,
            y: g.focalY - (g.focalY - g.startTransform.y) * growth,
          }),
        );
        return;
      }
      const touch = event.touches[0];
      if (!touch) return;
      if (g.mode === "pan") {
        event.preventDefault();
        setTransform(
          clampTransform({
            scale: g.startTransform.scale,
            x: g.startTransform.x + (touch.clientX - g.startX),
            y: g.startTransform.y + (touch.clientY - g.startY),
          }),
        );
        return;
      }
      if (g.mode === "swipe" && hasMultipleImages) {
        const dx = touch.clientX - g.startX;
        if (Math.abs(dx) > Math.abs(touch.clientY - g.startY)) {
          event.preventDefault();
          setDragOffset(dx);
        }
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      const g = gesture.current;
      if (g.mode === "swipe") {
        const touch = event.changedTouches[0];
        const dx = touch ? touch.clientX - g.startX : 0;
        const dy = touch ? touch.clientY - g.startY : 0;
        setDragOffset(0);
        if (
          hasMultipleImages &&
          Math.abs(dx) > Math.abs(dy) &&
          Math.abs(dx) > MIN_SWIPE_DISTANCE
        ) {
          goTo(indexRef.current + (dx < 0 ? 1 : -1));
        } else if (Math.abs(dx) < 10 && Math.abs(dy) < 10) {
          // Double tap toggles zoom
          const now = event.timeStamp;
          if (now - lastTapRef.current < 300) {
            setTransform((current) =>
              current.scale > 1 ? IDENTITY : { scale: 2, x: 0, y: 0 },
            );
            lastTapRef.current = 0;
          } else {
            lastTapRef.current = now;
          }
        }
      }
      if (event.touches.length === 0) {
        g.mode = "none";
        setIsGesturing(false);
      }
    };

    stage.addEventListener("touchstart", onTouchStart, { passive: false });
    stage.addEventListener("touchmove", onTouchMove, { passive: false });
    stage.addEventListener("touchend", onTouchEnd);
    stage.addEventListener("touchcancel", onTouchEnd);
    return () => {
      stage.removeEventListener("touchstart", onTouchStart);
      stage.removeEventListener("touchmove", onTouchMove);
      stage.removeEventListener("touchend", onTouchEnd);
      stage.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [clampTransform, goTo, hasMultipleImages, mounted]);

  const isZoomed = transform.scale > 1;

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      {hasMultipleImages && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          {index + 1}/{images.length}
        </div>
      )}

      {hasMultipleImages && (
        <>
          <button
            onClick={(event) => {
              event.stopPropagation();
              goTo(index - 1);
            }}
            className="absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 sm:p-3 text-white transition-colors hover:bg-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              goTo(index + 1);
            }}
            className="absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2 sm:p-3 text-white transition-colors hover:bg-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      <div
        ref={stageRef}
        className="relative h-full w-full touch-none select-none overflow-hidden"
        onClick={(event) => {
          event.stopPropagation();
          // Click on the empty letterboxing (or anywhere while unzoomed) closes
          if (!isZoomed && !(event.target instanceof HTMLImageElement)) onClose();
        }}
        onDoubleClick={() =>
          setTransform((current) =>
            current.scale > 1 ? IDENTITY : { scale: 2, x: 0, y: 0 },
          )
        }
      >
        <div
          className="relative h-full w-full"
          style={{
            transform: `translate3d(${transform.x + dragOffset}px, ${transform.y}px, 0) scale(${transform.scale})`,
            transition: isGesturing ? "none" : "transform 200ms ease-out",
          }}
        >
          <Image
            key={images[index]}
            src={images[index] ?? "/playground.jpg"}
            alt={`${alt} - Image ${index + 1}`}
            fill
            sizes="100vw"
            className="object-contain"
            quality={90}
            priority
            draggable={false}
          />
        </div>
      </div>

      {isZoomed && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
          {Math.round(transform.scale * 100)}%
        </div>
      )}
    </div>,
    document.body,
  );
}
