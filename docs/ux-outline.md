# Journo Harness — UX Outline

This document is the UX plan for the writing harness. It is written for the next
planning pass (the build plan), which will turn it into an implementation plan for
other agents to execute. It describes the product's conceptual model, layout, core
objects, modes, and key flows — not the tech stack.

## 1. Product concept

A harness for writing long-form pieces with an AI agent. It looks like a standard
chat app, but the chat is only the *control surface*. The real product is the two
surfaces to its right:

- a **context-management layer** in the middle (the plan for the piece: outline,
  tone decisions), co-constructed by the user and the agent, and
- the **article itself** on the right, continuously updated as the conversation
  proceeds.

The middle layer is what makes instructions like *"re-arrange it like this and
write it more passionately"* cheap and reliable: structure and tone live as
explicit, editable objects rather than being implied by chat history.

A fourth layer sits *outside* any single article: a personal vocabulary where the
user teaches the agent what words like "passionate" and "professional" mean to
them, so those shorthands get more useful over time.

## 2. The four layers

| # | Layer | Name | Scope | Contents |
|---|-------|------|-------|----------|
| 1 | Conversation | **Chat** | per article | The turn-by-turn dialogue; the control surface |
| 2 | Context stash | **Brief** | per article | Outline/mindmap, tone decisions, (later) pinned references |
| 3 | Output | **Draft** | per article | The article text, section-by-section, always current |
| 4 | User's voice | **Lexicon** | per user, cross-article | Definitions of tone/style shorthands; the user's taught vocabulary |

Mental model: the Chat is how you talk, the Brief is what you've agreed, the Draft
is what exists, the Lexicon is who you are as a writer.

The Brief plays the same role as a "plan" in an agentic coding tool: work starts
by writing it, it governs execution, and changing it mid-flight is a deliberate,
visible act — not something that drifts silently in chat history.

## 3. Layout

Three-pane desktop layout, left to right:

```
┌────────────┬─────────────────┬──────────────────────┐
│   CHAT     │      BRIEF      │        DRAFT         │
│            │                 │                      │
│ messages   │ [Outline|Tone]  │  the article,        │
│ + composer │                 │  live-updating,      │
│            │ outline as list │  sectioned to match  │
│            │ or mindmap      │  the outline         │
└────────────┴─────────────────┴──────────────────────┘
```

- Panes are resizable; each can collapse to a rail. Sensible default ratio is
  roughly 1 : 1 : 1.5 (the Draft gets the most room).
- The **Brief** pane has two tabs in v1: **Outline** and **Tone**. (A third,
  **References**, is reserved for later — see §9.)
- The **Outline** tab offers two views of the same data: an indented list (fast,
  keyboard-friendly, default) and a **mindmap** (spatial, good for restructuring).
  They are strictly two renderings of one tree — no separate state.
- The **Lexicon** is not a fourth pane. It lives behind a global entry point
  (e.g. a header icon / settings-level page), because it is cross-article. It
  *surfaces into* the article UI contextually: when a lexicon term is used in
  chat or in a tone decision, it renders as a recognizable chip the user can
  hover/tap to see the definition being applied.
- Narrow screens: panes become swipeable tabs (Chat / Brief / Draft) with badge
  indicators when a non-visible pane changed this turn.

## 4. Core objects

These are the nouns the whole UX is built on. Getting their identity model right
is the single most load-bearing implementation concern.

### 4.1 Article (project)

The container: one chat thread, one brief, one draft, plus metadata (title,
status, created/updated). A home screen lists articles; "New article" starts one
in Plan mode (§5).

### 4.2 Outline node

The unit of structure. A tree of nodes, each with:

- a **stable ID** (survives moves, renames, re-parenting — this is what everything
  else binds to),
- a title and an optional intent note ("what this section must accomplish"),
- an optional **tone override** (§4.3),
- a binding to a **Draft section** (§7),
- (later) pinned references and anecdotes (§9).

Both the user and the agent can create, edit, reorder, re-parent, merge, and
delete nodes. Direct manipulation (drag in list or mindmap, inline rename) and
chat instruction ("move the anecdote before the argument") are equivalent — both
mutate the same tree and both are logged the same way.

### 4.3 Tone decision

The Tone tab holds:

- a **global tone** for the piece — a short set of terms (chips), each either a
  Lexicon term or a free-form word, plus an optional free-text note ("write like
  a letter to a smart friend"), and
- **per-node overrides** — e.g. the intro is "warm, personal" while the analysis
  section is "professional". Overrides show on the node in the Outline view as a
  small chip, so the tone map of the article is visible at a glance.

When the user says "more passionate," the agent's first move is to resolve the
word: if "passionate" exists in the Lexicon, apply that definition and show the
chip; if not, apply its best guess **and offer to save the interpretation to the
Lexicon** (a one-tap accept). This is the main loop by which the Lexicon grows.

### 4.4 Draft section

The Draft is not one blob of text: it is a sequence of sections, each bound to an
outline node by ID. This binding is what makes restructuring work (§7). The user
can edit draft text directly in the pane; user edits are first-class (§7.3).

### 4.5 Lexicon entry

A named term ("passionate", "professional", "punchy") with:

- a definition in the user's words and/or the agent's distilled description,
- optionally, do/don't examples ("passionate ≠ exclamation points; it means
  conviction, first person, shorter sentences"),
- provenance: taught explicitly, or distilled from feedback ("last time you said
  'punchier' you liked it when I cut qualifiers — save that as the meaning?").

Entries behave like skills/hooks in a coding agent: they are injected into the
agent's context whenever the term is invoked. Editable from the Lexicon page and
from any chip in context.

## 5. Modes

An article moves through explicit modes; the current mode is always visible and
mode changes are deliberate user actions.

### 5.1 Plan mode (default for a new article)

- The Draft pane is empty/placeholder; the Brief is the star.
- Conversation is about the piece: what it's for, who it's for, structure, tone.
  The agent builds the outline and proposes tone decisions live in the Brief as
  the conversation goes; the user edits directly or by chat.
- Exit is explicit: a **"Start drafting"** action (with the agent able to suggest
  it: "I think the plan's ready — start drafting?"). Nothing is written to the
  Draft before this.

### 5.2 Draft mode

- The main loop. Each turn, the agent writes/rewrites Draft sections per the
  Brief. The Brief stays fully editable — but a Brief change during Draft mode is
  a **conscious decision** with visible consequences: affected sections are
  marked stale (§7.2), and the agent confirms structural changes before
  executing rewrites ("Moving 'the anecdote' above 'the argument' — rewrite both
  transitions?").
- There is no separate "revise mode"; revision is just more turns in Draft mode.
  (A distinct polish/copy-edit mode is a candidate for later, not v1.)

### 5.3 Done

- A lightweight terminal state: article marked complete, export (markdown /
  copy / clipboard-rich-text), and a natural moment for the agent to propose
  Lexicon updates learned during the piece ("You steered me toward shorter
  intros twice — save as a preference?").

## 6. Key flows

### F1 — New article
Home → New article → Plan mode. Agent opens with a short interview (topic,
audience, angle, rough length). Outline materializes in the Brief as they talk.
User tweaks nodes directly. Tone chips get set. User hits **Start drafting**.

### F2 — The drafting turn
User sends a message → agent responds in chat (brief, conversational) while its
actual work lands in the panes: Draft sections update with **change highlighting**
(what changed this turn is tinted until the next turn or until dismissed), and
any Brief mutations it made are listed as a compact "plan changes" line in its
chat message. The chat message summarizes *what it did and why*, not the prose
itself — the prose lives on the right.

### F3 — Restructure ("re-arrange it like this…")
Via chat or via dragging nodes in the Outline. Either way: tree changes →
sections re-order in the Draft immediately (cheap, lossless) → sections whose
*context* changed (new neighbors, new parent) get a **stale** marker → user or
agent triggers "smooth the seams" rewrites of transitions. Moving a node never
loses its text.

### F4 — Tone change ("…and write it more passionately")
Term resolves against the Lexicon (§4.3) → tone chip updates (global or on the
targeted nodes) → affected sections marked stale → agent rewrites them, change-
highlighted. If the term was unknown, the agent's chat reply includes its
interpretation and a one-tap "save to Lexicon".

### F5 — Direct edit by the user
User types in the Draft pane. The edit is attributed to the user and treated as
signal: the agent must preserve user-authored phrasing in later rewrites unless
told otherwise, and may ask "you rewrote the lede — want me to match that voice
in the rest?" — which is also a Lexicon-teaching moment.

### F6 — Teaching the Lexicon deliberately
From the Lexicon page: add a term, define it, add do/don't examples. From
context: click any tone chip → "edit what this means". From feedback: agent
proposes entries after observing corrections (always opt-in, never silent).

## 7. The sync model (Brief ⇄ Draft)

This is the heart of the product and deserves its own section in the build plan.

### 7.1 Binding
Every Draft section is bound to an outline node ID. Node order = section order.
Creating a node creates an (empty, planned) section; deleting a node prompts —
delete the text, or detach it to a "cut material" holding area (default: cut
material, so nothing is ever silently destroyed).

### 7.2 Staleness
Any Brief change that invalidates existing prose (reorder, tone change, intent
note edit) marks the affected sections **stale** — a visible per-section badge in
the Draft, with a one-line reason ("tone changed to 'passionate'", "moved after
'the argument'"). Stale ≠ auto-rewritten: rewrites happen when the user asks, or
when the agent proposes and the user accepts. Stale badges are the UI's honesty
mechanism — the Draft never pretends to reflect a Brief it doesn't.

### 7.3 Attribution
Every section tracks who last touched it (user / agent). User-touched text gets
gentle protection: the agent rewrites it only with explicit instruction, and the
UI can show a subtle marker on user-authored passages.

### 7.4 Change review
Agent edits to the Draft are highlighted per turn (F2). v1 keeps this
lightweight: highlight + a per-section "revert to before this turn" action.
Full diff-review/approve-each-change is deliberately **not** v1 — it would slow
the loop down; the revert affordance is the safety net.

## 8. The Lexicon (layer 4) — v1 scope

v1 ships the Lexicon small but real:

- a flat list of terms with free-text definitions and optional examples,
- chips wherever terms are used (tone tab, chat),
- resolve-on-use + offer-to-save (§4.3),
- agent-proposed entries from feedback, opt-in.

Explicitly later: term categories, per-publication voices, importable style
guides, hook-like triggers ("always do X when drafting an intro").

## 9. Later features (design for, don't build)

- **Pinned references:** attach links, quotes, anecdotes, and notes to specific
  outline nodes. Because everything binds to node IDs, moving a node carries its
  pinned material with it, and the agent knows which evidence belongs to which
  point. UI: a References tab in the Brief plus pin affordances on nodes. The
  v1 requirement this imposes: **node IDs must be stable and everything must
  bind to them** — that's already in §4.2.
- **Cut-material drawer** as a browsable space (v1 only needs it to exist as a
  safe destination for deleted sections).
- **Polish mode** (copy-edit pass with tracked suggestions).
- **Multi-document / series awareness**, collaboration, publishing integrations.

## 10. Open questions for the build plan

1. **Mindmap fidelity in v1.** The list view is required; is the mindmap view v1
   or fast-follow? Recommendation: v1 ships list-only with the data model ready
   for the mindmap, mindmap ships immediately after. (The tree is the product;
   the mindmap is a rendering.)
2. **Granularity of sections.** One draft section per leaf node, or per any
   node? Recommendation: prose attaches to leaves; parent nodes render as
   headings only. Keeps the binding model simple.
3. **How much the agent auto-rewrites.** After a Brief change, does the agent
   rewrite stale sections automatically in the same turn when the user's message
   clearly requested it ("rearrange and rewrite"), asking only when ambiguous?
   Recommendation: yes — infer intent from the instruction, confirm only for
   large blast radii (>N sections stale).
4. **Streaming into the Draft.** Sections should stream in as they're written
   (the pane feels alive) — confirm this constraint reaches the build plan since
   it shapes the agent-to-UI protocol.
5. **Where chat shorthand meets the Brief.** If the user gives a tone
   instruction in chat but it never lands as a tone chip, the Brief lies. Rule
   to enforce: durable instructions must be reified into the Brief (agent does
   this automatically and notes it); one-off instructions ("fix that typo")
   don't. The build plan needs a crisp heuristic for which is which.
