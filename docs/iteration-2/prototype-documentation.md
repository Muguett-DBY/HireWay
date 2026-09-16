# Iteration 2 prototype documentation

The prototype runs at hireway.custard.top and deploys from `main` on every
merge. This page records what iteration 2 added, where it lives in the code
and which datasets power it.

## What iteration 2 delivers

- Career readiness score - the Analysis page rates how much of the target
  role's listed skills the profile already covers, weighted towards core
  skills, and recalculates whenever the profile changes.
- Skills match and gap analysis - the Matches page ranks occupations from
  the profile's skill vector with visible reasons, and the Analysis page
  sorts each requirement into matched, to-improve or missing.
- Personalised learning roadmap - the Pathways page orders the outstanding
  skills by importance and lists the training routes published for the role
  in the Jobs and Skills Australia pathways data.
- Progress tracking dashboard - every saved skill carries a status
  (Upcoming, Current, Completed) and the Pathways page tracks counts per
  bucket; the Overview page shows the target role, its market figures and
  the top matches.

## Where it lives

| Feature                        | Code                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| Readiness and gap analysis     | `src/components/app/AnalysisPage.tsx`                      |
| Match ranking and reasons      | `worker/routes/roleSuggestions.ts`                         |
| Precomputed occupation vectors | `scripts/data/build_discovery_data.py`                     |
| Skill progress tracking        | `worker/routes/skills.ts` (PATCH), migration `0016`        |
| Learning roadmap and progress  | `src/components/app/PathwaysPage.tsx`                      |
| Market figures and outlook     | `worker/routes/roleRequirements.ts`, `data/sources/market` |

## Data boundaries

Occupation skill and knowledge signals come from US O*NET 31.0, labelled in
the interface as guidance rather than Australian employer requirements.
Employment projections, earnings and vacancies come from Australian
Government sources and are shown with their attribution. Readiness is a
coverage measure against the catalogue entry, not a prediction of hiring
outcomes.
