import test from "tape"
import { ulid } from "ulid"
import type { Test } from "tape"

import { Task } from "../models/task"
import { tasksDynamoDBClient as tdc } from "./dynamodb"
import type { TaskDocumentClientItem } from "./taskDocumentClient"

test("taskDocumentDBClient.createPK()", async (assert: Test) => {
  const id = ulid()
  const userId = ulid()
  assert.equal(tdc.createPK(), "Tasks")
  assert.equal(tdc.createPK(id), `Tasks#${id}`)
  assert.equal(tdc.createPK(id, userId), `${userId}#Tasks#${id}`)
  assert.end()
})


test("taskDynamoDBClient.toTask()", async (assert: Test) => {
  const id = ulid()
  const branch = ulid()
  const userId = ulid()
  const content = ulid()
  const item: TaskDocumentClientItem = {
    id,
    content,
    pk: `${userId}#Tasks#${id}`,
    _b: `${userId}#Tasks#${branch}`,
    _n: ".",
    _m: {
      isOpened: true
    },
  }
  const actual = tdc.toTask(item)
  assert.equal(actual.id, id)
  assert.equal(actual.content, content)
  assert.equal(actual.branch, branch)
  assert.equal(actual.userId, userId)
  assert.end()
})

test("taskDocumentDBClient.get()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await tdc.put(task), { data: task })
  assert.deepEqual(await tdc.get("invalid_id"), { error: "task with id = invalid_id not found" })
  assert.deepEqual(await tdc.get(task.id, userId), { data: task })
  assert.end()
})

test("taskDocumentDBClient.put()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task1 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task2 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task3 = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await tdc.put(task1), { data: task1 })
  assert.deepEqual(await tdc.put(task2), { data: task2 })
  assert.deepEqual(await tdc.query({ branch, userId }), { data: [task1, task2] })
  assert.deepEqual(await tdc.put(task3, task1.id), { data: task3 })
  assert.deepEqual(await tdc.query({ branch, userId }), { data: [task1, task3, task2] })
  assert.end()
})

test("taskDocumentDBClient.update()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const content = "example"
  const newContent = "change"
  const task = new Task({ id: ulid(), content, branch, userId })
  assert.deepEqual(await tdc.put(task), { data: task })
  assert.deepEqual(await tdc.get(task.id, task.userId), { data: task })
  assert.deepEqual(await tdc.update(task.set({ content: newContent })), {})
  assert.deepEqual(await tdc.get(task.id, task.userId), { data: task.set({ content: newContent }) })
  assert.end()
})

test("taskDocumentDBClient.delete()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const id = ulid()
  const task = new Task({ id, content: ulid(), branch, userId })
  assert.deepEqual(await tdc.put(task), { data: task })
  assert.deepEqual(await tdc.get(task.id, task.userId), { data: task })
  assert.deepEqual(await tdc.delete(task.id, task.userId), {})
  assert.deepEqual(await tdc.get(task.id, task.userId), { error: `task with id = ${id} not found` })
  assert.end()
})

test("taskDocumentDBClient.after()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task1 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task2 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task3 = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await tdc.put(task1), { data: task1 })
  assert.deepEqual(await tdc.put(task2), { data: task2 })
  assert.deepEqual(await tdc.put(task3), { data: task3 })
  assert.deepEqual(await tdc.query({ branch, userId }), { data: [task1, task2, task3] })
  assert.deepEqual(await tdc.after(task3.id, branch, task1.id, userId), {})
  assert.deepEqual(await tdc.query({ branch, userId }), { data: [task1, task3, task2] })
  assert.deepEqual(await tdc.after(task2.id, branch, undefined, userId), {})
  assert.deepEqual(await tdc.query({ branch, userId }), { data: [task2, task1, task3] })
  assert.end()
})

test("taskDocumentDBClient.meta()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const isOpened = true
  const task = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await tdc.put(task), { data: task })
  const resp1 = await tdc.get(task.id, task.userId)
  // A task should not have a meta object by default
  assert.deepEqual(resp1.data && resp1.data.meta, undefined)
  // Setting a new meta object
  assert.deepEqual(await tdc.meta(task.id, task.userId, { isOpened }), { data: { isOpened } })
  // Checking if it the meta object is now present
  const resp2 = await tdc.get(task.id, task.userId)
  assert.deepEqual(resp2.data && resp2.data.meta, { isOpened })
  // Calling the meta function without a meta object will return the current meta object.
  assert.deepEqual(await tdc.meta(task.id, task.userId), { data: { isOpened } })
  assert.end()
})










