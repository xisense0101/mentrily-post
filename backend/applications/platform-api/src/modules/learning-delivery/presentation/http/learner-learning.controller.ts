import { Controller, Post, Get, Req, Param, Body, Inject } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import { EnrollInLearningCourseUseCase } from '../../application/use-cases/enroll-in-learning-course.use-case.js';
import { ListLearningEnrollmentsUseCase } from '../../application/use-cases/list-learning-enrollments.use-case.js';
import { MarkLearningProgressUseCase } from '../../application/use-cases/mark-learning-progress.use-case.js';
import { CompleteEnrollmentUseCase } from '../../application/use-cases/complete-enrollment.use-case.js';
import { EnrollInLearningCourseInput } from '../../application/dto/enroll-in-learning-course.dto.js';
import { MarkLearningProgressInput } from '../../application/dto/mark-learning-progress.dto.js';
import { mapEnrollmentToResponse } from '../../application/mappers/learning-enrollment-response.mapper.js';
import { LearningProgressResponse } from '../../application/dto/learning-enrollment-response.dto.js';
import { LearningProgress } from '../../domain/entities/learning-progress.entity.js';

@Controller('/workspace/learning')
export class LearnerLearningController {
  constructor(
    @Inject(EnrollInLearningCourseUseCase)
    private readonly enrollCourse: EnrollInLearningCourseUseCase,
    @Inject(ListLearningEnrollmentsUseCase)
    private readonly listEnrollmentsUseCase: ListLearningEnrollmentsUseCase,
    @Inject(MarkLearningProgressUseCase)
    private readonly markProgress: MarkLearningProgressUseCase,
    @Inject(CompleteEnrollmentUseCase)
    private readonly completeEnrollmentUseCase: CompleteEnrollmentUseCase,
  ) {}

  @Post('/courses/:courseId/enroll')
  async enroll(
    @Req() request: FastifyRequest,
    @Param('courseId') courseId: string,
    @Body() body: EnrollInLearningCourseInput,
  ) {
    const enrollment = await this.enrollCourse.execute(
      this.requestContext(request),
      courseId,
      body,
    );
    return mapEnrollmentToResponse(enrollment);
  }

  @Get('/enrollments')
  async listEnrollments(@Req() request: FastifyRequest) {
    const enrollments = await this.listEnrollmentsUseCase.execute(this.requestContext(request));
    return enrollments.map((item) => mapEnrollmentToResponse(item));
  }

  @Post('/enrollments/:enrollmentId/progress/:lessonId')
  async markProgressEndpoint(
    @Req() request: FastifyRequest,
    @Param('enrollmentId') enrollmentId: string,
    @Param('lessonId') lessonId: string,
    @Body() body: MarkLearningProgressInput,
  ) {
    const progress = await this.markProgress.execute(
      this.requestContext(request),
      enrollmentId,
      lessonId,
      body,
    );
    return this.toProgressResponse(progress);
  }

  @Post('/enrollments/:enrollmentId/complete')
  async completeEnrollment(
    @Req() request: FastifyRequest,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    const enrollment = await this.completeEnrollmentUseCase.execute(
      this.requestContext(request),
      enrollmentId,
    );
    return mapEnrollmentToResponse(enrollment);
  }

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    return context;
  }

  private toProgressResponse(progress: LearningProgress): LearningProgressResponse {
    return {
      id: progress.id,
      enrollmentId: progress.enrollmentId,
      lessonId: progress.lessonId,
      status: String(progress.status),
      ...(progress.startedAt ? { startedAt: progress.startedAt.toISOString() } : {}),
      ...(progress.completedAt ? { completedAt: progress.completedAt.toISOString() } : {}),
      ...(progress.lastSeenAt ? { lastSeenAt: progress.lastSeenAt.toISOString() } : {}),
    };
  }
}
