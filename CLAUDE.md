# CLAUDE.md

## How to talk to me

The `Clear Technical` output style in `.claude/output-styles/clear-technical.md`
governs every string a human reads — chat, commit messages, PR bodies, code
comments, UI copy. The `prose-clarity` skill applies the same rules as a rewrite
pass over text that already exists.

## The screen we design for

**The target screen is a 1298px-wide window.** Judge a layout there: if a choice
between two layouts comes down to how each one looks, 1298px settles it. That
width is `--breakpoint-lg` in `src/client/styles/theme.css`, so the `lg:`
utilities are the ones the target screen gets. Narrower windows still have to
work, and they are not what a design is tuned against. `docs/ui.md` carries the
longer note.
