let { run, DynamoDB, S3, IAM, CloudFormation, Lambda } = require('@architect/shared/run.js')

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

    // IAM
    importIAM: async () => {
      const iam = require('aws-sdk/clients/iam')
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

    // CloudFormation
    importCloudFormation: async () => {
      const cloudformation = require('aws-sdk/clients/cloudformation')
      return cloudformation
    },
    instantiateCloudFormation: async (cfn) => {
      return new cfn()
    },
    readCloudFormation: async (CloudFormationClient) => {
      const { StackName } = CloudFormation
      await CloudFormationClient.listStackResources({ StackName }).promise()
    },
    writeCloudFormation: async (CloudFormationClient) => {
      const { StackName } = CloudFormation
      return await CloudFormationClient.updateTerminationProtection({ StackName, EnableTerminationProtection: false }).promise()
    },

    // Lambda
    importLambda: async () => {
      const lambda = require('aws-sdk/clients/lambda')
      return lambda
    },
    instantiateLambda: async (lambda) => {
      return new lambda()
    },
    readLambda: async (LambdaClient) => {
      const { FunctionName } = Lambda
      await LambdaClient.getFunctionConfiguration({ FunctionName }).promise()
    },
    writeLambda: async (LambdaClient) => {
      const { FunctionName, Description } = Lambda
      return await LambdaClient.updateFunctionConfiguration({ FunctionName, Description: Description() }).promise()
    },

    // STS
    importSTS: async () => {
      const sts = require('aws-sdk/clients/sts')
      return sts
    },
    instantiateSTS: async (sts) => {
      return new sts()
    },
    readSTS: async (STSClient) => {
      return await STSClient.getCallerIdentity().promise()
    },
  }, context)
}
