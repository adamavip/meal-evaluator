# CIMMYT MEAL assessment bank review

Source: `CIMMYT_MEAL_Framework_2026-2030_FINAL.docx`, read through the full paragraph-and-table extraction in `framework_full.txt`.

## Coverage

The bank contains 100 single-answer multiple-choice questions. Each of the ten topics has ten questions and each question has four options, a correct-answer key, a two-sentence explanation, a study action and a reference to an actual section or Annex A.

| Topic | Question IDs | Main coverage |
| --- | --- | --- |
| MEAL foundations | Q001–Q010 | Purpose, strategic effects, observation-level evidence, evidence functions, institutional value and 2030 capabilities |
| Theory of change | Q011–Q020 | Proposal timing, results architecture, assumptions, adoption pathways, digital advice, upstream science, seed systems and ownership |
| Results framework | Q021–Q030 | Processes, outputs, outcomes, impact, policy change, reach and quality, indicator crosswalks, ownership and measurement plans |
| KPIs and measurement | Q031–Q040 | Toolbox structure, Thrusts, harmonization, yield methods, aggregation, local scope, reference sheets and quality ratings |
| Data quality | Q041–Q050 | Six quality dimensions, identifiers, outliers, missingness, representativeness, provenance, validation, re-analysis, cadence and staff roles |
| Evidence systems | Q051–Q060 | Four evidence layers, satellite calibration, context, operational links, authoritative systems, offline work, reporting mappings, KPI engine and ownership |
| Impact assessment | Q061–Q070 | Contribution, context, counterfactuals, triangulation, direct measurement, study methods, baselines, uncertainty, roles and shock-event studies |
| Learning and adaptation | Q071–Q080 | Evidence reviews, decision logs, management responses, context differences, evidence gaps, staff support, pilots, handover and cross-site learning |
| Accountability and inclusion | Q081–Q090 | Four accountability directions, community feedback, disaggregation, negative findings, scientific accountability, consent, access and internal responsibility |
| Implementation and governance | Q091–Q100 | Matrix classification, complexity adjustment, Small/Medium/MEGA budgeting, indicator approval, exceptions, pillars, roadmap and pilot selection |

All six main framework sections and Annex A supply content. Direct source references span 31 distinct section identifiers. The bank has 34 foundation, 58 applied and 8 advanced questions; 65 items carry `source.kind: application`, including realistic project decisions and calculations.

## Source limits and deliberate choices

- The framework gives no standalone textbook definition of a theory of change. The bank tests its documented use in proposal design, results architecture, assumptions and contribution pathways. Inferred uses carry the `application` tag and explanations that connect the scenario to the source.
- The framework describes 142 indicators but does not provide the full reference sheets for all 142 in this document. The questions test its stated architecture and measurement rules. They do not invent indicator-level thresholds, formulas or definitions.
- Section 5.10 gives a MEGA minimum institutional contribution of USD 27,000 per project year. Several Annex A rows also state that minimum for Large projects, while others leave it unspecified. The bank does not assert a universal Large-project minimum. Q095 explicitly cites the MEGA rule in section 5.10.
- The Matrix says to move up one complexity level for certain evidence commitments but does not name a level above Complex. Q092 starts from Intermediate and therefore has an unambiguous Complex answer.
- Roadmap dates describe the plan in the supplied document. The bank does not claim that the planned milestones have already occurred.
- The stated 12.5% maize moisture value appears only as the source’s example in Q034’s explanation. The bank does not present it as a universal standard for all crops.
- The bank does not test AURORA-specific rules, legal variety-release criteria or external evaluation methods that the supplied framework does not explain.

## Validation completed

- Exactly 100 unique, sequential IDs: Q001 through Q100.
- Exactly ten questions in each requested topic.
- Exactly four distinct options per item, with option IDs `a`, `b`, `c` and `d`.
- Exactly one valid correct-answer key per item.
- No duplicate question text.
- Correct keys balance at 25 per letter, with shuffled positions.
- All required text and source fields are present; every source reference maps to a real heading in the supplied document.
- Checked application items against their source sections, including the Medium budget calculation: 5% of USD 300,000 is USD 15,000, so the USD 18,000 minimum applies.
- Revised distractors to reflect MEAL choices and common errors rather than unrelated office tasks.
- Checked answer lengths for obvious clues. Correct and incorrect options have similar average lengths; exact named categories retain their natural label lengths.
- Checked the supplied writing-style ban list and removed prohibited vocabulary and em dashes. Assessment questions are required by the user’s task; they are not rhetorical questions.

This is a source-grounded formative assessment bank, not a psychometrically validated examination. A 15-item attempt samples a small share of the bank, so topic scores should show the number answered and be described as guidance for review. A one-question topic result should not be presented as a reliable mastery estimate.

Suggested app behavior: select one question from every topic, then five additional questions from distinct topics; shuffle question order and option display order. Keep answers hidden until submission, award one point per correct answer and show source-linked explanations afterward. Report the attempt score as correct answers divided by 15, with the numerator and denominator visible.

## Course extension (bank 2.0.0)

The bank now holds 347 items in three pools. The 100 diagnostic items (Q001 to Q100) are unchanged in text and key; they gained `objectiveIds` and, where a distractor reflects a named mix-up, `misconceptions` tags. Each topic module adds 10 to 11 practice items (used by lesson micro-checks, answer shown immediately) and 13 to 15 check items (mastery checks, 5 drawn per attempt, never repeating an item the learner has seen). Each module owns a 30-id block starting at Q101 in topic order. Every objective has at least two check items; every check pool covers at least four objectives. Authoring rules, the draft validator and the merge step are described in `content-authoring.md`; the schema test in `tests/content.test.ts` enforces them.
