import test from "tape"
import get from "lodash/get"
import { ListTablesCommand } from "@aws-sdk/client-dynamodb";
import { PutCommand, UpdateCommand, GetCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb"
import type { DeleteCommandOutput, PutCommandOutput, UpdateCommandOutput, GetCommandOutput, QueryCommandOutput } from "@aws-sdk/lib-dynamodb"
import type { Test } from "tape"

import { client } from "./dynamo"

interface DynamoDBItem {
  pk: string;
  sk: string;
}

interface TaskData {
  id: string;
  _next: string;
}

interface DynamoDBTaskItem extends DynamoDBItem, TaskData {}

const TableName = process.env.TABLE_NAME || "retask"

test("TableName exists", async (assert: Test) => {
  assert.plan(1);
  const {TableNames = []} = await client.send(new ListTablesCommand({}));
  assert.ok(TableNames.includes(TableName))
})

// Global Variables
let tail          : DynamoDBTaskItem
let head          : DynamoDBTaskItem
let list          : DynamoDBTaskItem[]
let fromSK        : string
let toSK          : string
let sk            : string
let task          : DynamoDBTaskItem
let from          : DynamoDBTaskItem
let pointingToFrom: DynamoDBTaskItem
let pointingToTo  : DynamoDBTaskItem
let pointingToTask: DynamoDBTaskItem
let putOutput     : PutCommandOutput
let updateOutput  : UpdateCommandOutput
let getOutput     : GetCommandOutput
let queryOutput   : QueryCommandOutput
let deleteOutput  : DeleteCommandOutput
/**
 * The table should operate with as overhead as possible.
 * Meaning, that it shouldn't know about the rules
 * around each entitiy that will be stored.
 *
 * To add a new `Task` to the table we need to provide:
 *  1. The `Task` data.
 *  2. The `parent` of the `Task`.
 *
 * A `Task` without a `parent` will be considered a `Root
 * Task`.
 *
 * `Tasks` should mantain order, and they can be reordered
 * at any time. We use a `Linked List` pattern to maintain
 * the order of the `Tasks`. Each `Task` will have a value
 * called `_next` pointing to the next `Task` of the list.
 * The last element of the list will contains only a the
 * value of it's `pk` attribute suffixed by the string
 * `#TAIL`. Also, a special record will be stored with the
 * with its `sk` value equal to be the `pk` of the other
 * `Tasks` suffixed with `#TAIL`.
 *
 * A GSI will be created on the table that will use the same
 * partition key of the table, but will be sorted by the
 * value of the `_next` attribute. This way, we can quickly
 * query for the `Task` that it's pointing to any other task.
 */
 test("Common flow using raw DynamoDB Commands", async (assert: Test) => {
  // VARIABLES
  const id1 = "001"
  const id2 = "002"
  const id3 = "003"
  const id4 = "004"
  const pk  = key()
  const sk0 = key({id: "HEAD"})
  const sk1 = key({id: id1})
  const sk2 = key({id: id2})
  const sk3 = key({id: id3})
  const sk4 = key({id: id4})
  /**
   * To create the first `Root Task` we'll use a `PutCommand`
   * with a `ConditionExpression`. The `ConditionExpression`
   * will avoid overwriting an existing `Task` with the same
   * `id`.
   *
   * Since the `Task` will be added at the end, we need to get
   * the `sk` of the `Task` that is currently the `TAIL` of
   * the linked list. To do this, we query over the `byNext`
   * GSI.
   */
  // 1. Get the last element of the Linked list.
  queryOutput = await getTail(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 0)
  // 2. Since the query returned no results, we know that the
  //    current `Tasks` linked list is empty. So, we need to
  //    put both the new `Task` plus an extra item that will
  //    point to it with its `sk` value set as `pk + "#HEAD".
  //    This extra item holds a reference to the beggining of
  //    the linked list.
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk: pk + "#HEAD", _next: sk1},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk: sk1, id: id1, _next: pk + "#TAIL"},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  // 3. We could use a `TransactWriteCommand` to make sure to
  //    avoid problems generated by concurrent requests. But,
  //    for now, applying a `ConditionExpression` should be
  //    enough as it will avoid overriding any previous object.
  /**
   * To create the second Root `Task` we need once again to
   * get a hold of the tail of the linked list. We run the
   * same query as before.
   */
  // 1. Get the last element of the Linked list.
  queryOutput = await getTail(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 1)
  tail = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(tail.sk, sk1)
  // 2. We need to put the new `Task` and update the tail to
  //    to point to it. The new `Task` will become the new tail
  //    of the linked list.
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: tail.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": sk2},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk: sk2, id: id2, _next: pk + "#TAIL"},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  // Verify thet the updates were correctly done
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk1}}))
  assert.equal(getOutput?.Item?._next, sk2)
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk2}}))
  assert.equal(getOutput?.Item?._next, pk + "#TAIL")
  /**
   * The same procedure should be used to create aditional tasks.
   */
  queryOutput = await getTail(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 1)
  tail = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(tail.sk, sk2)
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: tail.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": sk3},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk: sk3, id: id3, _next: pk + "#TAIL"},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  // Verify thet the updates were correctly done
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk2}}))
  assert.equal(getOutput?.Item?._next, sk3)
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk3}}))
  assert.equal(getOutput?.Item?._next, pk + "#TAIL")
  /**
   * Querying the table for all the items under some `pk` value
   * will return all the `Tasks` plus the head item. Since
   * the head item's `sk` is equal to the `pk` plus the string
   * `#HEAD` it will always be returned as the first value of
   * the list.
   *
   * We can then use the `HEAD` object to start sorting the
   * list according to its `_next` attribute.
   */
  queryOutput = await getList(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 4)
  head = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(head.sk, pk + "#HEAD")
  list = follow(head, queryOutput.Items?.splice(1, queryOutput.Items.length - 1) as DynamoDBTaskItem[])
  assert.deepEqual(list.map((item: any) => item.sk), [sk1, sk2, sk3])
  /**
   * To reorder the linked list you need to provide:
   *  1.  The `id` of the `Task` you want to move.
   *  2.  The `id` of the `Task` whose place you want to replace.
   *
   * We then have to get the `Tasks` that are pointing to each
   * of those `Tasks` and replace their `_next` attribute. To get
   * the `Task` that is pointing to another we use a `QueryCommand`
   * over the `byNext` GSI.
   */
  fromSK         = sk3
  toSK           = sk1
  from           = await getTask(pk, fromSK) as DynamoDBTaskItem
  pointingToFrom = await getPointingTo(pk, fromSK) as DynamoDBTaskItem
  pointingToTo   = await getPointingTo(pk, toSK) as DynamoDBTaskItem
  assert.equal(from.sk, sk3)
  assert.equal(pointingToFrom.sk, sk2)
  assert.equal(pointingToTo.sk, sk0)
  // 1. Update the item pointing to `toSK` to point to `fromSK`.
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: pointingToTo.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": from.sk},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  // 2. Update the item pointing to `fromSK` to point to what `fromSK`
  //    is currently pointing to.
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: pointingToFrom.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": from._next},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  // 3. Update the `from` item to point to the `to` item.
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: from.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": toSK},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  /**
   * We can now run the same query as before and see if the
   * order of the `Tasks` has changed.
   */
  queryOutput = await getList(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 4)
  head = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(head.sk, pk + "#HEAD")
  list = follow(head, queryOutput.Items?.splice(1, queryOutput.Items.length - 1) as DynamoDBTaskItem[])
  assert.deepEqual(list.map((item: any) => item.sk), [sk3, sk1, sk2])
  /**
   * Adding a new `Task` after reordering them should require
   * the same exact procedure as before. We append the new
   * `Task` to the last
   */
  queryOutput = await getTail(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  tail = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(tail.sk, sk2)
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: tail.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": sk4},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk: sk4, id: id4, _next: pk + "#TAIL"},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  // Verify thet the updates were correctly done
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk2}}))
  assert.equal(getOutput?.Item?._next, sk4)
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk4}}))
  assert.equal(getOutput?.Item?._next, pk + "#TAIL")
  /**
   * Once again, we query to see if we get the correct results.
   */
  queryOutput = await getList(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 5)
  head = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(head.sk, pk + "#HEAD")
  list = follow(head, queryOutput.Items?.splice(1, queryOutput.Items.length - 1) as DynamoDBTaskItem[])
  assert.deepEqual(list.map((item: any) => item.sk), [sk3, sk1, sk2, sk4])
  /**
   * Deleting a `Task` involves patching the `Task` currently
   * pointing to it. We must update its `_next` attribute to
   * be the same as the `Task` being deleted.
   */
  sk             = sk1
  task           = await getTask(pk, sk) as DynamoDBTaskItem
  pointingToTask = await getPointingTo(pk, sk) as DynamoDBTaskItem
  assert.equal(task.sk, sk)
  assert.equal(pointingToTask._next, sk)
  // 1. Update the `Task` pointing to the one being deleted.
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: pointingToTask.sk},
    UpdateExpression: "SET #_next = :_new_next",
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_new_next": task._next, ":_next": pointingToTask._next},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  // 2. Delete the task.
  deleteOutput = await client.send(new DeleteCommand({
    TableName,
    Key: {pk, sk: task.sk},
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": task._next},
  }))
  assert.equal(deleteOutput.$metadata.httpStatusCode, 200)
  /**
   * What happens if we keep deleting every item until there
   * is none left?
   */
  // 1. Delete SK2
  sk             = sk2
  task           = await getTask(pk, sk) as DynamoDBTaskItem
  pointingToTask = await getPointingTo(pk, sk) as DynamoDBTaskItem
  assert.equal(task.sk, sk)
  assert.equal(pointingToTask._next, sk)
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: pointingToTask.sk},
    UpdateExpression: "SET #_next = :_new_next",
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_new_next": task._next, ":_next": pointingToTask._next},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  deleteOutput = await client.send(new DeleteCommand({
    TableName,
    Key: {pk, sk: task.sk},
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": task._next},
  }))
  assert.equal(deleteOutput.$metadata.httpStatusCode, 200)
  // 2. Delete SK3
  sk             = sk3
  task           = await getTask(pk, sk) as DynamoDBTaskItem
  pointingToTask = await getPointingTo(pk, sk) as DynamoDBTaskItem
  assert.equal(task.sk, sk)
  assert.equal(pointingToTask._next, sk)
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: pointingToTask.sk},
    UpdateExpression: "SET #_next = :_new_next",
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_new_next": task._next, ":_next": pointingToTask._next},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  deleteOutput = await client.send(new DeleteCommand({
    TableName,
    Key: {pk, sk: task.sk},
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": task._next},
  }))
  assert.equal(deleteOutput.$metadata.httpStatusCode, 200)
  // 3. Delete SK4
  sk             = sk4
  task           = await getTask(pk, sk) as DynamoDBTaskItem
  pointingToTask = await getPointingTo(pk, sk) as DynamoDBTaskItem
  assert.equal(task.sk, sk)
  assert.equal(pointingToTask._next, sk)
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: pointingToTask.sk},
    UpdateExpression: "SET #_next = :_new_next",
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_new_next": task._next, ":_next": pointingToTask._next},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  deleteOutput = await client.send(new DeleteCommand({
    TableName,
    Key: {pk, sk: task.sk},
    ConditionExpression: "#_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": task._next},
  }))
  assert.equal(deleteOutput.$metadata.httpStatusCode, 200)
  /**
   * A query now should return an empty list.
   */
  queryOutput = await getList(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 1)
  head = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(head.sk, pk + "#HEAD")
  list = follow(head, queryOutput.Items?.splice(1, queryOutput.Items.length - 1) as DynamoDBTaskItem[])
  assert.deepEqual(list.map((item: any) => item.sk), [])
  /**
   * If we know add a new `Task` everythin should work fine.
   */
  sk = sk1
  queryOutput = await getTail(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 1)
  tail = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: tail.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": sk},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk, id: id3, _next: pk + "#TAIL"},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  // Verify thet the updates were correctly done
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk0}}))
  assert.equal(getOutput?.Item?._next, sk)
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk}}))
  assert.equal(getOutput?.Item?._next, pk + "#TAIL")
  // Add another item
  sk = sk2
  queryOutput = await getTail(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 1)
  tail = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  updateOutput = await client.send(new UpdateCommand({
    TableName,
    Key: {pk, sk: tail.sk},
    UpdateExpression: "SET #_next = :_next",
    ExpressionAttributeNames: {"#_next": "_next"},
    ExpressionAttributeValues: {":_next": sk},
  }))
  assert.equal(updateOutput.$metadata.httpStatusCode, 200)
  putOutput = await client.send(new PutCommand({
    TableName,
    Item: {pk, sk, id: id3, _next: pk + "#TAIL"},
    ConditionExpression: "attribute_not_exists(#sk)",
    ExpressionAttributeNames: {"#sk": "sk"},
  }))
  assert.equal(putOutput.$metadata.httpStatusCode, 200)
  // Verify thet the updates were correctly done
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk: sk0}}))
  assert.equal(getOutput?.Item?._next, sk1)
  getOutput = await client.send(new GetCommand({TableName, Key: {pk, sk}}))
  assert.equal(getOutput?.Item?._next, pk + "#TAIL")
  // Query the result
  queryOutput = await getList(pk)
  assert.equal(queryOutput.$metadata.httpStatusCode, 200)
  assert.equal(queryOutput.Count, 3)
  head = get(queryOutput, "Items[0]") as DynamoDBTaskItem
  assert.equal(head.sk, pk + "#HEAD")
  list = follow(head, queryOutput.Items?.splice(1, queryOutput.Items.length - 1) as DynamoDBTaskItem[])
  assert.deepEqual(list.map((item: any) => item.sk), [sk1, sk2])
  // End
  assert.end()
})
type KeyConfig = {id?: string, userId?: string, type?: string}
/**
 * key is a helper function to construct keys to be used as
 * `pk` or `sk` inside the table.
 * @param config - Key configuration object.
 */
function key({id = "", userId = "U1", type = "Tasks"}: KeyConfig = {}) {
  return [userId, type, id].filter(x => x !== "").join("#")
}
/**
 * follow is a function that takes a `HEAD` item and a list
 * of `Task` items and returns another list ordered according
 * to its `_next` attribute, starting from the item indicated
 * by the `HEAD` item.
 * @param head - `HEAD` item from which to get the first item of the list.
 * @param items - List of `Task` items to be ordered.
 */
function follow(head: DynamoDBTaskItem, items: DynamoDBTaskItem[]): DynamoDBTaskItem[] {
  const map = new Map<string, DynamoDBTaskItem>()
  const result: DynamoDBTaskItem[] = []
  const remaining: DynamoDBTaskItem[] = []
  // First pass, we create the `sk` to `item` map, plus start
  // populating the `result` list.
  items.forEach((item: DynamoDBTaskItem, index: number) => {
    map.set(item.sk, item)
    if (item.sk === head._next) {
      result.push(item)
      head = item
    } else {
      remaining.push(item)
    }
  })
  // Second pass, we iterate over the remaining items until
  // we complete the list.
  remaining.forEach(() => {
    head = map.get(head._next) as DynamoDBTaskItem
    result.push(head)
  })
  return result
}
/**
 * getTail returns the results of running a query over the `byNext`
 * index looking for the tail of the linked list of the tasks
 * identified by its `pk`.
 * @param pk - Parent identifier of the `Tasks` linked list.
 */
async function getTail(pk: string) {
  return await client.send(new QueryCommand({
    TableName,
    IndexName: "byNext",
    KeyConditionExpression: "#pk = :pk AND #_next = :_next",
    ExpressionAttributeNames: {"#pk": "pk", "#_next": "_next"},
    ExpressionAttributeValues: {":pk": pk, ":_next": pk + "#TAIL"},
    Limit: 1,
  }))
}
/**
 * getList returns all the `Tasks` under its parent identified by
 * the `pk` parameter.
 * @param pk - Parent identifier of the `Tasks` linked list.
 */
async function getList(pk: string) {
  return await client.send(new QueryCommand({
    TableName,
    KeyConditionExpression: "#pk = :pk",
    ExpressionAttributeNames: {"#pk": "pk"},
    ExpressionAttributeValues: {":pk": pk},
    ScanIndexForward: false,
  }))
}
/**
 * getPointingTo returns the `Task` item pointing to the
 * `Task` identified by its `sk` value.
 * @param pk - Parent identifier of the `Tasks` linked list.
 * @param sk - Unique identifier of the `Task` being pointed.
 */
 async function getPointingTo(pk: string, sk: string): Promise<DynamoDBTaskItem | undefined> {
  const response = await client.send(new QueryCommand({
    TableName,
    IndexName: "byNext",
    KeyConditionExpression: "#pk = :pk AND #_next = :_next",
    ExpressionAttributeNames: {"#pk": "pk", "#_next": "_next"},
    ExpressionAttributeValues: {":pk": pk, ":_next": sk},
    Limit: 1,
  }))
  const item = get(response, "Items[0]")
  return item ? item : undefined
}
/**
 * getTask returns the `Task` identified by the provided
 * values of `pk` and `sk`.
 * @param pk - Parent `Task` identifier.
 * @param sk - `Task` unique identifier.
 */
async function getTask(pk: string, sk: string) {
  const response = await client.send(new GetCommand({
    TableName,
    Key: {pk, sk},
  }))
  return get(response, "Item")
}