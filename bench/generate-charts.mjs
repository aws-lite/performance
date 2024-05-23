import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import ChartJsImage from 'chartjs-to-image'
import awsLite from '@aws-lite/client'

const env = process.env.ARC_ENV === 'production' ? 'Production' : 'Staging'

export default async function generateCharts ({ data, metricToGraph, region, runs }) {
  console.log('[Charts] Generating charts')

  const tmp = join(process.cwd(), 'tmp')
  if (!existsSync(tmp)) mkdirSync(tmp)

  const labels = [
    'control (20.x)',
    'aws-lite (raw, 20.x)',
    'aws-lite (bundled, 20.x)',
    'aws-sdk (v2, raw, 16.x)',
    'aws-sdk (v2, bundled, 20.x)',
    '@aws-sdk (v3 raw, 20.x)',
    '@aws-sdk (v3 bundled, 20.x)',
  ]
  const backgroundColor = [ '#E0E0E0', '#27AE60', '#219653', '#F2AF4A', '#F2AF4A', '#F2994A', '#F2994A' ]
  const backgrounds = num => backgroundColor.map(i => `${i}${num}`)

  const charts = {
    // Startup
    coldstart: {
      title: `Coldstart latency (ms)`,
      filename: 'coldstart',
    },
    init: {
      title: `Initialization latency (ms)`,
      filename: 'init',
    },
    // DynamoDB
    importDynamoDB: {
      title: 'Import / require DynamoDB (ms)',
      filename: 'import-dynamodb',
      noControlTest: true,
    },
    instantiateDynamoDB: {
      title: 'Instantiate a DynamoDB client (ms)',
      filename: 'instantiate-dynamodb',
      noControlTest: true,
    },
    readDynamoDB: {
      title: 'DynamoDB - read one 100KB row (ms)',
      filename: 'read-dynamodb',
      noControlTest: true,
    },
    writeDynamoDB: {
      title: 'DynamoDB - write one 100KB row (ms)',
      filename: 'write-dynamodb',
      noControlTest: true,
    },
    executionTimeDynamoDB: {
      title: 'Time to execute (single client, DynamoDB), not including coldstart (ms)',
      filename: 'execution-time-dynamodb',
      noControlTest: true,
    },
    // S3
    importS3: {
      title: 'Import / require S3 (ms)',
      filename: 'import-s3',
      noControlTest: true,
    },
    instantiateS3: {
      title: 'Instantiate an S3 client (ms)',
      filename: 'instantiate-s3',
      noControlTest: true,
    },
    readS3: {
      title: 'S3 - read one 1MB object (ms)',
      filename: 'read-s3',
      noControlTest: true,
    },
    writeS3: {
      title: 'S3 - write one 1MB object (ms)',
      filename: 'write-s3',
      noControlTest: true,
    },
    executionTimeS3: {
      title: 'Time to execute (single client, S3), not including coldstart (ms)',
      filename: 'execution-time-s3',
      noControlTest: true,
    },
    // Aggregate
    memory: {
      title: 'Peak memory consumption over Lambda baseline (MB)',
      filename: 'memory',
      excludeControl: true,
    },
    executionTimeAll: {
      title: 'Time to execute (all benchmarked clients), not including coldstart (ms)',
      filename: 'execution-time-all',
      excludeControl: true,
    },
    totalTimeAll: {
      title: 'Total time to respond (all benchmarked clients), including coldstart (ms)',
      filename: 'total-time-all',
      excludeControl: true,
    },
  }

  const options = {
    plugins: {
      legend: {
        display: false,
      },
      title: {
        text: '',
        display: true,
        font: { size: 14 },
      },
      subtitle: {
        text: `${metricToGraph}, ${runs}x runs, Lambda 1GB arm64, ${region}, ${new Date().toISOString()}`,
        display: true,
        font: { size: 10 },
        padding: { bottom: 10 },
      },
    },
  }
  const getOptions = () => JSON.parse(JSON.stringify(options))

  for (const [ name, metric ] of Object.entries(charts)) {
    const start = Date.now()
    const { title, filename, options, noControlTest, excludeControl } = metric
    const chart = new ChartJsImage()
    chart
      .setChartJsVersion('4')
      .setWidth(800)
      .setHeight(400)
      .setDevicePixelRatio(2.0)

    // noControlTest - do not expect values for control, as they weren't included
    // excludeControl - control values are included and will be used outside the charts, but should be ignored in charts
    // TODO this can prob also be improved by inspecting the lambdas plugin to see whether a control test was included
    const removeControl = arr => excludeControl || noControlTest ? arr.slice(1) : arr
    const config = {
      type: 'bar',
      data: {
        labels: removeControl(labels),
        datasets: [ {
          data: excludeControl ? data[name].slice(1) : data[name],
          backgroundColor: removeControl(backgrounds('95')),
          borderWidth: 2,
          borderColor: removeControl(backgrounds('')),
        } ],
      },
      options: getOptions(),
    }
    config.options.plugins.title.text = title
    if (options) config.options = { ...config.options, ...options }
    chart.setConfig(config)
    await chart.toFile(join(tmp, filename + '.png'))

    // Now run it again in dark mode
    const light = '#E6EDF3'
    const grid = '#888888'
    chart.setBackgroundColor('#00000000')
    config.options.plugins.title.color = light
    config.options.plugins.subtitle.color = light
    config.options.scales = {
      y: {
        grid: { color: grid },
        ticks: { color: light },
      },
      x: {
        grid: { color: grid },
        ticks: { color: light },
      },
    }
    chart.setConfig(config)
    await chart.toFile(join(tmp, filename + '-dark.png'))

    console.log(`[Charts] Graphed: '${title}' in ${Date.now() - start}ms`)
  }

  if (process.env.DISABLE_PUBLISH) return

  const aws = await awsLite({
    profile: 'openjsf',
    region,
    plugins: [ import('@aws-lite/ssm'), import('@aws-lite/s3') ],
  })
  const { Parameter } = await aws.SSM.GetParameter({ Name: `/Performance${env}/storage-public/assets` })
  const Bucket = Parameter.Value
  const CacheControl = 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'

  const files = readdirSync(tmp)
  writeFileSync(join(tmp, 'assets.json'), JSON.stringify(files, null, 2))
  files.push('assets.json')
  for (const Key of files) {
    // TODO set caching for a little while once things settle
    await aws.S3.PutObject({
      Bucket,
      Key,
      File: join(tmp, Key),
      CacheControl,
      ContentType: Key.endsWith('.png') ? 'image/png' : 'application/json',
    })
    console.log(`[Charts] Published ${Key} to S3`)
  }
}
