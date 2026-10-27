# Mobile Messaging Rate-Limit Resilience Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate mobile message submissions and retry storms from causing avoidable messaging rate-limit errors while preserving server abuse protection.

**Architecture:** Keep the server limiter at 30 message requests per authenticated user per 60 seconds and add `Retry-After` metadata. Add small, pure mobile retry utilities that classify errors and parse cooldowns; make the messaging hook expose a cooldown-aware send error and never auto-retry 429 responses.

**Tech Stack:** React Native, Expo, TypeScript, Axios, Express, express-rate-limit, Jest, Vitest, Supertest.

**Spec:** `docs/superpowers/specs/2026-10-03-mobile-messaging-rate-limit-design.md`

## Global Constraints

- Do not increase the default message limit in this change.
- Do not automatically retry HTTP 400, 403, 409, or 429 responses.
- Continue using UUID-compatible `clientMessageId` values.
- Preserve idempotent message retries and the existing conversations API payload.
- Do not modify unrelated authentication, location, or admin messaging behavior.
- Work in the current checkout because required messaging files are uncommitted; preserve all unrelated user changes.

## Review Focus

- 429 with numeric, date, invalid, or absent `Retry-After` produces a safe cooldown; Task 1 tests this.
- Network and 5xx failures remain explicitly retryable; 400/403/409/429 remain non-retryable; Task 1 tests this.
- A user cannot create concurrent sends by pressing Send repeatedly; Task 2 tests this.
- The server response includes `Retry-After` without changing the 30-per-minute policy; Task 3 tests this.

---

### Task 1: Mobile messaging error and cooldown utilities

**Files:**
- Create: `mobile-app/utils/messagingRateLimit.ts`
- Test: `mobile-app/utils/__tests__/messagingRateLimit.test.ts`

**Interfaces:**
- `isRetryableMessagingError(error: unknown): boolean`
- `getMessagingRetryAfterSeconds(error: unknown, nowMs?: number): number`
- `getMessagingErrorMessage(error: unknown): string`

- [ ] **Step 1: Write failing tests** for 503/network retryability, 429/400/403/409 non-retryability, numeric Retry-After, HTTP-date Retry-After, invalid/missing fallback, and a user-facing 429 message.
- [ ] **Step 2: Run the focused test and verify it fails.**

```powershell
cd mobile-app
npm test -- --runInBand utils/__tests__/messagingRateLimit.test.ts
```

Expected: FAIL because the utility module does not exist.

- [ ] **Step 3: Implement the pure utilities.** Use Axios-compatible structural checks. Parse numeric Retry-After values and valid HTTP dates relative to `nowMs`; clamp to 1–300 seconds and use 60 seconds for invalid/missing values.
- [ ] **Step 4: Run the focused test and verify it passes.**
- [ ] **Step 5: Commit.**

```powershell
git add mobile-app/utils/messagingRateLimit.ts mobile-app/utils/__tests__/messagingRateLimit.test.ts
git commit -m "feat: classify mobile messaging rate limits"
```

### Task 2: Mobile send and retry behavior

**Files:**
- Modify: `mobile-app/hooks/useMessaging.ts`
- Modify: `mobile-app/app/conversation/[id].tsx`
- Modify only if required: `mobile-app/components/messaging/MessageComposer.tsx`
- Test: `mobile-app/hooks/__tests__/useMessaging.test.ts` or the nearest existing hook test location

**Interfaces:**
- Consume Task 1 utilities.
- `useMessaging()` adds `sendError: string | null` and `sendRetryAfterSeconds: number` while preserving existing return values.
- `MessageComposer` keeps `onSend(body: string): Promise<void>` and never issues a concurrent send.

- [ ] **Step 1: Write failing tests** for a 429: failed local message, cooldown state, and no automatic retry; for network/5xx manual retry; and for 400 validation errors with no automatic retry.
- [ ] **Step 2: Run the focused hook test and verify it fails.**

```powershell
cd mobile-app
npm test -- --runInBand hooks/__tests__/useMessaging.test.ts
```

- [ ] **Step 3: Implement minimal client behavior.** Keep the composer lock, store the derived message/cooldown in hook state, do not recurse or schedule automatic retry, disable manual retry during cooldown, and render the message in the conversation screen.
- [ ] **Step 4: Run focused messaging tests.**

```powershell
cd mobile-app
npm test -- --runInBand hooks/__tests__/useMessaging.test.ts utils/__tests__/messaging-retry.test.ts utils/__tests__/messagingRateLimit.test.ts
```

- [ ] **Step 5: Commit.**

```powershell
git add mobile-app/hooks/useMessaging.ts mobile-app/app/conversation/[id].tsx mobile-app/components/messaging/MessageComposer.tsx mobile-app/hooks/__tests__/useMessaging.test.ts
git commit -m "fix: stop mobile messaging retry storms"
```

### Task 3: Server retry metadata and route coverage

**Files:**
- Modify: `server/routes/conversations.ts:24-31`
- Modify: `server/routes/__tests__/conversations.test.ts`

**Interfaces:**
- Keep `windowMs: 60 * 1000` and `limit: 30`.
- Return HTTP 429 with the existing error text and a numeric `retry-after` header.

- [ ] **Step 1: Write a failing route test** that exceeds the limiter and asserts 429, the existing error body, numeric Retry-After, and independent user keys.
- [ ] **Step 2: Run it and verify it fails.**

```powershell
npx vitest run server/routes/__tests__/conversations.test.ts --reporter=verbose
```

- [ ] **Step 3: Configure express-rate-limit to emit Retry-After** while retaining the current policy, key generator, and error body.
- [ ] **Step 4: Run messaging tests and server build.**

```powershell
npx vitest run server/routes/__tests__/conversations.test.ts server/services/__tests__/messaging.test.ts --reporter=verbose
cd server
npm run build
```

- [ ] **Step 5: Commit.**

```powershell
git add server/routes/conversations.ts server/routes/__tests__/conversations.test.ts
git commit -m "feat: expose message rate-limit retry timing"
```

### Task 4: Full quality gate and graph refresh

**Files:**
- Generated: `graphify-out/`

- [ ] **Step 1: Run `graphify update .`.**
- [ ] **Step 2: Run mobile checks in order:** `npm run lint`, `npx tsc --noEmit`, `npm test -- --runInBand`, `npx expo export --platform web`.
- [ ] **Step 3: Run server messaging tests and `npm run build`.**
- [ ] **Step 4: Run `git diff --check` and inspect status, preserving unrelated user changes.**
- [ ] **Step 5: Commit the plan/spec and graph output only if they are part of the intended feature delivery.**
