import arc from "@architect/functions"

import { withError } from "../../shared/middleware/withError"
import { repository } from "../../shared/repositories/tasks"

const handler = async (req: any): Promise<any> => {
  const {id, index} = req.pathParameters
  await repository.drag(id, parseInt(index, 10))
  return {
    statusCode: 204,
  }
}

exports.handler = arc.http.async(withError(handler))