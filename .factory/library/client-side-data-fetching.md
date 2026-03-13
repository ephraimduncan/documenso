# Client-Side Data Fetching Patterns

## Versioned localStorage reads should migrate legacy keys

- When adding a version prefix to browser storage keys, read the new key first and validate the parsed value before use.
- If the versioned key is missing, read the legacy unversioned key once, validate it, and migrate the usable value forward before deleting the old key.
- Current examples in this repo:
  - `apps/remix/app/components/general/verify-email-banner.tsx` persists a timestamp string for the email-verification dialog cooldown.
  - `packages/ui/primitives/document-flow/field-item-advanced-settings.tsx` persists field-meta drafts.

## Use the concrete field-meta schema for persisted field-meta objects

- `packages/lib/types/field-meta.ts` exports `ZFieldMetaNotOptionalSchema` and `TFieldMetaNotOptionalSchema` for values that must be a real field-meta object.
- `ZFieldMetaSchema` is broader: it also accepts `{}` and `undefined`, so it is not a good fit when reading persisted drafts that should contain actual field metadata.

## Shared browser listener hooks can use module-level singleton state

- `packages/lib/client-only/hooks/use-shared-resize.ts` uses a module-level `Set` of subscribers plus an `isListening` flag to keep exactly one global resize listener active for all subscribers.
- This pattern is now used for field and tooltip coordinate updates.
- Remaining direct resize listeners are intentionally separate because they solve different problems:
  - `apps/remix/app/components/general/virtual-list/use-virtual-list.ts` updates viewport height for virtual scrolling.
  - `apps/remix/app/components/embed/authoring/configure-fields-view.tsx` tracks the mobile breakpoint.
  - `packages/ui/primitives/signature-pad/canvas.ts` resizes the signature-pad canvas.
