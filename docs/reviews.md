# Reviews and Notes

What the feature is and how it behaves. The cross-module rules it has to obey
are [`architecture.md`](./architecture.md) §12; the words are
[`context.md`](./context.md).

## The loop

The writer types what a Review should look for and runs it. The Guide reads the
Draft against the Plan and writes back a **Round** — a response the writer reads
top to bottom. Each Round carries **Notes**: short markers pinned to a place in
the piece. The writer accepts or declines each one, and resolves an accepted one
once they have dealt with it.

No transcript accumulates between Reviews. Each is handed only the Draft, the
Plan with its References, the writer's prompt, and the Notes accepted from
earlier Rounds. The Notes Panel is one ask and one answer, not a conversation.

## A Round is a written response

Its body is an ordered run of **passages**, each a passage of the Guide's prose
and then the Notes that passage produced. The prose carries the argument, so a
Note can be short — roughly 15 to 35 words, because the writer has just read the
case for it.

The Notes Panel shows the same rows flattened into a queue. Ruling in either
place is one write, because both draw the same rows.

## Depth

`quick` or `thorough`, chosen beside the composer. It changes the reviewer's
instructions and nothing else — the writer's own prompt still does the finer
steering.

## Anchors

A Note points at the whole piece, one Section, or a run of Blocks. A run means
the span from its first Block to its last; the Guide names the ends, and the
stored anchor carries every Block in the span.

Anchors are **stored as ids and read as positions**: the record holds a Block id,
and the card shows "¶3". The ids survive the prose moving; the positions do not.

An anchor is settled once, when the Note is written, against the Plan and Draft
the model was shown. One naming something that was never there falls back to the
whole piece. A Block deleted later drops out of the run and the rest still hold,
so a Note on ¶3–¶5 reads as ¶3–¶4 once ¶5 goes. A Note whose every Block is
gone, or whose Section is, reads as orphaned — the writer may undo the deletion,
and the Note is still theirs to resolve.

## Dispositions

- **proposed** — what the Guide wrote.
- **accepted** — the writer means to act on it. This is what they still owe the
  piece, and what the next Review is told about.
- **declined** — ruled out.
- **resolved** — an accepted Note they have dealt with. Hidden until asked for.

Restoring undoes the last move. Each settled disposition has exactly one place it
came from, so undoing needs no history.

**A Review is told about the accepted Notes only.** Re-raising something the
writer is already working on is noise. Whether it should also see the declined
ones is open — the current answer is no.

## Skills

A saved review prompt, picked from the composer. It belongs in the House, which
arrives at 1b; until then it lives in `localStorage`, so a Skill saved on one
machine is not on the other.

## What a Review reads

The Draft as it was last saved. The Draft's flush lives inside the Draft Panel,
so a Review run mid-keystroke can miss the last sentence. The Notes Panel numbers
its anchors off the same read, so "¶3" on a card is the paragraph the model saw.

## Not built

Streaming (#77), scoping a Review to one Section (#78), notes drawn beside the
prose (#81), the last-save gap (#82), and grouping the queue by Section (#83).
