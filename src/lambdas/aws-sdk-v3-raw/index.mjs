import { run, TableName, Key } from '@architect/shared/run.js'

export async function handler (event, context) {
  const commands = {}

  return await run({
    importDep: async () => {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
      const { DynamoDBDocumentClient, GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb')
      commands.GetCommand = GetCommand
      commands.PutCommand = PutCommand
      return { DynamoDBClient, DynamoDBDocumentClient }
    },

    instantiate: async (clients) => {
      const { DynamoDBClient, DynamoDBDocumentClient } = clients
      const client = new DynamoDBClient({})
      const docClient = DynamoDBDocumentClient.from(client)
      return docClient
    },

    read: async (docClient) => {
      const command = new commands.GetCommand({ TableName, Key })
      return await docClient.send(command)
    },

    write: async (docClient, Item) => {
      const command = new commands.PutCommand({ TableName, Item })
      return await docClient.send(command)
    },
  }, context)

}
