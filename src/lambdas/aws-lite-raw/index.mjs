import runner from '@architect/shared/run.js'
const { run, DynamoDB, S3, IAM } = runner

export async function handler (event, context) {
  const plugins = {}

  return await run({
    // DynamoDB
    importDynamoDB: async () => {
      plugins.DynamoDB = await import('@aws-lite/dynamodb')
      return (await import('@aws-lite/client')).default
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
      plugins.S3 = await import('@aws-lite/s3')
      return (await import('@aws-lite/client')).default
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

    // IAM
    importIAM: async () => {
      plugins.IAM = await import('@aws-lite/iam')
      return (await import('@aws-lite/client')).default
    },

    instantiateIAM: async (awsLite) => {
      return await awsLite({ plugins: [ plugins.IAM ] })
    },

    readIAM: async (aws) => {
      const { RoleName } = IAM
      await aws.IAM.GetRole({ RoleName })
    },

    writeIAM: async (aws) => {
      const { RoleName, Description } = IAM
      return await aws.IAM.UpdateRole({ RoleName, Description: Description() })
    },
  }, context)
}
