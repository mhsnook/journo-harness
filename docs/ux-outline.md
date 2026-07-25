# Journo Harness — UX Outline

This document is the UX plan for the writing harness. It is written for the next
planning pass (the build plan), which will turn it into an implementation plan for
other agents to execute. It describes the product's conceptual model, layout, core
objects, modes, and key flows (but not the tech stack).

> A note on register: this document records decisions made on purpose and the
> kinds of things the product should support. Where it sketches a mechanism or
> names an object, treat that as illustration, not schema — the build plan and
> the agents executing it are expected to read the requirements and design well,
> including making different choices where they see better ones.

## 1. Product concept

A harness for writing long-form pieces **where the user writes the prose and the
AI acts as a guide**. It looks like a standard chat app where you chat on the left
and the article you're writing is on the right, but with an additional layer for
**context-management**. This is where you and your editor-guide robot friend will
co-construct an outline in the planning phase (editable any time), where you'll
outline or mind-map your piece, perhaps provide length targets overall or per
section, or leave notes on how you want the prose to feel at different points.

This is the real *cognitive* support that the robot provides. It lets it watch
as you write and offer nudges like this:

> "Hi there human, I see you're repeating points from section 2, but you're supposed
> to be pivoting to section 5 ('historical accounts') and then moving to close —
> you're just 450 words from your target, time to wrap up!"

The middle layer is what makes that guidance possible: because you write a plan for
every piece, and when you say things like "I want the second half to be fast-paced"
it doesn't have to be as brilliant of a writer as you are to still say "Did you
want to punch this section up a bit? You said this part should be faster."

But we have another layer to offer as well: **lexicon, skills, rules**. Just like in
Claude code, a writer should be able to write skills like, "when I ask you to
/shorten a section, I want you to: ...". Or if you want to write a plan that
says, "The article will start sad and end happy," it helps to be able to tell it what
you mean, like with writing samples of what you consider happy and sad writing that
works or doesn't work.

Put together, this layer 2 (the planning/pitch doc) and layer 4 (house styles & moods),
allow the harness to act like a little clippy that can help you stay on track while
you draft, remember to include your best quotes and references, and in the end, suggest
what to ✂️✂️✂️.

### More on the 4th Layer (writing styles)

The fourth layer sits outside any single article as the writer's _general_ style:
everything the app knows about how this writer writes, kept in the app
and editable with almost no ceremony. This section is deliberately flat, not
specifying any data types to design up front. The kinds of things it holds:

- what the writer's tone words mean to them ("passionate," "professional,"
  "punchy"), so guidance in those terms means something — we call this the
  **Lexicon**,
- standing writing rules in the writer's own prose — the things they'd
  otherwise repeat to every new editor: "the bibliography keeps one flat,
  plain register no matter the tone of the piece," "don't stage a wrong idea
  just to knock it down, unless the narrative arc is frustration"
- repeatable editorial moves the writer can invoke by name — we call these
  **Skills**. `/shorten` knows what shortening means *to this writer*: look
  for repetition and suggest removing one instance; point out where a page
  was spent on what should be a paragraph and ask; use the target length the
  Brief already knows,
- writing samples of the writer's own that they like and want to sound like,
- perhaps saved notes from chats where the writer explains their favourite
  writers and influences, and the agent can chat with them about what they
  like about those things. (This is bringing in preferences by conversation,
  not ingesting the other writer's work.)
- and whatever else turns out to deserve encoding, in the same spirit.

All of it is the user's house style, all the way down — this layer is where
that lives, and it is the only place taste comes from (see above: the guide's
taste is borrowed, never its own).

## 2. The four layers

| # | Layer | Name | Scope | Contents |
|---|-------|------|-------|----------|
| 1 | Conversation | **Chat** | per article | Dialogue with the guide; planning talk, questions, on-demand reviews |
| 2 | Context stash | **Brief** | per article | Outline/mindmap, tone decisions, word-count targets, (later) pinned references |
| 3 | Output | **Draft** | per article | The article text, written by the user, sectioned to match the outline |
| 4 | The writer's own material | **Lexicon, rules, skills, samples, …** | per user, cross-article | A flat, growing collection: what tone words mean, standing writing rules, invocable editorial moves, writing samples — the user's house style in the user's words |

You start by chatting (1); just yap at the thing, and it'll help you write an outline (2);
punch it up however you like and get started writing the draft (3). Then the guide will
use your outline, and will look up anything in the lexicon (4) that you referenced there,
to help keep you on track (✅).


The Brief plays the same role as a "plan" in an agentic coding tool: work starts
by writing it, it guides execution by providing a sense of beginning/end and a todo
of points to hit. It can be changed mid-flight, but that's a deliberate,
visible act, not something that drifts quietly or implicitly.

## 3. Layout

Three-pane desktop layout, left to right.

```
┌────────────┬─────────────────┬──────────────────────────┐
│   CHAT     │      BRIEF      │         DRAFT            │
│            │                 │ ┌──────────────────────┐ │
│ guide      │ [Outline|Tone]  │ │ status strip (HUD)   │ │
│ messages   │                 │ ├──────────────────────┤ │
│ + composer │ outline as list │ │ sectioned editor     │ │
│            │ or mindmap,     │ │ (user types here)    │ │
│            │ with targets &  │ │  · margin notes      │ │
│            │ progress        │ │  · per-section counts│ │
└────────────┴─────────────────┴──────────────────────────┘
```

(Note: it's totally possible that in the
beginning, a writer would only want 1+2 open, and then they would write for a while
freeform-ish and collect references so they'd be in 1+3 open, and then as they really
shape the piece they'll be in 2+3 and not even really chat anymore.)

- The **Draft is the primary surface** — the user lives there while writing. It
  gets the most room by default (roughly 1 : 1 : 2); Chat and Brief can each
  collapse to a rail. This is the reverse of a chat-first app, and the design
  should feel like an editor with a coach attached, not a chatbot with an editor
  attached.
- The **Brief** pane manages to find space for both the Outline/Mindmap, and the
  notes on length and tone of different sections (maybe all together! IDK!).
  (A References area is reserved for later — see §9.) Nodes
  display live progress: word count vs target, written/unwritten, current.
- The **Draft** pane is one continuous editor with **section landmarks**:
  headings rendered from node titles and subtle indicators between sections.
  Exact boundaries stay loose in v1 — the guide infers them well enough for
  approximate counts and anchored notes (§4.4); the formal tracking model is
  later work (§7).
- The writer's house style (layer 4) is not a fourth pane. It lives behind a
  global entry point and surfaces contextually — Lexicon terms as chips
  wherever they appear (tone notes, guidance notes, chat).
- Narrow screens: panes become swipeable tabs (Chat / Brief / Draft) with badge
  indicators when a non-visible pane has new activity.

## 4. Core objects

### 4.1 Article (project)

The container: one chat thread, one brief, one draft, plus metadata (title,
status, overall word-count target). A home screen lists articles; "New article"
starts one in Plan mode (§5).

### 4.2 Outline node

The unit of structure. A tree of nodes, each with:

- a **stable ID** (survives moves, renames, re-parenting — everything else binds
  to it),
- a title and an optional intent note — "what this section must accomplish,"
  in the writer's own words, emotional and aesthetic intent included ("open
  hot," "slow down here, let it breathe," "this is where the data lives").
  In a guide-first product this note is the guide's rubric, so Plan mode
  should encourage filling it in,
- an optional **word-count target** (per node; the article total can be
  distributed across nodes during planning),
- an optional **tone override** (§4.3),
- a loose association with the stretch of Draft where the section is being
  written (§4.4),
- (later) pinned references and anecdotes (§9).

Both the user and the agent can create, edit, reorder, re-parent, merge, and
delete nodes. Direct manipulation (drag in list or mindmap, inline rename) and
chat instruction ("move 'historical accounts' before the close") are equivalent —
both mutate the same tree.

### 4.3 Tone decision

Tone decisions, wherever the Brief pane ends up putting them (§3), include:

- a **global tone** — a short set of terms (chips), each either a Lexicon term or
  a free-form word, plus an optional free-text note ("like a letter to a smart
  friend"),
- **per-node overrides** — the intro is "warm, personal," the analysis section is
  "professional." Overrides show as small chips on nodes in the Outline view, so
  the tone map of the piece is visible at a glance, and
- an **arc note** — an optional piece-level free-text description of the pacing
  and emotional shape of the whole article, in the writer's words: "start
  exciting; the data lives mostly in the middle but threads throughout; finish
  by bringing the three personal anecdotes back with the update about pending
  action." The guide reads the draft against the arc note the same way it
  reads sections against intent notes, and Plan mode co-writes it like
  everything else in the Brief.

In v1 the guide uses tone decisions to **detect drift**: "section 4 is marked
'professional' but the last two paragraphs read conversational." When a tone word
is used that isn't in the Lexicon, the guide states the interpretation it's
checking against and offers a one-tap "save to Lexicon" — the main loop by which
the Lexicon grows.

### 4.4 Draft section

The Draft is one continuous, user-authored text. The guide keeps a loose,
inferred sense of which stretch of it is serving which outline node — enough
for per-section counts and anchored notes, always presented as approximate
("≈240 words"), and never forcing the writer to slot prose into sections
while in flow.

The formal version of this mapping — transitions as first-class spans, soft
vs affirmed boundaries, structural moves that carry text safely — is the
tracking model (§7), which is future work.

All prose is the user's; the guide never edits it (see §5.2 for the one narrow
exception, which is opt-in and on-demand).

### 4.5 Guidance note

The guide's unit of output while the user writes. Each note has:

- an **anchor** — a section (and optionally a paragraph range) it's about,
- a **kind** — illustrative, not a fixed taxonomy: structure ("this belongs in
  section 5"), repetition ("you made this point in section 2"), budget ("300
  words over target with two sections to go"), tone drift, arc/pacing
  divergence ("the arc note says the data lives in the middle, but the last
  three paragraphs of the opening are data"), plan divergence ("what you're
  writing isn't what this node says it's for — update the plan or the
  prose?"),
- a **body** — one or two sentences, specific, referencing Brief objects by name,
- a lifecycle — active → dismissed / resolved / superseded. Dismissing is
  one tap and is signal (a repeatedly dismissed class of note should quiet
  itself).

Notes render in the Draft margin at their anchor, with the current section's most
important note also reflected in the status strip. They are quiet by default —
see §6, F2 for the interruption rules.

### 4.6 Lexicon entry

A named term ("passionate", "professional", "punchy") with a definition in the
user's words and/or the agent's distilled description, optional do/don't
examples, and provenance (taught explicitly, or distilled from feedback and
saved with the user's consent). Entries are injected into the guide's context
whenever the term is invoked — in tone decisions, in guidance notes, in chat.

### 4.7 Skill

An invocable editorial routine, authored in the app as editable
natural-language instructions, the way skills/slash-commands work in a coding
agent. A skill has:

- a **name** (`/shorten`, `/tighten-transitions`, `/fact-check-flags`, …),
  discoverable via autocomplete in the chat composer,
- a **scope argument** — a section, a selection, or the whole piece (default),
  plus optional free-form args ("cut 70", "aim for 1,800"),
- a **body** — natural-language instructions encoding what the operation means.
  The canonical example, `/shorten`: read the target length from the Brief;
  look for repetition and suggest removing one instance; point out where a page
  was spent on what should have been a paragraph and *ask the user* rather than
  deciding; prefer cuts that don't touch user-flagged keeper passages,
- **trigger hints** — optional conditions under which the guide may *offer* the
  skill proactively ("section ≥40% over its target → offer /shorten on it"),
  subject to the same interruption rules as any guidance (§6, F2),
- read access to all three article layers (Brief, Draft, Chat) and the
  writer's material (layer 4).

A skill run produces **findings** — anchored observations, questions, and
proposed actions. In v1 they render as guidance notes and chat questions
("¶2 of §4 restates ¶1 of §2 — cut one?"); if a ghostwriter mode exists
someday, the same findings could carry concrete edits to accept.

**v1 keeps authorship flat.** One user means "we the user" and "we the
developers" stay undifferentiated: one flat global set of skills, edited
directly in the app. No per-article/per-user/per-publication scoping or
inheritance — that's a later problem to solve with experience in hand (§9).

## 5. Modes

### 5.1 Plan mode (default for a new article)

- The Draft pane is empty/placeholder; the Brief is the star.
- The conversation is collaborative in the fullest sense here — the agent *is*
  a co-author of the plan: it interviews (topic, audience, angle, length),
  proposes structure, drafts intent notes, suggests a word-count distribution
  and tone map. The user edits everything directly or by chat.
- Exit is explicit: a **"Start writing"** action (the agent may suggest it:
  "I think the plan's ready — start writing?").

### 5.2 Write mode

- The main loop: the user types in the Draft; the guide watches and produces
  guidance notes and status updates (F2). Chat remains available for questions
  and on-demand reviews (F5).
- The guide **never writes into the Draft**. The one narrow exception: the user
  may explicitly ask for a suggestion ("give me three ways to open this
  section") — the answer arrives in chat as copyable text, never as an edit.
- The Brief stays editable — changing it mid-write is a conscious decision with
  visible consequences: progress recalculates, and sections whose plan changed
  get a divergence note rather than a rewrite (§7.2).

### 5.3 Done

- Article marked complete; export (markdown / copy / rich text); a natural
  moment for the guide to propose Lexicon updates learned during the piece
  ("You cut qualifiers every time I flagged 'punchy' — save that as the
  meaning?").

## 6. Key flows

### F1 — New article
Home → New article → Plan mode. Agent interviews, outline materializes in the
Brief with intent notes, targets, and tone chips. User tweaks directly. User
hits **Start writing**.

### F2 — The writing loop (the core of the product)
User types in a section. The guide evaluates on **pauses and boundaries, never
on keystrokes**: after a typing lull (a few seconds), when the user switches
sections, and on explicit request. Its output obeys interruption rules:

- **Ambient, always-on:** the status strip — current section vs plan position,
  per-section and total word count vs targets. Glanceable, never animated,
  never demands attention.
- **Passive, anchored:** guidance notes appear in the margin without stealing
  focus or moving the text the user is typing into. New-note indicators are
  subtle (a dot on the section, a badge on a collapsed pane).
- **Never modal, never auto-correcting.** The guide has no affordance that
  interrupts typing. There is **no cap on notes** — everything relevant gets
  said; the writer decides what to ignore. The only pruning is hygiene:
  an observation that repeats an existing active note merges into it instead
  of duplicating, and dismissals are signal (a repeatedly dismissed class of
  note quiets itself).

The example to build to: the user finishes a paragraph, pauses, and a margin
note reads *"This restates the argument from §2 ('the promise'). Your plan has
you pivoting to §5 ('historical accounts') and closing. You're at 1,850 of
2,000 words."*

A guidance note may carry a **skill offer** when a skill's trigger hints match:
*"This section is 250 words against a 180 target — try cutting ~70? [Run
/shorten on §3]"*. One tap runs the skill scoped to that section; ignoring or
dismissing it is costless and counts as signal like any other dismissal.

### F3 — Restructure ("actually, move this before that")
Via drag in the Outline (list or mindmap) or via chat — both mutate the same
tree. v1 keeps the app's part simple: the outline reorders, and the guide
leaves notes on the affected seams ("this passage led into 'historical
accounts', which just moved — check the join"); moving the prose itself is
the writer's cut-and-paste, with the guide pointing at anything that looks
stranded. Never move text on a guessed boundary — when in doubt, ask. The
fuller version, where sections carry their text automatically, is the
tracking model (§7), later.

### F4 — Plan divergence, both directions
- **Prose drifts from plan:** the guide flags it (guidance note) and offers a
  choice — "get back on plan, or update the plan to match?" If the user picks
  the latter, the agent edits the Brief (visible change) and guidance
  recalibrates. The plan is a living contract, but changing it is always a
  conscious, visible act. This flow exists to catch drift *early* — the
  failure mode it prevents is the thrash spiral where the writer grows more
  attached to the prose than the plan, quietly rewrites the plan around it,
  then writes more prose that breaks the new plan too. Surfacing the fork
  ("plan or prose?") at the first divergence makes that a decision instead of
  a drift.
- **Plan edited mid-write:** affected sections get divergence notes (not
  rewrites — there's nothing for the AI to rewrite in v1).

### F5 — On-demand review
The user asks in chat: "read section 3 — am I actually making the point?" The
guide answers in chat with specifics, referencing the node's intent note and
tone. This is also where "give me three openings" style requests land (§5.2).

### F6 — Teaching the app your material
From the layer-4 pages (add/define/exemplify — adding anything is typing a
sentence or pasting a passage), from any chip in context ("edit what this
means"), or from feedback: when the guide's tone-drift notes keep getting
dismissed, or the user's reactions reveal a meaning, the agent proposes an
entry — always opt-in, never silent. The same loop covers all of the writer's
material: a correction the writer keeps making in chat can be offered back as
a standing rule.

### F7 — Running a skill
The user types `/shorten` in the chat composer (autocomplete lists skills with
their one-line descriptions), optionally scoped and parameterized ("/shorten §3,
cut 70"); a section's context menu offers "Run skill…" for the pointer-first
path. The run executes against the current Brief + Draft and lands as a batch
of findings: anchored guidance notes in the margins plus a chat summary ("found
3 repetitions, 1 page-that-should-be-a-paragraph — notes in §2, §4, §6"). Each
finding is individually actionable or dismissible; a skill run never edits
prose in v1. Skills also arrive via proactive offers (F2).

## 7. The tracking model (Brief ⇄ Draft)

This is an advanced feature but one that shows the potential of the product, so
it gets its own section, despite being far in the future.

### 7.1 Binding: soft boundaries, affirmed on demand

The invariant: every span of prose is either mapped to an outline node (by
stable node ID) or is a transition between two nodes — and **no structural
operation ever executes on guessed boundaries.** Within that invariant,
boundaries live in two states:

- **Soft (the default while writing).** The user just writes; the agent
  computes provisional boundaries lazily — when a span is first encountered by
  guidance, when counts are needed — and never forces the writer to slot prose
  into sections mid-flow. Everything ambient (word counts, "you are here,"
  drift notes) runs happily on soft boundaries and is presented as approximate
  ("≈240 words") until affirmed. Inference is fine for glanceable guidance; it
  is never fine for moving text.
- **Affirmed (on demand).** Operations that relocate text — moving, merging, or
  deleting a node; extracting cut material — require certainty. They trigger a
  **bound-and-confirm** step: the agent proposes exact boundaries for the
  affected spans, including which parts are transitions ("the last two
  sentences here are connective — mark them as the transition?"), the user
  adjusts and confirms, and the operation proceeds on affirmed boundaries.

**Releasing affirmations.** After the structural operation, affirmed boundaries
can be released back to soft in one action (the agent offers this). This is a
matter of taste, so it's a per-user **boundary style** preference:

- *flowing* (recommended default): soft everywhere; boundaries are computed
  and re-affirmed only on the rare occasions of a major pitch/outline-level
  restructure, then released again. For writers who find locks un-fun.
- *structured*: boundaries affirm as you go and stay affirmed; the editor
  feels like one region per section. For writers who like the rails.

**Boundary refinement offers.** When the user exits editing a transition (or on
a pause), the guide may scan it and propose a refinement: "merge the first
paragraph into the section above, and keep just the last two sentences as the
transition?" One tap applies it; same interruption rules as all guidance.

Consequences to design for: creating a node creates an empty (planned) span;
deleting a node with text prompts — delete, or move the text to a
**cut-material** holding area (default: cut material; nothing is silently
destroyed); merging nodes concatenates their text and invalidates the
transition between them.

### 7.2 Divergence, not staleness
When Brief and Draft disagree — prose wandering off-plan, a reordered tree
breaking transitions, a tone override no longer matching the text — the result
is always a **guidance note**, never an automatic change to the user's prose.
The set of active divergence notes is effectively the guide's honest diff
between "what we agreed" and "what exists."

### 7.3 Progress
The Brief shows live progress per node (word count vs target, written /
in-progress / current / empty), so the outline doubles as a progress map of the
piece. The status strip surfaces the same data for the current section plus the
piece total.

## 8. Layer 4 (the writer's material) — v1 scope

v1 ships this layer small but real, and **in the app** — it's the user's
material, not developer config. What v1 needs:

- the **Lexicon**: a flat list of terms with free-text definitions and
  optional examples; chips wherever terms are used (tone tab, guidance notes,
  chat); state-the-interpretation + offer-to-save when an unknown term is
  used; agent-proposed entries from observed feedback, opt-in,
- **Skills**: a flat set of invocable routines, each just editable
  natural-language instructions; slash invocation with autocomplete and
  scope/args (F7) plus the section context menu; proactive offers governed by
  the interruption rules; findings-based output only (notes + chat) — no
  prose edits; 2–3 exemplars (`/shorten` first) that double as documentation,
- **a place for the rest**: standing writing rules, the writer's own samples
  — somewhere to put them, nothing more specified than that.

The requirements that matter, for all of it: adding or editing something is a
small act (type a sentence, paste a passage); the guide genuinely reads what's
there; and none of it ever hardens into a house style — when this layer is
empty the guide simply knows less, it does not fall back on taste of its own.
How these things are stored and modeled is the build's decision, not this
document's — a big flat list the writer tweaks is closer to the truth than a
set of types.

Some of this will deserve deeper support eventually — scoping, sharing,
per-publication sets (§9). Decide that from usage, not in advance.

## 9. Later features (design for, don't build)

- **Ghostwriter mode:** the AI drafts and rewrites prose per the Brief — the
  full agentic-writing loop (change highlighting, per-section revert, user-text
  protection). Everything in this document is designed so that mode can be added
  without remodeling: the Brief already carries intent, tone, and targets; the
  Draft is already sectioned and node-bound. v1 deliberately ships the harness
  and the guide first, so the plan-and-track layer earns trust before the AI
  ever writes a word.
- **Pinned references:** links, quotes, anecdotes attached to outline nodes;
  moving a node carries its pinned material. Imposes one v1 requirement —
  stable node IDs with everything bound to them — already in §4.2. In guide-v1
  this also enables notes like "you haven't used the pinned quote for this
  section."
- **Compiled checks:** the guide proposes simple deterministic watchers
  derived from what the writer declared — "§5's intent note says the three
  anecdotes return: watch that the closing section mentions each of them."
  The user accepts a check, and from then on it runs cheaply on every edit.
  Per-node word targets (v1, §4.2) are the simplest member of this shape.
- **Cut-material drawer** as a browsable space (v1 only needs it as a safe
  destination).
- **Copy-edit pass** (tracked suggestions the user accepts one by one — a
  gentler sibling of ghostwriter mode).
- **Layer-4 scoping and sharing:** per-article, per-user, per-publication
  layers with overrides, once multiple users (or multiple distinct voices)
  exist and real usage has shown which axes matter. v1's flat set is the
  deliberate placeholder for this.
- **Deeper layer-4 authoring:** a "turn this chat instruction into a skill"
  affordance (you keep asking for the same review — save it as `/my-review`?),
  sharing between users.
- Multi-document/series awareness, collaboration, publishing integrations.

## 10. Open questions for the build plan

1. **Guidance cadence and thresholds.** How long a typing lull triggers
   evaluation; how near a word target triggers a pacing note; how aggressively
   repetition is flagged. Answer: ship conservative trigger defaults
   (lull ~3–5s, or once in 10 minutes of sustained activity, budget note at 90%
   of target) and a per-article "coaching intensity" setting (quiet / normal /
   active). Notes themselves are uncapped — everything relevant shows (F2);
   intensity tunes *when the guide looks*, never how much it may say.
2. **Mindmap fidelity in v1.** List view is required; mindmap is a rendering of
   the same tree. Answer: list-only v1, mindmap fast-follow.
3. **Where notes live long-term.** Do dismissed/resolved notes leave a
   browsable history (a "notebook" of the piece's editorial record)?
   Answer: keep a simple history behind a disclosure, don't build UI
   around it yet.
4. **Does the guide speak in chat unprompted?** Margin notes are the default
   channel; chat is user-initiated. Answer: the guide posts to chat
   unprompted only for piece-level observations that have no section anchor
   (e.g. "you've now written past your total target"), and rarely.
5. **Word-count targets: required or optional?** Guidance like "near your
   target" needs targets to exist. Answer: optional per node, but Plan
   mode proposes a distribution automatically when an overall length is given.
6. **Skill authoring surface.** Skills live in the app — what's the lightest
   editing surface that keeps authoring zero-ceremony? Answer: a name,
   a one-line description, and one free-text body; nothing more structured
   until prose proves insufficient.
7. **Trigger-hint expressiveness.** Are hints structured conditions ("section
   over target by N%") or prose the guide interprets? Answer: only word counts
   are structured; everything else is prose in v1 — the guide reads the hint
   and judges; structured predicates only if prose proves too noisy or too
   timid.
8. **Exactly which operations require affirmed boundaries** (for whenever the
   tracking model, §7, lands). Node move, merge,
   and delete, plus cut-material extraction, clearly do. Do scoped skill runs
   ("/shorten §3")? Answer: no — read-only skills run on soft
   boundaries and say so ("≈"), since their findings are suggestions the user
   applies by hand anyway; only text-relocating operations pay the
   bound-and-confirm toll.
9. **Transition word-count attribution.** Transitions belong to neither
   section — do their words count toward the piece total only, split between
   neighbors, or shown as their own line? Answer: piece total only,
   with transitions listed separately in the Brief's progress view if they
   grow large (a fat transition is itself a signal worth surfacing).
