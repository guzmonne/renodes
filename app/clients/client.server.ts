import type { DBClient, DBDriver, DBClientResponse } from "../types"

/**
 * ClientModel represents the default Model interface accepted by a client.
 * @param id - Model unique identifier.
 * @param userId - User unique identifier.
 */
export interface ClientModel {
  id: string;
  userId?: string;
}
/**
 * Client handles communication with the DynamoDB table.
 * @param config - Configuration object.
 */
export abstract class Client<Model extends ClientModel, QueryParams, Body, Item, Patch, DB> implements DBClient<Model, QueryParams> {
  /**
   * driver is the interface to be used against a DynamoDB table.
   */
  abstract driver: DBDriver<Body, Item, Patch, DB>
  /**
   * createPK returns a valid Primary key from a set of values.
   * @param id - Unique identifier of the `Item`.
   * @param userId - Unique identifier of the user.
   */
  abstract createPK(id?: string, userId?: string): string
  /**
   * toModel converts an Item into a Model.
   * @param item - Item to convert
   */
  abstract toModel(item: Item): Model
  /**
   * toModel creates a valid Body object from a Model.
   * @param model - Model from which to create the Body.
   */
  abstract toBody(model: Model): Body
  /**
   * toPatch creates a valid Patch object from a Model.
   * @param model - Model from which to create the Patch.
   */
  abstract toPatch(model: Model): Patch
  /**
   * query returns a collection of Models.
   */
  async query(): Promise<DBClientResponse<Model[]>> {
    try {
      const items = await this.driver.list()
      return { data: items.map(this.toModel) }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * get returns a Model identified by its `id`.
   * @param id - `Model` unique identifier.
   * @param userId - User unique identifier.
   */
  async get(id: string, userId?: string): Promise<DBClientResponse<Model>> {
    try {
      const pk = this.createPK(id, userId)
      const item = await this.driver.get(pk)
      if (!item) throw new Error(`get error`)
      return { data: this.toModel(item) }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * put creates or updates a Model in the table.
   * @param model - `Model` to store.
   * @param afterId - Id of the `Model` after which the new `Model` should be put.
   */
  async put(model: Model): Promise<DBClientResponse<Model>> {
    try {
      const pk = this.createPK(model.id, model.userId)
      const ok = await this.driver.put(pk, this.toBody(model))
      if (!ok) throw new Error(`put error`)
      return { data: model }
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * update updates a `Model` in the table.
   * @param model - Updated `Model` to store
   */
  async update(model: Model): Promise<DBClientResponse<undefined>> {
    try {
      const pk = this.createPK(model.id, model.userId)
      const ok = await this.driver.update(pk, this.toPatch(model))
      if (!ok) throw new Error(`update error`)
      return {}
    } catch (err) {
      return { error: err.message }
    }
  }
  /**
   * delete deletes an Model from the table.
   * @param id - `Model` unique identifier.
   * @param userId - User unique identifier.
   */
  async delete(id: string, userId?: string): Promise<DBClientResponse<undefined>> {
    try {
      const pk = this.createPK(id, userId)
      const ok = await this.driver.delete(pk)
      if (!ok) throw new Error(`delete error`)
      return {}
    } catch (err) {
      return { error: err.message }
    }
  }
}