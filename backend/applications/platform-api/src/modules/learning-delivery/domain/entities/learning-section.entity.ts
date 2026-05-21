import { LearningLesson } from './learning-lesson.entity.js';

export interface LearningSectionProps {
  id: string;
  courseId: string;
  title: string;
  position: number;
  lessons: LearningLesson[];
  createdAt: Date;
  updatedAt: Date;
}

export class LearningSection implements LearningSectionProps {
  id: string;
  courseId: string;
  title: string;
  position: number;
  lessons: LearningLesson[];
  createdAt: Date;
  updatedAt: Date;

  constructor(props: LearningSectionProps) {
    if (!props.title) throw new Error('section title cannot be empty');
    if (props.position < 0) throw new Error('section position must be >= 0');
    this.id = props.id;
    this.courseId = props.courseId;
    this.title = props.title;
    this.position = props.position;
    this.lessons = [...props.lessons].sort((a, b) => a.position - b.position);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  rename(title: string) {
    if (!title) throw new Error('section title cannot be empty');
    this.title = title;
    this.updatedAt = new Date();
  }

  addLesson(lesson: LearningLesson) {
    lesson.sectionId = this.id;
    this.lessons.push(lesson);
    this.normalizeLessonPositions();
    this.updatedAt = new Date();
  }

  removeLesson(lessonId: string) {
    this.lessons = this.lessons.filter((l) => l.id !== lessonId);
    this.normalizeLessonPositions();
    this.updatedAt = new Date();
  }

  reorderLessons(orderedIds: string[]) {
    if (orderedIds.length !== this.lessons.length) {
      throw new Error('reorder must include every lesson exactly once');
    }
    const map = new Map(this.lessons.map((l) => [l.id, l]));
    const seen = new Set<string>();
    this.lessons = orderedIds.map((id, idx) => {
      if (seen.has(id)) {
        throw new Error('duplicate lesson id in reorder');
      }
      seen.add(id);
      const l = map.get(id);
      if (!l) throw new Error('invalid lesson id in reorder');
      l.position = idx;
      return l;
    });
    this.normalizeLessonPositions();
    this.updatedAt = new Date();
  }

  private normalizeLessonPositions() {
    this.lessons = this.lessons
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((l, i) => {
        l.position = i;
        return l;
      });
  }
}
