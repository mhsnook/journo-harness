# Architecture

Why the generated workflow is shaped the way it is. Read this before adapting
the templates — several choices look arbitrary and are not.

## The shape: one job per tree, not one per check

```
   ┌───────────────────────┐   ┌───────────────────────┐
   │        head           │   │        base           │
   │  install ─┐           │   │  install ─┐           │
   │  build ───┤           │   │  build ───┤           │   in parallel
   │  static · measure ·   │   │  static · measure     │
   │  scan · tests         │   │                       │
   └──────────┬────────────┘   └──────────┬────────────┘
              │ artifact                  │ artifact
              └────────────┬──────────────┘
                           ▼
                    ┌─────────────┐
                    │   report    │  if: always()
                    └─────────────┘
                 diff · one comment · one verdict
```

Two installs and two builds, whatever the number of checks.

The instinct is to give each check its own job, which reads cleanly in the
Actions UI. It is also how the cost explodes: what is expensive here is
installing dependencies and building, and both are paid **per job**, not per
check. Five check-jobs means five installs.

What actually decides whether two checks can share work is which tree they
need:

| Check | Needs |
|---|---|
| Type errors, lint, formatter drift, bundle size | both trees |
| Tests, build-content scan | head only |

So the split is by tree. Each job installs once, builds once, and runs every
check that tree can answer. `head` and `base` do not depend on each other, so
they run concurrently and wall-clock is roughly one install plus one build, not
two.

The bundle content scan reads the same `dist/` the measurement just read. Two
scans, one build. Building twice for two questions about one artifact is the
mistake this layout exists to prevent.

## Why the diff moved into the report job

Each build job **measures** and writes a summary — sorted issue lists for the
static checks, a small JSON for the bundle. Neither job compares anything.

That is what allows the two trees to live on separate runners. If the diff
happened in a build job, that job would need both trees, which forces them back
into one job and back into serial execution.

The report job then downloads two summaries and diffs them. It checks out the
repository only to get the scripts; it never needs either build.

## Why the base job fetches its scripts from head

```yaml
git checkout "${{ github.event.pull_request.head.sha }}" -- .github/ci/
```

The base branch has its own copy of `.github/ci/`, possibly an older one. If
each tree were measured by its own version of the collection script, a PR that
edits the script would show up as a change in the codebase. Pinning both sides
to the head branch's scripts keeps the comparison about the code.

The trade-off is real and worth stating: a PR that breaks the collection script
breaks the base measurement too. That is the correct failure — it is visible
immediately, rather than producing a plausible and wrong delta.

## Why line-shift pairing exists

Insert one import at the top of a file and every issue below it moves down a
line. A naive set difference then reports 40 resolved and 40 new. The report
becomes noise, and worse, a `no-new` gate blocks a PR that introduced nothing.

`differential()` pairs an appeared item with a disappeared one when the file,
the column, and the message all match and the line moved by no more than
`proximity` (default 10). Paired items are counted as `moved` and excluded from
both totals.

Deliberate limits:

- **Column must match exactly.** If the column moved, the code itself changed,
  not just its position. That is a real new issue.
- **Message must match exactly.** Same location, different rule, is a new issue.
- **Only line numbers get tolerance.** Nothing else is fuzzy.

Set `proximity` to `0` for a plain set difference. Do that whenever the unit of
change is a whole file — formatter drift, for instance, where there is no line
number to shift.

## Why the formatter runs last in its script

Read-only checks run concurrently with `&` and `wait`, since the typechecker is
the long pole and the linters finish underneath it.

The formatter cannot join them. It **rewrites files**, and the set of files it
rewrote *is* the drift measurement — no separate `--check` pass is needed.
Running it alongside a typechecker would have it editing files out from under
the tool. So it runs after, and the tree is restored with `git checkout -- .`
immediately, or every later step in the job sees a dirty checkout.

## Why fan-in rather than one comment per job

Parallel jobs cannot safely share a comment — two finishing together will race,
and one overwrites the other. The options are one comment per job, or a fan-in
job that owns the write.

Fan-in wins on the thing that matters, which is the reader: a PR with four bot
comments gets collapsed and ignored. It also puts the pass/fail decision in one
file, so "how strict are we?" has one answer instead of being spread across job
definitions.

The cost is a serialised final job, roughly 30 seconds, and `if: always()` is
required — without it, a failing check job cancels the report and the
contributor sees a red X with no explanation.

## Why the gate is separate from the report

The comment always posts. The gate then reads the same JSON sidecars and
decides. Two consequences worth keeping:

- A red build still explains itself.
- Strictness lives in one object in `gate.cjs`. Loosening a rule during a
  migration is a one-line edit, not a workflow rewrite.

A missing sidecar is a failure, not a pass. A runner that crashed before writing
output must not read as a clean run.

## Known limits

- **Toolchain skew.** Head and base build on separate runners, so in principle
  they could get different runner images mid-rollout. `setup-node` pins the
  language version and the lockfile pins dependencies, so the exposure is small.
  If a project is sensitive to it, merge the two jobs into one and add the base
  branch as a `git worktree` — you trade the parallelism for a guarantee that
  both measurements came off one machine.
- **Fork PRs.** `pull_request` grants a read-only token to forks, so the comment
  step cannot write. Either switch to `pull_request_target` and accept its
  security implications — it runs the base branch's workflow with a write token,
  so never check out and execute fork code in it — or let the comment step fail
  on forks and rely on the gate's exit code.
- **Rename churn.** Renaming a file makes every issue in it appear new and its
  old path resolved. Proximity pairing does not help, because the file key
  changed. Nothing here fixes that; mention it in the PR template so reviewers
  expect it.
- **Retry granularity.** Re-running a failed `head` job re-runs its build and
  its tests together. Splitting them back out would restore per-check retries
  at the cost of another install.
