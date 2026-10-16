# CIMMYT MEAL Course: product and content specification

Version 0.1 (draft for review) · 13 October 2026
Owner: MEAL team, CIMMYT · Builds on the existing `frontend/` assessment app

---

## 0. Summary

Build a modular, self-paced course on the CIMMYT MEAL Framework 2026–2030 that wraps around the existing 10-question assessment. The assessment becomes a **diagnostic**: after submitting, every learner receives a personal study plan that names the modules, and the lessons inside them, where their answers showed gaps. Each module ends with a short mastery check that updates the plan. Lessons are short (3 to 6 minutes), built around animated explainers and applied scenarios, and respect the Neobrutalist visual system and CIMMYT colours already in the app.

The design borrows what works on the best self-paced platforms:

| Borrowed from | What we take |
| --- | --- |
| Udemy course quality guidance | Short lectures (2 to 6 min), sections of 3 to 7 lectures, a practice activity in every section, total runtime in the 2 to 5 hour band |
| UN CC:Learn / UNITAR e-courses | Self-standing modules in any order, four objectives per module, a quiz per module, 70% pass with a limited number of attempts, certificate on completing all modules |
| MEAL DPro (CRS, Humentum, HLA) | Scenario-driven modules, short whiteboard videos, a glossary, a study guide and a separate final exam |
| Adaptive / mastery platforms (Khan Academy style, Edmentum Exact Path, Open edX diagnostics proposal) | Diagnostic first, skip what is already known, remediate per skill, re-diagnose periodically |
| Learning science | Backward design, Bloom's levels, retrieval practice, spaced re-checks, Mayer's multimedia principles for the motion graphics |

Deliverable scope: course content model, module and lesson plan, assessment and recommendation engine, motion graphics production spec, UX flows, technical architecture, QA and phased roadmap.

---

## 1. Goals and non-goals

### 1.1 Goals

1. Every CIMMYT staff member or partner who works on a project can learn the framework in about five hours of self-paced study.
2. A learner who takes the diagnostic sees, within seconds, which modules to study first and which lessons inside them, with a reason for each recommendation.
3. A learner can prove mastery of a module with a short check and see the plan shrink as gaps close.
4. Content stays grounded in the framework document. Every lesson cites the section it teaches, and every quiz item keeps its source reference.
5. The course runs as a static site, offline-tolerant, without a results database, exactly like the current app. Data stays in the learner's browser unless they export it.
6. Motion graphics make abstract concepts (results chain, evidence stack, counterfactuals, aggregation rules) concrete and friendly without adding cognitive load.

### 1.2 Non-goals (for version 1)

- Certification with legal or HR weight. The certificate is a completion record, not a credential.
- Proctoring, identity verification or server-side score storage.
- Teaching the 142 indicator reference sheets. The framework does not contain them, and the course does not invent them.
- Live cohort features (forums, peer review, facilitator dashboards). These are a later phase.

---

## 2. Audience and personas

| Persona | Typical role | Prior knowledge | What they need |
| --- | --- | --- | --- |
| **Project lead** | PI, project manager | Knows their science, weak on MEAL vocabulary | Proposal-stage requirements, minimum package, budgets, who owns what |
| **Field or data officer** | Enumerator lead, data manager | Hands-on data skills, little exposure to the framework's logic | Data quality dimensions, collection plans, evidence stack, identifiers |
| **Scientist** | Breeder, agronomist, economist | Strong on methods, sceptical of MEAL overhead | Why observation-level evidence, contribution vs attribution, KPI measurement levels |
| **MEAL specialist** | Institutional or regional MEAL staff | Already fluent | Fast confirmation, the governance and roadmap details, a reference to point others to |
| **Partner / donor liaison** | Communications, partnerships | Light technical background | Accountability directions, "collect data once", what CIMMYT will achieve by 2030 |

Design consequence: the diagnostic must let the MEAL specialist skip most of the course, and the project lead must never be forced through lessons aimed at data officers. Module ordering is a recommendation, not a gate.

---

## 3. Learning model

### 3.1 Principles

1. **Backward design.** Each module states 4 to 6 learning objectives written as observable behaviours ("Classify a project indicator by results level", not "Understand the results framework"). Every quiz item maps to at least one objective. Every lesson teaches exactly one objective, or a tightly linked pair.
2. **Bloom's progression inside a module.** Lessons move from remember/understand (what the framework says) to apply/analyse (what you would do in a project). The question bank already tags items as `foundation`, `applied` and `advanced`; lessons use the same ladder.
3. **Microlearning.** Lessons run 3 to 6 minutes. One idea, one animation, one check. Nobody has to find 40 minutes to make progress.
4. **Scenario first.** Each module opens on a realistic CIMMYT project situation and returns to it at the end. 65% of the current bank is already scenario-based; lessons reuse those scenarios so practice and teaching speak the same language.
5. **Retrieval practice everywhere.** A micro-check after every lesson, a mastery check after every module, a spaced re-check offered 7 and 30 days after a module is passed.
6. **Diagnose, then prescribe.** The learner is told what to skip as clearly as what to study. Confidence stays high because the plan is short and justified.
7. **Mastery, not seat time.** A module is "mastered" when the learner passes its check, whether or not they watched every lesson. Watching is never required to unlock a check.
8. **Multimedia principles (Mayer).** Animations use signalling (highlight what matters), segmenting (one step at a time, learner-paced), coherence (no decorative motion), and voice narration with on-screen keywords rather than full text read aloud.

### 3.2 Learner journey

```
Home ─▶ Diagnostic (10 q) ─▶ Results + Personal plan
                                   │
          ┌────────────────────────┼─────────────────────────┐
          ▼                        ▼                         ▼
   "Start here" modules     "Review" modules          "Looking good" modules
   (full module)            (targeted lessons)        (optional, skip to check)
          │                        │                         │
          └──────────── Module ─▶ Lessons ─▶ Mastery check ──┘
                                   │
                        pass ≥ 80% ──▶ plan updates, module marked mastered
                        fail        ──▶ lessons for missed objectives, retry (new draw)
                                   │
                        all 10 mastered ──▶ Capstone scenario ──▶ Completion certificate
                                   │
                        7 / 30 days later ──▶ optional spaced re-check (3 q)
```

---

## 4. Course architecture

### 4.1 Overall shape

| Unit | Count | Length | Contents |
| --- | --- | --- | --- |
| Course | 1 | ~5.5 h total | Orientation + 10 modules + capstone |
| Module | 10 (+ orientation and capstone) | 25 to 40 min | Scenario intro, 4 to 7 lessons, glossary cards, mastery check |
| Lesson | 55 to 65 | 3 to 6 min | Hook, animated explainer, worked example, micro-check, recap card |
| Mastery check | 10 | 5 questions, ~5 min | Drawn from the module's check pool, 80% to pass |
| Capstone | 1 | 20 min | One project walked from proposal to impact, 8 decision points |

Modules map one-to-one to the ten topics already defined in `frontend/lib/topics.ts`, so the diagnostic's topic scores drive module recommendations with no translation layer. Module order follows the framework's own logic (why → what → how to measure → how to manage data → how to claim impact → how to learn and account → how to run it), but every module is self-standing.

### 4.2 Module plan

Section references point at the CIMMYT MEAL Framework 2026–2030. Lesson lists are the target; the instructional designer may merge or split while keeping objective coverage.

#### M0 · Orientation (10 min, not assessed)
- L0.1 How this course works: diagnostic, plan, mastery checks, certificate (2 min, animated walkthrough)
- L0.2 The framework in 90 seconds: one animation that previews every module's concept
- L0.3 Set your goal: persona picker that tunes examples (project lead, data officer, scientist, MEAL staff, partner liaison)

#### M1 · MEAL foundations (§1.1–1.3, 2.5, 2.7) · 30 min
Objectives: explain the shift from report-based to observation-based evidence; name the four strategic effects; place MEAL in CIMMYT's context; list the five evidence functions; describe accountability in practice.
- L1.1 Why MEAL changes: from reports to observations (scenario: two projects report the same yield gain, only one can show the plots)
- L1.2 The four strategic effects
- L1.3 MEAL in CIMMYT's context: science, partners, geographies
- L1.4 The five evidence functions and when each is used
- L1.5 Monitoring, evaluation, accountability, learning: how the four parts depend on each other
- Mastery check M1

#### M2 · Theory of change (§2.1–2.4, 5.1, 5.4) · 35 min
Objectives: trace activities to impact; state assumptions behind each link; distinguish adoption pathways (digital advice, seed systems, upstream science); draft a theory of change at proposal stage.
- L2.1 What a theory of change does for a proposal
- L2.2 Building the chain: processes, outputs, outcomes, impact (animated assembly)
- L2.3 Assumptions: the links you cannot control
- L2.4 Three pathways compared: seed systems, digital advice, upstream science
- L2.5 Ownership: who holds which part of the chain
- L2.6 Worked example: draft a chain for a maize variety project in 6 minutes
- Mastery check M2

#### M3 · Results framework (§2.1–2.4, 5.4) · 30 min
Objectives: define each results level; classify an indicator by level; distinguish reach from quality; use indicator crosswalks; write a measurement plan row.
- L3.1 Four levels, four kinds of evidence
- L3.2 Output or outcome? The classification test (interactive sorter)
- L3.3 Reach versus quality: counting people is not measuring change
- L3.4 Policy change as a result
- L3.5 Crosswalks: one project indicator, several reporting frames
- L3.6 The measurement plan row
- Mastery check M3

#### M4 · KPIs and measurement (§3.1–3.3) · 40 min
Objectives: describe the KPI toolbox (volumes and thrusts); explain why one KPI can have several valid measurement levels; apply aggregation and harmonisation rules; read a reference sheet and its quality rating.
- L4.1 The KPI toolbox: volumes, thrusts and the 142
- L4.2 One KPI, many valid methods: the yield example (12.5% maize moisture as the framework's own example)
- L4.3 Aggregation: from plots to institutional totals without double counting
- L4.4 Harmonisation and local scope
- L4.5 Reading a KPI reference sheet
- L4.6 Quality ratings and what they tell a reviewer
- L4.7 From observation-level data to decision-relevant insight
- Mastery check M4

#### M5 · Data quality and collection (§2.5–2.6, 4.1, 5.4) · 35 min

> Removed from the course on 2026-10-16. The modules below are now numbered M5 to M9 in the app; this section is kept for the record.
Objectives: name the six quality dimensions; design identifiers and provenance; handle outliers and missingness; judge representativeness; set a validation cadence and assign roles.
- L5.1 Six dimensions of data quality (animated "quality dial")
- L5.2 Identifiers and provenance: can you find this observation again?
- L5.3 Outliers, missingness and what to do before deleting anything
- L5.4 Representativeness: who is not in your sample?
- L5.5 Validation, re-analysis and cadence
- L5.6 Roles: who checks what, and when
- Mastery check M5

#### M6 · Evidence and data systems (§2.6, 4.1–4.3) · 30 min
Objectives: describe the evidence stack's four layers; follow an observation from collection to report; explain required functionalities and design principles; apply "collect data once".
- L6.1 The evidence stack: four layers (animated stack build)
- L6.2 The journey of one observation
- L6.3 Satellite, context and operational data: what each adds
- L6.4 Authoritative systems and offline work
- L6.5 Collect once, report many times: investor reporting mappings and the KPI engine
- Mastery check M6

#### M7 · Impact assessment (§1.3, 2.4, 2.6, 3.3) · 40 min
Objectives: distinguish contribution from attribution; explain counterfactuals and comparison groups; triangulate sources; plan baselines; communicate uncertainty; recognise when a shock-event study applies.
- L7.1 Contribution, not attribution
- L7.2 Counterfactuals: the split-screen farm (animated)
- L7.3 Study designs the framework recognises
- L7.4 Baselines and timing
- L7.5 Triangulation and direct measurement
- L7.6 Uncertainty: saying how sure you are
- L7.7 Shock-event studies and roles
- Mastery check M7

#### M8 · Learning and adaptation (§2.5, 5.4, 5.7, 6.2) · 25 min
Objectives: run an evidence review; keep a decision log; write a management response; use pilots and handover; share learning across sites.
- L8.1 Evidence reviews: the operating cadence
- L8.2 Decision logs and management responses
- L8.3 When evidence should change a decision (interactive branching scenario)
- L8.4 Pilots, handover and cross-site learning
- L8.5 Evidence gaps and the 2030 capabilities
- Mastery check M8

#### M9 · Accountability and inclusion (§2.7, 4.1, 5.4, 6.1) · 25 min
Objectives: name the four accountability directions; design community feedback loops; apply disaggregation; handle negative findings; apply consent and access rules.
- L9.1 Four directions of accountability (animated compass)
- L9.2 Community feedback that reaches decisions
- L9.3 Disaggregation and inclusion
- L9.4 Negative findings and scientific accountability
- L9.5 Consent, access and internal responsibility
- Mastery check M9

#### M10 · Implementation and governance (§5.1–5.10, Annex A) · 40 min
Objectives: classify a project with the MEAL Matrix; apply complexity adjustments; compute the minimum MEAL budget for Small, Medium and MEGA projects; describe the division of responsibility, governance and team roles; read the rollout roadmap.
- L10.1 MEAL across the project lifecycle
- L10.2 The MEAL Matrix: classify your project (interactive)
- L10.3 Complexity adjustments and exceptions
- L10.4 Budgeting the minimum package (worked calculation: 5% of USD 300,000 is USD 15,000, so the USD 18,000 minimum applies)
- L10.5 Project delivery versus institutional MEAL
- L10.6 Governance, team structure and how the roles work together
- L10.7 Rollout roadmap and enabling success
- Mastery check M10

#### Capstone · One project, end to end (20 min)
A branching scenario that follows a single CIMMYT project from concept note to impact study. Eight decision points, each tagged with a module. Wrong branches show consequences and link back to the relevant lesson. Completing the capstone with all ten modules mastered unlocks the certificate.

### 4.3 Lesson anatomy (template)

Every lesson follows the same five beats so learners build a rhythm:

| Beat | Time | Content | Format |
| --- | --- | --- | --- |
| 1. Hook | 20 s | A question or scenario moment the lesson resolves | Still frame + one sentence |
| 2. Explainer | 90 to 180 s | The concept, taught once, visually | Motion graphic with narration and captions |
| 3. Worked example | 60 to 90 s | The concept applied to a CIMMYT case | Animated or interactive |
| 4. Micro-check | 30 to 60 s | One or two questions with instant feedback | In-app, not scored for mastery |
| 5. Recap card | 15 s | Three bullets and the framework section reference | Static, printable |

Each lesson also exposes: a transcript, a "Read the source" link to the section text, glossary terms used, and a "Was this clear?" thumbs rating (stored locally, exportable).

---

## 5. Content model

The course is data-driven so content can be edited without touching components. All content lives in `content/` as JSON and MDX, validated by a schema test the way the question bank is today.

### 5.1 Entities

```ts
type Module = {
  id: TopicId;                  // same ids as lib/topics.ts
  order: number;
  title: string;
  minutes: number;
  sections: string[];           // framework section references
  scenario: { title: string; intro: string; persona: Persona[] };
  objectives: Objective[];
  lessons: Lesson[];
  prerequisites: TopicId[];     // used only to order recommendations
};

type Objective = {
  id: string;                   // e.g. "results-framework.O2"
  text: string;                 // observable behaviour
  bloom: 'remember' | 'understand' | 'apply' | 'analyse';
};

type Lesson = {
  id: string;                   // e.g. "L3.2"
  moduleId: TopicId;
  title: string;
  objectiveIds: string[];
  minutes: number;
  beats: {
    hook: string;
    explainer: { kind: 'video' | 'interactive'; src: string; captions: string; transcript: string; storyboardId: string };
    example: { kind: 'video' | 'interactive' | 'text'; src?: string; body?: string };
    microCheck: string[];       // question ids from the practice pool
    recap: { bullets: string[]; source: { section: string; title: string } };
  };
  glossary: string[];
};

type Question = /* existing shape */ & {
  objectiveIds: string[];                    // NEW: which objectives this item evidences
  pool: 'diagnostic' | 'practice' | 'check'; // NEW: where it may be drawn
  misconceptions?: Record<string, string>;   // NEW: distractor id -> misconception tag
};

type Misconception = {
  tag: string;                  // e.g. "output-vs-outcome"
  description: string;
  remedyLessonIds: string[];    // where to send someone who holds it
};
```

### 5.2 Question bank growth

The current bank has 100 items, 10 per topic, all used by the diagnostic. The course needs three pools so learners never see a check question they already met in the diagnostic:

| Pool | Per topic | Use |
| --- | --- | --- |
| diagnostic | 1 per topic; 2 for impact assessment | 10 workshop questions, all included; display order shuffled |
| practice | 8 to 12 | Micro-checks inside lessons, answer shown immediately |
| check | 12 to 15 | Mastery checks, 5 drawn per attempt, new draw per retry |

Target bank: 300 to 350 items. Every item carries `objectiveIds`, and every distractor on diagnostic and check items carries a misconception tag where one applies. Bank authoring follows the rules already set in `frontend/docs/question-bank-review.md`: source-grounded, one correct answer, balanced keys, similar option lengths, no invented indicator thresholds.

---

## 6. Assessment and recommendation engine

### 6.1 Diagnostic (existing, extended)

Keep the current draw: one item per topic plus a second item in five random topics, shuffled, no time limit. Two additions:

1. **Confidence tap.** After choosing an answer, the learner taps "Sure" or "Not sure". One extra tap, no typing. This separates a lucky guess from knowledge and a confident wrong answer (a misconception) from an uncertain one.
2. **Objective tagging.** Each diagnostic item lists the objectives it evidences, so a miss points at specific lessons, not just a module.

### 6.2 Topic status

For each topic, compute from the diagnostic rows:

| Input | Meaning |
| --- | --- |
| `asked` | 1 or 2 |
| `correct` | 0 to 2 |
| `foundationMiss` | missed an item tagged `foundation` |
| `confidentMiss` | missed an item while tapping "Sure" |
| `unsureCorrect` | correct while tapping "Not sure" |

Status rules, applied in order:

| Status | Rule | Plan wording |
| --- | --- | --- |
| **Start here** | `foundationMiss`, or `correct = 0` | "Take the full module. A foundation question was missed." |
| **Review** | any miss that is not a foundation miss, or `confidentMiss` | "Start at lesson X. One answer suggests a mix-up between A and B." |
| **Check first** | `asked = 1` and `unsureCorrect` | "You were right but not sure. Take the 5-question check; study only if needed." |
| **Looking good** | all correct and no `unsureCorrect` | "Optional. Take the check whenever you want the module marked as mastered." |

Priority inside a band uses a gap score: `gap = Σ missWeight`, with weights foundation 1.5, applied 1.0, advanced 0.7, plus 0.5 for each confident miss. Ties resolve by module order (prerequisites first).

### 6.3 Lesson-level targeting

For every missed diagnostic item:

1. Take its `objectiveIds` and list the lessons that teach them. These become "Start at" lessons in the plan.
2. If the chosen distractor carries a misconception tag, add that misconception's `remedyLessonIds` and show the plain-language description ("You picked an output when the question asked for an outcome.").
3. Lessons not implicated are shown but marked "Optional for you".

### 6.4 Personal plan

The results page gains a "Your plan" panel:

- At most **three** "Start here / Review" modules shown first with estimated minutes. The rest fold under "Later".
- Each module card shows: status, reason sentence, the first lesson to open, minutes, and a "Mark as known" option (which simply moves it to "Looking good" without a check; honesty is the learner's business).
- A single number at the top: "About 1 h 40 min to close your gaps."
- The plan is printable with the existing report.

### 6.5 Mastery checks

- 5 items drawn from the module's `check` pool covering at least 4 distinct objectives, never repeating an item the learner has seen in this browser.
- Pass mark 80% (4 of 5). Explanations and source references shown after submission, as today.
- On failure: the plan lists the lessons for the missed objectives, then offers a retry with a fresh draw. No attempt limit, but a 10-minute cool-down after two consecutive failures with a prompt to open the lessons.
- Passing marks the module **mastered** and removes it from the plan.
- Spaced re-check: when the learner returns 7 or more days after mastering a module, the home page offers a 3-item refresher for that module. Failing it changes the status to "Review" (never back to "Start here").

### 6.6 Completion

All ten modules mastered and the capstone finished. The learner can print or save a completion page with name, date, module list and bank version. No score is printed on the certificate, only "completed".

### 6.7 Learner state

Extend the local storage model (`STORAGE_KEY` bumps to v2, with migration from v1 attempts):

```ts
type LearnerState = {
  version: 2;
  bankVersion: string;
  name: string;
  persona?: Persona;
  diagnostic: Attempt | null;             // existing shape plus confidence map
  confidence: Record<string, 'sure' | 'unsure'>;
  plan: Record<TopicId, { status: Status; reasons: string[]; startAt: string[]; gap: number; updatedAt: string }>;
  lessons: Record<string, { opened: string; completed?: string; rating?: 'clear' | 'unclear' }>;
  checks: Record<TopicId, { attempts: CheckAttempt[]; masteredAt?: string; lastRecheckAt?: string }>;
  seenQuestionIds: string[];
  capstone?: { completedAt: string; choices: Record<string, string> };
};
```

Validation on restore follows the same defensive style as `restoreAttempt`. Export and import as JSON lets a learner move between devices without any server.

---

## 7. Motion graphics specification

### 7.1 Role of motion

Motion does three jobs and nothing else:

1. **Explain structure**: things assembling, stacking, flowing, splitting. The results chain, the evidence stack, aggregation, the counterfactual.
2. **Direct attention**: highlight, dim, connect. Used in worked examples.
3. **Give feedback**: micro-check responses, progress, mastery celebrations. Already partly built in the app.

Decorative motion is out. If an animation can be removed without losing meaning, remove it.

### 7.2 Toolchain

| Need | Tool | Why |
| --- | --- | --- |
| Rendered explainer videos (beats 2 and 3) | **Remotion** (React) | Same stack, same design tokens, version-controlled storyboards, programmatic captions, renders MP4 and WebM at 1080p |
| In-app interactive animations (sorters, stack builders, matrix classifier) | **Motion** (`motion/react`, already a dependency) | Already respects reduced motion, works in the static export |
| Icon and feedback micro-animations | **Lottie** (via `lottie-web` or `@lottiefiles/dotlottie-react`) | Tiny files, designer-editable |
| Voice-over | Recorded human narration, EN first | Mayer's voice principle; synthetic voice acceptable for drafts only |
| Captions | WebVTT generated from the narration script | Required for accessibility and silent viewing |

Design tokens shared by Remotion and the app: green `#77BC43`, gold `#FDBE50`, sky `#8EC1CB`, ink `#231F20`, paper white; Archivo Black for titles, Space Grotesk for body; square corners, 3px ink borders, flat offset shadows. The explainer videos must look like the app moved.

### 7.3 Motion language (reusable primitives)

| Primitive | Behaviour | Used for |
| --- | --- | --- |
| **Slab in** | Element enters with a 6px offset shadow snapping into place, 180 ms, ease-out | Any new card, step, option |
| **Connect** | A thick line draws from A to B over 400 ms, arrowhead pops | Results chain links, data flows |
| **Stack** | Layers drop from above and settle with a 1-frame overshoot | Evidence stack, aggregation levels |
| **Split** | A scene divides into two panels with a hard vertical cut | Counterfactual, with/without, before/after |
| **Dim and spotlight** | Everything except the focus drops to 30% opacity | Worked examples, signalling |
| **Count up** | Numbers roll with tabular figures, 600 ms | Scores, budgets, aggregation totals |
| **Stamp** | A label rotates in 4° and lands with a shadow | Status, "mastered", classifications |
| **Sort** | Items slide into labelled bins | Output vs outcome sorter, matrix classifier |

Timings: 150 to 250 ms for UI feedback, 400 to 800 ms for explanatory moves, never more than one explanatory move at a time. No bounces longer than 1 frame, no parallax, no auto-playing loops behind text.

### 7.4 Explainer shot list (one hero animation per module)

| Module | Hero explainer | Core visual idea | Length |
| --- | --- | --- | --- |
| M0 | How the course works | A plan that shrinks as modules stamp "mastered" | 60 s |
| M1 | Reports to observations | A stack of PDFs dissolves into a map of plots, each plot a data point | 120 s |
| M2 | Building the chain | Four slabs connect left to right; assumption tags hang on each link; one link breaks when an assumption fails | 150 s |
| M3 | Four levels, four kinds of evidence | A sorter drops indicator cards into level bins; wrong drops bounce back with a reason | 120 s |
| M4 | One KPI, many methods | A single yield KPI fans into three measurement methods that reconverge on one reported value, with moisture correction shown as a dial | 150 s |
| M5 | The quality dial | Six dimensions drawn as a dial; a dataset's needle moves as problems are fixed | 120 s |
| M6 | The journey of one observation | A single data point travels through the four layers, picking up identifiers, context and provenance | 150 s |
| M7 | The split-screen farm | Two identical fields; one gets the intervention; the gap between them is the effect; noise added to show uncertainty | 150 s |
| M8 | The evidence review loop | A calendar cadence; evidence enters, a decision log entry appears, a practice changes | 90 s |
| M9 | The accountability compass | Four directions light up as feedback flows to and from each | 90 s |
| M10 | Classify and budget | The MEAL Matrix as a grid; a project token moves as complexity changes; the budget counter updates | 150 s |
| Capstone | One project, end to end | The whole chain re-assembled from the pieces of the ten hero animations | 60 s |

Each explainer ships with: storyboard (frames with narration lines), narration script, VTT captions, transcript, and a poster frame. Storyboards are stored as MDX next to the Remotion composition so they are reviewable in pull requests.

### 7.5 Storyboard template

```
Storyboard: M3 hero "Four levels, four kinds of evidence"
Frame 1 (0:00–0:06)  Hook. Ink title "Count or change?" Narration: "Two projects reported success. Only one measured change."
Frame 2 (0:06–0:20)  Four empty bins slab in: Processes, Outputs, Outcomes, Impact. Narration defines each in one sentence while its bin lights.
Frame 3 (0:20–0:50)  Six indicator cards sort in. "Trials coordinated" → Processes. "Variety released" → Outputs. "Farmers adopting" → Outcomes ...
Frame 4 (0:50–1:05)  Wrong sort attempt: "Farmers trained" tries Outcomes, bounces back. Spotlight. Narration: "Training is delivered. Adoption is a change."
Frame 5 (1:05–1:50)  Reach vs quality split. Same card, two sides.
Frame 6 (1:50–2:00)  Recap stamp with §2.1–2.4.
```

### 7.6 Accessibility and performance rules for motion

- Every animation respects `prefers-reduced-motion`: videos show a poster plus transcript; interactive pieces switch to instant state changes.
- Captions on by default; transcript always visible below the player.
- No flashing above 3 Hz; colour never carries meaning alone (status uses icon + label + colour).
- Videos are served as WebM and MP4, 1080p, under 15 MB each, with a 480p fallback for low bandwidth; a lesson works with the video unavailable because the transcript and recap carry the content.
- Interactive animations run at 60 fps on a mid-range laptop; no animation blocks input.

---

## 8. User experience

### 8.1 Screens

| Screen | Purpose | Notes |
| --- | --- | --- |
| Home | Start or resume; shows plan progress once a diagnostic exists | Existing hero and results chain stay |
| Diagnostic | Existing quiz plus confidence tap | |
| Results and plan | Score, topic breakdown, personal plan, print | Plan panel replaces the current generic study guidance |
| Course map | All modules as cards with status stamps, minutes, lesson counts | Entry point for browsing |
| Module | Scenario intro, lesson list with "Start at" marker, check button | Check is always available |
| Lesson | Five beats, next/previous, transcript, source link, rating | Keyboard-operable player |
| Mastery check | 5 questions, same interaction as the diagnostic | Explanations after submit |
| Capstone | Branching scenario | |
| Certificate | Printable completion page | |
| Question dictionary | Existing | Add filter by pool and objective |
| About | Existing, plus course design notes | |

### 8.2 Navigation rules

- The plan is the default landing after the diagnostic, and the home page's primary call to action becomes "Continue your plan" once one exists.
- Learners can open any module or lesson at any time. Nothing is locked.
- A persistent compact progress strip shows modules mastered out of ten.
- Every lesson ends with a "Next for you" button that follows the plan, not the module order.

### 8.3 Tone

Friendly, direct, second person, short sentences. Scenarios use realistic CIMMYT settings (maize in Kenya, wheat in South Asia, seed systems in Mexico) without naming real projects or people. Feedback on wrong answers explains the mix-up, never scolds.

---

## 9. Technical architecture

### 9.1 Stack

- Next.js static export, React, TypeScript, Motion: unchanged.
- Content: `content/modules/*.json`, `content/lessons/*.mdx`, `content/misconceptions.json`, `data/question-bank.json` (extended schema).
- Explainers: `remotion/` workspace with one composition per hero animation; rendered artefacts committed to `public/media/` (or stored in object storage and referenced by URL if the repo grows beyond a few hundred MB).
- Engine: `lib/plan.ts` (status rules, gap score, lesson targeting), `lib/checks.ts` (draws, pass rules, seen-tracking), `lib/learner.ts` (state, migration, export/import). Pure functions, fully unit-tested with seeded random.

### 9.2 Routes

```
/                      home
/assess                diagnostic
/results               results and plan
/course                course map
/course/[module]       module page
/course/[module]/[lesson]
/course/[module]/check
/capstone
/certificate
/bank                  question dictionary
/about
```

### 9.3 Tests (extend `tests/`)

- Content schema: every lesson's objectives exist; every objective has at least two check items; every check pool has ≥12 items covering ≥4 objectives; every misconception's remedy lessons exist; every storyboard id resolves to a media file.
- Engine: status rules for every combination of asked/correct/foundation/confidence; gap ordering; lesson targeting; no seen-item reuse across 20 consecutive check draws; migration from v1 storage; damaged state rejected.
- Accessibility: automated axe pass on every route; manual keyboard walkthrough of the lesson player and sorters.

### 9.4 Later integrations (not in v1)

- SCORM 1.2 or xAPI wrapper so the course can sit inside an LMS and report completion.
- Optional opt-in telemetry endpoint for aggregate, anonymous course evaluation.
- Spanish and French localisation of text, captions and narration; the content model keeps all strings in JSON/MDX to make this a translation job, not a rebuild.

---

## 10. Evaluating the course itself

Use Kirkpatrick levels 1 to 3 without a server:

| Level | Measure | Mechanism |
| --- | --- | --- |
| 1 Reaction | Lesson clarity ratings, time per lesson | Local state, exported by volunteers or collected in workshops |
| 2 Learning | Diagnostic score vs mastery checks vs spaced re-checks | Local state; workshop facilitators collect exported JSON |
| 3 Behaviour | Projects submitted with compliant MEAL packages after training | MEAL team's own records, 6 months after rollout |

Add an "Export my learning record" button so evaluation never requires tracking.

---

## 11. Production workflow and quality assurance

### 11.1 Roles

| Role | Responsibilities |
| --- | --- |
| Content lead (MEAL team) | Objectives, scenario accuracy, sign-off against the framework |
| Instructional designer | Lesson scripts, micro-checks, storyboards, check pools |
| Motion designer / Remotion developer | Hero explainers, Lottie assets, motion language |
| Front-end developer | Engine, screens, tests, build |
| Reviewer (second MEAL specialist) | Blind review of every check item and misconception tag |
| Narrator | Voice-over recording, EN |

### 11.2 Lesson production pipeline

1. Objective written and approved.
2. Script (hook, explainer narration, example, recap) drafted in MDX with section references.
3. Content lead review for framework fidelity.
4. Storyboard drafted; motion designer builds the Remotion composition; silent render reviewed.
5. Narration recorded; captions generated and proof-read; final render.
6. Micro-check and check items written, tagged with objectives and misconceptions, blind-reviewed.
7. Lesson assembled in the app; accessibility and reduced-motion checks; playtest with two people outside the MEAL team.
8. Merged behind a content flag; released when the module is complete.

### 11.3 Definition of done for a module

- All objectives covered by at least one lesson and two check items each.
- Hero explainer rendered with captions and transcript.
- Check pool ≥12 items, blind-reviewed, source-referenced.
- Engine tests green; schema test green; axe clean.
- Playtested by two non-MEAL colleagues who could pass the check after the lessons.

---

## 12. Roadmap

| Phase | Weeks | Scope | Exit criterion |
| --- | --- | --- | --- |
| **1 Engine and plan** | 1–3 | Confidence tap, objective tags on the existing 100 items, status rules, plan panel, learner state v2, tests | Diagnostic produces a justified plan for every possible result |
| **2 Pilot modules** | 4–8 | M0, M2 (Theory of change) and M3 (Results framework) complete with hero explainers, lessons, check pools | Two modules can be mastered end to end; motion language and lesson template frozen |
| **3 Remaining modules** | 9–20 | M1, M4 to M10 at two modules per three weeks; bank reaches 300+ items | All ten modules meet definition of done |
| **4 Capstone and certificate** | 21–23 | Branching capstone, certificate, spaced re-checks, export/import | Full journey completable |
| **5 Rollout** | 24–26 | Workshop pilot with two regional teams, fixes, launch | Level 1 and 2 data collected from pilots; go/no-go for LMS packaging and localisation |

Phase 1 is deliberately small and ships on the current app: a learner who takes today's assessment already gets a better plan before any lesson exists.

---

## 13. Assumptions and open questions

Assumptions made in this draft:

- "Motion graphics" means short animated explainers and in-app interactive animations, produced in the same React stack rather than a separate After Effects pipeline. Change section 7.2 if the team has a motion designer who works in After Effects; Lottie export then replaces Remotion for the hero pieces.
- English first; Spanish and French follow once the content is stable.
- No server or LMS in v1. The static-export, browser-only model stays.
- The 10 existing topics are the right module grain. Splitting M4 or M10 later is cheap because modules are data.

Questions for the MEAL team:

1. Is an 80% pass mark on a 5-item check acceptable, or should checks be 8 items with a 75% mark for better reliability?
2. Should "Mark as known" exist, or must every module be proven by a check before the certificate?
3. Who records narration, and can two voices be used so lessons do not feel monotonous?
4. Is there an existing CIMMYT LMS the course must eventually live in (affects phase 5)?
5. Can the framework document be shared with learners inside the app as section-level text, or only as references?

---

## 14. References

Learning-platform practice consulted for this spec:

- Udemy course length rules and staff lecture-length guidance: <https://support.udemy.com/hc/en-us/articles/229604328-Calculating-Course-Length>, <https://community.udemy.com/en/discussion/131506/what-duration-of-course-is-ideal>, <https://community.udemy.com/en/discussion/22782/number-of-lectures-per-section>
- UN CC:Learn introductory e-course structure (self-standing modules, quiz per module, 70% pass, three attempts): <https://event.unitar.org/product/3853>
- MEAL DPro (CRS, Humentum, HLA): <https://www.humentum.org/monitoring-evaluation-accountability-and-learning-meal-dpro>, <https://www.crs.org/sites/default/files/tools-research/meal_dpro_2019.04.24.pdf>, <https://alnap.org/help-library/resources/meal-dpro-monitoring-evaluation-accountability-and-learning-for-development/>
- Diagnostic-driven learning paths: <https://www.edmentum.com/articles/exact-path-learning-path/>, <https://openedx.atlassian.net/wiki/spaces/COMM/pages/5044240422>
- Motion accessibility: <https://motion.dev/docs/react-accessibility>
- Source document: CIMMYT MEAL Framework 2026–2030 (final), bundled in `frontend/public/`.
