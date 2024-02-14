import awsLite from '@aws-lite/client'

const maxMemRe = /(?<=(Max Memory Used: ))[\d.]+(?=( MB))/g
const initDurationRe = /(?<=(Init Duration: ))[\d.]+(?=( ms))/g

export async function handler ({ FunctionName, name }) {
  const aws = await awsLite({ plugins: [ import('@aws-lite/lambda') ] })
  const invokeStart = Date.now()
  const invoke = await aws.Lambda.Invoke({
    FunctionName,
    Payload: {},
    LogType: 'Tail',
  })
  if (invoke.Payload.errorType || invoke.FunctionError) {
    console.log(invoke)
    throw Error('Invoke failed:', name)
  }
  const run = invoke.Payload.report
  run.invokeStart = invokeStart
  run.invokeEnd = Date.now()

  const maxMem = invoke.LogResult.match(maxMemRe)
  if (maxMem) {
    run.peakMemory = Number(maxMem[0])
  }

  const init = invoke.LogResult.match(initDurationRe)
  if (init) {
    run.init = Number(init[0])
  }
  return run
}
