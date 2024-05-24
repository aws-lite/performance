let { run, DynamoDB, S3 } = require('@architect/shared/run.js')

exports.handler = async function handler (event, context) {

  return await run({
    // DynamoDB
    importDynamoDB: async () => {
      const dynamo = require('aws-sdk/clients/dynamodb')
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
      const s3 = require('aws-sdk/clients/s3')
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
    },
  }, context)
}
