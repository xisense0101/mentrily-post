import { describe, it, expect } from 'vitest';
import { WorkspaceSlug } from '../domain/value-objects/index.js';

describe('WorkspaceGovernance Value Objects', () => {
  describe('WorkspaceSlug', () => {
    it('should allow valid slugs', () => {
      expect(new WorkspaceSlug('mentrily').toString()).toBe('mentrily');
      expect(new WorkspaceSlug('my-workspace').toString()).toBe('my-workspace');
      expect(new WorkspaceSlug('workspace-123').toString()).toBe('workspace-123');
    });

    it('should throw for invalid slugs', () => {
      expect(() => new WorkspaceSlug('my workspace')).toThrow();
      expect(() => new WorkspaceSlug('-my-workspace')).toThrow();
      expect(() => new WorkspaceSlug('my-workspace-')).toThrow();
      expect(() => new WorkspaceSlug('a')).toThrow(); // Too short
      expect(() => new WorkspaceSlug('a'.repeat(51))).toThrow(); // Too long
    });
  });
});
