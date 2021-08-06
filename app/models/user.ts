export interface UserObject {
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
 * User is the model representation of a user.
 * @param body - Object from which the model will be created.
 */
export class User {
  /**
   * object stores an _freezed_ object representation of the model.
   */
  private object: UserObject
  /**
   * constructor is called when a new User instance is created.
   * @param body - B
   */
  constructor(body: any) {
    if (typeof body !== "object" || !body.id || !body.username || !body.provider || !body.email) throw new Error("'body' is invalid")
    this.object = {
      id: body.id,
      username: body.username,
      provider: body.provider,
      email: body.email,
      avatarURL: body.avatarURL,
      name: body.name,
      location: body.location,
    }
  }
  /**
   * collection creates a User collection from a list of valid object values.
   * @param objects: List of objects to converto to a list of Users.
   */
  static collection(objects: any[]): User[] {
    try {
      return objects.map((object: any) => new User(object))
    } catch (err) {
      console.error(err)
      return []
    }
  }
  /**
   * Key getters.
   */
  get id() { return this.object.id }
  get username() { return this.object.username }
  get provider() { return this.object.provider }
  get email() { return this.object.email }
  get avatarURL() { return this.object.avatarURL }
  get name() { return this.object.name }
  get location() { return this.object.location }
  /**
   * toJSON returns an object representation of the model.
   */
  toJSON = (): UserObject => ({ ...this.object })
  /**
   * toString returns the User serialized as JSON.
   */
  toString = (indent = true): string => JSON.stringify(this.object, null, indent ? 2 : 0)
  /**
   * set applies new updates to the model.
   * @param body - Update data to be applied.
   */
  set(body: any): User {
    if (typeof body !== "object") throw new Error("`body` is not an object")
    return new User({
      id: this.id,
      username: this.username,
      provider: this.provider,
      email: this.email,
      avatarURL: body.avatarURL || this.avatarURL,
      name: body.name || this.name,
      location: body.location || this.location,
    })
  }
}