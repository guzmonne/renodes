import type { Task, TaskMetaObject } from "./models/task"

export interface DBDriver<Body, Item, Patch, DB> {
  /**
   * db represents the database driver.
   */
  db: DB
  /**
   * list returns a list of items
   */
  list(params?: string | any): Promise<Item[]>;
  /**
   * get returns a single item identified by its unique identifier.
   * @param id - Item unique identifier.
   */
  get(id: string): Promise<Item | undefined>;
  /**
   * put inserts a new item on the database.
   * @param id - Item unique identifier.
   * @param body - Body necessary to create the item.
   */
  put(id: string, body: Body): Promise<boolean>;
  /**
   * update updates an item on the database.
   * @param id - Item unique identifier.
   * @param patch - Patch to apply to the item.
   */
  update(id: string, patch: Patch): Promise<boolean>;
  /**
   * delete deletes an item from the database.
   * @param id - Item unique identifier.
   */
  delete(id: string): Promise<boolean>;
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