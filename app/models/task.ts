import { ulid } from 'ulid'

/**
 * TaskObject is a plain JavaScript object representation of a Task.
 */
export interface TaskObject {
  id: string;
  content: string;
  userId?: string;
  branch?: string;
  conga?: number;
}
/**
 * Task is the model representation of a task.
 * @param body - Object data to create a new Task.
 */
export class Task {
  constructor(body: any) {
    if (typeof body !== "object") throw new Error("'body' is invalid")
    if (!body.content) throw new Error("'content' is undefined")
    this.object = {
      id     : body.id || ulid(),
      content: body.content,
      branch : body.branch,
      userId : body.userId,
      conga :  1
    }
  }
  /**
   * object stores an _freezed_ object representation of the model.
   */
  private object: TaskObject
  /**
   * collection creates a Task collection from a list of valid object values.
   * @param objects: List of objects to converto to a list of Tasks.
   */
  static collection(objects: any[]): Task[] {
    try {
      return objects.map((object: any) => new Task(object))
    } catch (err) {
      console.error(err)
      return []
    }
  }
  /**
   * Key getters.
   */
  get id()      { return this.object.id }
  get content() { return this.object.content }
  get branch()  { return this.object.branch }
  get userId()  { return this.object.userId }
  /**
   * toJSON returns an object representation of the model.
   */
  static toJSON = (task: Task): TaskObject => {
    return {...task.object}
  }
  /**
   * set applies new updates to the model.
   * @param body - Update data to be applied.
   */
  set(body: any): Task {
    if (typeof body !== "object") throw new Error("`body` is not an object")
    return new Task({
      id     : this.id,
      content: body.content || this.content,
      branch : this.branch,
      userId : this.userId,
    })
  }
}
// something new