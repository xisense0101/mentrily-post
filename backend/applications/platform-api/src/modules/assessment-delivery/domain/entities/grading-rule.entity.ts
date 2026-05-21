/**
 * GradingRule Entity
 * Represents a grading rule for a question or questions in an assessment
 */

import { GradingMode, assertValidGradingMode } from '../value-objects/index.js';

export type GradingRuleType =
  | 'EXACT_MATCH'
  | 'OPTION_MATCH'
  | 'RUBRIC'
  | 'MANUAL_REVIEW'
  | 'CODE_OUTPUT_RESERVED';

export interface GradingRuleProps {
  id: string;
  assessmentId: string;
  questionId?: string;
  mode: GradingMode;
  ruleType: GradingRuleType;
  config: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export class GradingRule {
  readonly id: string;
  readonly assessmentId: string;
  readonly questionId?: string;
  mode: GradingMode;
  ruleType: GradingRuleType;
  config: Record<string, unknown>;
  readonly createdAt: Date;
  updatedAt: Date;

  private constructor(props: GradingRuleProps) {
    this.id = props.id;
    this.assessmentId = props.assessmentId;
    if (props.questionId !== undefined) {
      this.questionId = props.questionId;
    }
    this.mode = props.mode;
    this.ruleType = props.ruleType;
    this.config = props.config;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Create a new GradingRule
   */
  static create(props: Omit<GradingRuleProps, 'createdAt' | 'updatedAt'>): GradingRule {
    GradingRule.validateProps(props);

    const now = new Date();
    return new GradingRule({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Restore a rule from persistence
   */
  static restore(props: GradingRuleProps): GradingRule {
    GradingRule.validateProps(props);
    return new GradingRule(props);
  }

  /**
   * Validate grading rule properties
   */
  private static validateProps(props: Omit<GradingRuleProps, 'createdAt' | 'updatedAt'>): void {
    if (!props.id || typeof props.id !== 'string') {
      throw new Error('Rule id is required');
    }

    if (!props.assessmentId || typeof props.assessmentId !== 'string') {
      throw new Error('Rule assessmentId is required');
    }

    if (props.questionId !== undefined && typeof props.questionId !== 'string') {
      throw new Error('questionId must be a string');
    }

    assertValidGradingMode(props.mode);

    GradingRule.validateRuleType(props.ruleType);

    if (typeof props.config !== 'object' || props.config === null) {
      throw new Error('Config must be an object');
    }
  }

  /**
   * Validate rule type
   */
  private static validateRuleType(ruleType: unknown): void {
    const validTypes: Set<GradingRuleType> = new Set([
      'EXACT_MATCH',
      'OPTION_MATCH',
      'RUBRIC',
      'MANUAL_REVIEW',
      'CODE_OUTPUT_RESERVED',
    ]);

    if (!validTypes.has(ruleType as GradingRuleType)) {
      throw new Error(`Invalid rule type: ${ruleType}`);
    }
  }

  /**
   * Check if this rule is for code execution (reserved, not yet implemented)
   */
  isCodeExecutionReserved(): boolean {
    return this.ruleType === 'CODE_OUTPUT_RESERVED';
  }

  /**
   * Update the rule configuration
   */
  updateConfig(newConfig: Record<string, unknown>): void {
    if (typeof newConfig !== 'object' || newConfig === null) {
      throw new Error('Config must be an object');
    }

    this.config = newConfig;
    this.updatedAt = new Date();
  }

  /**
   * Update the grading mode
   */
  updateMode(newMode: GradingMode): void {
    this.mode = assertValidGradingMode(newMode);
    this.updatedAt = new Date();
  }

  /**
   * Convert to plain object
   */
  toObject(): GradingRuleProps {
    return {
      id: this.id,
      assessmentId: this.assessmentId,
      ...(this.questionId && { questionId: this.questionId }),
      mode: this.mode,
      ruleType: this.ruleType,
      config: this.config,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
