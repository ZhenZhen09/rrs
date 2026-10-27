# Web Typecheck Repair Implementation Plan

> **For agentic workers:** Use executing-plans to implement this repair inline, then request one read-only review.

**Goal:** Resolve the 221 root web TypeScript diagnostics while preserving current workflows and strict compiler options.

**Architecture:** Remove compiler-confirmed unused declarations; align domain types to actual server payloads; guard optional values at their consumers; restore Vite ambient declarations and the missing DOM test tooling. Avoid casts that conceal incompatible data.

**Requirements:** User authorized fixing all reported errors on 2026-10-04. Keep existing working-tree changes, request permissions, status behavior, layouts, and compiler strictness. No deployment or commit requested. Manual live messaging acceptance stays with the user.

## Tasks

- [ ] Capture the current source baseline and reproduce the diagnostics. Preserve all current source bytes in ignored scratch before cleanup. Use installed TypeScript's diagnostics/code fixes for unused imports; inspect local declarations before removal.
- [ ] Remove unused imports, destructured props, unused function declarations, and unused state reads while retaining used setters and side effects. Verify through TypeScript diagnostics and inspect changes against the captured baseline.
- [ ] Match RequestStatus/DeliveryStatus and RiderLive to the server routes; share auth return typing; guard optional names, timestamps, callbacks and ETA endpoints; remove incompatible browser geolocation options. Add focused tests for actual behavior changes and a typed fixture for server status compatibility. Add Vite client declarations.
- [ ] Restore the existing rider-map DOM test's missing dependency/environment and make that test use isolated providers and map mocks. Run all installed unit suites affected by the change.
- [ ] Run lint -> typecheck -> test -> build with installed package tools. Root/server lack dedicated lint scripts: use the existing Expo ESLint configuration explicitly on affected web files. Stop at failures, fix, and restart the sequence. Live fixture browser tests remain pending per user's manual-testing preference.
- [ ] Obtain a read-only review of this continuation against captured source; address important findings; update graphify and record fresh verification evidence.

## Review focus

- Do not erase used React state setters or effectful initializers while removing unused reads.
- Do not widen types beyond status values actually supported by server handlers.
- Missing requester names/timestamps and optional modal callbacks must remain usable.
- Button events must not become truthy boolean flags passed to refresh functions.
- Unit tests must isolate map rendering, authorization, fetch state, and DOM cleanup.
