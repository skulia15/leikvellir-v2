"use client";

import { useRef, useState, useEffect } from "react";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, type SheetRef } from "react-modal-sheet";
import { Separator } from "~/components/ui/separator";

interface PlaygroundDrawerProps {
  children: React.ReactNode;
  className?: string;
}

export default function PlaygroundDrawer({
  children,
  className,
}: PlaygroundDrawerProps) {
  const [isOpen, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [panelHeight, setPanelHeight] = useState(400); // Default height for desktop
  const ref = useRef<SheetRef>();
  const resizeRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle resizing for desktop
  useEffect(() => {
    if (isMobile) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (resizeRef.current?.contains(e.target as Node)) {
        isDragging.current = true;
        document.addEventListener("mousemove", handleMouseMove);
        document.addEventListener("mouseup", handleMouseUp);
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const windowHeight = window.innerHeight;
      const newHeight = windowHeight - e.clientY;
      setPanelHeight(Math.max(200, Math.min(windowHeight * 0.8, newHeight)));
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isMobile]);

  // Mobile layout with bottom sheet
  if (isMobile) {
    return (
      <>
        <Sheet
          ref={ref}
          isOpen={isOpen}
          onClose={() => setOpen(true)} // Keep it always open
          snapPoints={[0.9, 0.5, 0.2]}
          initialSnap={2}
          onSnap={(snapIndex) =>
            console.log("> Current snap point index:", snapIndex)
          }
          disableScrollLocking
        >
          <Sheet.Container>
            <Sheet.Header className="px-4 py-2">
              <div className="mx-auto h-1 w-12 rounded-full bg-muted-foreground/30" />
            </Sheet.Header>
            <Sheet.Content>
              <ScrollArea className="h-full overflow-y-auto">
                {children}
              </ScrollArea>
            </Sheet.Content>
          </Sheet.Container>
        </Sheet>
      </>
    );
  }

  // Desktop layout with resizable panel
  return (
    <div className="relative">
      {/* Resize handle */}
      <div
        ref={resizeRef}
        className="absolute top-0 left-0 right-0 h-2 cursor-row-resize bg-transparent hover:bg-border/50 transition-colors z-20 group"
      >
        <Separator className="absolute top-1/2 left-0 right-0 -translate-y-1/2 group-hover:bg-border" />
      </div>

      {/* Panel content */}
      <div
        style={{ height: panelHeight }}
        className={`bg-background border-t overflow-hidden ${className || ""}`}
      >
        <ScrollArea className="h-full">
          <div className="pt-2">
            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
