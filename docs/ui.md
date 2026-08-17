# User Interface & Design

This document is a sibling to [`architecture.md`](./architecture.md), a place to explain
decisions we make about the UI and design, as opposed to technical, cross-module
architectural decisions that go in the other doc.

## The screen we design for

Our target screen is 1298px wide. That is the starting value for the `lg` breakpoint, and
wherever possible we configure Storybook to use this width.

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
