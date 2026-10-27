# Proof of Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Capture tamper-evident proof of delivery in the rider mobile app and expose the evidence to Admin and Personnel/V2 after a delivery is completed.

**Architecture:** Add a dedicated `delivery_proofs` record linked one-to-one with `delivery_requests`, with photo and signature objects stored through a storage adapter and GPS/time/recipient metadata stored as structured fields. The mobile app collects the evidence before final completion, submits it through an authenticated multipart endpoint, and retries safely when connectivity returns. Admin and Personnel/V2 consume the same read endpoint and render a shared evidence contract rather than duplicating database logic.

**Tech Stack:** Expo Go-compatible React Native capture APIs, `react-native-signature-canvas` for the recipient signature, Express/TypeScript routes, MySQL, object-storage adapter with local development fallback, React/TypeScript Admin and Personnel/V2 views, Jest/Vitest/Supertest, and the existing Graphify and Quality Gate workflow.

**Spec:** Product requirement supplied in chat: “Proof of delivery — photo, signature, recipient, GPS, and timestamp; Admin evidence viewer; Personnel/V2 completion receipt; prevent disputes and verify successful delivery.”

## Global Constraints

- A delivery must not become `completed` until valid proof has been accepted by the server, unless an explicit admin override path is added later.
- Only the assigned rider may submit or replace proof for an active request; Admin and the requesting Personnel/V2 user may read authorized proof.
- GPS and timestamps must come from the mobile capture flow/server record, not user-editable text fields.
- Store file URLs/keys and metadata, not large image or signature blobs in `delivery_requests`.
- The capture flow must work in Expo Go; do not require a custom native module for the first release.
- Do not expose private storage credentials or unrestricted object URLs to the client.
- Existing completion, tracking, remarks, and sequence-lock behavior must remain compatible.
- After every code change, run `graphify update .`; before handoff run Quality Gate: lint → typecheck → test → build/export.

## Review Focus

- Missing photo, signature, recipient name, or GPS: the mobile completion action remains blocked with a field-specific message.
- Offline submission or app termination during upload: evidence remains as a recoverable local pending draft and is not silently marked completed.
- Duplicate taps/retries: the server returns the existing proof and does not create duplicate completion records.
- Unauthorized request access: an unassigned rider, unrelated personnel user, or unauthenticated client cannot read or submit evidence.
- Bad or manipulated metadata/files: the server validates MIME type, size, coordinates, timestamp range, request status, and ownership before completion.

## File Map

**Create**

- `server/routes/deliveryProofs.ts` — authenticated submit/read endpoints and validation.
- `server/services/deliveryProofStorage.ts` — object-storage interface, local development adapter, and signed read URL creation.
- `server/schemas/deliveryProof.ts` — Zod schemas for metadata and response contracts.
- `server/migrations/2026-09-30-create-delivery-proofs.sql` — `delivery_proofs` table and indexes.
- `server/routes/deliveryProofs.test.ts` — authorization, validation, idempotency, and completion integration tests.
- `mobile-app/components/ProofOfDeliveryModal.tsx` — photo, recipient, signature, GPS review, and submit UI.
- `mobile-app/services/deliveryProofService.ts` — multipart submission and retry state.
- `mobile-app/utils/proofOfDelivery.ts` — pure validation, filename/type helpers, and draft state helpers.
- `mobile-app/utils/__tests__/proofOfDelivery.test.ts` — mobile proof validation tests.
- `src/app/components/Admin/Dispatch/ProofOfDeliveryViewer.tsx` — reusable Admin evidence viewer.
- `src/app/components/Admin/Dispatch/ProofOfDeliveryViewer.test.tsx` — evidence viewer behavior tests.
- `src/app/personnel-v2/ProofOfDeliveryReceipt.tsx` — Personnel/V2 completion receipt section.
- `src/app/utils/proofOfDelivery.ts` — web response formatting and evidence display helpers.
- `tests/unit/proof-of-delivery.test.ts` — shared web formatting/accessibility tests.

**Modify**

- `server/index.ts` — register the proof routes and storage configuration.
- `server/routes/requests.ts` — ensure completion transitions cannot bypass required proof and preserve audit behavior.
- `server/db.ts` or the project’s migration/bootstrap path — run the new table migration in supported environments.
- `mobile-app/app/job/[id].tsx` — replace direct completion with the proof capture flow and show pending/upload/error states.
- `mobile-app/hooks/data/useJobDetails.ts` — expose proof submission state and refresh the request after successful completion.
- `mobile-app/services/apiService.ts` — add authenticated multipart request support if the existing client does not provide it.
- `mobile-app/types/index.ts` — add `DeliveryProofSummary` and proof-related request fields.
- `src/app/types/index.ts` — add the shared Admin/Personnel proof response type.
- `src/app/context/DataContext.tsx` — normalize and cache proof summary data with request details.
- `src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx` — show a “Proof of delivery” section for completed requests.
- `src/app/pages/LiveTrackingDashboard.tsx` — expose the proof viewer link/summary when the tracked delivery is completed.
- `src/app/personnel-v2/PersonnelV2Page.tsx` — render the completion receipt and evidence viewer for the request owner.
- `mobile-app/package.json` — add only Expo Go-compatible capture/signature dependencies if not already present.

## Data Contract

The server response should expose a stable shape to both web consumers:

```ts
type DeliveryProof = {
  proof_id: string;
  request_id: string;
  recipient_name: string;
  photo_url: string;
  signature_url: string;
  gps: { latitude: number; longitude: number; accuracy_m?: number };
  captured_at: string;
  submitted_at: string;
  submitted_by: string;
};
```

The database record should include `proof_id`, `request_id` (unique), `rider_id`, `recipient_name`, `photo_object_key`, `signature_object_key`, `gps_lat`, `gps_lng`, `gps_accuracy_m`, `captured_at`, `submitted_at`, and audit timestamps. A foreign-key/index strategy must support request lookup and retention cleanup.

## Implementation Tasks

### Task 1: Define the proof contract and database boundary

**Files:**
- Create: `server/migrations/2026-09-30-create-delivery-proofs.sql`
- Create: `server/schemas/deliveryProof.ts`
- Modify: `src/app/types/index.ts`
- Modify: `mobile-app/types/index.ts`
- Test: `server/routes/deliveryProofs.test.ts` contract fixtures

- [ ] Write failing schema tests for valid proof metadata and rejection of missing fields, invalid coordinates, future timestamps, and oversized metadata.
- [ ] Add the migration with a unique `request_id`, indexed `rider_id`, timestamps, object keys, GPS fields, and foreign-key behavior consistent with the existing database conventions.
- [ ] Add Zod input/output schemas and shared TypeScript response types without placing binary data in the request model.
- [ ] Run the schema tests and confirm invalid payloads fail before route implementation.
- [ ] Run the migration against a disposable test database and verify duplicate `request_id` proof rows are rejected.

### Task 2: Implement secure storage and proof submission

**Files:**
- Create: `server/services/deliveryProofStorage.ts`
- Create: `server/routes/deliveryProofs.ts`
- Modify: `server/index.ts`
- Modify: `server/routes/requests.ts`
- Test: `server/routes/deliveryProofs.test.ts`

- [ ] Add a storage interface with `putEvidence`, `getReadUrl`, and `deleteEvidence`; use a local filesystem adapter for development and the configured object-storage adapter for production.
- [ ] Implement `POST /api/requests/:id/proof-of-delivery` using authenticated multipart parsing with explicit file limits and accepted image MIME types.
- [ ] Verify the request exists, the rider is assigned to it, the delivery is `in_progress`, and the actor is allowed to submit.
- [ ] Validate recipient name, signature/photo presence, GPS range, accuracy range, capture time, and server submission time.
- [ ] Upload files only after metadata validation, write the proof row transactionally, and update `delivery_requests.delivery_status` and `completed_at` in the same logical completion operation.
- [ ] Make retries idempotent: return the existing proof for the same completed request and clean up orphaned objects when a database write fails.
- [ ] Implement `GET /api/requests/:id/proof-of-delivery` with role/requester/assigned-rider authorization and short-lived signed URLs.
- [ ] Add tests for unauthorized actors, missing fields, invalid files, duplicate submission, stale/non-active requests, successful completion, and transaction failure cleanup.

### Task 3: Build the mobile rider capture flow

**Files:**
- Create: `mobile-app/components/ProofOfDeliveryModal.tsx`
- Create: `mobile-app/services/deliveryProofService.ts`
- Create: `mobile-app/utils/proofOfDelivery.ts`
- Create: `mobile-app/utils/__tests__/proofOfDelivery.test.ts`
- Modify: `mobile-app/app/job/[id].tsx`
- Modify: `mobile-app/hooks/data/useJobDetails.ts`
- Modify: `mobile-app/services/apiService.ts`
- Modify: `mobile-app/package.json`

- [ ] Add Expo Go-compatible camera/photo selection and signature capture dependencies only if the existing package set cannot support them.
- [ ] Write failing pure tests for required-field validation, coordinate bounds, capture-time handling, file size/type validation, and retry-safe draft identifiers.
- [ ] Add the completion modal with this order: recipient name → delivery photo → recipient signature → GPS confirmation → review/submit.
- [ ] Capture GPS from `LocationContext` at submission time, display accuracy and timestamp, and prevent manual editing of coordinates/time.
- [ ] Replace the current direct completion action with `ProofOfDeliveryModal`; do not call the completion endpoint until the proof submission succeeds.
- [ ] Show clear states: `Ready to submit`, `Uploading proof`, `Completed`, `Pending sync`, and `Upload failed—retry`.
- [ ] Persist an encrypted/minimal local draft reference for interrupted uploads; retain file URIs in app storage until the server confirms receipt.
- [ ] Reuse the existing sync/connection handling where possible, but keep binary upload retry separate from the JSON task queue if that queue cannot safely carry files.
- [ ] Add tests for the validation helper and the completion callback that refreshes the job only after successful proof submission.

### Task 4: Add the Admin evidence viewer

**Files:**
- Create: `src/app/components/Admin/Dispatch/ProofOfDeliveryViewer.tsx`
- Create: `src/app/components/Admin/Dispatch/ProofOfDeliveryViewer.test.tsx`
- Create: `src/app/utils/proofOfDelivery.ts`
- Modify: `src/app/context/DataContext.tsx`
- Modify: `src/app/components/Admin/Dispatch/RequestDetailsPanel.tsx`
- Modify: `src/app/pages/LiveTrackingDashboard.tsx`

- [ ] Add a read-only viewer showing photo, signature, recipient name, GPS coordinates with a map link, captured/submitted timestamps, and submitting rider.
- [ ] Use signed URLs from the server and show a clear unavailable/expired evidence state instead of exposing storage keys.
- [ ] Add an “Evidence available” summary to completed request details and a “View proof” action in the live tracking completion area.
- [ ] Keep the viewer responsive: modal/drawer on mobile web, side panel or modal on desktop, with image alt text and keyboard close controls.
- [ ] Test loading, missing-proof, expired-link, image error, and accessibility states.

### Task 5: Add the Personnel/V2 completion receipt

**Files:**
- Create: `src/app/personnel-v2/ProofOfDeliveryReceipt.tsx`
- Modify: `src/app/personnel-v2/PersonnelV2Page.tsx`
- Modify: `src/app/types/index.ts`
- Test: `tests/unit/proof-of-delivery.test.ts`

- [ ] Show a completion receipt only when the request is completed and proof is available.
- [ ] Display recipient, destination, completed time, captured time, photo, signature, GPS summary, and rider identity using the same response contract as Admin.
- [ ] Add a print/download-friendly receipt layout without exposing private storage URLs in page source beyond signed URLs.
- [ ] Add an explicit “Proof unavailable” state for legacy completed requests that predate this feature.
- [ ] Test completed-with-proof, completed-without-proof, active request, broken image, and narrow mobile layout states.

### Task 6: Add auditability, retention, and operational safeguards

**Files:**
- Modify: `server/routes/deliveryProofs.ts`
- Modify: `server/routes/requests.ts`
- Modify: `server/routes/analytics.ts` only if proof metrics are required
- Create: `server/scripts/verify-delivery-proof-integrity.cjs`
- Test: server route and data-integrity tests

- [ ] Write an audit event for proof submitted, proof viewed, proof replaced, and proof submission failure without logging sensitive image data.
- [ ] Add retention/deletion policy hooks for evidence objects and database rows, preserving the request audit record when evidence is removed by policy.
- [ ] Add integrity checks for completed requests without proof, duplicate proofs, orphaned storage objects, and invalid GPS metadata.
- [ ] Add rate limits and request-size limits to proof upload/read endpoints.
- [ ] Confirm logs redact recipient contact data, signed URLs, signatures, and raw multipart contents.

### Task 7: End-to-end validation and rollout

**Files:**
- Modify/create: `tests/mobile-app-proof-of-delivery.spec.ts` or the project’s existing mobile workflow test location
- Modify: deployment/environment documentation for storage credentials and migration order

- [ ] Test the full path: assigned rider starts delivery → captures all proof → submits → request becomes completed → Admin views evidence → Personnel/V2 sees receipt.
- [ ] Test network loss during upload, app restart, duplicate submit, unauthorized viewer, and legacy completed request.
- [ ] Run mobile tests, server tests, web tests, lint, typecheck, and the available Expo/web build/export.
- [ ] Run `graphify update .` after implementation.
- [ ] Run the Quality Gate in order: lint → typecheck → test → build/export; record unrelated baseline failures separately.
- [ ] Roll out behind a feature flag if production storage/migration needs staged activation; enable capture only after the migration and storage health check pass.

## Acceptance Criteria

- A rider cannot complete an active delivery without recipient name, photo, signature, GPS, and capture timestamp.
- A successful submission creates exactly one proof record and one completion transition, even if the client retries.
- Admin can view the evidence from request details and completed live tracking.
- Personnel/V2 can see a completion receipt with the same evidence and timestamps.
- Unauthorized users cannot submit or view proof.
- Offline/interrupted uploads do not lose evidence or falsely mark the request completed.
- Existing requests completed before rollout remain readable and display a clear “Proof not available” state.
- Evidence access is auditable, storage URLs are protected, and sensitive data is excluded from logs.

## Recommended Delivery Order

Implement Tasks 1–2 first as the backend vertical slice, then Task 3 for the rider flow, followed by Tasks 4–5 for consumers. Task 6 should be completed before production rollout, and Task 7 is the release gate. The recommended execution mode is native execution in this workspace because the tasks share the request/proof contract and need coordinated changes across the existing mobile, server, Admin, and Personnel/V2 code.
