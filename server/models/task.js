"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Task = void 0;
const ulid_1 = require("ulid");
/**
 * Task is the model representation of a task.
 * @param body - Object data to create a new Task.
 */
class Task {
    constructor(body) {
        if (typeof body !== "object")
            throw new Error("'body' is invalid");
        if (!body.content)
            throw new Error("'content' is undefined");
        this.object = {
            id: body.id || ulid_1.ulid(),
            content: body.content,
            branch: body.branch,
            userId: body.userId,
        };
    }
    /**
     * collection creates a Task collection from a list of valid object values.
     * @param objects: List of objects to converto to a list of Tasks.
     */
    static collection(objects) {
        try {
            return objects.map((object) => new Task(object));
        }
        catch (err) {
            console.error(err);
            return [];
        }
    }
    /**
     * Key getters.
     */
    get id() { return this.object.id; }
    get content() { return this.object.content; }
    get branch() { return this.object.branch; }
    get userId() { return this.object.userId; }
    /**
     * set applies new updates to the model.
     * @param body - Update data to be applied.
     */
    set(body) {
        if (typeof body !== "object")
            throw new Error("`body` is not an object");
        return new Task({
            id: this.id,
            content: body.content || this.content,
            branch: this.branch,
            userId: this.userId,
        });
    }
}
exports.Task = Task;
/**
 * toJSON returns an object representation of the model.
 */
Task.toJSON = (task) => {
    return Object.assign({}, task.object);
};
//# sourceMappingURL=task.js.map