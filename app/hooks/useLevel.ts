import { useLocation } from "react-router-dom"

export function useLevel() {
  const {search} = useLocation()
  const query = new URLSearchParams(search)
  const levelString = query.get("level") || "0"
  return parseInt(levelString, 10)
}