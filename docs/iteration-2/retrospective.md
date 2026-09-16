# Iteration 2 retrospective

Drafted from the iteration log and team notes for discussion in the
retrospective meeting. Attendees confirm or amend each point, then this
page becomes the agreed record.

## What went well

- The data foundation from iteration 1 paid off: market figures, occupation
  vectors and the study skill links were already importable, so the team
  could spend the iteration on features instead of plumbing.
- The readiness score and gap analysis shipped behind a single API call,
  which kept the front-end work simple to review.
- Progress tracking landed with a migration and API change that stayed
  backwards compatible; existing profiles carried over untouched.

## What did not go well

- Front-end merges overwritten by stale branches cost a day of rework; the
  team agreed to rebase feature branches onto main before opening a pull
  request.
- The remote D1 import failed twice on the large aggregation until it was
  split into per-field chunks; database changes now need a checklist item
  on the pull request.
- Two design cards were duplicated on the board; card owners should search
  before creating.

## Change for next iteration

- Every pull request lists its database migration and the command to apply
  it, so deployment and data stay in step.
- Usability sessions move from unmoderated to moderated with a fixed task
  script.
