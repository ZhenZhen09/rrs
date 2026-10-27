# Security Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the confirmed account takeover and notification abuse paths from the source review, harden production token configuration, and retain secure MFA and forced-password-reset flows.

**Architecture:** Keep the current Express/JWT architecture, but make every pre-authentication flow prove the preceding credential check with a short-lived, purpose-bound challenge. Restrict account creation and notification creation on the server, fail closed when production secrets are absent, and add regression tests around authorization boundaries before changing handlers.

**Tech Stack:** Express, TypeScript, `jsonwebtoken`, Zod, MySQL, Vitest, React.

**Spec:** Security audit findings in the preceding conversation; existing audit context in `docs/superpowers/plans/2026-05-18-security-audit-execution.md`.

## Global Constraints

- Never trust a client-supplied `userId` as proof of identity or permission.
- Keep MFA enabled for accounts where policy requires it; an account-specific reset is a separate, authorized operation.
- Do not expose access tokens, refresh tokens, MFA secrets, or partial token values in logs.
- Keep SQL parameterized and enforce authorization on the server for HTTP and Socket.IO actions.
- Do not weaken the project’s existing password, MFA, cookie, or role protections to make a test pass.
- Do not probe or modify production accounts as part of code implementation; verify with local tests and an explicitly authorized staging environment.

## Review Focus

- Anonymous callers attempt to register an admin or elevated account; the server rejects the request.
- A caller submits another account’s ID to MFA setup or password change; the server rejects it without changing that account.
- Valid first-login MFA enrollment and forced password reset still work with expired, replayed, or wrong-purpose challenges rejected.
- Authenticated non-admin callers attempt to send arbitrary notifications to other users; the server rejects or safely scopes the request.
- Production starts with missing or weakly configured JWT secrets; it fails closed instead of silently using a source-code default.

## File Map

- `server/routes/auth.ts`: login challenges, signup policy, password change, MFA enrollment and verification.
- `server/schemas/authSchema.ts`: public signup input role policy.
- `server/middleware/auth.ts`: challenge-token verification helpers and safe authentication logging.
- `server/index.ts`: production secret validation and existing rate-limit configuration.
- `server/routes/notifications.ts`: recipient authorization, request validation, and abuse controls.
- `src/app/pages/Login.tsx`: carry pre-authentication challenge credentials through MFA setup/verification.
- `src/app/components/PasswordResetOverlay.tsx`: submit the password-reset challenge rather than a trusted user ID.
- `server/routes/__tests__/auth-security.test.ts`: auth endpoint regression tests.
- `server/routes/__tests__/notifications-security.test.ts`: notification authorization tests.
- `.env.example` and deployment documentation: document required secrets without storing real values.

## Account-Specific MFA Removal

The request does not identify which account should have MFA removed. Do not disable MFA globally or reset an account based on a guessed ID. If removal is still intended, first identify the exact account and confirm the requester is authorized; then use the existing admin-only `POST /api/users/:id/reset-mfa` operation, verify the target account, and require MFA enrollment again at the next eligible login. This operational action does not remediate the vulnerable enrollment endpoint described below.

### Task 1: Prevent public admin account creation

**Files:**
- Modify: `server/schemas/authSchema.ts`
- Modify: `server/routes/auth.ts`
- Test: `server/routes/__tests__/auth-security.test.ts`

**Interfaces:**
- Public signup may create only the explicitly approved self-service roles. Admin accounts continue to be provisioned through the admin-only `POST /api/users` route.
- If self-service signup is not an intended product flow, disable the public signup route instead of accepting any role.

- [ ] **Step 1: Pin the intended signup policy with tests.**
  Test anonymous signup with `role: "admin"` and expect rejection with no user row created. Test each approved self-service role and expect the documented result. Test unknown roles and missing fields.
- [ ] **Step 2: Run the auth security tests and confirm the admin-signup test fails against current code.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: the admin signup case fails because the current schema accepts `admin`.
- [ ] **Step 3: Enforce the role allowlist on the server.**
  Remove `admin` from `signupSchema`; independently ensure the signup handler cannot override or bypass that policy. If open registration is not required, return a clear disabled response and use admin-only account provisioning.
- [ ] **Step 4: Re-run the focused auth tests.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: admin self-registration is rejected; approved signup behavior remains intact.

### Task 2: Secure MFA enrollment and login verification

**Files:**
- Modify: `server/routes/auth.ts`
- Modify: `server/middleware/auth.ts`
- Modify: `src/app/pages/Login.tsx`
- Test: `server/routes/__tests__/auth-security.test.ts`

**Interfaces:**
- Successful password verification returns a short-lived, signed MFA challenge with a purpose claim and the authenticated user ID. It is not a normal access token and grants no API access.
- MFA setup initialization requires a valid setup challenge and an account still eligible for initial enrollment. It returns the QR/secret only to that challenge holder.
- MFA setup verification consumes the setup challenge, verifies the generated TOTP, enables MFA, and only then issues normal session tokens.
- MFA login verification accepts only an MFA-login challenge issued after the password check; the client cannot select another account by changing a user ID.

- [ ] **Step 1: Add failing tests for MFA challenge boundaries.**
  Cover: setup without a challenge returns 401; a caller-supplied account ID cannot select the target; wrong-purpose and expired challenges fail; enrollment cannot overwrite an already-enabled factor; valid setup and valid MFA login each issue a session only after TOTP verification.
- [ ] **Step 2: Run the focused test and confirm the authorization cases fail.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: current `/mfa/setup-verify` accepts a caller-chosen `userId` and secret without prior authentication.
- [ ] **Step 3: Implement purpose-bound, short-lived challenges.**
  Issue the MFA challenge only after password verification. Add distinct `mfa_setup` and `mfa_login` purposes, verify the signature and expiry, derive the account ID only from the challenge, and reject challenges presented to the wrong endpoint. Prevent setup from replacing an existing MFA secret; use the existing admin-only reset path for recovery.
- [ ] **Step 4: Restore a protected setup-init route.**
  The current login UI calls `/api/auth/mfa/setup-init`, but no matching server route exists. Implement it behind the setup challenge, generate the secret server-side, and return a QR payload only to the authenticated setup flow.
- [ ] **Step 5: Update the login UI to retain and submit the challenge.**
  Replace the client-supplied `userId`/`secret` authority with the challenge returned by password verification and setup-init. Keep the secret transient in the setup screen and never persist it in local storage.
- [ ] **Step 6: Re-run auth tests and validate the login flow.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: anonymous and cross-account attempts fail; eligible users can enroll; existing MFA users can sign in with their own valid code.

### Task 3: Secure forced password changes

**Files:**
- Modify: `server/routes/auth.ts`
- Modify: `src/app/context/AuthContext.tsx`
- Modify: `src/app/pages/Login.tsx`
- Modify: `src/app/components/PasswordResetOverlay.tsx`
- Test: `server/routes/__tests__/auth-security.test.ts`

**Interfaces:**
- A successful password check for an account marked `require_password_reset` returns a short-lived, purpose-bound password-reset challenge.
- `POST /api/auth/update-password` requires that challenge and derives the account ID from it. It accepts no authoritative `userId` from the client.
- A successful change consumes the reset condition and challenge, rotates/revokes prior refresh credentials, and follows the existing login/session policy.

- [ ] **Step 1: Add failing tests for the password reset boundary.**
  Test no challenge, expired challenge, wrong-purpose challenge, modified user ID, weak/invalid password, and a valid forced-reset flow. Confirm invalid requests leave password hashes and reset flags unchanged.
- [ ] **Step 2: Run the focused tests and observe failures against the current ID-only endpoint.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: an unauthenticated caller can currently change a password by supplying a user ID.
- [ ] **Step 3: Issue and validate a password-reset challenge.**
  Create it only after the supplied current password is verified and `require_password_reset` is true. Restrict it to the password-update operation, give it a short expiry, and require the database reset flag still to be true at consumption time.
- [ ] **Step 4: Update client state and request payloads.**
  Pass the challenge from login through `PasswordResetOverlay`; remove `userId` as an authorization input. Keep the current password-quality rules and return users to login if the challenge expires.
- [ ] **Step 5: Re-run the auth tests and verify forced reset works end to end.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: only a password-authenticated user with a valid reset challenge can change their own password.

### Task 4: Restrict notification creation

**Files:**
- Modify: `server/routes/notifications.ts`
- Modify: `server/schemas/` (add a focused notification schema if none fits)
- Test: `server/routes/__tests__/notifications-security.test.ts`

**Interfaces:**
- Ordinary users cannot choose arbitrary notification recipients or create system/admin notifications.
- Admins may create notifications only for valid recipients and approved notification types; endpoint payloads have explicit size and field limits.
- Internal notifications generated by application services keep their existing trusted path and are not routed through a public caller-controlled endpoint.

- [ ] **Step 1: Add failing authorization and input tests.**
  Test an authenticated rider/personnel sending to a different user, an unknown user ID, oversized text, an invalid notification type, and an admin creating a valid notification.
- [ ] **Step 2: Run the focused notification tests.**
  Run: `npx vitest run server/routes/__tests__/notifications-security.test.ts`
  Expected: ordinary users can currently create notifications for arbitrary `user_id` values.
- [ ] **Step 3: Enforce role, recipient, and payload policy before database or push side effects.**
  Validate the recipient exists, apply the approved role/recipient policy, constrain message/type/request ID, and ensure rejected requests do not insert rows, emit Socket.IO events, or send push notifications. Add a dedicated rate limit for creation.
- [ ] **Step 4: Re-run focused notification tests.**
  Run: `npx vitest run server/routes/__tests__/notifications-security.test.ts`
  Expected: non-admin arbitrary sends are rejected and valid authorized delivery still works.

### Task 5: Fail closed on missing production secrets and remove token logging

**Files:**
- Modify: `server/index.ts`
- Modify: `server/middleware/auth.ts`
- Modify: `server/routes/auth.ts`
- Modify: `.env.example`
- Test: `server/routes/__tests__/auth-security.test.ts`

- [ ] **Step 1: Add a startup/config test for production secret requirements.**
  Verify production configuration rejects missing `JWT_SECRET` and `JWT_REFRESH_SECRET`; verify development may use documented local-only configuration without allowing those defaults in production.
- [ ] **Step 2: Replace source-code secret fallbacks with fail-fast production validation.**
  Centralize required secret reads so HTTP and Socket.IO verification use identical configuration. Require separately configured high-entropy access and refresh secrets in production and document names only in `.env.example`.
- [ ] **Step 3: Remove token fragments from authentication logs.**
  Change the auth failure log to include only a safe error category, route, and request correlation ID. Never log the bearer token or any substring of it.
- [ ] **Step 4: Re-run auth/config tests and inspect logs for redaction.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts`
  Expected: production misconfiguration fails closed and auth errors contain no token material.

### Task 6: Verify all changes and deployment readiness

**Files:**
- Review: all files in Tasks 1–5
- Update: `docs/superpowers/reports/` with the final remediation record

- [ ] **Step 1: Run focused security regressions.**
  Run: `npx vitest run server/routes/__tests__/auth-security.test.ts server/routes/__tests__/notifications-security.test.ts`
  Expected: all authorization and flow tests pass.
- [ ] **Step 2: Run the repository quality gate in order.**
  Run available lint, then `npx tsc --noEmit`, then `npx vitest run`, then `npm run build:frontend` and `npm --prefix server run build`. The root `npm run build` invokes dependency installation; do not use it unless dependency installation is separately authorized.
- [ ] **Step 3: Review the final diff for bypasses and secrets.**
  Confirm all protected routes reject anonymous callers, all user IDs come from verified credentials, no source-code production secret fallback remains, and no token or MFA secret is logged or persisted in browser storage.
- [ ] **Step 4: Verify staging only after deployment authorization.**
  With an approved staging deployment and test accounts, confirm anonymous admin signup, arbitrary MFA setup, arbitrary password change, and cross-user notification creation are rejected. Do not use real user accounts or production without explicit authorization.
- [ ] **Step 5: Record findings, fixes, commands, and any residual risks.**
  Update the security report with test evidence and any deployment checks that could not be confirmed from source.
