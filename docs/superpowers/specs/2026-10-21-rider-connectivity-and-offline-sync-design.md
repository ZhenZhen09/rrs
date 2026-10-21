# Rider connectivity and offline sync

Date: 2026-10-21

## Intent and success criteria

Riders need to recognize a real connectivity problem, continue an already assigned delivery using saved details, and trust that locally saved changes will reach Errands after reconnection. Company-owned device restrictions are configured by IT, independent of the app's connection state.

Success means a rider can start a delivery online, lose connectivity, record a status change, close and reopen the app after more than 24 hours, inspect the saved delivery and pending action, reconnect, and see **Synced** only after the server confirms the action. The app must not silently discard an unsent status or location event. A phone with internet access but an unavailable Errands service must not be described as having no internet.

## Scope

This change covers the rider mobile app's connection state, startup and dashboard presentation, offline delivery detail, status and location outboxes, reconnection, and the server contract for safe late retries. It includes deployment guidance and device testing for managed phones. It does not provision, enroll, or lock phones from the rider app.

## Existing behavior and gaps

- `mobile-app/app/_layout.tsx` displays the logo transition while authentication and initial tasks load. `mobile-app/components/ui/OfflineBanner.tsx` independently watches NetInfo and says “Waiting for network...” when a NetInfo flag is false.
- `mobile-app/app/login.tsx` already checks `/api/ping`, while `mobile-app/services/SyncManager.ts` uses NetInfo alone to decide when to flush. These can disagree when Wi-Fi works but Errands is unavailable.
- `mobile-app/services/apiService.ts` caches the active task list in SQLite. The job detail query uses an in-memory task query as initial data, so a cold offline launch must explicitly restore job details from the persisted cache.
- Status changes written by `apiService.ts` and generic items written by `mobile-app/services/syncQueue.ts` expire after 24 hours. `processQueue` filters expired rows and can leave a row in `syncing` after termination. The status update API returns `{ queued: true }` on a network error, but `mobile-app/hooks/data/useJobDetails.ts` treats that mutation as synced.
- `mobile-app/services/locationOutbox.ts` filters pending location events after 72 hours. Rejected events remain stored but are not surfaced to the rider.
- `server/middleware/idempotency.ts` stores a successful response for 24 hours and writes that record asynchronously after the status transaction. That is insufficient for a late retry of an action whose response was lost.

## Approach

Reuse the existing SQLite task cache and outboxes. Introduce a shared connection state and a small outbox API for delivery actions, then adapt the existing UI and sync manager. Replacing all queues with a new sync framework would require more migration work and create unnecessary risk for existing location tracking.

## Connection state

A single mobile connection service exposes `checking`, `online`, `no_network`, and `service_unavailable`, plus the time of the last successful Errands check. NetInfo reports transport availability; a short, uncached `/api/ping` request confirms the service. `null` or unknown NetInfo values remain `checking` until a check completes or times out. A failed ping with known network access becomes `service_unavailable`; a confirmed disconnected transport becomes `no_network`.

Check at startup, when the app returns to foreground, on NetInfo changes, and on a bounded retry timer while unavailable. Do not create multiple independent polling loops. A connection check must have a finite timeout, and ongoing checks must not hide a saved active delivery. The existing login health check should consume the same state rather than run its own interval.

## Rider presentation

The startup transition shows the Errands logo and “Checking connection” while the connection result is unknown. When online, normal task loading and dashboard behavior apply. When offline, the dashboard shows a clear title and message: `No Internet Connection` for `no_network`, or `Cannot reach Errands` for `service_unavailable`; both explain that new assignments and updates may be missed. It includes Retry and a platform-appropriate connection recovery action.

The active delivery screen remains accessible from saved tasks even if the dashboard cannot refresh. It shows the saved address, contacts, instructions, and current known status with an offline indicator. It distinguishes `Saved on this phone · Pending sync`, `Syncing`, `Synced`, and `Needs attention`. These states come from the persisted outbox and server acknowledgment, so they survive a process restart. A cached delivery may be stale; show its last refresh time without blocking work.

Android may use a tested system connectivity panel or managed-device recovery route. The exact action must be verified under the production lock-task policy. On iOS, do not label an app-specific settings link as a Wi-Fi shortcut; show the IT-provided recovery instructions when the managed policy prevents access. The app never enters or exits lock mode in response to an outage.

## Local delivery data and actions

Persist enough detail for an active delivery to survive a cold offline launch. Restore the job screen from SQLite before attempting a network refresh. Cache is scoped by rider ID and request ID; a different signed-in rider cannot view or send another rider's cached work. Do not erase pending actions on logout. If pending actions exist, warn before logout and preserve them for the same rider's next authenticated session; after explicit logout, hide cached delivery details until that same rider signs in again. Never send them under another account.

Each status action has a stable operation ID, rider ID, request ID, payload, creation time, and durable state: `pending`, `syncing`, `acked`, or `needs_attention`. Write it locally before treating an uncertain network outcome as saved. Preserve order for a delivery; retry transient errors with backoff, and recover interrupted `syncing` rows at startup. A queued action does not produce a synced UI result. Remove or archive an action only after an authoritative server acknowledgment; retain a visible error and reason for a permanent rejection or conflict.

Migrate existing SQLite rows without losing pending, failed, expired, or `syncing` data. The old 24-hour `expires_at` must no longer exclude unsent rider actions. Legacy rows without a trustworthy rider identity remain quarantined for support resolution and are never uploaded under the current account by assumption. Generic non-rider operations may keep a separate explicit retention policy, but must not share a silent expiry path with rider actions.

Location events remain in their outbox until accepted or explicitly rejected by the server. Remove the silent 72-hour query filter for unsent events. Provide a visible `Needs attention` state and diagnostics when a location event is rejected or local storage cannot accept more data. Monitor outbox size and storage pressure; any future compaction policy requires an explicit, reviewed data-retention rule and must never silently masquerade as successful sync.

## Server acknowledgment and reconciliation

The existing status endpoint accepts the stable operation ID through `Idempotency-Key`. For rider status actions, store a durable operation record keyed by rider and operation ID in the same database transaction as the status change and status log. A replay returns the recorded canonical outcome without repeating the status transition or side effects. A conflicting payload using the same key is rejected. Route this endpoint around the existing 24-hour asynchronous middleware cache; keep that middleware for other endpoints. The rider operation record does not expire while its delivery and audit history are retained.

The status response includes the operation ID and authoritative delivery status. On reconnect, the client sends pending actions in delivery order, records acknowledgments, then fetches current tasks and details. If the server rejects an action because assignment or status changed, the client keeps it in `needs_attention` with the server state and an actionable message. Network loss after a server commit is resolved by replaying the same operation ID, not by creating a new action.

Location batch sync continues to use event IDs and accepted/rejected lists. Only accepted IDs are removed locally. Rejected IDs remain inspectable with reasons. Connectivity is a trigger for retry, but a successful `/api/ping` alone never marks an item synced.

## Failure handling

- No cached active task: show the offline dashboard notice and explain that delivery details were not saved on this phone.
- SQLite write failure: tell the rider the action was not saved; do not display `Pending sync` or optimistically complete the job.
- Authentication expired while offline: retain local actions. An existing locally stored session may read its own cached delivery while offline, but upload requires valid authentication. Explicit logout hides the cache until the same rider signs in again.
- Repeated server failure: keep pending data and retry later; surface a persistent attention state for permanent errors.
- Out-of-order or terminal-state conflict: stop dependent status actions for that delivery, show the server's current status, and require a reviewed retry or support resolution.

## Verification and rollout

Test connection classification, startup unknown state, service outage, foreground recovery, cold offline launch, same-rider cache isolation, status creation and acknowledgment, app termination during sync, more than 24 hours offline, duplicate replay, conflict, location rejection, and storage failure. Exercise these flows on real locked Android and iPhone configurations with IT's recovery route.

After implementation, run the repository quality gate in order for each affected package: lint, typecheck, test, build. Update the knowledge graph with `graphify update .` after code changes. Release the client and server together so the durable operation contract is in place before the client relies on it.
