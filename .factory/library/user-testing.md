# User Testing

**What belongs here:** Testing surface, validation approach, resource cost classification.

---

## Validation Surface

This mission is a pure refactoring pass. For milestones that only change internal implementation patterns and preserve the existing UX, validation uses a terminal-based inspection surface (`terminal-validation`) plus shared build/lint gates instead of launching a browser or TUI session.

## Validation Approach

- **Primary gate:** `npm run build` must pass
- **Secondary gate:** `npm run lint` must show no new errors
- **Code review:** Scrutiny validator reviews each feature for correctness
- **Flow validation:** User-testing flow validators inspect assigned files for the expected implementation patterns and record concrete file evidence
- **Shared heavy checks:** The parent validator runs build/lint once and reuses those results across all flow reports

### Client-Side Data Fetching Milestone Notes

- `VAL-CLIENT-001`: inspect the targeted `scroll`, `resize`, and `touch` listeners to confirm `{ passive: true }` is present where `preventDefault()` is not used
- `VAL-CLIENT-002`: inspect the versioned localStorage reads to confirm they validate stored data and migrate valid legacy keys before deleting the old key
- `VAL-CLIENT-003`: inspect `useSharedResize` and its consumers to confirm the resize listener is centralized behind one module-level subscription set

## Validation Concurrency

### terminal-validation

- **Max concurrent validators:** 2
- **Resource cost:** Low for read-only file inspection; medium if multiple validators also run build/lint, so heavy validators stay centralized in the parent validator
- **Isolation:** Validators must stay read-only and limit themselves to their assigned files/assertions

## Flow Validator Guidance: terminal-validation

- Treat the repository as **read-only**. Do not edit files, create commits, or run autofix commands.
- Inspect only the files relevant to your assigned assertions and cite concrete `file:line` evidence for the parallelized operations.
- For client-side-data-fetching assertions, prefer concrete evidence from the listener registrations, versioned localStorage migration branches, and the shared resize hook plus its subscribed call sites.
- Do **not** run `npm run build` or `npm run lint` unless the parent validator explicitly assigns that work; those shared checks are centralized to avoid redundant heavy work.
- Report each assigned assertion as `pass`, `fail`, or `blocked` with a short reason grounded in the observed code.
