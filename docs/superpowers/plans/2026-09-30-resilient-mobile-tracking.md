# Resilient Mobile Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make rider tracking durable across normal app restarts and connectivity loss, while providing reliable offline replay and clearly documenting platform limits for force-terminated apps.

**Architecture:** Use a persistent delivery session plus a SQLite-first location outbox. Every accepted GPS sample receives a stable event ID and sequence number, is persisted before network transmission, and is uploaded through an idempotent batch endpoint. Socket.IO remains the real-time display channel; the database and acknowledged event stream remain the source of truth.

**Tech Stack:** React Native/Expo SDK 57, `expo-location`, `expo-task-manager`, `expo-sqlite`, `@react-native-community/netinfo`, Axios, Express, MySQL, Socket.IO, Jest.

**Spec:** Current repository audit and the resilient tracking architecture agreed in the conversation on 2026-09-30.

## Global Constraints

- Preserve the existing `server/locationTracking.ts` validation, live Socket.IO broadcasts, `location_logs`, and watchdog behavior.
- Do not mark a location event synchronized until the server acknowledges its event ID.
- Do not use WebSocket delivery as the only transport for GPS data.
- Do not collect background location when the rider is off duty or has no active delivery session.
- Do not promise continuous execution after iOS force-quit or Android force-stop; expose this as a platform limitation.
- Use the existing Expo-compatible location configuration and avoid custom native modules unless Expo APIs cannot satisfy a tested requirement.
- After code changes, run `graphify update .` and the Quality Gate in order: lint → typecheck → test → build/export.

## Review Focus

- App restart during an active delivery: the session and tracking task resume without creating a second session.
- Network loss during tracking: every valid sample is retained locally and later replayed without duplication.
- Repeated batch submission or timeout after server acceptance: the server returns an idempotent acknowledgement and does not duplicate history.
- Old or invalid samples: server validation rejects invalid ownership, timestamps, coordinates, and stale data without blocking newer samples.
- Force-quit or OS background restrictions: the UI and documentation distinguish guaranteed recovery from platform-dependent best effort.

## Current Gaps to Close

| Area | Current state | Target state |
|---|---|---|
| Background location | Implemented through `TaskManager.defineTask` and `startLocationUpdatesAsync` | Keep it, but route every sample through durable local persistence first |
| Active delivery restart | Active request/duty values persist in AsyncStorage | Add a versioned delivery-session record and server reconciliation on boot |
| Offline buffering | SQLite outbox exists and location requests are queued after network failure | Persist location before attempting upload and preserve all valid samples |
| Reconnect retry | `SyncManager` retries while the JS process is alive | Add boot, network, foreground, and background-event triggers with bounded backoff |
| Location upload | Single-event endpoint | Add batch upload with per-event acknowledgements |
| Location batch handling | Background task keeps only the newest location in a batch | Store/process every valid location in the batch |
| Idempotency | Status updates use idempotency keys; location events lack stable event identity | Add event IDs, sequence numbers, unique database constraints, and replay-safe responses |
| Closed-app recovery | Not guaranteed | Improve Android foreground-service recovery and provide iOS best effort; never claim an absolute guarantee |

### Task 1: Establish the tracking contract and baseline tests

**Files:**
- Create: `mobile-app/types/tracking.ts`
- Create: `mobile-app/services/__tests__/trackingContract.test.ts`
- Modify: `mobile-app/types/index.ts` only if the existing `Job` type needs the shared session fields
- Test: `server/routes/__tests__/locationBatch.test.ts` or the repository's existing server test location

**Interfaces:**
- Produces `TrackingSession`, `LocationEvent`, `LocationBatchRequest`, and `LocationBatchResponse` types used by mobile and server tasks.

- [ ] Define `TrackingSession` with `sessionId`, `requestId`, `riderId`, `startedAt`, `status`, and `lastSequence`.
- [ ] Define `LocationEvent` with `eventId`, `sessionId`, `requestId`, `riderId`, `sequence`, `capturedAt`, `latitude`, `longitude`, `accuracyM`, optional heading, battery, and network type.
- [ ] Define the batch response as `{ acceptedEventIds: string[]; rejected: { eventId: string; reason: string }[]; latestServerSequence?: number }`.
- [ ] Write tests for valid events, invalid coordinates, non-finite values, missing IDs, future timestamps, and sequence ordering.
- [ ] Run the focused mobile and server contract tests and confirm the new tests fail before implementation.

### Task 2: Add a persistent delivery-session state machine

**Files:**
- Create: `mobile-app/services/trackingSessionService.ts`
- Create: `mobile-app/services/__tests__/trackingSessionService.test.ts`
- Modify: `mobile-app/services/localDb.ts`
- Modify: `mobile-app/context/LocationContext.tsx`
- Modify: `mobile-app/app/_layout.tsx`
- Modify: `mobile-app/hooks/data/useJobDetails.ts` if session reconciliation belongs there

**Interfaces:**
- Produces `startTrackingSession(requestId, riderId)`, `getActiveTrackingSession()`, `reconcileTrackingSession()`, and `endTrackingSession(reason)`.

- [ ] Add an `active_tracking_session` SQLite table with one active row per rider, a schema version, session ID, request ID, rider ID, start time, status, and last sequence.
- [ ] Make session creation transactional and idempotent: starting the same request twice returns the existing session.
- [ ] Replace direct reliance on independent AsyncStorage keys for active tracking decisions with the session service, while retaining the keys only for backward-compatible migration.
- [ ] On app bootstrap, load the local session and call the server’s active-task endpoint to confirm whether the delivery remains active.
- [ ] End the local session only after a terminal server state or explicit confirmed handover/shift-ending action.
- [ ] Test cold launch, duplicate start, active server task, completed server task, expired local session, and rider-account mismatch.

### Task 3: Make the SQLite outbox capture every location event first

**Files:**
- Modify: `mobile-app/services/localDb.ts`
- Create: `mobile-app/services/locationOutbox.ts`
- Create: `mobile-app/services/__tests__/locationOutbox.test.ts`
- Modify: `mobile-app/context/LocationContext.tsx`
- Modify: `mobile-app/services/apiService.ts`

**Interfaces:**
- Produces `appendLocationEvent(event): Promise<void>`, `getPendingLocationEvents(limit): Promise<LocationEvent[]>`, `markLocationEventsAcknowledged(ids): Promise<void>`, and `markLocationEventsRejected(ids, reason): Promise<void>`.

- [ ] Add a `location_outbox` table with unique `event_id`, session ID, request ID, rider ID, sequence, payload, status, retry count, last error, created time, and expiry time.
- [ ] Generate event IDs using device ID + session ID + sequence, and increment the sequence transactionally before inserting the event.
- [ ] Change the background task to persist every valid location in the received `locations` array instead of selecting only the final item.
- [ ] Do not delete an event merely because the immediate network call failed; leave it pending for replay.
- [ ] Add retention limits for maximum queue rows and age, with a visible diagnostic count and a server-side audit for expired samples.
- [ ] Test multiple locations in one background callback, app termination after insertion, duplicate event insertion, queue ordering, and invalid sample rejection.

### Task 4: Implement the idempotent batch location API

**Files:**
- Create: `server/schemas/locationBatch.ts`
- Modify: `server/routes/users.ts`
- Modify: `server/locationTracking.ts`
- Modify: `server/index.ts` only if route registration or middleware changes are required
- Modify: database migration/bootstrap files for the event uniqueness constraint
- Create: `server/routes/__tests__/locationBatch.test.ts`

**Interfaces:**
- Adds `POST /api/users/location/batch` accepting `{ sessionId, events: LocationEvent[] }` and returning per-event accepted/rejected results.

- [ ] Validate authentication, rider ownership, active assignment, coordinate ranges, accuracy, capture timestamp, maximum batch size, and maximum event age.
- [ ] Add a unique constraint on `event_id`; duplicate events must return accepted/idempotent results without inserting a second `location_logs` row.
- [ ] Process events in sequence order but allow a late event to be accepted when it is valid and not older than the configured retention window.
- [ ] Update the rider’s latest location/presence from the newest accepted event and emit the existing Socket.IO update shape to Admin rooms.
- [ ] Preserve the existing single-event endpoint for backward compatibility, but route new mobile code through the batch endpoint.
- [ ] Test successful batches, duplicates, partial rejection, unauthorized rider, inactive request, stale timestamp, invalid coordinate, oversized batch, and database retry after a timeout.

### Task 5: Build replay-safe synchronization

**Files:**
- Create: `mobile-app/services/locationSyncService.ts`
- Create: `mobile-app/services/__tests__/locationSyncService.test.ts`
- Modify: `mobile-app/services/SyncManager.ts`
- Modify: `mobile-app/services/syncQueue.ts` only if shared retry primitives are reused
- Modify: `mobile-app/context/LocationContext.tsx`
- Modify: `mobile-app/app/_layout.tsx`

**Interfaces:**
- Produces `flushLocationOutbox(trigger): Promise<SyncResult>` and uses the batch endpoint from Task 4.

- [ ] Read pending events in ascending sequence order and send bounded batches.
- [ ] Mark only `acceptedEventIds` as acknowledged; retain transient failures as pending and permanently rejected events as rejected with an operator-visible reason.
- [ ] Add exponential backoff with a maximum retry delay, request timeout, and a single-flight lock so multiple triggers cannot upload the same batch concurrently.
- [ ] Trigger flush on app startup, network recovery, foreground transition, after a background location callback, and after a successful status update.
- [ ] Keep status-action synchronization separate from location replay so a large GPS backlog cannot block completion/failure actions.
- [ ] Test offline capture, reconnect, partial acknowledgement, duplicate flush calls, server 5xx, 4xx rejection, auth refresh, and process restart with pending rows.

### Task 6: Harden background-task lifecycle and platform behavior

**Files:**
- Modify: `mobile-app/context/LocationContext.tsx`
- Modify: `mobile-app/utils/locationCapability.ts`
- Modify: `mobile-app/app.json`
- Modify: `mobile-app/components/ui/OfflineBanner.tsx`
- Create: `mobile-app/components/TrackingStatusBanner.tsx`
- Create: `mobile-app/utils/__tests__/locationCapability.test.ts`

**Interfaces:**
- Produces a user-visible tracking state: `tracking`, `queued`, `syncing`, `stale`, `permission_required`, `server_reconciliation_required`, or `stopped`.

- [ ] Keep `TaskManager.defineTask` at module scope and ensure registration is restored during app initialization.
- [ ] Start background tracking only after the server confirms the delivery session and the required location permissions are granted.
- [ ] Stop tracking only for terminal delivery state, explicit user stop, revoked permission, invalid authentication, or server-directed shutdown.
- [ ] Add a platform capability check and explain that Android foreground service recovery is best effort while iOS force-quit recovery is not guaranteed.
- [ ] Show queued-event count, last captured time, last successfully uploaded time, and stale status without exposing raw location data.
- [ ] Test permission denial, permission revocation, app background/foreground transitions, task already registered, task not registered after restart, and explicit force-stop messaging.

### Task 7: Add reconciliation and operational observability

**Files:**
- Modify: `server/routes/requests.ts` or the existing rider-task route
- Create: `server/routes/__tests__/trackingReconciliation.test.ts`
- Modify: `server/index.ts` watchdog handling
- Modify: `server/routes/analytics.ts`
- Modify: Admin tracking UI files that already render stale/offline state
- Modify: `mobile-app/app/(tabs)/index.tsx` or the active-delivery screen for recovery state

**Interfaces:**
- Adds a server response containing active tracking session state, last accepted sequence, last accepted timestamp, and stale/offline classification.

- [ ] Return the server’s active session and last accepted sequence during mobile bootstrap.
- [ ] Detect gaps between mobile `lastSequence` and server `lastSequence`; request replay rather than creating a second session.
- [ ] Keep the watchdog’s existing stale/offline events, but distinguish “no signal,” “queued locally,” “server rejected,” and “permission stopped.”
- [ ] Add metrics for queue depth, oldest pending event age, accepted/rejected counts, replay duration, and duplicate submissions.
- [ ] Test a server restart, mobile restart, socket-only disconnect, prolonged offline period, and a gap in sequence numbers.

### Task 8: Validate with device scenarios and release safeguards

**Files:**
- Create or modify: `mobile-app/e2e/resilient-tracking.spec.ts` or the repository’s existing device-test location
- Modify: deployment/environment documentation for background permissions and production builds
- Create: `docs/operations/resilient-mobile-tracking.md`

- [ ] Test on a physical Android device with the app backgrounded, screen locked, network disabled, network restored, and app reopened.
- [ ] Test Android battery optimization and foreground-service notification behavior on a representative manufacturer device.
- [ ] Test iOS background tracking, permission downgrade, app suspension, and force-quit behavior; record the non-guaranteed cases explicitly.
- [ ] Test duplicate batch requests caused by a simulated timeout and verify one server record per event ID.
- [ ] Test delivery completion while a location backlog exists and confirm completion actions are not blocked by GPS replay.
- [ ] Run `graphify update .` after implementation.
- [ ] Run the Quality Gate in order: lint → typecheck → test → build/export; stop and fix failures before continuing.
- [ ] Roll out behind a feature flag or staged configuration, beginning with diagnostic queue metrics before enabling aggressive background sampling.

## Recommended Execution Order

Implement Tasks 1–4 as the contract, persistence, and server vertical slice. Implement Tasks 5–6 next to connect replay and platform lifecycle behavior. Implement Tasks 7–8 before production rollout. The Android and iOS behavior should be documented as best effort where platform termination rules prevent an absolute guarantee.

## Explicit Non-Guarantees

The implementation should guarantee durable local persistence and eventual replay whenever the operating system gives the app execution time. It cannot guarantee continuous tracking after a user force-stops the app, swipes it away under iOS termination behavior, revokes permissions, disables location services, or the device powers off. The UI must show these conditions instead of representing them as successful tracking.
