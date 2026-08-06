# Journo Harness

A writing harness where the writer writes the prose and an AI acts as a guide. The
requirements source is [docs/ux-outline.md](./docs/ux-outline.md); this file fixes the
words, and nothing else.

## The app

**Area**:
A top-level destination. There are three: Articles, House, and Team.
_Avoid_: section, page, tab, workspace

**View**:
One way of looking at an Area. The Articles Area has a Board View and an Archive View.
_Avoid_: mode (a Mode is Plan or Write), screen, filter

**Team**:
The people who may read the same material, and the Area where the writer manages them.
There is one Team in v1, holding two people. It is the privacy boundary, and nothing
else is.
_Avoid_: room (party-db's word for its own sync unit, not ours), organisation, tenant,
workspace, account

**House**:
The writer's own material, held across every Article — the Lexicon, the standing rules,
the Skills, and the writing samples. Named for house style. It is an Area, not a Layer.
_Avoid_: layer 4, global settings, user settings, workspace

## The Article and its Layers

**Article**:
One piece of writing, and the container for its four Layers plus a title, a status, and
a word-count target.
_Avoid_: project, document, piece (except in prose about the writing itself)

**Layer**:
One of the four kinds of material belonging to one Article: the Chat, the Plan, the
Draft, and the Notes. The House is not one of these.
_Avoid_: section (a Section is part of the Draft), stage (the writer owns their own
process, and we do not name it for them), tier

**Pane**:
The column of the Article screen showing one Layer. Four Layers, four Panes, and on a
narrow screen they become tabs.
_Avoid_: section, panel, rail (a rail is a collapsed Pane, not a different thing)

**Mode**:
Which way of working the Article screen is set up for — Plan or Write.
_Avoid_: view, state, phase (a Phase is a build stage: 1a, 1b, 2)

**Chat**:
The dialogue between the writer and the guide about one Article.
_Avoid_: conversation, thread

**Plan**:
The structured plan for one Article — its Outline nodes, its Tone decisions, its
word-count targets, its references, and its quotes. It is what the Chat and the writer
co-construct, and it plays the role a plan plays in an agentic coding tool.
_Avoid_: **brief** (see below), outline (the Outline is one part of the Plan), context
stash, spec

**Brief**:
Reserved, and not ours to redefine. In journalism a brief is the commissioning document
a writer already holds, often long before they open this app. If the product ever takes
one in, it is an input to the Plan and never another word for it.

**Draft**:
The Article's prose. One continuous text, written by the writer.
_Avoid_: document, content, body

**Notes**:
The guide's accumulated observations about one Article. Some arrive alongside the Draft
as the writer works, and some arrive in batches from a Review.
_Avoid_: feedback, comments, findings, suggestions, review (a Review produces Notes)

## Inside the Plan

**Outline node**:
The unit of structure in the Plan. A node in a tree, carrying a stable ID, a title, an
intent note, and optionally a word-count target and a Tone override.
_Avoid_: section (a Section is in the Draft), item, heading, bullet

**Tone decision**:
A choice about how the writing should read, made at the House, the Article, or the
Outline node. Some terms come from the Lexicon and some are free-form.
_Avoid_: style, voice setting, tone tag

**Scope**:
Which level a Tone decision, a reference, or a quote is attached to — House, Article, or
Outline node. A narrower Scope overrides a wider one.
_Avoid_: level, tier, inheritance chain

## Inside the Draft

**Section**:
The stretch of Draft prose serving one Outline node. Approximate and inferred, rather
than a storage fact.
_Avoid_: chapter, part, block (a Block is the unit the Draft is stored in)

**Transition**:
The connective prose between two Sections, belonging to neither.

**Boundary**:
The place where one Section ends and the next begins. Inferred lazily (for now) and
reported approximately.

**Block**:
The unit the Draft is stored and synced in, usually one paragraph. Blocks settle lazily
and hold loosely — a paragraph the writer is in the middle of splitting may stay one
Block until they move on, and the structure is never enforced against them mid-flow.
_Avoid_: row, chunk, node (an Outline node is a different thing)

## The guide and its output

**Guide**:
The AI in its ambient role, reading the Draft against the Plan and writing Guidance
notes. The same model in dialogue is the Chat.
_Avoid_: coach, assistant, agent (an Agent is a Durable Object class)

**Guidance note**:
One observation from the Guide — a Kind, an anchor to a Section or a paragraph range,
and a body of one or two sentences. The unit that fills the Notes Layer.
_Avoid_: finding, suggestion, comment, tip, feedback

**Kind**:
What a Guidance note is about — structure, voice, citations, repetition, budget, tone
drift, pacing, plan divergence. Illustrative rather than a fixed taxonomy, and the
Notes Pane groups by it.
_Avoid_: category, type, tag, label

**Review**:
An intentional pass by the Guide over the whole Article or a chosen Scope, producing a
batch of Guidance notes at once. Distinct from the ambient Notes that arrive while the
writer works.
_Avoid_: audit, check, pass, analysis

**Round**:
One numbered Review of an Article. Rounds accumulate, so the writer can see what a
Review said before the last set of changes.
_Avoid_: run, iteration, version

**Skill**:
An editorial routine the writer authors in the app as natural-language instructions,
invoked by name from the Chat composer. Held in the House, and its output is Guidance
notes like any other.
_Avoid_: command, macro, prompt, action

**Proposal**:
A change to the Plan that the Chat offers and the writer accepts or rejects. The Chat
never writes to the Plan itself.
_Avoid_: suggestion, edit, tool call, patch

**Stale**:
Describes a Proposal whose target text has changed since the Proposal was generated. A
stale Proposal is refused, not merged.
_Avoid_: conflicted, out of date, diverged (Divergence is a Plan-versus-Draft term)

**Lexicon entry**:
A named term with the writer's definition of it, held in the House and injected into the
Guide's context whenever the term is invoked.

## Homes and lifecycle

**Article Agent**:
The Durable Object that hosts one Article — its Chat, its Plan, and its Notes.
_Avoid_: room, agent (unqualified), DO

**Done**:
Describes an Article the writer has finished writing. Independent of Archived — a Done
Article stays on the Board until it is Archived.
_Avoid_: complete, published, finished

**Final**:
The finished text of a Done Article, kept whole and readable without restoring anything.
Not every Article has one.
_Avoid_: output, export (an export is a file the writer takes away), published version

**Archived**:
Describes an Article the writer has put away. Nothing is destroyed, and the Plan, the
Draft, and the Final stay readable — only the Chat goes to cold storage, and
un-archiving asks the writer whether to bring it back whole or truncate it.
_Avoid_: deleted, removed, trashed, closed
