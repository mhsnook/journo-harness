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
  a stable ID that never changes. What the writer reads is that position, worked out in
  `outlineEntries`: the bare `ordinal` for a gutter of them and for a phrase that composes
  one ("Section 2"), and `sectionLabel` for the standalone form ("§2"). Both come from the
  one walk, so no two Panels can number a Section differently.
- **References are flat with an optional `nodeId`**, so an Accepted Reference can sit at a
  Section or nowhere yet.
- **References are type Link or Quote**, and Reference is the umbrella over either type. The
  type is **stored, not derived from the text**, so an Offer and the Reference it was
  Accepted into carry one answer and the Offer ledger and the Plan Panel label them the same
  way. A Quote carries a text; a Link may carry one without being a Quote. Amended in
  [ADR 0002](./adr/0002-the-plan-data-model.md).
- **Voice cascades; Adjectives compose.** Both resolve down the same path — House, then
  Article, then Section, **at read time** — and they differ when two Scopes each state one.
  The nearest Voice wins outright. Adjectives accumulate instead: a "slow" Section inside a
  "fast" Article carries both, and the resolved list runs widest first, so the nearest lands
  last and reads as the strongest. Restating a term moves it to the end, which is how the
  writer says it again for emphasis.
- **The word-count total is stored rather than derived/summed.** The parts may disagree with
  the whole; the gap is information about under/over allocation.
- **One spelling per state.** A field that may be absent says "nothing here" by being
  absent, and not also by an empty string or an empty list — the blob is written whole,
  compared whole-field by a Proposal's `expected`, and sent whole in every prompt pack, so
  two Plans that mean the same thing can differ byte for byte and an `expected` that should
  match will not. The schema enforces this today: an empty `adjectives` on a Section is
  refused. Three fields carry their key always and say "nothing here" with a value: a
  Reference's `nodeId`, which is null until it is placed, the Article's `adjectives`, and a
  Section's `children`, both of them the empty list. A Section's own `adjectives` is the
  other way round, and says it by being absent.

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

## 5. Offers and the Ledger

The Chat turns up Offers — Links and Quotes — as SQLite rows in the Article Agent. The
**Ledger** is a View over Offers in the Chat Panel. Each Offer carries a disposition:
**Undecided**, **Accepted**, or **Declined** (Declining is restorable).

**The Ledger belongs to the Chat Panel and doesn't read the Plan.** Its data model and its
visual representation should both be understood to relate to the Chat Panel itself. It
opens from the control left of the composer, which carries the Undecided count, and it takes
the Chat's half of the screen rather than sitting beside it as a fifth Panel — `close ×` is
on the Ledger because the Chat is the half that opened it.
It shows one flat list with a chip per disposition to filter it, and `all` first, so the
Undecided pile can be read on its own without losing the record. When the writer Accepts an
Offer, it sends the Reference over to the Plan Panel; then it belongs to the Plan, where it
becomes an editable record carrying its Provenance (rule 5) back to the original Offer.
Screen 2(g) draws the same rows grouped rather than filtered, in a popover; that one is not
built.

Offers are flat. Two Quotes from one publication are two Offers.

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

**Accepting is two writes against two stores, and nothing makes them atomic. The copy goes
first.** A `createReference` op through the applier like every other Plan edit, then
`setOfferDisposition` over RPC. `referenceFromOffer` reads what the Offer says and not what
the writer ruled, so the copy needs nothing the ruling returns and the order is free to be
this way round.

**It is this way round so the failure does not outlive the click.** The Plan write is local
and the RPC is the one that can fail, so what a half-done Accept leaves is a copy in the
Plan and a row still reading Undecided. The writer sees an unticked row, Accepts again, and
both halves are right: `acceptOffer` follows the Provenance, finds the copy, and builds no
op, so the retry sends the ruling and nothing else. Nothing to reconcile, nothing to show,
and no state that persists waiting to be noticed.

The other order buys the opposite. The row would read Accepted with the Plan holding
nothing — invisible on the Ledger, unfixable from it, and needing a group and a re-add of
its own to get back out. That was the earlier design, and the group it needed was the
Ledger reading the Plan.

**A refused copy stops the ruling for the same reason.** `edit` hands back the applier's
refusal, and `useOfferLedger` reads it: sending the ruling anyway would land the app in
exactly the state the order above is chosen to avoid. The writer gets the applier's sentence
instead, built at the edge from `refusal.reason` like every other one (§6).

A Reference sitting at no Section is a different thing entirely, and an ordinary one: the
Plan Panel lists it and its Section reads "not placed".

**The writer pastes their own References straight into the Plan**, and those carry
`provenance: { type: 'writer' }` rather than an Offer id. They never enter the Ledger: an
Offer is something the Chat turned up and handed over to rule on, and there is nothing to
rule on in a passage the writer typed.

**One Offer becomes one Reference**, and `planSchema` refuses a Plan carrying two copies
of one. `referenceForOffer` answers with the first match on the strength of it, and that
answer is what makes a retried Accept build no op — so a second copy would turn every retry
into another copy.

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

**The Chat Panel is `src/client/chat/`.** `useArticleChat` is the wiring — the transcript,
the composer, and the two rulings — and `ChatPanel` is the surface, taking a transcript and
the rulings the way `PlanPanel` takes a Plan and one `edit`. The rule itself is
`ruleProposal`, a pure function the app and the showcase both run, so a story cannot rule
differently from the product.

**Accepting is `edit(ops)`, the same call every Plan edit makes.** The Proposal's ops go
through `createPlanWriter` rather than a `setState` of their own: the writer holds the Plan
the writer sees, debounces, and drops an incoming update over an unsent write, and a second
writer around it would undo what is on screen (§3, rule 1).

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

**A refusal has two readers, and the applier writes for one of them.** `refusal.message` is
the model's: a Declined Proposal sends it back, so it names the op and the ids and may run
long. The writer's sentence is built at the edge from `refusal.reason` — a closed code
naming exactly what went wrong — plus the records it is about, in
`src/client/plan/refusalText.ts`. The Panel that shows it holds the Plan, so it can name a
Section the way the Outline numbers it, where the applier only has an id.

Two things follow. **One English string lives in `src/shared`**, aimed at a reader with no
eyes, and it never needs translating — the model is taught in English by `llm/tools.ts`
already. And the writer's half is a table over a closed union, so a second language is a
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
narrow screen. `usePanels` holds which are open, keeps them in the one order the rail draws,
and refuses to close the last of them. All four stay mounted and a closed one is hidden. The
**Areas** are Articles (with Board and Archive Views), House, and Team.

**A screen never draws a value it has not got.** An empty title, a zero count and four empty
columns are answers, and a screen that puts one on the page before it has read anything has
said something untrue. Whatever is still coming says so — `Skeleton` where the shape is
known, a sentence like "Opening the Plan…" where it is not, and a route's `pendingComponent`
where the whole screen is waiting. This is why the Article bar takes `title: string | null`:
`''` is the title the writer cleared, and it cannot also mean "not read yet".

**Navigation is a `Link`.** A control that only goes somewhere is an anchor, so it opens in
a new tab, copies as a URL, reads as a link, and warms its route on hover — the router runs
`defaultPreload: 'intent'`. A callback is for a control that does work first, like Archiving
an Article and then leaving it.

**The Articles Area is the list at `/` and the Board View at `/board`**, over the one index
read, under a pathless layout route that holds both. The Board draws a column per status,
keeps its columns' width, and scrolls sideways rather than squeezing them. It carries no
drag-and-drop and no control on a card: the writer sets a status on the Article screen,
which is where they are when they decide the piece has moved on. The Archive View is not built, and Archived Articles are a group at the foot of
the list until it is.

**The list's tiles supplement it rather than replacing rows in it.** The three most recently
changed Articles sit on top as tiles, and every one of them is still listed underneath, so
scanning the list never means remembering which rows were lifted out of it.

**Opening an Article creates the row first and asks its name second.** The button fires the
create, a dialog asks what the piece is called while that request is in flight, and the
typed title travels into the Article screen on the navigation rather than being written from
the list — writing it there would put the copy in front of the thing it copies. `useSeedTitle`
puts it in the Plan on arrival and `useTitleCopy` sends the copy on behind it, which is the
same order every later rename takes. Backing out discards the row, and discards nothing else:
an Article nobody has opened has no Plan and no Chat, because its Article Agent is not built
until the Article screen connects to it.

**Each Panel scrolls its own Y.** Reading down the Plan does not move the Chat beside it.
The Panel is the scroll container and the Frame body gives it the height to scroll within,
so a Panel header that should stay put is `sticky` inside its own Panel. The `stories`
Vitest project holds every story to that in a real browser, so a class chain that reads as
though it works has to measure as though it does — see `.storybook/vitest.setup.ts`.

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
archivedAt }` and nothing else, so losing the whole table costs the reader their list and
costs no Article anything. The Article Agent stays the source of truth for an Article, and
nothing on the index path reaches into one.

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
  Accepts nor Declines stalls the Chat silently. The composer counts the suspended calls and
  says what it is waiting on rather than sitting dead; nothing expires them.
- **Local development is half solved.** `pnpm db:migrate` puts the article index's schema
  into the local D1 and the worker tests apply the same files themselves, so a build ticket
  can run what it writes against a real table. What is still missing is seeded data: an
  Article with a Plan and a transcript already in it, so a screen can be opened rather than
  built up by hand every time.

## 12. Out of scope

- **The tracking model** — affirmed Boundaries and text-relocating operations, which would
  make Section membership a fact the app operates on rather than something the Guide infers.
- **Multi-user scoping beyond one Team of two** — House sharing, per-publication sets,
  collaboration.
- **Any harness that evaluates the Guide's output.** The Guide writes Guidance notes, and v1
  ships nothing that scores them.
- **Future ideas** parked in [`later.md`](./later.md): the public showcase, the arc note,
  Review lenses, exemplar pieces, a copy-edit pass, and Transition word-count attribution.
