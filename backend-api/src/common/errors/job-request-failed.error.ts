export class JobRequestFailedError extends Error {
  constructor(
    public readonly jobId: string,
    message = 'Job processing failed',
  ) {
    super(message);
    this.name = JobRequestFailedError.name;
  }
}
