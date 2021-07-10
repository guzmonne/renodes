"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.client = exports.dynamo = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const DB_ENDPOINT = process.env.DB_ENDPOINT;
const TABLE_NAME = process.env.TABLE_NAME;
const AWS_REGION = process.env.AWS_REGION || "us-east-1";
if (!TABLE_NAME)
    throw new Error("environment variable TABLE_NAME can't be undefined");
let config = {
    region: AWS_REGION,
};
if (DB_ENDPOINT) {
    config.endpoint = DB_ENDPOINT;
}
exports.dynamo = new client_dynamodb_1.DynamoDBClient(config);
exports.client = lib_dynamodb_1.DynamoDBDocumentClient.from(exports.dynamo, {
    marshallOptions: {
        removeUndefinedValues: true,
    }
});
//# sourceMappingURL=dynamo.js.map