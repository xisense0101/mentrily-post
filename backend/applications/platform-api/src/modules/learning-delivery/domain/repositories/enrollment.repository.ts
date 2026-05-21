import { Injectable } from '@nestjs/common';
import { Enrollment } from '../entities/enrollment.entity.js';
import { TransactionContext } from '@mentrily/service-core';

@Injectable()
export abstract class EnrollmentRepository {
  abstract save(enrollment: Enrollment, transaction?: TransactionContext): Promise<Enrollment>;
  abstract findById(id: string, transaction?: TransactionContext): Promise<Enrollment | null>;
  abstract findByWorkspaceCourseAndLearner(
    workspaceId: string,
    courseId: string,
    learnerPrincipalId: string,
    transaction?: TransactionContext,
  ): Promise<Enrollment | null>;
  abstract listByLearner(
    workspaceId: string,
    learnerPrincipalId: string,
    transaction?: TransactionContext,
  ): Promise<Enrollment[]>;
  abstract listByCourse(courseId: string, transaction?: TransactionContext): Promise<Enrollment[]>;
}
