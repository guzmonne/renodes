import type { DBClient } from "../types"

export class Repository<Model, QueryParams extends {}> {
  /**
   * client is the interface used to interact with the database.
   */
  client: DBClient<Model, QueryParams>;
  /**
   * constructor is called when a new Repository instance is created.
   */
  constructor(client: DBClient<Model, QueryParams>) {
    this.client = client
  }
  /**
   * query returns a list of Models.
   * @param params - Query parameters.
   */
  async query(params: QueryParams): Promise<Model[]> {
    const { error, data } = await this.client.query(params)
    if (error) throw error
    return data
  }
  /**
   * get returns a single Model identified by its `id`.
   * @param id - Model unique identifier.
   * @param userId - User unique identifier.
   */
  async get(id: string, userId?: string): Promise<Model> {
    const { error, data } = await this.client.get(id, userId)
    if (error) throw error
    return data
  }
  /**
   * put stores a Model in the Repository.
   * @param model - Model to store in the Repository.
   */
  async put(model: Model): Promise<Model> {
    const { error, data } = await this.client.put(model)
    if (error) throw error
    return data
  }
  /**
   * update updates a Model in the Repository.
   * @param model - Update Model to store
   */
  async update(model: Model): Promise<undefined> {
    const { error } = await this.client.update(model)
    if (error) throw error
    return undefined
  }
  /**
   * delete removes a Model from the repository
   * @param id - Model unique identifier.
   * @param userId - User unique identifier.
   */
  async delete(id: string, userId?: string): Promise<undefined> {
    const { error } = await this.client.delete(id, userId)
    if (error) throw error
    return undefined
  }
}