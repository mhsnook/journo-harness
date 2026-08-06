# The UI showcase

Every screen from the `Joarness WF` wireframes is built as real components against mock
data, so the interface can be reviewed and argued with before it is wired up.

```bash
pnpm storybook        # http://localhost:6006
```

The stories are numbered to match the wireframe deck — `1(a) Desk`, `2(e) The plan on its
own`, `4(c) Notes sent to chat` — so a screen can be found from the deck and the other way
round. Screens are superseded as the routes that replace them land, so none is worth
preserving out of politeness. The components live in the app rather than in a package of
their own, which is what lets Tailwind scan them with no configuration.

The design rules live in Storybook, where they render against the components they govern:
the accent rule is in `src/client/foundations/Accent.mdx`.
