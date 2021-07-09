import React from "react";

/**
 * useClickOutside runs a function whenever a user clicks outside the
 * ref element.
 * @param ref - Element from which to check if someone clicked outside of it.
 * @param callback - Function to call whenever someone clicks outside of the the ref.
 */
export function useClickOutside<RefType extends HTMLElement>(ref: React.RefObject<RefType>, callback: () => any) {
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        ref.current &&
        !ref.current.contains(event.target as Node)
      ) {
        callback()
      }
    }
    // Bind the event listener
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      // Unbind the event listener on clean up
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [ref]);
}