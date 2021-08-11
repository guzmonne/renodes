
/**
 * Errors
 */
/**
 * InvalidSubClaimError is the error that should be thrown when a user's token
 * `sub` claim is invalid.
 */
export class InvalidSubClaimError extends Error {
  /**
   * name represents the error name
   */
  name: string = "InvalidSubClaimError"
  /**
   * constructor creates a new class instance.
   * @param message - Message that overrides default message.
   */
  constructor(message: string = "invalid sub claim") {
    super(message)
  }
}
/**
 * UndefinedTokenError is the error that should be thrown when a token can't
 * be found on the user session.
 */
export class UndefinedTokenError extends Error {
  /**
   * name represents the error name
   */
  name: string = "UndefinedTokenError"
  /**
   * constructor creates a new class instance.
   * @param message - Message that overrides default message.
   */
  constructor(message: string = "undefined token") {
    super(message)
  }
}
/**
 * ModelNotFound is the error that should be thrown when a token can't
 * be found on the user session.
 */
export class ModelNotFoundError extends Error {
  /**
   * name represents the error name
   */
  name: string = "ModelNotFound"
  /**
   * constructor creates a new class instance.
   * @param message - Message that overrides default message.
   */
  constructor(message: string = "model not found") {
    super(message)
  }
}