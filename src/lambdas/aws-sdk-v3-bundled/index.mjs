import runner from '@architect/shared/run.js'
const { run, DynamoDB, S3, IAM } = runner

export async function handler (event, context) {
  const commands = {}

  return await run({
    // DynamoDB
    importDynamoDB: async () => {
      const {
        DynamoDBClient,
        DynamoDBDocumentClient,
        GetCommand,
        PutCommand,
      } = await import('./aws-sdk-v3-dynamodb-bundle.js')
      commands.DynamoDBGetCommand = GetCommand
      commands.DynamoDBPutCommand = PutCommand
      return { DynamoDBClient, DynamoDBDocumentClient }
    },

    instantiateDynamoDB: async (clients) => {
      const { DynamoDBClient, DynamoDBDocumentClient } = clients
      const client = new DynamoDBClient({})
      const docClient = DynamoDBDocumentClient.from(client)
      return docClient
    },

    readDynamoDB: async (docClient) => {
      const { TableName, Key } = DynamoDB
      const command = new commands.DynamoDBGetCommand({ TableName, Key })
      return await docClient.send(command)
    },

    writeDynamoDB: async (docClient, Item) => {
      const { TableName } = DynamoDB
      const command = new commands.DynamoDBPutCommand({ TableName, Item })
      return await docClient.send(command)
    },

    // S3
    importS3: async () => {
      const {
        S3Client,
        GetObjectCommand,
        PutObjectCommand,
      } = await import('./aws-sdk-v3-s3-bundle.js')
      commands.S3GetObjectCommand = GetObjectCommand
      commands.S3PutObjectCommand = PutObjectCommand
      return S3Client
    },

    instantiateS3: async (S3Client) => {
      const client = new S3Client({})
      return client
    },

    readS3: async (client) => {
      const { Bucket, Key } = S3
      const command = new commands.S3GetObjectCommand({ Bucket, Key })
      const result = await client.send(command)
      const Body = await result.Body.transformToByteArray()
      return Body
    },

    writeS3: async (client, Body) => {
      const { Bucket, Key } = S3
      const command = new commands.S3PutObjectCommand({ Bucket, Key, Body })
      return await client.send(command)
    },

    // IAM
    importIAM: async () => {
      const {
        IAMClient,
        GetRoleCommand,
        UpdateRoleCommand,
      } = await import('./aws-sdk-v3-iam-bundle.js')
      commands.IAMGetRoleCommand = GetRoleCommand
      commands.IAMUpdateRoleCommand = UpdateRoleCommand
      return IAMClient
    },

    instantiateIAM: async (IAMClient) => {
      return new IAMClient({})
    },

    readIAM: async (client) => {
      const { RoleName } = IAM
      const command = new commands.IAMGetRoleCommand({ RoleName })
      await client.send(command)
    },

    writeIAM: async (client) => {
      const { RoleName, Description } = IAM
      const command = new commands.IAMUpdateRoleCommand({ RoleName,  Description: Description() })
      return await client.send(command)
    },
  }, context)
}
