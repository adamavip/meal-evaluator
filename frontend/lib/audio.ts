import audioIndex from '../content/audio.json';
import { lessonSlug } from './content.ts';
import type { Lesson, Storyboard } from './content.ts';

// Narration clips, one per storyboard frame, served from public/audio/.
// content/audio.json (written by scripts/retime-storyboards.mjs) lists the clips that
// exist with their measured durations, so the player never requests a missing file.
const DURATIONS: Record<string, number> = audioIndex as Record<string, number>;

export const clipFile = (moduleId: string, lessonId: string, frameId: string) => `audio/${moduleId}/${lessonSlug(lessonId)}-${frameId}.mp3`;

/** Map of frameId to public URL for every frame of the lesson's storyboard that has a clip. */
export function clipsForLesson(lesson: Lesson, storyboard: Storyboard): Record<string, string> {
  const clips: Record<string, string> = {};
  for (const frame of storyboard.frames) {
    const file = clipFile(lesson.moduleId, lesson.id, frame.id);
    if (file in DURATIONS) clips[frame.id] = `/${file}`;
  }
  return clips;
}

export const clipDuration = (file: string): number | undefined => DURATIONS[file];
