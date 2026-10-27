# Mobile Admin NativeWind Migration Design

## Goal

Migrate the mobile-admin UI styling to NativeWind while preserving existing screens, content, navigation, data handling, and interactions. The login screen receives a restrained visual refresh within the existing brand colors and theme palettes; other screens preserve their current appearance during the styling migration.

## Current Context

- The app uses Expo SDK 57, Expo Router, NativeWind 4.2.7, and Tailwind CSS 3.4.
- Eighteen app screens and shared UI/dispatch components currently define styles with `StyleSheet.create`; the map screen also uses inline styles and remains in scope.
- `ThemeContext` supports light, dark, black-pink, and gold palettes, plus compact, default, and relaxed density.
- The dispatch card has already begun using NativeWind classes; preserve that work and migrate the remaining fixed styles consistently.

## Approved Approach

Translate fixed layout, spacing, typography, borders, and other statically expressible styles into NativeWind `className` utilities across all mobile-admin screens and shared components. Preserve exact existing values as closely as possible, using explicit Tailwind theme tokens or arbitrary values when needed. Keep runtime-dependent theme colors, density-derived measurements, platform-specific values, animated transforms, and styles passed to navigation or third-party components inline where utility classes cannot represent them without changing behavior.

Keep the existing theme modes, density controls, Fira fonts, route structure, copy, data fields, conditional rendering, and interaction handlers unchanged. Do not introduce a new color palette, component layout, navigation pattern, animation, or product behavior.

## Scope

Migrate styling in:

- All screens under `mobile-admin/app`, including the tab routes, login, and job details.
- Shared dispatch and UI components under `mobile-admin/components`.
- Existing NativeWind, Tailwind, Babel, Metro, CSS, and TypeScript setup as needed for correct coverage and type support.

The migration must include dynamically styled states (such as status, selection, disabled, loading, and theme variants) without changing their current appearance or behavior. Native navigation options and third-party map/chart/calendar styles may remain inline when those APIs do not accept NativeWind classes.

## Implementation Shape

1. Retain the existing NativeWind v4 / Tailwind v3 setup already added to mobile-admin.
2. Migrate screen and component styles in small route/component groups, preserving existing theme and responsive helpers.
3. Use inline `style` only for values that depend on runtime state, platform APIs, animations, or third-party component contracts.
4. Remove obsolete `StyleSheet` declarations only after their consumers have been migrated.
5. Compare each migrated view against its pre-migration structure and data flow to confirm visual and behavioral parity.

## Acceptance Criteria

- All existing mobile-admin screens and shared components use NativeWind classes for their fixed React Native layout and presentation styles wherever supported.
- Existing text, fields, state visibility, navigation, gestures, controls, and actions are unchanged.
- The four theme modes and three density modes continue to render their current values.
- No fixed style is lost during conversion; runtime-only/native API styles remain supported inline.
- NativeWind class scanning and TypeScript declarations cover all migrated files.
- TypeScript and Expo bundling can process the migrated code; any pre-existing failures are reported separately.

## Risks and Mitigations

- Tailwind spacing or font defaults can differ from existing scaled/theme values. Encode the current values explicitly and retain runtime scaling where required.
- Runtime theme and density styling can be missed by static classes. Keep those inputs explicit and verify all theme/density branches during implementation review.
- Some React Native or third-party components may not support `className`. Keep their styles in the existing API format rather than adding unsafe interop.

## Review

- Product constraint: preserve look, feel, details, and behavior while using NativeWind.
- Login refinement approved later: improve hierarchy and keyboard/small-screen usability while retaining the current blue/orange brand, alternate theme palettes, fields, biometric availability, and authentication flow.
- Recommended migration: fixed styles to utility classes; dynamic/native API styles inline.
- Scope: all mobile-admin screens and shared components.
