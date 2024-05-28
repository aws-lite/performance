import runner from '@architect/shared/run.js'
const { run, DynamoDB, S3, IAM, CloudFormation, Lambda } = runner

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

    // CloudFormation
    importCloudFormation: async () => {
      const {
        CloudFormationClient,
        ListStackResourcesCommand,
        UpdateTerminationProtectionCommand,
      } = await import('./aws-sdk-v3-cloudformation-bundle.js')
      commands.CloudFormationListStackResourcesCommand = ListStackResourcesCommand
      commands.CloudFormationUpdateTerminationProtectionCommand = UpdateTerminationProtectionCommand
      return CloudFormationClient
    },
    instantiateCloudFormation: async (CloudFormationClient) => {
      return new CloudFormationClient({})
    },
    readCloudFormation: async (client) => {
      const { StackName } = CloudFormation
      const command = new commands.CloudFormationListStackResourcesCommand({ StackName })
      return await client.send(command)
    },
    writeCloudFormation: async (client) => {
      const { StackName } = CloudFormation
      const command = new commands.CloudFormationUpdateTerminationProtectionCommand({ StackName, EnableTerminationProtection: false })
      return await client.send(command)
    },

    // Lambda
    importLambda: async () => {
      const {
        LambdaClient,
        GetFunctionConfigurationCommand,
        UpdateFunctionConfigurationCommand,
      } = await import('./aws-sdk-v3-lambda-bundle.js')
      commands.LambdaGetFunctionConfigurationCommand = GetFunctionConfigurationCommand
      commands.LambdaUpdateFunctionConfigurationCommand = UpdateFunctionConfigurationCommand
      return LambdaClient
    },
    instantiateLambda: async (lambda) => {
      return new lambda({})
    },
    readLambda: async (client) => {
      const { FunctionName } = Lambda
      const command = new commands.LambdaGetFunctionConfigurationCommand({ FunctionName })
      return await client.send(command)
    },
    writeLambda: async (client) => {
      const { FunctionName, Description } = Lambda
      const command = new commands.LambdaUpdateFunctionConfigurationCommand({ FunctionName, Description: Description() })
      return await client.send(command)
    },
  }, context)
}
