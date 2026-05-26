import { describe, expect, it } from 'vitest';
import { ProctoringPolicyService } from '../application/proctoring-policy.service.js';

describe('ProctoringPolicyService', () => {
  const service = new ProctoringPolicyService();

  it('defaults monitoring mode to OFF', () => {
    expect(service.getModeFromAssessmentMetadata(undefined)).toBe('OFF');
    expect(service.getModeFromAssessmentMetadata({})).toBe('OFF');
  });

  it('sanitizes metadata and strips clipboard content', () => {
    expect(
      service.sanitizeMetadata('PASTE_ATTEMPTED', {
        clientTime: '2026-05-26T00:00:00.000Z',
        sequence: 4,
        questionId: 'question-1',
        clipboard: 'secret',
      }),
    ).toEqual({
      clientTime: '2026-05-26T00:00:00.000Z',
      sequence: 4,
      questionId: 'question-1',
    });
  });

  it('builds a visible disclosure for metadata-only monitoring', () => {
    const disclosure = service.buildDisclosure('BASIC_EVENT_MONITORING');
    expect(disclosure.visible).toBe(true);
    expect(disclosure.captures).toContain('Window and tab focus changes');
    expect(disclosure.doesNotCapture).toContain('Raw keystrokes');
    expect(disclosure.doesNotCapture).toContain('Webcam video');
  });
});
