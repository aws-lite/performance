const KB = 1024
const MB = KB * KB
const hundredKB = 100 * KB

import runner from '../src/shared/run.js'
const { DynamoDB, S3, IAM } = runner

export default async function seedData ({ aws, allParams }) {
  /**
   * DynamoDB
   */
  const dummyTable = allParams.find(({ Name }) => Name.endsWith('/tables/dummy-data'))?.Value
  if (!dummyTable) throw ReferenceError('Dummy data table not found!')

  const dummyDynamoDBData = await aws.DynamoDB.GetItem({
    TableName: dummyTable,
    Key: DynamoDB.Key,
  })

  // This has a bug: I didn't account for base64 inflating the data size beyond 100KB. Duh.
  // While this *should* be truncated, now that would mess up the historical dataset, hmmm
  let dummyData = Buffer.alloc(hundredKB).toString('base64')

  if (!dummyDynamoDBData.Item || dummyDynamoDBData.Item.data !== dummyData) {
    await aws.DynamoDB.PutItem({
      TableName: dummyTable,
      Item: {
        ...DynamoDB.Key,
        data: dummyData,
      },
    })
    console.log('[Init] Wrote 100 KB dummy data row')
  }
  else console.log('[Init] Found 100 KB dummy data row for benchmarking')

  /**
   * S3
   */
  const dummyBucket = allParams.find(({ Name }) => Name.endsWith('/storage-private/dummy-assets'))?.Value
  if (!dummyBucket) throw ReferenceError('Dummy data bucket not found!')

  try {
    const result = await aws.S3.HeadObject({
      Bucket: dummyBucket,
      Key: S3.Key,
    })
    if (result.ContentLength !== MB) {
      throw ReferenceError('Need to re-publish dummy asset')
    }
    console.log('[Init] Found 1 MB dummy object for benchmarking')
  }
  catch (err) {
    if (err.statusCode !== 404) throw err

    await aws.S3.PutObject({
      Bucket: dummyBucket,
      Key: S3.Key,
      Body: Buffer.alloc(MB).toString('base64').substring(0, MB),
    })
    console.log('[Init] Wrote 1 MB dummy object')
  }

  /**
   * IAM
   */
  try {
    await aws.IAM.GetRole({ RoleName: IAM.RoleName })
    console.log('[Init] Found dummy IAM role for benchmarking')
  }
  catch (err) {
    if (err.statusCode !== 404) throw err

    await aws.IAM.CreateRole({
      RoleName: IAM.RoleName,
      AssumeRolePolicyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: '',
            Effect: 'Allow',
            Principal: { Service: [ 'lambda.amazonaws.com' ] },
            Action: 'sts:AssumeRole',
          },
        ],
      },
    })
    console.log('[Init] Created dummy IAM role')
  }
}
