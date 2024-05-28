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
const services = [
  'dynamodb',
  's3',
  'iam',
  'cloudformation',
]
const lambdae = names.concat('invoker')

const plugin = {
  set: {
    customLambdas: () => {
      const executing = lambdae.map(name => ({ name, src: `src/lambdas/${name}` }))
      // Just point dummies to control src because it's super simple
      const dummies = names
        .filter(name => name !== 'control')
        .map(name => ({ name: `dummy-${name}`, src: `src/lambdas/control` }))
      return executing.concat(dummies)
    },
  },
  deploy: {
    start: async ({ cloudformation, inventory }) => {
      const resources = Object.entries(cloudformation.Resources)
      for (const [ name, item ] of resources) {
        if (item.Type === 'AWS::Serverless::Function') {
          const stage = inventory.inv._arc.deployStage
          cloudformation.Resources[name].Properties.FunctionName = n(stage, item.ArcMetadata.name)
          cloudformation.Resources[name]
            .Properties.Environment.Variables.DUMMY_TABLE_NAME = {
              Ref: 'DummyDataTable',
            }
          cloudformation.Resources[name]
            .Properties.Environment.Variables.DUMMY_BUCKET_NAME = {
              Ref: 'DummyAssetsBucket',
            }
          if (name.startsWith('Aws')) {
            cloudformation.Resources[name]
              .Properties.Environment.Variables.DUMMY_LAMBDA_NAME = {
                Ref: `Dummy${name}`,
              }
          }
        }
      }

      // Enable access to dummy resources
      cloudformation.Resources.Role.Properties.Policies.push({
        PolicyName: 'DummyResourcePolicy',
        PolicyDocument: {
          Statement: [
            {
              Effect: 'Allow',
              Action: [
                'iam:GetRole',
                'iam:UpdateRole',
                'cloudformation:ListStackResources',
                'cloudformation:UpdateTerminationProtection',
              ],
              Resource: [
                'arn:aws:iam::*:role/aws-lite-dummy-iam-role',
                'arn:aws:cloudformation:*:*:*',
              ],
            },
          ],
        },
      })
    },
  },
  hydrate: {
    copy: async ({ inventory }) => {
      for (const lambda of inventory.inv.customLambdas) {
        const { name } = lambda
        if (name.includes('bundled') && !name.includes('dummy')) {
          const version = name.split('-bundled')[0]
          const outDir = join(cwd, 'src', 'lambdas', name)
          if (version === 'aws-lite') {
            await esbuild(
              [ join(entryFileFolder, `${version}-client.js`) ],
              join(outDir, `${version}-client-bundle.js`),
            )
          }
          for (const service of services) {
            await esbuild(
              [ join(entryFileFolder, `${version}-${service}.js`) ],
              join(outDir, `${version}-${service}-bundle.js`),
            )
          }
        }
      }
    },
  },
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
