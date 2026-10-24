## Overview

- QWERTYcube is a browser-based JavaScript puzzle cube simulator.
- It has no build step or application framework. `index.html` loads the ES
  module `js/qwertycube/bootstrap.js`, which exposes Three.js APIs globally and
  then loads the remaining legacy-style scripts in a deliberate order.
- Most QWERTYcube symbols are globals. A symbol prefixed with a file's
  lowercase basename is public; an additional leading underscore means it is
  private to that file.

## Repository expectations

- All JavaScript is in the `js` directory.
- QWERTYcube code is in `js/qwertycube`. Only QWERTYcube code should be modified for most changes.
- Third party code is in `js/third-party`. Avoid modifying third party code unless the user explicitly asks for it or the task is specifically about third party integration.
- Do not read large third party generated/minified files unless needed. Prefer QWERTYcube wrapper code and published APIs.
- The user usually performs browser/manual testing.
- Preserve unrelated user changes in a dirty worktree. Do not regenerate,
  replace, or remove image assets unless the task requires it.

## Architecture

- `bootstrap.js` imports modern Three.js modules and loads the legacy scripts.
  Treat the script order in `_bootstrapLoadLegacyScripts()` as dependency
  order; do not reorder it casually.
- `Init.js` owns startup, the main button definitions, localStorage, and scene
  initialization. Buttons with a `key` are routed through the same event path
  as keyboard shortcuts.
- `Event.js` interprets keyboard, button, mouse, and touch input. Keep button
  and keyboard behavior consistent rather than implementing a feature in only
  one input path.
- `Animate.js` owns the render loop, active/queued moves, camera setup, timer,
  and status display. Avoid adding allocation-heavy or scene-rebuilding work
  to the per-frame hot path.
- `Rotate.js` applies rotations and maintains move history and solve-arrow
  progress. `Scramble.js` and `Solve.js` own their corresponding workflows.
- `Cubies.js`, `Arrows.js`, and `Text.js` create the main scene objects.
  `Utils.js` contains shared move parsing/manipulation helpers.
- User-facing Help is static markup in `index.html`. Update it when controls or
  behavior change; tooltips and button definitions alone are not sufficient.

## Move and state model

- Moves use QWERTYcube's internal notation after parsing. Examples include
  `R`, `R'`, `R2`, wide moves such as `r`, slices, full-cube rotations, and
  numbered layer ranges such as `2-3R`.
- `|` is a savepoint/phase marker, not a physical rotation. Parsing,
  normalization, undo/redo, and solver replay must preserve its boundaries.
- `animateMoveQueue` contains pending moves and `animateMoveCurrent` is the
  active move. `animateMoveHistory` is chronological, while
  `animateMoveHistoryNext` is the next redo position.
- Solver moves are separate from move history. `solveMoves` and
  `solveMovesInitialNext` relate a solve to the history position where it was
  created. Do not assume savepoints occur at matching indexes in the two
  arrays.
- Move-history normalization must not cross savepoints. Replay moves are
  marked so animation consolidation does not alter a solver sequence.

## Settings and persistence

- `settingsVarNameDescs` in `Settings.js` is the source of known settings,
  persistence flags, and Config-dialog descriptions. Keep it alphabetized.
- Query parameters override localStorage during page load. Do not persist all
  in-memory settings as a side effect of changing one control; doing so would
  make unrelated URL overrides or temporary camera changes permanent.
- Durable preference and cube-order controls persist their individual setting
  immediately through `initSaveStorageVariable()`. Enabling rotation lock also
  captures and persists the current camera location.
- Config/Ok applies the complete settings text and saves all settings marked
  persistent. Values such as move history, scramble moves, solve moves, and
  solve anchors are intentionally non-persistent unless their definitions are
  deliberately changed.
- New user-facing settings need a default global, an entry with a concise
  description, and correct persistence behavior. Consider URL, copy/paste,
  reset, and Config/Ok interactions.

## Solver and scrambler integration

- Cubearoni is generated third-party code in
  `js/third-party/cubearoni.js`; do not edit it here. QWERTYcube integration is
  primarily in `Init.js` and `Solve.js`.
- Cubearoni database files are fetched on demand from `db/` through its file
  loader callback. Solving is asynchronous and callers must await it.
- CFOP solves may contain `|` phase markers. JSSS provides random-state
  scrambling and a facelet-based 3x3 solver path.
- Solver functionality is fundamentally 3x3-oriented. Larger cubes support
  display and manual move notation, but solver changes must not imply broad
  large-cube support without verification.

## Local testing

- Use `node --check js/qwertycube/<file>.js` for JavaScript syntax checks on edited files.
- Browser unit tests can be run by setting `testsRunAll=true` in the Settings dialog and clicking Ok.
- For local browser testing, serve the repository with `python3 -m http.server` and open the served URL. Some features, especially fetches for `db/` files, do not work reliably from a `file://` URL.
- Use `git diff --check` after edits. Run `xmllint --noout index.html` when
  changing the XHTML if `xmllint` is installed.
- For browser testing, check both visible behavior and the JavaScript console.
  When testing localStorage, preserve and restore existing values rather than
  clearing the user's full QWERTYcube state.
- Pure parsing and move transformations belong in `Tests.js`. Scene, input,
  persistence, and asynchronous solver changes generally need browser tests in
  addition to syntax checks.

## Coding guidance

- Keep changes small and focused on the requested behavior.
- Preserve existing global-variable style and file structure unless the task is specifically a refactor.
- Keep the established file sections (`Public globals`, `Private globals`,
  `Public functions`, and `Private functions`) and add a short comment before
  each new function.
- Add or update tests in `js/qwertycube/Tests.js` when changing parsing, move manipulation, or other pure utility logic.
- Keep move history, solve moves, and scramble moves in QWERTYcube's internal notation after input normalization.
- Be careful with persisted settings in `Settings.js`; new user-facing configuration should include a clear one-sentence description.
- Prefer updating QWERTYcube wrappers over modifying vendored code. Avoid
  introducing a package/build dependency for a small change.
