import test from "tape"
import { ulid } from "ulid"
import type { Test } from "tape"

import { client } from "./nodesClient.server"
import { ModelNotFoundError } from "../server/errors.server"
import type { NodeItem } from "../models/node"
import type { NodeDynamoItem } from "../drivers/nodesDynamoDriver.server"

test("nodesClient.createPK()", async (assert: Test) => {
  const id = ulid()
  const userId = ulid()
  assert.equal(client.createPK(), "Nodes")
  assert.equal(client.createPK(id), `Nodes#${id}`)
  assert.equal(client.createPK(id, userId), `${userId}#Nodes#${id}`)
  assert.end()
})


test("nodesClient.toModel()", async (assert: Test) => {
  let id = ulid()
  let parent = ulid()
  let userId = ulid()
  let content = ulid()
  let item: NodeDynamoItem = {
    id,
    content,
    pk: `${userId}#Nodes#${id}`,
    _b: `${userId}#Nodes#${parent}`,
    _n: ".",
    _m: {
      isOpened: true
    },
  }
  let actual = client.toModel(item)
  assert.equal(actual.id, id)
  assert.equal(actual.content, content)
  assert.equal(actual.parent, parent)
  assert.equal(actual.userId, userId)
  assert.equal(actual.interpreter, undefined)
  // Same test but configuring an interpreter
  id = ulid()
  parent = ulid()
  userId = ulid()
  content = ulid()
  let interpreter = ulid()
  item = {
    id,
    content,
    pk: `${userId}#Nodes#${id}`,
    _b: `${userId}#Nodes#${parent}`,
    _n: ".",
    _t: interpreter,
    _m: {
      isOpened: true
    },
  }
  actual = client.toModel(item)
  assert.equal(actual.id, id)
  assert.equal(actual.content, content)
  assert.equal(actual.parent, parent)
  assert.equal(actual.userId, userId)
  assert.equal(actual.interpreter, interpreter)
  assert.end()
})

test("nodesClient.get()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const node: NodeItem = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  // Normal GET excecution
  assert.deepEqual(await client.put(node), { data: node })
  assert.deepEqual(await client.get("invalid_id"), { error: new ModelNotFoundError() })
  assert.deepEqual(await client.get(node.id, userId), { data: { ...node } })
  // Recursive GET excecution
  const subNode1 = { id: ulid(), content: ulid(), parent: node.id, userId, interpreter: undefined, meta: undefined }
  const subNode2 = { id: ulid(), content: ulid(), parent: node.id, userId, interpreter: undefined, meta: undefined }
  const subNode3 = { id: ulid(), content: ulid(), parent: node.id, userId, interpreter: undefined, meta: undefined }
  node.collection = [subNode1, subNode2, subNode3]
  assert.deepEqual(await client.put(subNode1), { data: subNode1 })
  assert.deepEqual(await client.put(subNode2), { data: subNode2 })
  assert.deepEqual(await client.put(subNode3), { data: subNode3 })
  assert.deepEqual(await client.get(node.id, userId, true), { data: node })
  // End tests
  assert.end()
})

test("nodesClient.put()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const node1 = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  const node2 = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  const node3 = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  assert.deepEqual(await client.put(node1), { data: node1 })
  assert.deepEqual(await client.put(node2), { data: node2 })
  assert.deepEqual(await client.query({ parent, userId }), { data: [node1, node2] })
  assert.deepEqual(await client.put(node3, node1.id), { data: node3 })
  assert.deepEqual(await client.query({ parent, userId }), { data: [node1, node3, node2] })
  assert.end()
})

test("nodesClient.update()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const content = "example"
  const newContent = "change"
  const node = { id: ulid(), content, parent, userId, interpreter: undefined, meta: undefined }
  assert.deepEqual(await client.put(node), { data: node })
  assert.deepEqual(await client.get(node.id, node.userId), { data: node })
  assert.deepEqual(await client.update(node.id, { content: newContent }, node.userId), {})
  assert.deepEqual(await client.get(node.id, node.userId), { data: { ...node, content: newContent } })
  assert.end()
})

test("nodesClient.delete()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const id = ulid()
  const node = { id, content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  assert.deepEqual(await client.put(node), { data: node })
  assert.deepEqual(await client.get(node.id, node.userId), { data: node })
  assert.deepEqual(await client.delete(node.id, node.userId), {})
  assert.deepEqual(await client.get(node.id, node.userId), { error: new ModelNotFoundError() })
  assert.end()
})

test("nodesClient.after()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const node1 = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  const node2 = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  const node3 = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  assert.deepEqual(await client.put(node1), { data: node1 })
  assert.deepEqual(await client.put(node2), { data: node2 })
  assert.deepEqual(await client.put(node3), { data: node3 })
  assert.deepEqual(await client.query({ parent, userId }), { data: [node1, node2, node3] })
  assert.deepEqual(await client.after(node3.id, parent, node1.id, userId), {})
  assert.deepEqual(await client.query({ parent, userId }), { data: [node1, node3, node2] })
  assert.deepEqual(await client.after(node2.id, parent, undefined, userId), {})
  assert.deepEqual(await client.query({ parent, userId }), { data: [node2, node1, node3] })
  assert.end()
})

test("nodesClient.meta()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const isOpened = true
  const node = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  assert.deepEqual(await client.put(node), { data: node })
  const resp1 = await client.get(node.id, node.userId)
  // A node should not have a meta object by default
  assert.deepEqual(resp1.data && resp1.data.meta, undefined)
  // Setting a new meta object
  assert.deepEqual(await client.meta(node.id, node.userId, { isOpened }), { data: { isOpened } })
  // Checking if it the meta object is now present
  const resp2 = await client.get(node.id, node.userId)
  assert.deepEqual(resp2.data && resp2.data.meta, { isOpened })
  // Calling the meta function without a meta object will return the current meta object.
  assert.deepEqual(await client.meta(node.id, node.userId), { data: { isOpened } })
  assert.end()
})

test("nodesClient.query()", async (assert: Test) => {
  const parent = ulid()
  const userId = ulid()
  const node1: NodeItem = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  const node2: NodeItem = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  const node3: NodeItem = { id: ulid(), content: ulid(), parent, userId, interpreter: undefined, meta: undefined }
  // Insert three new nodes
  assert.deepEqual(await client.put(node1), { data: node1 })
  assert.deepEqual(await client.put(node2), { data: node2 })
  assert.deepEqual(await client.put(node3), { data: node3 })
  // Happy path
  assert.deepEqual(await client.query({ parent, userId }), { data: [node1, node2, node3] })
  // Invalid parent path
  assert.deepEqual(await client.query({ parent: "invalid", userId }), { data: [] })
  // Recursive query (following meta.isOpened)
  // Add three new nodes under node1
  const node11: NodeItem = { id: ulid(), content: ulid(), parent: node1.id, userId, interpreter: undefined, meta: undefined }
  const node12: NodeItem = { id: ulid(), content: ulid(), parent: node1.id, userId, interpreter: undefined, meta: undefined }
  const node13: NodeItem = { id: ulid(), content: ulid(), parent: node1.id, userId, interpreter: undefined, meta: undefined }
  const updatedNode1: NodeItem = { ...node1, meta: { ...node1.meta, isOpened: true } }
  assert.deepEqual(await client.put(node11), { data: node11 })
  assert.deepEqual(await client.put(node12), { data: node12 })
  assert.deepEqual(await client.put(node13), { data: node13 })
  // Add three new nodes under node3
  const node31: NodeItem = { id: ulid(), content: ulid(), parent: node3.id, userId, interpreter: undefined, meta: undefined }
  const node32: NodeItem = { id: ulid(), content: ulid(), parent: node3.id, userId, interpreter: undefined, meta: undefined }
  const node33: NodeItem = { id: ulid(), content: ulid(), parent: node3.id, userId, interpreter: undefined, meta: undefined }
  const updatedNode3: NodeItem = { ...node3, meta: { ...node3.meta, isOpened: true } }
  assert.deepEqual(await client.put(node31), { data: node31 })
  assert.deepEqual(await client.put(node32), { data: node32 })
  assert.deepEqual(await client.put(node33), { data: node33 })
  // Add three new nodes under node32
  const node321: NodeItem = { id: ulid(), content: ulid(), parent: node32.id, userId, interpreter: undefined, meta: undefined }
  const node322: NodeItem = { id: ulid(), content: ulid(), parent: node32.id, userId, interpreter: undefined, meta: undefined }
  const node323: NodeItem = { id: ulid(), content: ulid(), parent: node32.id, userId, interpreter: undefined, meta: undefined }
  const updatedNode32: NodeItem = { ...node32, meta: { ...node32.meta, isOpened: true } }
  assert.deepEqual(await client.put(node321), { data: node321 })
  assert.deepEqual(await client.put(node322), { data: node322 })
  assert.deepEqual(await client.put(node323), { data: node323 })
  // Update the collections of the updated nodes
  updatedNode1.collection = [node11, node12, node13]
  updatedNode3.collection = [node31, updatedNode32, node33]
  updatedNode32.collection = [node321, node322, node323]
  // Update the meta isOpened values
  assert.deepEqual(await client.meta(node1.id, node1.userId, { isOpened: true }), { data: updatedNode1.meta })
  assert.deepEqual(await client.meta(node3.id, node3.userId, { isOpened: true }), { data: updatedNode3.meta })
  assert.deepEqual(await client.meta(node32.id, node32.userId, { isOpened: true }), { data: updatedNode32.meta })
  // Query recursively
  assert.deepEqual(await client.query({ parent, userId, recursive: true }), { data: [updatedNode1, node2, updatedNode3] })
})










