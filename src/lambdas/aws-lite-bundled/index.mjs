import { run, TableName, Key } from '@architect/shared/run.js'
let dynamodb

export async function handler (event, context) {
  return await run({
    importDynamoDB: async () => {
      dynamodb = await import('./aws-lite-dynamodb-bundle.js')
      return (await import('./aws-lite-client-bundle.js')).default
    },

    instantiateDynamoDB: async (awsLite) => {
      return await awsLite({ plugins: [ dynamodb ] })
    },

    readDynamoDB: async (aws) => {
      return await aws.DynamoDB.GetItem({ TableName, Key })
    },

    writeDynamoDB: async (aws, Item) => {
      return await aws.DynamoDB.PutItem({ TableName, Item })
    },
  }, context)

}
