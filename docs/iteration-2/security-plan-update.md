# Security plan - iteration 2 update

Iteration 2 kept the iteration 1 security model and closed the review
actions listed at the end of that plan. No new attack surface was
introduced beyond one extra column and one extra endpoint on the existing
authorised resource.

## Model carried forward

- Accounts are recovery codes: random UUIDs held by the user and passed as
  a Bearer token. There are no passwords, emails or sessions to leak.
- Every personal endpoint resolves the profile from the recovery code
  before reading or writing, so one profile cannot address another's rows.
- Responses for personal endpoints are sent with `Cache-Control: no-store`;
  only the public catalogue searches are cacheable.

## Changes this iteration

- `PATCH /api/skills` accepts a row ID and one of three whitelisted status
  values. Anything else is rejected with HTTP 400 before the database is
  touched, and the update is scoped by both the row ID and the recovery
  code, so the change cannot cross profiles.
- Adding a skill validates the status field the same way. Status values are
  stored as plain text with a fixed vocabulary and never rendered as HTML.
- The progress tracker and readiness score render user-controlled values
  through React text nodes, so no injection path is added.

## Review actions closed

- Skill entries are now catalogue-only: the API rejects free text, the
  interface disables adding until a suggestion is picked, and a migration
  linked or removed the historical free-text rows. This closes the stored
  content risk noted in iteration 1.
- The large generated imports are applied with per-field chunked
  statements, removing the timeout-driven partial import risk observed
  during the iteration.

## Open items for iteration 3

- Rate-limit recovery code attempts to slow brute force guessing.
- Consider a second factor (email one-time code) if the platform ever moves
  past the prototype stage.
