# Implementation notes against course-spec.md

Status: 13 October 2026. Phases 1 to 4 of the roadmap are implemented in software and content. Phase 5 (workshop pilot) and the production of recorded narration and rendered video are not.

## What matches the spec

- Diagnostic with confidence tap, objective tags on all 100 diagnostic items, status rules, gap score, lesson-level targeting through objectives and misconception tags, plan panel with "Mark as known", learner state v2 with v1 migration, export and import (spec 6.1 to 6.7).
- Ten modules mapped one to one to the topics, orientation module, 62 lessons of 2 to 6 minutes in the five-beat template, scenario intro per module, glossary cards, mastery check per module, capstone with eight decisions tagged to modules and lessons, completion record without a score (spec 4, 6.6).
- Question bank at 347 items in diagnostic, practice and check pools with objective and misconception tags (spec 5.2).
- Mastery checks: 5 items, at least 4 objectives, no seen-item reuse, 80% pass, failure targeting, fresh draw, 10-minute cool-down after two failures, 7-day spaced re-check that can only demote to Review (spec 6.5).
- Routes as listed in spec 9.2. Static export, browser-only data (spec 9.1).
- Tests for content schema, engine, draws, migration and damaged state (spec 9.3). Automated axe runs and the manual keyboard walkthrough are not automated here; the lesson player and widgets are built with native controls, visible focus and no drag and drop.

## Deliberate deviations

| Spec | Implementation | Why |
| --- | --- | --- |
| Remotion-rendered MP4/WebM explainers with human narration and VTT captions (7.2) | Storyboards rendered in the app with Motion; narration shown as captions and transcript | No narrator, recording or render pipeline is available in this environment. The storyboards are the reviewable artefact the spec asks for, and a rendered video can be dropped into any lesson later via `explainer.kind: "video"`. |
| Lessons as MDX in `content/lessons/*.mdx` (5, 9.1) | Lessons as JSON inside each module file | Keeps the schema test trivial, avoids an MDX build step, and keeps all strings in JSON for later translation. |
| Storyboard id resolves to a media file (9.3) | Storyboard id resolves to a storyboard record in the module | Follows from the previous row. |
| Lottie micro-animations (7.2) | CSS and Motion only | No designer-supplied Lottie assets. Feedback animations use the existing in-app patterns. |
| "Check first" requires `asked = 1` (6.2) | Any topic with all answers correct and at least one "Not sure" is "Check first" | The spec's rule table left `asked = 2`, both correct, one unsure without a status. |
| Persona tunes examples (4.2 L0.3) | Persona is saved and highlighted on module scenarios that name it | Content is written once; per-persona variants would multiply the authoring load. |

## Content review flags

The module drafts were written from the framework text with source references on every item. Each author flagged places where a claim is an application or synthesis rather than a quotation. The flags are recorded in the drafts' authoring reports and summarised here for the content lead's review:

- Theory of change (M2): "assumptions on every link" is taught as the practical way to do the checks Annex A asks for; the framework only names assumptions explicitly in the system-change row.
- KPIs (M4): "each record keeps its own quality rating when aggregated" is a synthesis of 3.2 and 2.5; illustrative yield figures in storyboards are labelled illustrative.
- Data quality (M5): "blank is not zero" and the outlier process are taught as the implication of "investigate anomalies" and "exception handling", not as quoted rules; the RACI gives the Data Group R for defining QA rules while 5.8 gives the rules to the Evidence Systems analyst.
- Impact (M7): "comparison group is the usual way to build a counterfactual" is the course's wording; the framework names comparison groups once (5.4).
- Learning (M8): management-response fields are borrowed from the decision-log definition.
- Accountability (M9): logging a partner data transfer is an inference from the audit-trail requirement.
- Implementation (M10): Large projects are described only as co-designed, because 5.10 and Annex A disagree on a Large minimum; a USD 290,000 example sits just inside the Medium band.

## Open questions from the spec (13)

1. 80% on 5 items is implemented; `CHECK_SIZE` and `PASS_MARK` in `lib/checks.ts` change it.
2. "Mark as known" exists; it moves a module to Looking good without a check and does not count as mastered for the certificate.
3. Narration is not recorded; captions and transcripts exist for every frame.
4. No LMS integration; the learning record exports as JSON.
5. The framework is linked as a download; section text is not reproduced in the app beyond lesson recaps.

## Narration audio (planned)

Audio is one clip per storyboard frame, not one file per lesson, so the player can sync sound to the animation frame by frame. Clip paths are stable and derived from content: `public/audio/<moduleId>/<lessonSlug>-<frameId>.mp3` (e.g. `public/audio/results-framework/l3-2-f1.mp3`).

- `scripts/export-narration.mjs` writes `docs/audio/narration-script.json` and `.md` from `content/modules/*.json`. Re-run after any narration edit; the `textHash` in the manifest shows which clips are stale.
- `docs/audio/chatgpt-audio-prompt.md` is the generation prompt (ChatGPT or the fallback OpenAI TTS script). Its output is an `audio/` folder with a `manifest.json` carrying measured durations.
- Integration, once the folder lands in `public/audio/`: the `Explainer` component gets a mute toggle (default on, persisted in learner state), plays the current frame's clip on `goTo` and advances on `ended` instead of the fixed timer when audio is available; the `seconds` timer stays as the fallback when a clip is missing or fails to load, and under reduced motion. A script will copy `durationSeconds` from the manifest back into each frame's `seconds` (rounded up, min 4) so the progress bar and `about N min` label match the voice. Captions already exist: the narration line is the caption.
