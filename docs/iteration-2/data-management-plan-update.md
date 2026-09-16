# Data management plan - iteration 2 update

This update extends the iteration 1 plan with the datasets and tables
iteration 2 introduced. Nothing in it changes how personal profiles are
stored or handled.

## New datasets

| Dataset                                      | Source                                                            | Licence                                  | Where it lands                                                       |
| -------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------- |
| Employment projections, earnings, vacancies  | Jobs and Skills Australia (JSA), Internet Vacancy Chart           | CC BY 4.0, (c) Commonwealth of Australia | `anzsco4_market`, `anzsco4_state_vacancy`                            |
| Occupation skill vectors and RIASEC profiles | O*NET 31.0 (US Department of Labor) via the ABS OSCA bridge       | CC BY 4.0                                | `occupation_skill_vector`, `occupation_match`                        |
| Study skill recommendations                  | ASCED/CIP subject links (project curated) joined to O*NET ratings | project mapping + CC BY 4.0 upstream     | `study_program_map`, `study_occupation_knowledge`, `study_skill_map` |

## New personal data

`profile_skill` gains a `status` column (upcoming, current, completed) for
progress tracking. It is personal data in the same sense as the skill rows
themselves: readable only with the profile's recovery code, never exported,
never mixed into the generated dataset imports. The generated SQL imports in
`data/generated` still contain no personal rows.

## Provenance and rebuilds

Every import remains reproducible from tracked snapshots under
`data/sources` through the `npm run data:build:*` scripts, and each run
writes a report JSON that is checked before applying. The `data_source` and
`dataset_release` tables carry publisher, licence and checksum for every
loaded file.

## Known limits

- O*NET signals are US-based and are labelled as guidance in the interface.
- Roughly two thirds of occupation skill vectors are inferred from their
  ANZSCO group average rather than direct O*NET links; the interface copy
  and the readiness measure treat them the same but the build report lists
  the count.
- Vacancy and projection figures update on the government publishing cycle;
  the dataset release rows record which snapshot the numbers came from.
