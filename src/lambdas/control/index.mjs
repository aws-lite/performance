export async function handler (event, context) {
  return {
    report: {
      id: context.awsRequestId,
      start: Date.now(),
    }
  }
}
