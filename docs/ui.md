# User Interface & Design

This document is a sibling to [`architecture.md`](./architecture.md), a place to explain
decisions we make about the UI and design, as opposed to technical, cross-module
architectural decisions that go in the other doc.

## The screen we design for

**The target screen is a 1298px-wide window.** That is the width a layout is judged at, and
the width a screenshot should be taken at. Where two layouts are both defensible, the one
that reads better at 1298px wins.

The number is `--breakpoint-lg` in `src/client/styles/theme.css`, so a `lg:` utility is one
the target screen gets and a `md:` utility is one it has had for a while. There are two
breakpoints and no more: `md` at 48rem and `lg` at 1298px.

Everything narrower still has to work — `usePanels` collapses the four Panels to tabs under
56rem, and the Board View scrolls its columns sideways rather than shrinking them — but a
design is tuned against 1298px rather than against the narrow end.

## The UI showcase

We are generally a very "Storybook First" project, so every wireframe and component is
built with real components but mock data.

Mostly our design "rules" can be found in the storybook files themselves, so the easiest
way to get a look at them is to run Storybook and click through the first section. e.g.
the accent rule is in `src/client/foundations/Accent.mdx`.

```bash
pnpm storybook        # http://localhost:6006
```

Screens keep their number when the route that replaces it lands and its name
changes to `context.md`'s word: e.g. the deck's "Desk" is now the "Articles Area". Screens are
superseded as those routes arrive, so none is worth preserving out of politeness, and a
wired one renders the live component against mock data rather than a copy of it. The
components live in the app rather than in a package of their own, which is what lets
Tailwind scan them with no configuration.
