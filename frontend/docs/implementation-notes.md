# Implementation notes against course-spec.md

Status: 13 October 2026. Phases 1 to 4 of the roadmap are implemented in software and content. Phase 5 (workshop pilot) and the production of recorded narration and rendered video are not.

## What matches the spec

- Diagnostic with confidence tap, objective tags on all 10 workshop diagnostic items, status rules, gap score, lesson-level targeting through objectives and misconception tags, plan panel with "Mark as known", learner state v2 with v1 migration, export and import (spec 6.1 to 6.7).
- Nine modules mapped one to one to the topics (the data-quality module, old M5, was removed on 2026-10-16; modules 6 to 10 became 5 to 9 and its question block Q041..Q050 and Q221..Q250 was retired), orientation module, 62 lessons of 2 to 6 minutes in the five-beat template, scenario intro per module, glossary cards, mastery check per module, capstone with eight decisions tagged to modules and lessons, completion record without a score (spec 4, 6.6).
- Question bank at 233 items in diagnostic, practice and check pools with objective and misconception tags (spec 5.2).
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

## Narration audio

One MP3 per storyboard frame, so the player syncs voice to the animation frame by frame. Paths derive from content: `public/audio/<moduleId>/<lessonSlug>-<frameId>.mp3` (e.g. `public/audio/results-framework/l3-2-f1.mp3`). Generated with Microsoft `mai-voice-2.1`, voice `en-US-Harper`, through the Vercel AI Gateway speech endpoint; the key lives in `.env.local` (gitignored) as `AI_GATEWAY_API_KEY`.

Pipeline, re-run in this order after any narration edit:

1. `node scripts/export-narration.mjs` writes `docs/audio/narration-script.json` (+ `.md` for proofreading) from `content/modules/*.json`.
2. `node scripts/fetch-audio.mjs` synthesises only clips whose text, model or voice changed (compared via `textHash` in `public/audio/manifest.json`); `--only L3.2`, `--limit N`, `--force`, `--model`, `--voice` for partial runs. Spoken-text substitutions (CIMMYT as "Simmit", CGIAR and KPI as letters) live in the script's `SAY` table; captions keep the original text.
3. `node scripts/retime-storyboards.mjs` copies measured durations into each frame's `seconds` (ceil + 0.6 s, clamped 4..40) in both `content/modules` and `content/drafts`, and writes `content/audio.json` (file to seconds), which `lib/audio.ts` uses to know which clips exist.

Player (`components/Explainer.tsx`): stepping to a frame speaks its clip; Play advances on the clip's `ended` event instead of the timer; the timer is the fallback for frames without a clip, when voice is off, or when a clip fails to load. The voice toggle persists in `localStorage` (`meal.narration`). Nothing plays before the first interaction, which keeps browser autoplay rules happy. Under reduced motion frames are stills, but stepping still speaks. The caption is the narration line, so captions are always on.

`docs/audio/chatgpt-audio-prompt.md` is the earlier ChatGPT route; it produces the same folder layout and manifest, so it still works as an alternative generator (for a human-recorded voice, drop files into the same paths and run step 3).

Measured speech runs shorter than the authored estimates: the results-framework hero explainer comes to 75 s, so the content test's hero floor moved from 90 s to 70 s. Extending those two narrations (and re-running the pipeline) would restore the spec's 90 s target.

## Workshop assessment revision (bank 4.0.0)

The diagnostic now asks the same ten plain-language questions in shuffled order. It focuses on evidence of change, partner follow-up, contribution, quality, accountability, learning and early planning. Version 3 course progress is retained; its diagnostic and derived plan are reset because the questions changed. The orientation opening now says ten questions. Its outdated voice clip is excluded from the audio index, so that frame uses the text fallback until a new recording is supplied.
