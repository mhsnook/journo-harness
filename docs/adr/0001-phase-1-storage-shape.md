# Phase 1 storage: the Plan in Agent state, the House in party-db over D1

Status: accepted

Phase 1 splits into two stages of usefulness. **1a** is the Chat and the Plan, which is
worth looking at on its own. **1b** adds the House — the Lexicon, the Skills, the standing
rules, the House-scoped Tone decisions, and the article index — which is only worth
having once 1a exists. Phase 2 is the Draft and the Guide.

Three homes carry it:

- **One Article Agent per Article**, holding that Article's Chat, its Plan, and later its
  Notes. Arrives in 1a.
- **The House** lives in a single party-db room, persisted to D1, holding everything that
  spans Articles. Arrives in 1b.
- **Plain D1 tables** for Archived Plans, Drafts, and Finals, read through a Worker
  endpoint rather than synced. Arrives with archiving.

## The Plan lives in the Article Agent's state

The Cloudflare Agents SDK already carries the shape a plan-sized artifact needs.
`setState` persists the state to `cf_agents_state` and broadcasts `cf_agent_state` to
every connection; a client may push state back up the same socket; and
`validateStateChange(nextState, source)` is the seam for a schema check on a client write.
So 1a needs no store beyond the Agent, no second connection, and no write path of its own.

## The House lives in one party-db room, persisted to D1

A Durable Object's SQLite belongs to that one object, so an Article Agent cannot hold
anything that spans Articles. The House is small, it is read constantly, and it is exactly
CRUD over a handful of collections — which is what party-db is. Defining those collections
is the whole API: no endpoints, no query keys, no invalidation, and the writer's two
clients stay in sync for free.

**This does not contradict #8.** That ticket rejected party-db's D1 adapter because
`snapshot()` and `replaySince()` carry no room filter, so rooms sharing a database read
each other's rows. The House is exactly one room, so the defect cannot fire. The finding
stands; its consequence does not reach this case.

D1 underneath also settles the backup story the map had open: a Durable Object's storage
has no export path, and D1 has `wrangler d1 export`.

## Archived material stays out of the sync layer

Archived Plans, Drafts, and Finals grow without bound and no client needs them resident,
so they live in plain D1 tables behind a read endpoint. Only the Chat goes to cold storage
in R2, which is why un-archiving restores a conversation rather than an Article.

## Considered options

**party-db from the first commit.** Rejected for 1a, because while the only artifact is a
Plan it adds a Durable Object, a WebSocket, and a write path for nothing. It becomes the
right tool the moment 1b's House material exists.

**Raw D1 behind hand-written endpoints for the House.** Rejected once the House turned out
to be live, reactive, per-writer material rather than an occasional read. party-db gives
the same D1 persistence plus sync, for a config file instead of an API layer.

**Agent state for everything, forever.** Rejected because Agent state is a whole-blob
replace. A Draft stored in Blocks and written at typing speed would serialize the whole
document per keystroke.

## Consequences

- **Two Durable Object classes exist from 1b onward**, so phase 2 adds the Draft to a
  party-db setup that already runs rather than standing one up.
- **1a has no article index**, because the index lives in the House. Articles are
  addressed by ID in the URL until 1b arrives.
- **Every Plan node carries a stable ID from the first commit** — Outline nodes,
  references, quotes, and each scoped Tone decision, with children referring to parents by
  ID rather than by position. This makes the phase 2 move a projection of the blob into
  rows rather than a rewrite of every reference in the Plan.
- **Proposal staleness is required in 1a.** It comes from the gap between generating a
  Proposal and applying it, and that gap exists with one writer in one tab, because
  inference is slower than typing.
- **The server surface stays thin** — the Agents SDK chat route, party-db's lobby and
  write path, archived reads, and export. #15 decides what serves them.
- **Notes are per-Article, so they land in the Article Agent** with the Chat and the Plan,
  not in the House. Reviews accumulate in numbered Rounds, so this is history rather than
  current state, and Agent state may be the wrong shape for it. Open until the Notes Pane
  is designed.
