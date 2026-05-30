export async function pollJobResult<T>(
  queueName: string,
  jobId: string,
  intervalMs = 1000,
  maxAttempts = 60,
): Promise<T> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    try {
      const resp = await fetch(`/api/jobs/${queueName}/${jobId}`);
      if (!resp.ok) {
        throw new Error(`Failed to fetch job status: HTTP ${resp.status}`);
      }

      const data = await resp.json();

      if (data.state === "completed") {
        return data.result as T;
      }

      if (data.state === "failed") {
        throw new Error(data.error || "Job execution failed");
      }
    } catch (e: any) {
      if (
        e.message &&
        (e.message.includes("failed") || e.message.includes("Failed"))
      ) {
        throw e;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Job request timed out. Please try again.");
}
