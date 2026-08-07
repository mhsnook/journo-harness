# Architecture

What is true now. The reasoning behind each decision lives in the wayfinding map, issue #5,
and its closed tickets; this document does not repeat it. Vocabulary is fixed in
[`context.md`](../context.md) and governs the code, the UI, and this file.

The product: **the writer writes the prose and an AI acts as a guide.** Nothing here has the
model producing prose for the Draft.

## 1. Build order

Three stages of usefulness. Build with all three in mind and ship them in order. A refactor
at a stage boundary is accepted rather than designed around.

| Stage  | What ships              | What it adds                                                                                                    |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| **1a** | The Chat and the Plan   | One Article Agent per Article. Useful alone.                                                                    |
| **1b** | The House               | The Lexicon, the standing rules, the Skills, and House-scoped Voice and Adjectives. Only useful once 1a exists. |
| **2**  | The Draft and the Guide | The writing surface, Guidance notes, Reviews.                                                                   |

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
                   ── HTTP (Hono) ─────────►  The article index (→ D1)
                                              Archived reads, export
                                              Workers AI binding → the model
```

**Cloudflare throughout.** Workers, Durable Objects, D1, R2, Workers AI.

**One Article Agent per Article**, built on the Cloudflare Agents SDK. It holds everything
about one Article. It is always named in full — an unqualified "agent" could mean this
object, the Guide, or the Chat.

**The House** arrives at 1b as a single party-db room persisted to D1, holding the writer's
own standing material: the Lexicon, the standing rules, the Skills, and House-scoped Voice
and Adjectives. The House is small, constantly read, and exactly CRUD over a few
collections, so defining the collections _is_ the API: no endpoints, no query keys, no
invalidation.

**The House holds what the writer authors and reuses.** Spanning Articles is not on its own
a reason to put something there, and where a body of accumulated _research_ lives is open —
issue #40, with the shape it might take in [`later.md`](./later.md).

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
   replaces the entire blob, so a write meant to change one Section rewrites every
   field from whatever version the client last read. A second writer's changes vanish with
   no conflict and no error.
2. **Every other per-Article record is a SQLite row in the Article Agent**, read and written
   over `@callable` RPC on the WebSocket the client already holds. That covers Offers,
   Notes, and Rounds. Row writes touch named columns, so the Guide can append a Round while
   the writer Declines an Offer and neither erases the other. Adding a per-Article record
   type needs no endpoint, no store, and no sync library.
3. **A request is an action when it runs a model, and CRUD otherwise.** Actions: sending a
   Chat turn, running a Review, running research. CRUD: editing a Section, editing a
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
  references: [ { id, type, provenance, text?, source?, nodeId, note? } ],
}
```

- **The Outline is a nested tree**, sibling order carried by array position, every Section with
  a stable ID that never changes.
- **References are flat with an optional `nodeId`**, so an Accepted Reference can sit at a
  Section or nowhere yet.
- **A Quote is a Reference of that `type`.** One structure: a pulled passage, an
  attribution, or both, with at least one present. The type is **stored, not derived from
  the text**, so an Offer and the Reference it was Accepted into carry one answer and the
  Offer ledger and the Plan Panel cannot label an item differently. A Quote carries a text;
  a Reference may carry one without being a Quote. Amended in
  [ADR 0002](./adr/0002-the-plan-data-model.md).
- **Voice replaces; Adjectives compose.** One Voice applies at a time and the nearest Scope
  wins outright. Adjectives accumulate. Resolution runs House, then Article, then
  Section, **at read time**. A Section's ancestors take part in that same order, so a Subsection
  under a somber middle is somber unless it says otherwise.
- **The word-count total is stored and nothing is derived.** The parts may disagree with the
  whole; the gap is information. Auto-distributing the remainder is rejected.
- **One spelling per state.** A field that may be absent says "nothing here" by being absent,
  and never also by an empty string or an empty list — the blob is written whole, compared
  whole-field by a Proposal's `expected`, and sent whole in every prompt pack, so a second
  spelling is a second Plan for the same content. Three fields carry their key always and say
  "nothing here" with a value: a Reference's `nodeId`, which is null until it is placed, the
  Article's `adjectives`, and a Section's `children`, both of them the empty list. A
  Section's own `adjectives` is the other way round, and says it by being absent.

**The schema guards client writes.** `validateStateChange` parses the whole Plan on every
write, and nothing the model emits ever goes through it — the Chat proposes and the client
applies, so the blob has exactly one writer. What the model does meet are the **piece**
schemas, `outlineNodeSchema`, `referenceSchema`, and `sourceSchema`, reused inside a
Proposal's op payloads. It lives in `src/shared/plan/` with the Scope resolver and the
word-count arithmetic.

Three invariants sit above the object shape, checked in the same parse: a Section id
is unique among Sections, a Reference id is unique among References, and a placed
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

**The Article Agent extends `AIChatAgent`** from `@cloudflare/ai-chat`, which is where that
class now lives — importing `agents/ai-chat-agent` throws and says so. It routes a turn to
`onChatMessage`, and the Chat rides the socket the Plan and the RPC already share.

**The transcript stays in the Agents SDK's own store** and is never mirrored anywhere. The
server is what consumes it.

**The Chat proposes; the client applies.** The Chat never writes to the Plan.

**Proposals are `execute`-less tools** (AI SDK v7). A tool with no `execute` suspends for the
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
  `beforeId`, so the model anchors to whichever neighbour its insertion relates to: a Section
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
it expected against what it found. It sorts refusals into four types, listed on `RefusalType`
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

**The swappable boundary is the model instance, not a wrapper API.** AI SDK v7 already
provides `generateText`, `streamText`, and `generateObject`; a wrapper would duplicate it and
break the `execute`-less tool machinery.

```ts
// src/server/llm/model.ts — the whole boundary
import { createWorkersAI } from 'workers-ai-provider'
export const model = (env: Env) =>
  createWorkersAI({ binding: env.AI })('@cf/zai-org/glm-5.2')
```

**AI Gateway attaches** to those calls for logging. Inference runs on Cloudflare, so there is
no external provider and no key to manage. **Gateway response caching stays off for guide
passes**, or near-identical requests against different Drafts return stale Notes.

**The Gateway is named by the `AI_GATEWAY_ID` var, set from the CLI rather than checked in.**
It is deployment configuration rather than repo content, and a var declared in
`wrangler.jsonc` overwrites the deployed value on every `wrangler deploy`, so declaring it
there even as a placeholder would wipe it. Unset attaches no Gateway. Its type is in
`src/server/env.d.ts` and `llm/model.ts` is the only thing that reads it.

**The binding path needs no Gateway token.** `GatewayOptions` carries an id and cache
settings and has nowhere to put one, because a Workers AI binding call is same-account and
authenticates itself. So an authenticated Gateway is the one setting to leave off — turn it
on and these calls have no way to present the header it wants.

**Structured output, never parsed prose.** `generateObject` with a zod schema, validated in
the Article Agent, with one retry that includes the validation error.

**Prompt packs put the stable part first** — system prompt, then Lexicon entries in play,
then the standing rules, then everything that changes.

**Stable means append-only, and the Plan is not.** A transcript only grows, while the Plan
changes on every Accepted Proposal, so **the Plan goes after the conversation** and the Draft
or the deltas go last in the packs that carry those. Put the Plan in front and the product's
main loop invalidates the whole transcript behind it on every pass.

**Whether that ordering saves money on Workers AI is unverified.** Prefix caching is what
would make it pay, priced elsewhere at $0.26 per million cached against $1.40 uncached — and
the `env.AI` binding bills in neurons, so those are not its numbers and nothing here has
measured it. The ordering stands on the structural argument above either way, and the saving
is a claim to check on the first real turn rather than one to design around.

Each row below reads in pack order, stable to volatile.

| Pack       | Contents                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------- |
| Chat turn  | The Chat transcript, then the Plan                                                          |
| Proposal   | The affected span, plus adjacent Section titles and intent notes. Nothing else              |
| Guide pass | The Plan, then the Draft or active Section with neighbours, then recent deltas. **No Chat** |
| Review     | The same, plus the existing Notes. **No Chat**                                              |

Research reaches a Review only by being Accepted into the Plan. The Ledger is the bridge, and
curation is forced rather than assumed.

**Cost is not a constraint.** A guide pass of roughly 8k input and 500 output costs about a
tenth of a cent; a two-hour session is well under a dollar.

## 8. Frontend

**React + Vite with TanStack Router**, served as static assets from the Worker. **TanStack
Start does not join it** — its value is a typed server boundary in both directions, and the
Agents SDK owns the actions while the two sockets own the reads, leaving about five HTTP
calls in total.

**Hono** serves those in the same Worker: the Agents SDK's chat route, the article index,
party-db's lobby and write path at 1b, archived reads, and export.

**TanStack Query** serves the article index and the archived and export reads. Live data is
already reactive through Article Agent state and, at 1b, party-db's TanStack DB collections.

**The Article screen has four Panels** — Chat, Plan, Draft, Notes — which become tabs on a
narrow screen. The **Areas** are Articles (with Board and Archive Views), House, and Team.

**The Plan Panel's edits are ops, and the applier applies them.** A field the writer types
in builds the same op a Proposal would carry, `src/client/plan/edits.ts` reads its
`expected` out of the Plan on screen, and `applyProposal` produces the Plan that goes to
`setState`. One write path means the Panel cannot make a change the applier would refuse,
and a structural edit gets the consequences the ops already state — deleting a Section
unplaces its References. The writer's own edits never go Stale: staleness is the gap
between generating a Proposal and applying it, and there is no gap here.

**One writer holds the Plan and the debounce**, in `src/client/plan/writer.ts`. It applies
each edit locally, sends after a pause for the four ops a keystroke produces, and sends at
once for everything else. An update arriving from the Article Agent over an unsent edit is
the echo of an older write and is dropped — the client is the Plan's only writer, so there
is nothing else it can be.

**The Article Agent's WebSocket is multiplexed.** It carries `cf_agent_*` control frames for
state, RPC, and scheduling on one socket. In phase 1 this is free, because the SDK's own
client handles them. It becomes work if a party-db transport ever shares that socket.

## 9. Auth

**Cloudflare Access** gates the Worker at the edge. An unauthenticated request never arrives.

**1a is single-author and its auth is zero code.** One Team, both people read everything, no
per-user records, so nothing parses a token.

**The article index is a real D1 table, built as the last 1a ticket** — a small table read
through a Worker endpoint, on the path §2 already has for the Archived reads. It does not
wait for the House. An Article created on one machine appears on the other, which is what
makes the index worth having at all. Issue #29.

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
  Guidance notes at once, accumulating in numbered **Rounds**, grouped by **type**, which the
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
- **`@callable` needs the `agents/vite` plugin, in both Vite configs.** Vite 8 transpiles
  with oxc, which does not implement TC39 decorators (oxc#9170) and emits the `@` syntax
  verbatim, so the Worker fails to parse with "SyntaxError: Invalid or unexpected token".
  The plugin lowers them through Babel. `vitest.config.ts` needs it as well as
  `vite.config.ts` — a worker test builds the Article Agent, and the two files do not
  share plugins. **Do not reach for `experimentalDecorators`**: the SDK uses standard
  decorators, and the legacy convention hands `callable()` the prototype instead of the
  method, so nothing registers and every RPC call is refused at runtime with "is not
  callable" — a silent failure where the missing plugin is a loud one.
- **An abandoned tool batch parks indefinitely.** Cloudflare's `ai-chat` enforces batch
  completeness server-side with **no orphan timeout**, so a Proposal the writer neither
  Accepts nor Declines stalls the Chat silently. Surface it in the UI.
- **Local development** is unsolved: running the Worker with seeded data so a coding agent
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
