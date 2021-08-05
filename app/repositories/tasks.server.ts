import { Task } from '../models/task'
import { tasksDynamoDBClient } from "../clients/dynamodb.server"
import type { TaskMetaObject } from "../models/task"
import type { TaskDBClient, QueryParams } from "../types"

export interface TasksRepositoryConfig {
  client: TaskDBClient
}
/**
 * TasksRepository manages Tasks through a standard interface.
 * @param config - Configuration object.
 */
class TasksRepository {
  constructor(config: TasksRepositoryConfig) {
    this.client = config.client
  }
  /**
   * client stores a reference to the DB client.
   */
  client: TaskDBClient
  /**
   * query returns a list of Tasks.
   */
  async query(params: QueryParams = {}): Promise<Task[]> {
    const { error, data } = await this.client.query(params)
    if (error) throw error
    return data
  }
  /**
   * get returns a single Task identified by its `id`.
   * @param id - Task unique identifier.
   * @param userId - Task unique identifier.
   */
  async get(id: string, userId?: string): Promise<Task> {
    const { error, data } = await this.client.get(id, userId)
    if (error) throw error
    return data
  }
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
   * update updates a Task in the Repository.
   * @param task - Update Task to store
   */
  async update(task: Task): Promise<undefined> {
    const { error } = await this.client.update(task)
    if (error) throw error
    return undefined
  }
  /**
   * delete removes a Task from the repository
   * @param id - Task unique identifier.
   * @param userId - User unique identifier.
   */
  async delete(id: string, userId?: string): Promise<undefined> {
    const { error } = await this.client.delete(id, userId)
    if (error) throw error
    return undefined
  }
  /**
   * meta updates the metadata information of a `Task`
   * @param id - Task unique identifier.
   * @param meta - Metadata object to apply.
   * @param userId - User unique identifier.
   */
  async meta(id: string, meta: TaskMetaObject, userId?: string): Promise<undefined> {
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

export const repository = new TasksRepository({ client: tasksDynamoDBClient })