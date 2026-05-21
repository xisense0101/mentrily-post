import { describe, it, expect } from 'vitest';
import {
  courseCreated,
  coursePublished,
  courseArchived,
  enrollmentCreated,
  enrollmentCompleted,
  progressCompleted,
} from '../domain/events/learning-events.js';

describe('Learning events', () => {
  it('courseCreated factory preserves context and payload', () => {
    const ev = courseCreated({
      tenantId: 't1',
      workspaceId: 'w1',
      courseId: 'c1',
      title: 'C',
      creatorPrincipalId: 'p1',
    });
    expect(ev.eventName).toBe('learning.course.created');
    expect(ev.eventVersion).toBe(1);
    expect(ev.tenantId).toBe('t1');
    expect(ev.workspaceId).toBe('w1');
    expect(ev.aggregateId).toBe('c1');
    expect(ev.payload).toEqual({ courseId: 'c1', title: 'C', creatorPrincipalId: 'p1' });
    expect(ev.tenantId).not.toBe('');
    expect(ev.workspaceId).not.toBe('');
  });

  it('coursePublished factory preserves context and payload', () => {
    const ev = coursePublished({ tenantId: 't2', workspaceId: 'w2', courseId: 'c2' });
    expect(ev.eventName).toBe('learning.course.published');
    expect(ev.eventVersion).toBe(1);
    expect(ev.tenantId).toBe('t2');
    expect(ev.workspaceId).toBe('w2');
    expect(ev.aggregateId).toBe('c2');
    expect(ev.payload).toEqual({ courseId: 'c2' });
    expect(ev.tenantId).not.toBe('');
    expect(ev.workspaceId).not.toBe('');
  });

  it('courseArchived factory preserves context and payload', () => {
    const ev = courseArchived({ tenantId: 't3', workspaceId: 'w3', courseId: 'c3' });
    expect(ev.eventName).toBe('learning.course.archived');
    expect(ev.eventVersion).toBe(1);
    expect(ev.tenantId).toBe('t3');
    expect(ev.workspaceId).toBe('w3');
    expect(ev.aggregateId).toBe('c3');
    expect(ev.payload).toEqual({ courseId: 'c3' });
    expect(ev.tenantId).not.toBe('');
    expect(ev.workspaceId).not.toBe('');
  });

  it('enrollmentCreated factory preserves context and payload', () => {
    const ev = enrollmentCreated({ tenantId: 't4', workspaceId: 'w4', enrollmentId: 'e4' });
    expect(ev.eventName).toBe('learning.enrollment.created');
    expect(ev.eventVersion).toBe(1);
    expect(ev.tenantId).toBe('t4');
    expect(ev.workspaceId).toBe('w4');
    expect(ev.aggregateId).toBe('e4');
    expect(ev.payload).toEqual({ enrollmentId: 'e4' });
    expect(ev.tenantId).not.toBe('');
    expect(ev.workspaceId).not.toBe('');
  });

  it('enrollmentCompleted factory preserves context and payload', () => {
    const ev = enrollmentCompleted({ tenantId: 't5', workspaceId: 'w5', enrollmentId: 'e5' });
    expect(ev.eventName).toBe('learning.enrollment.completed');
    expect(ev.eventVersion).toBe(1);
    expect(ev.tenantId).toBe('t5');
    expect(ev.workspaceId).toBe('w5');
    expect(ev.aggregateId).toBe('e5');
    expect(ev.payload).toEqual({ enrollmentId: 'e5' });
    expect(ev.tenantId).not.toBe('');
    expect(ev.workspaceId).not.toBe('');
  });

  it('progressCompleted factory preserves context and payload', () => {
    const ev = progressCompleted({ tenantId: 't6', workspaceId: 'w6', progressId: 'p6' });
    expect(ev.eventName).toBe('learning.progress.completed');
    expect(ev.eventVersion).toBe(1);
    expect(ev.tenantId).toBe('t6');
    expect(ev.workspaceId).toBe('w6');
    expect(ev.aggregateId).toBe('p6');
    expect(ev.payload).toEqual({ progressId: 'p6' });
    expect(ev.tenantId).not.toBe('');
    expect(ev.workspaceId).not.toBe('');
  });
});
