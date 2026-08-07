# Architecture

What is true now. The reasoning behind each decision lives in the wayfinding map, issue #5,
and its closed tickets; this document does not repeat it. Vocabulary is fixed in
[`context.md`](../context.md) and governs the code, the UI, and this file.

The product: **the writer writes the prose and an AI acts as a guide.** Nothing here has the
model producing prose for the Draft.

## 1. Build order

Three stages of usefulness. Build with all three in mind and ship them in order. A refactor
at a stage boundary is accepted rather than designed around.

| Stage  | What ships              | What it adds                                                                                                                       |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **1a** | The Chat and the Plan   | One Article Agent per Article. Useful alone.                                                                                       |
| **1b** | The House               | The Lexicon, the standing rules, the Skills, House-scoped Voice and Adjectives, and the article index. Only useful once 1a exists. |
| **2**  | The Draft and the Guide | The writing surface, Guidance notes, Reviews.                                                                                      |

**Scale**: one Team of two people. No signup flow. "Only one editor at a time on a Draft" is
an acceptable constraint.

**Tiebreaker**: where options are close, take the one that puts a product you can write with
in front of you soonest. Arguments from scale, cost, or throughput decide only when they
threaten that.

## 2. Shape

```
Browser — React + Vite + TanStack Router
  ├─ Chat Panel   ─┐
  ├─ Plan Panel    ├── useAgent WebSocket ──► Article Agent (one per Article)
  ├─ Draft Panel   │                            ├─ Agents SDK store: the Chat transcript
  └─ Notes Panel  ─┘                            ├─ Agent state (one JSON blob): the Plan
                                                ├─ SQLite rows: Offers, Notes, Rounds
                   ── party-db WebSocket ──►  The House (one party-db room, → D1)   [1b]
                   ── HTTP (Hono) ─────────►  Archived reads, export
                                              Workers AI binding → the model
```

**Cloudflare throughout.** Workers, Durable Objects, D1, R2, Workers AI.

**One Article Agent per Article**, built on the Cloudflare Agents SDK. It holds everything
about one Article. It is always named in full — an unqualified "agent" could mean this
object, the Guide, or the Chat.

**The House** arrives at 1b as a single party-db room persisted to D1, holding everything
that spans Articles. The House is small, constantly read, and exactly CRUD over a few
collections, so defining the collections _is_ the API: no endpoints, no query keys, no
invalidation.

**Plain D1 tables** hold Archived Plans, Drafts, and Finals, read through a Worker endpoint
rather than synced. D1 also carries the backup story, because a Durable Object's storage has
no export path and D1 has `wrangler d1 export`.

**Three source roots**: `src/client`, `src/server`, and `src/shared` for the modules both
sides import — the Plan schema, the Proposal ops, and the applier. Nothing in `src/shared`
touches a Worker binding or React, and each tsconfig lists the root once rather than
naming each domain.

Recorded in [ADR 0001](./adr/0001-phase-1-storage-shape.md).

## 3. Where writes go

Five rules. Apply them to anything new without reopening the question.

1. **Article Agent state holds only the Plan, and only the client writes it.** `setState`
   replaces the entire blob, so a write meant to change one Outline node rewrites every
   field from whatever version the client last read. A second writer's changes vanish with
   no conflict and no error.
2. **Every other per-Article record is a SQLite row in the Article Agent**, read and written
   over `@callable` RPC on the WebSocket the client already holds. That covers Offers,
   Notes, and Rounds. Row writes touch named columns, so the Guide can append a Round while
   the writer Declines an Offer and neither erases the other. Adding a per-Article record
   type needs no endpoint, no store, and no sync library.
3. **A request is an action when it runs a model, and CRUD otherwise.** Actions: sending a
   Chat turn, running a Review, running research. CRUD: editing an Outline node, editing a
   Reference, Accepting a Proposal, Declining an Offer, retitling the Article. Accepting is
   CRUD even though a model produced the thing being accepted, because applying it is a
   plain write.
4. **The Guide writes only to the Notes.** Guidance notes and Rounds are its own output,
   which the writer never authors. It never writes the Plan or the Draft — it produces
   Proposals and Offers, which stay inert until the writer Accepts them.
5. **Accepting copies into the Plan and keeps the Provenance.** The Plan's copy is the
   writer's to edit; the original stays as the record of what was produced. A later
   correction therefore arrives as a new Proposal rather than silently rewriting a citation
   the writer already approved.

**The blob is the reactive store; the tables are the on-demand store.** Rows in a Durable
Object's SQLite have no sync — `@callable` RPC is request and response, so nothing tells a
client a row changed. That suits Offers, Notes, and Rounds, which are read when a Panel
opens. It does not suit the Plan, which is on screen continuously.

## 4. The Plan

One JSON blob in Article Agent state. Full shape and rationale in
[ADR 0002](./adr/0002-the-plan-data-model.md).

```
plan: {
  title, totalTarget,
  voice, adjectives: [],
  outline: [ { id, title, intent?, target?, voice?, adjectives?: [], children: [] } ],
  references: [ { id, provenance, text?, source?, nodeId, note? } ],
}
```

- **The Outline is a nested tree**, sibling order carried by array position, every node with
  a stable ID that never changes.
- **References are flat with an optional `nodeId`**, so an Accepted Reference can sit at an
  Outline node or nowhere yet.
- **A Quote is a Reference that carries a `text`.** One structure: a pulled passage, an
  attribution, or both, with at least one present.
- **Voice replaces; Adjectives compose.** One Voice applies at a time and the nearest Scope
  wins outright. Adjectives accumulate. Resolution runs House, then Article, then Outline
  node, **at read time**. A node's ancestors take part in that same order, so a subsection
  under a somber middle is somber unless it says otherwise.
- **The word-count total is stored and nothing is derived.** The parts may disagree with the
  whole; the gap is information. Auto-distributing the remainder is rejected.

**The schema guards client writes.** `validateStateChange` parses the whole Plan on every
write, and nothing the model emits ever goes through it — the Chat proposes and the client
applies, so the blob has exactly one writer. What the model does meet are the **piece**
schemas, `outlineNodeSchema`, `referenceSchema`, and `sourceSchema`, reused inside a
Proposal's op payloads. It lives in `src/shared/plan/` with the Scope resolver and the
word-count arithmetic.

Three invariants sit above the object shape, checked in the same parse: an Outline node id
is unique among Outline nodes, a Reference id is unique among References, and a placed
Reference names a node that exists. The last one means an op that deletes a node unplaces
its References in the same Proposal, because the Plan is written whole and validated whole.

**Size**: a normal Plan runs about 40 KB. The soft ceiling is around 100 KB, where
re-broadcasting on every write gets noticeable; the hard wall is 2 MB, the Durable Object
limit on a single row or value. Growth comes from References carrying long passages. The
relief valve is moving References into SQLite rows, which is the phase 2 move anyway.
**Debounce `setState` while the writer types**, or 40 KB goes over the wire per keystroke.

## 5. Offers and the Ledger

The Chat turns up **Offers** — References and Quotes — as SQLite rows in the Article Agent.
Each carries a disposition: **Undecided**, **Accepted**, or **Declined**, and Declining is
restorable. The **Ledger** is a View over Offers, not a store.

Offers are flat. Two Quotes from one publication are two Offers.

Accepting copies the Offer into the Plan as a new editable record carrying its Provenance —
rule 5. Deduplicate a re-offered Reference on the Provenance, not on the content.

**A Proposal is not an Offer.** The writer rules on both the same way, but a Proposal lives
in the Chat turn that made it, goes Stale, and leaves no record, where an Offer is a row that
keeps its disposition.

## 6. Chat and Proposals

**The Chat is standard, and we adopt rather than invent.** Chat with research, tool calls,
approved edits, and an output artifact is well-trodden territory.

**The transcript stays in the Agents SDK's own store** and is never mirrored anywhere. The
server is what consumes it.

**The Chat proposes; the client applies.** The Chat never writes to the Plan.

**Proposals are `execute`-less tools** (AI SDK v6). A tool with no `execute` suspends for the
client, which is the Proposal. Four API details, each easy to get wrong:

- Use `addToolOutput`, not the deprecated `addToolResult`, and call it **without `await`** —
  the docs warn twice about deadlock.
- `addToolApprovalResponse` takes `part.approval.id`, not `toolCallId`.
- Do **not** use `needsApproval` or `toolApproval`. Both gate a server-side `execute` this
  product does not have.
- A rejection returns `is_error: true` with the reason in the content.

**Send the Plan in `body`, never in `metadata`.** `body` is request-only and never enters the
transcript; `metadata` persists on the `UIMessage` and re-rides every turn.

### Proposal shape

A list of ops, applied all-or-nothing.

```
proposal: [
  { op: 'createNode', parentId, beforeId, node: { id, title, intent, children: [] } },
  { op: 'setTarget',  nodeId, expected: null, value: 400 },
]
```

- **`expected` is content-addressed staleness** — it names the value the Proposal thinks is
  there, not a version. Compared **whole-field**, because Plan fields are short.
- **Structural ops anchor on IDs and carry no `expected`.** Exactly one of `afterId` or
  `beforeId`, so the model anchors to whichever neighbour its insertion relates to: a section
  leading into §3 says `before: §3` and survives §2 being deleted. `afterId: null` means
  first child, `beforeId: null` means last child.
- **If any op's `expected` fails, the whole Proposal is Stale.** The UI must say why rather
  than greying it out — whole-field comparison is conservative and will refuse a Proposal
  against a field the writer has since touched.

**Ten ops**, in `src/shared/plan/ops.ts`: `createNode`, `moveNode`, `mergeNodes`,
`deleteNode`, `setTitle`, `setIntent`, `setTarget`, `setVoice`, `setAdjectives`,
`placeReference`. A content op reads `nodeId: null` as the Article Scope, so setting the
Article's Voice and setting one node's Voice are one op rather than two. Two ops carry a
consequence worth stating: **`deleteNode` unplaces every Reference placed at the node it
removes or at any node below it**, because the Plan is written whole and a Reference naming a
node that is gone does not parse; and **`mergeNodes` keeps the target's own fields**, moving the source's children
and placed References onto it, so a Proposal that wants the source's intent note carried over
says so with a `setIntent` op in the same batch.

**The applier refuses with a reason**, in `src/shared/plan/apply.ts`. `applyProposal` returns
either a new Plan or a refusal naming which op failed, its position in the Proposal, and what
it expected against what it found. It sorts refusals into four kinds, listed on `RefusalKind`
where they cannot drift away from the union. It also parses the Plan it produces, so a
Proposal the Article Agent would reject is refused here, where there is a reason to show,
rather than there, where there is none.

**The op payloads are strict, and a rejected tool call retries with the validation error.**
The piece schemas the payloads reuse are `strictObject`, so a model that adds one field fails
the whole tool call rather than having the field stripped. Stripping would produce a Proposal
the model did not make and the writer would rule on it without seeing what was dropped. The
cost is real: a model that adds the same field every time thrashes the retry instead of
converging, and the answer to that is naming the field in the schema, not loosening every
payload to strip.

**Staleness is not a multi-client problem.** It comes from the gap between generating a
Proposal and applying it, and inference is slower than typing, so it exists with one writer
in one tab.

## 7. Inference

**`@cf/zai-org/glm-5.2` on Workers AI**, over the `env.AI` binding. 262k context, tool calling
and streaming supported, Workers Paid plan required. **If its tool calling or structured
output disappoints, swap the string to `@cf/moonshotai/kimi-k2.6` and move on.**

**One model serves every call** — the Chat, the ambient Guidance notes, the Review. No
routing machinery, no per-call-type model selection.

**The swappable boundary is the model instance, not a wrapper API.** AI SDK v6 already
provides `generateText`, `streamText`, and `generateObject`; a wrapper would duplicate it and
break the `execute`-less tool machinery.

```ts
// llm/model.ts — the whole boundary
import { createWorkersAI } from 'workers-ai-provider'
export const model = (env: Env) =>
  createWorkersAI({ binding: env.AI })('@cf/zai-org/glm-5.2')
```

**AI Gateway attaches** to those calls for logging. Inference runs on Cloudflare, so there is
no external provider and no key to manage. **Gateway response caching stays off for guide
passes**, or near-identical requests against different Drafts return stale Notes.

**Structured output, never parsed prose.** `generateObject` with a zod schema, validated in
the Article Agent, with one retry that includes the validation error.

**Prompt packs put the stable prefix first** — system prompt, Lexicon entries in play, the
Plan, then the volatile Draft or deltas. Cached input costs $0.26 per million against $1.40
uncached, so the ordering is a five-fold saving on the repeated part of every pass.

| Pack       | Contents                                                                            |
| ---------- | ----------------------------------------------------------------------------------- |
| Chat turn  | The conversation, plus the Plan                                                     |
| Proposal   | The affected span, plus adjacent Outline node titles and intent notes. Nothing else |
| Guide pass | The Plan, the Draft or active Section with neighbours, recent deltas. **No Chat**   |
| Review     | The same, plus the existing Notes. **No Chat**                                      |

Research reaches a Review only by being Accepted into the Plan. The Ledger is the bridge, and
curation is forced rather than assumed.

**Cost is not a constraint.** A guide pass of roughly 8k input and 500 output costs about a
tenth of a cent; a two-hour session is well under a dollar.

## 8. Frontend

**React + Vite with TanStack Router**, served as static assets from the Worker. **TanStack
Start does not join it** — its value is a typed server boundary in both directions, and the
Agents SDK owns the actions while the two sockets own the reads, leaving about five HTTP
calls in total.

**Hono** serves those in the same Worker: the Agents SDK's chat route, party-db's lobby and
write path at 1b, archived reads, and export.

**TanStack Query** serves only the archived and export reads. Live data is already reactive
through Article Agent state and, at 1b, party-db's TanStack DB collections.

**The Article screen has four Panels** — Chat, Plan, Draft, Notes — which become tabs on a
narrow screen. The **Areas** are Articles (with Board and Archive Views), House, and Team.

**The Article Agent's WebSocket is multiplexed.** It carries `cf_agent_*` control frames for
state, RPC, and scheduling on one socket. In phase 1 this is free, because the SDK's own
client handles them. It becomes work if a party-db transport ever shares that socket.

## 9. Auth

**Cloudflare Access** gates the Worker at the edge. An unauthenticated request never arrives.

**1a is single-author and its auth is zero code.** One Team, both people read everything, no
per-user records, so nothing parses a token.

**1a's article index is a throwaway array in `localStorage`** — `{ id, title }`, appended on
create and pruned liberally. The real index lives in the House and arrives at 1b. This one is
per browser, so the two people see different lists and an Article created on one machine does
not appear on another, which is acceptable because 1a is single-author. Keeping it in
`localStorage` rather than a Durable Object is deliberate: it is visibly not the real store,
so nobody builds on it. It gains no search, no sorting, no Board View.

**Nothing in 1a may require the `Cf-Access-Jwt-Assertion` header.** Localhost has no Access
gate at all, so in development there is no header and no gate. Read it if present, tolerate
its absence, and build no dev stub for something 1a does not use.

**Identity arrives at 1b**, when party-db's `authorize` runs in the partyserver lobby and
needs a verified identity before the object wakes. Access injects
`Cf-Access-Jwt-Assertion` as a header where party-db expects `?token=` on connect, so
`authorize` reads the header. Whether the header survives a WebSocket upgrade into the
Durable Object is unproven — issue #12. If it fails, WorkOS is the documented upgrade.

**Attributing Chat messages to people is wanted and deferred past 1a.** The Agents SDK stores
a role, not a person, so it needs a field on the `UIMessage` or a parallel table. A stable
person id is the one case where `metadata` persistence is wanted; §6's warning is about
payload size and staleness, not about `metadata` as such.

## 10. Phase 2, at low resolution

Decided now so 1a cannot paint itself into a corner. Not built.

- **The Draft is one row per Block**, meaning per paragraph. Not one row for the whole Draft,
  and not one row per Section — a row per Section would make Section Boundaries a storage
  fact, and they are approximate and inferred.
- **The Draft is edited locally** and persisted to the server. A server-authoritative
  ProseMirror step stream is ruled out; it is mutually exclusive with party-db.
- **Sync arrives with the Draft**: `mhsnook/party-db`, checked out at `~/code/party-db`,
  persisting to SQLite embedded in the Durable Object. Findings #7 and #18 are suspended, not
  withdrawn — correct, not load-bearing until then, and not to be assumed before.
- **Notes is the fourth Panel.** A **Review** is an intentional pass producing a batch of
  Guidance notes at once, accumulating in numbered **Rounds**, grouped by **Kind**, which the
  writer selects among and hands back to the Chat.
- **The guide loop is client-initiated. There is no server-side timer anywhere in v1.** The
  client knows when typing stopped; the server cannot tell "still thinking" from "left the
  room." An alarm earns its place only when work must happen while nobody is connected, and
  there is no such work. A stale Proposal or an orphaned tool batch expires lazily on read.
- **Guidance notes do not stream.** A Review is the thing that should.
- **Editor** — unchosen, issue #14. Note anchoring and Boundary inference wait on it.

## 11. Carries

Settings and known defects. None is a decision to make; all are things to get right.

- **Only the Chat goes cold when an Article is Archived.** Archive is a soft delete. The
  Plan, the Draft, and the Final move to plain D1 tables and stay readable; the Chat goes to
  R2, and un-archiving asks the writer whether to bring it back whole or truncate it. Not
  built in v1.
- **Set party-db's `oplogRetention` low, around 200** against its default of 10,000. For a
  hot row the reconnect delta measured 400× the snapshot, and party-db has no large-delta
  bail-out. Low retention pushes a returning client onto the cheap snapshot path.
- **party-db never compares `previousValue`.** Any concurrent write clobbers the whole row.
  The Block shape limits the blast radius; nothing removes it.
- **party-db has no per-row access control.** `src/server/access.ts` warns that `access` and
  `ownerColumn` are unenforced (party-db #33). Survivable while both people may read
  everything, and not survivable the moment that stops being true.
- **An expired Access session answers with a redirect rather than a 1008 close**, so
  party-db's client reconnect-loops instead of firing `onAuthError`.
- **An abandoned tool batch parks indefinitely.** Cloudflare's `ai-chat` enforces batch
  completeness server-side with **no orphan timeout**, so a Proposal the writer neither
  Accepts nor Declines stalls the conversation silently. Surface it in the UI.
- **Local development** is unsolved: running the Worker with seeded data so an agent
  executing a build ticket can run what it writes.

## 12. Out of scope

- **The tracking model** — affirmed Boundaries and text-relocating operations, which would
  make Section membership a fact the app operates on rather than something the Guide infers.
- **Multi-user scoping beyond one Team of two** — House sharing, per-publication sets,
  collaboration.
- **Any harness that evaluates the Guide's output.** The Guide writes Guidance notes, and v1
  ships nothing that scores them.
- **Future ideas** parked in [`later.md`](./later.md): the public showcase, the arc note,
  Review lenses, exemplar pieces, a copy-edit pass, and Transition word-count attribution.
