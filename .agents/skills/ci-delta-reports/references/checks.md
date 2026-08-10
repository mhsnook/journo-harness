# The six checks

Per-check detail: what to run, how to normalise the output, and what the delta
means. The diff engine only needs one sorted line per issue, so any tool that
can be coaxed into `file:line:col: message` drops straight in.

## 1. Type errors

**Normalised form:** the tool's own error lines, sorted, with summary lines
stripped.

| Language | Command | Parser |
|---|---|---|
| TypeScript | `tsc --noEmit` piped through `grep ': error TS'` | `parsers.tsc` |
| Python | `mypy --no-error-summary --no-color-output .` | `parsers.unix` |
| Go | `go vet ./... 2>&1` | `parsers.unix` |
| Rust | `cargo check --message-format short 2>&1` | `parsers.unix` |

Strip the summary line in every case. `Found 12 errors in 5 files` changes
whenever the count does, so it diffs as a permanent phantom issue.

**Gate advice:** `no-new` is right for almost everyone. Type errors are
unambiguous and cheap to fix at the moment you introduce one.

## 2. Lint

**Normalised form:** `file:line:col: message`, several linters merged, sorted
and de-duplicated.

| Tool | Flag |
|---|---|
| ESLint | `-f unix` |
| oxlint | `-f unix` |
| Ruff | `--output-format concise` |
| golangci-lint | `--out-format line-number` |
| Clippy | `--message-format short` |

Merging linters into one list is deliberate: a reviewer cares that there is a
new issue at `src/foo.ts:12`, not which of the two tools found it. Keep the
rule name in the message so the fix is still obvious.

Filter vendored and generated paths *before* sorting. They produce issues that
nobody reviewing the PR can act on, and they can outnumber the real ones.

**Gate advice:** `no-new` on a maintained codebase. On a legacy one, start
`report-only` for a few weeks so the team sees the number, then tighten. Going
straight to `no-new` on a repo with thousands of existing issues is how these
workflows get disabled.

## 3. Formatter drift

**Normalised form:** a sorted list of file paths — the files the formatter
would rewrite.

Run the formatter in write mode, then read `git diff --name-only`. That is one
pass instead of two, and it gives the exact file set rather than a count. Then
`git checkout -- .`.

Do not use `--check` mode. It exits non-zero and prints a list in a different
shape per tool, which you would then have to parse.

This check is set-difference only — pass `proximity: 0`. The unit is the file.

Group the remaining drift by extension in the comment. Eighty `.sql` files read
very differently from eighty spread across `.ts` and `.tsx`, and one stray
`.css` is easy to spot and fold into the current PR.

**Gate advice:** `report-only`, nearly always. Formatting debt is real but
blocking on it annoys people out of proportion to the harm. The trend arrow
does the work.

## 4. Bundle size

**Normalised form:** byte counts, raw and gzipped, on several axes.

Measure the **eager-load set** — everything `index.html` references directly —
not the whole output directory. Lazy chunks are part of the app a user may
never download, so folding them into one total hides the number that matters.

Report these axes separately, because they move for different reasons:

- **Eager total** — what a first paint costs.
- **Entry chunk** — your own code, re-downloaded on every deploy.
- **CSS** — render-blocking, and moves when design changes rather than logic.
- **Vendor chunks** — compared by content hash, not size.

That last one is the non-obvious axis and often the most useful. A vendor chunk
whose hash is unchanged is still in returning visitors' caches. A PR that adds
2 kB to a vendor chunk has really cost every returning user the *whole* chunk
again, which may be 200 kB. Report identity, then size.

**Watch for:** a bundler that reads environment variables at build time may
tree-shake large dependencies away when those variables are missing, producing
a build that looks dramatically smaller and means nothing. Set dummy-but-truthy
values in CI and sanity-check that a known dependency is present in the output.

**Gate advice:** a gzipped byte budget on the eager total, generous enough that
only real regressions trip it. Percentage budgets misbehave on small bundles.

## 5. Tests

**Normalised form:** counts plus a list of failures.

Single-branch. A test passes on head or it does not; there is nothing to
compare against base. The delta framing does not apply here, and pretending
otherwise produces a confusing report.

Run with `continue-on-error: true` and let the report job own the failure.
Otherwise the job dies before writing its fragment and the comment loses the
one section a contributor most wants to read.

Emit machine-readable output: `--reporter=json` for Vitest and Jest,
`--json-report` for pytest, `-json` for `go test`. Parsing human output breaks
on every minor version.

Cap the failure list — 20 is plenty — and truncate each message to its first
line. Full stack traces belong in the job log and the uploaded artifact.

**Gate advice:** `no-new`, meaning any failure fails the build. Also fail when
the results file is missing, which is a crashed runner rather than a clean run.

## 6. Bundle content scan

**Normalised form:** a list of forbidden strings found in the built output.

No template ships for this one, because "must never ship" means something
different in every project. Common instances:

- Test-only helpers or fixture data reachable from the production entry point
- A debug or verbose logging flag left enabled
- A staging hostname or a development API key
- A dependency that was supposed to be `devDependencies`-only

Write it as a `grep` over the build output that exits non-zero on a hit, and
ask the developer what the forbidden strings are. Keep the list in one file
with a comment per entry saying why it must not ship — a bare regex list rots
within months.

Single-branch, and it builds. If bundle size is also in play, run both scans
over the same `dist/` rather than building twice.

**Gate advice:** always gating, never report-only. A leaked key is not a trend
to watch.
