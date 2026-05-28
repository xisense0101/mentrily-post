import { Body, Controller, Get, Inject, Post, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AppError, RequestContext } from '@mentrily/service-core';
import { GetCodeExecutionLanguagesUseCase } from '../../application/use-cases/get-code-execution-languages.use-case.js';
import { RunCodeSampleUseCase } from '../../application/use-cases/run-code-sample.use-case.js';
import { RunCodeSampleInput } from '../../application/dto/code-execution.dto.js';

@Controller('/workspace/code-execution')
export class CodeExecutionController {
  constructor(
    @Inject(GetCodeExecutionLanguagesUseCase)
    private readonly getLanguagesUseCase: GetCodeExecutionLanguagesUseCase,
    @Inject(RunCodeSampleUseCase)
    private readonly runSampleUseCase: RunCodeSampleUseCase,
  ) {}

  private requestContext(req: FastifyRequest): RequestContext {
    const context = req.requestContext as RequestContext | undefined;
    if (!context) {
      throw new AppError('VALIDATION_ERROR', 'missing request context', 400);
    }
    return context;
  }

  @Get('/languages')
  async getLanguages(@Req() req: FastifyRequest) {
    return this.getLanguagesUseCase.execute(this.requestContext(req));
  }

  @Post('/sample-run')
  async runSample(@Req() req: FastifyRequest, @Body() body: RunCodeSampleInput) {
    return this.runSampleUseCase.execute(this.requestContext(req), body);
  }
}
