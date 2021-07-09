import arc from "@architect/functions"

import { withError } from "../../shared/middleware/withError"
import { repository } from "../../shared/repositories/tasks"

const handler = async (req: any): Promise<undefined> => {
  await repository.delete(req.pathParameters.id)
  return
}

exports.handler = arc.http.async(withError(handler))
