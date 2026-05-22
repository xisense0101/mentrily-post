import { LearningCourse } from '../../domain/entities/learning-course.entity.js';
import { LearningCourseResponse } from '../dto/learning-course-response.dto.js';
import { MediaAssetRepository } from '../../../media-library/domain/repositories/index.js';
import { mapMediaAssetToResponse } from '../../../media-library/application/mappers/media-asset-response.mapper.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function mapCourseToResponse(
  course: LearningCourse,
  mediaAssetRepo?: MediaAssetRepository,
): Promise<LearningCourseResponse> {
  const sections = [];
  for (const s of course.sections) {
    const lessons = [];
    for (const l of s.lessons) {
      let mediaAsset = undefined;
      if (l.contentRef && UUID_REGEX.test(l.contentRef) && mediaAssetRepo) {
        try {
          const asset = await mediaAssetRepo.findById(l.contentRef);
          if (asset && asset.status === 'AVAILABLE') {
            mediaAsset = mapMediaAssetToResponse(asset);
          }
        } catch {
          // ignore resolving errors
        }
      }

      lessons.push({
        id: l.id,
        title: l.title,
        kind: String(l.kind),
        position: l.position,
        estimatedMinutes: l.estimatedMinutes ?? undefined,
        contentRef: l.contentRef ?? undefined,
        isRequired: l.isRequired,
        mediaAsset,
      });
    }

    sections.push({
      id: s.id,
      title: s.title,
      position: s.position,
      lessons,
    });
  }

  return {
    id: course.id,
    title: course.title,
    slug: course.slug,
    ...(course.description !== undefined ? { description: course.description } : {}),
    status: String(course.status),
    visibility: String(course.visibility),
    sections,
  };
}
