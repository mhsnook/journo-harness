# Journo Harness — UX Outline

This document is the UX plan for the writing harness. It is written for the next
planning pass (the build plan), which will turn it into an implementation plan for
other agents to execute. It describes the product's conceptual model, layout, core
objects, modes, and key flows — not the tech stack.

## 1. Product concept

A harness for writing long-form pieces **where the user writes the prose and the
AI acts as a guide**. It looks like a standard chat app, but with two more
surfaces to the right:

- a **context-management layer** in the middle (the plan for the piece: outline,
  tone decisions, word-count targets), co-constructed by the user and the agent
  during planning, and
- the **article itself** on the right — an editor the user types in, continuously
  watched by the guide.

In v1 the AI does not write the article. Its job is editorial awareness the
writer can't cheaply maintain while in flow:

> "You're repeating points from section 2, but you're supposed to be pivoting to
> section 5 ('historical accounts') and then moving to close — and you're getting
> near your word-count target."

The middle layer is what makes that guidance possible: because structure, tone,
and targets live as explicit objects, the guide can compare *what you're writing*
against *what you agreed to write* and say something specific.

A fourth layer sits outside any single article: a personal vocabulary where the
user teaches the agent what words like "passionate" and "professional" mean to
them, so guidance in those terms means something.

## 2. The four layers

| # | Layer | Name | Scope | Contents |
|---|-------|------|-------|----------|
| 1 | Conversation | **Chat** | per article | Dialogue with the guide; planning talk, questions, on-demand reviews |
| 2 | Context stash | **Brief** | per article | Outline/mindmap, tone decisions, word-count targets, (later) pinned references |
| 3 | Output | **Draft** | per article | The article text, written by the user, sectioned to match the outline |
| 4 | User's voice | **Lexicon** | per user, cross-article | Definitions of tone/style shorthands; the user's taught vocabulary |

Mental model: the Chat is how you talk, the Brief is what you've agreed, the
Draft is what you're making, the Lexicon is who you are as a writer. The guide's
whole v1 job is noticing divergence between layers 2 and 3 and saying so well.

The Brief plays the same role as a "plan" in an agentic coding tool: work starts
by writing it, it governs execution, and changing it mid-flight is a deliberate,
visible act — not something that drifts silently.

## 3. Layout

Three-pane desktop layout, left to right:

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

- The **Draft is the primary surface** — the user lives there while writing. It
  gets the most room by default (roughly 1 : 1 : 2); Chat and Brief can each
  collapse to a rail. This is the reverse of a chat-first app, and the design
  should feel like an editor with a coach attached, not a chatbot with an editor
  attached.
- The **Brief** pane has two tabs in v1: **Outline** and **Tone**. (A third,
  **References**, is reserved for later — see §9.) The Outline tab shows two
  renderings of one tree: an indented list (default) and a **mindmap**. Nodes
  display live progress: word count vs target, written/unwritten, current.
- The **Draft** pane is a **structured editor**: it renders the outline as a
  sequence of sections, each with its heading (from the node title) and its own
  editing region. See §7.1 for why this is the load-bearing choice.
- The **Lexicon** is not a fourth pane. It lives behind a global entry point and
  surfaces contextually as chips wherever its terms appear (tone tab, guidance
  notes, chat).
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
- a title and an optional intent note ("what this section must accomplish" —
  in a guide-first product this note is the guide's rubric, so Plan mode should
  encourage filling it in),
- an optional **word-count target** (per node; the article total can be
  distributed across nodes during planning),
- an optional **tone override** (§4.3),
- a binding to a **Draft section** (§7),
- (later) pinned references and anecdotes (§9).

Both the user and the agent can create, edit, reorder, re-parent, merge, and
delete nodes. Direct manipulation (drag in list or mindmap, inline rename) and
chat instruction ("move 'historical accounts' before the close") are equivalent —
both mutate the same tree.

### 4.3 Tone decision

The Tone tab holds:

- a **global tone** — a short set of terms (chips), each either a Lexicon term or
  a free-form word, plus an optional free-text note ("like a letter to a smart
  friend"), and
- **per-node overrides** — the intro is "warm, personal," the analysis section is
  "professional." Overrides show as small chips on nodes in the Outline view, so
  the tone map of the piece is visible at a glance.

In v1 the guide uses tone decisions to **detect drift**: "section 4 is marked
'professional' but the last two paragraphs read conversational." When a tone word
is used that isn't in the Lexicon, the guide states the interpretation it's
checking against and offers a one-tap "save to Lexicon" — the main loop by which
the Lexicon grows.

### 4.4 Draft section

One editing region per outline node, bound by node ID, holding user-authored
text. Tracks live word count (shown against the node's target) and completion
state. All prose is the user's; the guide never edits it (see §5.2 for the one
narrow exception, which is opt-in and on-demand).

### 4.5 Guidance note

The guide's unit of output while the user writes. Each note has:

- an **anchor** — a section (and optionally a paragraph range) it's about,
- a **type** — structure ("this belongs in section 5"), repetition ("you made
  this point in section 2"), pacing/budget ("300 words over target with two
  sections to go"), tone drift, plan divergence ("what you're writing isn't what
  this node says it's for — update the plan or the prose?"),
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
  interrupts typing. At most one new note per pause-evaluation; repetitive
  observations get merged into the existing note, not repeated.

The example to build to: the user finishes a paragraph, pauses, and a margin
note reads *"This restates the argument from §2 ('the promise'). Your plan has
you pivoting to §5 ('historical accounts') and closing. You're at 1,850 of
2,000 words."*

### F3 — Restructure ("actually, move this before that")
Via drag in the Outline (list or mindmap) or via chat. The tree changes →
sections re-order in the Draft immediately, carrying their text (lossless, by
node-ID binding) → the guide posts divergence notes where the new order breaks
flow ("the transition at the end of §3 still points at 'the close'"). Fixing
the seams is the user's writing work; the guide just points at them.

### F4 — Plan divergence, both directions
- **Prose drifts from plan:** the guide flags it (guidance note) and offers a
  choice — "get back on plan, or update the plan to match?" If the user picks
  the latter, the agent edits the Brief (visible change) and guidance
  recalibrates. The plan is a living contract, but changing it is always a
  conscious, visible act.
- **Plan edited mid-write:** affected sections get divergence notes (not
  rewrites — there's nothing for the AI to rewrite in v1).

### F5 — On-demand review
The user asks in chat: "read section 3 — am I actually making the point?" The
guide answers in chat with specifics, referencing the node's intent note and
tone. This is also where "give me three openings" style requests land (§5.2).

### F6 — Teaching the Lexicon
From the Lexicon page (add/define/exemplify), from any chip in context ("edit
what this means"), or from feedback: when the guide's tone-drift notes keep
getting dismissed, or the user's reactions reveal a meaning, the agent proposes
an entry — always opt-in, never silent.

## 7. The tracking model (Brief ⇄ Draft)

This is the heart of the product and deserves its own section in the build plan.

### 7.1 Binding: the structured editor
Every Draft section is bound to an outline node ID, and **the editor is
structured by the outline** — one editing region per node, heading rendered from
the node title. This is the load-bearing choice: it means the app always knows
*exactly* which section the user is writing (no inference), per-section word
counts are free, reordering is lossless, and every guidance note has a precise
anchor. The alternative — one freeform text field with AI inferring section
boundaries — makes every feature above probabilistic, and is rejected for v1.

Consequences to design for: creating a node creates an empty section; deleting
a node with text prompts — delete, or move the text to a **cut-material**
holding area (default: cut material; nothing is silently destroyed); merging
nodes concatenates their text for the user to smooth.

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

## 8. The Lexicon (layer 4) — v1 scope

v1 ships the Lexicon small but real:

- a flat list of terms with free-text definitions and optional examples,
- chips wherever terms are used (tone tab, guidance notes, chat),
- state-the-interpretation + offer-to-save when an unknown term is used,
- agent-proposed entries from observed feedback, opt-in.

Explicitly later: categories, per-publication voices, importable style guides,
hook-like triggers.

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
- **Cut-material drawer** as a browsable space (v1 only needs it as a safe
  destination).
- **Copy-edit pass** (tracked suggestions the user accepts one by one — a
  gentler sibling of ghostwriter mode).
- Multi-document/series awareness, collaboration, publishing integrations.

## 10. Open questions for the build plan

1. **Guidance cadence and thresholds.** How long a typing lull triggers
   evaluation; how near a word target triggers a pacing note; how aggressively
   repetition is flagged. Recommendation: ship conservative defaults (lull
   ~3–5s, budget note at 90% of target, at most one new note per evaluation)
   and a per-article "coaching intensity" setting (quiet / normal / active).
2. **Mindmap fidelity in v1.** List view is required; mindmap is a rendering of
   the same tree. Recommendation: list-only v1, mindmap fast-follow.
3. **Where notes live long-term.** Do dismissed/resolved notes leave a
   browsable history (a "notebook" of the piece's editorial record)?
   Recommendation: keep a simple history behind a disclosure, don't build UI
   around it yet.
4. **Does the guide speak in chat unprompted?** Margin notes are the default
   channel; chat is user-initiated. Recommendation: the guide posts to chat
   unprompted only for piece-level observations that have no section anchor
   (e.g. "you've now written past your total target"), and rarely.
5. **Word-count targets: required or optional?** Guidance like "near your
   target" needs targets to exist. Recommendation: optional per node, but Plan
   mode proposes a distribution automatically when an overall length is given.
