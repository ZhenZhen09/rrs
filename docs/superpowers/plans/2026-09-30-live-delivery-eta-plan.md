# Live Delivery ETA and Completion Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a reliable estimated drop-off time while a rider's delivery is `in_progress` in the mobile rider app and the web admin Track Delivery page, then show the recorded completion time after delivery finishes.

**Architecture:** Add one authenticated backend routing endpoint that accepts the rider's current coordinates and the request destination and returns normalized route distance and duration. The mobile app and web tracking page consume that same contract, refresh it at controlled intervals, and derive a user-facing ETA locally. The existing `completed_at` field remains the source of truth for actual completion time.

**Tech Stack:** Express/TypeScript backend, Axios API clients, Expo React Native/TanStack Query, React/Vite web admin, OSRM with Geoapify fallback, Vitest/Jest-style unit tests, Playwright workflow tests.

**Spec:** User-approved request in this conversation: implement completion-time/ETA behavior for the mobile active request and the web admin Track Delivery page in mobile and desktop views.

## Global Constraints

- Do not add a second map provider; keep OpenStreetMap tiles and the existing OSRM/Geoapify routing providers.
- Do not expose the Geoapify API key to the mobile app or browser; route provider calls through the authenticated server endpoint.
- Only calculate a live ETA for active deliveries with a valid current rider location and a valid destination.
- Treat location older than the existing tracking freshness threshold as stale and show an unavailable/stale state instead of a precise ETA.
- Do not overwrite or infer `completed_at` on the client; display the server-recorded value after completion.
- Limit route calls to at most once per 60 seconds and/or after a meaningful rider movement threshold; do not request a route on every GPS update.
- Preserve the compact mobile layout already implemented in `LiveTrackingDashboard` and the existing desktop layout.

## Review Focus

- Missing or stale rider location: show `ETA unavailable`/`Location stale`, never `0 minutes`.
- Offline or routing-provider failure: keep the last valid ETA only with a visible stale indicator, otherwise show unavailable.
- Delivery status changes to `completed` or `failed`: stop ETA polling and show the correct terminal state.
- Invalid coordinates or reversed latitude/longitude: reject the request and avoid calling the provider.
- Slow or overlapping requests: discard obsolete responses and ensure only one route request is active per delivery.

## File Map

- Create `server/routes/routing.ts`: authenticated route-duration proxy and normalized response.
- Modify `server/index.ts`: mount the routing route under `/api/routing`.
- Configure `GEOAPIFY_ROUTING_API_KEY` in the server environment without committing the existing `server/.env` or any secret value; add a short deployment note in the plan's implementation PR description.
- Modify `mobile-app/services/apiService.ts`: add the typed ETA API call.
- Modify `mobile-app/hooks/data/useJobDetails.ts`: expose active-delivery ETA state and refresh lifecycle.
- Modify `mobile-app/app/job/[id].tsx`: display ETA while on-route/start-delivery and actual completion time after completion.
- Create `mobile-app/utils/eta.ts`: pure ETA calculation, stale-state, and display-format helpers.
- Modify `src/app/components/LiveTrackingMap.tsx`: return or expose route duration to the web tracking page without changing map rendering behavior.
- Modify `src/app/pages/LiveTrackingDashboard.tsx`: request ETA for mobile and desktop web layouts, show ETA/completion cards, and stop refresh on terminal status.
- Create `src/app/utils/eta.ts`: web-safe pure formatting and freshness helpers, unless the existing shared utility layout can safely be reused.
- Add server tests under `server/routes/__tests__` or the repository's existing server test location.
- Add mobile unit tests under `mobile-app/utils/__tests__/eta.test.ts`.
- Add web unit tests under `src/app/utils/__tests__/eta.test.ts`.
- Extend `tests/web-mobile-workflow.spec.ts` with active-delivery ETA and completion assertions where the test fixture supports it.

### Task 1: Define the routing contract and pure ETA helpers

**Files:**
- Create: `mobile-app/utils/eta.ts`
- Create: `src/app/utils/eta.ts`
- Create: `mobile-app/utils/__tests__/eta.test.ts`
- Create: `src/app/utils/__tests__/eta.test.ts`

**Interfaces:**
- `type EtaStatus = 'available' | 'stale' | 'unavailable' | 'completed'`
- `type RouteEstimate = { distanceMeters: number; durationSeconds: number; calculatedAt: string }`
- `formatEtaTimestamp(nowMs: number, durationSeconds: number): string`
- `getEtaStatus(input: { deliveryStatus?: string; currentLocationAt?: number; calculatedAt?: number; nowMs: number; freshnessLimitMs: number }): EtaStatus`
- `formatDuration(durationSeconds: number): string`

- [ ] **Step 1: Write failing tests** for positive duration, sub-minute rounding, completed status, missing location, stale estimate, and invalid/negative duration.
- [ ] **Step 2: Run the focused tests** with the package's existing test command in non-watch mode and confirm the new helpers fail before implementation.
- [ ] **Step 3: Implement the helpers** so invalid values produce `unavailable`, durations round up to a user-safe minute, and timestamps use the device/browser locale.
- [ ] **Step 4: Run both focused test files** and confirm they pass.

### Task 2: Add the authenticated backend ETA endpoint

**Files:**
- Create: `server/routes/routing.ts`
- Modify: `server/index.ts`
- Modify: server environment documentation/example file used by this repository
- Test: `server/routes/__tests__/routing.test.ts` or the nearest existing server route test file

**Interfaces:**
- `POST /api/routing/eta`
- Request body:

```ts
{
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  requestId?: string
}
```

- Response body:

```ts
{
  distanceMeters: number,
  durationSeconds: number,
  calculatedAt: string,
  provider: 'osrm' | 'geoapify'
}
```

- [ ] **Step 1: Write route tests** for valid coordinates, invalid coordinates, OSRM success, Geoapify fallback, both providers failing, and unauthenticated access.
- [ ] **Step 2: Run the focused server tests** and confirm they fail because the route is not mounted.
- [ ] **Step 3: Implement coordinate validation** using latitude `-90..90`, longitude `-180..180`, finite numbers, and distinct origin/destination points.
- [ ] **Step 4: Implement the provider adapter**: call OSRM with `overview=false` and read `routes[0].distance` and `routes[0].duration`; on provider failure, call Geoapify using the server-only key and read its distance/time fields.
- [ ] **Step 5: Add bounded request protection**: authenticated access, a short per-user/request cache, and a response timeout so a provider outage cannot hold the API request indefinitely.
- [ ] **Step 6: Mount the route** after authentication middleware at `/api/routing` and document the server-only environment variable.
- [ ] **Step 7: Run the focused route tests** and confirm all contract cases pass.

### Task 3: Add the mobile ETA data flow

**Files:**
- Modify: `mobile-app/services/apiService.ts`
- Modify: `mobile-app/hooks/data/useJobDetails.ts`
- Test: `mobile-app/services/__tests__/apiService.test.ts` or a new focused API test

**Interfaces:**
- `getDeliveryEta(origin, destination, requestId?): Promise<RouteEstimate>`
- Hook output:

```ts
{
  eta: RouteEstimate | null,
  etaStatus: EtaStatus,
  etaError: string | null,
  etaRefreshing: boolean
}
```

- [ ] **Step 1: Add an API-client test** that asserts the endpoint, payload, and normalized response.
- [ ] **Step 2: Implement `getDeliveryEta`** using the existing authenticated Axios client and the backend contract from Task 2.
- [ ] **Step 3: Add ETA state to `useJobDetails`** only when `delivery_status === 'in_progress'` and both rider and destination coordinates are valid.
- [ ] **Step 4: Refresh ETA on a 60-second timer and on a meaningful location change**, reusing the latest location supplied by `LocationContext`; prevent overlapping calls and clear the timer on unmount or terminal status.
- [ ] **Step 5: Mark the estimate stale when the rider location is older than the existing tracking freshness threshold**, while retaining the last value only as secondary stale information.
- [ ] **Step 6: Stop ETA refresh after `completed`, `failed`, or `cancelled`, invalidate the job query, and let the refreshed job data provide `completed_at`.
- [ ] **Step 7: Run the focused mobile tests** and verify offline/provider-error behavior does not break status actions.

### Task 4: Display ETA and completion time in the mobile active request

**Files:**
- Modify: `mobile-app/app/job/[id].tsx`
- Test: the existing mobile job screen test location, or add a focused render test if the project has a configured React Native test renderer

- [ ] **Step 1: Add the failing UI assertions**: assigned/pending jobs do not show a live ETA, in-progress jobs show `Estimated drop-off`, stale jobs show `Location stale`, and completed jobs show `Completed at`.
- [ ] **Step 2: Add a compact ETA card** near the active delivery status/map controls with the ETA timestamp, remaining duration, freshness label, and a loading state.
- [ ] **Step 3: Add the completion card** using `job.completed_at`, formatted with the existing date/time conventions; never use the local mutation timestamp as the final completion time.
- [ ] **Step 4: Keep the card accessible** with a readable label, sufficient contrast, and no action button smaller than the existing mobile touch-target standard.
- [ ] **Step 5: Run the mobile tests and manually verify** assigned, in-progress, stale/offline, completed, and failed states in Expo development mode.

### Task 5: Add ETA data flow to the web Track Delivery page

**Files:**
- Modify: `src/app/components/LiveTrackingMap.tsx`
- Modify: `src/app/pages/LiveTrackingDashboard.tsx`
- Create or modify: `src/app/utils/eta.ts`
- Test: `src/app/utils/__tests__/eta.test.ts` and the existing web workflow test

**Interfaces:**
- Reuse `POST /api/routing/eta`; do not create a separate desktop/mobile endpoint.
- Map/dashboard state should use the same `RouteEstimate` and `EtaStatus` concepts as the mobile app.

- [ ] **Step 1: Add web helper tests** for ETA display, stale location, terminal completion, and missing route data.
- [ ] **Step 2: Update the web route-fetch logic** so duration is retained alongside route geometry, or add a dashboard ETA fetch that uses the shared endpoint when the current rider location changes.
- [ ] **Step 3: Add a controlled refresh lifecycle** in `LiveTrackingDashboard`: active only for `LIVE`, `DELAYED`, or `SIGNAL_LOST` deliveries with a valid current location; refresh at most every 60 seconds; stop for completed/failed deliveries.
- [ ] **Step 4: Add the ETA to the existing dashboard status area** as `Estimated drop-off` and `X min away`; include a stale/offline label when the estimate is not current.
- [ ] **Step 5: Add actual completion time** to the status/details area when `trackingRequest.completed_at` is present, and hide the live ETA after terminal completion.
- [ ] **Step 6: Apply responsive presentation**: compact single-row ETA/completion summary in the mobile embedded view, and a more spacious status block in desktop view without duplicating the routing request.
- [ ] **Step 7: Add accessible labels and live-region behavior** for ETA changes so screen readers receive meaningful updates without excessive announcements.
- [ ] **Step 8: Run web unit tests and the targeted Playwright workflow** at mobile and desktop viewport sizes.

### Task 6: Verify the end-to-end status and ETA lifecycle

**Files:**
- Modify: `tests/web-mobile-workflow.spec.ts`
- Create or modify: mobile integration test fixture for the active job flow if the existing Expo test setup supports it
- Modify: relevant test fixtures/factories only where a deterministic current location and completion timestamp are required

- [ ] **Step 1: Add a deterministic route-provider mock** returning a fixed duration and distance so E2E tests do not depend on public routing availability.
- [ ] **Step 2: Verify rider flow**: assigned job → Start Delivery → active ETA visible → simulated location update → ETA refresh → Complete Delivery → completion timestamp visible.
- [ ] **Step 3: Verify admin desktop flow**: Track Rider → desktop tracking page → ETA visible → completion status replaces ETA.
- [ ] **Step 4: Verify admin mobile flow**: Track Rider → embedded compact tracking view → ETA remains readable in the one-screen layout → completion time replaces ETA.
- [ ] **Step 5: Verify failure flows**: stale location, offline network, routing failure, invalid coordinates, and failed delivery.
- [ ] **Step 6: Run the affected package quality gate** in order: lint if defined, typecheck, tests, frontend/mobile build, then `graphify update .` after code changes.

## Expected User Experience

Active rider app:

```text
ON ROUTE
Estimated drop-off  10:42 AM
18 min away · Updated just now
```

Stale location:

```text
Estimated drop-off unavailable
Rider location is stale · Last update 4 min ago
```

Completed delivery:

```text
DELIVERED
Completed at 10:47 AM
```

Admin Track Delivery uses the same wording and data, with a compact summary in the embedded mobile view and a larger status panel on desktop.

## Self-Review

- Coverage: backend contract, provider fallback, mobile active delivery, web mobile/desktop tracking, completion timestamp, stale/offline behavior, tests, and Graphify refresh are all assigned to tasks.
- Placeholder scan: no unresolved implementation placeholders are used.
- Type consistency: both clients consume the same `RouteEstimate` field names and endpoint response.
- Review focus coverage: each failure mode is assigned to Tasks 1, 2, 3, 4, 5, or 6.
- Scope: the plan keeps routing centralized and does not add unrelated dispatch or proof-of-delivery behavior.
