import { Fragment, createContext, useEffect, useState, useCallback, useContext } from "react"
import { ulid } from "ulid"
import { Map as ImmutableMap } from "immutable"
import { useQuery } from "react-query"

import { NodeControl } from "./NodeControl"
import { NodeDropdown } from "./NodeDropdown"
import { NodeInterpreter } from "./NodeInterpreter"
import { NodeAddChild } from "./NodeAddChild"
import { Loader } from "../Utils/Loader"
import type { Node as NodeModel, NodeItem, NodeMeta } from "../../models/node"

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
   * isRoot is a flag that should only set to true for the root Node.
   */
  isRoot?: boolean;
  /**
   * isOpened is a flag that toggles the viewing of it's Node collection.
   */
  isOpened?: boolean;
  /**
   * isHome is a flag that is toggled only if the Node represents the Home pseudo-Node.
   */
  isHome?: boolean;
  /**
   * isInEditMode is a flag that indicates if the Node should be renders in edit mode.
   */
  isInEditMode?: boolean;
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
   * onToggleIsOpened toggles the value of the model's isOpened meta value.
   * @param model - The model whose `isOpened` value should be toggled.
   */
  const onToggleIsOpened = useCallback((model: ImmutableNodeModel) => {
    setState(state.setIn([model.get("id"), "meta", "isOpened"], !model.getIn(["meta", "isOpened"])))
  }, [setState, state])
  /**
   * onToggleIsInEditMode toggles the value of the model's isInEditMode meta value.
   * @param model - The model whose `isInEditMode` value should be toggled.
   * @param value - Value to set.
   */
  const onToggleIsInEditMode = useCallback((model: ImmutableNodeModel, value?: boolean) => {
    setState(state.setIn([model.get("id"), "meta", "isInEditMode"], value === undefined ? !model.getIn(["meta", "isInEditMode"]) : value))
  }, [setState, state])
  /**
   * onAddSibling adds a new Node after the current model.
   * @param model - Model after which a new Node should be added.
   */
  const onAddSibling = useCallback((model: ImmutableNodeModel) => {
    const id = ulid()
    const parent = model.get("parent") as string || "home"
    state = state.set(id, ImmutableMap({ id, content: "", parent, collection: [], meta: { isInEditMode: true } }) as ImmutableNodeModel)
    const collection = state.getIn([parent, "collection"]) as string[]
    const index = collection.findIndex((id) => id === model.get("id") as string)
    setState(state.setIn([parent, "collection"], [...collection.slice(0, index + 1), id, ...collection.slice(index + 1)]))
  }, [setState, state])
  /**
   * onAddChild adds a new Node as child of the current model.
   * @param model - Parent node model
   */
  const onAddChild = useCallback((model: ImmutableNodeModel) => {
    const id = ulid()
    const parent = model.get("id") as string
    state = state.set(id, ImmutableMap({ id, content: "", parent, collection: [], meta: { isInEditMode: true } }) as ImmutableNodeModel)
    const collection = model.get("collection") as string[]
    setState(state.setIn([parent, "collection"], [...collection, id]))
  }, [setState, state])
  /**
   * onDelete deletes a Node from a parent collection.
   * @param model - Node model to delete from parent.
   */
  const onDelete = useCallback((model: ImmutableNodeModel) => {
    const modelId = model.get("id") as string
    const parent = model.get("parent") as string || "home"
    const collection = state.getIn([parent, "collection"]) as string[]
    setState(state.setIn([parent, "collection"], collection.filter(id => id !== modelId)))
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
   * @param value - New interpreter value
   */
  const onInterpreterChange = useCallback((model: ImmutableNodeModel, value: string) => {
    setState(state.setIn([model.get("id") as string, "interpreter"], value))
  }, [setState, state])
  /**
   * onContentChange updates the value of a Node model's content.
   * @param model - Node model to update.
   * @param value - New content value
   */
  const onContentChange = useCallback((model: ImmutableNodeModel, value: string) => {
    setState(state.setIn([model.get("id") as string, "content"], value))
  }, [setState, state])
  /**
   * onSave updates the value of a Node model's content and set the value of
   * isInEditMode to false.
   * @param model - Node model to update.
   * @param value - New content value.
   */
  const onSave = useCallback((model: ImmutableNodeModel, value: string) => {
    const id = model.get("id") as string
    state = state.setIn([id, "content"], value)
    setState(state.setIn([id, "meta", "isInEditMode"], false))
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

  const isRoot = parent === undefined

  return (
    <NodesTreeContext.Provider value={{
      state,
      onAddChild,
      onAddSibling,
      onContentChange,
      onDelete,
      onInterpreterChange,
      onOpenExternalLink,
      onSave,
      onToggleIsInEditMode,
      onToggleIsOpened,
      onFetch,
    }}>
      <Node
        model={state.get(root.id)}
        isRoot={true}
        isHome={root.id === "home"}
        isOpened={isRoot || !!state.getIn([root.id, "meta", "isOpened"])}
        isInEditMode={!!state.getIn([root.id, "meta", "isInEditMode"])}
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
  isOpened,
  isInEditMode,
}: NodeProps) {
  const {
    onAddChild,
    onAddSibling,
    onContentChange,
    onDelete,
    onInterpreterChange,
    onOpenExternalLink,
    onSave,
    onToggleIsInEditMode,
    onToggleIsOpened,
    onFetch,
  } = useContext(NodesTreeContext)
  /**
   * id is the unique identifier of a Node.
   */
  const id = model.get("id") as string
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
   * Flags
   */
  isOpened = isOpened === undefined ? !!model.getIn(["meta", "isOpened"]) : !!isOpened
  isInEditMode = isInEditMode === undefined ? !!model.getIn(["meta", "isInEditMode"]) : !!isInEditMode
  /**
   * React Query
   */
  const query = useQuery<ImmutableNodeModel>(["Node", id], async () => onFetch(id), {
    enabled: false,
  })
  /**
   * handleOnToggleIsOpened toggles the visibility of child Nodes.
   */
  const handleOnToggleIsOpened = useCallback(() => {
    onToggleIsOpened(model)
    // Run the refetch on a setTimeout to be sure that the onToggleIsOpened
    // function updates the state before running the onFetch function.
    if (isOpened === false) setTimeout(() => query.refetch())
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
  console.log({ query })
  /**
   * Return
   */
  return (
    <Fragment>
      {!isHome &&
        <div className="Node">
          <div className="Node__Controls">
            <NodeControl
              icon={isOpened ? "chevron-down" : "chevron-right"}
              onClick={handleOnToggleIsOpened}
            />
            <NodeDropdown
              onAdd={handleOnAddSibling}
              onDelete={handleOnDelete}
              noExternalLink={isRoot}
              onExternalLink={onOpenExternalLink}
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
          />
        </div>
      }
      {isOpened && <NodeBranch loading={collection.length === 0 && query.isLoading} collection={collection} onAdd={handleOnAddChild} />}
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
        : collection.map((id) => <Node key={id} model={state.get(id)} />)
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