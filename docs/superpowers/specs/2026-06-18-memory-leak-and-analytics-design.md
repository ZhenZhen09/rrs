# Design Specification: Memory Leak and Analytics Performance Fixes

## 1. Overview
**Date:** 2026-06-18
**Goal:** Resolve two critical stability issues identified in the Quality Software Report:
1. **Server Memory Leak:** Unbounded growth of in-memory `Map` objects used by the real-time location tracking engine.
2. **Analytics Performance Bottleneck:** Heavy, unpaginated table scans in the `/route-efficiency` endpoint.

**Constraint:** Solutions must preserve all recent real-time tracking features, offline sync fallbacks, and the "fade-out" map visibility for recently off-duty riders.

## 2. Memory Leak: State Pruning Engine

### The Problem
The tracking engine uses four primary `Map` objects in `server/locationTracking.ts` and `server/index.ts` to cache state: `requestPingState`, `riderLatestState`, `requestLatestState`, and `requestGeofenceState`. Currently, entries are added but never removed.

### The Solution: Lifecycle-based Pruning
We will hook into the existing `RequestWatchdog` class in `server/index.ts` (which runs every 30 seconds) to perform a "Garbage Collection" sweep.

#### A. Task State Cleanup (Immediate)
When a delivery request enters a terminal state (`completed`, `delivered`, `failed`, `cancelled`, `disapproved`), its specific tracking state is no longer needed in RAM.
- **Action:** The Watchdog will query the database for all terminal requests within the last 5 minutes.
- **Pruning:** It will remove matching `request_id` keys from `requestPingState`, `requestLatestState`, and `requestGeofenceState`.

#### B. Rider State Cleanup (Delayed)
Admins need to see a rider's last known location for a short period after their shift ends.
- **Action:** We will add a `cleanupOfflineRidersState` function. When a rider is removed from `onlineRiders` (via `presence.ts`), we record a timestamp.
- **Pruning:** If the rider remains offline/off-duty for more than 30 minutes, we delete their `rider_id` from `riderLatestState` and `suspectRiderPoints`.

## 3. Analytics Slowdown: Hybrid Pre-Aggregation

### The Problem
`GET /api/analytics/route-efficiency` selects all rows from `location_logs` (millions of coordinates) for the given timeframe. Transferring and processing this huge JSON payload will cause server timeouts and Out-of-Memory (OOM) errors.

### The Solution: On-Demand Summarization & Pagination (Revised for minimal structural impact)
Instead of creating a new scheduled background job and new database tables (which requires complex migrations), we will optimize the query to let the database do the heavy lifting.

#### Step 1: Database-Level Aggregation
Instead of pulling every single coordinate row, we will group the coordinates into 5-minute intervals using MySQL's date functions.
- **Action:** Modify the `location_logs` query to return a decimated path (e.g., one point every 5 minutes per request) instead of every 15-second ping.
- **SQL Example:** `GROUP BY request_id, UNIX_TIMESTAMP(timestamp) DIV 300`

#### Step 2: Timeframe Limits
- If the timeframe is `real-time` or `daily`, we use the raw (or lightly decimated) logs.
- If the timeframe is `weekly` or `monthly`, we enforce strict database-level aggregation to minimize the payload size.

#### Step 3: Frontend Compatibility
- Ensure the frontend map renderer can gracefully handle the decimated coordinate path without breaking the "Route Efficiency" visualization.

## 4. Implementation Steps
1. **Update Tracking State Maps:** Expose a `pruneTrackingState(requestIds, riderIds)` function in `server/locationTracking.ts`.
2. **Update Watchdog:** Integrate the pruning call into `RequestWatchdog.check()` in `server/index.ts`.
3. **Update Analytics Query:** Rewrite the `route-efficiency` query in `server/routes/analytics.ts` to use SQL `GROUP BY` time intervals to compress the payload size before it hits the Node.js memory.

## 5. Success Criteria
- [ ] Memory usage on the Node.js server remains stable (flatlines) during continuous simulated delivery operations.
- [ ] The Route Efficiency analytics endpoint responds in under 500ms even when querying 30 days of data.
- [ ] Admins can still see riders on the map for up to 30 minutes after they log off.
- [ ] Live tracking for active tasks works exactly as it did before.
