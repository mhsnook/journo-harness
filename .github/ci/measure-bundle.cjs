'use strict'

// Measure a Vite build into a small JSON summary.
//
//   node measure-bundle.cjs dist /tmp/out/bundle.json
//
// This runs in the build job, next to the dist/ it reads. The report job then
// diffs two summaries, so it never needs either tree — which is what lets the
// head and base builds happen once each, in parallel, on separate runners.

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// Vite appends a content hash before the extension. Stripping it gives a stable
// key for the same logical chunk across two builds; the hashed filename is kept
// alongside, because an unchanged hash is what says a chunk is still cached.
const STRIP_HASH = /-[A-Za-z0-9_-]{8}(\.[a-z]+)$/

const sizeOf = (file) => {
	const buf = fs.readFileSync(file)
	return { raw: buf.length, gz: zlib.gzipSync(buf).length }
}

const add = (a, b) => ({ raw: a.raw + b.raw, gz: a.gz + b.gz })

/**
 * The client build, split by what a first paint actually pays for.
 *
 * `index.html` names the entry chunk and every modulepreload, and that set is
 * the eager cost. The route chunks TanStack Router code-splits out are counted
 * separately: a user may never fetch them, and folding them into one total
 * hides the number that matters.
 */
function measureClient(clientDir) {
	const indexPath = path.join(clientDir, 'index.html')
	if (!fs.existsSync(indexPath)) {
		throw new Error(`no index.html in ${clientDir}`)
	}
	const html = fs.readFileSync(indexPath, 'utf8')
	const referenced = new Set(
		[...html.matchAll(/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map((m) => m[0]),
	)

	const result = {
		js: { raw: 0, gz: 0 },
		css: { raw: 0, gz: 0 },
		entry: { raw: 0, gz: 0 },
		lazy: { raw: 0, gz: 0, count: 0 },
		eagerChunks: {},
	}

	const assetsDir = path.join(clientDir, 'assets')
	for (const name of fs.readdirSync(assetsDir).sort()) {
		if (!/\.(?:js|css)$/.test(name)) continue
		const size = sizeOf(path.join(assetsDir, name))

		if (!referenced.has(`assets/${name}`)) {
			// Lazy: reachable only once the router navigates there.
			if (name.endsWith('.js')) {
				result.lazy = { ...add(result.lazy, size), count: result.lazy.count + 1 }
			}
			continue
		}

		if (name.endsWith('.css')) {
			// Render-blocking on first paint, so part of the eager cost — but on
			// its own axis, because it moves when design changes, not logic.
			result.css = add(result.css, size)
			continue
		}
		result.js = add(result.js, size)
		result.eagerChunks[name.replace(STRIP_HASH, '$1')] = { file: name, ...size }
		if (/^index[-.]/.test(name)) result.entry = size
	}
	return result
}

/**
 * The Worker bundle, which Cloudflare size-limits on upload.
 *
 * The directory is named after `name` in wrangler.jsonc, so it is found by
 * elimination rather than hardcoded — renaming the Worker must not silently
 * stop the measurement.
 */
function measureWorker(dist) {
	const dir = fs
		.readdirSync(dist, { withFileTypes: true })
		.filter((e) => e.isDirectory() && e.name !== 'client')
		.map((e) => path.join(dist, e.name))
		.find((d) => fs.existsSync(path.join(d, 'index.js')))

	if (!dir) return null

	let total = { raw: 0, gz: 0 }
	const walk = (d) => {
		for (const e of fs.readdirSync(d, { withFileTypes: true })) {
			const full = path.join(d, e.name)
			if (e.isDirectory()) walk(full)
			else if (e.name.endsWith('.js')) total = add(total, sizeOf(full))
		}
	}
	walk(dir)
	return { name: path.basename(dir), ...total }
}

function measure(dist) {
	return { client: measureClient(path.join(dist, 'client')), worker: measureWorker(dist) }
}

module.exports = { measure, measureClient, measureWorker }

if (require.main === module) {
	const [dist, out] = process.argv.slice(2)
	if (!dist || !out) {
		console.error('usage: measure-bundle.cjs <dist-dir> <output.json>')
		process.exit(2)
	}
	const result = measure(dist)
	fs.mkdirSync(path.dirname(out), { recursive: true })
	fs.writeFileSync(out, JSON.stringify(result, null, 2))

	const kB = (n) => (n / 1024).toFixed(2)
	const c = result.client
	console.log(
		`${dist}: eager ${kB(c.js.gz)} kB JS + ${kB(c.css.gz)} kB CSS, ` +
			`${c.lazy.count} lazy chunk(s) ${kB(c.lazy.gz)} kB, ` +
			`worker ${result.worker ? kB(result.worker.gz) + ' kB' : 'not found'} (gzipped)`,
	)
}
