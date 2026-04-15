export class JobRequestTimeoutError extends Error {
  constructor(
    public readonly jobId: string,
    message = 'Job processing timeout after 120000ms',
  ) {
    super(message);
    this.name = JobRequestTimeoutError.name;
  }
}
