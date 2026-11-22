# Design direction: "ink + volt on paper"

Status: applied to every screen on 22 Nov 2026; styling only.

The design brief. The app should feel like a premium fitness product (think cult.fit, Whoop, Nike
Training): confident, athletic, warm. Not a medical form, and not a default "teal on white" template.

## Principles

1. **Big type, big numbers.** Headlines and stats use the display font (`.h-display`, `.stat-num`). One hero number per
   screen (123°, 2/3, week 10). Supporting text stays small and quiet.
2. **Ink and volt.** Dark ink (`bg-ink`, `text-ink`) for primary actions and hero blocks. Volt lime (`bg-volt`) is the
   single accent: use it sparingly, for the one thing to look at (a key stat, the "you are here" marker, the primary
   action on a dark block). Page background is warm paper (`bg-paper`, set on body).
3. **Soft surfaces, no grey borders.** Cards are `.card` (white, 24px radius, soft shadow). Dark hero blocks are
   `.card-dark`. Remove `border border-stone-200` and `shadow-sm` wherever `.card` replaces them.
4. **Pill buttons.** `.btn .btn-primary` (ink), `.btn .btn-accent` (volt on dark blocks), `.btn .btn-secondary`
   (outlined), `.btn .btn-quiet` (small white pills such as sample buttons), `.btn .btn-whatsapp`.
5. **Meaning keeps its colour.** Severity and safety colours stay semantic: `.chip-good` (0/3), `.chip-mild` (1/3),
   `.chip-warn` (2/3), `.chip-bad` (3/3). The warning-sign screen stays calm; amber marks the emergency note. Amber stays for "re-record" and
   "yesterday" notes. Never use volt for a warning.
6. **Rhythm.** Mobile column `max-w-md`, 16px side padding, 16–20px between cards, generous padding inside cards.
   Eyebrow labels (`.eyebrow text-mute`) above headlines instead of grey sub-headings.

## Tokens and classes (defined in `app/globals.css`)

Colours as Tailwind utilities: `ink`, `ink-soft`, `ink-line`, `paper`, `volt`, `volt-deep`, `coral`, `mute`
(e.g. `bg-ink`, `text-volt`, `text-mute`, `border-ink-line`).
Classes: `.h-display`, `.eyebrow`, `.stat-num`, `.card`, `.card-dark`, `.card-volt`, `.card-ghost`, `.btn` +
`.btn-primary | .btn-accent | .btn-secondary | .btn-quiet | .btn-whatsapp`, `.chip` + `.chip-good | .chip-mild |
.chip-warn | .chip-bad | .chip-ink | .chip-volt`, `.link`, `.backlink`, `.field`, `.note`.

## Replace on every screen

| Old | New |
|---|---|
| `text-teal-700` links / `underline` | `.link` (or `.backlink` for "← Home" style links) |
| `bg-teal-700 ... text-white` primary buttons | `.btn .btn-primary` |
| `border-2 border-teal-700 ... text-teal-800` buttons | `.btn .btn-secondary` |
| small white bordered buttons | `.btn .btn-quiet` |
| `rounded-2xl border border-stone-200 bg-white p-4 shadow-sm` | `.card` |
| page titles `text-2xl font-semibold` | `.h-display text-3xl` (with an `.eyebrow text-mute` label above where it helps) |
| `text-stone-500/600` helper text | `text-mute` |
| inputs / textarea | `.field` |
| severity pills | `.chip` + semantic chip class |
| any other `teal-*` | ink or volt per the principles (no teal left anywhere) |

## Hard rules for whoever applies this

- **Styling only.** Change `className` values and wrap/reorder purely presentational elements. Do not change text
  labels, hrefs, handlers, state, refs, ids, conditions or props. Evals and the stage script depend on exact labels.
- Keep every tap target at least 44px tall. Keep contrast AA (ink on volt is fine; never white on volt, never volt
  text on white).
- No new dependencies, no images, no gradients-as-decoration, no emoji changes.
- After editing: `npx tsc --noEmit`, `npm run lint`, `BASE=http://localhost:3005 evals/run.sh` must all pass.
