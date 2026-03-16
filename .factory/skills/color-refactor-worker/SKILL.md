---
name: color-refactor-worker
description: Performs mechanical Tailwind CSS class replacements for color standardization
---

# Color Refactor Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

For features that require mechanical Tailwind CSS class string replacements — swapping raw palette colors for semantic tokens, removing dark-mode opacity hacks, or normalizing class patterns.

## Work Procedure

1. **Read the feature description carefully.** It contains the EXACT file paths, line numbers, current class strings, and replacement class strings. Follow them precisely.

2. **For each file in the feature:**
   a. Read the file to confirm the current classes match what's described. Line numbers may have shifted slightly — search for the exact class string if the line number doesn't match.
   b. Make the specified replacement using the Edit tool. Use enough surrounding context to ensure a unique match.
   c. After editing, read the changed area to verify the replacement is correct.

3. **Verify no unintended changes:**
   - Run `git diff` and review every changed line. Only the specified class strings should be different.
   - If you see any change you didn't intend, revert it.

4. **Run verification steps** from the feature description:
   - Run each `rg` command to verify old classes are gone and new classes are present.
   - If the feature includes lint/typecheck commands, run them.

5. **Do NOT:**
   - Change any file not listed in the feature description.
   - Modify component logic, props, types, imports, or anything other than the className string.
   - Change any Tailwind class that is not specifically called out.
   - Touch files listed in AGENTS.md under "DO NOT TOUCH".

6. **Commit the changes** with a descriptive message like: `style: replace raw gray/neutral with semantic tokens in shared primitives`

## Example Handoff

```json
{
  "salientSummary": "Replaced `text-gray-500 dark:text-gray-100` with `text-muted-foreground` in select.tsx and multi-select-combobox.tsx, replaced `bg-gray-300 dark:bg-neutral-700` with `bg-muted-foreground/30` in multi-select-combobox.tsx, replaced `bg-gray-50 dark:bg-neutral-900/20` with `bg-muted dark:bg-muted/20` in alert.tsx neutral variant, replaced `bg-neutral-50` with `bg-muted` in signature-pad.tsx (3 instances). All rg verification checks passed. Typecheck passed.",
  "whatWasImplemented": "Replaced raw gray/neutral Tailwind classes with semantic tokens in 4 shared UI primitive files: select.tsx (1 change), multi-select-combobox.tsx (2 changes), alert.tsx (1 change, neutral variant only), signature-pad.tsx (3 changes).",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "rg 'text-gray-500' packages/ui/primitives/select.tsx", "exitCode": 1, "observation": "0 matches — old class removed" },
      { "command": "rg 'text-muted-foreground' packages/ui/primitives/select.tsx", "exitCode": 0, "observation": "1 match at spinner line — new class present" },
      { "command": "rg 'bg-gray-300' packages/ui/primitives/multi-select-combobox.tsx", "exitCode": 1, "observation": "0 matches — old class removed" },
      { "command": "rg 'bg-gray-50' packages/ui/primitives/alert.tsx", "exitCode": 1, "observation": "0 matches — old class removed from neutral variant" },
      { "command": "rg 'bg-neutral-50' packages/ui/primitives/signature-pad/signature-pad.tsx", "exitCode": 1, "observation": "0 matches — all 3 instances replaced" },
      { "command": "npx tsc --noEmit -p packages/ui/tsconfig.json", "exitCode": 0, "observation": "Typecheck passed" },
      { "command": "git diff --stat", "exitCode": 0, "observation": "4 files changed — only the specified files" }
    ],
    "interactiveChecks": []
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- A file path in the feature description doesn't exist or the expected class string is not found at the specified location
- The replacement creates a lint or typecheck error that can't be trivially resolved
- The git diff shows changes to files not listed in the feature description
- An off-limits file would need to be changed
