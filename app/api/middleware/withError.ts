import type { HttpRequest, HttpResponse } from "@architect/functions"

export type HttpRequestHandler = (req: HttpRequest) => Promise<undefined>
/**
 * withError is a middleware function creator that takes an async
 * `handler` function and returns one that knows how to handle errors.
 * @param handler - Async Handler function to wrap.
 */
export const withError = (handler: HttpRequestHandler) => async (req: HttpRequest): Promise<HttpResponse|undefined> => {
  try {
    await handler(req)
  } catch(err) {
    console.error(err)
    return {
      statusCode: 400,
      json: {
        error: err.message
      }
    }
  }
}