# CIMMYT MEAL course

A Next.js static site that teaches the CIMMYT MEAL Framework 2026–2030: a 10-question diagnostic, a personal study plan, ten self-standing modules with animated explainers and interactive examples, five-question mastery checks, a branching capstone and a printable completion record. It implements [docs/course-spec.md](../docs/course-spec.md).

## Run locally

Use Node.js 22 or later.

```bash
npm ci
npm run dev
```

The development server uses port 4173. `npm run build` creates a static export in `out/`. The app needs no application server or results database. All fonts, the logo, the content and the question bank are served with the app.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Home: start or continue; "Next for you" follows the plan |
| `/assess/` | Diagnostic (10 questions, Sure / Not sure tap after each answer) |
| `/results/` | Score, topic breakdown, personal plan, answer review, print |
| `/course/` | Course map with status stamps; export and import of the learning record |
| `/course/[module]/` | Scenario, objectives, lesson list with "Start at" markers, glossary cards, check button |
| `/course/[module]/[lesson]/` | Lesson player: hook, explainer, worked example, micro-check, recap |
| `/course/[module]/check/` | Mastery check (5 items, 80% to pass) and spaced refresher (3 items) |
| `/capstone/` | One project from concept note to impact study, eight decisions |
| `/certificate/` | Completion record, unlocked when all ten modules are mastered and the capstone is done |
| `/bank/` | Question dictionary with topic, pool and objective filters |
| `/about/` | Course design notes |

## How the engine works

- **Diagnostic** (`lib/assessment.ts`): ten workshop questions covering all nine topics, with two on impact assessment. Every attempt includes all ten; question and answer order are shuffled.
- **Plan** (`lib/plan.ts`): per topic, status rules in order: foundation miss or no correct answer gives *Start here*; any other miss or a confident miss gives *Review* from a named lesson; right but unsure gives *Check first*; otherwise *Looking good*. Priority uses a gap score (foundation 1.5, applied 1.0, advanced 0.7, plus 0.5 per confident miss). Missed items point at the lessons teaching their objectives and, through the distractor's misconception tag, at remedy lessons.
- **Checks** (`lib/checks.ts`): 5 items from the module's check pool covering at least 4 objectives, never repeating a question seen in this browser until the pool is exhausted. Pass at 4 of 5. Two consecutive failures start a 10-minute cool-down. A 3-item refresher is offered 7 days after mastery; failing it moves the module to *Review*, never *Start here*.
- **Learner state** (`lib/learner.ts`): version 2 record in local storage (`cimmyt-meal-learner-v2`) with defensive validation, migration from the v1 assessment key, and JSON export and import.

## Content

Everything the learner reads is data. See [docs/content-authoring.md](docs/content-authoring.md).

- `content/modules/*.json`: eleven modules (orientation plus ten topics), each with scenario, objectives, lessons and storyboards.
- `content/drafts/*.json`: the authoring bundles, one per topic module, including the module's new questions, misconception tags and tags for its retained diagnostic items. `node scripts/validate-draft.mjs <file>` checks one; `node scripts/merge-drafts.mjs` folds all drafts into the live content and bank.
- `content/misconceptions.json`, `content/glossary.json`, `content/capstone.json`.
- `data/question-bank.json` (copied to `public/`): 233 items in three pools: 10 diagnostic, 94 practice and 129 check. Every item carries `objectiveIds` and `pool`; check and diagnostic distractors carry `misconceptions` tags where one applies.

Explainers are storyboards: frames with narration and a scene from a small declarative DSL (title, cards, chain, stack, sort, split, dial, fan, compass, grid, loop, counter, dissolve, checklist) rendered in the app with Motion using the primitives from the spec (slab in, connect, stack, split, dim and spotlight, count up, stamp, sort). A rendered video can replace any storyboard by setting `explainer.kind` to `video` with `src`, `poster` and `captions`; the storyboard then remains as transcript. Interactive examples (`sorter`, `order`, `branch`, `dial`, `matrix`, `budget`, `persona`) are keyboard-operable.

## Checks

```bash
npm test
npm run typecheck
npm run build
```

Tests cover the bank (completeness, pools, references, tags), content schema (lesson beats, objectives, storyboards, misconceptions, glossary, capstone), the plan engine (every status combination, gap ordering, lesson targeting, failure handling), check draws (no seen-item reuse across 20 draws per topic, objective coverage, cool-down, re-check timing), and learner state (round trip, v1 migration, damaged-state rejection). Browser interaction, print output and the animations should be checked in the intended workshop browser before use; a browser QA capability was unavailable in the build environment.

## Design

The interface follows [Neobrutalism](https://neobrutalism.com/docs): square corners, thick borders, flat offset shadows, Archivo Black headings and Space Grotesk body text, with CIMMYT green `#77BC43`, gold `#FDBE50`, sky `#8EC1CB` and ink `#231F20`. Motion respects the reduced-motion preference: explainers show stills with the transcript, interactive pieces switch to instant state changes. The app uses [Next.js static export](https://nextjs.org/docs/app/guides/static-exports) and [Motion](https://motion.dev/docs/react-accessibility).

The site is deployed privately by default. Its audience must be changed deliberately before sharing it with learners.
