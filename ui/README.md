# Journo Harness — UI showcase

A Vite 8 + React 19 component library for the writing harness, with Storybook as
its only entry point. Every screen from the `Joarness WF` wireframes is built
here as real components against mock data, so the interface can be reviewed,
argued with, and eventually wired to the back end.

```bash
cd ui
npm install
npm run storybook     # http://localhost:6006
```

Other scripts: `npm run typecheck`, `npm run build-storybook`, `npm run build`
(the last builds `src/index.ts` as a library so the screens can be imported into
the real app later).

## What's in here

| Path | |
|---|---|
| `src/styles/theme.css` | Tailwind v4 `@theme` tokens — the whole palette and type scale |
| `src/components/` | Primitives: `Frame`, `PaneRail`, `Chip`, `CoachNote`, `SourceCard`, `LengthBar`, … |
| `src/screens/` | The 21 screens, grouped global / article / review / finish |
| `src/mock/content.ts` | Sample content. Nothing is wired; swap for API data |
| `src/foundations/Accent.mdx` | The accent rule, written down |

Storybook is organised as **Foundations → Primitives → Screens**, and the screen
stories are numbered to match the wireframe deck: `1(a) Desk`, `2(e) The plan on
its own`, `4(c) Notes sent to chat`, and so on.

## The one design rule worth knowing

The page is paper, ink and three greys. There is exactly one colour —
`--color-accent`, `#ffe6a3` — and it marks the single thing on a screen that
wants a decision, or the one thing that has just changed. Selected tabs, open
panes and progress bars are *not* that: they take ink, because where you are is
state rather than a request. Some screens have no accent at all, on purpose.

`src/foundations/Accent.mdx` has the full version, with what earns it and what
doesn't.

## Fidelity notes

Everything is faithful to the wireframes' structure and behaviour; the lo-fi
styling (hand-drawn font, grey placeholder bars) is deliberately gone, replaced
with real type, real copy and real spacing.

Two things to settle before this becomes the app proper:

- **Naming.** These screens use the wireframes' vocabulary — *plan*, *voices*,
  *adjectives*, *favourite sources*. `docs/ux-outline.md` uses *Brief*,
  *Lexicon*, *rules*, *skills*, *samples*. They describe the same objects. A
  rename is cheap now and expensive later.
- **Interaction.** Screens are static compositions. Only `PaneRail` takes an
  `onToggle`; nothing else holds state, and no data flows between panes yet.
