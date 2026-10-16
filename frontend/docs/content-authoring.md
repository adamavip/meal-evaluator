# Content authoring guide

The course is data. Components never hold lesson text. Every module lives in `content/modules/<id>.json`, every question in `data/question-bank.json`, misconceptions in `content/misconceptions.json`, glossary in `content/glossary.json`, the capstone in `content/capstone.json`. The TypeScript types in `lib/content.ts` are the schema; `tests/content.test.ts` enforces it.

Authoring happens in a **draft bundle**, one file per module, in `content/drafts/<topicId>.json`. Run `node scripts/validate-draft.mjs content/drafts/<topicId>.json` until it reports zero errors, then `node scripts/merge-drafts.mjs` folds every draft into the live content and bank.

## Draft bundle shape

```jsonc
{
  "module": { /* Module, see below */ },
  "misconceptions": [ { "tag": "output-vs-outcome", "description": "You picked ...", "remedyLessonIds": ["L3.2"] } ],
  "diagnosticTags": { "Q021": { "objectiveIds": ["results-framework.O1"], "misconceptions": { "b": "some-tag" } } },
  "questions": [ /* new practice and check items */ ],
  "glossaryAdditions": [ { "term": "...", "definition": "...", "section": "2.6" } ]   // optional
}
```

`content/drafts/results-framework.json` is the reference example. Copy its structure exactly.

## Module

| Field | Rule |
| --- | --- |
| `id` | the topic id from `lib/topics.ts` |
| `order` | 1..10 in topic order (orientation is 0) |
| `title`, `short` | as in `lib/topics.ts` |
| `minutes` | sum of lesson minutes plus 5 for the check, within the spec's module length |
| `sections` | framework section ids, e.g. `"2.1"`, `"5.10"`, `"Annex A"` |
| `scenario` | `title`, `intro` (120+ chars, a realistic CIMMYT situation without naming real projects or people), `persona` (who this module serves most) |
| `objectives` | 4 to 6, ids `<module>.O1`..`On`, observable behaviours ("Classify ...", not "Understand ..."), `bloom` in remember/understand/apply/analyse |
| `lessons` | 4 to 7, ids `L<order>.<n>` in sequence |
| `storyboards` | one per lesson; the first lesson carries the module's hero explainer |
| `prerequisites` | topic ids used only to order recommendations |
| `assessed` | `true` for the ten topic modules |

## Lesson

Five beats, always in this order. 3 to 6 minutes.

1. `hook`: one or two sentences that pose the question the lesson resolves.
2. `explainer`: `{ "kind": "storyboard", "storyboardId": "sb-m3-hero" }`. The storyboard is the explainer. A later rendered video can be slotted in with `kind: "video"` and `src`.
3. `example`: either `{ "kind": "text", "title", "body": [paragraphs] }` applying the concept to a CIMMYT case, or an interactive widget (below).
4. `microCheck`: one or two **practice-pool** question ids from this module.
5. `recap`: exactly three bullets and a `source` `{ section, title }` naming the framework section taught.

`glossary` lists terms used, matching `content/glossary.json` (or `glossaryAdditions`).

Every lesson teaches exactly one objective or a tightly linked pair. Every objective must be taught by at least one lesson.

## Storyboards (the motion graphics)

A storyboard is a list of frames. Each frame has `seconds` (4 to 30), a `narration` line (spoken caption, one to three short sentences) and a `scene`. The player animates the scene's entry with the motion primitives from the spec (slab in, connect, stack, split, dim and spotlight, count up, stamp, sort) and respects reduced motion. Keep one explanatory move per frame. No decorative motion: if a frame can be removed without losing meaning, remove it.

Scene kinds and their fields:

| kind | fields | use for |
| --- | --- | --- |
| `title` | `title`, `subtitle?`, `stamp?` | hooks and recaps |
| `cards` | `items[{label, detail?, tone?}]` (max 8), `spotlight?: number[]`, `stamp?`, `layout?: row/grid` | lists, definitions, roles |
| `chain` | `steps[{label, detail?, tone?}]` (2..6), `links?[{label?, broken?}]` (steps-1 entries), `spotlight?`, `traveler?`, `stamp?` | results chain, lifecycle, flows; `broken` shows a failed assumption; `traveler` sends a dot along the chain |
| `stack` | `layers[{label, detail?, tone?}]` (2..6), `spotlight?`, `traveler?`, `stamp?` | evidence stack, aggregation levels |
| `sort` | `bins: string[]`, `cards[{label, bin, wrong?}]`, `stamp?` | classification; `wrong` makes the card try that bin first and bounce back |
| `split` | `left{title, lines[], value?, tone?}`, `right{...}`, `gap?`, `noise?` | counterfactual, before/after, reach vs quality |
| `dial` | `segments: string[]`, `value: 0..1`, `label?`, `flagged?: number[]` | quality dial |
| `fan` | `source`, `branches[{label, detail?}]`, `target` | one KPI many methods, one record many reports |
| `compass` | `directions[4]{label, detail?}`, `active?: number[]` | accountability directions |
| `grid` | `rows[]`, `cols[]`, `cells?[][]`, `token?{row, col, label?}`, `counter?{label, value}` | the MEAL Matrix, crosswalk tables |
| `loop` | `steps[{label, detail?}]`, `active?`, `log?` | cadence, review cycles |
| `counter` | `items[{label, value, prefix?, suffix?, tone?}]`, `note?` | budgets, totals |
| `dissolve` | `from: string[]`, `to{label, dots}` | reports dissolving into observations |
| `checklist` | `items[{label, done?}]`, `stamp?` | packages, gates, plan rows |

`tone` is one of `green`, `gold`, `sky`, `ink`, `paper`.

## Interactive widgets

| widget | fields | notes |
| --- | --- | --- |
| `sorter` | `prompt`, `bins[{id, label, hint?}]`, `cards[{label, bin, why}]` (4+) | the workhorse: classify into bins, feedback per card |
| `order` | `prompt`, `items[{label, detail?}]` in correct order (3+), `why` | arrange steps |
| `branch` | `prompt`, `start`, `nodes{id: {text, choices?[{label, next, feedback, good?}], end?}}` | short branching scenario |
| `dial` | `prompt`, `dimensions[{label, problem, fix}]` (3+) | toggle fixes, watch quality needle |
| `matrix` | `prompt` | the MEAL Matrix classifier (data built in) |
| `budget` | `prompt` | base MEAL budget calculator (data built in) |

## Questions

Question ids are assigned by block: module with topic index *i* (0-based) owns `Q{101+30i}` to `Q{130+30i}`. Use ids in order, practice first then check.

| Pool | Count | Used for |
| --- | --- | --- |
| `practice` | 8 to 12 | lesson micro-checks, answer shown immediately |
| `check` | 12 to 15 | mastery check, 5 drawn per attempt |

Rules (from `docs/question-bank-review.md`):

- Source-grounded. Every item cites a real section and the framework must support the key. No invented indicator thresholds, formulas or figures.
- One correct answer. Four options `a`..`d`, distinct, similar length, no "all of the above".
- Balanced keys across the draft (roughly a quarter each).
- Distractors are plausible MEAL mistakes, not unrelated tasks. On **check** items tag each distractor that reflects a named misconception: `"misconceptions": { "b": "output-vs-outcome" }`.
- `explanation` is two sentences: why the key is right, why the tempting distractor is wrong. `reviewTip` is one actionable sentence.
- `objectiveIds` on every item. Each objective needs at least two check items. Check pool covers at least four objectives.
- Scenario items use `source.kind: "application"` and realistic settings (maize in Kenya, wheat in South Asia, seed systems in Mexico) without naming real projects or people.
- Tone: friendly, direct, second person where natural, short sentences. No em dashes. Feedback explains the mix-up, never scolds.

## Diagnostic tags

For each of the module's ten existing diagnostic items (`Q001`..`Q100` in the bank), give `objectiveIds` and, where a distractor reflects a misconception, a `misconceptions` map. Do not change the items themselves.

## Misconceptions

Kebab-case tags, a plain-language `description` written to the learner ("You picked ..."), and `remedyLessonIds` in this module. Reuse a tag across several items; that is the point.
