import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { AssessmentRepository } from '../../../domain/repositories/index.js';
import { Assessment } from '../../../domain/entities/index.js';
import { AssessmentPurpose } from '../../../domain/value-objects/index.js';
import {
  toDomainAssessment,
  toPersistenceAssessmentCreate,
  toPersistenceAssessmentUpdate,
  toPersistenceQuestionCreate,
  toPersistenceRuleCreate,
  toPersistenceRubricCreate,
  toPersistenceSectionCreate,
  toPersistenceVersionCreate,
} from './assessment-prisma.mapper.js';

type AssessmentPrismaClient = Pick<
  PrismaClient,
  | 'assessment'
  | 'assessmentVersion'
  | 'assessmentSection'
  | 'assessmentQuestion'
  | 'assessmentGradingRubric'
  | 'assessmentGradingRule'
  | 'assessmentPublishedSnapshot'
>;

function resolveAssessmentPrismaClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): AssessmentPrismaClient {
  return getPrismaClient(prisma, transaction) as unknown as AssessmentPrismaClient;
}

@Injectable()
export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(assessment: Assessment, transaction?: TransactionContext): Promise<Assessment> {
    const client = resolveAssessmentPrismaClient(this.prisma, transaction);

    try {
      // 1. Upsert Assessment
      await client.assessment.upsert({
        where: { id: assessment.id },
        create: toPersistenceAssessmentCreate(assessment),
        update: toPersistenceAssessmentUpdate(assessment),
      });

      // 2. Upsert Current Draft Version
      if (assessment.currentDraftVersion) {
        const version = assessment.currentDraftVersion;
        await client.assessmentVersion.upsert({
          where: {
            assessmentId_versionNumber: {
              assessmentId: assessment.id,
              versionNumber: version.versionNumber,
            },
          },
          create: toPersistenceVersionCreate(version),
          update: {
            status: version.status,
            publishedAt: version.publishedAt ?? null,
            supersededAt: version.supersededAt ?? null,
          },
        });

        // 3. Replace Content (Sections and Questions)
        // We delete and recreate to ensure clean state for the draft version
        await client.assessmentQuestion.deleteMany({
          where: { versionId: version.id },
        });
        await client.assessmentSection.deleteMany({
          where: { versionId: version.id },
        });

        for (const section of version.sections) {
          await client.assessmentSection.create({
            data: toPersistenceSectionCreate(section, version.id),
          });
          for (const question of section.questions) {
            await client.assessmentQuestion.create({
              data: toPersistenceQuestionCreate(question, version.id, section.id),
            });
          }
        }

        for (const question of version.looseQuestions) {
          await client.assessmentQuestion.create({
            data: toPersistenceQuestionCreate(question, version.id),
          });
        }
      }

      // 4. Update Grading Rubrics
      await client.assessmentGradingRubric.deleteMany({
        where: { assessmentId: assessment.id },
      });
      for (const rubric of assessment.gradingRubrics) {
        await client.assessmentGradingRubric.create({
          data: toPersistenceRubricCreate(rubric),
        });
      }

      // 5. Update Grading Rules
      await client.assessmentGradingRule.deleteMany({
        where: { assessmentId: assessment.id },
      });
      for (const rule of assessment.gradingRules) {
        await client.assessmentGradingRule.create({
          data: toPersistenceRuleCreate(rule),
        });
      }

      // 6. Update references and status
      await client.assessment.update({
        where: { id: assessment.id },
        data: {
          currentDraftVersionId: assessment.currentDraftVersion?.id ?? null,
          publishedSnapshotId: assessment.publishedSnapshot?.id ?? null,
          status: assessment.status,
          publishedAt: assessment.publishedAt ?? null,
          archivedAt: assessment.archivedAt ?? null,
          updatedAt: assessment.updatedAt,
        },
      });

      const fresh = await this.loadFull(assessment.id, transaction);
      if (!fresh) {
        throw new Error(`Assessment ${assessment.id} not found after save`);
      }

      return fresh;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<Assessment | null> {
    try {
      return await this.loadFull(id, transaction);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByWorkspace(
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<Assessment[]> {
    const client = resolveAssessmentPrismaClient(this.prisma, transaction);
    try {
      const records = await client.assessment.findMany({
        where: { workspaceId },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: this.fullInclude(),
      });
      return records.map(toDomainAssessment);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByPurpose(
    workspaceId: string,
    purpose: AssessmentPurpose,
    transaction?: TransactionContext,
  ): Promise<Assessment[]> {
    const client = resolveAssessmentPrismaClient(this.prisma, transaction);
    try {
      const records = await client.assessment.findMany({
        where: { workspaceId, purpose },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        include: this.fullInclude(),
      });
      return records.map(toDomainAssessment);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  private async loadFull(id: string, transaction?: TransactionContext): Promise<Assessment | null> {
    const client = resolveAssessmentPrismaClient(this.prisma, transaction);
    const record = await client.assessment.findUnique({
      where: { id },
      include: this.fullInclude(),
    });

    return record ? toDomainAssessment(record) : null;
  }

  private fullInclude() {
    return {
      currentDraftVersion: {
        include: {
          sections: {
            orderBy: { position: 'asc' as const },
            include: {
              questions: {
                orderBy: { position: 'asc' as const },
              },
            },
          },
          questions: {
            where: { sectionId: null },
            orderBy: { position: 'asc' as const },
          },
        },
      },
      publishedSnapshot: true,
      gradingRubrics: {
        orderBy: { title: 'asc' as const },
      },
      gradingRules: {
        orderBy: { createdAt: 'asc' as const },
      },
    };
  }
}
