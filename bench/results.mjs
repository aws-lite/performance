import { readFileSync } from 'node:fs'
import { names } from '../src/plugins/lambdas.mjs'
import { join } from 'node:path'
import percentile from 'percentile'

async function parseResults (results) {
  const start = Date.now()
  results = results || JSON.parse(readFileSync(join('bench', 'results.json')))

  // Stats
  const coldstart = {}
  parseBenchRuns(coldstart, results, ({ coldstart }) => coldstart)

  const totalTime = {}
  parseBenchRuns(totalTime, results, ({ coldstart, start, end }) => coldstart + (end - start))

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

  console.log(`[Stats] Detailed stats from benchmark run:`, {
    coldstart,
    totalTime,
    importDep,
    instantiate,
    read,
    write,
    memory,
  })
}
parseResults()

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
