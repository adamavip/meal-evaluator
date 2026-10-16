import type { Metadata } from 'next';
import '@fontsource/archivo-black/400.css';
import '@fontsource/space-grotesk/400.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';
import './globals.css';
import './course.css';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'CIMMYT MEAL | Course',
  description: 'Learn the CIMMYT MEAL Framework 2026–2030: a diagnostic, a personal study plan, ten short modules with animated explainers, mastery checks and a capstone.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><AppShell>{children}</AppShell></body></html>;
}
