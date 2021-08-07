import { Task } from '../models/task'
import { client } from "../clients/tasksClient.server"
import { Repository } from "./repository.server"
import type { TaskMeta } from "../models/task"
import type { TasksDBClient, TasksQueryParams } from "../types"

/**
 * TasksRepository manages Tasks through a standard interface.
 * @param config - Configuration object.
 */
class TasksRepository extends Repository<Task, TasksQueryParams> {
  client: TasksDBClient
  /**
   * put stores a Task in the Repository.
   * @param task - Task to store in the Repository.
   */
  async put(task: Task, afterId?: string): Promise<Task> {
    const { error, data } = await this.client.put(task, afterId)
    if (error) throw error
    return data
  }
  /**
   * meta updates the metadata information of a `Task`
   * @param id - Task unique identifier.
   * @param meta - Metadata object to apply.
   * @param userId - User unique identifier.
   */
  async meta(id: string, meta: TaskMeta, userId?: string): Promise<undefined> {
    const { error } = await this.client.meta(id, userId, meta)
    if (error) throw error
    return undefined
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
  async after(id: string, branch?: string, afterId?: string, userId?: string): Promise<any> {
    const response = await this.client.after(id, branch, afterId, userId)
    if (response && response.error) throw response.error
    return undefined
  }
}

export const repository = new TasksRepository(client)