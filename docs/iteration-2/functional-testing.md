# Iteration 2 functional testing

Functional checks ran against a local Worker (`wrangler dev`) with a local
D1 database, then the same flows were repeated against the deployed site.
The regression script `scripts/test-study-skills.mjs` covers the study
recommendation endpoint; the checks below extend that to iteration 2.

## Readiness score

- A fresh profile with no skills shows a readiness of 0 and the prompt to
  add skills.
- Adding a skill listed for the target role raises the category bar and the
  overall ring after the next profile load.
- A skill from the same O*NET knowledge family counts half coverage; an
  unrelated skill counts nothing.
- Saving a skill as Upcoming does not raise readiness until it moves to
  Current or Completed.

## Skill progress tracking

- `PATCH /api/skills` moves a skill between Upcoming, Current and Completed
  and rejects anything else with HTTP 400.
- The tracker on the Pathways page shows one count per bucket plus the
  skill names.
- An empty tracker shows the empty-state hint instead of blank space.
- Removing a skill removes it from its bucket.

## Match recommendations

- Every recommendation carries its score, the reasons behind it and the
  skills / growth / education breakdown.
- Planning a suggested role stores it as the target role and the overview
  hero and stats follow.
- Reactions (Not for me, Curious, Interested) persist and the next ranking
  run drops or reorders the card.

## Market data

- The outlook section shows the JSA five and ten year figures, median
  weekly earnings and per-state vacancies, or an explicit "no data" note
  when the role has no bridge.

All listed checks passed on 2026-09-17 against the deployed build.
