# User Testing

**What belongs here:** Testing surface, validation approach, resource cost classification.

---

## Validation Surface

This is a pure refactoring mission. There is no browser or TUI flow to exercise, so validation for this milestone uses terminal-based inspection of the changed code paths plus shared build/lint gates.

## Validation Approach

- **Primary gate:** `npm run build` must pass
- **Secondary gate:** `npm run lint` must show no new errors
- **Code review:** Scrutiny validator reviews each feature for correctness
- **Flow validation:** User-testing flow validators inspect assigned files for the expected `Promise.all`/parallelization patterns and record concrete file evidence
- **Shared heavy checks:** The parent validator runs build/lint once and reuses those results across all flow reports

## Validation Concurrency

### terminal-validation

- **Max concurrent validators:** 2
- **Resource cost:** Low for read-only file inspection; medium if multiple validators also run build/lint, so heavy validators stay centralized in the parent validator
- **Isolation:** Validators must stay read-only and limit themselves to their assigned files/assertions

## Flow Validator Guidance: terminal-validation

- Treat the repository as **read-only**. Do not edit files, create commits, or run autofix commands.
- Inspect only the files relevant to your assigned assertions and cite concrete `file:line` evidence for the parallelized operations.
- Do **not** run `npm run build` or `npm run lint` unless the parent validator explicitly assigns that work; those shared checks are centralized to avoid redundant heavy work.
- Report each assigned assertion as `pass`, `fail`, or `blocked` with a short reason grounded in the observed code.
