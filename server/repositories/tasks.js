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
exports.repository = void 0;
const dynamodb_1 = require("../clients/dynamodb");
/**
 * TasksRepository manages Tasks through a standard interface.
 * @param config - Configuration object.
 */
class TasksRepository {
    constructor(config) {
        this.client = config.client;
    }
    /**
     * query returns a list of Tasks.
     */
    query(params = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error, data } = yield this.client.query(params);
            if (error)
                throw error;
            return data;
        });
    }
    /**
     * get returns a single Task identified by its `id`.
     * @param id - Task unique identifier.
     * @param userId - Task unique identifier.
     */
    get(id, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error, data } = yield this.client.get(id, userId);
            if (error)
                throw error;
            return data;
        });
    }
    /**
     * put stores a Task in the Repository.
     * @param task - Task to store in the Repository.
     */
    put(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error, data } = yield this.client.put(task);
            if (error)
                throw error;
            return data;
        });
    }
    /**
     * update updates a Task in the Repository.
     * @param task - Update Task to store
     */
    update(task) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.client.update(task);
            if (error)
                throw error;
            return undefined;
        });
    }
    /**
     * delete removes a Task from the repository
     * @param id - Task unique identifier.
     */
    delete(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const { error } = yield this.client.delete(id);
            if (error)
                throw error;
            return undefined;
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
            const response = yield this.client.after(id, branch, afterId, userId);
            if (response && response.error)
                throw response.error;
            return undefined;
        });
    }
}
exports.repository = new TasksRepository({ client: dynamodb_1.tasksDynamoDBClient });
//# sourceMappingURL=tasks.js.map