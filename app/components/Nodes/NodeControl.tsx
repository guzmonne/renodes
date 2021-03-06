import { forwardRef } from "react"
import cn from "classnames"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import type { IconName } from "@fortawesome/fontawesome-common-types"

/**
 * NodeControl represents the props of the NodeControl component.
 */
export interface NodeControlProps {
  /**
   * icon must be a valid FontAwesome icon name.
   */
  icon: IconName;
  /**
   * onClick is the action to be triggered when the control is clicked.
   */
  onClick?: () => void;
  /**
   * className is a custom CSS class that can be applied to the component.
   */
  className?: string;
}
/**
 * NodeControl represents a control div used to handle a Node.
 */
export const NodeControl = forwardRef<HTMLDivElement, NodeControlProps>(function NodeControl({ onClick, icon, className, ...props }, ref) {
  return (
    <div
      onClick={onClick}
      className={cn("Node__Control", className)}
      ref={ref}
      {...props}
    >
      <FontAwesomeIcon icon={icon} />
    </div>
  )
})