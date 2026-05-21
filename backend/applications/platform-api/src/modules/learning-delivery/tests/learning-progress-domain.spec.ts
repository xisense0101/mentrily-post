import { describe, it, expect } from 'vitest';
import { LearningProgress } from '../domain/entities/learning-progress.entity.js';
import { LearningProgressStatus } from '../domain/value-objects/learning-progress-status.vo.js';

describe('LearningProgress domain', () => {
  const create = (id = 'p1') =>
    LearningProgress.createNotStarted({
      id,
      tenantId: 't',
      workspaceId: 'w',
      courseId: 'c',
      enrollmentId: 'e',
      lessonId: 'l',
      learnerPrincipalId: 'lp',
    });

  it('progress starts as NOT_STARTED', () => {
    const p = create();
    expect(p.status).toBe(LearningProgressStatus.NOT_STARTED);
  });

  it('markStarted() sets startedAt once', () => {
    const p = create('p2');
    p.markStarted();
    expect(p.status).toBe(LearningProgressStatus.IN_PROGRESS);
    expect(p.startedAt).toBeDefined();
    const firstStartedAt = p.startedAt;
    p.markStarted();
    expect(p.startedAt).toBe(firstStartedAt);
  });

  it('markSeen() updates lastSeenAt and from NOT_STARTED sets IN_PROGRESS + startedAt', () => {
    const p = create('p3');
    p.markSeen();
    expect(p.status).toBe(LearningProgressStatus.IN_PROGRESS);
    expect(p.startedAt).toBeDefined();
    expect(p.lastSeenAt).toBeDefined();
    const firstSeen = p.lastSeenAt;
    const firstStarted = p.startedAt;
    p.markSeen();
    expect(p.lastSeenAt).toBeDefined();
    expect((p.lastSeenAt?.getTime() ?? 0) >= (firstSeen?.getTime() ?? 0)).toBe(true);
    expect(p.startedAt).toBe(firstStarted);
  });

  it('markCompleted() sets completedAt and completed progress cannot complete twice', () => {
    const p = create('p4');
    p.markCompleted();
    expect(p.status).toBe(LearningProgressStatus.COMPLETED);
    expect(p.completedAt).toBeDefined();
    expect(() => p.markCompleted()).toThrow();
  });

  it('reset() clears timestamps and returns to NOT_STARTED', () => {
    const p = create('p5');
    p.markStarted();
    p.markSeen();
    p.markCompleted();
    p.reset();
    expect(p.status).toBe(LearningProgressStatus.NOT_STARTED);
    expect(p.startedAt).toBeUndefined();
    expect(p.completedAt).toBeUndefined();
    expect(p.lastSeenAt).toBeUndefined();
  });
});
