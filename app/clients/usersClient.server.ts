import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

import { Client } from "./client.server"
import { driver } from "../drivers/usersDynamoDriver.server"
import { User, UserBody } from "../models/user"
import type { UsersDynamoDriver, UserItem } from "../drivers/usersDynamoDriver.server"

export type UserPatch = Pick<UserBody, "avatarURL" | "name" | "location">

export class UsersClient extends Client<User, undefined, UserBody, UserItem, UserPatch, DynamoDBDocumentClient> {
  /**
   * driver is the interface to be used agains a DynamoDB table.
   */
  driver: UsersDynamoDriver = driver
  /**
   * createPK returns a valid Primary Key from the id and the provider
   */
  createPK(id?: string, provider: string = "github") {
    if (!id) throw new Error("id can't be undefined")
    return `${id}.${provider}`
  }
  /**
   * toModel turns an item returned from DynamoDB into a model.
   * @param item - Item returned from the database.
   */
  toModel(item: UserItem): User {
    const [id, provider] = item.pk.split(".")
    if (!id || !provider) throw new Error("unable to create a model from the item")
    return new User({
      id,
      provider,
      username: item._n,
      ...item._m,
    })
  }
  /**
   * toBody converts a User into a valid body value.
   * @param user - User model to convert
   */
  toBody = (user: User): UserBody => user.toObject()
  /**
   * toPatch converts a User into a valid patch value.
   * @param user - User model to convert
   */
  toPatch = (user: User): UserPatch => ({
    avatarURL: user.avatarURL,
    location: user.location,
    name: user.name
  })
}
/**
 * client is a preconfigured instance of the UsersClient class.
 */
export const client = new UsersClient()