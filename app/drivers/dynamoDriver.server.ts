import { DeleteCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb"
import type { DynamoDBDocumentClient, DeleteCommandOutput, GetCommandOutput, PutCommandOutput } from "@aws-sdk/lib-dynamodb"

import { db } from "./dynamo.server"
import type { DBDriver } from "../types"
/**
 * DynamoDriverConfig is the configuration interface
 * needed to create a `DynamoDriver` instance.
 *
 * It is important that the table exists prior to instantiating
 * an instance of it. No checks of its availability
 * will be run at runtime, and no methods to configure it
 * will be available through the `DynamoDriver` class.
 */
export interface DynamoDriverConfig {
  /**
   * db must be a `DynamoDBDocumentClient` instance.
   */
  db?: DynamoDBDocumentClient;
  /**
   * tableName is the name of the table that will be used
   * to store the `Tasks`.
   */
  tableName?: string;
}
/**
 * DynamoDriverItem represent the required attributes of an Item in
 * the table.
 */
export interface DynamoDriverItem {
  /**
   * pk represents the item primary key.
   */
  pk: string;
}
/**
 * DynamoDriver is a class built to hide the DynamoDB access patterns
 * used to handle different items on the same or multiple tables. It
 * must be provided with a connection to DynamoDB through following the
 * `DynamoDBDocumentClient` interface, and the name of the table.
 */
export abstract class DynamoDriver<Body, Item extends DynamoDriverItem, Patch> implements DBDriver<Body, Item, Patch, DynamoDBDocumentClient> {
  /**
   * db is a `DynamoDBDocumentClient` instance used to
   * communicate with DynamoDB.
   */
  db: DynamoDBDocumentClient = db
  /**
   * tableName is the name of DynamoDB's table.
   */
  tableName: string = process.env.TABLE_NAME || "renodes"
  /**
   * constructor is run upon creating a new instace of the class.
   * @param config - Configuration object
   */
  constructor(config?: DynamoDriverConfig) {
    if (config !== undefined) {
      this.tableName = config.tableName || this.tableName
      this.db = config.db || this.db
    }
  }
  /**
   * list returns a list of items.
   * @param params - Query parameters
   */
  abstract list(params?: string | any): Promise<Item[]>
  /**
   * get gets a single item from the table identified by its `pk`.
   * @param pk - item unique identifier.
   */
  async get(pk: string): Promise<Item | undefined> {
    const response: GetCommandOutput = await this.db.send(new GetCommand({
      TableName: this.tableName,
      Key: { pk },
    }))
    return response.Item
      ? response.Item as Item
      : undefined
  }
  /**
   * put inserts a new item in the table.
   * @param pk - item unique identifier.
   * @param body - item body to be stored.
   */
  async put(pk: string, body: Body): Promise<boolean> {
    const putOutput: PutCommandOutput = await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: { pk, ...body },
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    return putOutput.$metadata.httpStatusCode === 200
  }
  /**
   * update update only some specific attributes of a item.
   * @param pk - item unique identifier.
   * @param patch - item patch to be applied to the `item`.
   */
  abstract update(pk: string, patch: Patch): Promise<boolean>
  /**
   * delete deletes a single item from the table identified by its key.
   * @param key - item unique identifier.
   */
  async delete(pk: string): Promise<boolean> {
    const deleteOutput: DeleteCommandOutput = await this.db.send(new DeleteCommand({
      TableName: this.tableName,
      Key: { pk },
    }))
    return deleteOutput.$metadata.httpStatusCode === 200
  }
}