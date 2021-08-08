import omit from "lodash/omit"
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { QueryCommandOutput, PutCommandOutput, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb"

import { DynamoDriver } from "./dynamoDriver.server"
import type { DynamoDriverItem } from "./dynamoDriver.server"
import type { UserBody, UserPatch } from "../models/user"

/**
 * UserItem is the interface that represent how the `Users`
 * items are stored in the table.
 */
export interface UserItem extends DynamoDriverItem {
  /**
   * _b holds the value "Profile" to be able to query by the `byBranch` index.
   */
  _b: "Profile";
  /**
   * _b holds a User's `username`.
   */
  _n: string;
  /**
   * _m holds the profile information of a `User`.
   */
  _m: UserPatch;
}
/**
 * UsersDynamoDriver handles the logic of `User` items inside a DynamoDB table.
 */
export class UsersDynamoDriver extends DynamoDriver<UserBody, UserItem, UserPatch> {
  /**
   * list returns a list of all the `Users` in the table.
   */
  async list(): Promise<UserItem[]> {
    const queryOutput: QueryCommandOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byBranch",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": "Profile" },
    }))
    if (!queryOutput.Items) return []
    return queryOutput.Items as UserItem[]
  }
  /**
   * put inserts a new `User` in the table.
   */
  async put(pk: string, body: UserBody): Promise<boolean> {
    const putOutput: PutCommandOutput = await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        pk,
        _b: "Profile",
        _n: body.username,
        _m: omit(body, "id", "username", "provider")
      },
    }))
    return putOutput.$metadata.httpStatusCode === 200
  }
  /**
   * update updates a `User` profile inside the table.
   */
  async update(pk: string, patch: UserPatch): Promise<boolean> {
    const updateOutput: UpdateCommandOutput = await this.db.send(new UpdateCommand({
      TableName: this.tableName,
      Key: { pk },
      UpdateExpression: "SET #_m = :_m",
      ExpressionAttributeNames: { "#_m": "_m" },
      ExpressionAttributeValues: { ":_m": patch },
    }))
    return updateOutput.$metadata.httpStatusCode === 200
  }
}
/**
 * driver is a preconfigured instance of the `UsersDynamoDriver` class.
 */
export const driver = new UsersDynamoDriver()