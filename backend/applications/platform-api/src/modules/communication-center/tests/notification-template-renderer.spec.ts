import { describe, expect, it } from 'vitest';
import { NotificationTemplateRendererService } from '../application/services/index.js';

describe('NotificationTemplateRendererService', () => {
  const renderer = new NotificationTemplateRendererService();

  it('renders subject and body', () => {
    const rendered = renderer.render({
      subjectTemplate: 'Hello {{name}}',
      bodyTemplate: 'Enabled={{enabled}} Count={{count}} Empty={{missing}}',
      variables: { name: 'Ada', enabled: true, count: 3, missing: null },
      allowedVariables: ['name', 'enabled', 'count', 'missing'],
    });
    expect(rendered.subject).toBe('Hello Ada');
    expect(rendered.body).toBe('Enabled=true Count=3 Empty=');
  });

  it('fails unknown variable and missing variable and does not execute code-like content', () => {
    expect(() => renderer.render({
      bodyTemplate: 'Hello {{unknown}}',
      variables: {},
      allowedVariables: ['name'],
    })).toThrow(/unknown template variable/);

    expect(() => renderer.render({
      bodyTemplate: 'Hello {{name}}',
      variables: {},
      allowedVariables: ['name'],
    })).toThrow(/missing template variable/);

    const rendered = renderer.render({
      bodyTemplate: '{{payload}}',
      variables: { payload: '{{danger}}; process.exit(1)' },
      allowedVariables: ['payload'],
    });
    expect(rendered.body).toBe('{{danger}}; process.exit(1)');
  });
});
