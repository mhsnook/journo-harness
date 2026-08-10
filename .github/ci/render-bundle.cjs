'use strict'

// Diff two bundle measurements and render one fragment.
//
// Takes the JSON summaries written by measure-bundle.cjs, not the built
// directories — the report job never has either tree checked out.

const fs = require('fs')
const path = require('path')
const { formatBytes, deltaLabel, sizeTable } = require('./delta.cjs')

const load = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)

/**
 * Compare eager chunks by identity, not size.
 *
 * This is the axis people miss. A chunk whose content hash is unchanged is
 * still in returning visitors' caches. A PR that adds 2 kB to one has really
 * cost every returning visitor the WHOLE chunk again. So report which chunks
 * changed first, and their sizes second.
 */
function chunkSection(base, head) {
	const names = [
		...new Set([...Object.keys(base.eagerChunks), ...Object.keys(head.eagerChunks)]),
	].sort()
	if (!names.length) return '_No eager chunks found._'

	const changed = []
	let cached = { raw: 0, gz: 0, count: 0 }

	for (const n of names) {
		const b = base.eagerChunks[n]
		const h = head.eagerChunks[n]
		if (b && h && b.file === h.file) {
			cached = { raw: cached.raw + h.raw, gz: cached.gz + h.gz, count: cached.count + 1 }
		} else {
			changed.push({ n, b, h })
		}
	}

	const cachedNote =
		`${cached.count} chunk(s) totalling ${formatBytes(cached.raw)} raw ` +
		`(${formatBytes(cached.gz)} gzipped), still cached for repeat visitors.`

	if (!changed.length) return `✅ **Eager chunks unchanged** — ${cachedNote}`

	const rows = changed.map(({ n, b, h }) => {
		if (!b) {
			return `- 🆕 \`${n}\` added — ${formatBytes(h.raw)} raw (${formatBytes(h.gz)} gz)`
		}
		if (!h) return `- ❌ \`${n}\` removed — was ${formatBytes(b.raw)} raw`
		// deltaLabel supplies the direction emoji, so a chunk that shrank does
		// not render as growth.
		const sizes = `${formatBytes(b.raw)} → ${formatBytes(h.raw)} raw`
		return `- \`${n}\` — ${sizes}, ${deltaLabel(h.raw, b.raw)}`
	})
	const stable = cached.count ? `\n\n${cachedNote}` : ''
	return `**Eager chunks re-downloaded:**\n${rows.join('\n')}${stable}`
}

function workerSection(base, head) {
	if (!base.worker || !head.worker)
		return '_The Worker bundle was not found in the build._'
	const table = sizeTable(
		head.worker.raw,
		head.worker.gz,
		base.worker.raw,
		base.worker.gz,
	)
	return [
		'**Worker bundle** — Cloudflare enforces its upload limit on the gzipped size',
		'',
		table,
	].join('\n')
}

module.exports = function render({ head, base, out }) {
	fs.mkdirSync(out, { recursive: true })
	const h = load(head)
	const b = load(base)

	// A missing measurement means a build failed. Say so rather than rendering a
	// delta against zeros, which would read as "the whole bundle is new".
	if (!h || !b) {
		const which = !h && !b ? 'Both builds' : !h ? 'The PR build' : 'The base build'
		fs.writeFileSync(
			path.join(out, '40-bundle.md'),
			`#### Bundle size\n\n⚠️ ${which} produced no measurement, so there is nothing to compare. Check the job log.`,
		)
		fs.writeFileSync(
			path.join(out, '40-bundle.json'),
			JSON.stringify({ check: 'bundle', missing: true }, null, 2),
		)
		return
	}

	const markdown = [
		'#### Bundle size',
		'',
		'**Eager load** — the entry chunk plus every modulepreload in `index.html` (what a first paint downloads)',
		'',
		sizeTable(h.client.js.raw, h.client.js.gz, b.client.js.raw, b.client.js.gz),
		'',
		'**Entry chunk** — your own code, re-downloaded on every deploy',
		'',
		sizeTable(
			h.client.entry.raw,
			h.client.entry.gz,
			b.client.entry.raw,
			b.client.entry.gz,
		),
		'',
		'**CSS** — render-blocking on first paint',
		'',
		sizeTable(h.client.css.raw, h.client.css.gz, b.client.css.raw, b.client.css.gz),
		'',
		`**Lazy route chunks** — ${b.client.lazy.count} → ${h.client.lazy.count} chunk(s), fetched only when the router navigates there`,
		'',
		sizeTable(h.client.lazy.raw, h.client.lazy.gz, b.client.lazy.raw, b.client.lazy.gz),
		'',
		workerSection(b, h),
		'',
		chunkSection(b.client, h.client),
	].join('\n')

	fs.writeFileSync(path.join(out, '40-bundle.md'), markdown)
	fs.writeFileSync(
		path.join(out, '40-bundle.json'),
		JSON.stringify(
			{
				check: 'bundle',
				eagerRawDelta: h.client.js.raw - b.client.js.raw,
				eagerGzDelta: h.client.js.gz - b.client.js.gz,
				entryGzDelta: h.client.entry.gz - b.client.entry.gz,
				workerGzDelta: (h.worker?.gz ?? 0) - (b.worker?.gz ?? 0),
			},
			null,
			2,
		),
	)
}

module.exports.chunkSection = chunkSection
