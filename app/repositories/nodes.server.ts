import { client } from "../clients/nodesClient.server"
import { Repository } from "./repository.server"
import type { NodeItem, NodeMeta, NodePatch } from "../models/node"
import type { NodesClient, NodesQueryParams } from "../clients/nodesClient.server"

/**
 * NodesRepository manages Nodes through a standard interface.
 * @param config - Configuration object.
 */
class NodesRepository extends Repository<NodeItem, NodePatch, NodesQueryParams> {
  /**
   * client is an instance of the NodesClient class used to interact
   * with the database.
   */
  client: NodesClient = client
  /**
   * get returns a single Node identified by its `id`.
   * @param id - Node unique identifier.
   * @param userId - User unique identifier.
   * @param recursive - Gets the node plus its sub-nodes.
   */
  async get(id: string, userId?: string, recursive: boolean = false): Promise<NodeItem> {
    if (id === "home") return this.getHome(userId, recursive)
    const { error, data } = await this.client.get(id, userId, recursive)
    if (error) throw error
    return data
  }
  /**
   * getHome returns the pseudo-node "home"
   * @param userId - User unique identifier.
   * @param recursive - Gets the node plus its sub-nodes.
   */
  async getHome(userId?: string, recursive: boolean = false): Promise<NodeItem> {
    const { error, data } = await this.client.query({ userId, recursive })
    if (error) throw error
    const node = { id: "home", content: "Home Node", parent: "home", collection: data }
    return node
  }
  /**
   * put stores a Node in the Repository.
   * @param node - Node to store in the Repository.
   */
  async put(node: NodeItem, afterId?: string): Promise<NodeItem> {
    if (node.parent === "home") node = { id: node.id, content: node.content }
    const { error, data } = await this.client.put(node, afterId)
    if (error) throw error
    return data
  }
  /**
   * meta updates the metadata information of a `Node`
   * @param id - Node unique identifier.
   * @param meta - Metadata object to apply.
   * @param userId - User unique identifier.
   */
  async meta(id: string, meta: NodeMeta, userId?: string): Promise<undefined> {
    const { error } = await this.client.meta(id, userId, meta)
    if (error) throw error
    return undefined
  }
  /**
   * after drops a `Node` to the position after another `Node`. If
   * `after` is `undefined` then the `Node` should be dragged to
   * the beginning of the list.
   * @param id - Node unique identifier.
   * @param parent - Node parent.
   * @param afterId - Unique identifier of the `Node` after which the
   *                `Node` must be positioned after.
   * @param userId - User unique identifier.
   */
  async after(id: string, parent?: string, afterId?: string, userId?: string): Promise<any> {
    if (parent === "home") parent = undefined
    const response = await this.client.after(id, parent, afterId, userId)
    if (response && response.error) throw response.error
    return undefined
  }
}
/**
 * repository is a pre-configured instance of the class NodesRepository.
 */
export const repository = new NodesRepository()