# Later

Product ideas kept out of v1. Nothing here is planned, scheduled, or designed. They are
recorded so they are not lost, and each one is small enough to pick up cold.

These are what survived `docs/ux-outline.md`. Everything else in that document has
either been settled in the map (#5) and its tickets, or has moved into the mockups.

## Public showcase

A portfolio page at a per-person path, off by default and switched on in settings, listing
published work — pieces written here and pieces backfilled from before the app existed.
The writer chooses which ones show. Possibly part of v2, possibly a side project.

Two things it needs that the app does not:

- **A public surface.** Cloudflare Access is scoped by hostname and path, so this page
  needs its own hostname or a path the Access policy exempts. It can still be served by
  the same Worker, reading published records from D1.
- **A shape for a backfilled piece.** Whether that is a full Article or a lighter
  published-work record is open, and the showcase is the first thing that needs an answer.

Rendering it per request is one Hono route over a small D1 query. Generating the page when
the writer marks a piece published is also viable, since publishing is rare and
deliberate. Decided in #15 that neither justifies TanStack Start across the whole app.

## Arc note

An optional piece-level free-text description of the pacing and emotional shape of the
whole Article, in the writer's words. From the outline, kept verbatim because the example
carries the idea:

> "start exciting; the data lives mostly in the middle but threads throughout; finish by
> bringing the three personal anecdotes back with the update about pending action."

The Guide would read the Draft against the arc note the same way it reads Sections
against intent notes, and Plan mode would co-write it like everything else in the Plan.

## Review lenses

Settled and built, in a smaller form than the outline drew. The writer types what a Review
should look for and may save that prompt as a **Skill**, which is the lens. What is still
deferred is a Skill that rewrites text: nothing in 1a, 1b, or phase 2 has the model writing
prose, so a routine that edits the Draft has nothing to act on.

## The Beat

A subject a writer covers over time, holding the research they build up on it. An Article
would draw on its Beat and add back to what it holds, leaving the Article's own research
small enough for a Chat turn.

Today an Article is its own Beat, and nothing has to choose between them. The Beat earns a
design the moment research accumulates across Articles and a writer wants the second piece
on a subject to start from what the first one turned up. Where that material lives is the
open half of #40, and this is the shape it might take.

## Exemplar pieces

The app already knows what the writer has published. This would let them point at one and
say what it is an example of — a voice, an adjective, an arc — so the House learns from
work the writer already rates rather than only from what they can describe in the
abstract.

## Copy-edit pass

A line-editing pass over the Draft, producing suggested edits the writer accepts or
declines one at a time, applied to the prose itself. This is the one idea here that has
the model writing text, which is why it is out of v1 rather than merely unscheduled.

## Transition word-count attribution

Transitions are the connective prose between two Sections and belong to neither, so
per-Section word counts currently have nowhere to put them. This would attribute those
words somewhere the writer can see, rather than leaving a Section's count quietly
incomplete.

## Soft word-count distribution

The Plan stores a total and node targets, and nothing derives one from the other, so a
writer who has stated a total and one Section's length sees the rest as unallocated. This
would show them the piece as it would shake out if the remainder were spread evenly across
the Sections that state nothing, as a suggestion they Accept rather than as a value the
Plan holds. They then build specificity where they want it and leave the rest soft.

The reason it is not built: the shape only becomes clear once the Plan Panel is something
to touch. ADR 0002 records why auto-distributing silently is rejected, and that still
holds — this is the version the writer rules on.
