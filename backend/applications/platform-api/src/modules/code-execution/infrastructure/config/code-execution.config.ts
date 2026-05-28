import { Injectable } from '@nestjs/common';

@Injectable()
export class CodeExecutionConfig {
  get provider(): string {
    return process.env.CODE_EXECUTION_PROVIDER || 'fixture';
  }

  get judge0Url(): string | undefined {
    return process.env.JUDGE0_URL;
  }

  get judge0ApiKey(): string | undefined {
    return process.env.JUDGE0_API_KEY;
  }

  get pistonUrl(): string | undefined {
    return process.env.PISTON_URL;
  }
}
