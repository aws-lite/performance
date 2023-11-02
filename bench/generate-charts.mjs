import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import ChartJsImage from 'chartjs-to-image'

export default async function generateCharts ({ data, metricToGraph, runs }) {
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
      includeControl: true,
    },
    importDep: {
      title: 'Import / require the SDK (ms)',
      filename: 'import-dep',
    },
    instantiate: {
      title: 'Instantiate a client (ms)',
      filename: 'instantiate',
    },
    read: {
      title: 'DynamoDB - read one 100KB row (ms)',
      filename: 'read',
    },
    write: {
      title: 'DynamoDB - write one 100KB row (ms)',
      filename: 'write',
    },
    memory: {
      title: 'Peak memory consumption (MB)',
      filename: 'memory',
      includeControl: true,
    },
    totalTime: {
      title: 'Total execution time including coldstart (ms)',
      filename: 'total-time',
      includeControl: true,
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
        text: `${metricToGraph}, ${runs}x runs, Lambda 1GB arm64, us-west-2, ${new Date().toISOString()}`,
        display: true,
        font: { size: 10 },
        padding: { bottom: 10 },
      },
    }
  }
  const getOptions = () => JSON.parse(JSON.stringify(options))

  for (const [ name, metric ] of Object.entries(charts)) {
    const start = Date.now()
    const { title, filename, options, includeControl = false } = metric
    const chart = new ChartJsImage()
    chart
      .setChartJsVersion('4')
      .setWidth(800)
      .setDevicePixelRatio(2.0)

    const maybeHideControl = a => includeControl ? a : a.slice(1)
    const config = {
      type: 'bar',
      data: {
        labels: maybeHideControl(labels),
        datasets: [ {
          data: data[name],
          backgroundColor: maybeHideControl(backgroundColor),
        } ],
      },
      options: getOptions(),
    }
    config.options.plugins.title.text = title
    if (options) config.options = { ...config.options, ...options }
    chart.setConfig(config)
    chart.toFile(join(tmp, filename + '.png'))

    // Now run it again in dark mode
    const light = '#E6EDF3'
    const grid = '#21262D'
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
    chart.toFile(join(tmp, filename + '-dark.png'))

    console.log(`[Charts] Graphed: '${title}' in ${Date.now() - start}ms`)
  }
}
