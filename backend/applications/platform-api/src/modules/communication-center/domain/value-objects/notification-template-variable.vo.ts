import { AppError } from '@mentrily/service-core';

const VARIABLE_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

export function assertNotificationTemplateVariables(variables: string[]): string[] {
  const normalized = variables.map((value) => value.trim());
  const seen = new Set<string>();

  for (const variable of normalized) {
    if (!VARIABLE_PATTERN.test(variable)) {
      throw new AppError('VALIDATION_ERROR', `invalid template variable: ${variable}`, 400);
    }
    if (seen.has(variable)) {
      throw new AppError('VALIDATION_ERROR', `duplicate template variable: ${variable}`, 400);
    }
    seen.add(variable);
  }

  return normalized;
}
