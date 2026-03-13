# Architecture

**What belongs here:** Architectural decisions, patterns, codebase structure.

---

## Codebase Structure

- **Monorepo** using npm workspaces + Turborepo
- **Main app:** `apps/remix/` — Remix-based React 18 SPA
- **Packages:**
  - `packages/lib/` — shared server + client utilities
  - `packages/trpc/` — tRPC router definitions
  - `packages/ui/` — shared UI components (Shadcn, Radix, Tailwind)
  - `packages/prisma/` — Prisma schema + client
  - `packages/auth/` — authentication
  - `packages/ee/` — enterprise features
  - `packages/email/` — email templates
  - `packages/signing/` — document signing logic

## Key Patterns

- **Routing:** Remix file-based routing with flat routes (`_authenticated+/`, `_recipient+/`)
- **Data fetching:** Remix loaders (server-side) + tRPC (client-side via React Query)
- **State:** React Query for server state, React hooks for local state
- **UI:** Shadcn UI + Radix + Tailwind CSS + Lucide icons + framer-motion for animations
- **Auth:** Custom session-based auth in `packages/auth/`
- **V1 vs V2:** Some features have V1 (document-based) and V2 (envelope-based) paths
