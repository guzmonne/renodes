import { taskDocumentClient } from "./taskDocumentClient"
import { Task } from "../models/task"
import type { TaskDBClient, DBClientResponse, QueryParams } from "../types"
import type { ITaskDocumentClient, TaskDocumentClientItem } from "./taskDocumentClient"

/**
 * TaskDynamoDBClientConfig is the configuration object for a
 * TaskDynamoDBClient class instance.
 */
interface TaskDynamoDBClientConfig {
  client: ITaskDocumentClient;
}
/**
 * TaskDynamoDBClient handles communication with the DynamoDB table.
 * @param config - Configuration object.
 */
export class TaskDynamoDBClient implements TaskDBClient {
  constructor(config: TaskDynamoDBClientConfig) {
    this.client = config.client
  }
  /**
   * client is the interface to be used against a DynamoDB table.
   */
  client: ITaskDocumentClient
  /**
   * toTask converts a TaskDocumentClientItem into a Task object.
   * @param TaskDynamoDBObject - DynamoDB response to convert.
   */
  toTask(object: TaskDocumentClientItem): Task {
    const splitedBranch = object._b.split("#")
    return new Task({
      id: object.id,
      content: object.content,
      branch: splitedBranch.length === 1 ? undefined : splitedBranch.slice(-1)[0],
    })
  }
  /**
   * createPK creates a valid `pk` for the current schema
   * of the DynamoDB table.
   * @param id - Unique identifier of the `Item`.
   * @param userId - Unique identifier of the user.
   */
  createPK(id: string, userId?: string): string {
    return [userId, "Tasks", id].filter(x => x !== undefined).join("#")
  }
  /**
   * query returns a collection of Tasks.
   */
  async query({branch, userId}: QueryParams): Promise<DBClientResponse<Task[]>> {
    try {
      const pk = this.createPK(branch, userId)
      const items = await this.client.list(pk)
      return {data: items.map(this.toTask)}
    } catch(err) {
      return {error: err.message}
    }
  }
  /**
   * get returns a Task identified by its `id`.
   * @param id - `Task` unique identifier.
   * @param userId - User unique identifier.
   */
  async get(id: string, userId?: string): Promise<DBClientResponse<Task>> {
    try {
      const pk   = this.createPK(id, userId)
      const item = await this.client.get(pk)
      return {data: item && new Task(item)}
    } catch(err) {
      return {error: err.message}
    }
  }
  /**
   * put creates or updates a Task in the table.
   * @param task - `Task` to store.
   */
  async put(task: Task): Promise<DBClientResponse<Task>> {
    try {
      const pk = this.createPK(task.id)
      const _b = this.createPK(task.branch)
      const ok = await this.client.put(pk, _b, task)
      if (!ok) throw new Error(`error while storing task with pk = ${pk} at branch = ${_b}`)
      return {data: task}
    } catch(err) {
      return {error: err.message}
    }
  }
  /**
   * update updates a `Task` in the table.
   * @param task - Updated `Task` to store
   */
  async update(task: Task): Promise<DBClientResponse<undefined>> {
    try {
      const pk = this.createPK(task.id)
      const ok = await this.client.update(pk, task)
      if (!ok) throw new Error(`error while updating task with pk = ${pk}`)
      return {}
    } catch (err) {
      return {error: err.message}
    }
  }
  /**
   * delete deletes an Task from the table.
   * @param id - `Task` unique identifier.
   * @param userId - User unique identifier.
   */
  async delete(id: string, userId?: string): Promise<DBClientResponse<undefined>> {
    try {
      const pk = this.createPK(id, userId)
      const ok = await this.client.delete(pk)
      if (!ok) throw new Error(`error while deleting task with pk = ${pk}`)
      return {}
    } catch(err) {
      return {error: err.message}
    }
  }
  /**
   * after drops a `Task` to the position after another `Task`. If
   * `after` is `undefined` then the `Task` should be dragged to
   * the beginning of the list.
   * @param id - Task unique identifier.
   * @param branch - Task branch.
   * @param afterId - Unique identifier of the `Task` after which the
   *                `Task` must be positioned after.
   * @param userId - User unique identifier.
   */
  async after(id: string, branch?: string, afterId?: string, userId?: string): Promise<DBClientResponse<any>> {
    try {
      const pk = this.createPK(id, userId)
      const _b = this.createPK(branch, userId)
      const apk = !afterId ? undefined : this.createPK(afterId, userId)
      const ok = await this.client.after(pk, _b, apk)
      if (!ok) throw new Error(`couldn't move task with id = ${id} after task with id ${afterId}`)
      return {}
    } catch (err) {
      return {error: err.message}
    }
  }
}
/**
 * tasksDynamoDBClient is a singleton instance of the TaskDynamoDBClient class.
 */
export const tasksDynamoDBClient = new TaskDynamoDBClient({
  client: taskDocumentClient
})