let { run, DynamoDB, S3, IAM } = require('@architect/shared/run.js')

exports.handler = async function handler (event, context) {

  return await run({
    // DynamoDB
    importDynamoDB: async () => {
      const dynamo = require('./aws-sdk-v2-dynamodb-bundle.js')
      return dynamo
    },

    instantiateDynamoDB: async (dynamo) => {
      const Doc = dynamo.DocumentClient
      const docClient = new Doc()
      return docClient
    },

    readDynamoDB: async (docClient) => {
      const { TableName, Key } = DynamoDB
      return await docClient.get({ TableName, Key }).promise()
    },

    writeDynamoDB: async (docClient, Item) => {
      const { TableName } = DynamoDB
      return await docClient.put({ TableName, Item }).promise()
    },

    // S3
    importS3: async () => {
      const s3 = require('./aws-sdk-v2-s3-bundle.js')
      return s3
    },

    instantiateS3: async (s3) => {
      return new s3()
    },

    readS3: async (S3Client) => {
      const { Bucket, Key } = S3
      const result = await S3Client.getObject({ Bucket, Key }).promise()
      return result.Body
    },

    writeS3: async (S3Client, Body) => {
      const { Bucket, Key } = S3
      return await S3Client.putObject({ Bucket, Key, Body }).promise()
    },

    // IAM
    importIAM: async () => {
      const iam = require('./aws-sdk-v2-iam-bundle.js')
      return iam
    },

    instantiateIAM: async (iam) => {
      return new iam()
    },

    readIAM: async (IAMClient) => {
      const { RoleName } = IAM
      await IAMClient.getRole({ RoleName }).promise()
    },

    writeIAM: async (IAMClient) => {
      const { RoleName, Description } = IAM
      return await IAMClient.updateRole({ RoleName, Description: Description() }).promise()
    },
  }, context)
}
