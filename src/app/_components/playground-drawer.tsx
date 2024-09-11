"use client";

import { useRef, useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "~/components/ui/drawer";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Sheet, SheetRef } from "react-modal-sheet";
export default function PlaygroundDrawer({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [isOpen, setOpen] = useState(true);
  const ref = useRef<SheetRef>();
  const snapTo = (i: number) => ref.current?.snapTo(i);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open sheet</button>

      <Sheet
        ref={ref}
        isOpen={isOpen}
        onClose={() => setOpen(true)}
        snapPoints={[0.75, 400, 100]}
        initialSnap={2}
        onSnap={(snapIndex) =>
          console.log("> Current snap point index:", snapIndex)
        }
        disableScrollLocking
      >
        <Sheet.Container>
          <Sheet.Header />
          <Sheet.Content>
            {/* <button onClick={() => snapTo(0)}>Snap to index 0</button>
            <button onClick={() => snapTo(1)}>Snap to index 1</button>
            <button onClick={() => snapTo(2)}>Snap to index 2</button> */}
            <ScrollArea className="overflow-y-auto">{children}</ScrollArea>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </>
  );
}

// return (

//   <div className="h-24">
//     <button onClick={() => setOpen(true)}>Open sheet</button>

//     <Sheet
//       isOpen={isOpen}
//       onClose={() => setOpen(false)}
//       snapPoints={[600, 400, 100, 0]}
//       initialSnap={1}
//       onSnap={(snapIndex) =>
//         console.log("> Current snap point index:", snapIndex)
//       }
//     >
//       <Sheet.Container>
//         <Sheet.Header />
//         <Sheet.Content>
//           <button onClick={() => snapTo(0)}>Snap to index 0</button>
//           <button onClick={() => snapTo(1)}>Snap to index 1</button>
//           <button onClick={() => snapTo(2)}>Snap to index 2</button>
//           <button onClick={() => snapTo(3)}>Snap to index 3</button>
//           {children}
//         </Sheet.Content>
//       </Sheet.Container>
//       <Sheet.Backdrop />
//     </Sheet>
//   </div>
// );
