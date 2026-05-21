import { CreatorCourseDetailPage } from '@/modules/learning-delivery/routes';

interface LearningCourseDetailRouteProps {
  params: Promise<{
    courseId: string;
  }>;
}

export default async function LearningCourseDetailRoute({
  params,
}: LearningCourseDetailRouteProps) {
  const { courseId } = await params;
  return <CreatorCourseDetailPage courseId={courseId} />;
}
