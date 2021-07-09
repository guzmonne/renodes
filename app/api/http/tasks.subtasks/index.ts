import arc from "@architect/functions"

import { json } from "../../shared/middleware/json"
import { collection } from "../../shared/middleware/hatoas"
import { withError } from "../../shared/middleware/withError"
import { repository } from "../../shared/repositories/tasks"
import { Task } from "../../shared/models/task"

const handler = async (req: any): Promise<undefined> => {
  const id = req.pathParameters.id
  const subTasks = await repository.query({parent: id})
  req.resource = "tasks"
  req.rel = "task"
  req.json = {items: subTasks.map(Task.toObject)}
  return
}

exports.handler = arc.http.async(withError(handler), collection, json())