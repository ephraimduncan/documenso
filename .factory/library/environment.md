# Environment

**What belongs here:** Required env vars, external dependencies, setup notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

- Node.js project with npm workspaces
- `turbo` is NOT installed globally — always use `npx turbo` to run turbo commands
- The repo declares `turbo@^1.13.4` but npx may install a newer version — this is a known pre-existing mismatch, ignore the warning
- TypeScript is available via `npx tsc`
- No database or external services needed for this mission (CSS class changes only)
