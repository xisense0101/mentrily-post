import { Inject, Injectable } from '@nestjs/common';
import type {
  AssessmentSecurityPolicyContract,
  UpdateAssessmentSecurityPolicyRequestContract,
} from '@mentrily/contract-catalog';
import {
  AppError,
  PERMISSION_EVALUATOR,
  PermissionEvaluator,
  RequestContext,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '@mentrily/service-core';
import { PrismaService, getPrismaClient } from '@mentrily/data-platform';
import { PermissionCatalog } from '@mentrily/security-toolkit';
import { AssessmentSecurityPolicyRepository } from '../proctoring.repository.js';
import { ProctoringPolicyService } from '../proctoring-policy.service.js';

function requireWorkspaceActor(context: RequestContext) {
  const workspace = context.workspace;
  if (!workspace?.tenantId || !workspace.workspaceId || !workspace.actorId) {
    throw new AppError('VALIDATION_ERROR', 'missing workspace actor context', 400);
  }
  return workspace;
}

@Injectable()
export class GetAssessmentSecurityPolicyUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssessmentSecurityPolicyRepository)
    private readonly policies: AssessmentSecurityPolicyRepository,
    @Inject(ProctoringPolicyService)
    private readonly policyService: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
  ): Promise<AssessmentSecurityPolicyContract> {
    const workspace = requireWorkspaceActor(context);
    const readPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_READ, workspace },
      context,
    );
    const updatePermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );
    const monitorPermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_MONITOR, workspace },
      context,
    );
    if (!readPermission.allowed && !updatePermission.allowed && !monitorPermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    await assertAssessmentInWorkspace(this.prisma, assessmentId, workspace.workspaceId);
    const policyRecord = await this.policies.findByAssessmentId(
      workspace.workspaceId,
      assessmentId,
    );
    const policy = policyRecord
      ? this.policyService.fromRecord(policyRecord)
      : this.policyService.createDefaultPolicy(assessmentId);
    return this.policyService.toContract(policy);
  }
}

@Injectable()
export class UpdateAssessmentSecurityPolicyUseCase {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AssessmentSecurityPolicyRepository)
    private readonly policies: AssessmentSecurityPolicyRepository,
    @Inject(ProctoringPolicyService)
    private readonly policyService: ProctoringPolicyService,
    @Inject(PERMISSION_EVALUATOR) private readonly permissions: PermissionEvaluator,
    @Inject(TRANSACTION_RUNNER) private readonly transactions: TransactionRunner,
  ) {}

  async execute(
    context: RequestContext,
    assessmentId: string,
    input: UpdateAssessmentSecurityPolicyRequestContract,
  ): Promise<AssessmentSecurityPolicyContract> {
    const workspace = requireWorkspaceActor(context);
    const updatePermission = await this.permissions.evaluate(
      { permission: PermissionCatalog.ASSESSMENT_UPDATE, workspace },
      context,
    );
    if (!updatePermission.allowed) {
      throw new AppError('FORBIDDEN', 'permission denied', 403);
    }

    return this.transactions.run(async (tx) => {
      await assertAssessmentInWorkspace(this.prisma, assessmentId, workspace.workspaceId, tx);
      const config = this.policyService.validateUpdate(assessmentId, input);
      const saved = await this.policies.upsert(
        {
          tenantId: workspace.tenantId,
          workspaceId: workspace.workspaceId,
          assessmentId,
          config,
        },
        tx,
      );
      return this.policyService.toContract(this.policyService.fromRecord(saved));
    });
  }
}

async function assertAssessmentInWorkspace(
  prisma: PrismaService,
  assessmentId: string,
  workspaceId: string,
  transaction?: Parameters<typeof getPrismaClient>[1],
) {
  const assessment = await getPrismaClient(prisma, transaction).assessment.findUnique({
    where: { id: assessmentId },
    select: { id: true, workspaceId: true },
  });
  if (!assessment || assessment.workspaceId !== workspaceId) {
    throw new AppError('NOT_FOUND', 'assessment not found', 404);
  }
}
