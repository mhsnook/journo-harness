# Journo Harness

An AI harness so you can have your own Clippy so good that even you want to use it 🖇️

The writer writes the prose and an AI acts as a guide. The architecture is in
[`docs/architecture.md`](./docs/architecture.md), and the words it uses are fixed in
[`context.md`](./context.md).

## Running it

Node 22 and pnpm 11.

```sh
pnpm install
pnpm dev        # the client and the Worker together, on http://localhost:5173
pnpm storybook  # the components and screens on their own, on http://localhost:6006
pnpm test       # builds the client, then runs the smoke tests in workerd
pnpm typecheck
pnpm lint       # oxlint
pnpm format     # oxfmt, in place. `pnpm format:check` reports instead
```

`pnpm dev` runs the Worker in workerd through the Cloudflare Vite plugin, so the bindings
behave as they do in production. Storybook loads the same Vite config without the Worker or
the router, so a story renders components alone.

### Calling a model locally

Workers AI has no local simulator, so the `AI` binding always reaches Cloudflare. `pnpm dev`
leaves remote bindings off, which is what lets a fresh clone start with no Cloudflare login.
To make a real model call, log in and turn them on:

```sh
pnpm wrangler login
CF_REMOTE_BINDINGS=true pnpm dev
```

### Deploying

```sh
pnpm deploy     # builds the client, then wrangler deploy
```

`AI_GATEWAY_ID` names the AI Gateway the model calls log through. Set it from the CLI rather
than in `wrangler.jsonc`, because a var declared there overwrites the deployed value on every
deploy:

```sh
pnpm wrangler secret put AI_GATEWAY_ID
```

Leaving it unset attaches no Gateway, which is what a deployment without one wants — a
Gateway that does not exist fails the call. Leave the Gateway itself **unauthenticated**: a
Workers AI binding call is same-account and carries no place to put a Gateway token.

The Worker needs the Workers Paid plan for the model, and Cloudflare Access gates it at the
edge. Nothing in the app reads the `Cf-Access-Jwt-Assertion` header — localhost has no
Access gate, and requiring the header would make the app unrunnable in development.

## Layout

| Path                          | What it holds                                                         |
| ----------------------------- | --------------------------------------------------------------------- |
| `src/client/routes/`          | TanStack Router routes, one file each                                 |
| `src/client/components/`      | The primitives: `Frame`, `PaneRail`, `Chip`, `SourceCard`, …          |
| `src/client/screens/`         | The wireframed screens, built against mock data                       |
| `src/client/styles/theme.css` | The Tailwind v4 `@theme` tokens                                       |
| `src/server/`                 | The Hono Worker entry and the `ArticleAgent` Durable Object           |
| `src/server/llm/`             | The model boundary, the Chat turn's prompt pack, and the tools        |
| `test/`                       | Tests running in workerd through `@cloudflare/vitest-pool-workers`    |
| `docs/`                       | The architecture document, the ADRs, and [the UI notes](./docs/ui.md) |

The screens are wireframes with nothing wired to them. They are superseded one at a time as
the routes that replace them land, so treat them as reference rather than as a library.
