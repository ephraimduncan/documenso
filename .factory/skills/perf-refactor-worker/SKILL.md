---
name: perf-refactor-worker
description: Applies targeted performance refactoring changes following Vercel React Best Practices
---

# Performance Refactoring Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

Use for features that refactor existing code to follow Vercel React Best Practices. Changes must be behavior-preserving -- no new features, only performance and code quality improvements.

## Work Procedure

### 1. Understand the Change

Read the feature description carefully. It specifies:
- Which files to modify
- What pattern to apply (Promise.all, dynamic import, TTL cache, etc.)
- What the expected behavior is

Read AGENTS.md for caching patterns, fire-and-forget patterns, and constraints.

### 2. Locate All Affected Files

Use Grep and Glob to find ALL instances of the pattern that needs changing. The feature description gives approximate counts -- verify the actual count. Do not miss any instances.

### 3. Read Each File Before Editing

For EVERY file you will modify:
- Read the file first to understand the surrounding context
- Identify the exact lines to change
- Understand any dependencies or edge cases

### 4. Apply Changes

Make the refactoring changes. For each file:
- Preserve existing behavior exactly
- Match the surrounding code style
- Add minimal comments only where the pattern might be unclear to future readers
- Do NOT change unrelated code

### 5. Verify

Run the build to confirm no regressions:
```bash
cd /Users/duncan/dev/documenso-wt-main-wt && npm run build
```

If the build fails:
- Read the error output carefully
- Fix the issue (likely a type error or import path problem)
- Re-run the build

Run lint to check for new lint errors:
```bash
cd /Users/duncan/dev/documenso-wt-main-wt && npm run lint
```

Note: 4 pre-existing lint errors in `@documenso/lib` are expected. Only worry about NEW errors.

### 6. Commit

Commit the changes with a descriptive message following the repo's conventional commit format:
```
perf: [brief description of the optimization]
```

## Example Handoff

```json
{
  "salientSummary": "Parallelized 3 independent awaits in createEnvelope using Promise.all (team+settings fetch, docMeta+incrementId+delegatedOwner). Build passes, lint clean.",
  "whatWasImplemented": "Wrapped independent sequential awaits in createEnvelope with Promise.all. First group: team fetch + getTeamSettings. Second group: documentMeta.create + incrementDocumentId + getValidatedDelegatedOwner. Verified dependency chain is correct -- team.id is needed by getTeamSettings so those stay serial, but the other 3 are fully independent.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      {
        "command": "cd /Users/duncan/dev/documenso-wt-main-wt && npm run build",
        "exitCode": 0,
        "observation": "Build completed successfully, all packages built"
      },
      {
        "command": "cd /Users/duncan/dev/documenso-wt-main-wt && npm run lint",
        "exitCode": 1,
        "observation": "Only pre-existing 4 errors in @documenso/lib, no new errors"
      }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": []
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A file mentioned in the feature description doesn't exist or has been significantly restructured
- The dependency chain between awaits is unclear -- you're not sure if operations are truly independent
- The build fails with errors you can't resolve after 2 attempts
- You discover the pattern described doesn't match reality in the code
- The change would require modifying API contracts or database schema (violates mission boundaries)
