import { DeleteCommand, QueryCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { PutCommandOutput, QueryCommandOutput, UpdateCommandOutput, DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"

import { DynamoDriver } from "./dynamoDriver.server"
import type { DynamoDriverItem } from "./dynamoDriver.server"
import type { TaskBody, TaskPatch, TaskMeta } from "../models/task"

/**
 * TaskItem is the interface that represent how a Task is stored
 * on a DynamoDB table.
 */
export interface TaskItem extends TaskBody, DynamoDriverItem {
  /**
   * _b represents the name of the branch that the item belongs.
   */
  _b: string;
  /**
   * _n contains a reference to the "next" task of the
   * current `Tasks` linked list. If the `Task` is the last
   * of the list its value will be equal to "`.`".
   */
  _n: string;
  /**
   * _m holds the meta information of the TaskItem.
   */
  _m?: TaskMeta;
}
/**
 * TasksDynamoDriver handles the logic of `Task` items inside a DynamoDB table.
 */
export class TasksDynamoDriver extends DynamoDriver<TaskBody, TaskItem, TaskPatch> {
  /**
   * getPointingTo returns the `Task` item pointing to the
   * `Task` identified by its `sk` value.
   * @param pk - `Task` unique identifier.
   * @param branch - `Task` branch.
   */
  private async getPointingTo(pk: string, branch: string): Promise<TaskItem | undefined> {
    const response: QueryCommandOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byNext",
      KeyConditionExpression: "#_b = :_b AND #_n = :_n",
      ExpressionAttributeNames: { "#_b": "_b", "#_n": "_n" },
      ExpressionAttributeValues: { ":_b": branch, ":_n": pk },
      Limit: 1,
    }))
    return response.Items && response.Items.length === 1
      ? response.Items[0] as TaskItem
      : undefined
  }
  /**
   * put inserts a new `Task` in the table. Every put is
   * done using a `ConditionExpression` that avoids replacing
   * an existing `Task` with a new one by checking if an
   * item already exist on the table with the same `pk`.
   * @param pk - `Task` unique identifier.
   * @param body - `Task` body to be stored.
   * @param branch - `Task` branch.
   * @param afterPk - `Task` to set the new `Task` after.
   */
  async put(pk: string, body: TaskBody, branch?: string, afterPk?: string): Promise<boolean> {
    if (!branch) return false
    const after = afterPk === undefined
      ? await this.getTail(branch)
      : await this.get(afterPk)
    if (after === undefined) return this.putFirst(pk, branch, body)
    const updatePromise: Promise<UpdateCommandOutput> = this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: after.pk },
      UpdateExpression: "SET #_n = :new_n",
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_n": after._n, ":new_n": pk },
    }))
    const putPromise: Promise<PutCommandOutput> = this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: { id: body.id, content: body.content, pk, _b: branch, _n: after === undefined ? "." : after._n },
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
   * putFirst creates the `head` item along the first `Task` of a new `branch`.
   * @param pk - `Task` unique identifier.
   * @param branch - `Task` branch.
   * @param item - `Task` item to be stored.
   */
  private async putFirst(pk: string, branch: string, item: TaskBody): Promise<boolean> {
    const putHeadPromise: Promise<PutCommandOutput> = this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: { pk: "#" + branch, _b: branch, _n: pk },
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    const putItemPromise: Promise<PutCommandOutput> = this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: { id: item.id, content: item.content, pk, _b: branch, _n: "." },
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
   * @param branch - `Tasks` branch on which to search for the `tail`.
   */
  private async getTail(branch: string): Promise<TaskItem | undefined> {
    const queryOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byNext",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": branch },
      Limit: 1,
    }))
    return queryOutput.Items && queryOutput.Items.length === 1
      ? queryOutput.Items[0] as TaskItem
      : undefined
  }
  /**
   * update update only some specific attributes of a `Task`.
   * @param pk - `Task` unique identifier.
   * @param patch - `Task` patch to be applied to the `item`.
   */
  async update(pk: string, patch: TaskPatch): Promise<boolean> {
    if (patch.content === undefined || patch.content === null) return true
    const response: UpdateCommandOutput = await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk },
      UpdateExpression: "SET #content = :content",
      ExpressionAttributeNames: { "#content": "content" },
      ExpressionAttributeValues: { ":content": patch.content }
    }))
    return response.$metadata.httpStatusCode === 200
  }
  /**
   * meta updates the meta attributes of a `Task`.
   * @param pk - `Task` unique identifier.
   * @param meta - Meta object to update.
   */
  async meta(pk: string, meta: TaskMeta, force?: boolean): Promise<boolean> {
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
   * delete deletes a single `Task` from the table identified by its key.
   * @param key - `Task` unique identifier.
   */
  async delete(pk: string): Promise<boolean> {
    const task = await this.get(pk)
    if (task === undefined) return true
    const pointingToTask = await this.getPointingTo(task.pk, task._b)
    if (!pointingToTask) return false
    // 1. Update `pointingToTask` to point to the `Task` currently
    //    being pointed by the `Task` to be deleted.
    const updatePromise: Promise<UpdateCommandOutput> = this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: pointingToTask.pk },
      UpdateExpression: "SET #_n = :_new_n",
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_new_n": task._n, ":_n": pointingToTask._n },
    }))
    // 2. Delete the task.
    const deletePromise: Promise<DeleteCommandOutput> = this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { pk: task.pk },
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_n": task._n },
    }))
    // TODO: handle errors.
    await Promise.all([updatePromise, deletePromise])
    return true
  }
  /**
   * list returns the list of `Tasks` under a `pk`.
   * @param branch - `Tasks` branch.
   */
  async list(branch: string): Promise<TaskItem[]> {
    const queryOutput: QueryCommandOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byBranch",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": branch },
    }))
    if (!queryOutput.Items || queryOutput.Items.length === 0) return []
    const [head, ...items] = queryOutput.Items as TaskItem[]
    return this.follow(head, items)
  }
  /**
   * follow is a function that takes a `HEAD` item and a list
   * of `Task` items and returns another list ordered according
   * to its `_n` attribute, starting from the item indicated
   * by the `HEAD` item.
   * @param head - `HEAD` item from which to get the first item of the list.
   * @param items - List of `Task` items to be ordered.
   */
  private follow(head: TaskItem, items: TaskItem[]): TaskItem[] {
    const map = new Map<string, TaskItem>()
    const result: TaskItem[] = []
    const remaining: TaskItem[] = []
    if (head._n === ".") return []
    // First pass, we create the `sk` to `item` map, plus start
    // populating the `result` list.
    items.forEach((item: TaskItem, _: number) => {
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
      head = map.get(head._n) as TaskItem
      result.push(head)
    })
    return result
  }
  /**
   * drag allows to move a `Task` from its current position to a
   * new one.
   * @param fromKey - `Task` to be moved identified by its key.
   * @param branch - `Tasks` branch.
   * @param afterKey - New position of the `Tasks` identifie by the key
   *                   of the `Task` currently in that position.
   */
  async after(fromPK: string, branch: string, afterPK?: string): Promise<boolean> {
    if (fromPK === afterPK) return true
    const [from, after, $from] = await Promise.all([
      this.get(fromPK),
      this.get(afterPK || "#" + branch),
      this.getPointingTo(fromPK, branch),
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
 * driver is a preconfigured instance of the `TasksDynamoDriver` class.
 */
export const driver = new TasksDynamoDriver()