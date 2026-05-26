import { Body, Controller, Get, Inject, Param, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import type {
  ProctoringHeartbeatRequestContract,
  RecordProctoringEventRequestContract,
} from '@mentrily/contract-catalog';
import {
  EndProctoringSessionUseCase,
  GetActiveAttemptMonitoringUseCase,
  GetAttemptMonitoringTimelineUseCase,
  GetProctoringSessionUseCase,
  RecordProctoringEventUseCase,
  RecordProctoringHeartbeatUseCase,
  StartProctoringSessionUseCase,
} from '../../application/use-cases/proctoring.use-cases.js';

function requestContext(request: FastifyRequest): RequestContext {
  const context = request.requestContext as RequestContext | undefined;
  if (!context) {
    throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
  }
  return context;
}

@Controller('/workspace/proctoring')
export class ProctoringController {
  constructor(
    @Inject(StartProctoringSessionUseCase)
    private readonly startSession: StartProctoringSessionUseCase,
    @Inject(RecordProctoringHeartbeatUseCase)
    private readonly heartbeat: RecordProctoringHeartbeatUseCase,
    @Inject(RecordProctoringEventUseCase)
    private readonly recordEvent: RecordProctoringEventUseCase,
    @Inject(EndProctoringSessionUseCase)
    private readonly endSession: EndProctoringSessionUseCase,
    @Inject(GetAttemptMonitoringTimelineUseCase)
    private readonly timeline: GetAttemptMonitoringTimelineUseCase,
    @Inject(GetActiveAttemptMonitoringUseCase)
    private readonly activeSummary: GetActiveAttemptMonitoringUseCase,
    @Inject(GetProctoringSessionUseCase)
    private readonly getSession: GetProctoringSessionUseCase,
  ) {}

  @Post('/attempts/:attemptId/session/start')
  async start(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.startSession.execute(requestContext(request), attemptId);
  }

  @Post('/sessions/:sessionId/heartbeat')
  async recordHeartbeat(
    @Req() request: FastifyRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: ProctoringHeartbeatRequestContract,
  ) {
    return this.heartbeat.execute(requestContext(request), sessionId, body);
  }

  @Post('/sessions/:sessionId/events')
  async createEvent(
    @Req() request: FastifyRequest,
    @Param('sessionId') sessionId: string,
    @Body() body: RecordProctoringEventRequestContract,
  ) {
    return this.recordEvent.execute(requestContext(request), sessionId, body);
  }

  @Post('/sessions/:sessionId/end')
  async end(@Req() request: FastifyRequest, @Param('sessionId') sessionId: string) {
    return this.endSession.execute(requestContext(request), sessionId);
  }

  @Get('/attempts/:attemptId/timeline')
  async getTimeline(@Req() request: FastifyRequest, @Param('attemptId') attemptId: string) {
    return this.timeline.execute(requestContext(request), attemptId);
  }

  @Get('/assessments/:assessmentId/active')
  async getActive(@Req() request: FastifyRequest, @Param('assessmentId') assessmentId: string) {
    return this.activeSummary.execute(requestContext(request), assessmentId);
  }

  @Get('/sessions/:sessionId')
  async getOne(@Req() request: FastifyRequest, @Param('sessionId') sessionId: string) {
    return this.getSession.execute(requestContext(request), sessionId);
  }
}
