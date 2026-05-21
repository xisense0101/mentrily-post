import { describe, expect, it, vi } from 'vitest';
import {
  RequestContext,
  PermissionEvaluator,
  PermissionEvaluationResult,
} from '@mentrily/service-core';
import { LearningCourseRepository } from '../domain/repositories/learning-course.repository.js';
import { GetLearningCourseUseCase } from '../application/use-cases/get-learning-course.use-case.js';
import { ListWorkspaceLearningCoursesUseCase } from '../application/use-cases/list-workspace-learning-courses.use-case.js';

describe('learning read use-cases', () => {
  it('list uses workspace context', async () => {
    const repo = {
      listByWorkspace: vi.fn(async () => [
        { tenantId: 't1', workspaceId: 'w1' },
        { tenantId: 't2', workspaceId: 'w2' },
      ]),
    } as unknown as LearningCourseRepository;
    const perms: PermissionEvaluator = {
      evaluate: vi.fn(async () => ({ allowed: true }) as PermissionEvaluationResult),
    };
    const uc = new ListWorkspaceLearningCoursesUseCase(repo, perms);
    const context: RequestContext = {
      requestId: 'r',
      correlationId: 'c',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 't1', workspaceId: 'w1' },
    };
    const result = await uc.execute(context);
    expect(repo.listByWorkspace).toHaveBeenCalledWith('w1');
    expect(result).toHaveLength(1);
  });

  it('get rejects cross workspace course', async () => {
    const repo = {
      findById: vi.fn(async () => ({ id: 'c1', tenantId: 't2', workspaceId: 'w2' })),
    } as unknown as LearningCourseRepository;
    const perms: PermissionEvaluator = {
      evaluate: vi.fn(async () => ({ allowed: true }) as PermissionEvaluationResult),
    };
    const uc = new GetLearningCourseUseCase(repo, perms);
    const context: RequestContext = {
      requestId: 'r',
      correlationId: 'c',
      timestamp: new Date().toISOString(),
      workspace: { tenantId: 't1', workspaceId: 'w1' },
    };
    await expect(uc.execute(context, 'c1')).rejects.toMatchObject({ statusCode: 404 });
  });
});
