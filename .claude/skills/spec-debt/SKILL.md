---
name: Spec Debt Audit
version: 0.1.0
description: 'Read-only audit of a codebase for specification debt — claims that live at the wrong altitude (a cross-module rule buried in a code comment, or a local note promoted into a project doc) and claims stated more strongly than they are known ("never do X"). Produces a ledger and a report; edits nothing and asks nothing. Triggers: audit spec debt, find spec spaghetti, are our comments over-specified, why do the docs disagree with the code, despecify this codebase.'
---

# Spec Debt Audit

A codebase accumulates claims. Some are specifications: they constrain one piece of work for the benefit of other work, or of a future self. Some are observations: they report what is true, or explain why something odd exists, and they support the reader without constraining them.

**Spec debt is an observation that got promoted into a specification by accident.** It happens through wording — a note phrased as a law — and through placement — a local remark sitting where a cold reader will read it as a rule. Two effects follow, and both are expensive:

- A rule buried in a code comment is invisible to anyone who does not open that file, so it constrains work without ever being read.
- A rule stated more strongly than it is known steers the next reader away from a direct solution. They work around a constraint that was never real, and the workaround becomes the next false constraint.

The result gets blamed on spaghetti code. It is usually spaghetti specification.

**The goal of this skill is to reduce specification.** Not to document more, and not to move everything upward. It separates specifications from their supporting observations, so that observations support without constraining, and specifications sit where the work that must obey them will read them.

This skill is the **audit phase**. It reads, classifies, and reports. It edits nothing and it asks nothing.

## Where the audit sits

The full process is a loop:

1. **Audit** — classify every claim, propose a verdict. *This skill.*
2. **Resolve** — put the proposals to the engineer, batched by pattern, and apply what they agree to.
3. **Re-read** — check whether the docs still make sense now that claims have moved into them.
4. Return to step 1.

Step 3 is the point of the loop rather than a tidy-up after it. Promoting claims into a document is what makes contradictions visible: two comments that never met each other become two sentences on one page, and one of them is wrong. That clash is where over-specification and drift get found.

Because of that, the audit must record **the sentence a promotion would write**, not only that a promotion is proposed. A conflict is much cheaper to see before the doc is edited than after.

Steps 2 and 3 are not built yet. The audit's report is written so that they could be.

## The two axes

A claim can be defective in two independent ways, and they have different fixes. Keep them apart, or the audit will move claims it should have reworded.

### Altitude: where the claim lives, against how far it reaches

This is a searchable question, not a matter of taste. Grep for the symbols the claim names and see what depends on it.

| How far it reaches | Where it belongs | Test |
| --- | --- | --- |
| Nothing — the type or the code already says it | **Cut** | Delete it. Does anything become unknowable? |
| The lines below it | The function comment | Only this function breaks if a reader ignores it |
| A named sibling in the same file, or in a neighbouring file | The function comment, naming the sibling | One function depends on one other |
| Several functions in one file | The file header | Three or more call sites, or a reader entering the file anywhere would need it |
| Several files in one folder | A module `architecture.md` | Two or more files share the rule and the project doc does not carry it |
| Across modules | The project `architecture.md` | A file outside this folder breaks if the rule is ignored |

Four qualifications, because the ladder is a default and not a policy:

- **A long function comment is allowed.** One or two lines is the preference. A genuinely dense routine — a tuned inner loop, or the rare ball of wax that has to live in one method — earns a longer one. The audit counts these rather than flagging them. Ten in a codebase is a fact about the work. Fifty is a question about the work, and the count is there so the question can be asked.
- **A one-to-one bridge stays a comment.** A note on one function that names one function in another file is the right shape and does not get promoted, even though it crosses a file boundary. Promoting it would inflate a file header or a module doc with something exactly two functions care about.
- **A run of short functions relaxes the file rule.** Five three-line functions that share an assumption do not need a file header. Say it once on the first one, or on the one that would break.
- **The audit does not impose file structure.** It never proposes splitting a file, moving a function, creating a module boundary, or adopting a colocation convention. It classifies the claims it finds against the structure that exists.

### Modality: how strongly the claim is stated, against how strongly it is known

A claim can sit at exactly the right altitude and still be phrased as law when it is a report. The fix is a rewrite in place, not a move.

**Never say never.** A "never" almost never earns its place. It states a prohibition without the reason for it, so the next reader cannot tell whether their case is the exception. Two replacements carry more and constrain less:

| Instead of | Write | Because |
| --- | --- | --- |
| "Never call this on the server." | "Calling this on the server would break X, which assumes Y." | The reader can now tell whether their case breaks X |
| "Never use Z." | "We do not currently use Z, so this is fine." | The reader learns the scope, and can widen it if they need to |

The same applies to "always", "must never", "the only way", and any absolute with no consequence attached. These read as marketing rather than as engineering, and a later reader who trusts them will route around a constraint nobody meant to impose.

**A claim has to be a sentence.** A heading or a bolded lead-in cannot carry modality, so the reader has to guess it. Take a real one from this repo:

> **One spelling per state.**

That can mean four different things — we tend to do this, we want to do this, we do do this, or it is a bug when we do not — and each one licenses different work. Headings name the topic that is coming. Sentences carry the claim. When the audit finds a claim in a heading, it proposes the sentence.

**Prefer a report to a rule.** "The applier works on a copy" is a report and costs nothing if it becomes untrue. "The applier must work on a copy" is a rule, and it is worth writing only when something else depends on it. Where the audit cannot find the dependent, it proposes the report.

## Two findings worth more than the rest

**A contradiction** — a claim in the code that disagrees with a claim in the docs. This is a defect in the knowledge rather than a matter of style, and one of the two is actively misleading someone right now. Report these first.

**A duplicate** — the same claim stated in two places. One is redundant. This is a cut, not a promotion, and the surviving copy belongs wherever the thing it describes is defined.

## Process

1. **Read the project's own documents first**: `README`, `CLAUDE.md`, `AGENTS.md`, everything under `docs/`, and any module-level architecture doc. Build an inventory of what the project already specifies. Without it, every code comment that restates a documented rule reads as a promotion candidate when it is a duplicate.
2. **Enumerate the carriers.** Doc files, file headers, class and function comments, inline comments, comments attached to types and schemas. Skip generated files, vendored code, and lockfiles. Note what was skipped in the report.
3. **Extract the claims.** Not every comment is one. A claim asserts that something is true, required, or forbidden. A `TODO`, a link, a section marker, and a commented-out line are not claims, and they are out of scope.
4. **Run the delete test.** Remove the claim mentally. If the type signature, the schema, or the code below it already says the same thing, the verdict is `cut`.
5. **Run the reach test.** Grep the symbols the claim names. Record the call sites and file paths as evidence, and mark whether the reach was checked or inferred. This is what decides altitude, and an unchecked reach is worth much less than a checked one.
6. **Run the modality test.** Find the absolutes, the headings carrying claims, and the rules with no dependent.
7. **Cross-check against the inventory** from step 1 for duplicates and contradictions.
8. **For every proposed move, write the sentence it would put in the target document** — then check that sentence against what the document already says. Record any disagreement as a conflict.
9. **Write the ledger, then the report.** The ledger is the machine-readable record the later phases read. The report is what the engineer reads.

## The ledger

One JSON file, one entry per claim. Write it to the scratchpad rather than into the repo, since the audit is read-only.

```jsonc
{
  "id": "c-014",
  "file": "src/shared/plan/ops.ts",
  "line": 70,
  "text": "A title may be empty, so neither side is nullable.",
  "carrier": "function-comment",       // doc | file-header | function-comment | inline | type-comment
  "reach": {
    "level": "file",                   // none | function | sibling | file | module | project
    "evidence": ["src/shared/plan/schema.ts:78"],
    "checked": true                    // false when the level is inferred rather than grepped
  },
  "modality": {
    "stated": "rule",                  // rule | report | ambiguous
    "known": "report",
    "markers": ["never"]               // absolutes found in the text; empty when none
  },
  "verdict": "cut",                    // cut | keep | reword | move
  "target": null,                      // path and section for a move; null otherwise
  "would_write": null,                 // the exact sentence a move would add
  "why": "The same claim sits at the definition in schema.ts, where a reader meets it first.",
  "confidence": "high",                // high when the tests decided it; low when judgment did
  "duplicate_of": "c-009",
  "conflicts_with": [],
  "dense_routine": false               // true only for a kept comment longer than two lines
}
```

## The report

Ordered so the expensive findings arrive before the cheap ones.

1. **Contradictions.** Each one names both sides and says which is likely wrong.
2. **Counts by verdict** — cut, keep, reword, move — with the proportion that came from a checked reach rather than an inferred one.
3. **The check counts**, which are the health signal rather than a work list:
   - Long function comments kept, with the files they sit in.
   - Absolutes found, by word.
   - Claims sitting in headings rather than sentences.
   - Claims stated as rules with no dependent found.
4. **Patterns**, batched. The resolve phase asks by pattern rather than by item, so the report groups the items that share a fix: "Eleven comments restate a zod field's own rule." Each pattern names its members by ledger id.
5. **The torn items**, listed individually. These are the `confidence: low` entries, and they are the only ones that need a human to look at each one.
6. **Coverage** — what was read, what was skipped, and why.

## Boundaries

**Will:**

- Read the whole codebase and every document, and classify each claim it finds.
- Decide altitude by grepping for what depends on the claim, and say when a reach was inferred instead of checked.
- Name both sides of a contradiction, and both copies of a duplicate.
- Write the sentence a promotion would add, so a conflict is visible before any document changes.
- Count the long function comments it is keeping, so the engineer can judge the total.
- Report that a codebase is in good shape, when it is.

**Will not:**

- Edit any file, stage any change, or ask the engineer any question. Those belong to the resolve phase.
- Propose a file split, a new module boundary, a move between files, or a colocation convention. It classifies claims against the structure that exists.
- Treat promotion as the success case. A claim that becomes trivial once written out at project scope is a cut, and the report says so.
- Cut a comment that explains why something non-obvious exists, or that stops a reader from making a specific mistake. Those are the observations the skill is protecting.
- Strip hedging from a claim that is honestly uncertain. Weakening an overstated rule is the job; manufacturing confidence is the opposite of it.

## Additional resources

- **`references/worked-examples.md`** — five claims from this repository, carried through every test, including two the audit leaves alone.
