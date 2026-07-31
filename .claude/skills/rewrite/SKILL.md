---
name: rewrite
description: Rewrite a passage to be clearer and more consistent without changing its meaning or voice — one name per concept, grounding words kept, concrete referents, one claim per sentence, no hype. Use when asked to rewrite, clarify, tighten, de-jargon, or clean up a piece of text.
---

# Rewrite

Rewrite the target text so it reads clearly on the first pass and holds up over
a long technical read. Preserve the meaning and the author's voice. Fix clarity
and consistency only — this is not a rewrite of what's being said, just how.

## Scope

Operate on the text the user points at — a selection, a paragraph, a file, a
message. If none is given, ask what to rewrite. Return the rewritten text; don't
apply it in place unless asked.

## What to change

- **One name per thing.** Pick one term per concept and use it throughout.
  Collapse rotated synonyms for a single thing or action into one.
- **Restore grounding words.** Put back the qualifiers that separate levels of
  abstraction — the auth *module* vs the auth *call* vs auth the *concept* — where
  brevity dropped them and left the referent ambiguous.
- **Anchor vague referents.** Replace "that part" / "somewhere in there" with the
  concrete thing — a path, `file:line`, a symbol, a named section.
- **One claim per sentence.** Split compound sentences. Break a long sentence
  rather than nesting clauses.
- **Lists for sequences.** Pull 3+ steps, options, or findings out of prose into
  a numbered or bulleted list.
- **Active voice, plain tenses.** Prefer an explicit actor and simple tense.
- **Cut hype.** Remove selling, inflation, and framing devices ("the core
  insight is…"). State the thing.

## What to leave alone

- The author's meaning, argument, and conclusions.
- Their voice and register — don't flatten it to robot-neutral.
- Hedges that are honest. If the original marks something uncertain, untested,
  or estimated, keep that mark; don't sand it into false confidence.
- Domain terms of art. Don't paraphrase a precise term into a vague synonym.

## Output

- The rewritten text.
- If any change isn't self-evident — a term renamed for consistency, a claim
  split, a dropped qualifier restored — a short bulleted note of what and why.
  No hype.
