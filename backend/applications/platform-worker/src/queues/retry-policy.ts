export interface RetryPolicyOptions {
  baseDelayMs: number;
  multiplier: number;
  maxDelayMs: number;
  maxAttempts: number;
}

const DEFAULT_RETRY_POLICY: RetryPolicyOptions = {
  baseDelayMs: 1000,
  multiplier: 2,
  maxDelayMs: 5 * 60 * 1000,
  maxAttempts: 10,
};

export class RetryPolicy {
  constructor(private readonly options: RetryPolicyOptions = DEFAULT_RETRY_POLICY) {}

  get maxAttempts(): number {
    return this.options.maxAttempts;
  }

  shouldRetry(nextAttemptCount: number): boolean {
    return nextAttemptCount < this.options.maxAttempts;
  }

  nextRetryAt(nextAttemptCount: number, now: Date = new Date()): Date {
    const exponent = Math.max(0, nextAttemptCount - 1);
    const backoff = Math.min(
      this.options.maxDelayMs,
      this.options.baseDelayMs * this.options.multiplier ** exponent,
    );

    return new Date(now.getTime() + backoff);
  }
}
