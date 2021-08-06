import omit from "lodash/omit"
import { PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb"
import type { QueryCommandOutput, PutCommandOutput, UpdateCommandOutput } from "@aws-sdk/lib-dynamodb"

import { DynamoDriver } from "./dynamoDriver.server"
import type { DynamoDriverItem } from "./dynamoDriver.server"

/**
 * UsersDynamoDriverBody is the body accepted to create a new `User`.
 */
export interface UsersDynamoDriverBody {
  /**
   * id is the unprefixed identifier of the `User`.
   */
  id: string;
  /**
   * username is the user's username
   */
  username: string;
  /**
   * provider represent the authentication provider used by this user.
   */
  provider: string;
  /**
   * email is the user's email.
   */
  email: string;
  /**
   * avatarURL is the URL for the user avatar.
   */
  avatarURL?: string;
  /**
   * name is the name of the user.
   */
  name?: string;
  /**
   * location represents the location of the user.
   */
  location?: string;
}
/**
 * UsersDynamoDriverItem is the interface that represent how the `Users`
 * items are stored in the table.
 */
export interface UsersDynamoDriverItem extends DynamoDriverItem {
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
  _m: UsersDynamoDriverProfile;
}
/**
 * UsersDynamoDriverProfile is the interface that represents a `User` profile.
 */
export type UsersDynamoDriverProfile = Omit<UsersDynamoDriverBody, "id" | "username" | "provider">
/**
 * UsersDynamoDriver handles the logic of `User` items inside a DynamoDB table.
 */
export class UsersDynamoDriver extends DynamoDriver<UsersDynamoDriverBody, UsersDynamoDriverItem, UsersDynamoDriverProfile> {
  /**
   * list returns a list of all the `Users` in the table.
   */
  async list(): Promise<UsersDynamoDriverItem[]> {
    const queryOutput: QueryCommandOutput = await this.db.send(new QueryCommand({
      TableName: this.tableName,
      IndexName: "byBranch",
      KeyConditionExpression: "#_b = :_b",
      ExpressionAttributeNames: { "#_b": "_b" },
      ExpressionAttributeValues: { ":_b": "Profile" },
    }))
    if (!queryOutput.Items) return []
    return queryOutput.Items as UsersDynamoDriverItem[]
  }
  /**
   * put inserts a new `User` in the table.
   */
  async put(pk: string, body: UsersDynamoDriverBody): Promise<boolean> {
    const putOutput: PutCommandOutput = await this.db.send(new PutCommand({
      TableName: this.tableName,
      Item: {
        pk,
        _b: "Profile",
        _n: body.username,
        _m: omit(body, "id", "username", "provider")
      },
      ConditionExpression: "attribute_not_exists(#pk)",
      ExpressionAttributeNames: { "#pk": "pk" },
    }))
    return putOutput.$metadata.httpStatusCode === 200
  }
  /**
   * update updates a `User` profile inside the table.
   */
  async update(pk: string, patch: UsersDynamoDriverProfile): Promise<boolean> {
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