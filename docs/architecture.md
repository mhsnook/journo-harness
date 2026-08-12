# Architecture

This document records the current and planned/decided architecture of the application,
particularly for patterns that are used to coordinate or bind more than one module.
The reasoning behind each decision lives in the wayfinding map, issue #5, and its closed
tickets.

This document should make very clear what is a rule (and what it's for), vs. descriptions
of how we're doing things now, so as not to over-specify and constrain future innovation.

- Vocabulary is fixed in [`context.md`](./context.md) and governs the code, the UI,
  and this file.
- UI decisions and patterns go in [`ui.md`](./ui.md) or the Storybook stories it includes
  by reference.
- Certain key architecture decisions are recorded in the [`adr`](./adr/) folder.
- Use [`later.md`](./later.md) sparingly.

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
about one Article. It is named in full as "Article Agent" to distinguish from the general
term or a different agent we might add later.

**House Style** arrives at 1b as a single party-db room persisted to D1, holding the writer's
own standing material: the Lexicon, the standing rules, the Skills, and House-scoped Voice
and Adjectives. The House is small, read frequently, simple CRUD over a few
collections, so the API is just the PartyDB collections talking to the PartyDbServer.

**The House holds style and process guides that the writer authors and reuses.** These are
things like research skills/formats, preferred writing Voice, definitions for key Adjectives,
such as "punchy" or "serious", favourite authors and publications -- things that the Article
Agent will use to either gather research, make suggestions, or review the draft.

**Plain D1 tables** hold Archived Plans, Drafts, and Finals, read through a Worker endpoint
rather than synced. D1 also carries the backup story, because a Durable Object's storage has
no export path and D1 has `wrangler d1 export`.

**Three source roots**: `src/client`, `src/server`, and `src/shared` for the modules both
sides import — the Plan schema, the Proposal ops, and the applier. Nothing in `src/shared`
touches a Worker binding or React, and each tsconfig lists the root once rather than
naming each domain.

Recorded in [ADR 0001](./adr/0001-phase-1-storage-shape.md).

## 3. Where writes go

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
4. **The Guide writes only Notes.** Guidance notes and Rounds are its own output,
   which the writer doesn't (currently) author.
5. **Accepting copies into the Plan and keeps the Provenance.** The Plan's copy is the
   writer's to edit; the original stays as the record of what was produced. A later
   correction therefore arrives as a new Proposal rather than silently rewriting a citation
   the writer already approved.

**The blob is a reactive store; the tables are an on-demand store.** Rows in a Durable
Object's SQLite have no sync — `@callable` RPC is request and response, so nothing tells a
client a row changed. That suits Offers, Notes, and Rounds, which are read when a Panel
opens. It does not suit the Plan, which is on screen continuously. (It's worth keeping
open the question of which items should be included under the PartyDB collections, once
they're added.)

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
  a stable ID that never changes. What the writer reads is that position, worked out in
  `outlineEntries`: the bare `ordinal` for a gutter of them and for a phrase that composes
  one ("Section 2"), and `sectionLabel` for the standalone form ("§2"). Both come from the
  one walk, so no two Panels can number a Section differently.
- **References are flat with an optional `nodeId`**, so an Accepted Reference can sit at a
  Section or nowhere yet.
- **References are type Link or Quote**, and Reference is the umbrella over either type. The
  type is **assigned, not derived from the contents**, so an Offer and the Reference it was
  Accepted into carry the same `type`. Amended in
  [ADR 0002](./adr/0002-the-plan-data-model.md).
- **Voice cascades; Adjectives compose.** Both resolve down the same path — House, then
  Article, then Section, **at read time** — and they differ when two Scopes each state one.
  The nearest Voice wins outright. Adjectives accumulate instead: a "slow" Section inside a
  "fast" Article carries both, and the resolved list runs widest first, so the nearest lands
  last and reads as the strongest. Restating a term moves it to the end, which lets the
  writer say it again for emphasis.
- **The word-count total is stored rather than derived/summed.** The parts may disagree with
  the whole; the gap is information about under/over allocation.
- **One spelling per state.** A field that may be absent says "nothing here" by being
  absent, and not also by an empty string or an empty list — the blob is written whole,
  compared whole-field by a Proposal's `expected`, and sent whole in every prompt pack, so
  two Plans that mean the same thing should be the same, field for field. The schema enforces
  this today: an empty `adjectives` on a Section is refused. Some fields always carry their
  key and indicate "nothing here" with a value; others are absent when empty, but we make
  sure to accept only one or the other. **Choosing for a new field: a question the record is
  always asked carries its key and answers with a value, and a Section's own refinement is
  absent until it is set.** `nodeId`, `totalTarget`, and `children` are the first kind — every
  Reference has a placement even when unplaced. `intent`, `target`, and `voice` are the
  second. Read which one a field takes off `src/shared/plan/schema.ts` rather than from a
  list here.

**The schema guards client writes.** `validateStateChange` parses the whole Plan on every
write, and the model's outputs do not go through it — the Chat proposes and the client
applies, so the blob has only client writes. What the model does meet are the **piece**
schemas, `outlineNodeSchema`, `referenceSchema`, and `sourceSchema`, reused inside a
Proposal's op payloads. It lives in `src/shared/plan/` with the Scope resolver and the
word-count arithmetic.

Four invariants sit above the object shape, checked in the same parse: a Section id is
unique among Sections, a Reference id is unique among References, no two References were
copied from one Offer, and a placed Reference names a node that exists. The last one means
an op that deletes a node unplaces its References in the same Proposal, because the Plan is
written whole and validated whole.

**Size**: a normal Plan runs about 40 KB. The soft ceiling is around 100 KB, where
re-broadcasting on every write gets noticeable; the hard wall is 2 MB, the Durable Object
limit on a single row or value. Growth comes from References carrying long passages. The
relief valve is moving References into SQLite rows, which is the phase 2 move anyway.
**Debounce `setState` while the writer types**, or 40 KB goes over the wire per keystroke.

## 5. Chat and the Offers Ledger

The Chat turns up Offers — Links and Quotes — as SQLite rows in the Article Agent. The
**Ledger** is a View over all the Offers surfaced in this Chat. Offers can be
**Undecided**, **Accepted**, or **Declined** (restorable). In this way, the Ledger is used
as a direct sibling to, or alternative to, showing the chat transcript. We toggle it on or
off within the Chat Panel to view something specific about the Chat. It doesn't attempt to
do the job of any other Panels; when Offers are Accepted, they get promoted into the Plan
as new References, and this is the end of the Offer Ledger's job. It's just throwing the
new Reference over the wall to the next Panel, moving curated pieces of knowledge from the
first Panel to the second. The Plan Panel's references are their own editable clones,
so the Offers don't really have to keep track.

**The research tool carries an `execute`**, where the Proposal tool does not. An Offer is an
inert row rather than something the writer rules on mid-turn, so suspending the call would
buy nothing and cost the turn — a research turn returns seventeen items, and an unruled tool
batch stalls the Chat with no orphan timeout (§11). The suspend-or-execute rule is per tool
rather than for the registry.

**Deduplication runs in two places, and neither compares the Plan's content.** A research
turn calls `recordOffers`, which runs inside the Article Agent rather than over RPC — the
writer never authors an Offer, so nothing on the client may. It fingerprints each entry —
the type, the text, and the source, never the note — and hands back the row already there
rather than writing a second one, still carrying the disposition the writer gave it.
Asking whether an Offer is already in the Plan runs on the Provenance instead: the writer
edits their copy, and content stops matching the moment they do.

**Accepting is two writes against two stores, and nothing makes them atomic.** The copy goes
first, with a `createReference` op through the applier like every other Plan edit, then
`setOfferDisposition` over RPC. This way round a failure does not create an un-recoverable
middle state. The Plan write is local so as long as it succeeds, the RPC can fail and the
only consequence is an Undecided Offer in the Ledger. If the writer attempts to Accept it
again, `acceptOffer` returns `null` and builds no op at all.

**The other order strands the writer, which is why the order is fixed.** Ruling first leaves
the row reading Accepted with the Plan holding nothing. That state is invisible on the
Ledger, because the Ledger shows a ruled Offer as settled and does not read the Plan to
check. It is also unfixable from the Ledger, because there is no control that re-runs the
copy for an Offer already Accepted. Nothing recovers it, and nothing surfaces it.

**A refused copy stops the ruling for the same reason.** `edit` hands back the applier's
refusal, and `useOfferLedger` reads it: sending the ruling anyway would land the app in
exactly that stranded state. The writer gets the applier's sentence instead, built at the
edge from `refusal.reason` like every other one (§6).

**The writer pastes their own References straight into the Plan**, and those carry
`provenance: { type: 'writer' }` rather than an Offer id. They never enter the Ledger: an
Offer is something the Chat turned up and handed over to rule on, and there is nothing to
rule on in a passage the writer typed.

**One Offer becomes one Reference**, and `planSchema` refuses a Plan carrying two copies
of one. `referenceForOffer` answers with the first match on the strength of it, and that
answer is what makes a retried Accept build no op — so a second copy would turn every retry
into another copy.

**Proposals are not Offers.** See below.

## 6. Chat and Proposals

**The Chat is standard, and we adopt rather than invent.** Chat with research, tool calls,
approved edits, and an output artifact is well-trodden territory.

**The Article Agent extends `AIChatAgent`** from `@cloudflare/ai-chat`, which is where that
class now lives — importing `agents/ai-chat-agent` throws and says so. It routes a turn to
`onChatMessage`, and the Chat rides the socket the Plan and the RPC already share. The
transcript stays in the Agents SDK's own store.

**The Chat Panel is `src/client/chat/`.** `useArticleChat` is the wiring — the transcript,
the composer, and the two rulings — and `ChatPanel` is the surface, taking a transcript and
the rulings the way `PlanPanel` takes a Plan and one `edit`. The rule itself is
`ruleProposal`, a pure function the app and the showcase both run, so a story cannot rule
differently from the product.

**The Chat can make proposals; only the writer (client) can apply them to the Plan.** The
Chat doesn't get to write to the Plan directly; it surfaces Proposals; the writer can click
to Accept or Decline them. Accepting is `edit(ops)`, the same call every Plan edit makes.
The Proposal's ops go through `createPlanWriter` rather than a
`setState` of their own: the writer holds the Plan the writer sees, so the Plan always gets
updated in a way that will make sense to the writer, even if server and client are out of
sync (§3, rule 1).

**A refused Accept answers nothing and leaves the card open.** The card shows the applier's
sentence, the writer may fix the Plan and Accept again, and Declining sends that sentence
back — so the model learns the Plan moved rather than that the writer said no.

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

**Thirteen ops**, in `src/shared/plan/ops.ts`: `createNode`, `moveNode`, `mergeNodes`,
`deleteNode`, `setTitle`, `setIntent`, `setTarget`, `setVoice`, `setAdjectives`,
`placeReference`, `createReference`, `deleteReference`, `setReference`.

**The Chat is offered ten of them.** The three Reference ops are how the writer pastes a
Reference in themselves, and `chatProposalSchema` leaves them out of the tool the model
sees — research reaches the Plan by being Accepted from an Offer, and handing a model
`createReference` would be a way round the Ledger (§5). The applier takes all thirteen,
because the writer's own paste goes through it too.

A content op reads `nodeId: null` as the Article Scope, so setting the
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

**A refusal has two readers, the LLM and the human.** `refusal.message` is for the model's:
a Declined Proposal sends it back, so it names the op and the ids and may run long. The
writer's sentence is built at the edge from `refusal.reason` — a closed code
naming exactly what went wrong — plus the records it is about, in
`src/client/plan/refusalText.ts`. The Panel that shows it holds the Plan, so it can name a
Section the way the Outline numbers it, where the applier only has an id.

Two things follow. **One English string lives in `src/shared`**, aimed at a an LLM. The
writer's half is a table over a closed union, so if we used a second language, it would be a
second table rather than a sweep through the applier. `refusalText.ts` is total over
`RefusalReason`, so a new refusal site stops it compiling until it says what the new one
reads as.

**The op payloads are strict, and a rejected tool call retries with the validation error.**
The piece schemas the payloads reuse are `strictObject`, so a model that adds one field fails
the whole tool call rather than having the field stripped. Stripping would produce a Proposal
the model did not make and the writer would rule on it without seeing what was dropped. The
cost is real: a model that adds the same field every time thrashes the retry instead of
converging, and the answer to that is naming the field in the schema, not loosening every
payload to strip.

**Staleness is not a multi-client problem.** It comes from the gap between generating a
Proposal and applying it, and inference is slower than typing, so it exists with one writer
in one tab. We are currently quite strict about marking Proposals as stale, but as time goes
on we may want to come up with heuristics that allow us to be a bit more forgiving.

## 7. Inference

**Currently using `@cf/zai-org/glm-5.2` on Workers AI**, over the `env.AI` binding. 262k
context, tool calling and streaming supported, Workers Paid plan required. **If its tool
calling or structured output disappoints, swap the string to `@cf/moonshotai/kimi-k2.6`
and move on.** We are not (currently) planning a bunch of automated benchmarking or anything
like that, but we do have plans to let the writer evaluate how well the Review tool matches
their expectations, which may lead us down that road in the long run.

**Currently, one model serves every call** — the Chat, the ambient Guidance notes, the
Review. No routing machinery, no per-call-type model selection is included here.

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

**Structured outputs rather than parsed prose.** `generateObject` with a zod schema,
validated in the Article Agent, with one retry that includes the validation error.

**Prompt packs put the stable part first** — system prompt, then Lexicon entries in play,
then the standing rules, then everything that changes. The Plan and the Draft change all the
time, so they go at the end.

**Where the writer has just spoken, their message is the last thing the model reads**, and
the Plan sits in front of it. A model weights the final message as the one to answer, so a
pack ending on the Plan's JSON risks a turn that discusses the Plan rather than the question
the writer asked. This is the rule the Chat pack is built around.

**The exception is a turn that resumes after a tool call**, where the transcript ends with a
tool result rather than the writer. A tool result answers the assistant message before it,
and the Plan is a user message, so slotting it in front would split that pair — which the AI
SDK refuses outright with `MissingToolResultsError`, before the model is called at all. The
Plan goes last in that case, and there is no writer message to keep last anyway.
`chatPackMessages` and `planSlot` in `src/server/llm/prompt.ts` are the whole of it, and
`test/worker/chat-turn.test.ts` holds both cases plus the empty transcript.

Note: Whether that ordering saves time or money on Workers AI is unverified. Prefix caching is
what would make it pay, priced elsewhere at $0.26 per million cached against $1.40 uncached —
and the `env.AI` binding bills in neurons, so those are not its numbers and nothing here has
measured it. The ordering stands on the structural argument above either way, and the saving
is a claim to check on the first real turn rather than one to design around.

Each row below reads in pack order, stable to volatile.

| Pack       | Contents                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------- |
| Chat turn  | The Chat transcript, then the Plan, then the writer's own last message                      |
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
narrow screen, and which are all more or less their own little interfaces, with very specific
and explicit, user-gated interactions between them. `usePanels` holds which are open, keeps
them in the one order, drawn by a `Rail` component in the navbar.

**Use Loading states instead of drawing empty values.** An empty title, a zero count and four
empty columns are answers, and a screen that puts one on the page before it has read anything
has said something untrue. Whatever is still coming says so — `Skeleton` where the shape is
known, a sentence like "Opening the Plan…" where it is not, and a route's `pendingComponent`
where the whole screen is waiting. This is why the Article bar takes `title: string | null`:
`''` is the title the writer cleared, and it cannot also mean "not read yet".

**Navigation is a `Link`.** Tanstack Router provides this component for us, with the very
helpful `defaultPreload: 'intent'` which allows us to trigger functions, such as waking up a
different Article Agent's Durable Object to improve loading times.

**The Articles Area is the list at `/` and the Board View at `/board`**, over the one index
read, under a pathless layout route that holds both.

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

**One connection per Article, opened above the Panels.** `useArticleAgent` makes the single
`useAgent` call and hands out three things: the Plan channel, the Offer store built on the
same socket's RPC, and the client itself, which is what `useAgentChat` takes. The Panels read
it through `ArticleProvider` rather than connecting themselves. A Panel opening its own would
be a second socket, a second `createPlanWriter`, and a second debounce timer against a blob
whose whole design is that it has one writer.

## 9. Auth

**Cloudflare Access** gates the Worker at the edge. An unauthenticated request never arrives.

**1a is single-author and its auth is zero code.** One Team, both people read everything, no
per-user records, so nothing parses a token.

**The article index is a real D1 table** — a small table read through Hono routes in the
same Worker, on the path §2 already has for the Archived reads. It does not wait for the
House. An Article created on one machine appears on the other, which is what makes the index
worth having at all. Issue #29 built it.

**It is a list, not a store.** One row carries `{ id, title, status, createdAt, updatedAt,
archivedAt }` and nothing else, so the Article Agent stays the source of truth for the
contents of the Article, and nothing on the index path reaches into one.

**The title is the one field that lives in two places.** The Plan holds the real one, and the
index holds a copy written by the same client action that renames the Article —
`useTitleCopy`, debounced beside the Plan's own writer. **The Plan write goes first**, so a
Plan that lands with a failed copy leaves a stale row that the next rename corrects; the
other order would leave the list ahead of the Plan with nothing to walk it back. That is §5's
argument about Accepting an Offer, applied to the second pair of writes in the app.

**`status` is the writer's word, not an inference.** 1a has no Draft to measure, so the
Article screen carries the one control that sets it and the Board View reads it. `updatedAt`
is when the row last changed — a rename, a status, or Archiving — and not when the Article
was last worked on, because a Plan edit goes to the Article Agent and never touches this
table.

**An Archived Article stays on the same table** and says so with `archivedAt`, rather than
moving to one of its own. Both Views filter the one list the index answers with: the list
shows Archived Articles as a group at its foot, and the Board View leaves them out. Moving
the Chat to R2 is still §11's, still unbuilt, and independent of this flag.

**Avoiding the `Cf-Access-Jwt-Assertion` header makes localhost dev easier.** Localhost has
no Access gate at all, so in development there is no header and no gate. We can change our
DX later if we want to; for now this practice keeps things simple.

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
  Accepts nor Declines stalls the Chat silently. The composer counts the suspended calls and
  says what it is waiting on rather than sitting dead; nothing expires them.
- **Local development is half solved.** `pnpm db:migrate` puts the article index's schema
  into the local D1 and the worker tests apply the same files themselves, so a build ticket
  can run what it writes against a real table. What is still missing is seeded data: an
  Article with a Plan and a transcript already in it, so a screen can be opened rather than
  built up by hand every time.

## 12. Learning from the writer's rulings

The writer rules on every Offer, and each ruling is a preference label. This section is
what the app does with them.

**What this can buy, and what it cannot.** A ruling says which of the candidates the guide
produced the writer wanted. It cannot say anything about a source the guide never
surfaced, so no amount of learning here raises the ceiling on what research turns up — the
guide cannot browse (§7), and reordering what it already knows is the whole of what a
preference set supports. Retrieval is the separate and larger problem.

**Nothing is trained.** One writer produces a few hundred rulings a year, which is far too
few to move a model's weights and plenty to notice that they never take a source without a
year on it. So the artifact is a **Learned rule** — a sentence, which the writer reads and
rules on — rather than a weight. A wrong sentence is one they can Decline; a wrong weight
is invisible. A reranker over a larger candidate set is the next rung and is not built;
what makes it possible later is the record below, not a decision taken now.

### What a research turn records

**A research turn is a Batch, and each entry in it is an Appearance.** A turn is one call
to the research tool. Both are rows in the Article Agent, on the same SQLite as the Offers.

**Appearances are a table rather than columns on an Offer.** A source the Article already
carries writes no second Offer row (§5), so a second research routine that turns up the
same source would otherwise leave no sign it had turned it up — and which routine surfaced
what is the question the record exists to answer. One turn that repeats itself gets two
appearances at two positions, and the second is marked a duplicate.

**The harness names the Policy, never the model.** The label is what a comparison between
research routines rests on, and a model asked to name its own arm would be marking its own
homework. Today one routine serves every turn and `defaultResearchPolicy` names it. At 1b
a House Skill is a policy of its own, which is why the field is an open string rather than
a union — a writer authors a Skill without a deploy.

**Writing a second policy and reading the tally is the intended use.** `GET
/api/learning/policies` reports what each one turned up and what became of it. That is the
cheap version of an experiment, and it is the reason the label is recorded at all.

### Where the rulings live

**The Article Agent is the record and D1 holds the copy.** An Agent can only ever answer
for its own Article, and a query across every Article's rulings would have to wake every
Article Agent there is. So each appearance is mirrored into a D1 `appearance` table with
the Offer's own fields flattened onto it, and every reading query runs there.

**The mirror is best effort, and deliberately so.** A lost mirror write costs one row to
learn from; letting the failure through would cost the writer the ruling they just made.
So it is caught and logged at the Agent, and `syncAppearances` re-mirrors an Article to
repair it. Appearance ids are built from the Article, the batch, and the position, which is
what makes running the repair twice a no-op.

**A ruling reaches every appearance of the Offer**, not only the batch that got there
first: a source two policies both turned up was turned up by both, and crediting the
earlier one would score a policy on its luck.

### The distillation pass

**It reads ruled Offers and writes down what it sees**, as Learned rules the writer Accepts
or Declines. Accepted rules join the guide's instructions on every turn; Declined ones stay
as the record of a reading the writer rejected and are shown to the next pass, so it stops
offering the same rejected rule forever.

**Learned rules are writer-scoped, and they are House material.** A preference belongs to
the writer rather than to one piece, and one Article carries far too few rulings to read
one off. They live in D1 until the House exists at 1b, and the move is a data migration
rather than a redesign.

**Accepted only ever reaches a turn.** A candidate the writer has not read has no business
steering the guide, and that is the whole difference between this and a model quietly
retraining on its own output.

**The pass refuses below a floor of ruled Offers.** A model given four decisions will find
a pattern in them, the writer cannot tell that pattern from a real one, and an Accepted
rule then steers every turn. The floor is the one guard here that carries real weight.

**Undecided is not a Decline.** A writer who ruled on six of seventeen left eleven unread,
and counting those as negatives would teach the pass that everything below the fold is bad
and score a policy on how far the writer scrolled. Undecided Offers stay out of the accept
rate and out of the pass, and are reported beside both.

**Learned rules sit in the cached prefix**, so ruling on one costs the next turn its cache
hit. That is the right trade for a handful of rules ruled on now and then, and the wrong
one if anything ever writes there per turn.

### Known gaps

**The record is off-policy, and nothing corrects for it.** The app only ever observes
rulings on what the guide chose to offer, so a preference learned from it narrows onto the
guide's own past behaviour. The standard fix is to keep part of each batch deliberately
exploratory; the policy label is the half of that which is built, and the exploration is
not.

**Used is the signal worth having and is not collected.** `context.md` defines **Ready**
and **Used** for Phase 2, and an Accepted Offer that reaches the Draft is a far stronger
label than one that was merely Accepted — Accepting is cheap and using is expensive.
Collecting it waits on the Draft.

**Rulings on Proposals are not recorded at all.** A Proposal leaves no record by design
(§6), so which outline changes the writer took is invisible to everything here. The same
is true of Guidance notes at Phase 2. Both are the same kind of preference data as an Offer
ruling, and giving either one a record is an open design question rather than an oversight.

### The schema guard

**The Article Agent's SQLite is versioned**, in `src/server/agent-schema.ts`. `onStart`
runs on every wake, so `CREATE TABLE IF NOT EXISTS` was enough while every change added a
table — a column is where that breaks, because SQLite has no `ADD COLUMN IF NOT EXISTS` and
the second wake throws on the duplicate. Each Agent records the last step it ran and a wake
runs only what comes after it, so a step is written plainly rather than defensively.

**Steps are append-only.** A deployed Agent has already run the ones it carries, so editing
a step changes what a fresh Agent builds without changing what an old one holds, and the
two stop agreeing with no error to say so. Correct a step by adding the one that fixes it.
Step 1 is the old `offer` table restated with `IF NOT EXISTS`, which is what lets one runner
serve an Agent that predates the runner and one built by it.

## 13. Out of scope

- **The tracking model** — affirmed Boundaries and text-relocating operations, which would
  make Section membership a fact the app operates on rather than something the Guide infers.
- **Multi-user scoping beyond one Team of two** — House sharing, per-publication sets,
  collaboration.
- **Any harness that evaluates the Guide's output.** The Guide writes Guidance notes, and v1
  ships nothing that scores them. §12's policy tally is not this: it counts what the writer
  ruled, and nothing there judges an Offer on the app's own account.
- **Future ideas** parked in [`later.md`](./later.md): the public showcase, the arc note,
  Review lenses, exemplar pieces, a copy-edit pass, and Transition word-count attribution.
