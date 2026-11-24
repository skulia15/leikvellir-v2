"use client";

import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { Sheet, type SheetRef } from "react-modal-sheet";
import { ScrollArea } from "~/components/ui/scroll-area";

export interface MobileBottomSheetHandle {
  snapTo: (index: number) => void;
}

interface MobileBottomSheetProps {
  sheetHandleRef: MutableRefObject<MobileBottomSheetHandle | null>;
  isOpen: boolean;
  onSnap?: (snapIndex: number) => void;
  header: ReactNode;
  children: ReactNode;
}

export default function MobileBottomSheet({
  sheetHandleRef,
  isOpen,
  onSnap,
  header,
  children,
}: MobileBottomSheetProps) {
  const internalRef = useRef<SheetRef>();

  useEffect(() => {
    sheetHandleRef.current = {
      snapTo: (index: number) => {
        internalRef.current?.snapTo(index);
      },
    };
    return () => {
      sheetHandleRef.current = null;
    };
  }, [sheetHandleRef]);

  return (
    <Sheet
      ref={internalRef}
      isOpen={isOpen}
      onClose={() => {
        // Snap to minimized (15%) instead of fully closing,
        // so a fast swipe down collapses rather than hides the sheet
        internalRef.current?.snapTo(2);
      }}
      snapPoints={[0.85, 0.6, 0.15]}
      initialSnap={1} // Start at 60% — show content immediately
      onSnap={onSnap}
      disableScrollLocking
      style={{
        zIndex: 30,
      }}
    >
      <Sheet.Container
        style={{
          borderTopLeftRadius: "20px",
          borderTopRightRadius: "20px",
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.1)",
          backgroundColor: "hsl(var(--card))",
        }}
      >
        <Sheet.Header className="px-4 pt-3 pb-2 border-b border-border bg-card">
          {header}
        </Sheet.Header>
        <Sheet.Content className="bg-card">
          <ScrollArea className="h-full px-2">
            <div className="pb-[max(1.5rem,env(safe-area-inset-bottom))]">{children}</div>
          </ScrollArea>
        </Sheet.Content>
      </Sheet.Container>
    </Sheet>
  );
}
