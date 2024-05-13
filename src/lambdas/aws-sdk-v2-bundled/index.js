let { run, TableName, Key } = require('@architect/shared/run.js')

exports.handler = async function handler (event, context) {

  return await run({
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
      return await docClient.get({ TableName, Key }).promise()
    },

    writeDynamoDB: async (docClient, Item) => {
      return await docClient.put({ TableName, Item }).promise()
    },
  }, context)

}
