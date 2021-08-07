import test from "tape"
import range from "lodash/range"
import random from "lodash/random"
import { ulid } from "ulid"
import { DeleteCommand, GetCommand, GetCommandOutput } from "@aws-sdk/lib-dynamodb"
import type { Test } from "tape"
import type { DeleteCommandOutput } from "@aws-sdk/lib-dynamodb"

import { db } from "./dynamo.server"
import { driver } from "./usersDynamoDriver.server"
import type { UserBody } from "../models/user"
import type { UserItem } from "./usersDynamoDriver.server"

const email = ulid() + "@example.test"
const provider = "github"

test("driver.put()", async (assert: Test) => {
  const [body, pk] = createBodyAndPK()
  // Should not fail when the inputs are correct.
  assert.equal(await driver.put(pk, body), true)
  // Should return a correctly formated item
  assert.deepEqual(await get(pk), {
    pk,
    _b: "Profile",
    _n: body.username,
    _m: { email: body.email }
  })
  // Clean up
  await del(pk)
  // End tests
  assert.end()
})

test("driver.list()", async (assert: Test) => {
  const pks: string[] = []
  const length = random(5, 10, false)
  // Insert a random number of items between 5 and 10.
  for (let _ of range(0, length)) {
    const [body, pk] = createBodyAndPK()
    assert.equal(await driver.put(pk, body), true)
    pks.push(pk)
  }
  const items = await driver.list()
  assert.equal(items.length, length)
  // Delete all the users
  for (let pk of pks) {
    await del(pk)
  }
  // End tests
  assert.end()
})

test("driver.get()", async (assert: Test) => {
  const [body, pk] = createBodyAndPK()
  // Put one item
  assert.equal(await driver.put(pk, body), true)
  // Check that the item has been correctly stored
  assert.deepEqual(await driver.get(pk), {
    pk,
    _b: "Profile",
    _n: body.username,
    _m: { email: body.email }
  })
  // Delete user
  await del(pk)
  // End tests
  assert.end()
})


test("driver.update()", async (assert: Test) => {
  const [body, pk] = createBodyAndPK()
  // Put one item
  assert.equal(await driver.put(pk, body), true)
  // Check that the item has been correctly stored
  assert.deepEqual(await driver.get(pk), {
    pk,
    _b: "Profile",
    _n: body.username,
    _m: { email: body.email }
  })
  // Update user data
  const avatarURL = ulid()
  const location = ulid()
  const name = ulid()
  assert.equal(await driver.update(pk, { email: body.email, avatarURL, location, name }), true)
  // Check that the user has been correctly updated
  assert.deepEqual(await driver.get(pk), {
    pk,
    _b: "Profile",
    _n: body.username,
    _m: { email: body.email, avatarURL, location, name }
  })
  // Delete user
  await del(pk)
  // End tests
  assert.end()
})

test("driver.delete()", async (assert: Test) => {
  const [body, pk] = createBodyAndPK()
  // Put one item
  assert.equal(await driver.put(pk, body), true)
  // Check that the item has been correctly stored
  assert.deepEqual(await driver.get(pk), {
    pk,
    _b: "Profile",
    _n: body.username,
    _m: { email: body.email }
  })
  // Delete the user
  assert.equal(await driver.delete(pk), true)
  // Check that the user has been deleted
  assert.equal(await driver.get(pk), undefined)
  // Delete user
  await del(pk)
  // End tests
  assert.end()
})
/**
 * Functions
 */
function createBodyAndPK(username: string = "username"): [UserBody, string] {
  const body = {
    id: ulid(),
    username: `${username}.${ulid()}`,
    provider,
    email,
  }
  const pk = `${body.id}#${provider}`
  return [body, pk]
}
/**
 * del deletes an item from the database.
 * @param pk - Item primary key.
 */
async function del(pk: string): Promise<Boolean> {
  const deleteOutput: DeleteCommandOutput = await db.send(new DeleteCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk }
  }))
  return deleteOutput.$metadata.httpStatusCode === 200
}
/**
 * get gets an item from the database.
 * @param pk - Item primary key.
 */
async function get(pk: string): Promise<UserItem | undefined> {
  const getOutput: GetCommandOutput = await db.send(new GetCommand({
    TableName: process.env.TABLE_NAME,
    Key: { pk }
  }))
  if (!getOutput.Item) return undefined
  return getOutput.Item as UserItem
}