import { taskDocumentClient } from "../drivers/tasksDynamoDriver.server"
import { Task } from "../models/task"
import type { TasksDBClient, DBClientResponse, TasksQueryParams } from "../types"
import type { TaskDocumentClient, TaskDocumentClientItem, TaskDocumentClientMeta } from "../drivers/tasksDynamoDriver.server"

/**
 * TaskDynamoDBClient handles communication with the DynamoDB table.
 * @param config - Configuration object.
 */
export class TaskDynamoDBClient implements TasksDBClient {
  /**
   * client is the interface to be used against a DynamoDB table.
   */
  client: TaskDocumentClient
  /**
   * constructor creates a new TaskDynamoDBClient instance.
   * @param client - Client driver to interact with the database.
   */
  constructor(client: TaskDocumentClient) {
    this.client = client
  }
  /**
   * toTask converts a TaskDocumentClientItem into a Task object.
   * @param TaskDynamoDBObject - DynamoDB response to convert.
   */
  toTask(object: TaskDocumentClientItem): Task {
    const [b0, b1, b2] = object._b.split("#")
    return new Task({
      id: object.id,
      content: object.content,
      userId: b0 === "Tasks" ? undefined : b0,
      branch: b1 === "Tasks" ? b2 : b1,
      meta: object._m,
    })
  }
  /**
   * createPK creates a valid `pk` for the current schema
   * of the DynamoDB table.
   * @param id - Unique identifier of the `Item`.
   * @param userId - Unique identifier of the user.
   */
  createPK(id?: string, userId?: string): string {
    return [userId, "Tasks", id].filter(x => x !== undefined).join("#")
  }
  /**
   * query returns a collection of Tasks.
   */
  async query(params: TasksQueryParams = {}): Promise<DBClientResponse<Task[]>> {
    try {
      const { branch, userId } = params
      const pk = this.createPK(branch, userId)
      const items = await this.client.list(pk)
      return { data: items.map(this.toTask) }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * get returns a Task identified by its `id`.
   * @param id - `Task` unique identifier.
   * @param userId - User unique identifier.
   */
  async get(id: string, userId?: string): Promise<DBClientResponse<Task>> {
    try {
      const pk = this.createPK(id, userId)
      const item = await this.client.get(pk)
      if (!item) throw new Error(`task with id = ${id} not found`)
      return { data: this.toTask(item) }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * meta returns the current `Task` metadata, or updates it.
   * @param id - `Task` unique identifier.
   * @param userId - User unique identifier.
   * @param meta - Metadata to be updated.
   */
  async meta(id: string, userId?: string, meta?: TaskDocumentClientMeta): Promise<DBClientResponse<TaskDocumentClientMeta | undefined>> {
    try {
      if (!meta) {
        const { data, error } = await this.get(id, userId)
        if (!data || error) throw new Error(`couldn't get the metadata for the task with id = ${id}`)
        return { data: data.meta }
      }
      const pk = this.createPK(id, userId)
      const ok = await this.client.meta(pk, meta)
      if (!ok) throw new Error(`couldn't apply new metadata changes to the task with id = ${id}`)
      return { data: meta }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * put creates or updates a Task in the table.
   * @param task - `Task` to store.
   * @param afterId - Id of the `Task` after which the new `Task` should be put.
   */
  async put(task: Task, afterId?: string): Promise<DBClientResponse<Task>> {
    try {
      const pk = this.createPK(task.id, task.userId)
      const branchPk = this.createPK(task.branch, task.userId)
      const afterPk = afterId ? this.createPK(afterId, task.userId) : undefined
      const ok = await this.client.put(pk, branchPk, task, afterPk)
      if (!ok) throw new Error(`error while storing task with pk = ${pk} at branch = ${branchPk}`)
      return { data: task }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * update updates a `Task` in the table.
   * @param task - Updated `Task` to store
   */
  async update(task: Task): Promise<DBClientResponse<undefined>> {
    try {
      const pk = this.createPK(task.id, task.userId)
      const ok = await this.client.update(pk, task)
      if (!ok) throw new Error(`error while updating task with pk = ${pk}`)
      return {}
    } catch (err) {
      return { error: err.message }
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
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * after drops a `Task` to the position after another `Task`. If
   * `after` is `undefined` then the `Task` should be dragged to
   * the beginning of the list.
   * @param id - Task unique identifier.
   * @param branch - Task branch.
   * @param afterId - Unique identifier of the `Task` after which the
   *                  `Task` must be positioned after.
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
      return { error: err.message }
    }
  }
}
/**
 * tasksClient is a singleton instance of the TaskDynamoDBClient class.
 */
export const tasksClient = new TaskDynamoDBClient(taskDocumentClient)