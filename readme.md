<h1><code>aws-lite</code> performance metrics</h1>

> [`aws-lite`](https://www.npmjs.com/package/@aws-lite/client) is a simple, extremely fast, extensible AWS client for Node.js.
>
> (It's got good error reporting, too.)

This repo benchmarks `aws-lite`, `aws-sdk` (v2), and `@aws-sdk` (v3) as unbundled (and Lambda-provided, if possible), or bundled packages. Control values are provided in a subset of relevant tests.

---

- [Latest benchmark results](#latest-benchmark-results)
  - [Download benchmark data](#download-benchmark-data)
- [Methodology](#methodology)
- [Reproduction](#reproduction)

---

## Latest benchmark results

The benchmarks below represent timing and memory for a basic roundtrip operation in Lambda: coldstart / initialization > import SDK > instantiate a client > read a row from DynamoDB > write a row to DynamoDB > return metrics.

Each test Lambda has only and exactly what it requires to complete the benchmark; all extraneous dependencies and operations are removed.

Benchmarks are run on regular intervals to account for ongoing improvements.

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - total time to respond, including coldstart" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/total-time-dark.png">
    <img alt="Benchmark statistics - total time to respond, including coldstart" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/total-time.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - coldstart latency" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/coldstart-dark.png">
    <img alt="Benchmark statistics - coldstart latench" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/coldstart.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - import / require the SDK" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/import-dep-dark.png">
    <img alt="Benchmark statistics - import / require the SDK" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/import-dep.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - instantiate a client" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/instantiate-dark.png">
    <img alt="Benchmark statistics - instantiate a client" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/instantiate.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - DynamoDB - read one 100KB row" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/read-dark.png">
    <img alt="Benchmark statistics - DynamoDB - read one 100KB row" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/read.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - DynamoDB - write one 100KB row" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/write-dark.png">
    <img alt="Benchmark statistics - DynamoDB - write one 100KB row" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/write.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - time to respond, not including coldstart" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/execution-time-dark.png">
    <img alt="Benchmark statistics - time to respond, not including coldstart" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/execution-time.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - peak memory consumption over Lambda baseline" srcset="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/memory-dark.png">
    <img alt="Benchmark statistics - peak memory consumption over Lambda baseline" src="https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/memory.png">
  </picture>
</p>

Peak memory consumption values are less the equivalent peak memory of the control test (which would include Node.js itself, and all related Lambda bootstrap processes).


### Download benchmark data

Raw data from the benchmark runs that produced the above graphs can be [downloaded here](https://benchmarkstaging-benchmarkassetsbucket-1mtcpz02sjydq.s3.us-west-2.amazonaws.com/latest-results.json)


## Methodology

[detailed methodology notes coming soon – [please read our source](src/) the mean time!]


## Reproduction

We strongly encourage you to reproduce these results yourself!

To do so from your local machine, follow these steps:

- Pull down this repo
- Modify any AWS profile references to `openjsf` to the appropriate AWS profile you'd like to use
- Install dependencies: `npm i`
- Deploy the project to AWS: `npx arc deploy`
- Run the benchmark and publish your results: `npm run bench`
