import { Body, Controller, Get, Inject, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import {
  ArchiveAssessmentUseCase,
  AssessmentAttemptResponse,
  CreateAssessmentInput,
  CreateAssessmentUseCase,
  GetAssessmentAttemptUseCase,
  GetAssessmentAttemptSnapshotUseCase,
  GetAssessmentUseCase,
  GetAssessmentGradingRunUseCase,
  GetLatestAssessmentGradingRunUseCase,
  GetLatestAssessmentSnapshotUseCase,
  GradeAssessmentAttemptUseCase,
  ListAssessmentsUseCase,
  ListLearnerAssessmentAttemptsUseCase,
  ListPendingManualReviewUseCase,
  ManualGradeAssessmentAnswerInput,
  ManualGradeAssessmentAnswerUseCase,
  PublishAssessmentUseCase,
  ReplaceAssessmentContentInput,
  ReplaceAssessmentContentUseCase,
  RestoreAssessmentUseCase,
  SaveAssessmentAttemptAnswerInput,
  SaveAssessmentAttemptAnswerUseCase,
  CreateAssessmentAttemptAnswerReadUrlUseCase,
  StartAssessmentAttemptInput,
  StartAssessmentAttemptUseCase,
  SubmitAssessmentAttemptUseCase,
  CancelAssessmentAttemptUseCase,
  GetInstructorAssessmentResultUseCase,
  GetLearnerAssessmentResultUseCase,
  ReleaseAssessmentResultInput,
  ReleaseAssessmentResultUseCase,
  UpdateAssessmentInput,
  UpdateAssessmentUseCase,
} from '../../application/index.js';
import { AssessmentPurpose } from '../../domain/index.js';

@Controller('/workspace/assessments')
export class AssessmentDeliveryController {
  constructor(
    @Inject(CreateAssessmentUseCase)
    private readonly createAssessment: CreateAssessmentUseCase,
    @Inject(ListAssessmentsUseCase)
    private readonly listAssessments: ListAssessmentsUseCase,
    @Inject(GetAssessmentUseCase)
    private readonly getAssessment: GetAssessmentUseCase,
    @Inject(UpdateAssessmentUseCase)
    private readonly updateAssessment: UpdateAssessmentUseCase,
    @Inject(ReplaceAssessmentContentUseCase)
    private readonly replaceContent: ReplaceAssessmentContentUseCase,
    @Inject(PublishAssessmentUseCase)
    private readonly publishAssessment: PublishAssessmentUseCase,
    @Inject(ArchiveAssessmentUseCase)
    private readonly archiveAssessment: ArchiveAssessmentUseCase,
    @Inject(RestoreAssessmentUseCase)
    private readonly restoreAssessment: RestoreAssessmentUseCase,
    @Inject(GetLatestAssessmentSnapshotUseCase)
    private readonly getLatestSnapshot: GetLatestAssessmentSnapshotUseCase,
    // Attempt Runtime
    @Inject(StartAssessmentAttemptUseCase)
    private readonly startAttempt: StartAssessmentAttemptUseCase,
    @Inject(GetAssessmentAttemptUseCase)
    private readonly getAttempt: GetAssessmentAttemptUseCase,
    @Inject(ListLearnerAssessmentAttemptsUseCase)
    private readonly listAttempts: ListLearnerAssessmentAttemptsUseCase,
    @Inject(SaveAssessmentAttemptAnswerUseCase)
    private readonly saveAnswer: SaveAssessmentAttemptAnswerUseCase,
    @Inject(CreateAssessmentAttemptAnswerReadUrlUseCase)
    private readonly createAnswerReadUrl: CreateAssessmentAttemptAnswerReadUrlUseCase,
    @Inject(SubmitAssessmentAttemptUseCase)
    private readonly submitAttempt: SubmitAssessmentAttemptUseCase,
    @Inject(CancelAssessmentAttemptUseCase)
    private readonly cancelAttempt: CancelAssessmentAttemptUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }

    return context;
  }

  @Post()
  async create(@Req() request: FastifyRequest, @Body() body: CreateAssessmentInput) {
    return this.createAssessment.execute(this.requestContext(request), body);
  }

  @Get()
  async list(@Req() request: FastifyRequest, @Query('purpose') purpose?: AssessmentPurpose) {
    return this.listAssessments.execute(this.requestContext(request), purpose);
  }

  @Get('/:assessmentId')
  async getOne(@Req() request: FastifyRequest, @Param('assessmentId') assessmentId: string) {
    return this.getAssessment.execute(this.requestContext(request), assessmentId);
  }

  @Patch('/:assessmentId')
  async update(
    @Req() request: FastifyRequest,
    @Param('assessmentId') assessmentId: string,
    @Body() body: UpdateAssessmentInput,
  ) {
    return this.updateAssessment.execute(this.requestContext(request), assessmentId, body);
  }

  @Put('/:assessmentId/content')
  async replaceDraftContent(
    @Req() request: FastifyRequest,
    @Param('assessmentId') assessmentId: string,
    @Body() body: ReplaceAssessmentContentInput,
  ) {
    return this.replaceContent.execute(this.requestContext(request), assessmentId, body);
  }

  @Post('/:assessmentId/publish')
  async publish(@Req() request: FastifyRequest, @Param('assessmentId') assessmentId: string) {
    return this.publishAssessment.execute(this.requestContext(request), assessmentId);
  }

  @Post('/:assessmentId/archive')
  async archive(@Req() request: FastifyRequest, @Param('assessmentId') assessmentId: string) {
    return this.archiveAssessment.execute(this.requestContext(request), assessmentId);
  }

  @Post('/:assessmentId/restore')
  async restore(@Req() request: FastifyRequest, @Param('assessmentId') assessmentId: string) {
    return this.restoreAssessment.execute(this.requestContext(request), assessmentId);
  }

  @Get('/:assessmentId/snapshots/latest')
  async latestSnapshot(
    @Req() request: FastifyRequest,
    @Param('assessmentId') assessmentId: string,
  ) {
    return this.getLatestSnapshot.execute(this.requestContext(request), assessmentId);
  }

  // --- Attempt Runtime Routes (Task 011A) ---
  // Routes are under /workspace/assessment-attempts for learner-scoped operations

  @Post('/:assessmentId/attempts')
  async startAttemptRoute(
    @Req() request: FastifyRequest,
    @Param('assessmentId') assessmentId: string,
    @Body() body?: StartAssessmentAttemptInput,
  ) {
    return this.startAttempt.execute(this.requestContext(request), assessmentId, body);
  }
}

@Controller('/workspace/assessment-attempts')
export class AssessmentAttemptController {
  constructor(
    @Inject(GetAssessmentAttemptUseCase)
    private readonly getAttempt: GetAssessmentAttemptUseCase,
    @Inject(ListLearnerAssessmentAttemptsUseCase)
    private readonly listAttempts: ListLearnerAssessmentAttemptsUseCase,
    @Inject(SaveAssessmentAttemptAnswerUseCase)
    private readonly saveAnswer: SaveAssessmentAttemptAnswerUseCase,
    @Inject(CreateAssessmentAttemptAnswerReadUrlUseCase)
    private readonly createAnswerReadUrl: CreateAssessmentAttemptAnswerReadUrlUseCase,
    @Inject(SubmitAssessmentAttemptUseCase)
    private readonly submitAttempt: SubmitAssessmentAttemptUseCase,
    @Inject(CancelAssessmentAttemptUseCase)
    private readonly cancelAttempt: CancelAssessmentAttemptUseCase,
    @Inject(GetAssessmentAttemptSnapshotUseCase)
    private readonly getSnapshot: GetAssessmentAttemptSnapshotUseCase,
    @Inject(GradeAssessmentAttemptUseCase)
    private readonly gradeAttempt: GradeAssessmentAttemptUseCase,
    @Inject(GetLatestAssessmentGradingRunUseCase)
    private readonly getLatestGradingRun: GetLatestAssessmentGradingRunUseCase,
    @Inject(ReleaseAssessmentResultUseCase)
    private readonly releaseResult: ReleaseAssessmentResultUseCase,
    @Inject(GetLearnerAssessmentResultUseCase)
    private readonly getLearnerResult: GetLearnerAssessmentResultUseCase,
    @Inject(GetInstructorAssessmentResultUseCase)
    private readonly getInstructorResult: GetInstructorAssessmentResultUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }

  @Get()
  async list(@Req() request: FastifyRequest): Promise<AssessmentAttemptResponse[]> {
    return this.listAttempts.execute(this.requestContext(request));
  }

  @Get('/:attemptId')
  async getOne(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.getAttempt.execute(this.requestContext(request), attemptId);
  }

  @Put('/:attemptId/answers/:questionId')
  async saveAnswerRoute(
    @Req() request: FastifyRequest,
    @Param('attemptId') attemptId: string,
    @Param('questionId') questionId: string,
    @Body() body: SaveAssessmentAttemptAnswerInput,
  ) {
    return this.saveAnswer.execute(this.requestContext(request), attemptId, {
      ...body,
      questionId,
    });
  }

  @Post('/:attemptId/answers/:answerId/files/:assetId/read-url')
  async createAnswerFileReadUrl(
    @Req() request: FastifyRequest,
    @Param('attemptId') attemptId: string,
    @Param('answerId') answerId: string,
    @Param('assetId') assetId: string,
  ) {
    return this.createAnswerReadUrl.execute(
      this.requestContext(request),
      attemptId,
      answerId,
      assetId,
    );
  }

  @Post('/:attemptId/submit')
  async submit(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.submitAttempt.execute(this.requestContext(request), attemptId);
  }

  @Post('/:attemptId/cancel')
  async cancel(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.cancelAttempt.execute(this.requestContext(request), attemptId);
  }

  @Get('/:attemptId/snapshot')
  async snapshot(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.getSnapshot.execute(this.requestContext(request), attemptId);
  }

  @Post('/:attemptId/grade')
  async grade(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.gradeAttempt.execute(this.requestContext(request), attemptId);
  }

  @Get('/:attemptId/grading/latest')
  async latestGrading(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.getLatestGradingRun.execute(this.requestContext(request), attemptId);
  }

  @Post('/:attemptId/results/release')
  async release(
    @Req() request: FastifyRequest,
    @Param('attemptId') attemptId: string,
    @Body() body?: ReleaseAssessmentResultInput,
  ) {
    return this.releaseResult.execute(this.requestContext(request), attemptId, body);
  }

  @Get('/:attemptId/results/me')
  async learnerResult(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.getLearnerResult.execute(this.requestContext(request), attemptId);
  }

  @Get('/:attemptId/results/instructor')
  async instructorResult(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.getInstructorResult.execute(this.requestContext(request), attemptId);
  }
}

@Controller()
export class AssessmentGradingController {
  constructor(
    @Inject(GetAssessmentGradingRunUseCase)
    private readonly getGradingRun: GetAssessmentGradingRunUseCase,
    @Inject(ListPendingManualReviewUseCase)
    private readonly listPendingManualReview: ListPendingManualReviewUseCase,
    @Inject(ManualGradeAssessmentAnswerUseCase)
    private readonly manualGradeAnswer: ManualGradeAssessmentAnswerUseCase,
  ) {}

  private requestContext(request: FastifyRequest): RequestContext {
    const context = request.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }

  @Get('/workspace/assessment-grading-runs/:gradingRunId')
  async getRun(@Req() request: FastifyRequest, @Param('gradingRunId') gradingRunId: string) {
    return this.getGradingRun.execute(this.requestContext(request), gradingRunId);
  }

  @Get('/workspace/assessment-grading/manual-review')
  async listPending(@Req() request: FastifyRequest) {
    return this.listPendingManualReview.execute(this.requestContext(request));
  }

  @Post('/workspace/assessment-grading-runs/:gradingRunId/answers/:answerId/manual-grade')
  async manualGrade(
    @Req() request: FastifyRequest,
    @Param('gradingRunId') gradingRunId: string,
    @Param('answerId') answerId: string,
    @Body() body: ManualGradeAssessmentAnswerInput,
  ) {
    return this.manualGradeAnswer.execute(
      this.requestContext(request),
      gradingRunId,
      answerId,
      body,
    );
  }
}
