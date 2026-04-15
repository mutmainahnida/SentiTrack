export interface JobResponse<TResult> {
  jobId: string;
  status: 'completed';
  createdAt: string;
  result: TResult;
}
