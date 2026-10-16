import { Suspense } from 'react';
import { COURSE_MODULES } from '../../../../lib/content';
import { CheckPage } from '../../../../components/CheckPage';
import { Loading } from '../../../../components/ui';

export const dynamicParams = false;
export function generateStaticParams() {
  return COURSE_MODULES.map(m => ({ module: m.id }));
}

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <Suspense fallback={<Loading />}><CheckPage moduleId={module} /></Suspense>;
}
