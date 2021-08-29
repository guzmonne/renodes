import { ulid } from "ulid"
import { createContext, useCallback, useContext, useReducer } from "react"
import { useSubmit } from "remix"
import { omit } from "lodash"
import { Map } from "immutable"
import type { ReactNode } from "react"


import type { NodeItem, Node, NodePatch, NodeMeta } from "../models/node"

/**
 * NodesContextValue is the interface that represents the value handled
 * by NodesContext.
 */
export interface NodesContextValue {
  /**
   * onDrag drags a Node to another position inside the porent Node collection.
   * @param parent - The id of the parent Node.
   * @param dragIndex - The index of the Node being dragged.
   * @param hoverIndex - The index of the Node that is being hovered.
   */
  onDrag: (parent: string, dragIndex: number, hoverIndex?: number) => void;
  /**
   * onAdd creates a new Node.
   * @param parent - The id of the parent Node.
   * @param afterId - The id of the Node after which the new Node should be added.
   * @param id - Custom id of the new Node.
   */
  onAdd: (parent?: string, afterId?: string, id?: string) => void;
  /**
   * onEdit edits a Node.
   * @param id - Node unique identifier.
   * @param patch - The patch to apply to the Node.
   * @param fetch - A flag that indicates if the edits should be propagated to the backend.
   */
  onEdit: (id: string, patch: NodePatch, fetch?: boolean) => void;
  /**
   * onDelete deletes a Node.
   * @param - Node unique identifier.
   */
  onDelete: (id: string) => void;
  /**
   * onMeta updates the metadata properties of a Node.
   * @param id - Node unique identifier.
   * @param meta - The Node's metadata object.
   * @param fetch - A flag that indicates wether the changes should be propagated to the backend.
   */
  onMeta: (id: string, meta: NodeMeta, fetch?: boolean) => void;
  /**
   * getNode returns a Node from its id.
   * @param id - Node unique identifier.
   */
  getNode: (id: string) => Node | undefined;
  /**
   * getFetchStatus returns the current fetch status for a Node.
   * @param id - Node unique identifier.
   */
  getFetchStatus: (id: string) => string;
  /**
   * fetchNode fetches a Node's data from the Backend
   * @param id - Node unique identifier.
   */
  fetchNode: (id: string) => void;
  /**
   * rootId represents the id of the root Node.
   */
  rootId: string

  nodesMap: NodesMap;
}
/**
 * NodeAction is the action consumed by the NodesProvider's reducer.
 */
export interface NodeAction {
  type: string;
  payload:
  | string
  | NodeItem
  | { node: Node, afterId?: string }
  | { id: string, patch: NodePatch }
  | { id: string, meta: NodeMeta }
  | { id: string, item: NodeItem }
  | { parent: string, dragIndex: number, hoverIndex?: number };
}
/**
 * NodesMap reprents a Map of Nodes.
 */
export type NodesMap = Map<string, Node>;
/**
 * NodesFetchStatus represents a Map of Node's fetch statuses.
 */
export type NodesFetchStatus = Map<string, string>;
/**
 * NodesState is the interface supported by the NodesProvider's reducer.
 */
export interface NodesState {
  /**
   * nodesMap is a map that holds a normalized version of all the Nodes.
   */
  nodesMap: NodesMap;
  /**
   * rootId is the id of the root node.
   */
  rootId: string;
  /**
   * fetchStatus holds the fetch status for all the Nodes.
   */
  fetchStatus: NodesFetchStatus;
}
/**
 * NodesContextProviderProps represent the props of the NodesContextProvider component.
 */
export interface NodesContextProviderProps {
  /**
   * root is the Node root.
   */
  root: NodeItem;
  /**
   * children is the children components of the NodesContext.
   */
  children: ReactNode;
}
/**
 * NodesContext is the React Context created to store all the nodes and
 * login on the page.
 */
export const NodesContext = createContext<NodesContextValue>(undefined)
/**
 * useNodesContext is a hook that makes sures the NodesContextProvider is being
 * used before trying to access the value of NodesContext.
 */
export function useNodesContext() {
  const context = useContext(NodesContext)

  if (context === undefined) {
    throw new Error("useNodesContext must be used within a NodeProvider")
  }

  return context
}
/**
 * NodesContextProvider is a component that wraps and serves the value stored
 * on NodesContext.
 * @param root - Root Node of the page.
 */
export function NodesContextProvider({ root, children }: NodesContextProviderProps) {
  const submit = useSubmit()
  const [state, dispatch] = useReducer(reducer, {
    nodesMap: normalizeNodeItemRecursively(Map<string, Node>(), root),
    rootId: root.id,
    fetchStatus: Map<string, string>(),
  })
  /**
   * onAdd adds a Node to the under a parent Node, and optionally, under
   * another Node that already exists on the same parent.
   * @param parent - Parent Node.
   * @param afterId - Id of the Node after which the new Node should be added.
   * @param id - Custom id for the new Node.
   */
  const onAdd = useCallback((parent?: string, afterId?: string, id?: string) => {
    id || (id = ulid())
    const content = ""
    const node = { id, content, parent, collection: [], meta: { isInEditMode: true } }
    dispatch({ type: "ADD", payload: { node, afterId } })
    fetch(`/${parent || "home"}`, { method: "POST", body: formEncode({ id, parent, afterId, content }) })
  }, [dispatch, submit])
  /**
   * onDelete deletes a node.
   * @param id - Id of the Node to delete.
   */
  const onDelete = useCallback((id: string) => {
    dispatch({ type: "DELETE", payload: id })
    fetch(`/${id}`, { method: "DELETE" })
  }, [dispatch, submit])
  /**
   * onEdit edits a Node
   * @param id - Id of the Node to be edited.
   * @param patch - Patch to apply to the Node.
   * @param propagete - Flag that indicates if the edits should be propagated to the backend.
   */
  const onEdit = useCallback((id: string, patch: NodePatch, propagete: boolean = true) => {
    dispatch({ type: "EDIT", payload: { id, patch } })
    if (!propagete) return
    fetch(`/${id}`, { method: "PUT", body: formEncode(omit(patch, "meta")) })
  }, [dispatch, submit])
  /**
   * onMeta updates the metadata attributes of a Node.
   * @param id - Id of the Node to be edited.
   * @param meta - Metadata object to merge.
   * @param propagate - Flag that indicates if the edits should be propagated to the backend.
   */
  const onMeta = useCallback((id: string, meta: NodeMeta, propagate: boolean = true) => {
    dispatch({ type: "META", payload: { id, meta } })
    if (!propagate) return
    fetch(`/${id}`, { method: "PATCH", body: formEncode({ meta }) })
  }, [dispatch, submit])
  /**
   * onDrag edits the position of a Node inside its parent collection.
   * @param parent - Id of the parent Node.
   * @param dragIndex - Index of the Node being dragged.
   * @param hoverIndex - Index of the Node being hovered.
   */
  const onDrag = useCallback((parent: string, dragIndex: number, hoverIndex?: number) => {
    dispatch({ type: "DRAG", payload: { parent, dragIndex, hoverIndex } })
    fetch(`/${parent}`, { method: "POST", body: formEncode({ dragIndex, hoverIndex }) })
  }, [submit, dispatch])
  /**
   * getNode gets a Node by its id.
   * @param id - Node unique identifier.
   */
  const getNode = useCallback((id: string): Node | undefined => {
    if (state.nodesMap.has(id) === false) return undefined
    return state.nodesMap.get(id)
  }, [state])
  /**
   * getFetchStatus returns the current fetch status of a Node.
   * @param id - Node unique identifier.
   */
  const getFetchStatus = useCallback((id: string): string => {
    if (state.fetchStatus.has(id) === false) return "idle"
    return state.fetchStatus.get(id)
  }, [state])
  /**
   * fetchNode gets a Node's data from the backend.
   * @param id - Node's unique identifier.
   */
  const fetchNode = useCallback(async (id: string) => {
    dispatch({ type: "FETCH_REQUEST", payload: id })
    fetch(`/${id}?_data=routes/$id`)
      .then((response) => {
        if (response.ok) return response.json()
        response.text()
          .then((text) => { throw new Error(`couldn't fetch: ${text}`) })
          .catch((err) => { throw new Error(`couldn't fetch: ${err.message}`) })
      })
      .then((response: { data: NodeItem }) => {
        dispatch({ type: "FETCH_SUCCESS", payload: { id, item: response.data } })
      })
      .catch((err) => {
        dispatch({ type: "FETCH_FAILURE", payload: id })
        console.error(err)
      })
  }, [dispatch])
  /**
   * Value
   */
  return (
    <NodesContext.Provider value={{
      onAdd,
      onDelete,
      onEdit,
      onDrag,
      onMeta,
      getNode,
      getFetchStatus,
      fetchNode,
      rootId: state.rootId,
      nodesMap: state.nodesMap,
    }}>
      {children}
    </NodesContext.Provider>
  )
}
/**
 * Functions
 */
/**
 * reducer is the reducer consumed by NodesProvider.
 * @param state - The current NodesProvider state.
 * @param action - The action to reduce.
 */
function reducer(state: NodesState, { type, payload }: NodeAction): NodesState {
  const nextState = getState(state, { type, payload })
  return nextState
}

function getState(state: NodesState, { type, payload }: NodeAction): NodesState {
  switch (type) {
    case "INIT": return reduceInitAction(state, payload as NodeItem)
    case "DELETE": return reduceDeleteAction(state, payload as string)
    case "ADD": return reduceAddAction(state, payload as { node: Node, afterId?: string })
    case "EDIT": return reduceEditAction(state, payload as { id: string, patch: NodePatch })
    case "META": return reduceMetaAction(state, payload as { id: string, meta: NodeMeta })
    case "DRAG": return reduceDragAction(state, payload as { parent: string, dragIndex: number, hoverIndex?: number })
    case "FETCH_REQUEST": return reduceFetchRequestAction(state, payload as string)
    case "FETCH_SUCCESS": return reduceFetchSuccessAction(state, payload as { id: string, item: NodeItem })
    case "FETCH_FAILURE": return reduceFetchFailureAction(state, payload as string)
    default: return state
  }
}
/**
 * reduceInitAction returns the a valid state after an `INIT` action.
 * @param state - The current NodesProvider state.
 * @param payload - The Node item received from the backend.
 */
function reduceInitAction(state: NodesState, payload: NodeItem): NodesState {
  payload.meta = { ...payload.meta, isOpened: true }
  return {
    ...state,
    nodesMap: { ...normalizeNodeItemRecursively(state.nodesMap, payload) },
  }
}
/**
 * reduceAddAction returns the new state after adding a new Node.
 * @param state - The current NodesProvider state.
 * @param payload - The payload of the action.
 * @property payload.node - The node to be added.
 * @property payload.afterId - The if of the node after which the new Node should be added.
 */
function reduceAddAction(state: NodesState, { node, afterId }: { node: Node, afterId?: string }): NodesState {
  const { parent = "home" } = node
  if (state.nodesMap.has(parent) === false) return { ...state }
  const parentNode = state.nodesMap.get(parent)
  const { collection } = parentNode
  const index = afterId
    ? collection.findIndex((id) => id === afterId)
    : collection.length - 1
  collection.splice(index + 1, 0, node.id)
  state.nodesMap = state.nodesMap.set(parent, { ...parentNode, collection })
  state.nodesMap = state.nodesMap.set(node.id, node)
  return { ...state }
}
/**
 * reduceDeleteAction returns the new state after deleting an existing Node
 * @param state - The current NodesProvider state.
 * @param payload - The id of the Node to be deleted.
 */
function reduceDeleteAction(state: NodesState, id: string): NodesState {
  if (state.nodesMap.has(id) === false) return { ...state }
  const node = state.nodesMap.get(id)
  if (state.nodesMap.has(node.parent) === false) return { ...state }
  const parent = state.nodesMap.get(node.parent)
  state.nodesMap = state.nodesMap.set(parent.id, {
    ...parent,
    collection: parent.collection.filter(_id => _id !== id)
  })
  return { ...state }
}
/**
 * reduceEditAction returns the new state after editing an existing Node.
 * @param state - The current NodesProvider state.
 * @param payload - The payload of the action
 * @property payload.id - The id of the node to be edited.
 * @property payload.patch - The patch to be applied to the node.
 */
function reduceEditAction(state: NodesState, { id, patch }: { id: string, patch: NodePatch }): NodesState {
  if (state.nodesMap.has(id) === false) return { ...state }
  const node = state.nodesMap.get(id)
  state.nodesMap = state.nodesMap.set(id, { ...node, ...patch })
  return { ...state }
}
/**
 * reduceMetaAction returns the new state after editing the metadata of a Node.
 * @param state - The current NodesProvider state.
 * @param payload - The payload of the action.
 * @property payload.id - The id the node to be edited.
 * @property payload.meta - The meta object to be combined with the current one.
 */
function reduceMetaAction(state: NodesState, { id, meta }: { id: string, meta: NodeMeta }): NodesState {
  if (state.nodesMap.has(id) === false) return { ...state }
  const node = state.nodesMap.get(id)
  state.nodesMap = state.nodesMap.set(id, { ...node, meta: { ...node.meta, ...meta } })
  return { ...state }
}
/**
 * reduceDragAction returns the new state after dragging a Node inside a parents collection
 * @param state - The current NodesProvider state.
 * @param payload - The payload of the action.
 * @property payload.parent - The id of the parent Node.
 * @property payload.dragIndex - The index of the Node being dragged.
 * @property payload.hoverIndex - The index of the Node being hovered over.
 */
function reduceDragAction(state: NodesState, { parent, dragIndex, hoverIndex }: { parent: string, dragIndex: number, hoverIndex?: number }): NodesState {
  if (state.nodesMap.has(parent)) return { ...state }
  const parentNode = state.nodesMap.get(parent)
  const { collection } = parentNode
  collection.splice(dragIndex, 1)
  collection.splice(hoverIndex, 0, collection[dragIndex])
  state.nodesMap = state.nodesMap.set(parent, parentNode)
  return { ...state }
}
/**
 * reduceFetchRequestAction returns the new state after requesting the data of a Node.
 * @param state - The current NodesProvider state.
 * @param payload - The Node unique identifier.
 */
function reduceFetchRequestAction(state: NodesState, id: string): NodesState {
  state.fetchStatus.set(id, "isFetching")
  return {
    ...state,
    fetchStatus: Map(state.fetchStatus),
  }
}
/**
 * reduceFetchFailureAction returns the new state after receiving an error when requesting
 * data of a new Node.
 * @param state - The current NodesProvider state.
 * @param payload - The Node unique identifier.
 */
function reduceFetchFailureAction(state: NodesState, id: string): NodesState {
  state.fetchStatus.set(id, "failure")
  return {
    ...state,
    fetchStatus: Map(state.fetchStatus),
  }
}
/**
 * reduceFetchSuccessAction returns the new state after successfully retrieving the
 * Node's data.
 * @param state - The current NodesProvider state.
 * @param payload - The action's payload.
 * @property payload.id - The Node's unique identifier.
 * @property payload.item - The Node's returned item.
 */
function reduceFetchSuccessAction(state: NodesState, { id, item }: { id: string, item: NodeItem }): NodesState {
  state.fetchStatus.set(id, "success")
  return {
    ...state,
    nodesMap: Map(normalizeNodeItemRecursively(state.nodesMap, item)),
    fetchStatus: Map(state.fetchStatus)
  }
}
/**
 * normalizeNodeItemRecursively takes in a NodeItem object and returns a Node, and it's
 * Node's collection.
 * @param nodesMap - The map of Nodes to use as output.
 * @param nodeItem - The current Node being normalized.
 */
function normalizeNodeItemRecursively(nodesMap: Map<string, Node>, nodeItem: NodeItem): NodesMap {
  const collection: NodeItem[] = nodeItem.collection || []
  const ids = collection.map((item) => item.id)
  // We don't want the backend metadata to replace the frontend's metadata.
  if (nodesMap.has(nodeItem.id) && nodeItem.meta) {
    const currentNode = nodesMap.get(nodeItem.id)
    nodesMap = nodesMap.set(nodeItem.id, {
      ...nodeItem,
      meta: { ...nodeItem.meta, ...currentNode.meta },
      collection: ids,
    })
  } else {
    nodesMap = nodesMap.set(nodeItem.id, {
      ...nodeItem,
      meta: nodeItem.meta || {},
      collection: ids,
    })
  }
  for (let item of collection) {
    nodesMap = normalizeNodeItemRecursively(nodesMap, item)
  }
  return nodesMap
}
/**
 * RemixHTMLFormElement extends the HTMLFormElement.
 */
interface RemixHTMLFormElement extends HTMLFormElement {
  /**
   * input adds a new input to the form
   * @param name - name prop of the input.
   * @param value - value prop of the input.
   * @param type - value tyoe of the input.
   */
  input: (name: string, value: any, type?: string) => RemixHTMLFormElement;
  /**
   * object is a special function that can create a form encoded input.
   * @param name - name prop of the input.
   * @param object - object to encode.
   */
  object: (name: string, object: any) => RemixHTMLFormElement;
}
/**
 * createRemixFormElement returns a new form element.
 * @param action - Form action attribute
 * @param method - Form method attribute
 */
function createRemixFormElement(action: string, method: string = "post"): RemixHTMLFormElement {
  const form = document.createElement("form") as RemixHTMLFormElement
  form.setAttribute("action", action)
  form.setAttribute("method", method)
  form.input = (name: string, value: any, type: string = "text") => {
    if (value === undefined || value === null) return form
    const input = document.createElement("input")
    input.setAttribute("name", name)
    input.setAttribute("type", type)
    input.setAttribute("value", value)
    form.appendChild(input)
    return form
  }
  form.object = (name: string, object: any): RemixHTMLFormElement => {
    if (object === undefined || object === null || typeof object !== "object") return form
    const value: string[] = []
    for (let [key, val] of Object.entries(object)) {
      let encodedKey = encodeURIComponent(key)
      let encodedVal = encodeURIComponent(val as any)
      value.push(encodedKey + "=" + encodedVal)
    }
    return form.input(name, value.join("&"))
  }
  return form
}
/**
 * Functions
 */
/**
 * formEncode converts an object into a valid form encoded string.
 * @param obj - Object to stringify.
 */
function formEncode(obj: any): string {
  const formBody = []
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    let encodedKey = encodeURIComponent(key)
    let encodedVal = typeof value === "object" ? formEncode(value) : encodeURIComponent(value as any)
    formBody.push(encodedKey + "=" + encodedVal)
  }
  return formBody.join("&")
}