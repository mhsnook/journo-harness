# The Draft is a ProseMirror document, and the Guide draws over it rather than in it

Status: accepted

The Draft is one continuous text the writer edits for hours, stored as one party-db row per
Block. Around it the Guide has to show things that are not prose — a note beside a
paragraph, a section break it suggests, a passage someone commented on. This decides what
the writing surface is built on, and where each of those things lives.

Resolved on #14, which held a prototype of both candidate layers. #7 fixed the Block shape
and #6 retired the previous argument for ProseMirror when the tracking model left v1 scope.

## The editor is ProseMirror, reached through TipTap

**Decorations are the reason.** A widget decoration renders DOM at a position the document
does not contain, and is re-mapped as the text moves. A section break the Guide proposes is
exactly that: visible between two Blocks, absent from every stored row, gone if the writer
ignores it. Nothing else considered can draw at a position that is not in the text.

Position mapping is the second half, and is what would let a note anchor to a phrase rather
than a paragraph. v1 anchors at paragraph range, so this is a door kept open rather than a
v1 need — but it is the same machinery, at no extra cost.

**TipTap over bare ProseMirror**, on cost alone. `StarterKit` carries the marks and
keymaps, and `UniqueID` reproduces the Block-id contract that otherwise wants a hand-written
`appendTransaction`, split and merge handling included. Bare ProseMirror stays reachable:
`ProposedBreaks` in `src/client/draft/annotations.ts` is a raw ProseMirror plugin.

**Rejected:** a plain textarea with computed offsets, which has nowhere to put a Proposal
and no mark to anchor a comment to; CodeMirror, whose document is text rather than a node
tree, so headings and section breaks would be encoded into the prose and durable anchors
would live in a side table that goes stale on every offline edit. **Lexical was not
prototyped** — it was judged against the requirements rather than tested against them, and
that is the softest part of this decision.

## A Proposal is a decoration; an accepted annotation is a mark

This is the line the rest of the Guide's output is built against.

**A Proposal is never in the document.** It is drawn from state, so it does not sync, does
not reach the Final, and dies with the Block it points at. That matches what a Proposal
already is: it lives in the turn that made it, goes Stale, and leaves no record. Accepting
one is the single transaction that puts a real node in its place.

**A comment is a mark, and has to be.** The writer can rewrite a paragraph in a session
that never rendered the Notes Panel, and only a mark moves with the text as a property of
the document rather than of the view. An anchor stored as a character offset would have to
be re-found on load, which is the problem the Block shape was chosen to avoid.

**A comment is therefore not a `block_id` anchor.** It is a set of marked runs, which can
span several Blocks and can have gaps.

- **Its target is the span from its first marked position to its last**, so a paragraph the
  writer adds in the middle of a commented passage belongs to it. The alternative, the union
  of the runs, renders one comment as two disjoint things.
- **Orphan detection differs by note type.** A Guidance note anchored to a Block is orphaned
  when that row dies, which is a key lookup. A comment is orphaned only when every Block
  carrying its mark is gone, which is a scan of the content.

## The writer types the structure

Headings and section breaks are the writer's. Boundaries are inferred, so nothing can place
a title automatically — both claims cannot hold, and writer control is the tiebreaker. A
heading the writer typed is then the strongest boundary hint available, so inference gets
easier rather than harder.

## Consequences

- **The comment mark needs `inclusive: false` and `keepOnSplit: false`.** They guard
  opposite edges. Without both, prose written beside a comment silently joins it. Text typed
  _within_ a marked run does join it, and should: the alternative shatters a comment
  whenever the writer fixes a typo inside it.
- **A widget decoration needs `stopEvent`.** Otherwise pressing a button on one makes the
  editor recompute the decorations and rebuild the button between mousedown and mouseup, so
  the press never lands. Every affordance drawn over the Draft meets this.
- **The schema must carry the comment mark before any Block is stored.** Content holding a
  mark the schema does not know is dropped when it is parsed, so registering it later means
  the Drafts written in between cannot be read back.
- **`ord` is a float midpoint and exhausts precision after roughly fifty splits in one
  gap.** A Draft that reaches it needs base-62 string indices. `assignOrds` is the only
  place that would change.
- **Nothing is persisted yet.** The Panel holds the document in memory, and party-db arrives
  with phase 2. `toRows` is the shape the sync layer takes, and is tested ahead of it.
