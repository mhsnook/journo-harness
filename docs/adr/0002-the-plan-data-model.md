# The Plan is a nested tree in one blob, with References flat beside it

Status: accepted

The Plan is 1a's whole artifact, held as one JSON blob in Article Agent state and replaced
wholesale on every write. Its shape has to serve two callers at once — `validateStateChange`
guarding client writes, and `generateObject` constraining what the Chat may propose — and
it has to project into party-db rows at phase 2 without a rewrite.

```
plan: {
  title, totalTarget,
  voice, adjectives: [],
  outline: [ { id, title, intent?, target?, voice?, adjectives?: [], children: [] } ],
  references: [ { id, provenance, text?, source?, nodeId, note? } ],
}
```

## Why a blob at all, now that the Plan is this structured

#13 put the Plan in Article Agent state on the grounds that 1a would then need no second
store. **That argument has expired** — Offers arrive in 1a as SQLite rows, so the Article
Agent already has both.

The argument that replaces it: **the blob is the reactive store and the tables are the
on-demand store.** Rows in a Durable Object's SQLite have no sync, and `@callable` RPC is
request and response, so nothing tells a client that a row changed. That suits Notes,
Rounds, and Offers, which are read when the writer opens a Panel. It does not suit the Plan,
which is on screen continuously and edited constantly — holding it in rows means
hand-writing the broadcast, the client cache, and the invalidation. `setState` gives all
three, plus optimistic local echo and a single schema-check point in `validateStateChange`.
Two smaller things follow the same way: every context pack sends the whole Plan to the
model, so a blob is already the payload shape, and a multi-op Proposal applies as one
`setState` rather than a transaction plus a hand-written broadcast.

**If this is revisited, the alternative is not raw rows.** It is composing party-db into the
Article Agent, which #18 proved works — reactive rows without reopening #13's grain, since
the collections would live in the per-Article object rather than a new one. That costs about
120 lines of forked party-db glue and makes the client discriminate frames on the
multiplexed socket. Below the size ceiling the blob is less work; above it, it is not.

**The migration is bounded but not free.** The decisions below buy it: stable IDs
everywhere, parents by containment, References already row-shaped and carrying Provenance.
What they do not buy is the read sites — every `plan.outline.map(…)` becomes a query.

## The Outline is a nested tree, ordered by array position

Nesting is the natural shape for a JSON blob and for a model emitting structured output,
and it makes orphans and cycles impossible rather than merely invalid. It does not
reference nodes by position — it contains them — so the stable-ID rule holds.

Fractional order keys were considered and rejected for now. They would earn their place if
a Proposal needed them to survive a concurrent insert, but a Proposal saying
`{parentId, afterId}` already names nodes by ID and is stable under array ordering. What
order keys genuinely buy is cheap reordering in a row store, which is phase 2, and they can
be added during that migration.

## References are flat, and `nodeId` is null until one is placed

An Accepted Reference may sit at an Outline node or nowhere yet, and the Ledger shows
"accepted, no section yet" as its own group. Nesting References under nodes would leave
the unplaced ones homeless, forcing a second bucket and one entity in two shapes. Flat
also makes moving a Reference between Sections a single field, and projects to one table
with a nullable `node_id`.

**The key is always present and null when unplaced**, rather than optional. Unplaced is a
state the Ledger groups by, not an absence, and a blob written whole should not carry two
spellings of it. The schema also rejects a `nodeId` naming a node the Outline does not
carry, so deleting a node unplaces its References in the same Proposal.

## Provenance names what kind of thing a Reference came from

`{ kind: 'offer', offerId }` for a Reference copied from an Offer, and `{ kind: 'writer' }`
for one the writer typed in. The writer case has to be sayable: a Reference reaching the
Plan without passing through the Chat is ordinary, and the Ledger deduplicates on
Provenance, so "came from nowhere in particular" needs a name rather than an empty field.

It is a flat object with a `kind` rather than a discriminated union, because `generateObject`
handles a flat object more reliably than an `anyOf`. The pairing rule — `offer` names an
`offerId` and `writer` names none — is a refinement instead.

## A Quote is a Reference that carries a text

One structure, not two. It holds a `text` — a passage pulled from the source, whether a
quotation, a clip, or a key pullout — or a `source` — the attribution, each field optional
inside it because a book has no url and a leaked memo has no author. **At least one of the
two is present.** The Plan Panel's separate "References" and "Quotes" counts are a display
filter.

**Consequence:** three quotes from one publication carry three copies of the attribution,
so correcting a year is three edits. This is the same denormalisation #11 accepted when it
chose copy-with-Provenance.

## Voice replaces, Adjectives compose

A Voice is the register the writing is in, and one applies at a time: the nearest Scope
wins outright, because blending two registers makes mud rather than a third register.
Adjectives are descriptive terms that accumulate within a Scope and across Scopes, so a
funny piece can have a somber middle that still carries a few jokes.

**A repeated Adjective moves to the nearest position** rather than holding the widest one.
Order is the only locality the Guide reads from a flat list, so a node restating a House
term reads as local emphasis: House `warm, plain` under a node saying `warm` resolves to
`plain, warm`. The cost is that the list reorders on the edit that introduces the repeat,
which moves the Plan inside the cacheable prompt prefix — but that edit changed the Plan's
content anyway, so the prefix was missing regardless.

Resolution runs House, then Article, then Outline node, and happens **at read time**. A
node's ancestors take part in that same order, so a subsection under a somber middle is
somber unless it says otherwise.
Storing resolved values would mean re-walking every node whenever the Article's Voice
changes, inside a whole-blob write, and it could silently drift. In 1a the Plan carries
Article and node Scope only; the resolver takes House terms as an argument defaulting to
empty, so 1b adds an argument rather than changing the shape.

## The word-count total is stored and nothing is derived

The total is a decision that usually predates the outline, often from the commission, so
deriving it from node targets would stop the writer stating it until they had planned. Node
targets are optional and routinely incomplete mid-planning, so a sum invariant would fire
constantly during normal work.

**The parts are allowed to disagree with the whole.** The gap is information — "1,400
unallocated", "300 over" — and it is the only thing connecting them. Auto-distributing the
remainder across untargeted nodes is rejected: it invents decisions the writer did not
make. A Review may propose target adjustments, through the same Proposal shape as the Chat.

## A Proposal is a list of ops, applied all-or-nothing

```
proposal: [
  { op: 'createNode', parentId, beforeId, node: { id, title, intent } },
  { op: 'setTarget',  nodeId, expected: null, value: 400 },
]
```

`expected` generalises #17's `old_text`: still content-addressed, naming the value the
Proposal thinks is there rather than a version counter, but no longer string-only.
Comparison is **whole-field**, because Plan fields are short — #17's `str_replace` substring
form stays reserved for the Draft, where whole-field comparison would refuse almost
everything.

Structural ops anchor on IDs and carry no `expected`, because inserting after §2 stays
meaningful when a sibling changes elsewhere and is only meaningless if §2 is gone.
**Exactly one of `afterId` or `beforeId`**, so the model anchors to whichever neighbour its
insertion relates to: a section leading into §3 says `before: §3` and survives §2 being
deleted. `afterId: null` means first child and `beforeId: null` means last child, and
neither names a sibling so neither can go stale. `moveNode` takes the same pair. Op names
lift from #1's typed document-operation API, now applied client-side per #11.

**Consequence:** whole-field comparison is conservative. Rewording an intent note the
writer has since fixed a typo in will be refused rather than merged, so the UI must say why
rather than greying the Proposal out.

## Consequences

- **The soft size ceiling is around 100 KB; the hard wall is 2 MB.** A SQLite-backed
  Durable Object caps a single row or value at 2 MB, but every write re-serialises the
  whole Plan and broadcasts it, so cost is per-write. A normal Plan of 30 Outline nodes and
  40 References is roughly 40 KB. Growth is driven by References carrying long pulled
  passages, not by the outline.
- **The relief valve is moving References into SQLite rows.** They are already row-shaped
  and already carry Provenance pointing at Offer rows, and it is the move phase 2 makes
  anyway.
- **Debounce the client's `setState` while the writer types an intent note**, or 40 KB is
  serialised and broadcast per keystroke.
