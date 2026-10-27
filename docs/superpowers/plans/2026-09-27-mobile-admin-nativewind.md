# Mobile Admin NativeWind Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate mobile-admin fixed presentation styles to NativeWind classes while preserving every current screen, detail, visual theme, layout, and interaction.

**Architecture:** Keep NativeWind 4 and Tailwind 3 configuration at the app root. Convert fixed styles file by file; leave runtime-dependent colors, density measurements, platform adaptations, animation transforms, navigator options, and third-party component styles in their supported inline APIs. Avoid introducing new UI abstractions or changing behavior.

**Tech Stack:** Expo SDK 57, Expo Router, React Native 0.86, NativeWind 4.2.7, Tailwind CSS 3.4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-27-mobile-admin-nativewind-design.md`

## Global Constraints

- Preserve current screens, visual appearance, content, navigation, data handling, and interactions.
- Keep the existing light, dark, black-pink, and gold theme modes.
- Keep compact, default, and relaxed density behavior.
- Retain runtime-dependent theme colors, density-derived measurements, platform-specific values, animated transforms, and styles passed to navigation or third-party components inline where utility classes cannot represent them without changing behavior.
- Do not introduce a new color palette, component layout, navigation pattern, animation, or product behavior.
- Existing native module versions remain unchanged; NativeWind is styling-only.

## Review Focus

- Theme mode colors: preserve all four palette branches in `ThemeContext` and status colors in cards/badges.
- Density settings: retain `SPACING` and responsive helper calculations that vary with density or screen size.
- Platform-specific layout: preserve safe-area insets, keyboard handling, and iOS/Android spacing.
- Gestures and motion: preserve swipe, drag/reorder, animated transforms, and touch targets.
- Third-party components: keep styles in the component's documented props for maps, charts, calendars, and navigation.

---

## File Map

| Group | Files | Responsibility |
|---|---|---|
| Styling foundation | `mobile-admin/babel.config.js`, `mobile-admin/metro.config.js`, `mobile-admin/tailwind.config.js`, `mobile-admin/global.css`, `mobile-admin/nativewind-env.d.ts`, `mobile-admin/app/_layout.tsx` | NativeWind transform, class discovery, CSS import, and TypeScript support. These are already configured; change only if migration uncovers a specific coverage or type issue. |
| Shared UI and dispatch controls | `mobile-admin/components/UI/Badge.tsx`, `mobile-admin/components/Dispatch/DispatchModal.tsx`, `FilterModal.tsx`, `LiveActivityCard.tsx`, `PremiumJobCard.tsx`, `SequenceModal.tsx` | Reusable labels, cards, and dispatch/assignment dialogs. |
| Dispatch screen | `mobile-admin/app/(tabs)/dispatch.tsx`, `mobile-admin/app/(tabs)/_layout.tsx` | Request list, filters, selection, dispatch workflow, and tab navigator options. Keep navigation styling in its navigator API. |
| Dashboard and reporting | `mobile-admin/app/(tabs)/index.tsx`, `analytics.tsx`, `logs.tsx` | Home metrics, analytics, and operational logs. |
| Admin operations | `mobile-admin/app/(tabs)/personnel.tsx`, `attendance.tsx`, `calendar.tsx`, `profile.tsx` | Staff, attendance, schedule, and profile screens. |
| Map and request details | `mobile-admin/app/(tabs)/map.tsx`, `mobile-admin/components/Dispatch/TrackingMap.tsx`, `mobile-admin/components/UI/FleetPulseMap.tsx`, `mobile-admin/app/job/[id].tsx` | Map views and job detail. Keep map-provider and chart/library styling in their supported props. |
| Entry and sign-in | `mobile-admin/app/index.tsx`, `mobile-admin/app/login.tsx` | Entry redirect and login presentation. |

## Tasks

### Task 1: Confirm and protect the NativeWind foundation

**Files:**
- Inspect: `mobile-admin/package.json`, `mobile-admin/package-lock.json`, `mobile-admin/babel.config.js`, `mobile-admin/metro.config.js`, `mobile-admin/tailwind.config.js`, `mobile-admin/global.css`, `mobile-admin/nativewind-env.d.ts`, `mobile-admin/app/_layout.tsx`

**Interfaces:**
- Consumes: Existing NativeWind 4 / Tailwind 3 setup.
- Produces: A stable className transform and type environment used by all route and component tasks.

- [ ] Confirm `nativewind@4.2.7` and `tailwindcss@3.4.x` remain declared and locked; do not reinstall or bump them as part of the visual migration.
- [ ] Confirm Tailwind `content` includes every app and component TSX path in this plan.
- [ ] Confirm the global CSS import remains at the root Expo Router layout and Metro wraps Expo's default configuration.
- [ ] Confirm the NativeWind declaration file is named `nativewind-env.d.ts` and included by `tsconfig.json`.
- [ ] Make only the smallest configuration correction if one of these invariants is broken; do not edit unrelated Expo/Bugsnag settings.

**Review:** Start Metro with a cleared cache after source migration and confirm it compiles a visible className already in `PremiumJobCard.tsx`.

### Task 2: Migrate shared UI and dispatch controls

**Files:**
- Modify: `mobile-admin/components/UI/Badge.tsx`
- Modify: `mobile-admin/components/Dispatch/DispatchModal.tsx`
- Modify: `mobile-admin/components/Dispatch/FilterModal.tsx`
- Modify: `mobile-admin/components/Dispatch/LiveActivityCard.tsx`
- Modify: `mobile-admin/components/Dispatch/PremiumJobCard.tsx`
- Modify: `mobile-admin/components/Dispatch/SequenceModal.tsx`

**Interfaces:**
- Consumes: NativeWind configuration from Task 1; existing props, handlers, theme and responsive helpers.
- Produces: Shared controls styled with utility classes while retaining their current public props and behavior.

- [ ] For each component, identify fixed layout, border, radius, spacing, and alignment declarations in `StyleSheet.create` and translate those declarations to equivalent classes.
- [ ] Preserve component-specific theme colors, responsive sizes, loading/disabled/selected state values, and animation transforms through inline styles where they are runtime-dependent.
- [ ] Preserve all labels, field order, conditional sections, accessibility labels, and event callbacks exactly.
- [ ] Remove a `StyleSheet` entry only after all JSX references to it have been replaced.
- [ ] Compare the changed JSX against the existing component to confirm no field or action disappeared.

**Review:** Inspect badge status variants, dispatch modal enabled/disabled states, and card swipe affordances for both pending and non-pending requests.

### Task 3: Migrate dispatch route presentation

**Files:**
- Modify: `mobile-admin/app/(tabs)/dispatch.tsx`
- Inspect: `mobile-admin/app/(tabs)/_layout.tsx`

**Interfaces:**
- Consumes: Migrated shared controls from Task 2; existing dispatch hooks, API mapping, theme, and route options.
- Produces: Dispatch screen layout expressed through NativeWind without changing request data or dispatch actions.

- [ ] Translate fixed screen containers, header, search, tabs, filter chips, rider groups, selection controls, empty/loading states, and action bars to classes.
- [ ] Preserve every API field mapping, filter predicate, selection state, modal prop, swipe handler, and navigation callback.
- [ ] Retain runtime theme colors, responsive spacing, safe-area values, and native tab-bar options inline.
- [ ] Remove obsolete fixed-style entries after replacing their consumers.
- [ ] Review the pending, active, and done tabs, including selection mode, empty/loading state, and rider grouping.

**Review:** Ensure dispatch cards retain all current details and that swipe/drag gestures and modal opening still target the same request.

### Task 4: Migrate dashboard and reporting screens

**Files:**
- Modify: `mobile-admin/app/(tabs)/index.tsx`
- Modify: `mobile-admin/app/(tabs)/analytics.tsx`
- Modify: `mobile-admin/app/(tabs)/logs.tsx`

**Interfaces:**
- Consumes: NativeWind foundation from Task 1 and unchanged data/context hooks.
- Produces: Home, analytics, and logs presentation using utility classes.

- [ ] Convert fixed card, section, row, typography, and spacing styles to utilities while retaining chart library styles in chart props.
- [ ] Preserve metric fields, counts, date formatting, filter state, loading/error states, and all navigation shortcuts.
- [ ] Keep runtime palette, chart series colors, responsive/density values, and platform-specific measurements inline.
- [ ] Remove only style declarations with no remaining references.
- [ ] Review dashboard metric empty/loading states, analytics filters/charts, and log row details.

**Review:** Confirm no displayed count, label, chart series, log field, or shortcut changes.

### Task 5: Migrate admin operations screens

**Files:**
- Modify: `mobile-admin/app/(tabs)/personnel.tsx`
- Modify: `mobile-admin/app/(tabs)/attendance.tsx`
- Modify: `mobile-admin/app/(tabs)/calendar.tsx`
- Modify: `mobile-admin/app/(tabs)/profile.tsx`

**Interfaces:**
- Consumes: NativeWind foundation and existing personnel, attendance, calendar, and theme data flows.
- Produces: Operations screens using classes for fixed presentation and the same dynamic controls as before.

- [ ] Convert fixed page, list, form, status, modal, and typography styles to equivalent utilities.
- [ ] Preserve all user-facing content, data fields, status conditions, save/submit actions, and permission checks.
- [ ] Keep date-picker/calendar library styles, runtime theme values, density values, and safe-area/keyboard measurements in supported inline props.
- [ ] Remove obsolete style definitions only after migration of all consumers.
- [ ] Review empty, loading, selected, disabled, and validation states on each screen.

**Review:** Check that date selection, attendance actions, personnel actions, and profile/theme/density controls still behave as before.

### Task 6: Migrate map and job detail presentation

**Files:**
- Modify: `mobile-admin/app/(tabs)/map.tsx`
- Modify: `mobile-admin/components/Dispatch/TrackingMap.tsx`
- Modify: `mobile-admin/components/UI/FleetPulseMap.tsx`
- Modify: `mobile-admin/app/job/[id].tsx`

**Interfaces:**
- Consumes: NativeWind foundation and existing map/provider/job detail props.
- Produces: Map chrome and job detail layout migrated, with provider-controlled map styles retained.

- [ ] Translate fixed map headers, overlays, legends, buttons, detail rows, and request summaries to utility classes.
- [ ] Keep native map provider/style JSON, marker and coordinate data, gestures, and map API props untouched.
- [ ] Preserve job detail fields, status branches, rider data, action handlers, and route parameters.
- [ ] Keep animated and runtime map values in their existing supported style props.
- [ ] Review location, zoom/control, legend, and job status variants for visual parity.

**Review:** Confirm map controls remain tappable and map display props, request details, and actions are unchanged.

### Task 7: Migrate entry and sign-in screens

**Files:**
- Modify: `mobile-admin/app/index.tsx`
- Modify: `mobile-admin/app/login.tsx`

**Interfaces:**
- Consumes: NativeWind foundation and existing router/auth APIs.
- Produces: Entry and authentication presentation migrated without altering login flow.

- [ ] Convert fixed page, form, button, and text styles to utility classes.
- [ ] Preserve input values, validation, password visibility, loading/error feedback, auth calls, and route destinations.
- [ ] Keep keyboard-safe spacing, runtime palette, and platform-dependent sizes inline.
- [ ] Remove obsolete fixed-style declarations after all corresponding elements use classes.
- [ ] Review valid login, invalid login, pending authentication, and entry redirect behavior.

**Review:** Ensure authentication payloads and success/failure navigation remain unchanged.

### Task 8: Final parity and configuration review

**Files:**
- Review all files listed in Tasks 1–7.
- Modify only NativeWind class coverage or style mappings required by the approved spec.

**Interfaces:**
- Consumes: Migrated screens and components from Tasks 1–7.
- Produces: Complete app-wide NativeWind styling migration with explicit known limitations for native-only APIs.

- [ ] Search the mobile-admin app and components for remaining `StyleSheet.create` declarations and classify every result as intentionally runtime/native-only or an unconverted fixed style.
- [ ] Check that every static class is discoverable from `tailwind.config.js` content paths and that no runtime-generated class names are used.
- [ ] Review the four theme modes and three density settings against retained runtime values.
- [ ] Review platform safe-area and keyboard layouts, plus swipe/drag and navigation APIs.
- [ ] Report TypeScript/Expo bundling outcomes separately from known pre-existing issues; do not change unrelated app or server files.

**Review:** No content, theme selection, navigation, data flow, or interaction changes are included in this migration.
