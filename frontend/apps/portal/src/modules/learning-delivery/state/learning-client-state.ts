export type LearningClientStatus = 'idle' | 'loading' | 'success' | 'error';

export interface LearningClientState<TData> {
  data: TData;
  error: string | null;
  status: LearningClientStatus;
}

export function createLearningClientState<TData>(
  data: TData,
): LearningClientState<TData> {
  return {
    data,
    error: null,
    status: 'idle',
  };
}
