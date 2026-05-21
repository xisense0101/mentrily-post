import { describe, it, expect } from 'vitest';
import { Enrollment } from '../domain/entities/enrollment.entity.js';
import { EnrollmentStatus } from '../domain/value-objects/enrollment-status.vo.js';

describe('Enrollment domain', () => {
  const create = (id = 'e1') =>
    Enrollment.create({
      id,
      tenantId: 't',
      workspaceId: 'w',
      courseId: 'c',
      learnerPrincipalId: 'l',
    });

  it('enrollment can be created and derives natural key', () => {
    const e = create();
    expect(e.status).toBe(EnrollmentStatus.ACTIVE);
    expect(e.naturalKey()).toBe('w:c:l');
  });

  it('start() sets startedAt once', () => {
    const e = create('e2');
    e.start();
    expect(e.startedAt).toBeDefined();
    const firstStartedAt = e.startedAt;
    e.start();
    expect(e.startedAt).toBe(firstStartedAt);
  });

  it('complete() sets completedAt and status; cannot complete twice', () => {
    const e = create('e3');
    e.complete();
    expect(e.completedAt).toBeDefined();
    expect(e.status).toBe(EnrollmentStatus.COMPLETED);
    expect(() => e.complete()).toThrow();
  });

  it('cancelled enrollment cannot complete', () => {
    const e = create('e4');
    e.cancel();
    expect(() => e.complete()).toThrow();
  });

  it('cancelled enrollment can reactivate and reactivate clears cancelledAt only', () => {
    const e = create('e5');
    e.start();
    const firstStartedAt = e.startedAt;
    e.cancel();
    expect(e.status).toBe(EnrollmentStatus.CANCELLED);
    e.reactivate();
    expect(e.status).toBe(EnrollmentStatus.ACTIVE);
    expect(e.cancelledAt).toBeUndefined();
    expect(e.startedAt).toBe(firstStartedAt);
  });

  it('completed enrollment cannot be cancelled', () => {
    const e = create('e6');
    e.complete();
    expect(() => e.cancel()).toThrow();
  });

  it('missing tenant/workspace/course/learner IDs throw', () => {
    expect(() =>
      Enrollment.create({
        id: 'e7',
        tenantId: '',
        workspaceId: 'w',
        courseId: 'c',
        learnerPrincipalId: 'l',
      }),
    ).toThrow();
    expect(() =>
      Enrollment.create({
        id: 'e8',
        tenantId: 't',
        workspaceId: '',
        courseId: 'c',
        learnerPrincipalId: 'l',
      }),
    ).toThrow();
    expect(() =>
      Enrollment.create({
        id: 'e9',
        tenantId: 't',
        workspaceId: 'w',
        courseId: '',
        learnerPrincipalId: 'l',
      }),
    ).toThrow();
    expect(() =>
      Enrollment.create({
        id: 'e10',
        tenantId: 't',
        workspaceId: 'w',
        courseId: 'c',
        learnerPrincipalId: '',
      }),
    ).toThrow();
  });
});
