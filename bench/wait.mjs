async function waitForUpdatedResources ({ aws, lambdae, n }) {
  const checking = lambdae
    .filter(name => name !== 'control')
    .map(name => n(`dummy-${name}`))
  let tries = 0
  await check(tries, aws, checking)
}

async function check (tries, aws, checking) {
  tries++
  try {
    const checks = checking.map(FunctionName => {
      return new Promise((res, rej) => {
        aws.Lambda.GetFunction({ FunctionName })
          .then(({ Configuration }) => {
            if (Configuration.State === 'Active') res()
            else rej(Error('retry_checks'))
          })
          .catch(rej)
      })
    })
    await Promise.all(checks)
  }
  catch (err) {
    /**/ if (err.message !== 'retry_checks') throw err
    else if (tries > 10) throw Error(`Dummy resources not ready after ${tries} tries`)
    else {
      console.log(`Dummy resources not yet ready, waiting...`)
      await new Promise(res => setTimeout(res, 1000))
      await check(tries, aws, checking)
    }
  }
}

export default waitForUpdatedResources
