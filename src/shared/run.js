async function run (fns, context) {
  let {
    importDynamoDB, instantiateDynamoDB, readDynamoDB, writeDynamoDB,
  } = fns

  let report = {
    id: context.awsRequestId,
    start: Date.now(),
    importDynamoDB: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
    instantiateDynamoDB: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
    readDynamoDB: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
    writeDynamoDB: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
  }

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

  recordStart('importDynamoDB')
  const dynamoDBsdk = await importDynamoDB()
  recordEnd('importDynamoDB')

  recordStart('instantiateDynamoDB')
  const dynamoDBClient = await instantiateDynamoDB(dynamoDBsdk)
  recordEnd('instantiateDynamoDB')

  recordStart('readDynamoDB')
  const dynamoDBpayload = await readDynamoDB(dynamoDBClient)
  recordEnd('readDynamoDB')

  recordStart('writeDynamoDB')
  const dynamoDBResult = await writeDynamoDB(dynamoDBClient, dynamoDBpayload.Item)
  recordEnd('writeDynamoDB')

  // TODO add more clients + operations

  report.end = Date.now()

  return { report, dynamoDBResult }
}

const TableName = process.env.PERFORMANCE_TABLE_NAME
const Key = { id: 'data' }

module.exports = { run, TableName, Key }
