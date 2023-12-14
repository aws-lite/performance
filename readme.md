<h1><code>aws-lite</code> performance metrics</h1>

> [`aws-lite`](https://www.npmjs.com/package/@aws-lite/client) is a simple, extremely fast, extensible AWS client for Node.js.
>
> (It's got good error reporting, too.)

This repo benchmarks and analyzes performance metrics from `aws-lite`, `aws-sdk` (v2), and `@aws-sdk` (v3) as unbundled and bundled dependencies. Control values are provided in a subset of relevant tests.

---

- [Latest performance metrics](#latest-performance-metrics)
  - [Download benchmark data](#download-benchmark-data)
- [Methodology](#methodology)
  - [General methodology](#general-methodology)
  - [Implementation](#implementation)
    - [Deployment phase](#deployment-phase)
    - [Testing phase](#testing-phase)
    - [Publishing phase](#publishing-phase)
  - [Lambda configuration](#lambda-configuration)
  - [AWS SDK v2](#aws-sdk-v2)
  - [AWS regions](#aws-regions)
  - [Bundling](#bundling)
- [Reproduction](#reproduction)
- [Acknowledgments](#acknowledgments)

---

## Latest performance metrics

The performance metrics below represent timing and memory for a basic roundtrip operation in Lambda: coldstart / initialization > import SDK > instantiate a client > read a row from DynamoDB > write a row to DynamoDB > return metrics.

Each test Lambda has only and exactly what it requires to complete the benchmark run; all extraneous dependencies and operations are removed.

Performance metrics are gathered on a regular basis to account for ongoing improvements to the SDKs (and, to a lesser extent, Lambda). Additional, more granular data will be published soon.

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - total time to respond, including coldstart" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/total-time-dark.png">
    <img alt="Benchmark statistics - total time to respond, including coldstart" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/total-time.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - coldstart latency" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/coldstart-dark.png">
    <img alt="Benchmark statistics - coldstart latency" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/coldstart.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - import / require" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/import-dep-dark.png">
    <img alt="Benchmark statistics - import / require" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/import-dep.png">
  </picture>
</p>

Note: import / require times are tied to individual services; in this benchmark, only the DynamoDB service client is imported. **Usage of additional AWS services in your own business logic would necessitate additional imports, thereby compounding response latency.**

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - instantiate a client" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/instantiate-dark.png">
    <img alt="Benchmark statistics - instantiate a client" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/instantiate.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - DynamoDB - read one 100KB row" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/read-dark.png">
    <img alt="Benchmark statistics - DynamoDB - read one 100KB row" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/read.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - DynamoDB - write one 100KB row" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/write-dark.png">
    <img alt="Benchmark statistics - DynamoDB - write one 100KB row" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/write.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - time to respond, not including coldstart" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/execution-time-dark.png">
    <img alt="Benchmark statistics - time to respond, not including coldstart" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/execution-time.png">
  </picture>
</p>

<p align=center>
  <picture>
    <source media="(prefers-color-scheme: dark)" alt="Benchmark statistics - peak memory consumption over Lambda baseline" srcset="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/memory-dark.png">
    <img alt="Benchmark statistics - peak memory consumption over Lambda baseline" src="https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/memory.png">
  </picture>
</p>

Note: peak memory consumption is shown as values above the Lambda Node.js baseline. Baseline memory consumption would be expected to include Node.js itself, Lambda bootstrap processes, etc. The memory baseline used always corresponds to the equivalent peak memory of the control test (e.g. `aws-lite` peak memory p95 - control peak memory p95).


### Download benchmark data

Raw data from the benchmark runs that produced the above graphs can be downloaded here
- [Raw, unparsed results](https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/latest-results.json)
- [Parsed results](https://performanceproduction-assetsbucket-1xqwku8953q8m.s3.us-west-2.amazonaws.com/latest-results-parsed.json)


## Methodology

### General methodology

We endeavor to take a straightforward and scientific approach to publishing AWS SDK performance data:

- **Open** - the code, techniques, reasoning, and findings of our tests should be open and available for anyone to review
- **Real-world** - our performance benchmarks should represent real-world usage patterns, avoiding contrived or trivial examples
- **Reproducible** - all results should be generally reproducible by others, whether using this repo's code and techniques or not


### Implementation

The process for benchmarking and processing performance metrics is run in the following phases and steps:


#### Deployment phase

1. Prep - a clean CI environment is instantiated; the latest versions of key dependencies (e.g. `@aws-lite/client`, `@aws-sdk/client-dynamodb`, etc.) are installed; basic linting / tests are run
2. Hydration - the following SDK dependency scenarios are prepared:
   1. Raw, installed - a raw, unbundled dependency will be used; for `@aws-lite/*`, that means the dependency will be installed and deployed with the code payload
   2. Raw, provided - a raw, unbundled dependency provided with the Lambda container will be used (e.g. `@aws-sdk/*` in `nodejs20.x`); this dependency is included with the code payload
   3. Bundled - a bundled dependency will be used for comparison against the raw version; see [bundling](#bundling)
3. Deployment - all scenario Lambdas (e.g. `control`, `aws-lite-raw`, etc.) are deployed via [`@architect/architect`](https://arc.codes) via AWS CloudFormation


#### Testing phase

1. Prep - a simple, flat 100KB row is written to the `results` DynamoDB database (if necessary)
2. Force coldstart - publish an update to each scenario Lambda's environment variables, forcing a coldstart
3. Lambda invoke - invoke the Lambda, which runs through its prescribed operations
4. Failures - all runs from all scenario Lambdas are required to complete; if any single invocation fatally errors, does not complete, or coldstart data cannot be found, the entire process fails
5. Writing results - results are written to a DynamoDB database for possible future use / research, as well as to a JSON file to be published to S3


#### Publishing phase

1. Parsing - results are aggregated and parsed
2. Charting - parsed data is passed to the chart generator, which stamps each chart with appropriate metadata (number of runs, date, etc.)
3. Publishing - charts and raw data are published to a public S3 bucket


### Lambda configuration

All scenario Lambdas share the same configuration: `arm64` architecture; 1024 MB memory, all other default settings.

All Lambdas use `nodejs20.x` with the exception of the raw (provided) AWS SDK v2, which is only available provided in the `nodejs16.x` Lambda image.


### AWS SDK v2

AWS is deprecating AWS SDK v2 (and the Lambda Node.js runtimes that use it) in late 2023. Moving forward, developers will have to decide from the following options:

- Migrate to a new SDK (such as `aws-lite` or AWS SDK v3)
- Bundle AWS SDK v2 in its entirety and ship that as a (very large) vendored dependency
- Bundle individual AWS SDK v2 clients, and ship those as vendored dependencies

Putting aside the fact that AWS SDK v2 is deprecated and [may only receive critical security updates for ~12mo](https://docs.aws.amazon.com/sdkref/latest/guide/maint-policy.html), due to performance concerns we strongly advise against bundling the entirety of AWS SDK v2 as a vendored dependency.

Because we advise against bundling the entire v2 SDK, from a performance testing methodology perspective all bundled (read: not provided) AWS SDK v2 Lambda scenarios represented in this suite of metrics make use of individual bundled clients (e.g. `aws-sdk/clients/dynamodb`).

Once AWS finally deprecates `nodejs16.x`, the `aws-sdk-v2-bundled` Lambda scenario may be deprecated here as well, as we may no longer be able to publish changes to the application via CloudFormation.


### AWS regions

The intention of this dataset is to provide an apples-to-apples comparison of the time and resource costs associated with JavaScript AWS SDKs. This can be reasonably accomplished within a single AWS region.

While it some degree of regional variability is to be expected, the goal is to test SDK performance, not regional performance. Given how the test suite operates, there is no reason to believe that a given SDK would demonstrate performance differences from region to region – in other words, while one region may have slightly faster Lambda hardware than another, that performance would be expected to impact all tests equally.

As such, at this time we feel that a single region can serve as a solid proxy for overall performance.[^1]

We selected `us-west-2` as, in our experience, it has been a highly reliable and performant region, which seems to get relatively early access to new features.


### Bundling

Bundled dependency scenarios are bundled with [`esbuild`](https://esbuild.github.io/) via [simple entry files](src/entry-files). The following settings are used `platform: 'node'`, `format: 'cjs'`; for more detail, see the [deployment plugin](src/plugins/lambdas.mjs).


## Reproduction

We encourage you to replicate these results. Assuming you have an AWS account and credentials with appropriate permissions (see [Architect's AWS setup guide](https://arc.codes/docs/en/get-started/detailed-aws-setup)), run this same performance metric suite with the following steps:

- Pull down this repo
- Modify any AWS profile references to `openjsf` to the appropriate AWS profile you'd like to use
- Install dependencies: `npm i`
- Deploy the project to AWS: `npx arc deploy`
- Run the benchmarks and view the results: `npm run bench`
  - To disable publishing results to a public S3 bucket, set a `DISABLE_PUBLISH` env var


## Acknowledgments

We'd like to acknowledge and thank the following people + projects in this space:

- [Benchmarking the AWS SDK](https://aaronstuyvenberg.com/posts/aws-sdk-comparison) by AJ Stuyvenberg
- [`cold-start-benchmarker`](https://github.com/astuyve/cold-start-benchmarker) by AJ Stuyvenberg
- [`SAR-measure-cold-start`](https://github.com/lumigo-io/SAR-measure-cold-start) by Yan Cui
- [`datadog-lambda-js`](https://github.com/DataDog/datadog-lambda-js)
- [Reduce Lambda cold start times](https://aws.amazon.com/blogs/developer/reduce-lambda-cold-start-times-migrate-to-aws-sdk-for-javascript-v3/) by Trivikram Kamat

---

[^1]: AWS's own published [SDK performance benchmarks](https://aws.amazon.com/blogs/developer/reduce-lambda-cold-start-times-migrate-to-aws-sdk-for-javascript-v3/) also use the same single-region approach
