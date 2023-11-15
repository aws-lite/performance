import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { names } from '../src/plugins/lambdas.mjs'
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

  const coldstart = {}
  parseBenchRuns(coldstart, results, ({ invokeStart, init, start, end }) => {
    const duration = end - invokeStart
    const execution = end - start
    return duration - init - execution
  })

  const init = {}
  parseBenchRuns(init, results, ({ init }) => init)

  const importDep = {}
  parseBenchRuns(importDep, results, ({ importDep }) => importDep.time, true)

  const instantiate = {}
  parseBenchRuns(instantiate, results, ({ instantiate }) => instantiate.time, true)

  const read = {}
  parseBenchRuns(read, results, ({ read }) => read.time, true)

  const write = {}
  parseBenchRuns(write, results, ({ write }) => write.time, true)

  const memory = {}
  parseBenchRuns(memory, results, ({ peakMemory }) => peakMemory)

  const executionTime = {}
  parseBenchRuns(executionTime, results, ({ start, end }) => end - start)

  const totalTime = {}
  parseBenchRuns(totalTime, results, ({ invokeStart, end }) => end - invokeStart)

  console.log(`[Stats] Parsed performance statistics in ${Date.now() - start}ms`)

  const parsed = {
    coldstart,
    init,
    importDep,
    instantiate,
    read,
    write,
    memory,
    executionTime,
    totalTime,
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
