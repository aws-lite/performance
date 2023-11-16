@app
performance

@aws
architecture arm64
memory 1024
profile openjsf
region us-west-2
runtime nodejs20.x
timeout 30

@plugins
lambdas
architect/plugin-storage-public

@storage-public
assets

@tables
results
  name *string
  ts **string
dummy-data
  id *string
