export const logger = {
  event(interviewId: string, eventType: string) {
    console.info(JSON.stringify({ interviewId, eventType }));
  },
  error(interviewId: string, eventType: string, error: unknown) {
    console.error(
      JSON.stringify({ interviewId, eventType, error: String(error) }),
    );
  },
};
