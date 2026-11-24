"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useT } from "~/lib/i18n";

interface ImageLightboxProps {
  images: string[];
  alt: string;
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

const MAX_SCALE = 4;
const MIN_SWIPE_DISTANCE = 50;
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const t = useT();
  const [mounted, setMounted] = useState(false);
  const [transform, setTransform] = useState<Transform>(IDENTITY);
  const [dragOffset, setDragOffset] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
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

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      setPrefersReducedMotion(
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      );
    }
  }, []);

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

  // Lock background scroll, hide background content from AT/keyboard,
  // move focus into the dialog on open, and restore focus on close.
  useEffect(() => {
    if (!mounted) return;
    const dialog = dialogRef.current;
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Mark sibling body children inert & aria-hidden while modal is open
    const hiddenSiblings: Array<{
      el: HTMLElement;
      prevAriaHidden: string | null;
      prevInert: boolean;
      hadInertAttr: boolean;
    }> = [];
    for (const child of Array.from(document.body.children)) {
      if (child === dialog || !(child instanceof HTMLElement)) continue;
      hiddenSiblings.push({
        el: child,
        prevAriaHidden: child.getAttribute("aria-hidden"),
        prevInert: Boolean((child as HTMLElement & { inert?: boolean }).inert),
        hadInertAttr: child.hasAttribute("inert"),
      });
      child.setAttribute("aria-hidden", "true");
      (child as HTMLElement & { inert?: boolean }).inert = true;
      child.setAttribute("inert", "");
    }

    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      for (const { el, prevAriaHidden, prevInert, hadInertAttr } of hiddenSiblings) {
        if (prevAriaHidden === null) {
          el.removeAttribute("aria-hidden");
        } else {
          el.setAttribute("aria-hidden", prevAriaHidden);
        }
        (el as HTMLElement & { inert?: boolean }).inert = prevInert;
        if (!hadInertAttr) {
          el.removeAttribute("inert");
        }
      }
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [mounted]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowRight") {
        goTo(index + 1);
        return;
      }
      if (event.key === "ArrowLeft") {
        goTo(index - 1);
        return;
      }
      if (event.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        );
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const active = document.activeElement;
        if (event.shiftKey) {
          if (active === first || !dialog.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else if (active === last || !dialog.contains(active)) {
          event.preventDefault();
          first.focus();
        }
      }
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
      ref={dialogRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={t("a11y.closeLightbox")}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>

      {hasMultipleImages && (
        <div
          aria-live="polite"
          className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs text-white"
        >
          {index + 1}/{images.length}
        </div>
      )}

      {hasMultipleImages && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goTo(index - 1);
            }}
            className="absolute left-2 sm:left-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t("a11y.previousImage")}
          >
            <ChevronLeft className="h-6 w-6" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goTo(index + 1);
            }}
            className="absolute right-2 sm:right-4 top-1/2 z-10 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label={t("a11y.nextImage")}
          >
            <ChevronRight className="h-6 w-6" aria-hidden="true" />
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
            transition:
              isGesturing || prefersReducedMotion
                ? "none"
                : "transform 200ms ease-out",
          }}
        >
          <Image
            key={images[index]}
            src={images[index] ?? "/playground.jpg"}
            alt={`${alt} - ${index + 1}`}
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
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-xs text-white">
          {Math.round(transform.scale * 100)}%
        </div>
      )}
    </div>,
    document.body,
  );
}
