import { User } from "../models/user"
import { client } from "../clients/usersClient.server"
import { Repository } from "./repository.server"
import type { UsersClient } from "../clients/usersClient.server"

class UsersRepository extends Repository<User, undefined> {
  /**
   * client is an instance of the UsersClient class used to interact
   * with the database.
   */
  client: UsersClient
}
/**
 * repository is a pre-configured instance of the class UsersRepository.
 */
export const repository = new UsersRepository(client)
