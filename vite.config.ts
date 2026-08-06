import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	plugins: [
		// The router plugin generates the route tree, and must run before React.
		tanstackRouter({
			target: 'react',
			routesDirectory: './src/client/routes',
			generatedRouteTree: './src/client/routeTree.gen.ts',
			autoCodeSplitting: true,
		}),
		react(),
		// Runs the Worker in workerd beside the client, so `pnpm dev` serves both.
		cloudflare({
			// Workers AI is remote-only, and remote bindings open a proxy session at
			// startup that demands an API token — so leaving them off is what lets a
			// fresh clone run `pnpm dev`. Set CF_REMOTE_BINDINGS=true to call a model.
			remoteBindings: process.env.CF_REMOTE_BINDINGS === 'true',
		}),
	],
})
