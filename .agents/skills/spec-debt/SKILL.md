---
name: spec-debt
description: 'Audit a codebase for specification debt — claims that live at the wrong altitude (a cross-module rule buried in a code comment) and claims stated more strongly than they are known ("never do X"). Runs in two modes: a cheap comment-reduction pass over a PR or diff, and a full audit that adds reach tests, contradiction hunting, and promotion proposals. Produces a ledger and a report, then offers to apply. Triggers: audit spec debt, review the comments in this PR, find spec spaghetti, are our comments over-specified, why do the docs disagree with the code, despecify this codebase.'
license: MIT
---

# Spec debt audit

A codebase accumulates claims. Some are **specifications**: they constrain one
piece of work for the benefit of other work, or of a future self. Some are
**observations**: they report what is true, or explain why something odd
exists, and they support the reader without constraining them.

**Spec debt is an observation that got promoted into a specification by
accident.** It happens through wording — a note phrased as a law — and through
placement — a local remark sitting where a cold reader will read it as a rule.

The obvious cost is invisible constraint: a rule buried in a code comment
constrains work without ever being read, and a rule stated more strongly than
it is known steers the next reader away from a direct solution.

The less obvious cost is the bigger one. **Over-specification destroys
descriptions.** A law states an outcome; a description carries a mechanism. So
every claim promoted to law loses the mechanism it used to hold, and the reader
loses the one thing they could have checked against their own situation:

```
- never on a deployed domain, even if the build mode is wrong
+ isDevEnvironment() checks the hostname as well as the build mode, so a
+ deployed domain fails it even when Vite reports DEV.
```

The first sentence asserts an outcome. The second names the gate, and a reader
can test their case against it. That is not a weaker spec — it is a thing a
spec structurally cannot do.

So the goal is not only to reduce specification. It is to **restore
descriptions to what they are good at**, and reducing specification is how.
A description is not a lesser spec. It is a different and better instrument for
almost everything a comment is for.

## Scope it before you start

Two independent questions. Ask both, in one batch, before reading any code.

**Extent** — what is in scope:

| | |
|---|---|
| A pull request or the current diff | `--diff origin/main...HEAD` |
| A range of history | `--diff <ref>...<ref>` — "the last 30 days" is this |
| One domain or folder | `--paths src/features/review` |
| The whole project | `--all`, in approved chunks |

**Depth** — which passes run:

- **Pass A only** — comment reduction. Cheap, local, cuts volume.
- **A then B** — adds reach tests, modality, contradiction hunting, promotions.

Two common presets, and the off-corner combinations matter:

- **PR review** — small extent, Pass A, applied on approval. The everyday use.
- **Full audit** — whole project, both passes, chunked.
- **Legacy sweep** — whole project, **Pass A only**. This is what makes a
  codebase previously written off as unsalvageable tractable: it needs no reach
  tests at all.

**Then ask the authoritative-index question, but only if Pass B is in scope.**
Pass B proposes moving claims into documents, and a `move` verdict with nowhere
to go forces the agent to invent a path — which is the file-structure proposal
this skill forbids. So look for the candidates (`architecture.md`, `README.md`,
`docs/overview.md`, a top-level `docs.md`) and ask which one is authoritative,
or whether to propose creating one. Also ask the convention for domain docs:
`docs/<domain>.md` or a colocated `src/<domain>/docs.md`. Both are fine; the
agent needs to know which, because it decides how comments cite them.

Asking these is not a violation of "the audit asks nothing." That boundary
means *do not negotiate individual verdicts*. Scoping happens before any claim
is classified.

## The passes

| # | Pass | Reasoning scope | Runs on | Who |
|---|---|---|---|---|
| 0 | **Scope** | — | — | main agent, asks once |
| 1 | **Enumerate** | mechanical | everything in extent | `assets/enumerate.mjs`, no model |
| 2 | **Reduce** | one comment + the lines below | every carrier | sub-agent per file, cheap model |
| 3 | **Header** | one file | files with no header | sub-agent per file, cheap model |
| 4 | **Reach** | cross-file | survivors only | main agent |
| 5 | **Modality** | one claim | survivors only | main agent |
| 6 | **Cross-check** | cross-file | survivors only | main agent |
| 7 | **Ledger + report** | — | — | main agent |

Passes 2 and 3 are single-file and share no state, so they parallelise per file
with no consistency risk. Passes 4 to 6 are relational and must run in one
context holding the doc inventory, or contradiction detection stops working.

Pass 1 must never see a model. It is deterministic and returns the same answer
every run, so nothing downstream goes looking for carriers again.

### 1. Enumerate

```bash
node assets/enumerate.mjs --paths src/features/review --out /tmp/carriers.json
```

Emits every comment block classified by position — `doc`, `file-header`,
`function-comment`, `type-comment`, `inline` — plus the census the report needs:
long-block counts, the absolutes tally, claims riding on headings, carriers
that are likely not claims, and files with no header comment.

`likelyNotAClaim` is a hint with zero false positives as its design goal. Pass
A still reads the text.

**Read the project's own documents next**: `README`, `CLAUDE.md`, `AGENTS.md`,
everything under `docs/`, and any module-level doc. Without that inventory,
every code comment restating a documented rule reads as a promotion candidate
when it is a cut.

### 2. Reduce — Pass A

Follow [references/reduce.md](references/reduce.md). Cut changelog comments, PR
references, restatements of a project doc, and padding. Separate claims that
were sharing one comment.

Scrutiny scales with length, and a one-liner gets the benefit of the doubt. A
short comment that repeats the code below it is often a **signpost** — it marks
a boundary and helps an eye scanning a long file find its place, which is a real
service that no identifier performs. Judge it on navigation, not novelty.

### 3. Header

Additive. Files in `filesWithoutHeader` get a header that says what the module
is for and cites the relevant doc. Do not hoist local comments upward —
colocated comments reading linearly down the page are the good case.

### 4. Reach — altitude

See [Altitude](#altitude-where-the-claim-lives-against-how-far-it-reaches).
Grep the symbols each surviving claim names, record the call sites as evidence,
and mark whether the reach was checked or inferred. An unchecked reach is worth
much less than a checked one.

### 5. Modality

See [Modality](#modality-how-strongly-the-claim-is-stated-against-how-strongly-it-is-known).

### 6. Cross-check

Compare survivors against the doc inventory for **contradictions**. For every
proposed move, write the sentence it would put in the target document, then
check that sentence against what the document already says. A conflict is far
cheaper to see before the doc is edited than after.

### 7. Report, then offer to apply

Write the ledger, then the report. End by asking whether to apply the proposed
changes now. On approval, apply them; the ledger stays as the record either way.

## The two axes

A claim can be defective in two independent ways, with different fixes. Keep
them apart, or the audit will move claims it should have reworded.

### Altitude: where the claim lives, against how far it reaches

Searchable, not a matter of taste. Grep for the symbols the claim names and see
what depends on it.

| How far it reaches | Where it belongs | Test |
| --- | --- | --- |
| Nothing — the type, the code, or the sentence next to it already says it | **Cut** | Delete it. Does anything become unknowable? |
| The lines below it | The function comment | Only this function breaks if a reader ignores it |
| A named sibling in the same file, or a neighbouring file | The function comment, naming the sibling | One function depends on one other |
| Several functions in one file | The file header | Three or more call sites, or a reader entering the file anywhere would need it |
| Several files in one folder | The module doc | Two or more files share the rule and the project doc does not carry it |
| Across modules | The project architecture doc | A file outside this folder breaks if the rule is ignored |

Four qualifications, because the ladder is a default and not a policy:

- **A long function comment is allowed.** One or two lines is the preference. A
  genuinely dense routine earns a longer one. The audit counts these rather
  than flagging them: ten in a codebase is a fact about the work, fifty is a
  question about the work, and the count is there so the question can be asked.
- **A one-to-one bridge stays a comment.** A note on one function naming one
  function in another file is the right shape, even though it crosses a file
  boundary. Promoting it would inflate a module doc with something exactly two
  functions care about.
- **A run of short functions relaxes the file rule.** Five three-line functions
  sharing an assumption do not need a file header. Say it once, on the first
  one or on the one that would break.
- **The audit does not impose file structure.** It never proposes splitting a
  file, moving a function, creating a module boundary, or adopting a colocation
  convention. It classifies claims against the structure that exists.

The delete test's first row does the work of duplicate detection. A claim
already stated at the definition site, in a project doc, or in the sentence
immediately after it is a cut — and finding that costs one read, where a
pairwise duplicate sweep across every claim costs everything and, on a real
codebase, turned up one hit that the delete test would have caught for free.

### Modality: how strongly the claim is stated, against how strongly it is known

A claim can sit at exactly the right altitude and still be phrased as law when
it is a report. The fix is a rewrite in place, not a move.

#### Decompose the absolute

`never`, `always`, `every`, `all`, `the only way`, `guaranteed`, `impossible`.
Each one flattens three different meanings into one word, and only the third is
served by it. Before rewriting, decide which one is meant:

| Meaning | Rewrite as | Example |
|---|---|---|
| **We want this not to happen** | say what we do instead, or what would break | "Calling this on the server would break X, which assumes Y" |
| **We are certain it cannot happen** | name the mechanism that makes it so | "isDevEnvironment() checks the hostname too, so a deployed domain fails it" |
| **It did not happen** | keep the absolute — this is the sense it serves | "an empty collection means the view was never populated" |

The first two have better sentences available, and writing them is the test.
The third is honest and must survive: an agent that strips every absolute will
delete real reports along with the false laws.

**`so X will Y` is the workhorse construction.** It states a theory of how the
thing works — *we do this so that will happen* — and it is available whenever
the meaning is one of the first two. You can still say something stronger when
you mean it, and notice that even then other words carry more than the
absolute: "check every X at commit time, so Y cannot reach Z without passing
through it" says more than "so Y never reaches Z".

Turning up the contrast on every image gives you sharper boundaries, which is
useful in speech and costly in writing, where a sentence sits on a rich
tapestry of context that the absolute then makes misleading rather than
supportive.

#### A claim has to be a sentence

A heading or a bolded lead-in cannot carry modality, so the reader has to guess
it. Take a real one:

> **One spelling per state.**

That can mean four different things — we tend to, we want to, we do, or it is a
bug when we do not — and each licenses different work. Headings name the topic
that is coming; sentences carry the claim. When the audit finds a claim in a
heading, it proposes the sentence. `enumerate.mjs` counts these as
`headingCarriers`.

#### Prefer a report to a rule

"The applier works on a copy" is a report and costs nothing if it becomes
untrue. "The applier must work on a copy" is a rule, worth writing only when
something else depends on it. Where the audit cannot find the dependent, it
proposes the report.

## Contradictions come first

**A contradiction** — a claim in the code that disagrees with a claim in the
docs, or a doc that disagrees with the code beneath it. This is a defect in the
knowledge rather than a matter of style, and one of the two is actively
misleading someone right now.

Two shapes worth naming, because both showed up on the first real run:

- **A rule whose reason explains none of its cases.** A doc said to avoid
  opacity tints because the colour utilities reject the modifier — true, and
  zero of the 203 tints in the codebase were on those utilities. A reader
  checking their own case against the reason correctly concludes the rule does
  not apply to them.
- **A claim that got stronger while being copied.** A `CLAUDE.md` summarising
  `docs/` is a common shape, and compression is where qualifiers die: the doc
  reserved `dark:` for "genuinely exceptional cases" and the summary dropped
  that clause. Compare every compressed copy against its source.

## The ledger

One JSON file, one entry per claim, written to the scratchpad. Append-only, so
a chunked scan can stop and resume: the coverage block records what has been
visited.

```jsonc
{
  "id": "c-014",
  "pass": "A",                          // A | B — which pass reached a verdict
  "file": "src/core/ops.ts",
  "line": 70,
  "text": "A title may be empty, so neither side is nullable.",
  "carrier": "function-comment",        // doc | file-header | function-comment | inline | type-comment
  "reach": {
    "level": "file",                    // none | function | sibling | file | module | project
    "evidence": ["src/core/schema.ts:78"],
    "checked": true                     // false when inferred rather than grepped
  },
  "modality": {
    "stated": "rule",                   // rule | report | ambiguous
    "known": "report",
    "markers": ["never"],               // absolutes found; empty when none
    "sense": "certain"                  // wish | certain | happened — which meaning the absolute carried
  },
  "verdict": "cut",                     // cut | keep | reword | move | shorten
  "target": null,                       // path and section for a move; null otherwise
  "would_write": null,                  // the exact sentence a move would add
  "why": "The same claim sits at the definition in schema.ts, where a reader meets it first.",
  "confidence": "high",                 // high when the tests decided it; low when judgment did
  "conflicts_with": [],
  "dense_routine": false                // true only for a kept comment longer than two lines
}
```

## The report

Ordered so the expensive findings arrive before the cheap ones.

1. **Contradictions.** Each names both sides and says which is likely wrong.
2. **Counts by verdict** — cut, shorten, reword, move, keep — with the
   proportion that came from a checked reach rather than an inferred one.
3. **The check counts**, which are the health signal rather than a work list:
   long function comments kept and where; absolutes by word and by sense;
   claims sitting in headings; rules with no dependent found.
4. **Patterns**, batched. The apply step goes by pattern rather than by item,
   so group items sharing a fix: "eleven comments restate a zod field's own
   rule." Each pattern names its members by ledger id.
5. **The torn items**, listed individually. The `confidence: low` entries, and
   the only ones needing a human to look at each.
6. **Coverage** — carriers enumerated, carriers classified, what was skipped
   and why. State the ratio plainly. "Deep-tested 7 of 849" is a usable report;
   an unqualified list of 7 findings reads as a clean bill of health.
7. **The offer.** Ask whether to apply now.

## Boundaries

**Will:**

- Read every carrier in the chosen extent and classify each claim it finds.
- Decide altitude by grepping for what depends on the claim, and say when a
  reach was inferred instead of checked.
- Name both sides of a contradiction.
- Write the sentence a promotion would add, so a conflict is visible before any
  document changes.
- Count the long comments it is keeping, so the engineer can judge the total.
- Report that a codebase is in good shape, when it is.
- Apply the proposals after the engineer approves them.

**Will not:**

- Edit anything before the report has been read and the offer accepted.
- Propose a file split, a new module boundary, a move between files, or a
  colocation convention. It classifies claims against the structure that exists.
- Treat promotion as the success case. A claim that becomes trivial once
  written out at project scope is a cut, and the report says so.
- Cut a comment that explains why something non-obvious exists, or that stops a
  reader from making a specific mistake. Those are the observations the skill is
  protecting.
- Strip hedging from a claim that is honestly uncertain, or strip an absolute
  that is reporting something that did not happen. Weakening an overstated rule
  is the job; manufacturing confidence is the opposite of it.

## Additional resources

- **[references/reduce.md](references/reduce.md)** — Pass A in full: the cut
  list, the shorten list, and the file-header pass.
- **[references/worked-examples.md](references/worked-examples.md)** — five
  claims carried through every test, including two the audit leaves alone.
- **`assets/enumerate.mjs`** — the carrier enumeration and census.
