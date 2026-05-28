import { Module } from '@nestjs/common';
import { FoundationModule } from '../../foundation/foundation.module.js';
import { CodeExecutionPolicyService } from './application/code-execution-policy.service.js';
import { CodeExecutionConfig } from './infrastructure/config/code-execution.config.js';
import { FixtureCodeExecutionProvider } from './infrastructure/providers/fixture-code-execution.provider.js';
import { Judge0CodeExecutionProvider } from './infrastructure/providers/judge0-code-execution.provider.js';
import { PistonCodeExecutionProvider } from './infrastructure/providers/piston-code-execution.provider.js';
import { GetCodeExecutionLanguagesUseCase } from './application/use-cases/get-code-execution-languages.use-case.js';
import { RunCodeSampleUseCase } from './application/use-cases/run-code-sample.use-case.js';
import { CodeExecutionController } from './presentation/http/code-execution.controller.js';

@Module({
  imports: [FoundationModule],
  controllers: [CodeExecutionController],
  providers: [
    CodeExecutionConfig,
    CodeExecutionPolicyService,
    GetCodeExecutionLanguagesUseCase,
    RunCodeSampleUseCase,
    {
      provide: 'CODE_EXECUTION_PROVIDER',
      useFactory: (
        config: CodeExecutionConfig,
        fixture: FixtureCodeExecutionProvider,
        judge0: Judge0CodeExecutionProvider,
        piston: PistonCodeExecutionProvider,
      ) => {
        if (config.provider === 'judge0') {
          return judge0;
        }
        if (config.provider === 'piston') {
          return piston;
        }
        return fixture;
      },
      inject: [
        CodeExecutionConfig,
        FixtureCodeExecutionProvider,
        Judge0CodeExecutionProvider,
        PistonCodeExecutionProvider,
      ],
    },
    FixtureCodeExecutionProvider,
    Judge0CodeExecutionProvider,
    PistonCodeExecutionProvider,
  ],
  exports: [CodeExecutionPolicyService, GetCodeExecutionLanguagesUseCase, RunCodeSampleUseCase],
})
export class CodeExecutionModule {}
