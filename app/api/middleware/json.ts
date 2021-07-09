import type { HttpResponse } from "@architect/functions"

/**
 * json is a middleware creator that returns an HttpHandler function that
 * returns json with the provided `statusCode`.
 */
export const json = (statusCode: number = 200) => async (req: any): Promise<HttpResponse> => {
  return {
    statusCode,
    json: req.json
  }
}