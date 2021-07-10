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
exports.taskDocumentClient = exports.TaskDocumentClient = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamo_1 = require("./dynamo");
/**
 * TaskClient is an abstraction built to hide the DynamoDB
 * access patterns used to handle `Tasks` as a Linked List.
 * Is must be provided with a `DynamoDBDocumentClient`
 * instance upon creation, and the name of the table where
 * the `Tasks` will be stored.
 */
class TaskDocumentClient {
    /**
     * @param config - Configuration object
     */
    constructor(config) {
        this.tableName = config.tableName;
        this.client = config.client;
    }
    /**
     * get gets a single `Task` from the table identified by its pk.
     * @param pk - `Task` unique identifier.
     */
    get(pk) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.client.send(new lib_dynamodb_1.GetCommand({
                TableName: this.tableName,
                Key: { pk },
            }));
            return response.Item
                ? response.Item
                : undefined;
        });
    }
    /**
     * getPointingTo returns the `Task` item pointing to the
     * `Task` identified by its `sk` value.
     * @param pk - `Task` unique identifier.
     * @param branch - `Task` branch.
     */
    getPointingTo(pk, branch) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.client.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: "byNext",
                KeyConditionExpression: "#_b = :_b AND #_n = :_n",
                ExpressionAttributeNames: { "#_b": "_b", "#_n": "_n" },
                ExpressionAttributeValues: { ":_b": branch, ":_n": pk },
                Limit: 1,
            }));
            return response.Items && response.Items.length === 1
                ? response.Items[0]
                : undefined;
        });
    }
    /**
     * put inserts a new `Task` in the table. Every put is
     * done using a `ConditionExpression` that avoids replacing
     * an existing `Task` with a new one by checking if an
     * item already exist on the table with the same `pk`.
     * @param pk - `Task` unique identifier.
     * @param branch - `Task` branch.
     * @param item - `Task` item to be stored.
     */
    put(pk, branch, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const tail = yield this.getTail(branch);
            if (tail === undefined)
                return this.putFirst(pk, branch, item);
            const updatePromise = this.client.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { pk: tail.pk },
                UpdateExpression: "SET #_n = :new_n",
                ConditionExpression: "#_n = :_n",
                ExpressionAttributeNames: { "#_n": "_n" },
                ExpressionAttributeValues: { ":_n": tail._n, ":new_n": pk },
            }));
            const putPromise = this.client.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: { id: item.id, content: item.content, pk, _b: branch, _n: "." },
                ConditionExpression: "attribute_not_exists(#pk)",
                ExpressionAttributeNames: { "#pk": "pk" },
            }));
            const [updateOutput, putOutput] = yield Promise.all([updatePromise, putPromise]);
            return (updateOutput.$metadata.httpStatusCode === 200 &&
                putOutput.$metadata.httpStatusCode === 200);
        });
    }
    /**
     * putFirst creates the `head` item along the first `Task`
     * of a new branch.
     * @param pk - `Task` unique identifier.
     * @param branch - `Task` branch.
     * @param item - `Task` item to be stored.
     */
    putFirst(pk, branch, item) {
        return __awaiter(this, void 0, void 0, function* () {
            const putHeadPromise = this.client.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: { pk: "#" + branch, _b: branch, _n: pk },
                ConditionExpression: "attribute_not_exists(#pk)",
                ExpressionAttributeNames: { "#pk": "pk" },
            }));
            const putItemPromise = this.client.send(new lib_dynamodb_1.PutCommand({
                TableName: this.tableName,
                Item: { id: item.id, content: item.content, pk, _b: branch, _n: "." },
                ConditionExpression: "attribute_not_exists(#pk)",
                ExpressionAttributeNames: { "#pk": "pk" },
            }));
            const [putHeadOutput, putItemOutput] = yield Promise.all([putHeadPromise, putItemPromise]);
            return (putHeadOutput.$metadata.httpStatusCode === 200 &&
                putItemOutput.$metadata.httpStatusCode === 200);
        });
    }
    /**
     * getTail returns the current tail of the linked list. It should
     * always be the first element of the query since its sort attribute
     * should be set to a dot ("`.`").
     * @param branch - `Tasks` branch on which to search for the `tail`.
     */
    getTail(branch) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryOutput = yield this.client.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: "byNext",
                KeyConditionExpression: "#_b = :_b",
                ExpressionAttributeNames: { "#_b": "_b" },
                ExpressionAttributeValues: { ":_b": branch },
                Limit: 1,
            }));
            return queryOutput.Items && queryOutput.Items.length === 1
                ? queryOutput.Items[0]
                : undefined;
        });
    }
    /**
     * update update only some specific attributes of a `Task`.
     * @param pk - `Task` unique identifier.
     * @param patch - `Task` patch to be applied to the `item`.
     */
    update(pk, patch) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!patch.content)
                return true;
            const response = yield this.client.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { pk },
                UpdateExpression: "SET #content = :content",
                ExpressionAttributeNames: { "#content": "content" },
                ExpressionAttributeValues: { ":content": patch.content }
            }));
            return response.$metadata.httpStatusCode === 200;
        });
    }
    /**
     * delete deletes a single `Task` from the table identified by its key.
     * @param key - `Task` unique identifier.
     */
    delete(pk) {
        return __awaiter(this, void 0, void 0, function* () {
            const task = yield this.get(pk);
            if (task === undefined)
                return;
            const pointingToTask = yield this.getPointingTo(task.pk, task._b);
            // 1. Update `pointingToTask` to point to the `Task` currently
            //    being pointer by the `Task` to be deleted.
            const updatePromise = this.client.send(new lib_dynamodb_1.UpdateCommand({
                TableName: this.tableName,
                Key: { pk: pointingToTask.pk },
                UpdateExpression: "SET #_n = :_new_n",
                ConditionExpression: "#_n = :_n",
                ExpressionAttributeNames: { "#_n": "_n" },
                ExpressionAttributeValues: { ":_new_n": task._n, ":_n": pointingToTask._n },
            }));
            // 2. Delete the task.
            const deletePromise = this.client.send(new lib_dynamodb_1.DeleteCommand({
                TableName: this.tableName,
                Key: { pk: task.pk },
                ConditionExpression: "#_n = :_n",
                ExpressionAttributeNames: { "#_n": "_n" },
                ExpressionAttributeValues: { ":_n": task._n },
            }));
            // TODO: handle errors.
            yield Promise.all([updatePromise, deletePromise]);
        });
    }
    /**
     * list returns the list of `Tasks` under a `pk`.
     * @param branch - `Tasks` branch.
     */
    list(branch) {
        return __awaiter(this, void 0, void 0, function* () {
            const queryOutput = yield this.client.send(new lib_dynamodb_1.QueryCommand({
                TableName: this.tableName,
                IndexName: "byBranch",
                KeyConditionExpression: "#_b = :_b",
                ExpressionAttributeNames: { "#_b": "_b" },
                ExpressionAttributeValues: { ":_b": branch },
            }));
            if (!queryOutput.Items || queryOutput.Items.length === 0)
                return [];
            const [head, ...items] = queryOutput.Items;
            return this.follow(head, items);
        });
    }
    /**
     * follow is a function that takes a `HEAD` item and a list
     * of `Task` items and returns another list ordered according
     * to its `_n` attribute, starting from the item indicated
     * by the `HEAD` item.
     * @param head - `HEAD` item from which to get the first item of the list.
     * @param items - List of `Task` items to be ordered.
     */
    follow(head, items) {
        const map = new Map();
        const result = [];
        const remaining = [];
        // First pass, we create the `sk` to `item` map, plus start
        // populating the `result` list.
        items.forEach((item, index) => {
            map.set(item.pk, item);
            if (item.pk === head._n) {
                result.push(item);
                head = item;
            }
            else {
                remaining.push(item);
            }
        });
        // Second pass, we iterate over the remaining items until
        // we complete the list.
        remaining.forEach(() => {
            head = map.get(head._n);
            result.push(head);
        });
        return result;
    }
    /**
     * drag allows to move a `Task` from its current position to a
     * new one.
     * @param fromKey - `Task` to be moved identified by its key.
     * @param branch - `Tasks` branch.
     * @param afterKey - New position of the `Tasks` identifie by the key
     *                   of the `Task` currently in that position.
     */
    drag(fromPK, branch, afterPK) {
        return __awaiter(this, void 0, void 0, function* () {
            const [from, after, $from] = yield Promise.all([
                this.get(fromPK),
                this.get(afterPK || "#" + branch),
                this.getPointingTo(fromPK, branch),
            ]);
            if (!from || !after || !$from)
                return false;
            if (after._n === from.pk)
                return true;
            const [updateFromOutput, updateAfterOutput, update$FromOutput] = yield Promise.all([
                this.client.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: this.tableName,
                    Key: { pk: from.pk },
                    UpdateExpression: "SET #_n = :_n",
                    ExpressionAttributeNames: { "#_n": "_n" },
                    ExpressionAttributeValues: { ":_n": after._n },
                })),
                this.client.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: this.tableName,
                    Key: { pk: after.pk },
                    UpdateExpression: "SET #_n = :_n",
                    ExpressionAttributeNames: { "#_n": "_n" },
                    ExpressionAttributeValues: { ":_n": from.pk },
                })),
                this.client.send(new lib_dynamodb_1.UpdateCommand({
                    TableName: this.tableName,
                    Key: { pk: $from.pk },
                    UpdateExpression: "SET #_n = :_n",
                    ExpressionAttributeNames: { "#_n": "_n" },
                    ExpressionAttributeValues: { ":_n": from._n },
                }))
            ]);
            return (updateFromOutput.$metadata.httpStatusCode === 200 &&
                updateAfterOutput.$metadata.httpStatusCode === 200 &&
                update$FromOutput.$metadata.httpStatusCode === 200);
        });
    }
}
exports.TaskDocumentClient = TaskDocumentClient;
/**
 * taskDocumentClient is a singleton `TaskDocumentClient`
 * connected to a DynamoDB table using the default app
 * `dynamo document client`.
 */
exports.taskDocumentClient = new TaskDocumentClient({
    tableName: process.env.TABLE_NAME || "retask",
    client: dynamo_1.client,
});
//# sourceMappingURL=taskDocumentClient.js.map