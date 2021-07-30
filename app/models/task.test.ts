import test from "tape"
import { ulid } from "ulid"
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
let branch = ulid()

test("new Task() should correctly set the body attributes", (assert: Test) => {
  task = new Task({ id, content, branch })
  assert.equal(task.id, id)
  assert.equal(task.content, content)
  assert.equal(task.branch, branch)
  // If done is undefined it should default to false
  task = new Task({ id, content })
  assert.equal(task.id, id)
  assert.equal(task.content, content)
  // `task.branch` should be `undefined`
  assert.equal(task.branch, undefined)
  assert.end()
})

test("#Task.set() should return a new Task with its update attributes", (assert: Test) => {
  const body = { id: ulid(), content: "updated test", done: true }
  const original = new Task({ id, content, branch })
  const updated = original.set(body)
  assert.equal(original.id, id)
  assert.equal(original.content, content)
  assert.equal(original.branch, branch)
  assert.equal(updated.content, body.content)
  // Since the `branch` wasn't updated it should have stay the same
  assert.equal(updated.branch, original.branch)
  // Its `id` should be the same
  assert.equal(original.id, updated.id)
  assert.end()
})