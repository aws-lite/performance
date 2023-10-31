async function run (fns, context) {
  let { importDep, instantiate, read, write } = fns

  let report = {
    id: context.awsRequestId,
    start: Date.now(),
    importDep: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
    instantiate: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
    read: {
      memoryStart: null,
      memoryEnd: null,
      timeStart: null,
      timeEnd: null,
    },
    write: {
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

  recordStart('importDep')
  const sdk = await importDep()
  recordEnd('importDep')

  recordStart('instantiate')
  const client = await instantiate(sdk)
  recordEnd('instantiate')

  recordStart('read')
  const payload = await read(client)
  recordEnd('read')

  recordStart('write')
  const result = await write(client, payload.Item)
  recordEnd('write')

  report.end = Date.now()

  return { report, result }
}

const TableName = process.env.BENCHMARK_TABLE_NAME
const Key = { id: 'data' }

module.exports = { run, TableName, Key }
