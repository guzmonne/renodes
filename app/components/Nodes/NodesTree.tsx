import { Fragment, createContext, useRef, useEffect, useState, useCallback, useContext } from "react"
import { ulid } from "ulid"
import { Map as ImmutableMap } from "immutable"
import { useQuery, useMutation } from "react-query"
import { useDrag, useDrop } from "react-dnd"
import cn from "classnames"
import type { KeyboardEventHandler, FocusEventHandler } from "react"

import { NodeControl } from "./NodeControl"
import { NodeDropdown } from "./NodeDropdown"
import { NodeInterpreter } from "./NodeInterpreter"
import { NodeAddChild } from "./NodeAddChild"
import { Loader } from "../Utils/Loader"
import type { Node as NodeModel, NodeItem, NodeMeta, NodePatch } from "../../models/node"

/**
 * headers is a constant that configures the appropiate headers to use on a fetch request.
 */
const headers = new Headers()
headers.append("Accept", "application/json")
headers.append("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8")
/**
 * ImmutableNodeModel is a representation of NodeModel as an Immutable Map.
 */
type ImmutableNodeModel = ImmutableMap<keyof NodeModel, string | string[] | NodeMeta>
/**
 * ImmutableNodeState represent the state of all the Nodes as an ImmutableMap.
 */
type ImmutableNodesState = ImmutableMap<string, ImmutableNodeModel>
/**
 * NodesTreeProps represent the properties for the NodesTree component.
 */
export interface NodesTreeProps {
  /**
   * root represents the root item of the tree.
   */
  root: NodeItem;
  /**
   * parent is the id of the parent Node.
   */
  parent?: string;
}
/**
 * NodeProps represent the properties of the Node component.
 */
export interface NodeProps {
  /**
   * model is the ImmutableNodeModel that represents the Node.
   */
  model: ImmutableNodeModel;
  /**
   * index corresponds to the Node's index inside its parent collection.
   */
  index?: number;
  /**
   * isRoot is a flag that should only set to true for the root Node.
   */
  isRoot?: boolean;
  /**
   * isHome is a flag that is toggled only if the Node represents the Home pseudo-Node.
   */
  isHome?: boolean;
}
/**
 * NodeBranchProps represent the props of the NodeBranch component.
 */
export interface NodeBranchProps {
  /**
   * collection is a list of Node id's.
   */
  collection: string[];
  /**
   * onAdd is the function to be called when a new Node needs to be created.
   */
  onAdd: () => void;
  /**
   * loading is a flag that tells the Branch that new data is being loaded.
   */
  loading?: boolean;
}
/**
 * NodeDrag is the interface React DND uses to handle dragging a Node.
 */
export interface NodeDrag {
  /**
   * dragIndex corresponds to the index of the `Nodes` being dragged.
   */
  dragIndex: number;
  /**
   * hoverIndex corresponds to the index of the `Nodes` that is being hovered.
   */
  hoverIndex: number;
  /**
   * id is the unique identifier of the Node.
   */
  id: string
  /**
   * type indicates the type of the Node being dragged.
   */
  type: string
}
/**
 * NodesTreeContext is the React context used throughout the Node's Tree.
 */
const NodesTreeContext = createContext(null)
/**
 * NodesTree renders a Node Tree.
 * @param props - NodeTree properties.
 */
export function NodesTree({ root, parent }: NodesTreeProps) {
  let [state, setState] = useState(() => createImmutableNodesStateFrom(root))
  /**
   * addMutation persists add actions on the backend.
   * @param variables - Mutation variables.
   * @property variables.id - Parent node id.
   * @property variables.node - Node body.
   * @property variables.afterId - Id of the Node after which this Node should be added.
   */
  const addMutation = useMutation(({ parent, node, afterId }: { parent: string, node: NodeModel, afterId?: string }) => (
    fetch(`/${parent}`, {
      method: "POST",
      headers,
      body: toFormBody({ ...node, afterId })
    }).then((response => {
      if (!response.ok) throw new Error("couldn't add the new Node")
    }))
  ))
  /**
   * editMutation persists edit actions on the backend.
   * @param variables - Mutation variables.
   * @property variables.id - Node unique identifier.
   * @property variables.patch - Node patch to apply.
   */
  const editMutation = useMutation(({ id, patch }: { id: string, patch: NodePatch }) => (
    fetch(`/${id}`, {
      method: "PUT",
      headers,
      body: toFormBody(patch)
    }).then((response) => {
      if (!response.ok) throw new Error("couldn't edit the Node")
    })
  ))
  /**
   * metaMutation persists meta actions on the backend.
   * @param variables - Mutation variables.
   * @property variables.id - Node unique identifier.
   * @property variables.meta - Node metdata to update.
   */
  const metaMutation = useMutation(({ id, meta }: { id: string, meta: NodeMeta }) => (
    fetch(`/${id}`, {
      method: "PATCH",
      headers,
      body: toFormBody({ meta })
    }).then((response) => {
      if (!response.ok) throw new Error("couldn't edit the Node's metadata")
    })
  ))
  /**
   * deleteMutation persists delete actions on the backend.
   * @param variables - Mutation variables.
   * @property variables.id - Node unique identifier
   */
  const deleteMutation = useMutation(({ id }: { id: string }) => (
    fetch(`/${id}`, {
      method: "DELETE",
      headers,
    }).then((response) => {
      if (!response.ok) throw new Error("couldn't edit the Node's metadata")
    })
  ))
  /**
   * dragMutation persist drag actions on the backend.
   * @param variables - Mutation variables.
   * @property variables.parent - Node parent
   * @property variables.dragId - Node unique identifier.
   * @property variables.afterId - Node after which the dragged Node should be placed.
   */
  const dragMutation = useMutation(({ parent, dragId, afterId }: { parent: string, dragId: string, afterId?: string }) => (
    fetch(`/${parent}`, {
      method: "POST",
      headers,
      body: toFormBody({ dragId, afterId })
    }).then((response) => {
      if (!response.ok) throw new Error("couldn't drag the Node")
    })
  ))
  /**
   * onToggleIsOpened toggles the value of the model's isOpened meta value.
   * @param model - The model whose `isOpened` value should be toggled.
   */
  const onToggleIsOpened = useCallback((model: ImmutableNodeModel) => {
    const id = model.get("id") as string
    const isOpened = !model.getIn(["meta", "isOpened"])
    setState(state.setIn([id, "meta", "isOpened"], isOpened))
    metaMutation.mutate({ id, meta: { isOpened } })
  }, [setState, state])
  /**
   * onToggleIsInEditMode toggles the value of the model's isInEditMode meta value.
   * @param model - The model whose `isInEditMode` value should be toggled.
   * @param value - Value to set.
   */
  const onToggleIsInEditMode = useCallback((model: ImmutableNodeModel, value?: boolean) => {
    const id = model.get("id") as string
    const isInEditMode = value === undefined ? !model.getIn(["meta", "isInEditMode"]) : value
    setState(state.setIn([id, "meta", "isInEditMode"], isInEditMode))
  }, [setState, state])
  /**
   * onAddSibling adds a new Node after the current model.
   * @param model - Model after which a new Node should be added.
   */
  const onAddSibling = useCallback((model: ImmutableNodeModel) => {
    const id = ulid()
    const parent = model.get("parent") as string || "home"
    const node: NodeModel = { id, content: "", parent, collection: [], meta: { isInEditMode: true } }
    state = state.set(id, ImmutableMap(node) as ImmutableNodeModel)
    const collection = state.getIn([parent, "collection"]) as string[]
    const index = collection.findIndex((id) => id === model.get("id") as string)
    setState(state.setIn([parent, "collection"], [...collection.slice(0, index + 1), id, ...collection.slice(index + 1)]))
    addMutation.mutate({ parent, node, afterId: model.get("id") as string })
  }, [setState, state])
  /**
   * onAddChild adds a new Node as child of the current model.
   * @param model - Parent node model
   */
  const onAddChild = useCallback((model: ImmutableNodeModel) => {
    const id = ulid()
    const parent = model.get("id") as string
    const node: NodeModel = { id, content: "", parent, collection: [], meta: { isInEditMode: true } }
    state = state.set(id, ImmutableMap(node) as ImmutableNodeModel)
    const collection = model.get("collection") as string[]
    setState(state.setIn([parent, "collection"], [...collection, id]))
    addMutation.mutate({ parent, node })
  }, [setState, state])
  /**
   * onDelete deletes a Node from a parent collection.
   * @param model - Node model to delete from parent.
   */
  const onDelete = useCallback((model: ImmutableNodeModel) => {
    const id = model.get("id") as string
    const parent = model.get("parent") as string || "home"
    const collection = state.getIn([parent, "collection"]) as string[]
    setState(state.setIn([parent, "collection"], collection.filter(_id => _id !== id)))
    deleteMutation.mutate({ id })
  }, [setState, state])
  /**
   * onOpenExternalLink opens a new page with the model Node as root.
   * @param model - Node model to open on a new page.
   */
  const onOpenExternalLink = useCallback((model: ImmutableNodeModel) => {
    window.open(window.location.origin + "/" + model.get("id") as string)
  }, [setState, state])
  /**
   * onInterpreterChange updates the value of a Node model's interpeter.
   * @param model - Node model to update.
   * @param interpreter - New interpreter interpreter
   */
  const onInterpreterChange = useCallback((model: ImmutableNodeModel, interpreter: string) => {
    const id = model.get("id") as string
    setState(state.setIn([id, "interpreter"], interpreter))
    editMutation.mutate({ id, patch: { interpreter } })
  }, [setState, state])
  /**
   * onContentChange updates the value of a Node model's content.
   * @param model - Node model to update.
   * @param content - New content content
   */
  const onContentChange = useCallback((model: ImmutableNodeModel, content: string) => {
    const id = model.get("id") as string
    setState(state.setIn([id, "content"], content))
    editMutation.mutate({ id, patch: { content } })
  }, [setState, state])
  /**
   * onSave updates the value of a Node model's content and set the value of
   * isInEditMode to false.
   * @param model - Node model to update.
   * @param content - New content content.
   */
  const onSave = useCallback((model: ImmutableNodeModel, content: string) => {
    const id = model.get("id") as string
    state = state.setIn([id, "content"], content)
    setState(state.setIn([id, "meta", "isInEditMode"], false))
    editMutation.mutate({ id, patch: { content } })
  }, [setState, state])
  /**
   * onDrag updates the position of Node inside it's parent collection by dragging
   * it after another Node.
   * @param dragId - Node unique identifier.
   * @param dragIndex - Current index of the Node being dragged.
   * @param hoverIndex - Index of the Node being hovered.
   */
  const onDrag = useCallback((dragId: string, dragIndex: number, hoverIndex?: number) => {
    const parent = state.getIn([dragId, "parent"]) as string || "home"
    const collection = state.getIn([parent, "collection"]) as string[]
    const afterId = hoverIndex === 0 ? undefined : collection[hoverIndex]
    collection.splice(dragIndex, 1)
    collection.splice(hoverIndex, 0, dragId)
    setState(state.setIn([parent, "collection"], [...collection]))
    dragMutation.mutate({ parent, dragId, afterId })
  }, [setState, state])
  /**
   * onFetch substitutes an existing model from a current on gotten from the backend.
   * @param id - Node's unique identifier.
   */
  const onFetch = useCallback(async (id: string) => {
    const response = await fetch(`/${id}`, { headers })
    if (!response.ok) throw new Error("couldn't fetch the Node's data")
    const { data } = await response.json()
    setState(state.merge(createImmutableNodesStateFrom(data, state)))
    return state.get(id)
  }, [setState, state])
  // ---
  return (
    <NodesTreeContext.Provider value={{
      state,
      onAddChild,
      onAddSibling,
      onContentChange,
      onDelete,
      onDrag,
      onFetch,
      onInterpreterChange,
      onOpenExternalLink,
      onSave,
      onToggleIsInEditMode,
      onToggleIsOpened,
    }}>
      <Node
        model={state.get(root.id)}
        isRoot={true}
        isHome={root.id === "home"}
      />
    </NodesTreeContext.Provider>
  )
}
/**
 * Node renders a Node inside a NodeTree.
 * @param props - Node properties.
 */
export function Node({
  model,
  isHome = false,
  isRoot = false,
  index = -1,
}: NodeProps) {
  const {
    onAddChild,
    onAddSibling,
    onContentChange,
    onDelete,
    onDrag,
    onFetch,
    onInterpreterChange,
    onOpenExternalLink,
    onSave,
    onToggleIsInEditMode,
    onToggleIsOpened,
  } = useContext(NodesTreeContext)
  /**
   * id is the unique identifier of a Node.
   */
  const id = model.get("id") as string
  /**
   * parent is the unique identifier of the parent Node.
   */
  const parent = model.get("parent") as string
  /**
   * collection is a list of child Nodes.
   */
  const collection = model.get("collection") as string[]
  /**
   * interpreter is the name of the interpreter that should render the node
   */
  const interpreter = model.get("interpreter") as string
  /**
   * content is the content of the node
   */
  const content = model.get("content") as string
  /**
   * isOpened is a flag that indicates that the sub-nodes collection is opened.
   */
  const isOpened = !!model.getIn(["meta", "isOpened"])
  /**
   * isInEditMode is a flag that indicates that the Node is in edit mode.
   */
  const isInEditMode = !!model.getIn(["meta", "isInEditMode"])
  /**
   * isOpenedRef is a hack used to track the previous value of isOpened, and
   * this trigger updates over the Node.
   */
  const isOpenedRef = useRef<boolean>(isOpened)
  /**
   * query is a React Query function to refetch more data from a Node.
   */
  const query = useQuery<ImmutableNodeModel>(["Node", id], async () => onFetch(id), {
    enabled: false,
  })
  /**
   * handleOnToggleIsOpened toggles the visibility of child Nodes.
   */
  const handleOnToggleIsOpened = useCallback(() => {
    onToggleIsOpened(model, query.refetch)
  }, [onToggleIsOpened, model])
  /**
   * handleOnToggleIsInEditMode toggles the visibility of child Nodes.
   */
  const handleOnToggleIsInEditMode = useCallback(() => {
    onToggleIsInEditMode(model)
  }, [onToggleIsOpened, model])
  /**
   * handleOnAddSibling adds a new Node as sibling.
   */
  const handleOnAddSibling = useCallback(() => {
    onAddSibling(model)
  }, [onAddSibling, model])
  /**
   * handleOnAddChild adds a new Node as sibling.
   */
  const handleOnAddChild = useCallback(() => {
    onAddChild(model)
  }, [onAddChild, model])
  /**
   * handleOnDelete deletes the current Node.
   */
  const handleOnDelete = useCallback(() => {
    onDelete(model)
  }, [onDelete, model])
  /**
   * handleOnInterpreterChange update the value of the model's interpreter.
   * @param value - New interpreter value.
   */
  const handleOnInterpreterChange = useCallback((value: string) => {
    onInterpreterChange(model, value)
  }, [onInterpreterChange, model])
  /**
   * handleOnContentChange update the value of the model's content.
   * @param value - New content value.
   */
  const handleOnContentChange = useCallback((value: string) => {
    onContentChange(model, value)
  }, [onContentChange, model])
  /**
   * handleOnSave update th value of the model's content and toggles off the
   * isInEditMode meta value.
   * @param value - New content value
   */
  const handleOnSave = useCallback((value: string) => {
    onSave(model, value)
  }, [onSave, model])
  /**
   * handleOnOpenExternalLink opens the Node on another window.
   */
  const handleOnOpenExternalLink = useCallback(() => {
    onOpenExternalLink(model)
  }, [onOpenExternalLink, model])
  /**
   * handleOnFocus focuses on the edit textarea if the Node is in edit mode.
   */
  const handleOnFocus = useCallback<FocusEventHandler<HTMLDivElement>>((e) => {
    if (!model.getIn(["meta", "isInEditMode"])) return
    focusOnTextArea(e.currentTarget)
  }, [model])
  /**
   * handleOnKeyDown handles key presses on top of the Node.
   */
  const handleOnKeyDown = useCallback<KeyboardEventHandler<HTMLDivElement>>((e) => {
    switch (e.key) {
      case "Enter": {
        if (!e.shiftKey) return
        e.preventDefault()
        handleOnAddSibling()
      }
      case "e": {
        if (!e.ctrlKey) return
        if (model.getIn(["meta", "isInEditMode"])) return focusOnTextArea(e.currentTarget)
        handleOnToggleIsInEditMode()
        return
      }
    }
  }, [handleOnAddSibling, handleOnToggleIsInEditMode, model])
  /**
   * Refetch the Node's data when it's opened.
   */
  useEffect(() => {
    const isOpened = model.getIn(["meta", "isOpened"]) as boolean
    if (isOpened === true && isOpenedRef.current === false) query.refetch()
    isOpenedRef.current = isOpened
  }, [model])
  /**
   * Handle dragging Nodes inside a parent Node's collection.
   */
  const ref = useRef<any>(null)
  // Set up the drop logic.
  const [{ hoveredClassName, hovered, handlerId }, drop] = useDrop({
    accept: parent || "NODE",
    collect: (monitor) => {
      const item = (monitor.getItem() || {}) as NodeDrag
      const { dragIndex, hoverIndex } = item
      const className = cn({
        hoverTop: hoverIndex === index && dragIndex > index,
        hoverBottom: hoverIndex === index && dragIndex < index
      })
      return {
        handlerId: monitor.getHandlerId(),
        hovered: monitor.isOver(),
        hoveredClassName: className,
      }
    },
    hover: (item: NodeDrag) => {
      if (!ref.current || index === -1) return
      const { hoverIndex } = item
      if (hoverIndex === index) return
      item.hoverIndex = index
    },
    drop: (item: NodeDrag) => {
      const { id, dragIndex, hoverIndex } = item
      if (dragIndex === hoverIndex) return
      onDrag(id, dragIndex, hoverIndex)
    }
  })
  // Set up the drag logic
  const [_, drag, preview] = useDrag({
    type: parent || "NODE",
    item: () => ({ id, dragIndex: index, type: parent || "NODE" }),
  })
  // Combine the drop and preview values with our ref.
  drop(preview(ref))
  // ---
  return (
    <Fragment>
      {!isHome &&
        <div
          className={cn("Node", { [hoveredClassName]: hovered })}
          ref={ref}
          tabIndex={isInEditMode ? undefined : index + 1}
          onKeyDown={handleOnKeyDown}
          onFocus={handleOnFocus}
        >
          <div className="Node__Controls">
            <NodeControl
              icon={isOpened ? "chevron-down" : "chevron-right"}
              onClick={handleOnToggleIsOpened}
              ref={drag}
              data-handler-id={handlerId}
            />
            <NodeDropdown
              onAdd={handleOnAddSibling}
              onDelete={handleOnDelete}
              noExternalLink={isRoot}
              onExternalLink={handleOnOpenExternalLink}
              isInEditMode={isInEditMode}
              onEdit={handleOnToggleIsInEditMode}
              interpreter={interpreter}
              onInterpreter={handleOnInterpreterChange}
            />
          </div>
          <NodeInterpreter
            isInEditMode={isInEditMode}
            interpreter={interpreter}
            content={content}
            onAdd={handleOnAddSibling}
            onDelete={handleOnDelete}
            onChange={handleOnContentChange}
            onSave={handleOnSave}
            tabIndex={index + 1}
          />
        </div>
      }
      {(isHome || isOpened) && <NodeBranch loading={collection.length === 0 && query.isLoading} collection={collection} onAdd={handleOnAddChild} />}
    </Fragment>
  )
}
/**
 * NodeBranch renders a collection of Nodes.
 * @param props - NodeBranch properties.
 */
export function NodeBranch({ loading, collection, onAdd }: NodeBranchProps) {
  const { state } = useContext(NodesTreeContext)

  if (loading) return <div className="Nodes"><Loader /></div>

  return (
    <div className="Nodes">
      {collection.length === 0
        ? <NodeAddChild onAdd={onAdd} />
        : collection.map((id, index) => <Node key={id} index={index} model={state.get(id)} />)
      }
    </div>
  )
}
// ---------
// Functions
// ---------
/**
 * createImmutableNodesStateFrom recursively creates an ImmutableNodesState from a Node item.
 * @param item - NodeItem to convert.
 * @param result - Result of the previous execution.
 * @returns a new ImmutableNodesState.
 */
function createImmutableNodesStateFrom(item: NodeItem, result?: ImmutableNodesState): ImmutableNodesState {
  const collection = item.collection || []
  const ids = collection.map((item) => item.id)

  result || (result = ImmutableMap<string, ImmutableNodeModel>())

  const model = result.get(item.id) as ImmutableNodeModel
  const node = ImmutableMap({
    ...item,
    meta: model ? { ...item.meta, ...model.get("meta") as NodeMeta } : (item.meta || {}),
    collection: ids,
  }) as ImmutableNodeModel

  result = result.set(item.id, node)

  for (let item of collection) {
    result = createImmutableNodesStateFrom(item, result)
  }

  return result
}
/**
 * toFormBody converts an object into a valid form encoded string.
 * @param obj - Object to stringify.
 */
function toFormBody(obj: any): string {
  const formBody = []
  for (let [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue
    let encodedKey = encodeURIComponent(key)
    let encodedVal = typeof value === "object" ? toFormBody(value) : encodeURIComponent(value as any)
    formBody.push(encodedKey + "=" + encodedVal)
  }
  return formBody.join("&")
}
/**
 * focusOnTextarea calls the focus method on the first textarea available inside
 * the provided div element.
 * @param div - Html DIV element.
 */
function focusOnTextArea(div: HTMLDivElement) {
  const textarea = div.getElementsByTagName("textarea")[0]
  if (textarea) textarea.focus()
}