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
import { CodeExecutionTrackerService } from './application/code-execution-tracker.service.js';
import { CodeExecutionProviderRunner } from './application/code-execution-provider-runner.js';

import { DataPlatformModule } from '@mentrily/data-platform';

@Module({
  imports: [FoundationModule, DataPlatformModule],
  controllers: [CodeExecutionController],
  providers: [
    CodeExecutionConfig,
    CodeExecutionPolicyService,
    CodeExecutionTrackerService,
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
        let provider;
        if (config.provider === 'judge0') {
          provider = judge0;
        } else if (config.provider === 'piston') {
          provider = piston;
        } else {
          provider = fixture;
        }
        return new CodeExecutionProviderRunner(provider);
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
  exports: [
    CodeExecutionPolicyService,
    CodeExecutionTrackerService,
    GetCodeExecutionLanguagesUseCase,
    RunCodeSampleUseCase,
    'CODE_EXECUTION_PROVIDER',
  ],
})
export class CodeExecutionModule {}
