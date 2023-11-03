import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { names as lambdae } from '../src/plugins/lambdas.mjs'
import parseResults from './parse-results.mjs'
import awsLite from '@aws-lite/client'

const maxMemRe = /(?<=(Max Memory Used: ))[\d.]+(?=( MB))/g
const coldstartRe = /(?<=(Init Duration: ))[\d.]+(?=( ms))/g

const region = process.env.AWS_PROFILE || 'us-west-2'
const env = process.env.ARC_ENV === 'production' ? 'Production' : 'Staging'
const writeResults = true
const tmp = join(process.cwd(), 'tmp')

const runs = 10 // TODO: increase to a statistically significant quantity of runs
const stats = {}

async function main () {
  const aws = await awsLite({ profile: 'openjsf', region })

  console.log(`[Init] Let's get ready to benchmark!`)

  const tables = await aws.SSM.GetParametersByPath({ Path: `/Benchmark${env}/tables/` })
  const dummyTable = tables.Parameters.find(({ Name }) => Name.includes('dummy-data')).Value
  const resultsTable = tables.Parameters.find(({ Name }) => Name.includes('benchmark-results')).Value

  const ts = new Date().toISOString()
  const start = Date.now()

  // Check to see if database was seeded with dummy data
  const dummyData = await aws.DynamoDB.GetItem({
    TableName: dummyTable,
    Key: { id: 'data' }
  })
  if (!dummyData.Item) {
    const hundredKB = 1024 * 100
    await aws.DynamoDB.PutItem({
      TableName: dummyTable,
      Item: {
        id: 'data',
        data: Buffer.alloc(hundredKB).toString('base64')
      }
    })
    console.log('[Init] Wrote 100KB dummy data row')
  }
  else console.log('[Init] Found 100KB dummy data row for benchmarking')

  for (let i = 1; i < (runs + 1); i++) {

    const runStart = Date.now()
    console.log(`[Benchmark] Run ${i} of ${runs}`)

    const operations = lambdae.map(name => {
      return new Promise((res, rej) => {
        console.log(`[Benchmark] Running ${name}...`)
        if (!stats[name]) stats[name] = []
        async function bench () {
          try {

            await updateAndWait({ aws, FunctionName: name })
            const invoke = await aws.Lambda.Invoke({
              FunctionName: name,
              Payload: {},
              LogType: 'Tail',
            })
            if (invoke.Payload.errorType || invoke.FunctionError) {
              console.log(invoke)
              throw Error('Invoke failed:', name)
            }
            const run = invoke.Payload.report
            run.end = Date.now()

            const maxMem = invoke.LogResult.match(maxMemRe)
            if (maxMem) {
              run.peakMemory = Number(maxMem[0])
            }
            else {
              console.log('Lambda tail:', invoke.LogResult)
              throw Error(`Peak memory not found: ${name}`)
            }
            const coldstart = invoke.LogResult.match(coldstartRe)
            if (coldstart) {
              run.coldstart = Number(coldstart[0])
            }
            else {
              console.log('Lambda tail:', invoke.LogResult)
              throw Error(`Coldstart not detected, Lambda is warm: ${name}`)
            }
            stats[name].push(run)
          }
          catch (err) {
            console.log(`Failed to benchmark ${name}`, err)
          }
        }
        bench().then(res).catch(rej)
      })
    })

    try {
      await Promise.all(operations)
    }
    catch (err) {
      console.log('Error, terminating benchmark run!')
      console.log(err)
      process.exit(1)
    }
    console.log(`[Benchmark] Run ${i} completed in ${Date.now() - runStart}ms`)
  }
  console.log(`[Benchmark] Finished in ${(Date.now() - start) / 1000} seconds`)

  // TODO maybe just quickly print some averages or p90 results or something

  const PutRequestItems = lambdae.map(name => ({
    PutRequest: { Item: { name, ts, stats: stats[name] } }
  }))
  const batch = { RequestItems: { [resultsTable]: PutRequestItems } }
  await aws.DynamoDB.BatchWriteItem(batch)

  if (writeResults) {
    if (!existsSync(tmp)) mkdirSync(tmp)
    writeFileSync(join(tmp, 'latest-results.json'), JSON.stringify(stats, null, 2))
  }

  parseResults({ results: stats, region })
}
main()

async function updateAndWait ({ aws, FunctionName }) {
  const config = await aws.Lambda.GetFunctionConfiguration({ FunctionName })
  const Environment = { Variables: { ...config.Environment.Variables, UPDATED: new Date().toISOString() } }
  await aws.Lambda.UpdateFunctionConfiguration({
    FunctionName,
    Environment,
  })
  await waitFor({ aws, FunctionName, tries: 0 })

}

async function waitFor (params) {
  const { aws, FunctionName } = params
  const { LastUpdateStatus } = await aws.Lambda.GetFunctionConfiguration({ FunctionName })
  if (LastUpdateStatus === 'Successful') return
  if (LastUpdateStatus !== 'Successful' && params.tries <= 30) {
    params.tries++
    await new Promise(res => setTimeout(res, 1000))
    await waitFor({ aws, FunctionName, tries: params.tries })
  }
  else throw Error(`Lambda did not successfully update after ${params.tries} tries: ${FunctionName}`)
}
