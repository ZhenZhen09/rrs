---
name: quality-gate
description: Use when code changes are ready for validation, before claiming a feature is complete or handing work back for review.
---

# Quality Gate

Run the affected package checks in this order:

1. **Lint** — use the package's lint script.
2. **Typecheck** — use the package's typecheck script, or `npx tsc --noEmit` when the package has TypeScript but no script.
3. **Test** — run the package test script, preferably in CI/non-watch mode.
4. **Build** — run the package build script or its documented framework equivalent.

Use the smallest set of affected packages, but include every package touched by the change. In this repository:

- Root web/server: `npm run build` is the available build command. Use the package's existing lint/test commands when present.
- `mobile-app`: run `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`, then `npx expo export --platform web` unless a more specific release build is required.

Do not install dependencies, change scripts, or weaken checks to make the gate pass without user authorization. Stop at the first failed stage, fix the cause, then rerun the full sequence from lint. If a required command does not exist, report it explicitly and run the closest supported equivalent; never imply that stage passed.

Final reports must name each command, its result, and any pre-existing or unrelated failures. Only call the change complete when all applicable stages have fresh passing evidence.
