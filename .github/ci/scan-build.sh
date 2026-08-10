#!/usr/bin/env bash
# Scan the built output for code that must never ship.
#
#   bash scan-build.sh dist [fragment-dir]
#
# Runs over the SAME dist/ the bundle measurement just read — never build twice
# for two questions about one artifact. Head branch only: there is nothing to
# diff, a string either leaked or it did not.
#
# Keep the reason on each entry. A bare regex list rots within months, and
# nobody dares delete an entry they cannot explain.

set -uo pipefail

DIST="${1:?usage: scan-build.sh <build-output-dir> [fragment-dir]}"
FRAGMENTS="${2:-}"
[ -d "$DIST" ] || {
	echo "no such directory: $DIST" >&2
	exit 2
}

# One entry per forbidden pattern, as "regex<TAB>why it must not ship".
FORBIDDEN=(
	'(^|[^A-Za-z0-9_$.])debugger([^A-Za-z0-9_$]|$)	a debugger statement, which halts the browser on any visitor with devtools open'
	'\.dev\.vars	a reference to the local secrets file, which is never deployed and so is never there at runtime'
	'(CLOUDFLARE|CF)_API_TOKEN	a Cloudflare credential name, which belongs in the deploy environment rather than the build'
)

# Source maps legitimately contain original source, so scanning them produces
# hits that mean nothing.
mapfile -t FILES < <(find "$DIST" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) ! -name '*.map')
[ "${#FILES[@]}" -gt 0 ] || {
	echo "no scannable files in $DIST" >&2
	exit 2
}

hits=0
report=""
for entry in "${FORBIDDEN[@]}"; do
	pattern="${entry%%	*}"
	reason="${entry#*	}"
	matched=$(grep -rlE "$pattern" "${FILES[@]}" 2>/dev/null || true)
	if [ -n "$matched" ]; then
		echo "❌ $reason"
		echo "   pattern: $pattern"
		echo "$matched" | sed 's|^|   |'
		report+="$reason"$'\n'"  pattern: $pattern"$'\n'
		report+="$(echo "$matched" | sed 's|^|  |')"$'\n\n'
		hits=$((hits + 1))
	fi
done

if [ -n "$FRAGMENTS" ]; then
	mkdir -p "$FRAGMENTS"
	printf '{ "check": "scan", "hits": %d, "patterns": %d }\n' "$hits" "${#FORBIDDEN[@]}" \
		>"$FRAGMENTS/60-scan.json"
	{
		echo '#### Build content scan'
		echo
		if [ "$hits" -eq 0 ]; then
			echo "✅ No forbidden pattern reached the built output — ${#FORBIDDEN[@]} pattern(s) checked."
		else
			echo "❌ **$hits of ${#FORBIDDEN[@]} forbidden pattern(s) reached the built output.**"
			echo
			echo '```'
			printf '%s' "$report"
			echo '```'
		fi
	} >"$FRAGMENTS/60-scan.md"
fi

if [ "$hits" -gt 0 ]; then
	echo
	echo "$hits forbidden pattern(s) reached the production build."
	exit 1
fi

echo "✅ build output clean — ${#FORBIDDEN[@]} pattern(s) checked"
