export type PipelineStatus = 'pending' | 'processing' | 'done' | 'failed';

export interface PipelineState {
  status: PipelineStatus;
  query?: string;
  tweets?: Array<Record<string, unknown>>;
  result?: Record<string, unknown>;
  errorMessage?: string;
}
