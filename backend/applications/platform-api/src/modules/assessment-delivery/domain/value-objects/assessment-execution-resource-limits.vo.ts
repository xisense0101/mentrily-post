export interface AssessmentExecutionResourceLimitsProps {
  timeoutMs: number;
  memoryMb: number;
  cpuCount?: number;
  outputLimitKb?: number;
}

export class AssessmentExecutionResourceLimits {
  readonly timeoutMs: number;
  readonly memoryMb: number;
  readonly cpuCount?: number;
  readonly outputLimitKb?: number;

  private constructor(props: AssessmentExecutionResourceLimitsProps) {
    this.timeoutMs = props.timeoutMs;
    this.memoryMb = props.memoryMb;
    if (props.cpuCount !== undefined) {
      this.cpuCount = props.cpuCount;
    }
    if (props.outputLimitKb !== undefined) {
      this.outputLimitKb = props.outputLimitKb;
    }
  }

  static create(props: AssessmentExecutionResourceLimitsProps): AssessmentExecutionResourceLimits {
    if (
      typeof props.timeoutMs !== 'number' ||
      !Number.isFinite(props.timeoutMs) ||
      props.timeoutMs <= 0
    ) {
      throw new Error('Execution timeoutMs must be a positive, finite number');
    }
    if (
      typeof props.memoryMb !== 'number' ||
      !Number.isFinite(props.memoryMb) ||
      props.memoryMb <= 0
    ) {
      throw new Error('Execution memoryMb must be a positive, finite number');
    }
    if (props.cpuCount !== undefined) {
      if (
        typeof props.cpuCount !== 'number' ||
        !Number.isFinite(props.cpuCount) ||
        props.cpuCount <= 0
      ) {
        throw new Error('Execution cpuCount must be a positive, finite number');
      }
    }
    if (props.outputLimitKb !== undefined) {
      if (
        typeof props.outputLimitKb !== 'number' ||
        !Number.isFinite(props.outputLimitKb) ||
        props.outputLimitKb <= 0
      ) {
        throw new Error('Execution outputLimitKb must be a positive, finite number');
      }
    }
    return new AssessmentExecutionResourceLimits({ ...props });
  }

  toObject(): AssessmentExecutionResourceLimitsProps {
    return {
      timeoutMs: this.timeoutMs,
      memoryMb: this.memoryMb,
      ...(this.cpuCount !== undefined ? { cpuCount: this.cpuCount } : {}),
      ...(this.outputLimitKb !== undefined ? { outputLimitKb: this.outputLimitKb } : {}),
    };
  }
}
