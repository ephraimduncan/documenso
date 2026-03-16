# User Testing

## Validation Surface

This mission involves only CSS class string replacements. There is no runtime behavioral change to test through a browser or API.

**Primary validation surface:** Code inspection (verify correct classes via grep/rg)
**Secondary validation surface:** Lint + typecheck (verify no compilation errors)
**Surface ID:** `code-inspection-shell`

## Validation Concurrency

### code-inspection-shell

- Max concurrent validators: 4
- Resource cost: low
- Rationale: validators only perform read-only code inspection (`Read`, `Grep`, `rg`, `git diff`) against the existing worktree. On this 16 GB machine, four concurrent validators keeps file-system contention low while avoiding redundant setup.
- Shared-validator rule: run shared lint/typecheck commands once from the coordinator, not from each flow validator.

## Flow Validator Guidance: code-inspection-shell

- Stay read-only inside the repository except for writing the assigned flow report and any evidence notes.
- Do not start app services, dev servers, browsers, or seed data; this milestone has no runtime user surface.
- Validate assertions with exact class-presence/class-absence checks using `Read`, `Grep`, and targeted `rg` commands.
- Treat an assertion as passed only when the expected semantic token is present and the replaced raw class is absent in the scoped files.
- Use `git diff --name-only` or targeted diff inspection when needed to confirm preserved off-limits files were not touched.
- If you discover validator friction or missing guidance, record it in the flow report so the coordinator can update this file.

## Notes

- Visual verification of dark mode rendering would require a running app and is outside this mission's scope
- All changes are direct class-for-class replacements with no logic changes
- When running shell-based checks against Remix route files, always quote paths containing `$teamUrl`, `$id`, or `$token` so the shell does not expand route parameters.
- Treat validation-contract examples of out-of-scope matches as illustrative only; prefer the contract's targeted file list plus repo-wide grep to verify that remaining matches are genuinely out of scope.
- As of 2026-03-16, `npx turbo run lint` still fails because of four pre-existing `@typescript-eslint/require-await` errors in `packages/lib/server-only/envelope-item/update-envelope-items.ts`, `packages/lib/server-only/team/create-team.ts`, `packages/lib/server-only/user/delete-user.ts`, and `packages/lib/server-only/webhooks/get-all-webhooks-by-event-trigger.ts`.
- As of 2026-03-16, `npx tsc --noEmit -p packages/ui/tsconfig.json` still fails because Prisma/generated types are missing (for example missing `@prisma/client` exports and `@documenso/prisma/generated/zod` modules), so cross-assertions that require a clean package-wide typecheck should be treated as blocked until that baseline is repaired.
