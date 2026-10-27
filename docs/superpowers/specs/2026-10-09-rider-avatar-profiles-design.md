# Rider Avatar Profiles Design

## Summary

Give riders a small, selectable set of neutral illustrated DiceBear avatars. Store only a stable avatar ID in the existing application user record; do not store uploaded image bytes or depend on Firebase Storage. Render the selected avatar consistently in the rider app and web admin.

## Goals

- Let an authenticated rider select and change a profile avatar in the mobile app.
- Persist the choice in the existing Aiven-backed user database so it follows the rider across sessions and devices.
- Show the same avatar in the mobile login success welcome, Admin Map, Inbox, and Dispatch assignment UI.
- Keep the existing login and PIN authentication semantics, and show personalized welcome content only after successful authentication.
- Provide a reliable fallback for users with no selection or an unknown avatar ID.

## Non-goals

- Uploading personal photos or other user-provided files.
- Firebase Authentication, Cloud Storage, or other image-hosting setup.
- Allowing arbitrary DiceBear style/options to be submitted by a client.
- Reworking unrelated login, header, map, dispatch, or messaging behavior.

## Approved direction

Generate a curated catalog of eight neutral DiceBear avatars using the `lorelei-neutral` style and bundle equivalent static PNG assets with both apps. DiceBear lists this style under CC0 1.0. Preserve the style license/source notice with the assets. The two applications use the same stable IDs (`avatar_01` through `avatar_08`) and visually identical artwork. Store the selected ID on the rider profile. The catalog is controlled by application code; clients submit only an ID from that catalog.

The public DiceBear API is not used at runtime. This avoids third-party image requests, runtime availability issues, data leakage through avatar seeds, and broken/offline rendering. Since both applications need to render the same selection and React Native/web SVG support can differ, build-time generated static assets are the cross-platform source of truth.

## User experience

### Rider app settings

- Add a clearly labeled Settings action to the existing rider header, with an accessible name and a touch target of at least 44 by 44 points.
- Settings contains a profile section with the rider's name, current avatar, and a compact grid of curated choices.
- Each avatar choice is keyboard/accessibility identifiable, exposes selected state, and has a visible selected treatment that does not rely on color alone.
- Saving updates the signed-in rider's profile through the authenticated backend. Show progress and a clear success or recoverable error state. Keep the previous selection visible if saving fails.
- The picker works with the bundled assets while offline; the server save can be retried after connectivity returns, but the UI must not claim the choice is saved until the server confirms it.

### Login success welcome

- Preserve the current splash screen and email-to-PIN login flow.
- After the backend confirms a successful PIN login, show a brief welcome state with the transparent-background logo, the copy `Welcome Back, Rider [Name]`, and the chosen avatar.
- The welcome appears only for a fresh successful login, not on app cold start/session restore or failed login attempts.
- Continue into the normal authenticated landing screen automatically. Respect reduced-motion preferences and avoid making the welcome animation block access for an extended time.
- If the profile has no known avatar ID, use the app's person/initial fallback.

## Data contract and persistence

- Add nullable `avatar_id` to the `users` table. Existing accounts remain valid with `NULL` and render the fallback.
- Add an idempotent database migration following the repository's migration script conventions. Do not store avatar URLs or generated SVG strings in the database.
- Extend the shared user profile contract to include `avatar_id: string | null`.
- Include this field in the mobile login/refresh profile payload, authenticated rider profile reads, admin rider lists, and live-rider API responses used by map and dispatch.
- Add an authenticated self-service endpoint for updating the current user's avatar. It accepts only one of the eight catalog IDs, validates that the caller is a rider, updates only the caller's own row, and returns the canonical profile field. The first version does not include a clear-avatar action; existing null values remain supported as legacy profiles.
- The Inbox conversation summary query returns the rider's `avatar_id`; update server and web messaging types accordingly.
- Use a single catalog definition or generated catalog artifact with stable IDs, asset mapping, and fallback behavior. Do not accept arbitrary URLs or style names from the client.

## Web admin presentation

- Admin Map: display the avatar inside the rider's map marker and in the associated rider identity detail; keep existing live status, name, and map interactions intact.
- Inbox: use the avatar in conversation list and selected conversation header, preserving rider name and online/unread indicators.
- Dispatch: use the avatar in rider assignment choices and tracking identity surfaces where available, preserving availability, selection, and assignment behavior.
- All locations use the shared ID-to-asset mapping and fall back to initials/person icon for null, missing, or unknown IDs.
- Set non-decorative image alternatives to rider name; mark decorative duplicates appropriately for assistive technology.

## Error handling and compatibility

- Migration is safe to re-run and does not rewrite existing user profile data.
- An invalid avatar ID receives a validation response and never persists.
- A failed profile update leaves the currently saved avatar in place and communicates the failure without losing the rest of Settings state.
- Existing login, refresh, rider listing, map, dispatch, and messaging consumers continue to work when `avatar_id` is null or omitted during gradual rollout.
- Static assets remain available without network access. If an asset fails to render, use the existing initials/person fallback.

## Security and privacy

- Avatar updates use existing authenticated session and role middleware.
- The API derives target user ID from the authenticated principal; no client-supplied target ID is accepted for self-service updates.
- Do not send email, name, or user ID as a DiceBear seed to a third-party runtime API. Static generated assets contain no per-user personal data.
- Do not expose authentication secrets or include new personal data in logs.

## Validation

- Server tests: migration behavior, avatar ID allowlist validation, rider-only self-update, cannot update another user, and profile serialization.
- Mobile tests: settings opens, catalog selection/selected state, save success/failure, offline asset rendering, login welcome only after successful fresh login, correct rider name/avatar, and no welcome on restored session.
- Web tests: admin Map, Inbox list/detail, and Dispatch assignment render matching assets and fallbacks for null/unknown IDs without changing existing interactions.
- Run checks for touched packages in repo quality-gate order: lint, typecheck, test, build. Refresh Graphify after code changes.

## Rollout

1. Add the nullable schema column and backend compatibility fields first.
2. Bundle the same catalog in mobile and web, and update admin surfaces to handle null values.
3. Add the mobile avatar selector and persist the profile choice.
4. Add the fresh-login welcome state.
5. Verify a selected avatar flows from a rider's profile into all three admin surfaces.

## Design review notes

- The avatar set contains eight fixed Lorelei Neutral CC0 1.0 renders with distinct deterministic seeds. Preserve the attribution/source notice with the generated asset catalog.
- The current app login is a single screen with email followed by PIN. The new welcome is a transient post-auth state and must integrate with existing auth redirects without appearing during restored sessions.
- The existing `ScreenHeader` includes notifications and logout; add Settings without removing or crowding those controls. Preserve accessible target sizing on narrow mobile screens.
