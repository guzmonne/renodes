import { DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

const DB_ENDPOINT = process.env.DB_ENDPOINT
const TABLE_NAME = process.env.TABLE_NAME
const AWS_REGION = process.env.AWS_REGION || "us-east-1"

if (!TABLE_NAME) throw new Error("environment variable TABLE_NAME can't be undefined")

let config: DynamoDBClientConfig = {
  region: AWS_REGION,
}

if (DB_ENDPOINT) {
  config.endpoint = DB_ENDPOINT
}

export const client = DynamoDBDocumentClient.from(new DynamoDBClient(config), {
  marshallOptions: {
    removeUndefinedValues: true,
  }
})