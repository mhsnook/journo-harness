#!/usr/bin/env bash
# Collect normalised static-check output into $1.
#
# Runs once in the head checkout and once in the base checkout, always from that
# tree's own root. Output is one sorted line per issue, so delta.cjs can treat
# the two runs as comparable sets.

# Deliberately no `-e`: every check here exits non-zero when it finds issues,
# which is the normal case, not a script failure.
set -uo pipefail

OUT="${1:?usage: collect-static.sh <output-dir>}"
mkdir -p "$OUT"

# Paths kept out of the lint and formatter deltas: generated code, and the
# vendored skills under .claude and .agents. Both produce noise nobody on the PR
# can act on.
#
# `.oxlintrc.json` and `.oxfmtrc.json` ignore these too. It is repeated here
# because each tree is measured with its OWN config, so a PR that edits either
# config would otherwise move the baseline under itself.
EXCLUDE='^(dist/|\.wrangler/|\.claude/|\.agents/|src/client/routeTree\.gen\.ts$|worker-configuration\.d\.ts$)'

# Read-only checks run concurrently. The typechecker is the long pole and oxlint
# finishes well underneath it, so the lint is close to free.
(
	raw=$(pnpm typecheck 2>&1)
	status=$?
	printf '%s\n' "$raw" | grep ': error TS' | sort >"$OUT/typecheck.txt"

	# `pnpm typecheck` is `wrangler types --check && tsc --build`. When it fails
	# without emitting one TS diagnostic, tsc never ran — say so rather than
	# writing an empty file, which would read as zero type errors.
	if [ "$status" -ne 0 ] && [ ! -s "$OUT/typecheck.txt" ]; then
		echo "typecheck(0,0): error TS0000: the typecheck exited $status with no diagnostic — see the job log" \
			>"$OUT/typecheck.txt"
	fi
) &
(
	# oxlint's unix format is `file:line:col: message [rule]`, which delta.cjs
	# parses directly. Add a second linter as another block writing into the same
	# `cat`, and the two merge into one sorted list.
	pnpm exec oxlint . -f unix >"$OUT/.oxlint.raw" 2>&1
	grep -E '^[^:[:space:]][^:]*:[0-9]+:[0-9]+:' "$OUT/.oxlint.raw" |
		grep -Ev "$EXCLUDE" |
		sort -u >"$OUT/lint.txt"
) &
wait

# The formatter REWRITES files, so it runs after the read-only checks. The set
# of files it modified is exactly the formatting debt — no separate --check pass
# is needed. Restore the tree afterwards, or every later step in the job sees a
# dirty checkout.
pnpm exec oxfmt . >/dev/null 2>&1
git diff --name-only | grep -Ev "$EXCLUDE" | sort >"$OUT/format.txt"
git checkout -- .

# Never let a missing file break the render step.
for f in typecheck lint format; do
	[ -f "$OUT/$f.txt" ] || : >"$OUT/$f.txt"
done

rm -f "$OUT/.oxlint.raw"
wc -l "$OUT"/*.txt
