import { DynamoClient } from "./dynamoClient.server"
import { UsersDynamoDriver, UsersDynamoDriverItem } from "../drivers/usersDynamoDriver.server"
import { User, UserObject } from "../models/user"

export type UserPatch = Pick<UserObject, "avatarURL" | "name" | "location">

export class UsersClient extends DynamoClient<User, undefined, UserObject, UsersDynamoDriverItem, UserPatch> {
  driver: UsersDynamoDriver
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
  toModel(item: UsersDynamoDriverItem): User {
    const [id, provider] = item.pk.split(".")
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
  toBody = (user: User): UserObject => user
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