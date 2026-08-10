---
name: ci-delta-reports
description: Set up GitHub Actions CI that reports what CHANGED between the base branch and the PR — new vs resolved type errors, lint issues, formatter drift, bundle size, and test failures — in one PR comment that updates in place. Use when someone wants PR checks that show a delta rather than a pass/fail, wants to adopt linting on a legacy codebase without fixing everything first, wants bundle-size reporting on PRs, asks for "CI like sunlo has", or wants to consolidate several noisy CI comments into one.
license: MIT
---

# CI delta reports

Build CI that answers **"what did this PR change?"** instead of **"is the repo clean?"**

The difference matters most on a codebase with existing debt. A workflow that fails on any lint error is unusable when the repo already has 4,000 of them, so teams turn it off. A workflow that fails only on *newly added* errors works from day one, and the count ratchets down as people touch old files.

Both are legitimate. Ask which one the developer wants — do not assume this one.

## What you will produce

```
.github/workflows/pr-checks.yml   head job · base job · report job
.github/ci/collect-static.sh      runs typecheck + lint + format, normalises output
.github/ci/measure-bundle.cjs     reads dist/ into a JSON summary
.github/ci/scan-build.sh          greps dist/ for strings that must not ship
.github/ci/delta.cjs              diff engine — set difference plus shift-pairing
.github/ci/render-*.cjs           turn measurements into markdown fragments
.github/ci/comment.cjs            fragment assembly and comment upsert
.github/ci/gate.cjs               the single place pass/fail policy lives
```

**One job per tree, not one per check.** `head` and `base` each install once and
build once, in parallel, then run every check that tree can answer. `report`
diffs the two summaries, posts one comment, and decides pass or fail. Two
installs and two builds total, whatever the number of checks — installs and
builds are paid per job, so a job per check is how the cost explodes.

The architecture, and why each piece is shaped the way it is, lives in
[references/architecture.md](references/architecture.md). Read it before you
adapt the templates — several choices look arbitrary and are not.

## Step 1 — read the repo first

Never ask a question the repository already answers. Determine:

- Package manager, from the lockfile: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lockb`
- Available scripts: read `package.json` `scripts`, or the equivalent for a non-JS project
- Which of typecheck, lint, format, build, and test actually exist as commands
- Whether `.github/workflows/` already has something, so you extend rather than replace
- The default branch name, and whether PRs target it

Report what you found before you ask anything. "You're on pnpm with `check`,
`lint`, `format`, `build`, and `test:unit` scripts, and no workflows yet" makes
the following questions much cheaper to answer.

## Step 2 — ask, do not assume

Present the six checks and let the developer pick. The **fixed** cost is one
install and one build per tree, paid once no matter how many checks they take.
Each check then adds only its own run time, listed below as *marginal* cost.

| # | Check | What the delta tells you | Trees | Marginal cost |
|---|-------|--------------------------|-------|---------------|
| 1 | **Type errors** | New / resolved, with line shifts discounted | both | one typecheck per tree |
| 2 | **Lint** | New / resolved, several linters merged into one list | both | runs beside the typecheck, so ≈ free |
| 3 | **Formatter drift** | How many files the formatter would still rewrite, grouped by extension | both | one format pass per tree, ~seconds |
| 4 | **Bundle size** | Eager set, entry chunk, CSS, and which vendor chunks stopped being cacheable | both | **forces the build**, then ≈ free to measure |
| 5 | **Tests** | Pass / fail with failure detail inline | head | the suite's own runtime |
| 6 | **Build content scan** | Code that must never ship, found in the built output | head | a grep over the build, seconds |

Say these out loud, because they change what people pick:

- **Checks 1–3 are close to a package deal.** They run in the same script off
  the same install. Adding lint to a repo that already typechecks is about a minute.
- **Check 4 is the one that costs.** It forces a build on both trees. If they
  say no to it, drop the build steps from both jobs entirely.
- **Check 6 is nearly free once check 4 is in**, because it scans the `dist/`
  that was already built. On its own it still forces a build.
- **Wall clock is roughly the slower tree**, not the sum, because `head` and
  `base` run concurrently.

Do not quote minute figures for their repo. Install and build time varies by
more than an order of magnitude across projects, and a confident wrong number
is worse than "it depends on your build".

Then ask the policy questions. These are the ones people have real opinions about:

1. **Gate or report?** Per check: fail the build on new issues, or comment only?
   A sensible default is gate on type errors and tests, report-only on formatter
   drift, and let them decide lint.
2. **How strict on new issues?** Fail on the first new one, or allow a budget?
3. **Vendored and generated files** — in or out of the lint and format deltas?
   Default them out; nobody reviewing the PR can act on them.
4. **Bundle budget**, if they took check 4. A byte ceiling on gzipped growth, or
   report-only?
5. **Line-shift tolerance.** An unrelated edit above an existing error bumps its
   line number. The default pairs those within ±10 lines so they do not read as
   one new plus one resolved. Widen it on a codebase with big mechanical diffs.

Ask these as a batch, not one at a time.

## Step 3 — generate

Copy the templates from `assets/` into `.github/`, then adapt. Every line that
depends on the toolchain carries a `# CONFIGURE:` marker — resolve all of them
and delete the marker. A leftover `CONFIGURE` comment in generated output is a
bug.

- `workflow.yml` → `.github/workflows/pr-checks.yml`. Delete the **steps** for
  checks they did not pick, keeping the three jobs. Drop the build steps from
  both jobs if they took neither check 4 nor check 6.
- `collect-static.sh` → swap in the real typecheck, lint, and format commands,
  and set `EXCLUDE` from their answer about vendored files. Keep the shape:
  read-only checks concurrent, formatter last.
- `measure-bundle.cjs` → its `measure()` assumes an `index.html` entry point.
  For a library or server bundle, walk the output directory instead.
- `render-tests.cjs` → its `parse()` reads the Vitest and Jest JSON shape.
  Rewrite it for another runner and leave the rest.
- `scan-build.sh` → replace the example `FORBIDDEN` entries. Ask what must never
  ship; do not guess. Keep the reason on each line.
- `gate.cjs` → set `POLICY` from the answers to step 2.

## Step 4 — verify before you hand it over

Do not claim this works until you have checked:

```bash
node .github/ci/delta.cjs --selftest              # the shift-pairing logic
bash -n .github/ci/collect-static.sh              # shell syntax
bash -n .github/ci/scan-build.sh
node -e "require('./.github/ci/gate.cjs')"        # the policy object parses
node .github/ci/measure-bundle.cjs dist /tmp/m.json   # after a local build
```

Then confirm by reading, not by running:

- The report job has `permissions: pull-requests: write` and `if: always()`, so
  the comment still posts when a check job fails.
- The `base` job checks out `.github/ci/` from the head SHA. Both trees must be
  measured by the same scripts, or editing a script reads as a code change.
- Every step the workflow references exists as a file, and every file the
  workflow does not reference has been deleted.
- No `CONFIGURE` markers survive.

Say plainly that CI cannot be fully verified without a real PR, and that the
first run is the actual test.

## Rules that keep the report honest

- **Report and gate are separate steps.** The comment posts even on a red build.
  A contributor who cannot see why it failed will guess.
- **One comment, updated in place.** Match on a marker prefix and edit. Four
  comments per push trains people to collapse them.
- **Normalise before diffing.** Sort every list and strip summary lines like
  "Found 12 errors" — those change with the count and diff as pure noise.
- **Cap every list.** 50 items plus "… and N more". GitHub rejects a comment
  body over 65,536 characters, and a mechanical refactor will find that limit.
- **The formatter runs last in its job.** It rewrites files, and the set it
  rewrote is the signal. Restore the tree with `git checkout -- .` afterwards.
- **A missing report is a failure, not a pass.** If a runner crashes before
  writing output, say so in the comment and fail the gate.
