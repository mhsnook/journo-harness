'use strict'

// Diff two bundle measurements and render one fragment.
//
// Takes the JSON summaries written by measure-bundle.cjs, not the built
// directories — the report job never has either tree checked out.

const fs = require('fs')
const path = require('path')
const { formatBytes, deltaLabel, sizeTable } = require('./delta.cjs')

const EMPTY = { js: { raw: 0, gz: 0 }, css: { raw: 0, gz: 0 }, entry: { raw: 0, gz: 0 }, vendors: {} }

const load = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)

/**
 * Compare vendor chunks by identity, not size.
 *
 * This is the axis people miss. A vendor chunk whose content hash is unchanged
 * is still in returning visitors' caches. A PR that adds 2 kB to one has really
 * cost every returning user the WHOLE chunk again, which may be 200 kB. So
 * report which chunks changed first, and their sizes second.
 */
function vendorSection(base, head) {
	const names = [...new Set([...Object.keys(base.vendors), ...Object.keys(head.vendors)])].sort()
	if (!names.length) return '_No vendor chunks in the eager set._'

	const changed = []
	let cachedRaw = 0
	let cachedGz = 0
	let cachedCount = 0

	for (const n of names) {
		const b = base.vendors[n]
		const h = head.vendors[n]
		if (b && h && b.file === h.file) {
			cachedCount++
			cachedRaw += h.raw
			cachedGz += h.gz
		} else {
			changed.push({ n, b, h })
		}
	}

	if (!changed.length) {
		return (
			`✅ **Vendor chunks unchanged** — ${cachedCount} chunk(s) totalling ` +
			`${formatBytes(cachedRaw)} raw (${formatBytes(cachedGz)} gzipped), still cached for repeat visitors.`
		)
	}

	const rows = changed.map(({ n, b, h }) => {
		if (!b) return `- 🆕 \`${n}\` added — ${formatBytes(h.raw)} raw (${formatBytes(h.gz)} gz)`
		if (!h) return `- ❌ \`${n}\` removed — was ${formatBytes(b.raw)} raw`
		// deltaLabel supplies the direction emoji: a vendor chunk that shrank
		// must not render as growth.
		return `- \`${n}\` — ${formatBytes(b.raw)} → ${formatBytes(h.raw)} raw, ${deltaLabel(h.raw, b.raw)}`
	})
	const stable =
		cachedCount ?
			`\n\n${cachedCount} other vendor chunk(s) unchanged — ${formatBytes(cachedRaw)} raw (${formatBytes(cachedGz)} gz), still cached.`
		:	''
	return `**Vendor chunks changed:**\n${rows.join('\n')}${stable}`
}

module.exports = function render({ head, base, out }) {
	fs.mkdirSync(out, { recursive: true })
	const h = load(head)
	const b = load(base)

	// A missing measurement means a build failed. Say so rather than rendering
	// a delta against zeros, which would read as "the whole bundle is new".
	if (!h || !b) {
		const which = !h && !b ? 'Both builds' : !h ? 'The PR build' : 'The base build'
		fs.writeFileSync(
			path.join(out, '40-bundle.md'),
			`#### Bundle size\n\n⚠️ ${which} produced no measurement, so there is nothing to compare. Check the job log.`
		)
		fs.writeFileSync(
			path.join(out, '40-bundle.json'),
			JSON.stringify({ check: 'bundle', missing: true }, null, 2)
		)
		return
	}

	const markdown = [
		'#### Bundle size',
		'',
		'**Eager load** — the entry chunk plus every preload in `index.html` (what a first paint downloads)',
		'',
		sizeTable(h.js.raw, h.js.gz, b.js.raw, b.js.gz),
		'',
		'**Entry chunk** — your own code, re-downloaded on every deploy',
		'',
		sizeTable(h.entry.raw, h.entry.gz, b.entry.raw, b.entry.gz),
		'',
		'**CSS** — render-blocking on first paint',
		'',
		sizeTable(h.css.raw, h.css.gz, b.css.raw, b.css.gz),
		'',
		vendorSection(b, h),
	].join('\n')

	fs.writeFileSync(path.join(out, '40-bundle.md'), markdown)
	fs.writeFileSync(
		path.join(out, '40-bundle.json'),
		JSON.stringify(
			{
				check: 'bundle',
				eagerRawDelta: h.js.raw - b.js.raw,
				eagerGzDelta: h.js.gz - b.js.gz,
				entryGzDelta: h.entry.gz - b.entry.gz,
			},
			null,
			2
		)
	)
}

module.exports.vendorSection = vendorSection
