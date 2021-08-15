import test from "tape"
import { ulid } from "ulid"
import type { Test } from "tape"

import { Task } from "../models/task"
import { client } from "./tasksClient.server"
import type { TaskItem } from "../drivers/tasksDynamoDriver.server"

test("tasksClient.createPK()", async (assert: Test) => {
  const id = ulid()
  const userId = ulid()
  assert.equal(client.createPK(), "Tasks")
  assert.equal(client.createPK(id), `Tasks#${id}`)
  assert.equal(client.createPK(id, userId), `${userId}#Tasks#${id}`)
  assert.end()
})


test("tasksClient.toModel()", async (assert: Test) => {
  let id = ulid()
  let branch = ulid()
  let userId = ulid()
  let content = ulid()
  let item: TaskItem = {
    id,
    content,
    pk: `${userId}#Tasks#${id}`,
    _b: `${userId}#Tasks#${branch}`,
    _n: ".",
    _m: {
      isOpened: true
    },
  }
  let actual = client.toModel(item)
  assert.equal(actual.id, id)
  assert.equal(actual.content, content)
  assert.equal(actual.branch, branch)
  assert.equal(actual.userId, userId)
  assert.equal(actual.interpreter, undefined)
  // Same test but configuring an interpreter
  id = ulid()
  branch = ulid()
  userId = ulid()
  content = ulid()
  let interpreter = ulid()
  item = {
    id,
    content,
    pk: `${userId}#Tasks#${id}`,
    _b: `${userId}#Tasks#${branch}`,
    _n: ".",
    _t: interpreter,
    _m: {
      isOpened: true
    },
  }
  actual = client.toModel(item)
  assert.equal(actual.id, id)
  assert.equal(actual.content, content)
  assert.equal(actual.branch, branch)
  assert.equal(actual.userId, userId)
  assert.equal(actual.interpreter, interpreter)
  assert.end()
})

test("tasksClient.get()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task = new Task({ id: ulid(), content: ulid(), branch, userId })
  // Normal GET excecution
  assert.deepEqual(await client.put(task), { data: task })
  assert.deepEqual(await client.get("invalid_id"), { error: "model not found" })
  assert.deepEqual(await client.get(task.id, userId), { data: task })
  // Recursive GET excecution
  const subTask1 = new Task({ id: ulid(), content: ulid(), branch: task.id, userId })
  const subTask2 = new Task({ id: ulid(), content: ulid(), branch: task.id, userId })
  const subTask3 = new Task({ id: ulid(), content: ulid(), branch: task.id, userId })
  task.collection = [subTask1, subTask2, subTask3]
  assert.deepEqual(await client.put(subTask1), { data: subTask1 })
  assert.deepEqual(await client.put(subTask2), { data: subTask2 })
  assert.deepEqual(await client.put(subTask3), { data: subTask3 })
  assert.deepEqual(await client.get(task.id, userId, true), { data: task })
  // End tests
  assert.end()
})

test("tasksClient.put()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task1 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task2 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task3 = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await client.put(task1), { data: task1 })
  assert.deepEqual(await client.put(task2), { data: task2 })
  assert.deepEqual(await client.query({ branch, userId }), { data: [task1, task2] })
  assert.deepEqual(await client.put(task3, task1.id), { data: task3 })
  assert.deepEqual(await client.query({ branch, userId }), { data: [task1, task3, task2] })
  assert.end()
})

test("tasksClient.update()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const content = "example"
  const newContent = "change"
  const task = new Task({ id: ulid(), content, branch, userId })
  assert.deepEqual(await client.put(task), { data: task })
  assert.deepEqual(await client.get(task.id, task.userId), { data: task })
  assert.deepEqual(await client.update(task.set({ content: newContent })), {})
  assert.deepEqual(await client.get(task.id, task.userId), { data: task.set({ content: newContent }) })
  assert.end()
})

test("tasksClient.delete()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const id = ulid()
  const task = new Task({ id, content: ulid(), branch, userId })
  assert.deepEqual(await client.put(task), { data: task })
  assert.deepEqual(await client.get(task.id, task.userId), { data: task })
  assert.deepEqual(await client.delete(task.id, task.userId), {})
  assert.deepEqual(await client.get(task.id, task.userId), { error: `model not found` })
  assert.end()
})

test("tasksClient.after()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task1 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task2 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task3 = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await client.put(task1), { data: task1 })
  assert.deepEqual(await client.put(task2), { data: task2 })
  assert.deepEqual(await client.put(task3), { data: task3 })
  assert.deepEqual(await client.query({ branch, userId }), { data: [task1, task2, task3] })
  assert.deepEqual(await client.after(task3.id, branch, task1.id, userId), {})
  assert.deepEqual(await client.query({ branch, userId }), { data: [task1, task3, task2] })
  assert.deepEqual(await client.after(task2.id, branch, undefined, userId), {})
  assert.deepEqual(await client.query({ branch, userId }), { data: [task2, task1, task3] })
  assert.end()
})

test("tasksClient.meta()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const isOpened = true
  const task = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await client.put(task), { data: task })
  const resp1 = await client.get(task.id, task.userId)
  // A task should not have a meta object by default
  assert.deepEqual(resp1.data && resp1.data.meta, {})
  // Setting a new meta object
  assert.deepEqual(await client.meta(task.id, task.userId, { isOpened }), { data: { isOpened } })
  // Checking if it the meta object is now present
  const resp2 = await client.get(task.id, task.userId)
  assert.deepEqual(resp2.data && resp2.data.meta, { isOpened })
  // Calling the meta function without a meta object will return the current meta object.
  assert.deepEqual(await client.meta(task.id, task.userId), { data: { isOpened } })
  assert.end()
})

test("tasksClient.query()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task1 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task2 = new Task({ id: ulid(), content: ulid(), branch, userId })
  const task3 = new Task({ id: ulid(), content: ulid(), branch, userId })
  // Insert three new tasks
  assert.deepEqual(await client.put(task1), { data: task1 })
  assert.deepEqual(await client.put(task2), { data: task2 })
  assert.deepEqual(await client.put(task3), { data: task3 })
  // Happy path
  assert.deepEqual(await client.query({ branch, userId }), { data: [task1, task2, task3] })
  // Invalid branch path
  assert.deepEqual(await client.query({ branch: "invalid", userId }), { data: [] })
  // Recursive query (following meta.isOpened)
  // Add three new tasks under task1
  const task11 = new Task({ id: ulid(), content: ulid(), branch: task1.id, userId })
  const task12 = new Task({ id: ulid(), content: ulid(), branch: task1.id, userId })
  const task13 = new Task({ id: ulid(), content: ulid(), branch: task1.id, userId })
  const updatedTask1 = task1.set({ meta: { isOpened: true } })
  assert.deepEqual(await client.put(task11), { data: task11 })
  assert.deepEqual(await client.put(task12), { data: task12 })
  assert.deepEqual(await client.put(task13), { data: task13 })
  // Add three new tasks under task3
  const task31 = new Task({ id: ulid(), content: ulid(), branch: task3.id, userId })
  const task32 = new Task({ id: ulid(), content: ulid(), branch: task3.id, userId })
  const task33 = new Task({ id: ulid(), content: ulid(), branch: task3.id, userId })
  const updatedTask3 = task3.set({ meta: { isOpened: true } })
  assert.deepEqual(await client.put(task31), { data: task31 })
  assert.deepEqual(await client.put(task32), { data: task32 })
  assert.deepEqual(await client.put(task33), { data: task33 })
  // Add three new tasks under task32
  const task321 = new Task({ id: ulid(), content: ulid(), branch: task32.id, userId })
  const task322 = new Task({ id: ulid(), content: ulid(), branch: task32.id, userId })
  const task323 = new Task({ id: ulid(), content: ulid(), branch: task32.id, userId })
  const updatedTask32 = task32.set({ meta: { isOpened: true } })
  assert.deepEqual(await client.put(task321), { data: task321 })
  assert.deepEqual(await client.put(task322), { data: task322 })
  assert.deepEqual(await client.put(task323), { data: task323 })
  // Update the collections of the updated tasks
  updatedTask1.collection = [task11, task12, task13]
  updatedTask3.collection = [task31, updatedTask32, task33]
  updatedTask32.collection = [task321, task322, task323]
  // Update the meta isOpened values
  assert.deepEqual(await client.meta(task1.id, task1.userId, { isOpened: true }), { data: updatedTask1.meta })
  assert.deepEqual(await client.meta(task3.id, task3.userId, { isOpened: true }), { data: updatedTask3.meta })
  assert.deepEqual(await client.meta(task32.id, task32.userId, { isOpened: true }), { data: updatedTask32.meta })
  // Query recursively
  assert.deepEqual(await client.query({ branch, userId, recursive: true }), { data: [updatedTask1, task2, updatedTask3] })
})










