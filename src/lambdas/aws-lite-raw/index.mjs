import { run, TableName, Key } from '@architect/shared/run.js'

export async function handler (event, context) {
  // Just for Lambda treeshaking
  // eslint-disable-next-line
  if (false) await import('@aws-lite/dynamodb')

  return await run({
    importDep: async () => {
      return (await import('@aws-lite/client')).default
    },

    instantiate: async (awsLite) => {
      return await awsLite({ plugins: [ import('@aws-lite/dynamodb') ] })
    },

    read: async (aws) => {
      return await aws.DynamoDB.GetItem({ TableName, Key })
    },

    write: async (aws, Item) => {
      return await aws.DynamoDB.PutItem({ TableName, Item })
    },
  }, context)

}
