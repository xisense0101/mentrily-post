import { describe, it, expect } from 'vitest';
import { PolicyModel } from '../policy-model.js';
import { PermissionKey } from '../permission-key.js';
import { PermissionCatalog } from '../catalog.js';

describe('Security Toolkit: Permission & Policy Model', () => {
  describe('PermissionKey', () => {
    it('should allow valid permission keys', () => {
      expect(PermissionKey.isValid('workspace.read')).toBe(true);
      expect(PermissionKey.isValid('content.update')).toBe(true);
      expect(PermissionKey.isValid('platform.support.manage')).toBe(true);
    });

    it('should reject invalid permission keys', () => {
      expect(PermissionKey.isValid('invalid_key')).toBe(false); // No dot
      expect(PermissionKey.isValid('Workspace.read')).toBe(false); // Uppercase
      expect(PermissionKey.isValid('workspace..read')).toBe(false); // Double dot
      expect(PermissionKey.isValid('a.b')).toBe(false); // Too short
    });

    it('should throw an error when instantiating with an invalid key', () => {
      expect(() => new PermissionKey('invalid')).toThrowError('Invalid permission key: invalid');
    });

    it('should evaluate equality correctly', () => {
      const key1 = new PermissionKey('workspace.read');
      const key2 = new PermissionKey('workspace.read');
      const key3 = new PermissionKey('workspace.update');
      
      expect(key1.equals(key2)).toBe(true);
      expect(key1.equals(key3)).toBe(false);
    });
  });

  describe('PolicyModel', () => {
    it('should expand single role to its predefined permissions', () => {
      const viewerPermissions = PolicyModel.expandRoles(['viewer']);
      expect(viewerPermissions.has(PermissionCatalog.WORKSPACE_READ)).toBe(true);
      expect(viewerPermissions.has(PermissionCatalog.CONTENT_READ)).toBe(true);
      expect(viewerPermissions.has(PermissionCatalog.CONTENT_DOCUMENT_READ)).toBe(true);
      expect(viewerPermissions.has(PermissionCatalog.LEARNING_COURSE_READ)).toBe(true);
      expect(viewerPermissions.has(PermissionCatalog.ASSESSMENT_READ)).toBe(true);
      expect(viewerPermissions.has(PermissionCatalog.CONTENT_UPDATE)).toBe(false); // Not granted to viewer
    });

    it('should expand multiple roles combining permissions', () => {
      // learner + viewer should have permissions of both
      const combined = PolicyModel.expandRoles(['learner', 'viewer']);
      expect(combined.has(PermissionCatalog.WORKSPACE_READ)).toBe(true);
      expect(combined.has(PermissionCatalog.LEARNING_READ)).toBe(true);
      expect(combined.has(PermissionCatalog.CONTENT_READ)).toBe(true);
      expect(combined.has(PermissionCatalog.CONTENT_SNAPSHOT_READ)).toBe(true);
      expect(combined.has(PermissionCatalog.LEARNING_COURSE_ENROLL)).toBe(true);
    });

    it('should perform default deny for unknown permission keys', () => {
      // workspace_admin doesn't have a fake permission
      expect(PolicyModel.hasPermission(['workspace_admin'], 'fake.permission')).toBe(false);
    });

    it('should perform default deny for invalid permission key format', () => {
      expect(PolicyModel.hasPermission(['workspace_admin'], 'INVALID_FORMAT')).toBe(false);
    });

    it('should correctly evaluate owner/admin/creator/learner examples', () => {
      expect(PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.WORKSPACE_ROLES_MANAGE)).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.WORKSPACE_ROLES_MANAGE)).toBe(false); // Admin doesn't manage roles
      
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.CONTENT_CREATE)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.WORKSPACE_MEMBERS_MANAGE)).toBe(false);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.LEARNING_COURSE_PUBLISH)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.CONTENT_DOCUMENT_PUBLISH)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_PUBLISH)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_ARCHIVE)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_SNAPSHOT_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_RESULT_RELEASE)).toBe(true);
      expect(
        PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE),
      ).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_EXECUTION_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_EXECUTION_REQUEST)).toBe(true);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.ASSESSMENT_EXECUTION_CANCEL)).toBe(true);

      expect(PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.ASSESSMENT_RESULT_RELEASE)).toBe(true);
      expect(
        PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE),
      ).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.ASSESSMENT_EXECUTION_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.ASSESSMENT_EXECUTION_REQUEST)).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.ASSESSMENT_EXECUTION_CANCEL)).toBe(true);

      expect(PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.ASSESSMENT_RESULT_RELEASE)).toBe(true);
      expect(
        PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE),
      ).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.ASSESSMENT_EXECUTION_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.ASSESSMENT_EXECUTION_REQUEST)).toBe(true);
      expect(PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.ASSESSMENT_EXECUTION_CANCEL)).toBe(true);
      
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.LEARNING_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.LEARNING_ENROLLMENT_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.CONTENT_CREATE)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.CONTENT_DOCUMENT_READ)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.CONTENT_SNAPSHOT_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_READ)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_ATTEMPT_START)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_ATTEMPT_READ)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_ATTEMPT_ANSWER_SAVE)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_ATTEMPT_SUBMIT)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_ATTEMPT_CANCEL)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_RESULT_READ_OWN)).toBe(true);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_RESULT_RELEASE)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_RESULT_READ_WORKSPACE)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_EXECUTION_READ)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_EXECUTION_REQUEST)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.ASSESSMENT_EXECUTION_CANCEL)).toBe(false);
      expect(PolicyModel.hasPermission(['viewer'], PermissionCatalog.ASSESSMENT_EXECUTION_REQUEST)).toBe(false);
      expect(PolicyModel.hasPermission(['viewer'], PermissionCatalog.ASSESSMENT_EXECUTION_CANCEL)).toBe(false);
      expect(PolicyModel.hasPermission(['learner'], PermissionCatalog.COMMUNICATION_SCHEDULER_PROCESS)).toBe(false);
      expect(PolicyModel.hasPermission(['viewer'], PermissionCatalog.COMMUNICATION_SCHEDULER_PROCESS)).toBe(false);
      expect(PolicyModel.hasPermission(['creator'], PermissionCatalog.COMMUNICATION_SCHEDULER_PROCESS)).toBe(false);
      expect(PolicyModel.hasPermission(['workspace_admin'], PermissionCatalog.COMMUNICATION_SCHEDULER_PROCESS)).toBe(false);
      expect(PolicyModel.hasPermission(['workspace_owner'], PermissionCatalog.COMMUNICATION_SCHEDULER_PROCESS)).toBe(false);
    });
  });
});
