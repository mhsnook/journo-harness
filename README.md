# Journo Harness

An AI harness so you can have your own Clippy so good that even you want to use it 🖇️

The writer writes the prose and an AI acts as a guide. The architecture is in
[`docs/architecture.md`](./docs/architecture.md), and the words it uses are fixed in
[`context.md`](./context.md).

## Running it

Node 22 and pnpm 10. The repo is one pnpm workspace: the app at the root, and the component
showcase in [`ui/`](./ui).

```sh
pnpm install
pnpm dev        # the client and the Worker together, on http://localhost:5173
pnpm test       # builds the client, then runs the smoke tests in workerd
pnpm typecheck
```

`pnpm dev` runs the Worker in workerd through the Cloudflare Vite plugin, so the bindings
behave as they do in production. Storybook runs separately with
`pnpm --filter journo-harness-ui dev`.

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

The Worker needs the Workers Paid plan for the model, and Cloudflare Access gates it at the
edge. Nothing in the app reads the `Cf-Access-Jwt-Assertion` header — localhost has no
Access gate, and requiring the header would make the app unrunnable in development.

## Layout

| Path | What it holds |
| --- | --- |
| `src/client/` | React, Vite, and TanStack Router. Routes are files under `src/client/routes/` |
| `src/server/` | The Hono Worker entry and the `ArticleAgent` Durable Object |
| `test/` | Tests running in workerd through `@cloudflare/vitest-pool-workers` |
| `ui/` | The component library and its Storybook showcase |
| `docs/` | The architecture document and the ADRs |
