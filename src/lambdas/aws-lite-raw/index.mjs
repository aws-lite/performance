import { run, TableName, Key } from '@architect/shared/run.js'

export async function handler (event, context) {

  return await run({
    importDep: async () => {
      await import('@aws-lite/dynamodb') // Just for Lambda treeshaking
      return (await import('@aws-lite/client')).default
    },

    instantiate: async (awsLite) => {
      return await awsLite()
    },

    read: async (aws) => {
      return await aws.DynamoDB.GetItem({ TableName, Key })
    },

    write: async (aws, Item) => {
      return await aws.DynamoDB.PutItem({ TableName, Item })
    },
  }, context)

}
