import { ContentDocument, ContentBlock } from '../entities/index.js';
import { RESERVED_ASSESSMENT_BLOCK_KINDS } from '../value-objects/block-content-kind.vo.js';
import { ContentDocumentStatus, ContentDocumentPurpose } from '../value-objects/index.js';
import { BlockTreePolicyService } from './block-tree-policy.service.js';

function containsReservedAssessmentBlocks(blocks: ContentBlock[]): boolean {
  return blocks.some((block) => RESERVED_ASSESSMENT_BLOCK_KINDS.has(block.kind));
}

export class ContentPublishPolicyService {
  constructor(private readonly blockTreePolicy: BlockTreePolicyService = new BlockTreePolicyService()) {}

  canPublish(document: ContentDocument): { allowed: boolean; reason?: string } {
    if (document.status === ContentDocumentStatus.ARCHIVED) {
      return { allowed: false, reason: 'archived document cannot publish' };
    }
    if (document.status !== ContentDocumentStatus.DRAFT) {
      return { allowed: false, reason: 'document must be draft' };
    }
    if (!document.currentDraftVersion) {
      return { allowed: false, reason: 'draft version required' };
    }
    if (document.currentDraftVersion.blocks.length === 0) {
      return { allowed: false, reason: 'draft version must contain at least one block' };
    }

    const treeValidation = this.blockTreePolicy.validateTree({ blocks: document.currentDraftVersion.blocks });
    if (!treeValidation.valid) {
      return { allowed: false, reason: treeValidation.reason ?? 'block tree must be valid' };
    }

    if (
      containsReservedAssessmentBlocks(document.currentDraftVersion.blocks)
      && document.purpose !== ContentDocumentPurpose.ASSESSMENT_CONTENT_RESERVED
      && document.purpose !== ContentDocumentPurpose.QUESTION_CONTENT_RESERVED
    ) {
      return {
        allowed: false,
        reason: 'course/lesson content cannot publish assessment-reserved blocks yet',
      };
    }

    return { allowed: true };
  }
}
