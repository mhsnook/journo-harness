# Worked examples

Five claims, each carried through the tests in `SKILL.md`. All five are real, and all five come from this repository as it stood on the `claude/issue-24-6ktvf9` branch, so the line numbers are that branch's rather than `main`'s.

Two of the five the audit leaves alone. That proportion is the point: an audit that cuts or moves everything it touches has stopped classifying and started tidying.

---

## A. A local observation the audit protects

**`src/shared/plan/apply.ts:90`**

```
// checkIds catches a repeated id at the final parse, but that refusal
// cannot say which op carried it. Claiming them here is what does.
```

| Test | Result |
| --- | --- |
| Delete | Something becomes unknowable. Without it, the id check below looks redundant against `checkIds`, and the next reader deletes it. |
| Reach | The lines under it. `checkIds` lives in `schema.ts`, but nothing there depends on this comment — the dependency runs the other way. Level `function`, checked. |
| Modality | Stated as a report, known as a report. No absolutes. |

**Verdict: `keep`.** Two lines, so it does not count toward the long-comment total.

*What this teaches:* the claim explains why code that looks redundant is not. That is the observation category the skill exists to defend, and cutting it would be a loss dressed up as a simplification.

---

## B. A fact stated at the use site, with nothing at the definition

**`src/shared/plan/ops.ts:72`**

```
/** A title may be empty, so neither side is nullable. */
```

**`src/shared/plan/schema.ts:63` and `:77`**

```
	title: z.string(),
```

| Test | Result |
| --- | --- |
| Delete | Something becomes unknowable, but not here. The reader who needs it is the one editing `schema.ts`, where a title's rules are defined. |
| Reach | Two files. `ops.ts:72` explains a decision in `ops.ts`, and the underlying fact constrains `schema.ts:63` and `:77`. Level `module`, checked. |
| Modality | Report, correctly stated. |

**Verdict: `move`.** The fact belongs where a title is defined, and a shorter line stays at the op.

`would_write`, at `schema.ts:63`: *"A title may be empty: the writer creates a node and then types into it."*

*What this teaches:* altitude is about where the reader who needs the claim will be standing, and that is usually where the thing is defined rather than where it is used. Note what the audit does **not** do here — it does not propose a file header, a module doc, or a new home for either file. One fact, one definition site, one line.

---

## C. A claim riding on a heading, with the wrong count under it

**`docs/architecture.md:121`**

```
- **One spelling per state.** A field that may be absent says "nothing here" by being absent,
  and never also by an empty string or an empty list — the blob is written whole, compared
  whole-field by a Proposal's `expected`, and sent whole in every prompt pack, so a second
  spelling is a second Plan for the same content. Two fields carry their key always and say
  "nothing here" with a value: a Reference's `nodeId`, which is null until it is placed, and
  the Article's `adjectives`, which is the empty list.
```

| Test | Result |
| --- | --- |
| Delete | The rule is real and reaches across modules. Not a cut. |
| Reach | `schema.ts`, `ops.ts`, and `apply.ts` all obey it, and any future Plan consumer will. Level `project`, checked. Already at the right altitude. |
| Modality | The bold lead-in carries the claim, so it could mean *we tend to*, *we want to*, *we do*, or *it is a bug when we do not*. Marker `never` found, but the consequence is attached to it, so the sentence explains itself. |

**Verdict: `reword`,** and the count is a separate contradiction.

`would_write`: *"A field that may be absent says 'nothing here' by being absent, and not also by an empty string or an empty list."* The bold lead-in becomes a topic marker rather than the claim.

`conflicts_with`: `src/shared/plan/schema.ts` — the bullet enumerates two fields that always carry their key, and there are three. `children` is required on every Outline node, and an empty list is how a leaf says it has none.

*What this teaches:* two things. A `never` with its consequence attached is doing its job, so the audit records the marker without demanding a rewrite for it — the heading is the defect, not the word. And a promotion done long ago can still be wrong: this claim is at the right altitude and is still misinforming everyone who reads it, because the enumeration under it is incomplete.

---

## D. A pointer that also restates its target

**`src/server/index.ts:1`**

```
// Nothing here parses a token, and nothing may require the
// Cf-Access-Jwt-Assertion header — docs/architecture.md §9.
```

**`docs/architecture.md:312`**

```
**Nothing in 1a may require the `Cf-Access-Jwt-Assertion` header.** Localhost has no Access
gate at all, so in development there is no header and no gate. Read it if present, tolerate
its absence, and build no dev stub for something 1a does not use.
```

| Test | Result |
| --- | --- |
| Delete | The rule survives in §9, so nothing is lost from the record. What is lost is the warning, at the one file where somebody would add token parsing. |
| Reach | Project. The comment cites the doc that carries it, so the altitude is already resolved. |
| Modality | `nothing may require` is an absolute, but it is borrowed rather than asserted: the comment names §9, and §9 gives the reason. The audit checks the target instead of the comment. |

**Verdict: `keep`, confidence `low`.** This one goes in the report's torn list.

The case for trimming: the second clause restates §9, so the rule now has two spellings, and the pointer alone would carry it. The case for keeping: `src/server/index.ts` is exactly where a reader would add the thing the rule forbids, and a bare pointer is easy to skip.

*What this teaches:* a claim that cites its source is a different object from a claim that asserts on its own authority, and it is judged by its target. It also shows what a genuinely torn item looks like — the audit states both cases and hands the decision on rather than guessing.

---

## E. A claim that is false in its own file

**`src/shared/plan/schema.ts:9`**

```
// `.min(1)` throughout, so that a field carries one spelling of "nothing here"
// rather than two — §4.
```

| Test | Result |
| --- | --- |
| Delete | The rule is real, and §4 carries it. What this line adds is the local application. |
| Reach | The file. Correctly placed as a file header. |
| Modality | Report, correctly stated. The defect is the content rather than the strength. |

**Verdict: `reword`.** `throughout` is false — `title` at `:63` and `:77` has no floor, and it is the only string in the file without one.

`conflicts_with`: `src/shared/plan/schema.ts:63`, in the same file, eleven lines apart.

*What this teaches:* the cheapest contradiction to find is the one between a comment and the code beneath it, and it is also the most dangerous. A reader who trusts this line will add `.min(1)` to `title` and break node creation. It pairs with example B: the fact that would have stopped them is the one missing from the definition.
