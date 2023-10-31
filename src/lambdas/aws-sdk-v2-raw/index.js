let { run, TableName, Key } = require('@architect/shared/run.js')

exports.handler = async function handler (event, context) {

  return await run({
    importDep: async () => {
      const dynamo = require('aws-sdk/clients/dynamodb')
      return dynamo
    },

    instantiate: async (dynamo) => {
      const Doc = dynamo.DocumentClient
      const docClient = new Doc()
      return docClient
    },

    read: async (docClient) => {
      return await docClient.get({ TableName, Key }).promise()
    },

    write: async (docClient, Item) => {
      return await docClient.put({ TableName, Item }).promise()
    },
  }, context)

}
