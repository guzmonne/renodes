import test from "tape"
import { ulid } from "ulid"
import type { Test } from "tape"

import { driver, TaskItem } from "./tasksDynamoDriver.server"

/**
 * To simplify this patterns an abstraction must be made
 * on top of them. It should handle the following methods:
 *  1.  `get`   : Gets a single `Task` by its `pk` and `sk`.
 *  2.  `put`   : Puts a new `Task` identified by its `pk` and `sk`.
 *  3.  `list`  : Lists all of the `Tasks` under a `pk`.
 *  4.  `delete`: Deletes a single `Task` identified by its `pk` and `sk`.
 *  5.  `update`: Updates a single `Task` identified by its `pk` and `sk`.
 *  6.  `after` : Changes the position of a `Task` identified by its `pk`
 *                and `sk` to a new one identified by its `sk`.
 */
test("Task Linked List abstraction", async (assert: Test) => {
  const id1 = "001"
  const id2 = "002"
  const id3 = "003"
  const id4 = "004"
  const userId = ulid()
  const root = userId + "#Tasks"
  const pk1 = key({ userId, id: id1 })
  const pk2 = key({ userId, id: id2 })
  const pk3 = key({ userId, id: id3 })
  const pk4 = key({ userId, id: id4 })
  const c1 = Math.random().toLocaleString()
  const c2 = Math.random().toLocaleString()
  const c3 = Math.random().toLocaleString()
  const c4 = Math.random().toLocaleString()
  /**
   * First, we'll insert three new `Tasks` using the `put` method.
   */
  assert.equal(await driver.put(pk1, { id: id1, content: c1 }, root), true)
  assert.equal(await driver.put(pk2, { id: id2, content: c2 }, root), true)
  assert.equal(await driver.put(pk3, { id: id3, content: c3 }, root), true)
  /**
   * Now we'll run the `list` method to see if the items come back
   * in the correct order.
   */
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk1, pk2, pk3])
  /**
   * Let's after an element and see if the list order is updated.
   */
  assert.equal(await driver.after(pk3, root), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk3, pk1, pk2])
  /**
   * Adding more items should append them to the end of the list.
   */
  assert.equal(await driver.put(pk4, { id: id4, content: c4 }, root), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk3, pk1, pk2, pk4])
  /**
   * Let's swap the middle elements and then move the first element
   * to the end of the list.
   */
  assert.equal(await driver.after(pk1, root, pk2), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk3, pk2, pk1, pk4])
  assert.equal(await driver.after(pk3, root, pk4), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk2, pk1, pk4, pk3])
  /**
   * Updating the content of any element element shouldn't modify
   * the order.
   */
  const content = ulid()
  const pk = [pk1, pk2, pk3, pk4][Math.round((Math.random() * 4))]
  assert.equal(await driver.update(pk, { content }), true)
  const actual = await driver.get(pk)
  assert.equal(actual && actual.content, content)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk2, pk1, pk4, pk3])
  /**
   * Deleting an element shouldn't break the list.
   */
  assert.equal(await driver.delete(pk4), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk2, pk1, pk3])
  /**
   * Deleting the tail or the head shouldn't break the list.
   */
  assert.equal(await driver.delete(pk3), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk2, pk1])
  assert.equal(await driver.delete(pk2), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk1])
  /**
   * Deleting the last element of the list should return an empty list
   */
  assert.equal(await driver.delete(pk1), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [])
  /**
   * Adding new `Tasks` after it gets empty should return a correctly
   * sorted list.
   */
  assert.equal(await driver.put(pk1, { id: id1, content: c1 }, root), true)
  assert.equal(await driver.put(pk2, { id: id2, content: c2 }, root), true)
  assert.equal(await driver.put(pk3, { id: id3, content: c3 }, root), true)
  assert.deepEqual((await driver.list(root)).map(item => item.pk), [pk1, pk2, pk3])
  /**
   * End
   */
  assert.end()
})

test("Task create", async (assert: Test) => {
  try {
    let tasks: TaskItem[]
    const userId = ulid()
    const branch = userId + "#Tasks"
    const id1 = "001"
    const id2 = "002"
    const id3 = "003"
    const pk1 = key({ userId, id: id1 })
    const pk2 = key({ userId, id: id2 })
    const pk3 = key({ userId, id: id3 })
    const content = Math.random().toLocaleString()
    // Put the first element
    assert.equal(await driver.put(pk1, { id: id1, content }, branch), true)
    // Put the second element
    assert.equal(await driver.put(pk2, { id: id2, content }, branch), true)
    // Check both `Task` where created in the correct order
    tasks = await driver.list(branch)
    assert.deepEqual(tasks.map(task => task.id), [id1, id2])
    // Put a new `Task` after `pk1` not the Root.
    assert.equal(await driver.put(pk3, { id: id3, content }, branch, pk1), true)
    // Check to see if the new `Task` was correctly added.
    tasks = await driver.list(branch)
    assert.deepEqual(tasks.map(task => task.id), [id1, id3, id2])
    // End assertions
    assert.end()
  } catch (err) {
    console.error("Error inside Try/Catch!!!")
    throw err
  }
})

test("Task meta object updates", async (assert: Test) => {
  try {
    let task: TaskItem | undefined
    const id = "001"
    const userId = ulid()
    const root = userId + "#Tasks"
    const pk = key({ userId, id: id })
    const content = Math.random().toLocaleString()
    // Put the element
    assert.equal(await driver.put(pk, { id, content }, root), true)
    // Expect the `meta` object to be empty
    task = await driver.get(pk)
    if (!task) throw new Error("task is undefined")
    assert.equal(task.pk, pk)
    assert.deepEqual(task._m, undefined)
    // Update the value of `isOpened`
    assert.equal(await driver.meta(pk, { isOpened: true }), true)
    // Check that the value of `isOpened` has been updated correctly
    task = await driver.get(pk)
    if (!task) throw new Error("task is undefined")
    assert.equal(task.pk, pk)
    assert.deepEqual(task._m, { isOpened: true })
    // Change the value of `isOpened` to false
    assert.equal(await driver.meta(pk, { isOpened: false }), true)
    // Check that the value of `isOpened` has been updated correctly
    task = await driver.get(pk)
    if (!task) throw new Error("task is undefined")
    assert.equal(task.pk, pk)
    assert.deepEqual(task._m, { isOpened: false })
    assert.end()
  } catch (err) {
    console.error("Error inside Try/Catch!!!")
    throw err
  }
})

// Functions
type KeyConfig = { id?: string, userId?: string, type?: string }
/**
 * key is a helper function to construct keys to be used as
 * `pk` or `sk` inside the table.
 * @param config - Key configuration object.
 */
function key({ id = "", userId = "U1", type = "Tasks" }: KeyConfig = {}) {
  return [userId, type, id].filter(x => x !== "").join("#")
}