import { DeleteCommand, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { PutCommandOutput, QueryCommandOutput, UpdateCommandOutput, DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"

import { DynamoDriver } from "./dynamoDriver.server"
import type { DynamoDriverItem } from "./dynamoDriver.server"
import type { NodeItem, NodePatch, NodeMeta } from "../models/node"

/**
 * NodeDynamoItem is the interface that represent how a Node is stored
 * on a DynamoDB table.
 */
export interface NodeDynamoItem extends NodeItem, DynamoDriverItem {
  /**
   * _b represents the name of the parent that the item belongs.
   */
  _b: string;
  /**
   * _n contains a reference to the "next" node of the
   * current `Nodes` linked list. If the `Node` is the last
   * of the list its value will be equal to "`.`".
   */
  _n: string;
  /**
   * _t contains the interpreter value of the node.
   */
  _t?: string;
  /**
   * _m holds the meta information of the NodeDynamoItem.
   */
  _m?: NodeMeta;
}
/**
 * NodesDynamoDriver handles the logic of `Node` items inside a DynamoDB table.
 */
export class NodesDynamoDriver extends DynamoDriver<NodeItem, NodeDynamoItem, NodePatch> {
  /**
   * getPointingTo returns the `Node` item pointing to the
   * `Node` identified by its `sk` value.
   * @param pk - `Node` unique identifier.
   * @param parent - `Node` parent.
   */
  private async getPointingTo(pk: string, parent: string): Promise<NodeDynamoItem | undefined> {
    const response: QueryCommandOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byNext",
      KeyConditionExpression: "#_b = :_b AND #_n = :_n",
      ExpressionAttributeNames: { "#_b": "_b", "#_n": "_n" },
      ExpressionAttributeValues: { ":_b": parent, ":_n": pk },
      Limit: 1,
    }))
    return response.Items && response.Items.length === 1
      ? response.Items[0] as NodeDynamoItem
      : undefined
  }
  /**
   * put inserts a new `Node` in the table. Every put is
   * done using a `ConditionExpression` that avoids replacing
   * an existing `Node` with a new one by checking if an
   * item already exist on the table with the same `pk`.
   * @param pk - `Node` unique identifier.
   * @param body - `Node` body to be stored.
   * @param parent - `Node` parent.
   * @param afterPk - `Node` to set the new `Node` after.
   */
  async put(pk: string, body: NodeItem, parent?: string, afterPk?: string): Promise<boolean> {
    if (!parent) return false
    const after = afterPk === undefined
      ? await this.getTail(parent)
      : await this.get(afterPk)
    if (after === undefined) return this.putFirst(pk, parent, body)
    const updatePromise: Promise<UpdateCommandOutput> = this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: after.pk },
      UpdateExpression: "SET #_n = :new_n",
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_n": after._n, ":new_n": pk },
    }))
    const item: NodeDynamoItem = { id: body.id, content: body.content, _t: body.interpreter, pk, _b: parent, _n: after === undefined ? "." : after._n }
    if (body.interpreter) item._t = body.interpreter
    const putPromise: Promise<PutCommandOutput> = this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    const [updateOutput, putOutput] = await Promise.all([updatePromise, putPromise])
    return (
      updateOutput.$metadata.httpStatusCode === 200 &&
      putOutput.$metadata.httpStatusCode === 200
    )
  }
  /**
   * putFirst creates the `head` item along the first `Node` of a new `parent`.
   * @param pk - `Node` unique identifier.
   * @param parent - `Node` parent.
   * @param item - `Node` item to be stored.
   */
  private async putFirst(pk: string, parent: string, body: NodeItem): Promise<boolean> {
    const putHeadPromise: Promise<PutCommandOutput> = this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: { pk: "#" + parent, _b: parent, _n: pk },
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    const item: NodeDynamoItem = { id: body.id, content: body.content, _t: body.interpreter, pk, _b: parent, _n: "." }
    if (body.interpreter) item._t = body.interpreter
    const putItemPromise: Promise<PutCommandOutput> = this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: item,
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    const [putHeadOutput, putItemOutput] = await Promise.all([putHeadPromise, putItemPromise])
    return (
      putHeadOutput.$metadata.httpStatusCode === 200 &&
      putItemOutput.$metadata.httpStatusCode === 200
    )
  }
  /**
   * getTail returns the current tail of the linked list. It should
   * always be the first element of the query since its sort attribute
   * should be set to a dot ("`.`").
   * @param parent - `Nodes` parent on which to search for the `tail`.
   */
  private async getTail(parent: string): Promise<NodeDynamoItem | undefined> {
    const queryOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byNext",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": parent },
      Limit: 1,
    }))
    return queryOutput.Items && queryOutput.Items.length === 1
      ? queryOutput.Items[0] as NodeDynamoItem
      : undefined
  }
  /**
   * update update only some specific attributes of a `Node`.
   * @param pk - `Node` unique identifier.
   * @param patch - `Node` patch to be applied to the `item`.
   */
  async update(pk: string, patch: NodePatch): Promise<boolean> {
    const updateExpression: string[] = []
    const expressionAttributeNames: { [key: string]: string } = {}
    const expressionAttributeValues: { [key: string]: string } = {}
    if (patch.content) {
      updateExpression.push("#content = :content")
      expressionAttributeNames["#content"] = "content"
      expressionAttributeValues[":content"] = patch.content
    }
    if (patch.interpreter) {
      updateExpression.push("#_t = :_t")
      expressionAttributeNames["#_t"] = "_t"
      expressionAttributeValues[":_t"] = patch.interpreter
    }
    if (updateExpression.length === 0) return true
    const response: UpdateCommandOutput = await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk },
      UpdateExpression: `SET ${updateExpression.join(",")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    }))
    return response.$metadata.httpStatusCode === 200
  }
  /**
   * meta updates the meta attributes of a `Node`.
   * @param pk - `Node` unique identifier.
   * @param meta - Meta object to update.
   */
  async meta(pk: string, meta: NodeMeta, force?: boolean): Promise<boolean> {
    // Check if the object is empty
    if (meta.isOpened === undefined) return true
    try {
      const response: UpdateCommandOutput = await this.db.send(new UpdateCommand(
        force
          ? {
            TableName: this.tableName,
            Key: { pk },
            UpdateExpression: "SET #_m = :_m",
            ExpressionAttributeNames: { "#_m": "_m" },
            ExpressionAttributeValues: { ":_m": meta },
          }
          : {
            TableName: this.tableName,
            Key: { pk },
            UpdateExpression: "SET #_m.#isOpened = :isOpened",
            ExpressionAttributeNames: { "#_m": "_m", "#isOpened": "isOpened" },
            ExpressionAttributeValues: { ":isOpened": meta.isOpened },
          }
      ))
      return response.$metadata.httpStatusCode === 200
    } catch (err) {
      if (err.name && err.name === "ValidationException") {
        return this.meta(pk, meta, true)
      }
      throw err
    }
  }
  /**
   * delete deletes a single `Node` from the table identified by its key.
   * @param key - `Node` unique identifier.
   */
  async delete(pk: string): Promise<boolean> {
    const node = await this.get(pk)
    if (node === undefined) return true
    const pointingToNode = await this.getPointingTo(node.pk, node._b)
    if (!pointingToNode) return false
    // 1. Update `pointingToNode` to point to the `Node` currently
    //    being pointed by the `Node` to be deleted.
    const updatePromise: Promise<UpdateCommandOutput> = this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: pointingToNode.pk },
      UpdateExpression: "SET #_n = :_new_n",
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_new_n": node._n, ":_n": pointingToNode._n },
    }))
    // 2. Delete the node.
    const deletePromise: Promise<DeleteCommandOutput> = this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { pk: node.pk },
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_n": node._n },
    }))
    // TODO: handle errors.
    await Promise.all([updatePromise, deletePromise])
    return true
  }
  /**
   * list returns the list of `Nodes` under a `pk`.
   * @param parent - `Nodes` parent.
   */
  async list(parent: string): Promise<NodeDynamoItem[]> {
    const queryOutput: QueryCommandOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byBranch",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": parent },
    }))
    if (!queryOutput.Items || queryOutput.Items.length === 0) return []
    const [head, ...items] = queryOutput.Items as NodeDynamoItem[]
    return this.follow(head, items)
  }
  /**
   * follow is a function that takes a `HEAD` item and a list
   * of `Node` items and returns another list ordered according
   * to its `_n` attribute, starting from the item indicated
   * by the `HEAD` item.
   * @param head - `HEAD` item from which to get the first item of the list.
   * @param items - List of `Node` items to be ordered.
   */
  private follow(head: NodeDynamoItem, items: NodeDynamoItem[]): NodeDynamoItem[] {
    const map = new Map<string, NodeDynamoItem>()
    const result: NodeDynamoItem[] = []
    const remaining: NodeDynamoItem[] = []
    if (head._n === ".") return []
    // First pass, we create the `sk` to `item` map, plus start
    // populating the `result` list.
    items.forEach((item: NodeDynamoItem, _: number) => {
      map.set(item.pk, item)
      if (item.pk === head._n) {
        result.push(item)
        head = item
      } else {
        remaining.push(item)
      }
    })
    // Second pass, we iterate over the remaining items until
    // we complete the list.
    remaining.forEach(() => {
      head = map.get(head._n) as NodeDynamoItem
      result.push(head)
    })
    return result
  }
  /**
   * drag allows to move a `Node` from its current position to a
   * new one.
   * @param fromKey - `Node` to be moved identified by its key.
   * @param parent - `Nodes` parent.
   * @param afterKey - New position of the `Nodes` identifie by the key
   *                   of the `Node` currently in that position.
   */
  async after(fromPK: string, parent: string, afterPK?: string): Promise<boolean> {
    if (fromPK === afterPK) return true
    const [from, after, $from] = await Promise.all([
      this.get(fromPK),
      this.get(afterPK || "#" + parent),
      this.getPointingTo(fromPK, parent),
    ])
    if (!from || !after || !$from) return false
    if (after._n === from.pk) return true
    const [updateFromOutput, updateAfterOutput, update$FromOutput] = await Promise.all([
      this.db.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: from.pk },
        ConditionExpression: "#_n <> :pk",
        UpdateExpression: "SET #_n = :_n",
        ExpressionAttributeNames: { "#_n": "_n" },
        ExpressionAttributeValues: { ":_n": after._n, ":pk": from.pk },
      })),
      this.db.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: after.pk },
        ConditionExpression: "#_n <> :pk",
        UpdateExpression: "SET #_n = :_n",
        ExpressionAttributeNames: { "#_n": "_n" },
        ExpressionAttributeValues: { ":_n": from.pk, ":pk": after.pk },
      })),
      this.db.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: $from.pk },
        ConditionExpression: "#_n <> :pk",
        UpdateExpression: "SET #_n = :_n",
        ExpressionAttributeNames: { "#_n": "_n" },
        ExpressionAttributeValues: { ":_n": from._n, ":pk": $from.pk },
      }))
    ])
    return (
      updateFromOutput.$metadata.httpStatusCode === 200 &&
      updateAfterOutput.$metadata.httpStatusCode === 200 &&
      update$FromOutput.$metadata.httpStatusCode === 200
    )
  }
}
/**
 * driver is a preconfigured instance of the `NodesDynamoDriver` class.
 */
export const driver = new NodesDynamoDriver()