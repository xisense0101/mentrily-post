import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { EnrollmentRepository } from '../../../domain/repositories/enrollment.repository.js';
import { Enrollment } from '../../../domain/entities/enrollment.entity.js';
import { toDomainEnrollment, toPersistenceEnrollmentCreate } from './learning-prisma.mapper.js';

@Injectable()
export class PrismaEnrollmentRepository implements EnrollmentRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(enrollment: Enrollment, transaction?: TransactionContext): Promise<Enrollment> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.learningEnrollment.upsert({
        where: { id: enrollment.id },
        update: toPersistenceEnrollmentCreate(enrollment),
        create: toPersistenceEnrollmentCreate(enrollment),
      });
      const fresh = await client.learningEnrollment.findUnique({ where: { id: enrollment.id } });
      return toDomainEnrollment(fresh) as Enrollment;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<Enrollment | null> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const rec = await client.learningEnrollment.findUnique({ where: { id } });
      return rec ? toDomainEnrollment(rec) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByWorkspaceCourseAndLearner(
    workspaceId: string,
    courseId: string,
    learnerPrincipalId: string,
    transaction?: TransactionContext,
  ): Promise<Enrollment | null> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const rec = await client.learningEnrollment.findUnique({
        where: {
          workspaceId_courseId_learnerPrincipalId: { workspaceId, courseId, learnerPrincipalId },
        },
      });
      return rec ? toDomainEnrollment(rec) : null;
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByLearner(
    workspaceId: string,
    learnerPrincipalId: string,
    transaction?: TransactionContext,
  ): Promise<Enrollment[]> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const recs = await client.learningEnrollment.findMany({
        where: { workspaceId, learnerPrincipalId },
        orderBy: { enrolledAt: 'desc' },
      });
      return recs.map((r) => toDomainEnrollment(r) as Enrollment);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByCourse(courseId: string, transaction?: TransactionContext): Promise<Enrollment[]> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const recs = await client.learningEnrollment.findMany({
        where: { courseId },
        orderBy: { enrolledAt: 'desc' },
      });
      return recs.map((r) => toDomainEnrollment(r) as Enrollment);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
