'use strict'

// Measure a built output directory into a small JSON summary.
//
//   node measure-bundle.cjs dist /tmp/out/bundle.json
//
// This runs in the build job, next to the dist/ it reads. The report job then
// diffs two summaries, so it never needs either tree — which is what lets the
// head and base builds happen once each, in parallel, on separate runners.

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// CONFIGURE: how a chunk is recognised as third-party, and how to strip the
// content hash so the same logical chunk is comparable across two builds.
const VENDOR_PATTERN = /-vendor-|[/\\]vendor[-.]/
const STRIP_HASH = /-[A-Za-z0-9_-]{8}(\.[a-z]+)$/

/**
 * Measure the eager-load set: everything index.html references directly, which
 * is what a first paint must download. Lazy chunks are excluded on purpose —
 * they are the part of the bundle a user may never fetch, and folding them
 * into one total hides the number that matters.
 *
 * CONFIGURE: for a non-HTML entry point (a library, a server bundle), replace
 * the file-collection step with a walk over the output directory.
 */
function measure(dist) {
	const indexPath = path.join(dist, 'index.html')
	if (!fs.existsSync(indexPath)) {
		throw new Error(`no index.html in ${dist} — adapt measure() to this project's output`)
	}
	const html = fs.readFileSync(indexPath, 'utf8')
	const files = [
		...new Set([...html.matchAll(/assets\/[A-Za-z0-9._-]+\.(?:js|css)/g)].map((m) => m[0])),
	]

	const result = {
		js: { raw: 0, gz: 0 },
		css: { raw: 0, gz: 0 },
		entry: { raw: 0, gz: 0 },
		vendors: {},
	}

	for (const rel of files) {
		const buf = fs.readFileSync(path.join(dist, rel))
		const raw = buf.length
		const gz = zlib.gzipSync(buf).length
		const name = rel.slice(rel.lastIndexOf('/') + 1)

		if (name.endsWith('.css')) {
			// Render-blocking on first paint, so part of the eager cost — but on
			// its own axis, because it moves when design changes, not logic.
			result.css.raw += raw
			result.css.gz += gz
			continue
		}
		result.js.raw += raw
		result.js.gz += gz

		if (VENDOR_PATTERN.test(name)) {
			// Keep the hashed filename: an unchanged hash is the signal that
			// returning visitors still have the chunk cached.
			result.vendors[name.replace(STRIP_HASH, '$1')] = { file: name, raw, gz }
		} else if (/^index[-.]/.test(name)) {
			result.entry = { raw, gz }
		}
	}
	return result
}

module.exports = { measure }

if (require.main === module) {
	const [dist, out] = process.argv.slice(2)
	if (!dist || !out) {
		console.error('usage: measure-bundle.cjs <dist-dir> <output.json>')
		process.exit(2)
	}
	const result = measure(dist)
	fs.mkdirSync(path.dirname(out), { recursive: true })
	fs.writeFileSync(out, JSON.stringify(result, null, 2))
	console.log(
		`${dist}: ${(result.js.gz / 1024).toFixed(2)} kB JS + ` +
			`${(result.css.gz / 1024).toFixed(2)} kB CSS, gzipped ` +
			`(${Object.keys(result.vendors).length} vendor chunk(s))`
	)
}
