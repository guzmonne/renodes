import { ulid } from 'ulid'

/**
 * TaskMeta is a plain JavaScript object that contains
 * metadata of the current Task.
 */
export interface TaskMeta {
  /**
   * isOpened is a flag used to track if the sub-tasks are opened.
   */
  isOpened?: boolean;
  /**
   * isInEditMode is a flag used to track if the task is in edit mode.
   */
  isInEditMode?: boolean;
}
/**
 * TaskBody is a plain JavaScript object representation of a Task.
 */
export interface TaskBody {
  /**
   * id is the unique identifier of the Task.
   */
  id: string;
  /**
   * content is the field use to hold the Task's content.
   */
  content: string;
  /**
   * userId is the unique identifier of the user that owns the Task.
   */
  userId?: string;
  /**
   * branch represents the branch that the Task belongs to.
   */
  branch?: string;
  /**
   * interpreter is the name of the interpreter that should render the Task
   */
  interpreter?: string;
  /**
   * meta is an object that can hold aditional information of the Task.
   */
  meta?: TaskMeta;
}
/**
 * TaskPatch is a partial interface of the TaskBody which include
 * only the attributes that can be patched on a Task.
 */
export type TaskPatch = Pick<Partial<TaskBody>, "content" | "interpreter">
/**
 * Task is the model representation of a task.
 * @param body - Object data to create a new Task.
 */
export class Task {
  constructor(body: any) {
    if (typeof body !== "object") throw new Error("'body' is invalid")
    this.object = Object.freeze({
      id: body.id || ulid(),
      content: body.content || "",
      branch: body.branch,
      userId: body.userId,
      interpreter: body.interpreter,
      meta: body.meta,
    })
  }
  /**
   * object stores an _freezed_ object representation of the model.
   */
  private object: TaskBody
  /**
   * collection creates a Task collection from a list of valid object values.
   * @param objects: List of objects to converto to a list of Tasks.
   */
  static collection(objects: any[]): Task[] {
    try {
      if (!objects) return []
      return objects.map((object: any) => new Task(object))
    } catch (err) {
      console.error(err)
      return []
    }
  }
  /**
   * Key getters.
   */
  get id() { return this.object.id }
  get content() { return this.object.content }
  get branch() { return this.object.branch }
  get userId() { return this.object.userId }
  get interpreter() { return this.object.interpreter }
  get meta() { return this.object.meta === undefined ? {} : this.object.meta }
  /**
   * toObject returns an object representation of the model.
   */
  static toObject = (task: Task): TaskBody => {
    return { ...task.object }
  }
  /**
   * set applies new updates to the model.
   * @param body - Update data to be applied.
   */
  set(body: any): Task {
    if (typeof body !== "object") throw new Error("`body` is not an object")
    return new Task({
      id: this.id,
      content: body.content !== undefined ? body.content : this.content,
      branch: this.branch,
      userId: this.userId,
      interpreter: body.interpreter || this.interpreter,
      meta: body.meta !== undefined
        ? { ...this.meta, ...body.meta }
        : this.object.meta,
    })
  }
}
/**
 * Functions
 */
/**
 * isTask is a helper function that verifies if an object is
 * an instance of Task.
 * @param object - Object to be checked.
 */
export function isTask(object: any): object is Task {
  return object instanceof Task
}