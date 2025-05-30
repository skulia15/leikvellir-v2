import { useRef, useCallback, useState } from 'react';

interface UseSwipeOptions {
    onSwipeLeft?: () => void;
    onSwipeRight?: () => void;
    minSwipeDistance?: number;
}

export function useSwipe({
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
}: UseSwipeOptions) {
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);
    const isDragging = useRef(false);
    const [dragOffset, setDragOffset] = useState(0);

    // Touch events
    const onTouchStart = useCallback((event: React.TouchEvent) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
        touchStartY.current = event.touches[0]?.clientY ?? null;
        isDragging.current = true;
    }, []);

    const onTouchMove = useCallback((event: React.TouchEvent) => {
        if (!isDragging.current || touchStartX.current === null) return;

        const currentX = event.touches[0]?.clientX ?? 0;
        const diff = currentX - touchStartX.current;
        setDragOffset(diff);
    }, []);

    const onTouchEnd = useCallback(
        (event: React.TouchEvent) => {
            if (touchStartX.current === null || touchStartY.current === null) {
                isDragging.current = false;
                setDragOffset(0);
                return;
            }

            const touchEndX = event.changedTouches[0]?.clientX ?? 0;
            const touchEndY = event.changedTouches[0]?.clientY ?? 0;

            const deltaX = touchStartX.current - touchEndX;
            const deltaY = touchStartY.current - touchEndY;

            // Check if horizontal swipe is more significant than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        // Swiped left (next image)
                        onSwipeLeft?.();
                    } else {
                        // Swiped right (previous image)
                        onSwipeRight?.();
                    }
                }
            }

            isDragging.current = false;
            touchStartX.current = null;
            touchStartY.current = null;
            setDragOffset(0);
        },
        [onSwipeLeft, onSwipeRight, minSwipeDistance]
    );

    // Mouse events
    const onMouseDown = useCallback((event: React.MouseEvent) => {
        isDragging.current = true;
        touchStartX.current = event.clientX;
        touchStartY.current = event.clientY;
        event.preventDefault();
    }, []);

    const onMouseMove = useCallback((event: React.MouseEvent) => {
        if (!isDragging.current || touchStartX.current === null) return;

        const currentX = event.clientX;
        const diff = currentX - touchStartX.current;
        setDragOffset(diff);
    }, []);

    const onMouseUp = useCallback(
        (event: React.MouseEvent) => {
            if (!isDragging.current || touchStartX.current === null || touchStartY.current === null) {
                isDragging.current = false;
                setDragOffset(0);
                return;
            }

            const mouseEndX = event.clientX;
            const mouseEndY = event.clientY;

            const deltaX = touchStartX.current - mouseEndX;
            const deltaY = touchStartY.current - mouseEndY;

            // Check if horizontal drag is more significant than vertical
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > minSwipeDistance) {
                    if (deltaX > 0) {
                        // Dragged left (next image)
                        onSwipeLeft?.();
                    } else {
                        // Dragged right (previous image)
                        onSwipeRight?.();
                    }
                }
            }

            isDragging.current = false;
            touchStartX.current = null;
            touchStartY.current = null;
            setDragOffset(0);
        },
        [onSwipeLeft, onSwipeRight, minSwipeDistance]
    );

    const onMouseLeave = useCallback(() => {
        isDragging.current = false;
        touchStartX.current = null;
        touchStartY.current = null;
        setDragOffset(0);
    }, []);

    return {
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        onMouseDown,
        onMouseMove,
        onMouseUp,
        onMouseLeave,
        dragOffset,
        isDragging: isDragging.current,
        style: { cursor: isDragging.current ? 'grabbing' : 'grab' }
    };
} 