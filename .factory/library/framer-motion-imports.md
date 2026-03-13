# framer-motion Import Strategy

## Finding: Subpath Imports Not Viable (v12.23.24)

Investigated converting `from 'framer-motion'` barrel imports to subpath imports for bundle size reduction.

### Available Subpaths
- `framer-motion/dom` — DOM animation utilities only (no React components or hooks)
- `framer-motion/client` — HTML element motion factories (`div`, `span`, etc.) but NOT `motion`, `AnimatePresence`, or hooks
- `framer-motion/m` — Optimized `m` component (lighter than `motion`, but different feature set — no layout animations)
- `framer-motion/mini` — Only exports `useAnimate`
- `framer-motion/dom/mini` — Only exports `animate` and `animateSequence`

### What This Codebase Uses
All 32 files import `motion`, `AnimatePresence`, `useMotionValue`, `useMotionTemplate`, `useTransform`, or `Variants` — **none of which are available from any subpath**.

### Tree-Shaking Already Works
- `framer-motion` declares `"sideEffects": false` in package.json
- Vite (used by Remix) properly tree-shakes unused exports
- Build output confirms: framer-motion code is bundled into a shared chunk (~112KB) containing only the used exports
- No separate "full barrel" chunk exists — only used code is included

### Conclusion
The barrel import `from 'framer-motion'` is the only viable import path for the React components and hooks this codebase needs. Tree-shaking is effective, so there's no bundle size penalty from using the barrel.
