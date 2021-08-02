import type { Task } from "./models/task"
/**
 * ResponseItem represent a response object return by the API.
 * It should be used to extend an existing model which will be
 * decorated with its action links.
 */
export interface ResponseItem {
  /**
   * _links represent a dictionary of actions that can be done
   * on the resource.
   */
  _links: ResponseLinks
}
/**
 * ResponseItemValue is the interface that each action link should
 * enforce.
 */
export interface ResponseItemValue {
  /**
   * href represents the endpoint of the action.
   */
  href: string;
  /**
   * rel identifies the resource the action is related.
   */
  rel: string;
  /**
   * type represents the HTTP method of the request.
   */
  type: RequestMethods
}
/**
 * ResponseItemKey is the list of valid action links that can be
 * set on a resource.
 */
export type ResponseItemKey = "self" | "read" | "update" | "delete" | "query" | "create"
/**
 * RequestMethods is the list of HTTP methods.
 */
export type RequestMethods = "GET" | "POST" | "PUT" | "DELETE"
/**
 * ResponseLinks is a dictionary with a partial list of actions that
 * shoud decorate a response model.
 */
export type ResponseLinks = Partial<Record<ResponseItemKey, ResponseItemValue>>
/**
 * QueryParams is the configuration interface of a `#TaskDBClient.query()` command.
 */
export interface QueryParams {
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
 * TaskDBClient represent the interface that should be define for a repository
 * to talk to the database. For each function a `DBClientResponse` object
 * must be returned.
 */
export interface TaskDBClient {
  /**
   * update updates valid values of a `Task`
   * @param task - Updated `Task` to be stored.
   */
  update(task: Task): Promise<DBClientResponse<undefined>>;
  /**
   * put creates or updates a new `Task` element.
   * @param model - Model to store or update on the database.
   * @param afterId - Id of the `Task` after which the new `Task` should be put.
   */
  put(task: Task, afterId?: string): Promise<DBClientResponse<Task>>;
  /**
   * query returns a collection of `Task` elements.
   */
  query: (params?: QueryParams) => Promise<DBClientResponse<Task[]>>;
  /**
   * get returns a single `Task` element identified by its `id`.
   * @param id - Task unique identifier.
   * @param userId - User unique identifier.
   */
  get: (id: string, userId?: string) => Promise<DBClientResponse<Task>>;
  /**
   * @param id - Task unique identifier.
   */
  delete: (id: string) => Promise<DBClientResponse<undefined>>;
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

export interface BranchDocumentClient<Item, Body, Patch> {
  get(pk: string): Promise<Item | undefined>;
  delete(pk: string): Promise<undefined>;
  put(pk: string, branch: string, item: Body, afterPk?: string): Promise<boolean>;
  update(pk: string, patch: Patch): Promise<boolean>;
  list(branch: string): Promise<Item[]>;
  after(fromPK: string, branch: string, afterPK?: string): Promise<boolean>;
}