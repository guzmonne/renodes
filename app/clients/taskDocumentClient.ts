import { DeleteCommand, QueryCommand, GetCommand, PutCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { DynamoDBDocumentClient, GetCommandOutput, PutCommandOutput, QueryCommandOutput, UpdateCommandOutput, DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"

import { client } from "./dynamo"
import type { BranchDocumentClient } from "../types"

/**
 * TaskDocumentClientConfig is the configuration interface
 * needed to create a `TaskDocumentClient` instance.
 *
 * It is important that the table exists prior to instantiating
 * an instance of it. No checks of its availability
 * will be run at runtime, and no methods to configure it
 * will be available through the `TaskDocumentClient` class.
 */
export interface TaskDocumentClientConfig {
  /**
   * client must be a `DynamoDBDocumentClient` instance.
   */
  client: DynamoDBDocumentClient;
  /**
   * tableName is the name of the table that will be used
   * to store the `Tasks`.
   */
  tableName: string;
}
/**
 * TaskDocumentClientItem is the `Task` item representation
 * inside DynamoDB.
 */
export interface TaskDocumentClientBody {
  /**
   * id is the unprefixed identifier of the `Task`.
   */
  id: string;
  /**
   * content is the attribute used to store the `Task` content.
   */
  content: string;
}
/**
 * TaskDocumentClientBody is a TaskDocumentClientItem without
 * some attributes only necessary internaly.
 */
export interface TaskDocumentClientItem extends TaskDocumentClientBody {
  /**
   * pk represents the `Task` unique identifier.
   */
  pk: string;
  /**
   * _b corresponds to the name of the branch that the item
   * belongs.
   */
  _b: string;
  /**
   * _n contains a reference to the "next" task of the
   * current `Tasks` linked list. If the `Task` is the last
   * of the list its value will be equal to "`.`".
   */
  _n: string;
  /**
   * meta holds the meta information of the TaskDocumentClientItem.
   */
  _m?: TaskDocumentClientMeta;
}
/**
 * TaskDocumentClientPatch represent the list of values that
 * can be patched through an `update`.
 */
export type TaskDocumentClientPatch = Pick<Partial<TaskDocumentClientBody>, "content">
/**
 * TaskDocumentClientMeta represent the meta status of a `Task`.
 */
export interface TaskDocumentClientMeta {
  isOpened?: boolean;
}
/**
 * ITaskDocumentClient is the public interface of the class
 * TaskDocumentClient.
 */
export type ITaskDocumentClient = BranchDocumentClient<TaskDocumentClientItem, TaskDocumentClientBody, TaskDocumentClientPatch>
/**
 * TaskClient is an abstraction built to hide the DynamoDB
 * access patterns used to handle `Tasks` as a Linked List.
 * Is must be provided with a `DynamoDBDocumentClient`
 * instance upon creation, and the name of the table where
 * the `Tasks` will be stored.
 */
export class TaskDocumentClient implements ITaskDocumentClient {
  /**
   * client is a `DynamoDBDocumentClient` instance used to
   * communicate with DynamoDB.
   */
  private client: DynamoDBDocumentClient
  /**
   * tableName is the name of DynamoDB`s table where the
   * `Tasks` will be stored.
   */
  private tableName: string
  /**
   * @param config - Configuration object
   */
  constructor(config: TaskDocumentClientConfig) {
    this.tableName = config.tableName
    this.client = config.client
  }
  /**
   * get gets a single `Task` from the table identified by its pk.
   * @param pk - `Task` unique identifier.
   */
  async get(pk: string): Promise<TaskDocumentClientItem | undefined> {
    const response: GetCommandOutput = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: { pk },
    }))
    return response.Item
      ? response.Item as TaskDocumentClientItem
      : undefined
  }
  /**
   * getPointingTo returns the `Task` item pointing to the
   * `Task` identified by its `sk` value.
   * @param pk - `Task` unique identifier.
   * @param branch - `Task` branch.
   */
  private async getPointingTo(pk: string, branch: string): Promise<TaskDocumentClientItem | undefined> {
    const response: QueryCommandOutput = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byNext",
      KeyConditionExpression: "#_b = :_b AND #_n = :_n",
      ExpressionAttributeNames: { "#_b": "_b", "#_n": "_n" },
      ExpressionAttributeValues: { ":_b": branch, ":_n": pk },
      Limit: 1,
    }))
    return response.Items && response.Items.length === 1
      ? response.Items[0] as TaskDocumentClientItem
      : undefined
  }
  /**
   * put inserts a new `Task` in the table. Every put is
   * done using a `ConditionExpression` that avoids replacing
   * an existing `Task` with a new one by checking if an
   * item already exist on the table with the same `pk`.
   * @param pk - `Task` unique identifier.
   * @param branch - `Task` branch.
   * @param item - `Task` item to be stored.
   * @param afterPk - `Task` to set the new `Task` after.
   */
  async put(pk: string, branch: string, item: TaskDocumentClientBody, afterPk?: string): Promise<boolean> {
    const after = afterPk === undefined
      ? await this.getTail(branch)
      : await this.get(afterPk)
    if (after === undefined) return this.putFirst(pk, branch, item)
    const updatePromise: Promise<UpdateCommandOutput> = this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: after.pk },
      UpdateExpression: "SET #_n = :new_n",
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_n": after._n, ":new_n": pk },
    }))
    const putPromise: Promise<PutCommandOutput> = this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: { id: item.id, content: item.content, pk, _b: branch, _n: after === undefined ? "." : after._n },
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
   * putFirst creates the `head` item along the first `Task`
   * of a new branch.
   * @param pk - `Task` unique identifier.
   * @param branch - `Task` branch.
   * @param item - `Task` item to be stored.
   */
  private async putFirst(pk: string, branch: string, item: TaskDocumentClientBody): Promise<boolean> {
    const putHeadPromise: Promise<PutCommandOutput> = this.client.send(new PutCommand({
      TableName: this.tableName,
      Item: { pk: "#" + branch, _b: branch, _n: pk },
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    const putItemPromise: Promise<PutCommandOutput> = this.client.send(new PutCommand({
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
  private async getTail(branch: string): Promise<TaskDocumentClientItem | undefined> {
    const queryOutput = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byNext",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": branch },
      Limit: 1,
    }))
    return queryOutput.Items && queryOutput.Items.length === 1
      ? queryOutput.Items[0] as TaskDocumentClientItem
      : undefined
  }
  /**
   * update update only some specific attributes of a `Task`.
   * @param pk - `Task` unique identifier.
   * @param patch - `Task` patch to be applied to the `item`.
   */
  async update(pk: string, patch: TaskDocumentClientPatch): Promise<boolean> {
    if (!patch.content) return true
    const response: UpdateCommandOutput = await this.client.send(new UpdateCommand({
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
  async meta(pk: string, meta: TaskDocumentClientMeta, force?: boolean): Promise<boolean> {
    // Check if the object is empty
    if (meta.isOpened === undefined) return true
    try {
      const response: UpdateCommandOutput = await this.client.send(new UpdateCommand(
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
  async delete(pk: string): Promise<undefined> {
    const task = await this.get(pk)
    if (task === undefined) return
    const pointingToTask = await this.getPointingTo(task.pk, task._b)
    if (!pointingToTask) return
    // 1. Update `pointingToTask` to point to the `Task` currently
    //    being pointed by the `Task` to be deleted.
    const updatePromise: Promise<UpdateCommandOutput> = this.client.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk: pointingToTask.pk },
      UpdateExpression: "SET #_n = :_new_n",
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_new_n": task._n, ":_n": pointingToTask._n },
    }))
    // 2. Delete the task.
    const deletePromise: Promise<DeleteCommandOutput> = this.client.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { pk: task.pk },
      ConditionExpression: "#_n = :_n",
      ExpressionAttributeNames: { "#_n": "_n" },
      ExpressionAttributeValues: { ":_n": task._n },
    }))
    // TODO: handle errors.
    await Promise.all([updatePromise, deletePromise])
  }
  /**
   * list returns the list of `Tasks` under a `pk`.
   * @param branch - `Tasks` branch.
   */
  async list(branch: string): Promise<TaskDocumentClientItem[]> {
    const queryOutput: QueryCommandOutput = await this.client.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byBranch",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": branch },
    }))
    if (!queryOutput.Items || queryOutput.Items.length === 0) return []
    const [head, ...items] = queryOutput.Items as TaskDocumentClientItem[]
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
  private follow(head: TaskDocumentClientItem, items: TaskDocumentClientItem[]): TaskDocumentClientItem[] {
    const map = new Map<string, TaskDocumentClientItem>()
    const result: TaskDocumentClientItem[] = []
    const remaining: TaskDocumentClientItem[] = []
    // First pass, we create the `sk` to `item` map, plus start
    // populating the `result` list.
    items.forEach((item: TaskDocumentClientItem, index: number) => {
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
      head = map.get(head._n) as TaskDocumentClientItem
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
      this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: from.pk },
        ConditionExpression: "#_n <> :pk",
        UpdateExpression: "SET #_n = :_n",
        ExpressionAttributeNames: { "#_n": "_n" },
        ExpressionAttributeValues: { ":_n": after._n, ":pk": from.pk },
      })),
      this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: { pk: after.pk },
        ConditionExpression: "#_n <> :pk",
        UpdateExpression: "SET #_n = :_n",
        ExpressionAttributeNames: { "#_n": "_n" },
        ExpressionAttributeValues: { ":_n": from.pk, ":pk": after.pk },
      })),
      this.client.send(new UpdateCommand({
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
 * taskDocumentClient is a singleton `TaskDocumentClient`
 * connected to a DynamoDB table using the default app
 * `dynamo document client`.
 */
export const taskDocumentClient = new TaskDocumentClient({
  tableName: process.env.TABLE_NAME || "retask",
  client,
})