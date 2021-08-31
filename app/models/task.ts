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
   * parent represents the parent that the Task belongs to.
   */
  parent?: string;
  /**
   * interpreter is the name of the interpreter that should render the Task
   */
  interpreter?: string;
  /**
   * collection are the Tasks that were created with this Task as their parent.
   */
  collection?: TaskBody[];
  /**
   * meta is an object that can hold aditional information of the Task.
   */
  meta?: TaskMeta;
}
/**
 * TaskPatch is a partial interface of the TaskBody which include
 * only the attributes that can be patched on a Task.
 */
export type TaskPatch = Pick<Partial<TaskBody>, "content" | "interpreter" | "meta">
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
      parent: body.parent,
      userId: body.userId,
      interpreter: body.interpreter,
      meta: body.meta,
    })
    if (body.collection) this.collection = body.collection
  }
  /**
   * object stores an _freezed_ object representation of the model.
   */
  private object: TaskBody
  /**
   * Key getters.
   */
  get id() { return this.object.id }
  get content() { return this.object.content }
  get parent() { return this.object.parent }
  get userId() { return this.object.userId }
  get interpreter() { return this.object.interpreter }
  get meta() { return this.object.meta === undefined ? {} : this.object.meta }
  /**
   * toObject returns an object representation of the model.
   */
  toObject(): TaskBody {
    return {
      ...this.object,
      collection: this._collection.map(task => task.toObject())
    }
  }
  /**
   * _collection holds the sub-tasks associated with this task.
   */
  private _collection: Task[] = [];
  /**
   * collection getter
   */
  get collection(): Task[] {
    return [...this._collection]
  }
  /**
   * collection setter
   */
  set collection(objects: any[]) {
    this._collection = objects.map(object => (
      isTask(object) ? object : new Task(object)
    ))
  }

  add(task: Task, afterId?: string): Task {
    if (afterId === undefined) return this.set({ collection: [...this.collection, task] })
    const index = this.collection.findIndex(t => t.id === afterId)
    if (index === -1) return this.set({ collection: [...this.collection, task] })
    const afterTask = this.collection[index]
    return this.set({
      collection: [...this.collection.slice(0, index), afterTask, task, ...this.collection.slice(index + 1)]
    })
  }

  find(id: string): Task | undefined {
    if (id === this.id) return this
    let task: Task | undefined
    for (let t of this.collection) {
      task = t.find(id)
    }
    return task
  }

  addTo(parent: string, task: Task, afterId?: string): Task {
    // If the parent is the current task, create a new one with an updated collection.
    if (parent === this.id) return this.add(task, afterId)
    // Else, we need to find the parent
    const parentTask = this.find(parent)



    // Else, we look recursively inside our collection until we find the parent.
    for (let [index, t] of this.collection.entries()) {
      if (t.id === parent) return this.set({
        collection: [...this.collection.slice(0, index), t.add(task, afterId), ...this.collection.slice(index + 1)]
      })
    }
    return this
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
      parent: body.parent || this.parent,
      userId: this.userId,
      interpreter: body.interpreter || this.interpreter,
      collection: body.collection || this.collection,
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