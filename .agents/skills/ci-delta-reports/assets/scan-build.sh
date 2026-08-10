#!/usr/bin/env bash
# Check 6: scan the built output for code that must never ship.
#
#   bash scan-build.sh dist
#
# Runs over the SAME dist/ the bundle measurement just read — never build twice
# for two scans. Head branch only: there is nothing to diff, a string either
# leaked or it did not.
#
# This is the one check with no portable default, because "must never ship"
# means something different in every project. The entries below are examples.
# Replace them, and keep the reason on each line — a bare regex list rots
# within months and nobody dares delete an entry they cannot explain.

set -uo pipefail

DIST="${1:?usage: scan-build.sh <build-output-dir>}"
[ -d "$DIST" ] || { echo "no such directory: $DIST" >&2; exit 2; }

# CONFIGURE: one entry per forbidden pattern, as "regex<TAB>why it must not ship".
FORBIDDEN=(
	'__TEST_ONLY__	test-only helpers reachable from the production entry point'
	'localhost:[0-9]{4}	a development hostname baked into the build'
	'console\.debug	debug logging left enabled'
)

# CONFIGURE: files to search. Source maps legitimately contain original source,
# so scanning them produces hits that mean nothing.
FILES=$(find "$DIST" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) ! -name '*.map')
[ -n "$FILES" ] || { echo "no scannable files in $DIST" >&2; exit 2; }

found=0
for entry in "${FORBIDDEN[@]}"; do
	pattern="${entry%%	*}"
	reason="${entry#*	}"
	# shellcheck disable=SC2086
	hits=$(grep -rlE "$pattern" $FILES 2>/dev/null || true)
	if [ -n "$hits" ]; then
		echo "❌ $reason"
		echo "   pattern: $pattern"
		echo "$hits" | sed 's|^|   |'
		found=$((found + 1))
	fi
done

if [ "$found" -gt 0 ]; then
	echo
	echo "$found forbidden pattern(s) reached the production build."
	exit 1
fi

echo "✅ build output clean — ${#FORBIDDEN[@]} pattern(s) checked"
