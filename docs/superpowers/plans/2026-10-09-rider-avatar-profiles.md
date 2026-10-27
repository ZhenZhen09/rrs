# Rider Avatar Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let riders select one of eight bundled DiceBear avatars and show the saved avatar throughout mobile login/profile and web admin rider identity surfaces.

**Architecture:** Generate and check in one fixed catalog of eight Lorelei Neutral PNG avatars; a canonical JSON catalog supplies IDs and seeds and a small generator creates the identical mobile/web static assets and package mappings. Store only nullable `users.avatar_id`; authenticated APIs validate the catalog ID and return it in rider identity payloads. Mobile Settings saves through the API, while a fresh-login-only welcome state and admin components render bundled assets with existing fallbacks.

**Tech Stack:** React Native / Expo Router / Jest; React / Vite / Vitest; Express / TypeScript / MySQL on Aiven; DiceBear 10.x Lorelei Neutral static PNGs.

**Spec:** `docs/superpowers/specs/2026-10-09-rider-avatar-profiles-design.md`

## Global Constraints

- Use eight IDs: `avatar_01` through `avatar_08`.
- Use DiceBear `lorelei-neutral`; preserve its CC0 1.0 source/license notice.
- Store only nullable `avatar_id` in the database; null, missing, and unknown IDs use the existing fallback.
- Avatar updates accept a catalog ID, authenticate the rider, and update only the caller's own profile.
- Do not upload photos, use Firebase Storage, or call DiceBear at runtime.
- Do not use personal data as a DiceBear seed; use fixed catalog seeds only.
- Preserve the existing email → PIN login, assignment availability rules, live map behavior, and Inbox behavior.
- Keep mobile controls accessible, with 44 by 44 point minimum touch targets, labeled choices, and an exposed selected state.
- Keep all existing uncommitted work intact; do not stage or commit unrelated files.

## Review Focus

- **Null/unknown avatar ID:** legacy profiles and unrecognized values render the current initials/person fallback on mobile, map, Inbox, and dispatch.
- **Invalid ID or identity escalation:** invalid catalog IDs fail validation; non-riders and attempts to target another user cannot update an avatar.
- **Profile-save failure/offline:** the picker reports failure and does not display an unsaved avatar as confirmed; bundled artwork remains renderable offline.
- **Fresh login versus restored session:** only a newly authenticated successful PIN login shows the welcome; failures and restored sessions do not.
- **Partial rollout/API omissions:** login, rider-list, live-rider, and messaging payloads with a missing avatar field remain compatible with older data and clients.

---

## File Map

- `shared/riderAvatarCatalog.json` is the canonical fixed ID, seed, and filename list.
- `scripts/generate-rider-avatars.mjs` generates fixed PNG snapshots, the license/source notice, package-local assets, and statically resolvable platform catalog maps from the canonical list.
- `server/services/riderAvatarCatalog.ts` exposes the generated allowlist to API validation.
- `server/routes/users.ts` migrates rider listing/profile endpoints and adds the authenticated self-update endpoint.
- `server/routes/auth.ts`, `server/services/messaging.ts`, `server/types/messaging.ts`, and `src/app/types/messaging.ts` include avatar IDs in their existing profile/conversation contracts.
- `src/app/components/RiderAvatar.tsx` maps avatar IDs to the web assets with an accessible fallback.
- `mobile-app/components/profile/RiderAvatar.tsx` maps IDs to bundled native assets; `AvatarPicker.tsx` provides the selectable grid.
- `mobile-app/app/settings.tsx` owns the rider profile settings screen.
- `mobile-app/context/AuthContext.tsx` exposes the updated profile and one-time login-welcome state; `mobile-app/utils/authNavigation.ts` routes fresh login through the welcome screen.
- `mobile-app/app/welcome.tsx` presents the one-time post-PIN welcome.
- `mobile-app/components/ScreenHeader.tsx` and its five tab-screen callers add a settings action.
- `src/app/components/RiderAvatar.tsx` maps IDs to local web assets and provides the fallback.
- `src/app/pages/Admin/AdminMessaging.tsx` renders avatars in the Inbox conversation list and selected-conversation header.
- `src/app/pages/Admin/RiderMap.tsx` renders avatars in the Rider Map markers and selected rider identity panel.
- `src/app/components/LiveTrackingMap.tsx`, `src/app/pages/Admin/DispatchConsole.tsx`, and `src/app/components/Admin/Dispatch/RiderSelectionList.tsx` render avatars in dispatch assignment and tracking identity surfaces.

## Task 1: Generate the shared avatar catalog and static assets

**Files:**
- Create: `shared/riderAvatarCatalog.json`
- Create: `scripts/generate-rider-avatars.mjs`
- Modify: `package.json` (add `@dicebear/core`, `@dicebear/styles`, and `sharp` as build-time/dev dependencies)
- Modify: `package-lock.json`
- Create: `shared/rider-avatars/avatar_01.png` through `avatar_08.png`
- Create: `shared/rider-avatars/NOTICE.md`
- Create: generated asset mappings and static copies in `mobile-app/assets/rider-avatars/` and `public/rider-avatars/`
- Create: `server/services/riderAvatarCatalog.generated.ts`
- Test: `tests/unit/rider-avatar-catalog.test.ts`

**Interfaces:**
- Produces the stable catalog IDs and the shared image mappings consumed by Tasks 2–5.
- The canonical records have this shape: `{ "id": "avatar_01", "seed": "rider-avatar-01", "file": "avatar_01.png" }`.
- Generated mobile exports map `avatarId` to a static `ImageSource`; generated web exports map `avatarId` to a `/rider-avatars/avatar_01.png` URL. Both return null for an unknown ID so UI components can use their fallback.

- [ ] **Step 1: Add catalog tests for exactly eight unique IDs, safe filenames, and fixed non-personal seeds.**

```ts
import { describe, expect, it } from 'vitest';
import catalog from '../../shared/riderAvatarCatalog.json';

describe('rider avatar catalog', () => {
  it('contains eight stable IDs and unique fixed seeds', () => {
    expect(catalog.map(({ id }) => id)).toEqual(
      Array.from({ length: 8 }, (_, index) => `avatar_${String(index + 1).padStart(2, '0')}`),
    );
    expect(new Set(catalog.map(({ seed }) => seed)).size).toBe(8);
    expect(catalog.every(({ seed }) => seed.startsWith('rider-avatar-'))).toBe(true);
  });
});
```

- [ ] **Step 2: Run the catalog test and verify it fails because the canonical file is absent.**

Run: `npx vitest run tests/unit/rider-avatar-catalog.test.ts`

Expected: FAIL because the catalog module does not exist.

- [ ] **Step 3: Add the canonical JSON with `avatar_01` through `avatar_08`, fixed seeds `rider-avatar-01` through `rider-avatar-08`, and matching PNG filenames.**

- [ ] **Step 4: Add `@dicebear/core`, `@dicebear/styles`, and `sharp` as root build-time dependencies and update the root lockfile.**

Run: `npm install --save-dev @dicebear/core @dicebear/styles sharp`

Expected: the package manifest and lockfile include those packages; no mobile or server runtime dependencies change.

- [ ] **Step 5: Implement a local-only generator using DiceBear `Style` and `Avatar` plus Sharp to render the pinned `lorelei-neutral` style and fixed catalog seeds to 128 by 128 PNG files.**

```js
const style = new Style(loreleiNeutralDefinition);
const svg = new Avatar(style, { seed, size: 128 }).toString();
await sharp(Buffer.from(svg)).png().toFile(outputPath);
```

The generator reads the canonical JSON, rejects duplicate IDs/seeds and missing output, copies byte-identical PNGs into the mobile and web asset directories, and writes all platform maps and `NOTICE.md` with DiceBear style/source/license and package versions. It must not call the public DiceBear API, and runtime app code must never import or call the generator.

- [ ] **Step 6: Run the generator once and confirm all three asset directories contain the same eight PNG files.**

Run: `node scripts/generate-rider-avatars.mjs`

Expected: eight shared assets and byte-identical package copies, plus generated mobile and web maps.

- [ ] **Step 7: Complete catalog and mapping tests, including unknown ID returning null.**

Run: `npx vitest run tests/unit/rider-avatar-catalog.test.ts`

Expected: PASS.

## Task 2: Persist avatar IDs and return them from rider identity APIs

**Files:**
- Create: `scripts/migrate-rider-avatar-id.cjs`
- Create: `server/services/riderAvatarCatalog.ts`
- Modify: `server/routes/users.ts`
- Modify: `server/routes/auth.ts`
- Modify: `server/services/messaging.ts`
- Modify: `server/types/messaging.ts`
- Modify: `src/app/types/messaging.ts`
- Modify: `src/app/types/index.ts`
- Test: `server/routes/__tests__/rider-avatars.test.ts`
- Test: `server/services/__tests__/messaging.test.ts`

**Interfaces:**
- Consumes the generated server allowlist from Task 1.
- Produces `PATCH /api/users/me/avatar` with request body `{ avatar_id: 'avatar_01' }` and success body `{ avatar_id: 'avatar_01' }`.
- The endpoint gets the user ID only from `req.user.id`; it accepts only a catalog ID and an authenticated rider role.
- Rider/user payloads and `MessagingParticipant` gain `avatarId: string | null` (wire field `avatar_id` in SQL/API JSON; preserve the repository's existing camelCase mapping for conversation summaries).

- [ ] **Step 1: Add route tests for valid save, invalid ID, non-rider denial, and caller-only update.**

```ts
it('updates only the authenticated rider profile for an allowed avatar ID', async () => {
  const response = await request(app)
    .patch('/api/users/me/avatar')
    .set('Authorization', riderToken)
    .send({ avatar_id: 'avatar_03' });

  expect(response.status).toBe(200);
  expect(response.body).toEqual({ avatar_id: 'avatar_03' });
  expect(updateUserQuery).toHaveBeenCalledWith('avatar_03', authenticatedRiderId);
});
```

- [ ] **Step 2: Run the focused backend route and messaging tests to confirm the new behavior is missing.**

Run: `npx vitest run server/routes/__tests__/rider-avatars.test.ts server/services/__tests__/messaging.test.ts`

Expected: FAIL because the route/profile field is not implemented.

- [ ] **Step 3: Add an idempotent MySQL migration that checks `information_schema.COLUMNS` for `users.avatar_id` before adding nullable `VARCHAR(32)`.**

The migration must not overwrite profile fields and must be safe to re-run against the Aiven MySQL database.

- [ ] **Step 4: Add generated catalog allowlist validation and the rider-only `PATCH /me/avatar` route; derive the target user ID from `req.user.id`, update only `avatar_id`, and return the saved ID.**

- [ ] **Step 5: Add `avatar_id` to login profile serialization and `/api/users`, `/api/users/riders`, and `/api/users/riders/live` queries; test that legacy rows return null without changing other fields.**

- [ ] **Step 6: Add `avatar_id` to Inbox summary SQL and map it to `rider.avatarId` in both server and web messaging types.**

Also assert that summary serialization returns `avatarId: null` for legacy database rows without a stored selection.

- [ ] **Step 7: Run focused backend and messaging tests.**

Run: `npx vitest run server/routes/__tests__/rider-avatars.test.ts server/services/__tests__/messaging.test.ts`

Expected: PASS, including null-profile compatibility and denied cross-user update.

## Task 3: Add rider profile Settings and avatar selection

**Files:**
- Create: `mobile-app/components/profile/RiderAvatar.tsx`
- Create: `mobile-app/components/profile/AvatarPicker.tsx`
- Create: `mobile-app/app/settings.tsx`
- Modify: `mobile-app/components/ScreenHeader.tsx`
- Modify: `mobile-app/app/(tabs)/index.tsx`
- Modify: `mobile-app/app/(tabs)/overdue.tsx`
- Modify: `mobile-app/app/(tabs)/tomorrow.tsx`
- Modify: `mobile-app/app/(tabs)/inbox.tsx`
- Modify: `mobile-app/app/(tabs)/history.tsx`
- Modify: `mobile-app/context/AuthContext.tsx`
- Test: `mobile-app/components/profile/__tests__/AvatarPicker.test.tsx`
- Test: `mobile-app/app/__tests__/settings.test.tsx`
- Test: `mobile-app/components/__tests__/ScreenHeader.test.tsx`

**Interfaces:**
- Consumes the generated mobile asset map and `PATCH /api/users/me/avatar` from Tasks 1–2.
- `RiderAvatar` accepts `{ avatarId: string | null | undefined; name: string; size: number }` and renders the mapped image or existing initials/person fallback.
- `AvatarPicker` accepts `{ selectedAvatarId: string | null; disabled: boolean; onSelect: (avatarId: string) => void }`.
- `AuthContext` exposes the typed `avatarId` in `user` and an `updateAvatar(avatarId: string): Promise<void>` operation that updates local user state only after server success.

- [ ] **Step 1: Add Jest tests for the eight choices, selected accessibility state, unknown-ID fallback, and API success/failure behavior.**

```tsx
expect(screen.getByRole('radio', { name: 'Avatar 3, selected' })).toBeTruthy();
expect(api.patch).toHaveBeenCalledWith('/api/users/me/avatar', { avatar_id: 'avatar_03' });
```

- [ ] **Step 2: Run the new focused mobile tests and verify they fail before the picker/settings implementation.**

Run: `npm test -- --runInBand components/profile/__tests__/AvatarPicker.test.tsx app/__tests__/settings.test.tsx components/__tests__/ScreenHeader.test.tsx`

Expected: FAIL because the new components and settings action do not exist.

- [ ] **Step 3: Implement `RiderAvatar` with the generated static `ImageSource` map and accessible initials/person fallback.**

- [ ] **Step 4: Implement the eight-option `AvatarPicker` as accessible radio choices with a visible checkmark/border selection treatment and a disabled saving state.**

- [ ] **Step 5: Implement Settings with rider name/avatar, save progress, success feedback, and an inline recoverable error; update AuthContext only after the API confirms success.**

- [ ] **Step 6: Add an accessible 44-point Settings header action and wire each of the five existing tab headers to `/settings`.**

- [ ] **Step 7: Run focused mobile tests and verify the previous selection remains selected when save rejects.**

Run: `npm test -- --runInBand components/profile/__tests__/AvatarPicker.test.tsx app/__tests__/settings.test.tsx components/__tests__/ScreenHeader.test.tsx`

Expected: PASS.

## Task 4: Show a one-time post-login welcome

**Files:**
- Create: `mobile-app/app/welcome.tsx`
- Modify: `mobile-app/context/AuthContext.tsx`
- Modify: `mobile-app/utils/authNavigation.ts`
- Modify: `mobile-app/app/login.tsx`
- Test: `mobile-app/utils/__tests__/auth-navigation.test.ts`
- Test: `mobile-app/app/__tests__/login-welcome.test.tsx`

**Interfaces:**
- Consumes the logged-in user name/avatar and `RiderAvatar` from Task 3.
- AuthContext exposes `pendingLoginWelcome: boolean` and `completeLoginWelcome(): void`; it starts false on restore, becomes true only after successful fresh login, and becomes false when welcome completes or session ends.
- `getAuthRedirect` returns `/welcome` only when an authenticated user has a pending fresh-login welcome; otherwise it retains the current `/login` and `/(tabs)` behavior.

- [ ] **Step 1: Add route tests proving restored users go directly to tabs, fresh successful login goes to `/welcome`, and logged-out users remain routed to login.**

```ts
expect(getAuthRedirect({ isLoading: false, user: { id: 'r1' }, pendingLoginWelcome: true, firstSegment: 'login', navigationReady: true })).toBe('/welcome');
expect(getAuthRedirect({ isLoading: false, user: { id: 'r1' }, pendingLoginWelcome: false, firstSegment: 'login', navigationReady: true })).toBe('/(tabs)');
```

- [ ] **Step 2: Run the auth navigation tests to verify the new welcome decision is not supported.**

Run: `npm test -- --runInBand utils/__tests__/auth-navigation.test.ts app/__tests__/login-welcome.test.tsx`

Expected: FAIL because `pendingLoginWelcome` and the welcome route do not exist.

- [ ] **Step 3: Track a fresh-login welcome flag in AuthContext; set it only after login returns a valid authenticated profile and leave it false during session restore.**

- [ ] **Step 4: Update `getAuthRedirect` so pending welcome redirects authenticated fresh-login users to `/welcome`, and completed/expired welcome routes resolve to tabs.**

- [ ] **Step 5: Implement the welcome screen with transparent wordmark, exact `Welcome Back, Rider {name}` copy, selected avatar/fallback, reduced-motion-aware brief transition, and automatic navigation to tabs after 1.5 seconds.**

- [ ] **Step 6: Ensure failed PIN and password-reset-required outcomes never set the welcome flag; complete the welcome flag before routing to tabs.**

- [ ] **Step 7: Run the focused navigation/login tests for success, failed PIN, password-reset-required, and restored sessions.**

Run: `npm test -- --runInBand utils/__tests__/auth-navigation.test.ts app/__tests__/login-welcome.test.tsx`

Expected: PASS.

## Task 5: Render rider avatars in Inbox

**Files:**
- Create: `src/app/components/RiderAvatar.tsx`
- Modify: `src/app/types/index.ts`
- Modify: `src/app/types/messaging.ts`
- Modify: `src/app/pages/Admin/AdminMessaging.tsx`
- Test: `tests/unit/admin-rider-avatar.test.tsx`

**Interfaces:**
- Consumes the generated web asset map and server payloads from Tasks 1–2.
- `RiderAvatar` accepts `{ avatarId: string | null | undefined; name: string; sizeClassName?: string }` and renders an informative image or existing initials/person fallback.
- `MessagingParticipant.avatarId` is optional/null-compatible during rollout.

- [ ] **Step 1: Add component tests for mapped avatar URL, null/unknown fallback, and accessible image alternative text.**

```tsx
render(<RiderAvatar avatarId="avatar_02" name="Alex Rider" />);
expect(screen.getByRole('img', { name: 'Alex Rider' })).toHaveAttribute('src', '/rider-avatars/avatar_02.png');
```

- [ ] **Step 2: Add Inbox list and conversation-header tests for a selected avatar and a null avatar while preserving rider name, online state, unread count, and message preview.**

- [ ] **Step 3: Run the focused web tests and verify failures for missing avatar component/props.**

Run: `npx vitest run tests/unit/admin-rider-avatar.test.tsx`

Expected: FAIL because no shared avatar display component or avatar props exist.

- [ ] **Step 4: Implement the web `RiderAvatar` component using only the generated local URL map; unknown IDs render the initials fallback.**

- [ ] **Step 5: Render `RiderAvatar` in Inbox conversation rows and the selected-conversation header; pass `conversation.rider.avatarId` to both.**

Treat the avatar image as decorative where the rider name is visible beside it.

- [ ] **Step 6: Run focused Inbox tests and verify online/unread labels and message previews remain intact.**

Run: `npx vitest run tests/unit/admin-rider-avatar.test.tsx`

Expected: PASS.

## Task 6: Render rider avatars in the Admin Rider Map

**Files:**
- Modify: `src/app/pages/Admin/RiderMap.tsx`
- Test: `src/app/pages/Admin/__tests__/rider-map-avatar.test.tsx`

**Interfaces:**
- Consumes `RiderAvatar` from Task 5 and `avatar_id` from `/api/users/riders/live` from Task 2.
- The Leaflet rider marker uses the local mapped image within its existing status-colored marker; the selected rider panel shows the same avatar and name.

- [ ] **Step 1: Add tests for a mapped avatar in the marker and selected rider panel, plus initials fallback for null/unknown IDs.**

- [ ] **Step 2: Run `npx vitest run src/app/pages/Admin/__tests__/rider-map-avatar.test.tsx` and confirm missing-avatar failures.**

- [ ] **Step 3: Render the shared avatar in the marker HTML using only the generated allowlisted local asset path; keep status border/dot, selection size, and existing location interactions.**

- [ ] **Step 4: Render the accessible shared avatar beside the selected rider name, leaving health/status metrics unchanged.**

- [ ] **Step 5: Run `npx vitest run src/app/pages/Admin/__tests__/rider-map-avatar.test.tsx` and confirm avatar and fallback states pass.**

## Task 7: Render rider avatars in Dispatch assignment and tracking

**Files:**
- Modify: `src/app/types/index.ts`
- Modify: `src/app/components/LiveTrackingMap.tsx`
- Modify: `src/app/pages/Admin/DispatchConsole.tsx`
- Modify: `src/app/components/Admin/Dispatch/RiderSelectionList.tsx`
- Test: `src/app/components/Admin/Dispatch/__tests__/rider-avatar.test.tsx`

**Interfaces:**
- Consumes `RiderAvatar` from Task 5 and `avatar_id` in dispatch rider-list rows from Task 2.
- `LiveTrackingMap` gains optional `riderAvatarId?: string | null`; the tracking detail panel uses the shared asset or existing initial fallback.
- Admin `User.avatar_id` is optional/null-compatible during rollout.

- [ ] **Step 1: Add assignment and tracking tests for a selected avatar and null/unknown fallback while preserving name, availability, status, and selection behavior.**

- [ ] **Step 2: Run `npx vitest run src/app/components/Admin/Dispatch/__tests__/rider-avatar.test.tsx` and confirm the new avatar assertions fail.**

- [ ] **Step 3: Pass rider `avatar_id` from DispatchConsole into the rider selection list and tracking panel; render `RiderAvatar` beside each assignable rider.**

- [ ] **Step 4: Add optional `riderAvatarId` to `LiveTrackingMap` and render it in the rider identity detail panel, falling back to the current initial.**

- [ ] **Step 5: Run the focused dispatch avatar test and confirm existing eligibility/assignment controls remain functional.**

Run: `npx vitest run src/app/components/Admin/Dispatch/__tests__/rider-avatar.test.tsx`

Expected: PASS.

## Final Verification

After all tasks, run the applicable quality gates in the repository-required order and stop to fix a failing stage before proceeding:

1. `npm run lint` from `mobile-app/`, plus the repository's root/server lint commands if present.
2. `npx tsc --noEmit` from `mobile-app/`, then the root web TypeScript/build type check and `npm --prefix server run build`.
3. `npm test -- --runInBand` from `mobile-app/`, plus `npx vitest run` at repository root.
4. `npx expo export --platform web` from `mobile-app/`, then `npm run build` at repository root.
5. Run `graphify update .` and `git diff --check`.

Expected: all applicable lint, typecheck, test, build, graph refresh, and whitespace checks pass. Report any existing warnings separately from failures.
