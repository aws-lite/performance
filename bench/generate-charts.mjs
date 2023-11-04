import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import ChartJsImage from 'chartjs-to-image'
import awsLite from '@aws-lite/client'

const env = process.env.ARC_ENV === 'production' ? 'Production' : 'Staging'

export default async function generateCharts ({ data, metricToGraph, region, runs }) {
  console.log('[Charts] Generating charts')

  const tmp = join(process.cwd(), 'tmp')
  if (!existsSync(tmp)) mkdirSync(tmp)

  const labels = [
    'control (18.x)',
    'aws-lite (raw, 18.x)',
    'aws-lite (bundled, 18.x)',
    'aws-sdk (v2, raw, 16.x)',
    'aws-sdk (v2, bundled, 18.x)',
    '@aws-sdk (v3 raw, 18.x)',
    '@aws-sdk (v3 bundled, 18.x)',
  ]
  const backgroundColor = [ '#E0E0E0', '#2D9CDB', '#2F80ED', '#F2C94C', '#F2994A', '#BB6BD9', '#9B51E0' ]

  const charts = {
    coldstart: {
      title: `Coldstart latency (ms)`,
      filename: 'coldstart',
    },
    importDep: {
      title: 'Import / require the SDK (ms)',
      filename: 'import-dep',
      noControlTest: true,
    },
    instantiate: {
      title: 'Instantiate a client (ms)',
      filename: 'instantiate',
      noControlTest: true,
    },
    read: {
      title: 'DynamoDB - read one 100KB row (ms)',
      filename: 'read',
      noControlTest: true,
    },
    write: {
      title: 'DynamoDB - write one 100KB row (ms)',
      filename: 'write',
      noControlTest: true,
    },
    memory: {
      title: 'Peak memory consumption over Lambda baseline (MB)',
      filename: 'memory',
      excludeControl: true,
    },
    executionTime: {
      title: 'Time to respond, not including coldstart (ms)',
      filename: 'execution-time',
    },
    totalTime: {
      title: 'Total time to respond, including coldstart (ms)',
      filename: 'total-time',
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
    }
  }
  const getOptions = () => JSON.parse(JSON.stringify(options))

  for (const [ name, metric ] of Object.entries(charts)) {
    const start = Date.now()
    const { title, filename, options, noControlTest, excludeControl } = metric
    const chart = new ChartJsImage()
    chart
      .setChartJsVersion('4')
      .setWidth(800)
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
          backgroundColor: removeControl(backgroundColor),
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
      }
    }
    chart.setConfig(config)
    await chart.toFile(join(tmp, filename + '-dark.png'))

    console.log(`[Charts] Graphed: '${title}' in ${Date.now() - start}ms`)
  }

  const aws = await awsLite({ profile: 'openjsf', region })
  const { Parameter } = await aws.SSM.GetParameter({ Name: `/Performance${env}/storage-public/assets` })
  const Bucket = Parameter.Value

  const files = readdirSync(tmp)
  for (const Key of files) {
    // TODO set caching for a little while once things settle
    const CacheControl = 'no-cache, no-store, must-revalidate, max-age=0, s-maxage=0'
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
