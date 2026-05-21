import { Inject, Injectable } from '@nestjs/common';
import { PrismaService, getPrismaClient, mapPrismaError } from '@mentrily/data-platform';
import { TransactionContext } from '@mentrily/service-core';
import { LearningCourseRepository } from '../../../domain/repositories/learning-course.repository.js';
import { LearningCourse } from '../../../domain/entities/learning-course.entity.js';
import {
  toDomainCourse,
  toDomainCourseOrNull,
  toPersistenceCourseCreate,
  toPersistenceSection,
  toPersistenceLesson,
} from './learning-prisma.mapper.js';

@Injectable()
export class PrismaLearningCourseRepository implements LearningCourseRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async save(course: LearningCourse, transaction?: TransactionContext): Promise<LearningCourse> {
    const client = getPrismaClient(this.prisma, transaction);
    try {
      await client.learningCourse.upsert({
        where: { id: course.id },
        update: toPersistenceCourseCreate(course),
        create: toPersistenceCourseCreate(course),
      });
      await client.learningSection.deleteMany({ where: { courseId: course.id } });

      for (const s of course.sections) {
        await client.learningSection.create({ data: toPersistenceSection(s) });
        for (const l of s.lessons) {
          await client.learningLesson.create({ data: toPersistenceLesson(l) });
        }
      }

      const fresh = await client.learningCourse.findUnique({
        where: { id: course.id },
        include: { sections: { include: { lessons: true } } },
      });
      if (!fresh) {
        throw new Error(`learning course ${course.id} was not found after save`);
      }
      return toDomainCourse(fresh);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findById(id: string, transaction?: TransactionContext): Promise<LearningCourse | null> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const record = await client.learningCourse.findUnique({
        where: { id },
        include: { sections: { include: { lessons: true } } },
      });
      return toDomainCourseOrNull(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async findByWorkspaceAndSlug(
    workspaceId: string,
    slug: string,
    transaction?: TransactionContext,
  ): Promise<LearningCourse | null> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const record = await client.learningCourse.findUnique({
        where: { workspaceId_slug: { workspaceId, slug } },
        include: { sections: { include: { lessons: true } } },
      });
      return toDomainCourseOrNull(record);
    } catch (error) {
      throw mapPrismaError(error);
    }
  }

  async listByWorkspace(
    workspaceId: string,
    transaction?: TransactionContext,
  ): Promise<LearningCourse[]> {
    try {
      const client = getPrismaClient(this.prisma, transaction);
      const records = await client.learningCourse.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
        include: { sections: { include: { lessons: true } } },
      });
      return records.map((r) => toDomainCourse(r));
    } catch (error) {
      throw mapPrismaError(error);
    }
  }
}
