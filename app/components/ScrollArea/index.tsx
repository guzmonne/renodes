import { ReactNode } from "react"
import * as RadixScrollArea from "@radix-ui/react-scroll-area"

/**
 * ScrollAreaProps represent the props accepted by the ScrollArea component.
 */
export interface ScrollAreaProps {
  children: ReactNode;
  orientation?: "horizontal" | "vertical";
}
/**
 * ScrollArea is a component based on the ScrollArea component provided by Radix.
 * @param props - Component props.
 */
export function ScrollArea({ orientation, children }: ScrollAreaProps) {
  return (
    <RadixScrollArea.Root className="ScrollArea__Root">
      <RadixScrollArea.Viewport className="ScrollArea__Viewport">
        {children}
      </RadixScrollArea.Viewport>
      {(!orientation || orientation === "vertical") &&
        <RadixScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="vertical">
          <RadixScrollArea.Thumb className="ScrollArea__Thumb" />
        </RadixScrollArea.Scrollbar>
      }
      {(!orientation || orientation === "horizontal") &&
        <RadixScrollArea.Scrollbar className="ScrollArea__Scrollbar" orientation="horizontal">
          <RadixScrollArea.Thumb className="ScrollArea__Thumb" />
        </RadixScrollArea.Scrollbar>
      }
    </RadixScrollArea.Root>
  )
}