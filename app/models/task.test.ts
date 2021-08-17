import test from "tape"
import { ulid } from "ulid"
import range from "lodash/range"
import random from "lodash/random"
import type { Test } from "tape"

import { Task } from "./task"

test("new Task() should throw an error if the body is invalid", (assert: Test) => {
  try {
    new Task({})
  } catch (err) {
    assert.equal(err.message, "'content' is undefined")
  }
  try {
    new Task("")
  } catch (err) {
    assert.equal(err.message, "'body' is invalid")
  }
  assert.end()
})

let task: Task
let id = ulid()
let content = "test"
let parent = ulid()

test("new Task() should correctly set the body attributes", (assert: Test) => {
  task = new Task({ id, content, parent })
  assert.equal(task.id, id)
  assert.equal(task.content, content)
  assert.equal(task.parent, parent)
  // If done is undefined it should default to false
  task = new Task({ id, content })
  assert.equal(task.id, id)
  assert.equal(task.content, content)
  // `task.parent` should be `undefined`
  assert.equal(task.parent, undefined)
  assert.end()
})

test("Task.set() should return a new Task with its update attributes", (assert: Test) => {
  const body = { id: ulid(), content: "updated test" }
  const original = new Task({ id, content, parent })
  const updated = original.set(body)
  assert.equal(original.id, id)
  assert.equal(original.content, content)
  assert.equal(original.parent, parent)
  assert.equal(updated.content, body.content)
  // Since the `parent` wasn't updated it should have stay the same
  assert.equal(updated.parent, original.parent)
  // Its `id` should be the same
  assert.equal(original.id, updated.id)
  assert.end()
})

test("Task should contain a meta attribute", (assert: Test) => {
  const body = { id: ulid(), content: ulid(), meta: { isOpened: true } }
  const task = new Task(body)
  assert.deepEqual(body.meta, task.meta)
  assert.end()
})

test("Task.collection", (assert: Test) => {
  const body = { id: ulid(), content: ulid() }
  const collection = [
    { id: ulid(), content: ulid() },
    { id: ulid(), content: ulid() },
    { id: ulid(), content: ulid() },
  ]
  // should be empty by default
  const task = new Task(body)
  assert.equal(task.collection.length, 0)
  // should be able to be set with a list of object.
  task.collection = collection
  assert.deepEqual(task.collection, collection.map(t => new Task(t)))
  // should return as an object when calling Task.toObject()
  assert.deepEqual(task.toObject().collection?.map(t => ({ id: t.id, content: t.content })), collection)
  // Ent tests
  assert.end()
})

test("Task.find", (assert: Test) => {
  let previousLevel: Task[] = randomCollection("0#")
  for (let l of range(1, random(3, 10))) {
    let currentLevel = randomCollection(l + "#")
    for (let pTask of previousLevel) {
      const index = random(0, currentLevel.length - 1)
      const cTask = currentLevel[index]
      currentLevel = [
        ...currentLevel.slice(0, index),
        cTask.set({ parent: cTask.id, collection: [...cTask.collection, pTask] }),
        ...currentLevel.slice(index + 1)
      ]
    }
    previousLevel = currentLevel
  }
  const root = new Task({ id: "." + previousLevel[0].id, content: "", collection: previousLevel })
  console.log(JSON.stringify({ root }, null, 2))
  assert.end()
})

function randomCollection(id: string, max: number = 10, min: number = 3): Task[] {
  const result: Task[] = []
  for (let i of range(0, random(min, max - 1))) {
    result.push(new Task({ id: id + i, content: id + i }))
  }
  return result
}