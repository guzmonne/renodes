import { forwardRef } from "react"
import cn from "classnames"

/**
 * NodeControl represents the props of the NodeControl component.
 */
export interface NodeControlProps {
  /**
   * icon must be a valid FontAwesome icon name.
   */
  icon: string;
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
export const NodeControl = forwardRef<HTMLDivElement, NodeControlProps>(({ onClick, icon, className, ...props }, ref) => {
  return (
    <div
      onClick={onClick}
      className={cn("Task__Control", className)}
      ref={ref}
      {...props}
    >
      <i className={cn("fas", icon)}></i>
    </div>
  )
})