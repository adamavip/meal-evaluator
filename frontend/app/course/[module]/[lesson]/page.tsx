import { MODULES, lessonSlug } from '../../../../lib/content';
import { LessonPage } from '../../../../components/LessonPage';

export const dynamicParams = false;
export function generateStaticParams() {
  return MODULES.flatMap(m => m.lessons.map(l => ({ module: m.id, lesson: lessonSlug(l.id) })));
}

export default async function Page({ params }: { params: Promise<{ module: string; lesson: string }> }) {
  const { module, lesson } = await params;
  return <LessonPage moduleId={module} lessonSlug={lesson} />;
}
