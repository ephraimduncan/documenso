# Architecture

## Color System Layers

1. **CSS Variables** (`packages/ui/styles/theme.css`) — defines semantic tokens for light (`:root`) and dark (`.dark`) modes
2. **Tailwind Config** (`packages/tailwind-config/index.cjs`) — maps CSS variables to Tailwind utility classes, also defines brand palettes (`documenso`, `dawn`, `water`)
3. **UI Package** (`packages/ui/tailwind.config.cjs`) — extends base config, safelists dynamic recipient classes
4. **App** (`apps/remix/tailwind.config.ts`) — extends UI config

## Key Semantic Tokens

- `background` / `foreground` — page-level bg/text
- `muted` / `muted-foreground` — secondary surfaces and dimmed text
- `card` / `card-foreground` — card surfaces
- `widget` / `widget-foreground` — widget surfaces (slightly different from card)
- `primary` / `primary-foreground` — primary action color (maps to documenso green)
- `secondary` / `secondary-foreground` — secondary surfaces
- `accent` / `accent-foreground` — accent/hover surfaces
- `border` / `input` — border and input border colors
- `destructive` / `destructive-foreground` — error/danger
- `ring` — focus ring color

## Dark Mode

- Uses variant selector: `&:is(.dark:not(.dark-mode-disabled) *)`
- `.dark-mode-disabled` class opts out of dark mode (used on field overlays)

## Recipient Colors

- Dynamic system in `packages/ui/lib/recipient-colors.ts`
- Generates Tailwind classes dynamically via CSS variables (`--recipient-green`, etc.)
- Safelisted via `RECIPIENT_DYNAMIC_CLASS` pattern in tailwind config
- **DO NOT MODIFY**
