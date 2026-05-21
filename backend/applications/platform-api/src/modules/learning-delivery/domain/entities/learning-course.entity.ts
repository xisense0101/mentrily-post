import { LearningSection } from './learning-section.entity.js';
import { LearningCourseStatus } from '../value-objects/learning-course-status.vo.js';
import { LearningVisibility } from '../value-objects/learning-visibility.vo.js';
import { LearningSlug } from '../value-objects/learning-slug.vo.js';

export interface LearningCourseProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  creatorPrincipalId: string;
  title: string;
  slug: string;
  description?: string;
  status: LearningCourseStatus;
  visibility: LearningVisibility;
  sections: LearningSection[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}

export class LearningCourse implements LearningCourseProps {
  id: string;
  tenantId: string;
  workspaceId: string;
  creatorPrincipalId: string;
  title: string;
  slug: string;
  description?: string;
  status: LearningCourseStatus;
  visibility: LearningVisibility;
  sections: LearningSection[];
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;

  constructor(props: LearningCourseProps) {
    if (!props.tenantId) throw new Error('tenantId required');
    if (!props.workspaceId) throw new Error('workspaceId required');
    if (!props.creatorPrincipalId) throw new Error('creatorPrincipalId required');
    if (!props.title) throw new Error('title cannot be empty');
    new LearningSlug(props.slug); // validate
    this.id = props.id;
    this.tenantId = props.tenantId;
    this.workspaceId = props.workspaceId;
    this.creatorPrincipalId = props.creatorPrincipalId;
    this.title = props.title;
    this.slug = props.slug;
    if (props.description !== undefined) {
      this.description = props.description;
    }
    this.status = props.status;
    this.visibility = props.visibility;
    this.sections = [...props.sections].sort((a, b) => a.position - b.position);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    if (props.publishedAt !== undefined) {
      this.publishedAt = props.publishedAt;
    }
    if (props.archivedAt !== undefined) {
      this.archivedAt = props.archivedAt;
    }
  }

  static createDraft(input: {
    id: string;
    tenantId: string;
    workspaceId: string;
    creatorPrincipalId: string;
    title: string;
    slug: string;
    description?: string;
  }) {
    const now = new Date();
    return new LearningCourse({
      id: input.id,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId,
      creatorPrincipalId: input.creatorPrincipalId,
      title: input.title,
      slug: input.slug,
      ...(input.description !== undefined ? { description: input.description } : {}),
      status: LearningCourseStatus.DRAFT,
      visibility: LearningVisibility.PRIVATE,
      sections: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  rename(title: string) {
    this.assertNotArchived();
    if (!title) throw new Error('title cannot be empty');
    this.title = title;
    this.updatedAt = new Date();
  }

  updateDescription(description?: string) {
    this.assertNotArchived();
    if (description !== undefined) {
      this.description = description;
    } else {
      delete this.description;
    }
    this.updatedAt = new Date();
  }

  changeVisibility(v: LearningVisibility) {
    this.assertNotArchived();
    this.visibility = v;
    this.updatedAt = new Date();
  }

  addSection(section: LearningSection) {
    this.assertNotArchived();
    section.courseId = this.id;
    this.sections.push(section);
    this.normalizeSectionPositions();
    this.updatedAt = new Date();
  }

  removeSection(sectionId: string) {
    this.assertNotArchived();
    this.sections = this.sections.filter((s) => s.id !== sectionId);
    this.normalizeSectionPositions();
    this.updatedAt = new Date();
  }

  reorderSections(orderedIds: string[]) {
    this.assertNotArchived();
    if (orderedIds.length !== this.sections.length) {
      throw new Error('reorder must include every section exactly once');
    }
    const map = new Map(this.sections.map((s) => [s.id, s]));
    const seen = new Set<string>();
    this.sections = orderedIds.map((id, idx) => {
      if (seen.has(id)) {
        throw new Error('duplicate section id in reorder');
      }
      seen.add(id);
      const s = map.get(id);
      if (!s) throw new Error('invalid section id in reorder');
      s.position = idx;
      return s;
    });
    this.normalizeSectionPositions();
    this.updatedAt = new Date();
  }

  publish() {
    if (this.status !== LearningCourseStatus.DRAFT)
      throw new Error('only DRAFT courses can be published');
    if (this.sections.length === 0) throw new Error('course must have at least one section');
    const anySectionHasLessons = this.sections.some((s) => s.lessons.length > 0);
    if (!anySectionHasLessons)
      throw new Error('course must have at least one lesson in at least one section');
    this.status = LearningCourseStatus.PUBLISHED;
    this.publishedAt = new Date();
    this.updatedAt = new Date();
  }

  archive() {
    this.status = LearningCourseStatus.ARCHIVED;
    this.archivedAt = new Date();
    this.updatedAt = new Date();
  }

  private normalizeSectionPositions() {
    this.sections = this.sections
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((s, i) => {
        s.position = i;
        return s;
      });
  }

  private assertNotArchived() {
    if (this.status === LearningCourseStatus.ARCHIVED)
      throw new Error('archived course cannot be modified');
  }
}
