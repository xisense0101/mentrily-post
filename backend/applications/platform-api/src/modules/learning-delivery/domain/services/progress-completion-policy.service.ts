export class ProgressCompletionPolicyService {
  canCompleteCourse(input: { requiredLessonIds: string[]; completedLessonIds: string[] }): boolean {
    const { requiredLessonIds, completedLessonIds } = input;
    if (!requiredLessonIds || requiredLessonIds.length === 0) return false;
    const set = new Set(completedLessonIds || []);
    return requiredLessonIds.every((id) => set.has(id));
  }
}
