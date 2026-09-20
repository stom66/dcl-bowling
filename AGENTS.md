# Agent Guide

This repository contains Fastlane, a Decentraland SDK7 bowling game built around an
authoritative multiplayer server. Preserve the separation between trusted server logic,
shared contracts, and client presentation.

## Read first

Before making structural changes, read:

1. [`README.md`](README.md) for the repository overview.
2. [`DEVNOTES.md`](DEVNOTES.md) for auth-server dependency constraints.
3. The nearest subsystem README, when one exists.

Inspect the relevant implementation before assuming the documentation is current. If a
change alters a documented boundary or extension point, update the documentation in the
same change.

## Runtime boundaries

- `dcl/src/client/` is client-only rendering, input, messaging, and UI.
- `dcl/src/server/` is trusted authoritative logic, persistence, and metrics.
- `dcl/src/shared/` contains schemas, contracts, synchronized state, and code safe for
  both runtimes.
- `dcl/src/index.ts` is the runtime switch; keep client and server boot paths separate.
- `dcl/scene.json` must keep `authoritativeMultiplayer` enabled.

Clients may request actions. The server must validate and apply trusted state changes.
Do not expose server-only APIs or secrets to client code.

## Project extension points

- Add component schemas under `dcl/src/shared/components/definitions/`.
- Register components in `dcl/src/shared/components/registry.ts`.
- Do not edit `componentManager.ts` or `componentStore.ts` merely to add a component.
- Use `ServerBackedState` for scene-wide persistence and `PlayerBackedState` for
  per-player persistence.
- Put server-owned gameplay logic in `dcl/src/server/`, following the existing manager
  modules. Keep physics under `server/physics/` and telemetry under `server/metrics/`.
- Keep match lifecycle logic in `dcl/src/server/gameManager.ts`.
- Treat the game state machine, server-authoritative physics, lane state, player
  profiles, unlocks, equipped items, leaderboards, scoreboards, and metrics as core
  game systems.
- Name room messages `REQUEST_*` / `NOTIFY_*`, broad-to-narrow, grouped by domain.
- PostHog uses a hardcoded EU host. The only PostHog env var is `POSTHOG_API_KEY`.

## Task tracking

- Use the root [`TODO.md`](TODO.md) as the central backlog for playtest findings,
  review notes, and future work.
- Add new tasks there as unchecked checklist items. Keep enough context that another
  session can understand the intended result.
- Mark completed tasks as checked instead of removing them immediately.

## Dependencies and commands

Run scene commands from `dcl/`:

```sh
npm run build
npm run start
```

The auth-server versions of `@dcl/sdk` and `@dcl/js-runtime` are intentionally pinned.
Do not perform an automatic or broad dependency upgrade without checking compatibility.
Use `npm run upgrade-sdk:auth-server` for an intentional auth-server update.

## Editing expectations

- Follow the existing project structure and local style.
- Use tabs for code indentation.
- Prefer absolute TypeScript imports rooted at `src/`.
- Preserve unrelated user changes in the working tree.
- Keep generated/deployed assets in `dcl/assets/` and editable source assets in root
  `assets/`.
- Keep documentation concise and link to one source of truth instead of duplicating it.

## Code Style Guide

### Indentation

- Use tabs for indentation
- Tab size is 4 spaces

### Annotations

- Don't use emojis in comments
- Functions and class methods should always have a comment above them prefixed with "MARK:" and then the function name, to make them visible in the outliner
- Exposed/exported functions/public methods should always have docstrings, which should appear above the function, after the MARK statement

### Alignment and whitespace

- Use vertical alignment where appropriate, eg in object properties
- Files should always have a trailing newline
- Consecutive rows of variable declarations should use vertical alignment
- Functions with multiple input parameters should have each parameter appears on a new line and use vertical spacing for alignments
- Functions and class methods should have 2 line-breaks above their MARK comment to clearly separate them from the function before them

### File structure

- Always follow the existing project structure

### Import statements

- When adding imports, use absolute paths such as "src/client/foo.ts" instead of relative ones like "./foo.ts"
- Import order should be grouped into three sections:
  - External dependencies (e.g. npm packages)
  - Shared/internal modules (e.g. modules from common directories such as shared/ or replicated/)
  - Domain-specific modules (e.g. client/, server/, or other feature/domain folders)
- Import statements should not be split onto multiple lines
- Within each import section, imports must be sorted alphabetically by module specifier (file path), not by the names of the imported bindings.

### Builds and testing

- Always run `npm run build` after making changes to ensure the scene still builds

### Logging

- Logging statements should always be prefixed with the namespace/class/module name, and the current function, eg "SoundManager: PlaySound: an error occured..."

### Git commits

- Use conventional git commit prefixes such as feat, refactor, fix, chore, build, etc.
- Always use lowercase prefixes and prefer lower case messages except where this would change variable/functions/class/feature names
- If the user requests a large feature or significant refactor, encourage them to create and work in a new branch
