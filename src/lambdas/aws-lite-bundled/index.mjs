import { run, TableName, Key } from '@architect/shared/run.js'
let dynamodb

export async function handler (event, context) {

  return await run({
    importDep: async () => {
      dynamodb = await import('./aws-lite-dynamodb-bundle.js')
      return (await import('./aws-lite-client-bundle.js')).default
    },

    instantiate: async (awsLite) => {
      return await awsLite({ plugins: [ dynamodb ] })
    },

    read: async (aws) => {
      return await aws.DynamoDB.GetItem({ TableName, Key })
    },

    write: async (aws, Item) => {
      return await aws.DynamoDB.PutItem({ TableName, Item })
    },
  }, context)

}
