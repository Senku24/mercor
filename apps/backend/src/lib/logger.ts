const MAX_DETAIL_LENGTH = 500;

// Structured errors (e.g. Prisma's CliStructuredError) carry the useful reason in
// `why` and the driver error in `cause`; String(error) alone hides both.
function errorDetail(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const { why, cause } = error as { why?: unknown; cause?: unknown };
  const parts = [
    typeof why === "string" ? why : undefined,
    cause instanceof Error ? cause.message : undefined,
  ].filter(Boolean);
  return parts.length
    ? parts.join(" | ").slice(0, MAX_DETAIL_LENGTH)
    : undefined;
}

export const logger = {
  event(interviewId: string, eventType: string) {
    console.info(JSON.stringify({ interviewId, eventType }));
  },
  error(interviewId: string, eventType: string, error: unknown) {
    console.error(
      JSON.stringify({
        interviewId,
        eventType,
        error: String(error),
        detail: errorDetail(error),
      }),
    );
  },
};
