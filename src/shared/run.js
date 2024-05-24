async function run (fns, context) {
  let {
    importDynamoDB, instantiateDynamoDB, readDynamoDB, writeDynamoDB,
    importS3, instantiateS3, readS3, writeS3,
    importIAM, instantiateIAM, readIAM, writeIAM,
  } = fns

  let report = {
    id: context.awsRequestId,
    start: Date.now(),
  }
  Object.keys(fns).forEach(k => report[k] = {
    memoryStart: null,
    memoryEnd: null,
    timeStart: null,
    timeEnd: null,
  })

  function recordStart (step) {
    report[step].memoryStart = process.memoryUsage.rss()
    report[step].timeStart = Date.now()
  }
  function recordEnd (step) {
    report[step].timeEnd = Date.now()
    report[step].memoryEnd = process.memoryUsage.rss()
    report[step].time = report[step].timeEnd - report[step].timeStart
    report[step].memory = report[step].memoryEnd - report[step].memoryStart
  }

  // DynamoDB
  recordStart('importDynamoDB')
  const DynamoDBSDK = await importDynamoDB()
  recordEnd('importDynamoDB')

  recordStart('instantiateDynamoDB')
  const DynamoDBClient = await instantiateDynamoDB(DynamoDBSDK)
  recordEnd('instantiateDynamoDB')

  recordStart('readDynamoDB')
  const DynamoDBPayload = await readDynamoDB(DynamoDBClient)
  recordEnd('readDynamoDB')

  recordStart('writeDynamoDB')
  const DynamoDBResult = await writeDynamoDB(DynamoDBClient, DynamoDBPayload.Item)
  recordEnd('writeDynamoDB')

  // S3
  recordStart('importS3')
  const S3SDK = await importS3()
  recordEnd('importS3')

  recordStart('instantiateS3')
  const S3Client = await instantiateS3(S3SDK)
  recordEnd('instantiateS3')

  recordStart('readS3')
  const S3Payload = await readS3(S3Client)
  recordEnd('readS3')

  recordStart('writeS3')
  const S3Result = await writeS3(S3Client, S3Payload)
  recordEnd('writeS3')

  // IAM
  recordStart('importIAM')
  const IAMSDK = await importIAM()
  recordEnd('importIAM')

  recordStart('instantiateIAM')
  const IAMClient = await instantiateIAM(IAMSDK)
  recordEnd('instantiateIAM')

  recordStart('readIAM')
  await readIAM(IAMClient)
  recordEnd('readIAM')

  recordStart('writeIAM')
  const IAMResult = await writeIAM(IAMClient)
  recordEnd('writeIAM')

  // TODO add more clients + operations

  report.end = Date.now()

  return { report, DynamoDBResult, S3Result, IAMResult }
}

const TableName = process.env.PERFORMANCE_TABLE_NAME
const Bucket = process.env.PERFORMANCE_BUCKET_NAME
const RoleName = 'aws-lite-dummy-iam-role'

module.exports = {
  run,
  DynamoDB: { TableName,  Key: { id: 'data' } },
  S3:       { Bucket,     Key: 'data' },
  IAM:      { RoleName,   Description: () => `Updated ${new Date().toISOString()}` },
}
