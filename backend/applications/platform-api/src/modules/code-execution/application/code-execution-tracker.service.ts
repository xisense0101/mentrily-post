import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';
import { CodeExecutionResultResponse } from './dto/code-execution.dto.js';

interface CachedRun {
  status: 'running' | 'completed';
  promise?: Promise<CodeExecutionResultResponse>;
  result?: CodeExecutionResultResponse;
  createdAt: number;
}

@Injectable()
export class CodeExecutionTrackerService {
  // Rate limiting states
  private readonly learnerRuns = new Map<string, number[]>(); // learnerId -> timestamps
  private readonly attemptQuestionCounts = new Map<string, number>(); // attemptId_questionId -> count
  private readonly activeLearnerAttemptQuestions = new Set<string>(); // learnerId_attemptId_questionId
  private readonly activeWorkspaceRuns = new Map<string, Set<string>>(); // workspaceId -> set of requestIds
  private readonly idempotencyCache = new Map<string, CachedRun>();

  // Limits
  private readonly LEARNER_LIMIT_PER_MIN = 5;
  private readonly QUESTION_LIMIT_PER_ATTEMPT = 30;
  private readonly WORKSPACE_CONCURRENCY_LIMIT = 20;

  constructor() {
    // Periodically clean up old idempotency cache entries (older than 10 minutes)
    setInterval(() => {
      const now = Date.now();
      for (const [key, val] of this.idempotencyCache.entries()) {
        if (now - val.createdAt > 10 * 60 * 1000) {
          this.idempotencyCache.delete(key);
        }
      }
    }, 60 * 1000).unref();
  }

  async acquireAndCheckLimits(
    workspaceId: string,
    learnerId: string,
    attemptId?: string | null,
    questionId?: string | null,
    idempotencyKey?: string | null,
  ): Promise<{
    cachedResult?: CodeExecutionResultResponse;
    cachedPromise?: Promise<CodeExecutionResultResponse>;
    release: (errorOccurred?: boolean) => void;
  }> {
    const now = Date.now();

    // 1. Check idempotency key first
    let cacheKey = '';
    if (idempotencyKey) {
      cacheKey = `${workspaceId}_${learnerId}_${idempotencyKey}`;
      const cached = this.idempotencyCache.get(cacheKey);
      if (cached) {
        if (cached.status === 'completed' && cached.result) {
          return {
            cachedResult: cached.result,
            release: () => {},
          };
        }
        if (cached.status === 'running' && cached.promise) {
          return {
            cachedPromise: cached.promise,
            release: () => {},
          };
        }
      }
    }

    // 2. Enforce per-learner rate limit (5 runs per minute)
    let timestamps = this.learnerRuns.get(learnerId) || [];
    timestamps = timestamps.filter((t) => now - t < 60000);
    this.learnerRuns.set(learnerId, timestamps);

    if (timestamps.length >= this.LEARNER_LIMIT_PER_MIN) {
      throw new AppError(
        'RATE_LIMITED',
        `Learner rate limit exceeded. Max ${this.LEARNER_LIMIT_PER_MIN} runs per minute.`,
        429,
      );
    }

    // 3. Enforce per attempt/question count limit (30 runs per attempt/question)
    let attemptQuestionKey = '';
    if (attemptId && questionId) {
      attemptQuestionKey = `${attemptId}_${questionId}`;
      const runCount = this.attemptQuestionCounts.get(attemptQuestionKey) || 0;
      if (runCount >= this.QUESTION_LIMIT_PER_ATTEMPT) {
        throw new AppError(
          'RATE_LIMITED',
          `Question run limit exceeded. Max ${this.QUESTION_LIMIT_PER_ATTEMPT} runs per question in this attempt.`,
          429,
        );
      }
    }

    // 4. Enforce learner-attempt-question active concurrency limit (max 1 active run)
    let learnerAttemptQuestionKey = '';
    if (attemptId && questionId) {
      learnerAttemptQuestionKey = `${learnerId}_${attemptId}_${questionId}`;
      if (this.activeLearnerAttemptQuestions.has(learnerAttemptQuestionKey)) {
        throw new AppError(
          'CONFLICT',
          'An execution run is already active for this question.',
          409,
        );
      }
    }

    // 5. Enforce workspace active concurrency limit (max 20 concurrent runs)
    const activeReqs = this.activeWorkspaceRuns.get(workspaceId) || new Set<string>();
    if (activeReqs.size >= this.WORKSPACE_CONCURRENCY_LIMIT) {
      throw new AppError(
        'RATE_LIMITED',
        `Workspace concurrency limit reached. Max ${this.WORKSPACE_CONCURRENCY_LIMIT} concurrent runs.`,
        429,
      );
    }

    // Acquire resources
    const requestId = Math.random().toString(36).substring(7);
    activeReqs.add(requestId);
    this.activeWorkspaceRuns.set(workspaceId, activeReqs);

    if (learnerAttemptQuestionKey) {
      this.activeLearnerAttemptQuestions.add(learnerAttemptQuestionKey);
    }

    // Increment attempt question run count and append to learner timestamps
    timestamps.push(now);
    this.learnerRuns.set(learnerId, timestamps);

    if (attemptQuestionKey) {
      const runCount = this.attemptQuestionCounts.get(attemptQuestionKey) || 0;
      this.attemptQuestionCounts.set(attemptQuestionKey, runCount + 1);
    }

    let released = false;
    const release = (errorOccurred?: boolean) => {
      if (released) return;
      released = true;

      // Release active concurrency
      const currentReqs = this.activeWorkspaceRuns.get(workspaceId);
      if (currentReqs) {
        currentReqs.delete(requestId);
        if (currentReqs.size === 0) {
          this.activeWorkspaceRuns.delete(workspaceId);
        }
      }

      if (learnerAttemptQuestionKey) {
        this.activeLearnerAttemptQuestions.delete(learnerAttemptQuestionKey);
      }

      // If error occurred and idempotencyKey was set, we should remove from idempotencyCache
      if (errorOccurred && idempotencyKey && cacheKey) {
        this.idempotencyCache.delete(cacheKey);
      }
    };

    return { release };
  }

  registerPromise(
    workspaceId: string,
    actorId: string,
    idempotencyKey: string,
    promise: Promise<CodeExecutionResultResponse>,
  ): void {
    const cacheKey = `${workspaceId}_${actorId}_${idempotencyKey}`;
    this.idempotencyCache.set(cacheKey, {
      status: 'running',
      promise,
      createdAt: Date.now(),
    });
  }

  registerResult(
    workspaceId: string,
    actorId: string,
    idempotencyKey: string,
    result: CodeExecutionResultResponse,
  ): void {
    const cacheKey = `${workspaceId}_${actorId}_${idempotencyKey}`;
    this.idempotencyCache.set(cacheKey, {
      status: 'completed',
      result,
      createdAt: Date.now(),
    });
  }

  reset(): void {
    this.learnerRuns.clear();
    this.attemptQuestionCounts.clear();
    this.activeLearnerAttemptQuestions.clear();
    this.activeWorkspaceRuns.clear();
    this.idempotencyCache.clear();
  }
}
