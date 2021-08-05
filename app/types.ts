import type { Task, TaskMetaObject } from "./models/task"

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
 * DBClient is the standard interface that a DBClient must support.
 */
export interface DBClient<Model, QueryParams> {
  /**
   * query returns a collection of Models.
   * @param params - Query parameters.
   */
  query: (params?: QueryParams) => Promise<DBClientResponse<Model[]>>;
  /**
   * get returns a single Model identified by its `id` and `userId`.
   * @param id - Model unique identifier.
   * @param userId - User unique identifier.
   */
  get: (id: string, userId?: string) => Promise<DBClientResponse<Model>>;
  /**
   * put creates or updates a Model.
   * @param model - New Model to add to the database.
   */
  put(model: Model): Promise<DBClientResponse<Model>>;
  /**
   * update updates valid values of a Model
   * @param model - Updated Model to be stored.
   */
  update(model: Model): Promise<DBClientResponse<undefined>>;
  /**
   * delete deletes a Model identified by its `id` and `userId`.
   * @param id - Model unique identifier.
   * @param userId - User unique identifier.
   */
  delete: (id: string, userId?: string) => Promise<DBClientResponse<undefined>>;
}
/**
 * TaskDBClient is the Database interface to interact with the `Tasks`
 * entities in the Database.
 */
export interface TasksDBClient extends DBClient<Task, TasksQueryParams> {
  /**
   * put creates or updates a `Task`.
   * @param task - New `Task` to add to the database.
   * @param afterId - Id of the `Task` after which the new `Task` should be put.
   */
  put(task: Task, afterId?: string): Promise<DBClientResponse<Task>>;
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
  after: (id: string, branch: string, afterId?: string, userId?: string) => Promise<DBClientResponse<undefined>>;
  /**
   * meta updates or read the metadata object of a `Task`.
   * @param id - Task unique identifier.
   * @param userId - User unique identifier.
   * @param meta - Metadata object to apply.
   */
  meta(id: string, userId?: string, meta?: TaskMetaObject): Promise<DBClientResponse<TaskMetaObject | undefined>>
}
/**
 * DBClientResponse is a wrapper that should be used to handle communication
 * between a TaskDBClient and a Repository.
 * @param Task - The data type of the `data` value of the interface.
 */
export interface DBClientResponse<Data> {
  /**
   * data represent the data returned by the Database call.
   */
  data?: Data;
  /**
   * error is returned whenever a call to the database fails.
   */
  error?: Error;
  /**
   * offset is the element that should be used to handle pagination.
   */
  offset?: string;
  /**
   * meta contains any aditional information that may pertain to the request.
   */
  meta?: any;
}