import runner from '@architect/shared/run.js'
const { run, DynamoDB, S3, IAM, CloudFormation, Lambda } = runner

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

    // CloudFormation
    importCloudFormation: async () => {
      plugins.CloudFormation = await import('@aws-lite/cloudformation')
      return (await import('@aws-lite/client')).default
    },
    instantiateCloudFormation: async (awsLite) => {
      return await awsLite({ plugins: [ plugins.CloudFormation ] })
    },
    readCloudFormation: async (aws) => {
      const { StackName } = CloudFormation
      await aws.CloudFormation.ListStackResources({ StackName })
    },
    writeCloudFormation: async (aws) => {
      const { StackName } = CloudFormation
      return await aws.CloudFormation.UpdateTerminationProtection({ StackName, EnableTerminationProtection: false })
    },

    // Lambda
    importLambda: async () => {
      plugins.Lambda = await import('@aws-lite/lambda')
      return (await import('@aws-lite/client')).default
    },
    instantiateLambda: async (awsLite) => {
      return await awsLite({ plugins: [ plugins.Lambda ] })
    },
    readLambda: async (aws) => {
      const { FunctionName } = Lambda
      await aws.Lambda.GetFunctionConfiguration({ FunctionName })
    },
    writeLambda: async (aws) => {
      const { FunctionName, Description } = Lambda
      return await aws.Lambda.UpdateFunctionConfiguration({ FunctionName, Description: Description() })
    },

    // STS
    importSTS: async () => {
      plugins.STS = await import('@aws-lite/sts')
      return (await import('@aws-lite/client')).default
    },
    instantiateSTS: async (awsLite) => {
      return await awsLite({ plugins: [ plugins.STS ] })
    },
    readSTS: async (aws) => {
      return await aws.STS.GetCallerIdentity()
    },
  }, context)
}
