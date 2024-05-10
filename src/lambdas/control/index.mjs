export async function handler (event, context) {
  const now = Date.now()
  return {
    report: {
      id: context.awsRequestId,
      start: now,
      end: now,
    },
  }
}
