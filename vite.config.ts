import { cloudflare } from '@cloudflare/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import agents from 'agents/vite'
import { defineConfig } from 'vite'

// Storybook loads this same config, and it renders components without the app
// around them. The Worker and the router are left out there: the Cloudflare
// plugin would start workerd for a Worker no story calls, and the router plugin
// would rewrite the route tree from a process that has no routes in view.
//
// Storybook sets this variable itself, so nothing in this repo assigns it.
const forStorybook = process.env.STORYBOOK === 'true'

export default defineConfig({
	plugins: [
		// The router plugin generates the route tree, and must run before React.
		forStorybook
			? []
			: tanstackRouter({
					target: 'react',
					routesDirectory: './src/client/routes',
					generatedRouteTree: './src/client/routeTree.gen.ts',
					autoCodeSplitting: true,
				}),
		react(),
		tailwindcss(),
		// Cloudflare's workaround for `@callable` support in Vite 8.
		forStorybook ? [] : agents(),
		// Runs the Worker in workerd beside the client, so `pnpm dev` serves both.
		forStorybook
			? []
			: cloudflare({
					// Workers AI is remote-only, and remote bindings open a proxy session
					// at startup that demands an API token — so leaving them off is what
					// lets a fresh clone run `pnpm dev`. Set CF_REMOTE_BINDINGS=true to
					// call a model.
					remoteBindings: process.env.CF_REMOTE_BINDINGS === 'true',
				}),
	],
})
