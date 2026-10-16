import { MODULES } from '../../../lib/content';
import { ModulePage } from '../../../components/ModulePage';

export const dynamicParams = false;
export function generateStaticParams() {
  return MODULES.map(m => ({ module: m.id }));
}

export default async function Page({ params }: { params: Promise<{ module: string }> }) {
  const { module } = await params;
  return <ModulePage moduleId={module} />;
}
