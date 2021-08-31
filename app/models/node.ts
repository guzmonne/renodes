/**
 * NodeItem is the interface that represents a Node on the backend.
 */
export interface NodeItem {
  /**
   * id is the unique identifier of the Node.
   */
  id: string;
  /**
   * content is the field use to hold the Node's content.
   */
  content: string;
  /**
   * userId is the unique identifier of the user that owns the Node.
   */
  userId?: string;
  /**
   * parent represents the parent that the Node belongs to.
   */
  parent?: string;
  /**
   * interpreter is the name of the interpreter that should render the Node
   */
  interpreter?: string;
  /**
   * collection are the Nodes that were created with this Node as their parent.
   */
  collection?: NodeItem[];
  /**
   * meta is an object that can hold aditional information of the Node.
   */
  meta?: NodeMeta;
}
/**
 * Node is the interface that represents a Node on the frontend.
 */
export interface Node extends Omit<NodeItem, "collection"> {
  collection?: string[];
  meta?: NodeMeta;
};
/**
 * NodeMeta is a plain JavaScript object that contains
 * metadata of the current Node.
 */
export interface NodeMeta {
  /**
   * isOpened is a flag used to track if the Node collection is opened.
   */
  isOpened?: boolean;
  /**
   * isInEditMode is a flag used to track if the Node is in edit mode.
   */
  isInEditMode?: boolean;
}
/**
 * NodePatch is a partial interface of the Node which include
 * only the attributes that can be patched on a Node.
 */
export type NodePatch = Pick<Partial<Node>, "content" | "interpreter" | "meta">