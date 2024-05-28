import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { names } from '../src/plugins/lambdas.mjs'
import seedData from './seed-data.mjs'
import waitForUpdatedResources from './wait.mjs'
import parseResults from './parse-results.mjs'
import awsLite from '@aws-lite/client'

const region = process.env.AWS_REGION || 'us-west-2'
const isProd = process.env.ARC_ENV === 'production'
const env = isProd ? 'Production' : 'Staging'
const writeResults = true
const tmp = join(process.cwd(), 'tmp')
const n = name => `${name}${isProd ? '' : '-staging'}`

const runs = isProd ? 100 : 5
const stats = {}

async function main () {
  const aws = await awsLite({
    profile: 'openjsf',
    region,
    plugins: [
      import('@aws-lite/cloudformation'),
      import('@aws-lite/dynamodb'),
      import('@aws-lite/iam'),
      import('@aws-lite/lambda'),
      import('@aws-lite/s3'),
      import('@aws-lite/ssm'),
    ],
  })

  console.log(`[Init] Let's get ready to benchmark SDK performance!`)
  const { Parameters: allParams } = await aws.SSM.GetParametersByPath({
    Path: `/Performance${env}/`,
    Recursive: true,
    paginate: true,
  })
  const resultsTable = allParams.find(({ Name }) => Name.endsWith('/tables/results'))?.Value
  if (!resultsTable) throw ReferenceError('Results data table not found!')

  const ts = new Date().toISOString()
  const start = Date.now()
  // Allow for `npm run bench $sdk...`
  const lambdae = process.argv[2]
    ? [ names[0], ...process.argv.slice(2) ]
    : names

  await seedData({ aws, allParams })

  for (let i = 1; i < (runs + 1); i++) {

    const runStart = Date.now()
    console.log(`[Benchmark] Run ${i} of ${runs}`)

    await waitForUpdatedResources({ aws, lambdae, n })

    const operations = lambdae.map(name => {
      return new Promise((res, rej) => {
        let tries = 0
        console.log(`[Benchmark] Running ${name}...`)
        if (!stats[name]) stats[name] = []
        async function bench (retrying) {
          try {
            if (tries >= 10) rej(`[Benchmark] Failed to complete ${name} after 10 tries`)
            tries++
            if (retrying) {
              const timeout = (tries * 1000) + Math.floor(Math.random() * 1000)
              await new Promise(res => setTimeout(res, timeout))
            }

            await updateAndWait({ aws, FunctionName: n(name) })
            const invoke = await aws.Lambda.Invoke({
              FunctionName: n('invoker'),
              Payload: { FunctionName: n(name), name },
              LogType: 'Tail',
            })

            if (invoke.Payload.errorType || invoke.FunctionError) {
              console.log(invoke)
              throw Error('Invoke failed:', name)
            }
            const run = invoke.Payload

            if (!run.peakMemory) {
              console.log(`[Benchmark] ${name} peak memory not found: ${name}`)
              console.log('Lambda tail:', invoke.LogResult)
              console.log('Retrying...')
              return bench(true)
            }
            if (!run.init) {
              console.log(`[Benchmark] ${name} coldstart not detected, Lambda is warm: ${name}`)
              console.log('Lambda tail:', invoke.LogResult)
              console.log('Retrying...')
              return bench(true)
            }
            stats[name].push(run)
            res()
          }
          catch (err) {
            console.log(`[Benchmark] Error while benchmarking ${name}`, err)
            console.log('Retrying...')
            bench(true)
          }
        }
        bench()
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
    PutRequest: { Item: { name, ts, stats: stats[name] } },
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
