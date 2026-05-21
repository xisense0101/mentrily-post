import type {
  AddLearningLessonRequest,
  AddLearningSectionRequest,
  CreateLearningCourseRequest,
} from '../../src/modules/learning-delivery/types';

export function makeCourseInput(): CreateLearningCourseRequest {
  const timestamp = Date.now();

  return {
    title: `E2E Course ${timestamp}`,
    slug: `e2e-course-${timestamp}`,
    description: 'Cross-stack learning E2E course',
    visibility: 'WORKSPACE',
  };
}

export function makeSectionInput(): AddLearningSectionRequest {
  return {
    title: 'E2E Section 1',
  };
}

export function makeLessonInput(): AddLearningLessonRequest {
  return {
    title: 'E2E Lesson 1',
    kind: 'TEXT',
    estimatedMinutes: 5,
    contentRef: 'doc://e2e-learning-lesson',
    isRequired: true,
  };
}
