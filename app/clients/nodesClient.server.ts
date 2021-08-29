import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

import { Client } from "./client.server"
import { driver } from "../drivers/nodesDynamoDriver.server"
import { Node, NodeItem, NodePatch, NodeMeta } from "../models/node"
import type { DBClientResponse } from "../types"
import { ModelNotFoundError } from "../server/errors.server"
import type { NodesDynamoDriver, NodeDynamoItem } from "../drivers/nodesDynamoDriver.server"

/**
 * QueryParams is the configuration interface of a `#NodeDBClient.query()` command.
 */
export interface NodesQueryParams {
  /**
   * parent corresponds to the id where the query should run.
   */
  parent?: string;
  /**
   * userId corresponds to the unique identifier of the user.
   */
  userId?: string;
  /**
   * recursive is a flag that tells the client to get all the sub-nodes
   * of each sub-node recursively.
   */
  recursive?: boolean;
}
/**
 * NodesClient handles communication with the DynamoDB table.
 * @param config - Configuration object.
 */
export class NodesClient extends Client<NodeItem, NodesQueryParams, NodeItem, NodeDynamoItem, NodePatch, DynamoDBDocumentClient> {
  /**
   * driver is the interface to be used against a DynamoDB table.
   */
  driver: NodesDynamoDriver = driver
  /**
   * toModel converts a NodeDynamoItem into a Node object.
   * @param NodesObject - DynamoDB response to convert.
   */
  toModel(item: NodeDynamoItem): NodeItem {
    const [b0, b1, b2] = item._b.split("#")
    return {
      id: item.id,
      content: item.content,
      userId: b0 === "Nodes" ? undefined : b0,
      parent: b1 === "Nodes" ? b2 : b1,
      interpreter: item._t,
      meta: item._m,
    }
  }
  /**
   * toBody converts a Node into a valid body value.
   * @param node - Node model to convert
   */
  toBody = (node: NodeItem): NodeItem => node
  /**
   * createPK creates a valid `pk` for the current schema
   * of the DynamoDB table.
   * @param id - Unique identifier of the `Item`.
   * @param userId - Unique identifier of the user.
   */
  createPK(id?: string, userId?: string): string {
    return [userId, "Nodes", id].filter(x => x !== undefined).join("#")
  }
  /**
   * get returns a Node identified by its `id`.
   * @param id - `Node` unique identifier.
   * @param userId - User unique identifier.
   */
  async get(id: string, userId?: string, recursive: boolean = false): Promise<DBClientResponse<NodeItem>> {
    try {
      const pk = this.createPK(id, userId)
      const item = await this.driver.get(pk)
      if (!item) throw new ModelNotFoundError()
      const node = this.toModel(item)
      if (recursive) {
        const { data, error } = await this.query({ parent: id, userId, recursive })
        if (error) throw error
        node.collection = data as NodeItem[]
      }
      return { data: node }
    } catch (err) {
      return { error: err }
    }
  }
  /**
   * query returns a collection of Nodes.
   */
  async query(params: NodesQueryParams = {}): Promise<DBClientResponse<NodeItem[]>> {
    try {
      const { parent, userId, recursive } = params
      const pk = this.createPK(parent, userId)
      const items = await this.driver.list(pk)
      const nodes = items.map(this.toModel)
      if (recursive) {
        for (let node of nodes) {
          if (node.meta?.isOpened) {
            const { data, error } = await this.query({ parent: node.id, userId, recursive })
            if (error) throw error
            node.collection = data as NodeItem[]
          }
        }
      }
      return { data: nodes }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * meta returns the current `Node` metadata, or updates it.
   * @param id - `Node` unique identifier.
   * @param userId - User unique identifier.
   * @param meta - Metadata to be updated.
   */
  async meta(id: string, userId?: string, meta?: NodeMeta): Promise<DBClientResponse<NodeMeta | undefined>> {
    try {
      if (!meta) {
        const { data, error } = await this.get(id, userId)
        if (!data || error) throw new Error(`couldn't get the metadata for the node with id = ${id}`)
        return { data: data.meta }
      }
      const pk = this.createPK(id, userId)
      const ok = await this.driver.meta(pk, meta)
      if (!ok) throw new Error(`couldn't apply new metadata changes to the node with id = ${id}`)
      return { data: meta }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * put creates or updates a Node in the table.
   * @param node - `Node` to store.
   * @param afterId - Id of the `Node` after which the new `Node` should be put.
   */
  async put(node: NodeItem, afterId?: string): Promise<DBClientResponse<NodeItem>> {
    try {
      const pk = this.createPK(node.id, node.userId)
      const parentPk = this.createPK(node.parent, node.userId)
      const afterPk = afterId ? this.createPK(afterId, node.userId) : undefined
      const ok = await this.driver.put(pk, node, parentPk, afterPk)
      if (!ok) throw new Error(`error while storing node with pk = ${pk} at parent = ${parentPk}`)
      return { data: node }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * after drops a `Node` to the position after another `Node`. If
   * `after` is `undefined` then the `Node` should be dragged to
   * the beginning of the list.
   * @param id - Node unique identifier.
   * @param parent - Node parent.
   * @param afterId - Unique identifier of the `Node` after which the
   *                  `Node` must be positioned after.
   * @param userId - User unique identifier.
   */
  async after(id: string, parent?: string, afterId?: string, userId?: string): Promise<DBClientResponse<any>> {
    try {
      const pk = this.createPK(id, userId)
      const _b = this.createPK(parent, userId)
      const apk = !afterId ? undefined : this.createPK(afterId, userId)
      const ok = await this.driver.after(pk, _b, apk)
      if (!ok) throw new Error(`couldn't move node with id = ${id} after node with id ${afterId}`)
      return {}
    } catch (err) {
      return { error: err.message }
    }
  }
}
/**
 * client is a preconfigured instance of the NodesClient class.
 */
export const client = new NodesClient()