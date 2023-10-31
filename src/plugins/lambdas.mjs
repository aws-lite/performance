const names = [
  'control',
  'aws-lite-raw',
  // 'aws-lite-bundled',
  // 'aws-sdk-v2-raw',
  // 'aws-sdk-v2-bundled', // Run on nodejs18.x
  'aws-sdk-v3-raw',
  // 'aws-sdk-v3-bundled',
]
const plugin = {
  set: {
    customLambdas: () => names.map(name => ({ name, src: `src/lambdas/${name}` }))
  },
  deploy: {
    start: ({ cloudformation }) => {
      Object.entries(cloudformation.Resources).forEach(([ name, item ]) => {
        if (item.Type === 'AWS::Serverless::Function') {
          cloudformation.Resources[name].Properties.FunctionName = item.ArcMetadata.name
          cloudformation.Resources[name]
            .Properties.Environment.Variables.BENCHMARK_TABLE_NAME = {
              Ref: 'DummyDataTable'
            }
        }
      })
    }
  }
}

export { plugin as default, names }
