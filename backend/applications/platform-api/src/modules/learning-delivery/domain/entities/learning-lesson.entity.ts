import { LearningContentKind } from '../value-objects/learning-content-kind.vo.js';

export interface LearningLessonProps {
  id: string;
  sectionId: string;
  title: string;
  kind: LearningContentKind;
  position: number;
  estimatedMinutes?: number;
  contentRef?: string;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class LearningLesson implements LearningLessonProps {
  id: string;
  sectionId: string;
  title: string;
  kind: LearningContentKind;
  position: number;
  estimatedMinutes?: number;
  contentRef?: string;
  isRequired: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LearningLessonProps) {
    if (!props.title) throw new Error('lesson title cannot be empty');
    if (props.position < 0) throw new Error('lesson position must be >= 0');
    if (props.estimatedMinutes !== undefined && props.estimatedMinutes <= 0)
      throw new Error('estimatedMinutes must be positive');
    this.id = props.id;
    this.sectionId = props.sectionId;
    this.title = props.title;
    this.kind = props.kind;
    this.position = props.position;
    if (props.estimatedMinutes !== undefined) {
      this.estimatedMinutes = props.estimatedMinutes;
    }
    if (props.contentRef !== undefined) {
      this.contentRef = props.contentRef;
    }
    this.isRequired = props.isRequired;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  rename(title: string) {
    if (!title) throw new Error('lesson title cannot be empty');
    this.title = title;
    this.updatedAt = new Date();
  }
}
