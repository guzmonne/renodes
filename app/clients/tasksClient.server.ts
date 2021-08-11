import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

import { Client } from "./client.server"
import { driver } from "../drivers/tasksDynamoDriver.server"
import { Task, TaskBody, TaskPatch, TaskMeta } from "../models/task"
import type { DBClientResponse } from "../types"
import type { TasksDynamoDriver, TaskItem } from "../drivers/tasksDynamoDriver.server"

/**
 * QueryParams is the configuration interface of a `#TaskDBClient.query()` command.
 */
export interface TasksQueryParams {
  /**
   * branch corresponds to the branch where the query should run.
   */
  branch?: string;
  /**
   * userId corresponds to the unique identifier of the user.
   */
  userId?: string;
}
/**
 * TasksClient handles communication with the DynamoDB table.
 * @param config - Configuration object.
 */
export class TasksClient extends Client<Task, TasksQueryParams, TaskBody, TaskItem, TaskPatch, DynamoDBDocumentClient> {
  /**
   * driver is the interface to be used against a DynamoDB table.
   */
  driver: TasksDynamoDriver = driver
  /**
   * toModel converts a TaskItem into a Task object.
   * @param TasksObject - DynamoDB response to convert.
   */
  toModel(item: TaskItem): Task {
    const [b0, b1, b2] = item._b.split("#")
    return new Task({
      id: item.id,
      content: item.content,
      userId: b0 === "Tasks" ? undefined : b0,
      branch: b1 === "Tasks" ? b2 : b1,
      interpreter: item._t,
      meta: item._m,
    })
  }
  /**
   * toBody converts a Task into a valid body value.
   * @param task - Task model to convert
   */
  toBody = (task: Task): TaskBody => task
  /**
   * toPatch converts a Task into a valid patch value.
   * @param patch - Task model to convert
   */
  toPatch = (task: Task): TaskPatch => ({
    content: task.content,
    interpreter: task.interpreter,
  })
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
      const items = await this.driver.list(pk)
      return { data: items.map(this.toModel) }
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
  async meta(id: string, userId?: string, meta?: TaskMeta): Promise<DBClientResponse<TaskMeta | undefined>> {
    try {
      if (!meta) {
        const { data, error } = await this.get(id, userId)
        if (!data || error) throw new Error(`couldn't get the metadata for the task with id = ${id}`)
        return { data: data.meta }
      }
      const pk = this.createPK(id, userId)
      const ok = await this.driver.meta(pk, meta)
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
      const ok = await this.driver.put(pk, task, branchPk, afterPk)
      if (!ok) throw new Error(`error while storing task with pk = ${pk} at branch = ${branchPk}`)
      return { data: task }
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
      const ok = await this.driver.after(pk, _b, apk)
      if (!ok) throw new Error(`couldn't move task with id = ${id} after task with id ${afterId}`)
      return {}
    } catch (err) {
      return { error: err.message }
    }
  }
}
/**
 * client is a preconfigured instance of the TasksClient class.
 */
export const client = new TasksClient()