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
  const id = ulid()
  const branch = ulid()
  const userId = ulid()
  const content = ulid()
  const item: TaskItem = {
    id,
    content,
    pk: `${userId}#Tasks#${id}`,
    _b: `${userId}#Tasks#${branch}`,
    _n: ".",
    _m: {
      isOpened: true
    },
  }
  const actual = client.toModel(item)
  assert.equal(actual.id, id)
  assert.equal(actual.content, content)
  assert.equal(actual.branch, branch)
  assert.equal(actual.userId, userId)
  assert.end()
})

test("tasksClient.get()", async (assert: Test) => {
  const branch = ulid()
  const userId = ulid()
  const task = new Task({ id: ulid(), content: ulid(), branch, userId })
  assert.deepEqual(await client.put(task), { data: task })
  assert.deepEqual(await client.get("invalid_id"), { error: "get error" })
  assert.deepEqual(await client.get(task.id, userId), { data: task })
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
  assert.deepEqual(await client.get(task.id, task.userId), { error: `get error` })
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










