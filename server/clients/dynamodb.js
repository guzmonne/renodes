"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksDynamoDBClient = exports.TaskDynamoDBClient = void 0;
const taskDocumentClient_1 = require("./taskDocumentClient");
const task_1 = require("../models/task");
/**
 * TaskDynamoDBClient handles communication with the DynamoDB table.
 * @param config - Configuration object.
 */
class TaskDynamoDBClient {
    constructor(config) {
        this.client = config.client;
    }
    /**
     * toTask converts a TaskDocumentClientItem into a Task object.
     * @param TaskDynamoDBObject - DynamoDB response to convert.
     */
    toTask(object) {
        const splitedBranch = object._b.split("#");
        return new task_1.Task({
            id: object.id,
            content: object.content,
            branch: splitedBranch.length === 1 ? undefined : splitedBranch.slice(-1)[0],
        });
    }
    /**
     * createPK creates a valid `pk` for the current schema
     * of the DynamoDB table.
     * @param id - Unique identifier of the `Item`.
     * @param userId - Unique identifier of the user.
     */
    createPK(id, userId) {
        return [userId, "Tasks", id].filter(x => x !== undefined).join("#");
    }
    /**
     * query returns a collection of Tasks.
     */
    query({ branch, userId }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pk = this.createPK(branch, userId);
                const items = yield this.client.list(pk);
                return { data: items.map(this.toTask) };
            }
            catch (err) {
                return { error: err.message };
            }
        });
    }
    /**
     * get returns a Task identified by its `id`.
     * @param id - `Task` unique identifier.
     * @param userId - User unique identifier.
     */
    get(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pk = this.createPK(id, userId);
                const item = yield this.client.get(pk);
                return { data: new task_1.Task(item) };
            }
            catch (err) {
                return { error: err.message };
            }
        });
    }
    /**
     * put creates or updates a Task in the table.
     * @param task - `Task` to store.
     */
    put(task) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pk = this.createPK(task.id);
                const _b = this.createPK(task.branch);
                const ok = yield this.client.put(pk, _b, task);
                if (!ok)
                    throw new Error(`error while storing task with pk = ${pk} at branch = ${_b}`);
                return { data: task };
            }
            catch (err) {
                return { error: err.message };
            }
        });
    }
    /**
     * update updates a `Task` in the table.
     * @param task - Updated `Task` to store
     */
    update(task) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pk = this.createPK(task.id);
                const ok = yield this.client.update(pk, task);
                if (!ok)
                    throw new Error(`error while updating task with pk = ${pk}`);
                return {};
            }
            catch (err) {
                return { error: err.message };
            }
        });
    }
    /**
     * delete deletes an Task from the table.
     * @param id - `Task` unique identifier.
     * @param userId - User unique identifier.
     */
    delete(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pk = this.createPK(id, userId);
                const ok = yield this.client.delete(pk);
                if (!ok)
                    throw new Error(`error while deleting task with pk = ${pk}`);
                return {};
            }
            catch (err) {
                return { error: err.message };
            }
        });
    }
    /**
     * after drops a `Task` to the position after another `Task`. If
     * `after` is `undefined` then the `Task` should be dragged to
     * the beginning of the list.
     * @param id - Task unique identifier.
     * @param branch - Task branch.
     * @param afterId - Unique identifier of the `Task` after which the
     *                `Task` must be positioned after.
     * @param userId - User unique identifier.
     */
    after(id, branch, afterId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const pk = this.createPK(id, userId);
                const _b = this.createPK(branch, userId);
                const apk = this.createPK(afterId, userId);
                const ok = yield this.client.drag(pk, _b, apk);
                if (!ok)
                    throw new Error(`couldn't move task with id = ${id} after task with id ${afterId}`);
                return {};
            }
            catch (err) {
                return { error: err.message };
            }
        });
    }
}
exports.TaskDynamoDBClient = TaskDynamoDBClient;
/**
 * tasksDynamoDBClient is a singleton instance of the TaskDynamoDBClient class.
 */
exports.tasksDynamoDBClient = new TaskDynamoDBClient({
    client: taskDocumentClient_1.taskDocumentClient
});
//# sourceMappingURL=dynamodb.js.map