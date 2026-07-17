import "server-only";

type TimingStatus = "error" | "ok";

export async function timeServer<T>(
  label: string,
  operation: () => PromiseLike<T> | T,
): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await operation();
    logServerTiming(label, startedAt, "ok");
    return result;
  } catch (error) {
    logServerTiming(label, startedAt, "error");
    throw error;
  }
}

function logServerTiming(
  label: string,
  startedAt: number,
  status: TimingStatus,
) {
  if (
    process.env.PERF_LOGGING !== "1" &&
    process.env.ENABLE_SERVER_TIMING_LOGS !== "true"
  ) {
    return;
  }

  const durationMs = Date.now() - startedAt;

  console.log(`[perf] ${label} status=${status} duration_ms=${durationMs}`);
}
