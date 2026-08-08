<!--
The first paragraph has a fixed shape. Two sentences, and then the rest is yours.

  1. The fix or the feature first, then the situation that made it worth doing.
     "This PR fixes X, which broke Y whenever Z."
     "This PR adds X, which gives Y a way to Z."

  2. The mechanism, as a small story: we change A to do B, so that C — and D gains.
     "We write the Plan before the Offer, so that a failed second write leaves an
      Undecided Offer rather than a stranded one, and the writer can just Accept again."

Sentence 1 is where your research lands: it says what you concluded the problem was.
Sentence 2 says which systems are in scope. A reviewer who reads only these two
sentences should know what to open first.
-->

This PR …

<!--
Free-form from here. The lede opened a narrative — write it. Use `##` headings of
your own choosing. Say what you rejected and why, name the constraint that forced
a decision, and point at the file that carries it.
-->

## What it touches

<!--
The change tree, at a glance, and what you deliberately left alone.

  - `src/client/plan/` — the op builders and the writer, three files
  - `src/server/llm/tools.ts` — one tool signature
  - Every file in `src/client/components/`, except the vendored ones

This is also the question that leads into the checklist below: you have just listed
what changed, so ask what each change owes the docs.
-->

-

## Refs

<!-- `Closes #N` for the ticket this finishes. `See #N` for the arc it belongs to. -->

## Housekeeping

<!--
CI runs oxlint, `oxfmt --check`, the typecheck, and all four Vitest projects on
every PR, so nothing CI checks is on this list. Each box is something CI cannot see.

Leave a box unchecked only with a reason on the same line — `- [ ] … — n/a, no new
component.` An unchecked box with no reason reads as forgotten.
-->

- [ ] **Tests** cover the behaviour this PR changes. Say which project: `shared`, `client`, `worker`, or `stories`.
- [ ] **Stories** exist for each new or changed component, so the browser invariants in `.storybook/vitest.setup.ts` mount it.
- [ ] **Vocabulary**: each new or renamed term is in [`context.md`](../context.md), and the code, the UI, and the docs use that one word for it.
- [ ] **Docs** carry the change: [`docs/architecture.md`](../docs/architecture.md) says what is true now, a decision with a rejected alternative gets an ADR in [`docs/adr/`](../docs/adr/), and anything deferred goes to [`docs/later.md`](../docs/later.md).
- [ ] **Comments** state durable facts about the code. Nothing here narrates this PR — that belongs in the body above.
- [ ] **Migrations**: schema or binding changes have their generated types regenerated and committed.
- [ ] **Wayfinding**: if this PR belongs to a larger arc, its ticket in the wayfinding map (#5) says where the arc now stands.
- [ ] **Simplify**: ran `/simplify` over the diff.
- [ ] **Review**: ran `/code-review` from a fresh context, and its findings are on this thread or fixed in the diff.
