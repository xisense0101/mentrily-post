import { Injectable } from '@nestjs/common';
import { AppError } from '@mentrily/service-core';

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z][a-zA-Z0-9_]*)\s*}}/g;

function stringify(value: string | number | boolean | null): string {
  if (value === null) {
    return '';
  }
  return String(value);
}

function renderTemplate(
  template: string,
  allowedVariables: Set<string>,
  variables: Record<string, string | number | boolean | null>,
): string {
  const matches = [...template.matchAll(PLACEHOLDER_PATTERN)];
  for (const match of matches) {
    const variableName = match[1];
    if (!variableName) {
      throw new AppError('VALIDATION_ERROR', 'invalid template placeholder', 400);
    }
    if (!allowedVariables.has(variableName)) {
      throw new AppError('VALIDATION_ERROR', `unknown template variable: ${variableName}`, 400);
    }
    if (!(variableName in variables)) {
      throw new AppError('VALIDATION_ERROR', `missing template variable: ${variableName}`, 400);
    }
  }

  return template.replace(PLACEHOLDER_PATTERN, (_whole, variableName: string) => {
    if (!(variableName in variables)) {
      throw new AppError('VALIDATION_ERROR', `missing template variable: ${variableName}`, 400);
    }
    return stringify(variables[variableName] ?? null);
  });
}

@Injectable()
export class NotificationTemplateRendererService {
  render(input: {
    subjectTemplate?: string | undefined;
    bodyTemplate: string;
    variables: Record<string, string | number | boolean | null>;
    allowedVariables: string[];
  }): { subject?: string | undefined; body: string } {
    const allowedVariables = new Set(input.allowedVariables);
    const body = renderTemplate(input.bodyTemplate, allowedVariables, input.variables);
    const subject = input.subjectTemplate
      ? renderTemplate(input.subjectTemplate, allowedVariables, input.variables)
      : undefined;
    return { ...(subject ? { subject } : {}), body };
  }
}
