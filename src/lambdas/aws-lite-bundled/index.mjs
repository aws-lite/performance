import runner from '@architect/shared/run.js'
const { run, DynamoDB, S3 } = runner

export async function handler (event, context) {
  const plugins = {}

  return await run({
    // DynamoDB
    importDynamoDB: async () => {
      plugins.DynamoDB = await import('./aws-lite-dynamodb-bundle.js')
      return (await import('./aws-lite-client-bundle.js')).default
    },

    instantiateDynamoDB: async (awsLite) => {
      return await awsLite({ plugins: [ plugins.DynamoDB ] })
    },

    readDynamoDB: async (aws) => {
      const { TableName, Key } = DynamoDB
      return await aws.DynamoDB.GetItem({ TableName, Key })
    },

    writeDynamoDB: async (aws, Item) => {
      const { TableName } = DynamoDB
      return await aws.DynamoDB.PutItem({ TableName, Item })
    },

    // S3
    importS3: async () => {
      plugins.S3 = await import('./aws-lite-s3-bundle.js')
      return (await import('./aws-lite-client-bundle.js')).default
    },

    instantiateS3: async (awsLite) => {
      return await awsLite({ plugins: [ plugins.S3 ] })
    },

    readS3: async (aws) => {
      const { Bucket, Key } = S3
      const result = await aws.S3.GetObject({ Bucket, Key })
      return result.Body
    },

    writeS3: async (aws, Body) => {
      const { Bucket, Key } = S3
      return await aws.S3.PutObject({ Bucket, Key, Body })
    },
  }, context)
}
