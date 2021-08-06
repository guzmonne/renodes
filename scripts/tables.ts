import { CreateTableCommand, DeleteTableCommand, DynamoDBClient, DynamoDBClientConfig } from "@aws-sdk/client-dynamodb"
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"

import schema from "../schema.json"
/**
 * DynamoDB configuration
 */
const DB_ENDPOINT = process.env.DB_ENDPOINT || "http://dynamodb:8000"
const TABLE_NAME = process.env.TABLE_NAME || "renodes-test"
const AWS_REGION = process.env.AWS_REGION || "us-east-1"

if (!TABLE_NAME) throw new Error("environment variable TABLE_NAME can't be undefined")

let config: DynamoDBClientConfig = {
  region: AWS_REGION,
}

if (DB_ENDPOINT) {
  config.endpoint = DB_ENDPOINT
}

const db = DynamoDBDocumentClient.from(new DynamoDBClient(config), {
  marshallOptions: {
    removeUndefinedValues: true,
  }
})
/**
 * Main
 */
main()
  .then(console.log)
  .catch(console.error)
/**
 * Functions
 */
/**
 * main is the function that will be called when running the script.
 */
async function main(): Promise<string> {
  const args = process.argv.slice(2)
  switch (args[0]) {
    case "create":
      return createTable()
    case "delete":
      return deleteTable()
    case "reset":
      const deleteResult = await deleteTable()
      const createResult = await createTable()
      return [deleteResult, createResult].join("\n")
    default:
      return "Invalid Command"
  }
}
/**
 * createTable creates a new DynamoDB table
 */
async function createTable(): Promise<string> {
  try {
    await db.send(new CreateTableCommand({
      ...schema,
      TableName: TABLE_NAME,
    }))
    return "Table created successfuly"
  } catch (err) {
    console.error(err)
    return "Couldn't create the table"
  }
}
/**
 * deleteTable deletes a new DynamoDB table
 */
async function deleteTable(): Promise<string> {
  try {
    await db.send(new DeleteTableCommand({
      TableName: TABLE_NAME,
    }))
    return "Table deleted successfuly"
  } catch (err) {
    console.error(err)
    return "Couldn't delete the table"
  }
}