import test from "tape"
import { ulid } from "ulid"
import { DeleteCommand, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb"
import type { Test } from "tape"
import type { DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"

import { db } from "./dynamo.server"
import { driver } from "./usersDynamoDriver.server"
import type { UsersDynamoDriverItem } from "./usersDynamoDriver.server"

const email = ulid() + "@example.test"
const provider = "github"

test("driver.put()", async (assert: Test) => {
  const body = {
    id: ulid(),
    username: "username#" + ulid(),
    provider,
    email,
  }
  const pk = `${body.id}#${provider}`
  // Should not fail when the inputs are correct.
  assert.equal(await driver.put(pk, body), true)
  // Should return a correctly formated item
  assert.deepEqual(await get(pk), {
    pk,
    _b: "Profile",
    _n: body.username,
    _m: { email: body.email }
  })
})
/**
 * Functions
 */
/**
 * del deletes an item from the database.
 * @param pk - Item primary key.
 */
async function del(pk: string): Promise<Boolean> {
  const deleteOutput: DeleteCommandOutput = await db.send(new DeleteCommand({
    TableName: "retask",
    Key: { pk }
  }))
  return deleteOutput.$metadata.httpStatusCode === 200
}
/**
 * get gets an item from the database.
 * @param pk - Item primary key.
 */
async function get(pk: string): Promise<UsersDynamoDriverItem | undefined> {
  const getOutput: GetCommandOutput = await db.send(new GetCommand({
    TableName: "retask",
    Key: { pk }
  }))
  if (!getOutput.Item) return undefined
  return getOutput.Item as UsersDynamoDriverItem
}