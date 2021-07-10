import test from "tape"
import type { Test } from "tape"

import * as hatoas from "./hatoas"

const resource = "tests"
const rel = "test"
const _req = {resource, rel}

test("model() should correctly decorate the `json` object", async (t: Test) => {
  t.plan(1)
  const id = randomId()
  const item = {id}
  const req = {
    ..._req,
    json: {item}
  }
  hatoas.model(req)
  t.deepEqual(req.json, {
    item: {
      id,
      _links: {
        self: {href: `/api/${resource}/${id}`, rel, type: "GET"},
        update: {href: `/api/${resource}/${id}`, rel, type: "PUT"},
        delete: {href: `/api/${resource}/${id}`, rel, type: "DELETE"}
      }
    },
    _links: {
      query:  {href: `/api/${resource}`, rel, type: "GET"},
      create: {href: `/api/${resource}`, rel, type: "POST"},
    }
  })
})

test("collection() should correctly decorate the `json` object", async (t: Test) => {
  t.plan(1)
  const length = randomInt(10)
  let items = []
  for (let i = 0; i < length; i++) {
    items.push({id: randomId()})
  }
  const req = {
    ..._req,
    json: {items}
  }
  hatoas.collection(req)
  t.deepEqual(req.json, {
    items: items.map((item: any) => ({
      ...item,
      _links: {
        self: {href: `/api/${resource}/${item.id}`, rel, type: "GET"},
        update: {href: `/api/${resource}/${item.id}`, rel, type: "PUT"},
        delete: {href: `/api/${resource}/${item.id}`, rel, type: "DELETE"}
      }
    })),
    _links: {
      query:  {href: `/api/${resource}`, rel, type: "GET"},
      create: {href: `/api/${resource}`, rel, type: "POST"},
    }
  })
})

function randomInt(max = 100000) {
  return Math.random() * max
}

function randomId() {
  return randomInt().toFixed()
}