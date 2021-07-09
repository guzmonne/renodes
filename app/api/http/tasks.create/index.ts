import arc from "@architect/functions"

import { json } from "../../shared/middleware/json"
import { model } from "../../shared/middleware/hatoas"
import { withError } from "../../shared/middleware/withError"
import { repository } from "../../shared/repositories/tasks"
import { Task } from "../../shared/models/task"

const handler = async (req: any): Promise<undefined> => {
  const task = await repository.put(new Task(req.body))
  req.resource = "tasks"
  req.rel = "task"
  req.json = {item: Task.toObject(task)}
  return
}

exports.handler = arc.http.async(withError(handler), model, json())