# Button Icon Ideas

## Direction

Explore selectively replacing button-bar text with icons. The goal is a more
compact, visual, and language-independent interface while preserving
QWERTYcube's practical keyboard-oriented character.

The intended aesthetic is a restrained technical instrument panel with a little
personality, rather than an icon-only toolbar at all costs.

## General Guidance

- Use an icon when a new user can reasonably predict its action.
- Retain text when the action has no clear or established symbol.
- Keep icons monochrome and visually simple at button size.
- Use a consistent stroke width, visual size, spacing, and hover treatment.
- Preserve full action names and keybindings in tooltips and Help.
- Give icon-only buttons accessible text with `aria-label`.
- Prefer inline SVG for custom icons. SVG remains sharp at any scale, provides
  consistent rendering across platforms, and can inherit configured colors.
- Unicode may be suitable for simple prototypes, but its appearance varies by
  font, browser, and operating system.

## Strong Icon Candidates

- Help: question mark or help-circle.
- Scramble: small scrambled cube.
- New: small solved cube.
- Settings: gear.
- Color: palette.
- Lock: open or closed lock.
- Timer: stopwatch.
- Undo and Redo: single left and right arrows.
- Undos and Redos: double left and right arrows.
- Cube size controls: cube combined with minus, `3`, and plus.

The history controls could form a compact transport-like group:

```text
<<  <  [savepoint]  >  >>
```

The exact arrows should probably be SVG rather than literal ASCII or Unicode.

## Savepoint

A floppy-disk icon is recognizable as "save," but it implies persistent file
storage. QWERTYcube's Save action instead marks a position in move history.
A bookmark, flag, snapshot, or divider symbol may communicate that distinction
better.

## Scramble And Training Input

Related actions can share a small modifier to create a consistent visual
language:

- Scrambled cube: generate a scramble.
- Scrambled cube plus pencil or input marker: enter a scramble.
- Train locomotive: enable training.
- Train locomotive plus the same marker: enter a training sequence.

A little steam-engine icon is playful rather than immediately literal, but it
makes the Train action memorable. The tooltip and Help text can resolve the
meaning on first use.

## Likely Text Buttons

These controls may remain clearer as text, at least initially:

- Heise, because it names a particular keyboard mapping.
- Inst, because a lightning or speed icon could mean several different things.
- Input actions until a clear and legible icon-plus-marker design exists.

A mixed icon/text bar is acceptable when all buttons share consistent sizing,
typography, spacing, colors, and interaction behavior.

## Suggested Experiment

Start with the five history controls plus New and Scramble. This is enough to
evaluate compactness, legibility, visual consistency, and tooltip discovery
without committing the entire button bar to icons.

If successful, add standard icons for Help, Settings, Color, Lock, and Timer, then
develop the custom cube and train icon family.
