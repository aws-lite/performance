import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import generateCharts from './generate-charts.mjs'
import { join } from 'node:path'
import percentile from 'percentile'

const writeResults = true

async function parseResults ({ results, region = 'us-west-2' }) {
  const start = Date.now()
  const tmp = join(process.cwd(), 'tmp')
  const resultsFile = join(tmp, 'latest-results.json')
  const resultsParsedFile = join(tmp, 'latest-results-parsed.json')
  results = results || (existsSync(resultsFile) && JSON.parse(readFileSync(resultsFile)))

  // Stats!
  // Prefer `end` over `invokeEnd`: we don't need to factor response time to the Lambda API
  // In smaller scale testing the delta is consistently about ~10ms for our report payload

  // Startup
  const coldstart = {}
  parseBenchRuns(coldstart, results, ({ invokeStart, init, start, end }) => {
    const duration = end - invokeStart
    const execution = end - start
    return duration - init - execution
  })

  const init = {}
  parseBenchRuns(init, results, ({ init }) => init)

  // DynamoDB
  const importDynamoDB = {}
  parseBenchRuns(importDynamoDB, results, ({ importDynamoDB }) => importDynamoDB.time, true)

  const instantiateDynamoDB = {}
  parseBenchRuns(instantiateDynamoDB, results, ({ instantiateDynamoDB }) => instantiateDynamoDB.time, true)

  const readDynamoDB = {}
  parseBenchRuns(readDynamoDB, results, ({ readDynamoDB }) => readDynamoDB.time, true)

  const writeDynamoDB = {}
  parseBenchRuns(writeDynamoDB, results, ({ writeDynamoDB }) => writeDynamoDB.time, true)

  const executionTimeDynamoDB = {}
  parseBenchRuns(executionTimeDynamoDB, results, ({ importDynamoDB, writeDynamoDB }) => writeDynamoDB.timeEnd - importDynamoDB.timeStart, true)

  // S3
  const importS3 = {}
  parseBenchRuns(importS3, results, ({ importS3 }) => importS3.time, true)

  const instantiateS3 = {}
  parseBenchRuns(instantiateS3, results, ({ instantiateS3 }) => instantiateS3.time, true)

  const readS3 = {}
  parseBenchRuns(readS3, results, ({ readS3 }) => readS3.time, true)

  const writeS3 = {}
  parseBenchRuns(writeS3, results, ({ writeS3 }) => writeS3.time, true)

  const executionTimeS3 = {}
  parseBenchRuns(executionTimeS3, results, ({ importS3, writeS3 }) => writeS3.timeEnd - importS3.timeStart, true)

  // IAM
  const importIAM = {}
  parseBenchRuns(importIAM, results, ({ importIAM }) => importIAM.time, true)

  const instantiateIAM = {}
  parseBenchRuns(instantiateIAM, results, ({ instantiateIAM }) => instantiateIAM.time, true)

  const readIAM = {}
  parseBenchRuns(readIAM, results, ({ readIAM }) => readIAM.time, true)

  const writeIAM = {}
  parseBenchRuns(writeIAM, results, ({ writeIAM }) => writeIAM.time, true)

  const executionTimeIAM = {}
  parseBenchRuns(executionTimeIAM, results, ({ importIAM, writeIAM }) => writeIAM.timeEnd - importIAM.timeStart, true)

  // CloudFormation
  const importCloudFormation = {}
  parseBenchRuns(importCloudFormation, results, ({ importCloudFormation }) => importCloudFormation.time, true)

  const instantiateCloudFormation = {}
  parseBenchRuns(instantiateCloudFormation, results, ({ instantiateCloudFormation }) => instantiateCloudFormation.time, true)

  const readCloudFormation = {}
  parseBenchRuns(readCloudFormation, results, ({ readCloudFormation }) => readCloudFormation.time, true)

  const writeCloudFormation = {}
  parseBenchRuns(writeCloudFormation, results, ({ writeCloudFormation }) => writeCloudFormation.time, true)

  const executionTimeCloudFormation = {}
  parseBenchRuns(executionTimeCloudFormation, results, ({ importCloudFormation, writeCloudFormation }) => writeCloudFormation.timeEnd - importCloudFormation.timeStart, true)

  // Lambda
  const importLambda = {}
  parseBenchRuns(importLambda, results, ({ importLambda }) => importLambda.time, true)

  const instantiateLambda = {}
  parseBenchRuns(instantiateLambda, results, ({ instantiateLambda }) => instantiateLambda.time, true)

  const readLambda = {}
  parseBenchRuns(readLambda, results, ({ readLambda }) => readLambda.time, true)

  const writeLambda = {}
  parseBenchRuns(writeLambda, results, ({ writeLambda }) => writeLambda.time, true)

  const executionTimeLambda = {}
  parseBenchRuns(executionTimeLambda, results, ({ importLambda, writeLambda }) => writeLambda.timeEnd - importLambda.timeStart, true)

  // Aggregate
  const memory = {}
  parseBenchRuns(memory, results, ({ peakMemory }) => peakMemory)

  const executionTimeAll = {}
  parseBenchRuns(executionTimeAll, results, ({ start, end }) => end - start)

  const totalTimeAll = {}
  parseBenchRuns(totalTimeAll, results, ({ invokeStart, end }) => end - invokeStart)

  console.log(`[Stats] Parsed performance statistics in ${Date.now() - start}ms`)

  const parsed = {
    // Startup
    coldstart,
    init,
    // DynamoDB
    importDynamoDB,
    instantiateDynamoDB,
    readDynamoDB,
    writeDynamoDB,
    executionTimeDynamoDB,
    // S3
    importS3,
    instantiateS3,
    readS3,
    writeS3,
    executionTimeS3,
    // IAM
    importIAM,
    instantiateIAM,
    readIAM,
    writeIAM,
    executionTimeIAM,
    // CloudFormation
    importCloudFormation,
    instantiateCloudFormation,
    readCloudFormation,
    writeCloudFormation,
    executionTimeCloudFormation,
    // Lambda
    importLambda,
    instantiateLambda,
    readLambda,
    writeLambda,
    executionTimeLambda,
    // Aggregate
    memory,
    executionTimeAll,
    totalTimeAll,
  }

  if (writeResults) {
    writeFileSync(resultsParsedFile, JSON.stringify(parsed, null, 2))

    const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex')
    const checksum = {
      updated: new Date(start).toISOString(),
      results: hash(resultsFile),
      resultsParsed: hash(resultsParsedFile),
    }
    writeFileSync(join(tmp, 'checksum.json'), JSON.stringify(checksum, null, 2))
  }

  const runs = results.control.length
  const metricToGraph = 'p95'
  const data = {}
  Object.entries(parsed).forEach(([ name, values ]) => {
    data[name] = Object.values(values).reduce((a, b) => {
      // Establish baseline memory footprint from the control
      let num = name === 'memory'
        ? Number(b[metricToGraph]) - Number(memory.control[metricToGraph])
        : Number(b[metricToGraph])
      a.push(num)
      return a
    }, [])
  })

  console.log(`[Stats] Raw data:`, data)

  generateCharts({ data, metricToGraph, region, runs })
}

function parseBenchRuns (acc, results, mapFn, skipControl) {
  const names = Object.keys(results)
  names.forEach(name => {
    if (name === 'control' && skipControl) return
    acc[name] = {}
    const all = results[name].map(mapFn).sort()
    acc[name].min = all[0].toFixed(2)
    acc[name].max = all[all.length - 1].toFixed(2)
    acc[name].mean = getMean(all).toFixed(2)
    acc[name].median = all[Math.floor(all.length / 2)].toFixed(2)
    acc[name].stddev = getStandardDeviation(all)
    acc[name].p25 = percentile(25, all).toFixed(2)
    acc[name].p50 = percentile(50, all).toFixed(2)
    acc[name].p90 = percentile(90, all).toFixed(2)
    acc[name].p95 = percentile(95, all).toFixed(2)
    acc[name].p99 = percentile(99, all).toFixed(2)
  })
}

function getMean (arr) {
  return arr.reduce((a, b) => a + b) / arr.length
}

function getStandardDeviation (arr) {
  const mean = getMean(arr)
  const sd =  Math.sqrt(getMean(arr.map(x => Math.pow(x - mean, 2)))).toFixed(2)
  return sd
}

export default parseResults

if (import.meta.url === `file://${process.argv[1]}`) {
  parseResults({})
}
