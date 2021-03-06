import test from "tape"
import { ulid } from "ulid"
import type { Test } from "tape"
import request from "supertest"

import { app } from "../../server/index.js"
import { ModelNotFoundError } from "../server/errors.server"

test.onFinish(() => process.exit(0))

test("/home - should be empty by default", (assert: Test) => {
  request(app)
    .get("/home")
    .set({ "Accept": "application/json" })
    .expect("Content-Type", /json/)
    .expect(200)
    .end((err, response) => {
      assert.error(err, "error should be undefined")
      assert.deepEqual(response.body, { data: { id: "home", content: "Home Node", parent: "home", collection: [] } })
      assert.end()
    })
})

test("/home - should be able to create a new node", async (assert: Test) => {
  const body = { id: ulid(), content: ulid() }
  // Create a new node
  try {
    const response = await request(app)
      .post("/home")
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send(body)
      .expect("x-remix-redirect", "/home")
      .expect(204)
    assert.deepEqual(response.body, {}, "should return an empty object")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly stored by checking the home collection
  try {
    const response = await request(app)
      .get("/home")
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(
      response.body,
      { data: { id: "home", content: "Home Node", parent: "home", collection: [{ ...body }] } },
      "should have been correctly stored"
    )
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly stored by checking its endpoint
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [] } }, "should've been correctly stored")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // End tests
  assert.end()
})

test("/home - should be able to update a node", async (assert: Test) => {
  const body = { id: ulid(), content: ulid() }
  // Create a new node
  try {
    const response = await request(app)
      .post("/home")
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send(body)
      .expect("x-remix-redirect", "/home")
      .expect(204)
    assert.deepEqual(response.body, {}, "should be empty by default")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly stored.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [] } }, "should've been stored correctly")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Update the node
  const content = ulid()
  const interpreter = ulid()
  try {
    const response = await request(app)
      .put(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send({ content, interpreter })
      .expect("x-remix-redirect", `/${body.id}`)
      .expect(204)
    assert.deepEqual(response.body, {}, "should return an empty object")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly updated.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(
      response.body,
      { data: { ...body, content, interpreter, collection: [] } },
      "should've been updated correctly"
    )
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // End tests
  assert.end()
})

test("/home - should be able to delete a node", async (assert: Test) => {
  const body = { id: ulid(), content: ulid(), collection: [] }
  // Create a new node
  try {
    const response = await request(app)
      .post("/home")
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send(body)
      .expect("x-remix-redirect", "/home")
      .expect(204)
    assert.deepEqual(response.body, {})
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly stored.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body } })
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Delete the node
  try {
    const response = await request(app)
      .delete(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .expect("x-remix-redirect", `/${body.id}`)
      .expect(204)
    assert.deepEqual(response.body, {})
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly deleted.
  try {
    await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(404)
  } catch (err) {
    assert.deepEqual(err, new ModelNotFoundError())
  }
  // End tests
  assert.end()
})

test("/home - should be able to create sub nodes", async (assert: Test) => {
  const body = { id: ulid(), content: ulid() }
  // Create a new node
  try {
    const response = await request(app)
      .post("/home")
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send(body)
      .expect("x-remix-redirect", "/home")
      .expect(204)
    assert.deepEqual(response.body, {}, "should be empty by default")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly stored by checking its endpoint
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [] } }, "should've been stored correctly")
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Add the sub-nodes
  const subBody1 = { id: ulid(), content: ulid(), interpreter: ulid() }
  const subBody2 = { id: ulid(), content: ulid(), interpreter: ulid() }
  const subBody3 = { id: ulid(), content: ulid(), interpreter: ulid() }
  for (let subBody of [subBody1, subBody2, subBody3]) {
    try {
      const response = await request(app)
        .post(`/${body.id}`)
        .set({ "Accept": "application/json" })
        .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
        .send(subBody)
        .expect("x-remix-redirect", `/${body.id}`)
        .expect(204)
      assert.deepEqual(response.body, {}, "should return an empty object")
    } catch (err) {
      assert.error(err, "error should be undefined")
    }
    // Check if node was correctly stored by checking its endpoint
    try {
      const response = await request(app)
        .get(`/${subBody.id}`)
        .set({ "Accept": "application/json" })
        .expect("Content-Type", /json/)
        .expect(200)
      assert.deepEqual(response.body, { data: { ...subBody, parent: body.id, collection: [] } }, "should've been correctly stored")
    } catch (err) {
      assert.error(err, "error should be undefined")
    }
  }
  // Check that the sub-nodes were stored correctly.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(
      response.body,
      { data: { ...body, collection: [{ ...subBody1, parent: body.id }, { ...subBody2, parent: body.id }, { ...subBody3, parent: body.id }] } },
      "should've been correctly stored"
    )
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // End tests
  assert.end()
})

test("/home - should be able to drag a sub-node", async (assert: Test) => {
  const body = { id: ulid(), content: ulid() }
  // Create a new node
  try {
    const response = await request(app)
      .post("/home")
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send(body)
      .expect("x-remix-redirect", "/home")
      .expect(204)
    assert.deepEqual(response.body, {})
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check if node was correctly stored by checking its endpoint
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [] } })
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Add the sub-nodes
  const subBody1 = { id: ulid(), content: ulid(), interpreter: ulid() }
  const subBody2 = { id: ulid(), content: ulid(), interpreter: ulid() }
  const subBody3 = { id: ulid(), content: ulid(), interpreter: ulid() }
  for (let subBody of [subBody1, subBody2, subBody3]) {
    try {
      const response = await request(app)
        .post(`/${body.id}`)
        .set({ "Accept": "application/json" })
        .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
        .send(subBody)
        .expect("x-remix-redirect", `/${body.id}`)
        .expect(204)
      assert.deepEqual(response.body, {})
    } catch (err) {
      assert.error(err, "error should be undefined")
    }
    // Check if node was correctly stored by checking its endpoint
    try {
      const response = await request(app)
        .get(`/${subBody.id}`)
        .set({ "Accept": "application/json" })
        .expect("Content-Type", /json/)
        .expect(200)
      assert.deepEqual(response.body, { data: { ...subBody, parent: body.id, collection: [] } })
    } catch (err) {
      assert.error(err, "error should be undefined")
    }
  }
  // Check that the sub-nodes were stored correctly.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [{ ...subBody1, parent: body.id }, { ...subBody2, parent: body.id }, { ...subBody3, parent: body.id }] } })
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Drag subTask1 after subTask2
  try {
    const response = await request(app)
      .post(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send({ dragId: subBody1.id, afterId: subBody2.id })
      .expect("x-remix-redirect", `/${body.id}`)
      .expect(204)
    assert.deepEqual(response.body, {})
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check that the sub-nodes were stored correctly.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [{ ...subBody2, parent: body.id }, { ...subBody1, parent: body.id }, { ...subBody3, parent: body.id }] } })
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Drag subTask3 to the first position
  try {
    const response = await request(app)
      .post(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .set({ "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" })
      .send({ dragId: subBody3.id })
      .expect("x-remix-redirect", `/${body.id}`)
      .expect(204)
    assert.deepEqual(response.body, {})
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // Check that the sub-nodes were stored correctly.
  try {
    const response = await request(app)
      .get(`/${body.id}`)
      .set({ "Accept": "application/json" })
      .expect("Content-Type", /json/)
      .expect(200)
    assert.deepEqual(response.body, { data: { ...body, collection: [{ ...subBody3, parent: body.id }, { ...subBody2, parent: body.id }, { ...subBody1, parent: body.id }] } })
  } catch (err) {
    assert.error(err, "error should be undefined")
  }
  // End tests
  assert.end()
})