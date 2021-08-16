import { Task } from '../models/task'
import { client } from "../clients/tasksClient.server"
import { Repository } from "./repository.server"
import type { TaskMeta, TaskPatch } from "../models/task"
import type { TasksClient, TasksQueryParams } from "../clients/tasksClient.server"

/**
 * TasksRepository manages Tasks through a standard interface.
 * @param config - Configuration object.
 */
class TasksRepository extends Repository<Task, TaskPatch, TasksQueryParams> {
  /**
   * client is an instance of the TasksClient class used to interact
   * with the database.
   */
  client: TasksClient = client
  /**
   * get returns a single Task identified by its `id`.
   * @param id - Task unique identifier.
   * @param userId - User unique identifier.
   * @param recursive - Gets the task plus its sub-tasks.
   */
  async get(id: string, userId?: string, recursive: boolean = false): Promise<Task> {
    if (id === "home") return this.getHome(userId, recursive)
    const { error, data } = await this.client.get(id, userId, recursive)
    if (error) throw error
    return data
  }
  /**
   * getHome returns the pseudo-task "home"
   * @param userId - User unique identifier.
   * @param recursive - Gets the task plus its sub-tasks.
   */
  async getHome(userId?: string, recursive: boolean = false): Promise<Task> {
    const { error, data } = await this.client.query({ userId, recursive })
    if (error) throw error
    const task = new Task({ id: "home", content: "Home Node", parent: "home", collection: data })
    return task
  }
  /**
   * put stores a Task in the Repository.
   * @param task - Task to store in the Repository.
   */
  async put(task: Task, afterId?: string): Promise<Task> {
    if (task.parent === "home") task = new Task({ id: task.id, content: task.content })
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
   * @param parent - Task parent.
   * @param afterId - Unique identifier of the `Task` after which the
   *                `Task` must be positioned after.
   * @param userId - User unique identifier.
   */
  async after(id: string, parent?: string, afterId?: string, userId?: string): Promise<any> {
    const response = await this.client.after(id, parent, afterId, userId)
    if (response && response.error) throw response.error
    return undefined
  }
}
/**
 * repository is a pre-configured instance of the class TasksRepository.
 */
export const repository = new TasksRepository()