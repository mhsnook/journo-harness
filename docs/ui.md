# The UI showcase

Every screen from the `Joarness WF` wireframes is built as real components against mock
data, so the interface can be reviewed and argued with before it is wired up.

```bash
pnpm storybook        # http://localhost:6006
```

The components live in the app rather than in a package of their own, so a route imports
one directly and Tailwind scans it with no configuration. The screens are superseded as the
routes that replace them land.

## What's in here

| Path | |
|---|---|
| `src/client/styles/theme.css` | Tailwind v4 `@theme` tokens — the whole palette and type scale |
| `src/client/components/` | Primitives: `Frame`, `PaneRail`, `Chip`, `CoachNote`, `SourceCard`, `LengthBar`, … |
| `src/client/screens/` | The 21 screens, grouped global / article / review / finish |
| `src/client/mock/content.ts` | Sample content. Nothing is wired; swap for API data |
| `src/client/foundations/Accent.mdx` | The accent rule, written down |

Storybook is organised as **Foundations → Primitives → Screens**, and the screen
stories are numbered to match the wireframe deck: `1(a) Desk`, `2(e) The plan on
its own`, `4(c) Notes sent to chat`, and so on.

## The one design rule worth knowing

The page is paper, ink and three greys. There is exactly one colour —
`--color-accent`, `#ffe6a3` — and it marks the single thing on a screen that
wants a decision, or the one thing that has just changed. Selected tabs, open
panes and progress bars are *not* that: they take ink, because where you are is
state rather than a request. Some screens have no accent at all, on purpose.

`src/client/foundations/Accent.mdx` has the full version, with what earns it and what
doesn't.

## Fidelity notes

Everything is faithful to the wireframes' structure and behaviour; the lo-fi
styling (hand-drawn font, grey placeholder bars) is deliberately gone, replaced
with real type, real copy and real spacing.

Two things to settle before this becomes the app proper:

- **Naming.** These screens use the wireframes' vocabulary — *plan*, *voices*,
  *adjectives*, *favourite sources*. `context.md` fixes the words the code and
  the UI both use. Rename against it; that is cheap now and expensive later.
- **Interaction.** Screens are static compositions. Only `PaneRail` takes an
  `onToggle`; nothing else holds state, and no data flows between panes yet.
