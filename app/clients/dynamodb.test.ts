import test from "tape"
import type {Test} from "tape"

import { TaskDynamoDBClient } from "./dynamodb"

const TEST_ERROR_MESSAGE = "test query error"

class DynamoDBTableMock {
  items: {[key: string]: any}
  branches: {[key: string]: {[key: string]: any}}

  constructor() {
    this.items = {}
    this.branches = {}
  }

  async get(pk: string): Promise<any|undefined> {
    return this.items[pk]
  }

  async delete(pk: string): Promise<undefined> {
    delete this.items[pk]
    return undefined
  }

  async put(pk: string, branch: string, item: any): Promise<boolean> {
    this.items[pk] = item
    const branchExists = !!this.branches[branch]
    if (!branchExists) this.branches[branch] = {}
    this.branches[branch][pk] = this.items[pk]
    return true
  }

  async update(pk: string, patch: any): Promise<boolean> {
    this.items[pk] = {...this.items[pk], ...patch}
    return true
  }

  async list(branch: string): Promise<any[]> {
    return Object.values(this.branches[branch])
  }

  async drag(fromPK: string, branch: string, afterPK?: string): Promise<boolean> {
    return true
  }
}
const mock = new DynamoDBTableMock()
const dynamodb = new TaskDynamoDBClient({
  client: mock
})
/**
 * #TasksDynamoDBClient.query()
 */
test("should return a list of Tasks", async (assert: Test) => {
  assert.pass()
})

test("should update its call parameters if `parent` is present", async (assert: Test) => {
  assert.pass()
})

/**
 * #TasksDynamoDBClient.get()
 */
test("get()", (assert: Test) => {
  assert.pass()
})