import { useState, useEffect } from "react";
import { useNodesContext } from "./useNodesContext";

export function useNode(id: string) {
  const { getNode, nodesMap } = useNodesContext()
  const [node, setNode] = useState(getNode(id))

  useEffect(() => {
    setNode(getNode(id))
  }, [nodesMap])

  return node
}