#!/usr/bin/env bash
# Collect normalised static-check output into $1.
#
# Run once in the head checkout and once inside the base worktree, always from
# that tree's own root. Output is one sorted line per issue, so the diff engine
# can treat the two runs as comparable sets.

# Deliberately no `-e`: every check here exits non-zero when it finds issues,
# which is the normal case, not a script failure.
set -uo pipefail

OUT="${1:?usage: collect-static.sh <output-dir>}"
mkdir -p "$OUT"

# CONFIGURE: paths kept out of the lint and formatter deltas. Vendored and
# generated code produces noise nobody on the PR can act on.
EXCLUDE='^(vendor/|third_party/|dist/|.*\.generated\.[jt]s$)'

# Read-only checks run concurrently. The typechecker is the long pole and the
# linters finish underneath it, so this is close to free.
(
	# CONFIGURE: your typecheck command. Keep the grep — it drops the summary
	# lines, which change with the error count and would diff as noise.
	pnpm check 2>&1 | grep ': error TS' | sort >"$OUT/typecheck.txt"
) &
(
	# CONFIGURE: one block per linter, all normalised to unix format
	# (`file:line:col: message`) so they merge into a single sorted list.
	pnpm exec oxlint . -f unix >"$OUT/.oxlint.raw" 2>&1
	pnpm exec eslint . -f unix >"$OUT/.eslint.raw" 2>&1
	cat "$OUT/.oxlint.raw" "$OUT/.eslint.raw" |
		grep -E '^[^:[:space:]][^:]*:[0-9]+:[0-9]+:' |
		grep -Ev "$EXCLUDE" |
		sort -u >"$OUT/lint.txt"
) &
wait

# The formatter REWRITES files, so it runs after the read-only checks. The set
# of files it modified is exactly the formatting debt — no separate --check
# pass needed. Restore the tree afterwards so later steps see a clean checkout.
# CONFIGURE: your formatter command(s).
pnpm exec oxfmt . >/dev/null 2>&1
git diff --name-only | grep -Ev "$EXCLUDE" | sort >"$OUT/format.txt"
git checkout -- .

# Never let a missing file break the render step.
for f in typecheck lint format; do
	[ -f "$OUT/$f.txt" ] || : >"$OUT/$f.txt"
done

wc -l "$OUT"/*.txt
