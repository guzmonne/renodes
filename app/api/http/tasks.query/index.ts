import arc from "@architect/functions"

import { json } from "../../shared/middleware/json"
import { collection } from "../../shared/middleware/hatoas"
import { withError } from "../../shared/middleware/withError"
import { repository } from "../../shared/repositories/tasks"
import { Task } from "../../shared/models/task"

const handler = async (req: any): Promise<undefined> => {
  const tasks = await repository.query()
  req.resource = "tasks"
  req.rel = "task"
  req.json = {items: tasks.map(Task.toObject)}
  return
}

exports.handler = arc.http.async(withError(handler), collection, json())