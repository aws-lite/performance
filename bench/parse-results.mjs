import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { names } from '../src/plugins/lambdas.mjs'
import generateCharts from './generate-charts.mjs'
import { join } from 'node:path'
import percentile from 'percentile'

const writeResults = true

async function parseResults ({ results, region = 'us-west-2' }) {
  const start = Date.now()
  const resultsFile = join(process.cwd(), 'tmp', 'latest-results.json')
  const resultsParsedFile = join(process.cwd(), 'tmp', 'latest-results-parsed.json')
  results = results || (existsSync(resultsFile) && JSON.parse(readFileSync(resultsFile)))

  // Stats
  const coldstart = {}
  parseBenchRuns(coldstart, results, ({ coldstart }) => coldstart)

  const totalTime = {}
  parseBenchRuns(totalTime, results, ({ coldstart, start, end }) => coldstart + (end - start))

  const executionTime = {}
  parseBenchRuns(executionTime, results, ({ start, end }) => end - start)

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

  console.log(`[Stats] Parsed benchmark statistics in ${Date.now() - start}ms`)

  const parsed = {
    coldstart,
    executionTime,
    totalTime,
    importDep,
    instantiate,
    read,
    write,
    memory,
  }

  if (writeResults) {
    writeFileSync(resultsParsedFile, JSON.stringify(parsed, null, 2))
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
