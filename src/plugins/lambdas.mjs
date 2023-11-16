import { join } from 'node:path'
import { build } from 'esbuild'
const cwd = process.cwd()
const entryFileFolder = join(cwd, 'src', 'entry-files')

const n = (stage, name) => `${name}${stage === 'production' ? '' : '-staging'}`

const names = [
  'control',
  'aws-lite-raw',
  'aws-lite-bundled',
  'aws-sdk-v2-raw',     // Run on nodejs16.x
  'aws-sdk-v2-bundled', // Run on nodejs20.x
  'aws-sdk-v3-raw',
  'aws-sdk-v3-bundled',
]
const lambdae = names.concat('invoker')

const plugin = {
  set: {
    customLambdas: () => lambdae.map(name => ({ name, src: `src/lambdas/${name}` }))
  },
  deploy: {
    start: async ({ cloudformation, inventory }) => {
      const resources = Object.entries(cloudformation.Resources)
      for (const [ name, item ] of resources) {
        if (item.Type === 'AWS::Serverless::Function') {
          const stage = inventory.inv._arc.deployStage
          cloudformation.Resources[name].Properties.FunctionName = n(stage, item.ArcMetadata.name)
          cloudformation.Resources[name]
            .Properties.Environment.Variables.PERFORMANCE_TABLE_NAME = {
              Ref: 'DummyDataTable'
            }
        }
      }
    }
  },
  hydrate: {
    copy: async ({ inventory }) => {
      for (const lambda of inventory.inv.customLambdas) {
        const { name } = lambda
        if (name.includes('bundled')) {
          const version = name.split('-bundled')[0]
          const outDir = join(cwd, 'src', 'lambdas', name)
          if (version === 'aws-lite') {
            await esbuild(
              [ join(entryFileFolder, `${version}-client.js`) ],
              join(outDir, `${version}-client-bundle.js`),
            )
            await esbuild(
              [ join(entryFileFolder, `${version}-dynamodb.js`) ],
              join(outDir, `${version}-dynamodb-bundle.js`),
            )
          }
          else {
            await esbuild(
              [ join(entryFileFolder, `${version}.js`) ],
              join(outDir, `${version}-bundle.js`),
            )
          }
        }
      }
    }
  }
}

async function esbuild (entryPoints, outfile) {
  await build({
    entryPoints,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    outfile,
  })
}

export { plugin as default, names }
