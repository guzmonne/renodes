import test from "tape"
import { ulid } from "ulid"
import type { Test } from "tape"

import { User } from "../models/user"
import { client } from "./usersClient.server"
import type { UserItem } from "../drivers/usersDynamoDriver.server"

const _b = "Profile"

test("usersClient.createPK()", (assert: Test) => {
  // Should throw if `id` is undefined.
  assert.throws(() => client.createPK(), "id can't be undefined")
  // Should use "github" as the default provider
  const id = ulid()
  assert.equal(client.createPK(id), `${id}.github`)
  // Should override the value of the provider when defined.
  const provider = ulid()
  assert.equal(client.createPK(id, provider), `${id}.${provider}`)
  // End testing
  assert.end()
})

test("userClient.toModel()", (assert: Test) => {
  const { item, pk, id, provider, email, username, avatarURL, name, location } = createItem()
  // Should throw an error if the `pk` value is incorrect.
  item.pk = "this is wrong"
  assert.throws(() => client.toModel(item), "unable to create a model from the item")
  // Should create a valid model
  item.pk = pk
  assert.deepEqual(client.toModel(item).toObject(), new User({ id, provider, email, username, avatarURL, name, location }).toObject())
  // End testing
  assert.end()
})

test("userClient.toBody()", (assert: Test) => {
  // Should create a valid body
  const body = createBody()
  const user = new User(body)
  assert.deepEqual(client.toBody(user), body)
  // End testing
  assert.end()
})

test("userClient.toPatch()", (assert: Test) => {
  // Should create a valid patch
  const body = createBody()
  const user = new User(body)
  const { avatarURL, name, location } = body
  assert.deepEqual(client.toPatch(user), { avatarURL, name, location })
  // End testing
  assert.end()
})

/**
 * Function
 */
/**
 * createItem returns a random UserItem plus its individual attributes.
 */
function createItem() {
  const id = ulid()
  const provider = ulid()
  const email = ulid()
  const username = ulid()
  const avatarURL = ulid()
  const name = ulid()
  const location = ulid()
  const pk = `${id}.${provider}`
  return {
    item: { pk, _b, _n: username, _m: { email, avatarURL, name, location } } as UserItem,
    pk,
    id,
    provider,
    email,
    username,
    avatarURL,
    location,
    name,
  }
}
/**
 * createBody returns a complete UserBody object.
 */
function createBody() {
  const { id, provider, email, username, avatarURL, name, location } = createItem()
  return { id, provider, email, username, avatarURL, name, location }
}