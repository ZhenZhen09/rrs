# Mobile App Login Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the mobile rider login to match the supplied Errands Rider reference, use the four supplied artworks, and retain four-digit authentication.

**Architecture:** Keep the existing Expo Router login route and auth context. Copy the supplied PNGs into app assets, compose the email/PIN/loading states in `login.tsx` with React Native `Image`/`ImageBackground`, and preserve the existing auth, password reset, and API behavior. Replace the custom PIN keypad with four concealed visual slots backed by a numeric `TextInput` and an explicit Sign In button.

**Tech Stack:** Expo SDK 57, React Native 0.86, Expo Router, React Native Reanimated, `@expo/vector-icons`, Jest, `@testing-library/react-native`.

**Spec:** [2026-10-08-mobile-app-login-redesign.md](../specs/2026-10-08-mobile-app-login-redesign.md)

## Global Constraints

- Preserve the current four-digit PIN contract and `translatePinToPassword` mappings.
- Do not change the auth API, `useAuth().login`, server credential checks, or auth redirects.
- Keep the existing password-reset overlay, server connectivity check, support alert, and email validation.
- Use the four supplied local PNGs; add no dependencies and no remote image URLs.
- Keep 44pt iOS / 48dp Android touch areas where applicable, accessible labels, and 8pt minimum spacing between separate actions.
- Follow the provided reference: rider panorama hero, rounded white form surface, pale road footer, navy text, slate input borders, and violet primary action.

## Review Focus

- **Invalid or malformed email:** remain on email step and show the existing specific validation message. Cover in Task 2 tests.
- **PIN input length and concealment:** show exactly four slots, accept only digits, and cap entry at four without submitting. Cover in Task 2 tests.
- **Email change after PIN entry:** return to email, clear PIN, and allow the updated address to proceed. Cover in Task 2 tests.
- **Invalid credentials or reset-required response:** show error or existing reset overlay and clear loading state. Cover in Task 2 tests.
- **Small viewport and keyboard:** keep input, CTA, and PIN controls reachable while scrolling/keyboard avoidance adjusts the view. Verify in Task 2 manual checklist.

---

### Task 1: Add the Supplied Login Artwork

**Files:**
- Create: `mobile-app/assets/images/login-hero-rider.png`
- Create: `mobile-app/assets/images/login-road-footer.png`
- Create: `mobile-app/assets/images/errands-rider-wordmark.png`
- Create: `mobile-app/assets/images/errands-parcel-mark.png`

**Interfaces:**
- Consumes the four PNG source files listed in the spec.
- Produces static Metro asset paths used by the login route in Task 2.

- [ ] **Step 1: Copy each source PNG into the named app asset.**

Run from the repository root:

```powershell
Copy-Item -LiteralPath 'C:\Users\63938\Downloads\crop images\ChatGPT Image Oct 8, 2026, 02_19_29 PM-1.png' -Destination 'mobile-app/assets/images/login-hero-rider.png'
Copy-Item -LiteralPath 'C:\Users\63938\Downloads\crop images\ChatGPT Image Oct 8, 2026, 02_19_30 PM-2.png' -Destination 'mobile-app/assets/images/login-road-footer.png'
Copy-Item -LiteralPath 'C:\Users\63938\Downloads\crop images\ChatGPT Image Oct 8, 2026, 02_19_32 PM-3.png' -Destination 'mobile-app/assets/images/errands-rider-wordmark.png'
Copy-Item -LiteralPath 'C:\Users\63938\Downloads\crop images\ChatGPT Image Oct 8, 2026, 02_19_33 PM-4.png' -Destination 'mobile-app/assets/images/errands-parcel-mark.png'
```

- [ ] **Step 2: Verify all four local files exist and retain non-zero sizes.**

Run:

```powershell
Get-Item mobile-app/assets/images/login-hero-rider.png, mobile-app/assets/images/login-road-footer.png, mobile-app/assets/images/errands-rider-wordmark.png, mobile-app/assets/images/errands-parcel-mark.png | Select-Object Name, Length
```

Expected: four files are listed with positive `Length` values.

- [ ] **Step 3: Commit the asset-only change.**

```bash
git add mobile-app/assets/images/login-hero-rider.png mobile-app/assets/images/login-road-footer.png mobile-app/assets/images/errands-rider-wordmark.png mobile-app/assets/images/errands-parcel-mark.png
git commit -m "assets: add mobile login artwork"
```

### Task 2: Redesign Email, PIN, and Signing-In States

**Files:**
- Modify: `mobile-app/app/login.tsx`
- Create: `mobile-app/app/__tests__/login.test.tsx`

**Interfaces:**
- Consumes the four static image assets from Task 1, the existing `useAuth().login(email, password)`, the existing password translation mapping, and `PasswordResetOverlay`.
- Produces the same default `LoginScreen` route with email, PIN, and loading states. No exported API or server contract changes.

- [ ] **Step 1: Add failing React Native Testing Library coverage for the login redesign.**

Create `mobile-app/app/__tests__/login.test.tsx`. Mock `useAuth` to return a `login` spy, mock `api.get` to resolve the health check, use the installed Reanimated mock, and mock `PasswordResetOverlay` as a testable view. Add tests that verify:

```tsx
it('renders local brand and hero artwork on the email step', () => {
  const { getByTestId } = render(<LoginScreen />);
  expect(getByTestId('login_hero_image')).toBeTruthy();
  expect(getByTestId('login_brand_wordmark')).toBeTruthy();
  expect(getByTestId('login_email_input')).toBeTruthy();
});

it('shows four concealed PIN slots and requires an explicit sign-in press', async () => {
  const { getByTestId, getAllByTestId } = render(<LoginScreen />);
  fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
  fireEvent.press(getByTestId('login_continue_button'));
  const pin = await waitFor(() => getByTestId('login_pin_input'));
  expect(getAllByTestId(/^login_pin_slot_/)).toHaveLength(4);
  fireEvent.changeText(pin, '0001');
  expect(mockLogin).not.toHaveBeenCalled();
  fireEvent.press(getByTestId('login_sign_in_button'));
  await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('rider@company.com', 'rider1'));
});

it('returns to email and clears the PIN when Change is pressed', async () => {
  const { getByTestId } = render(<LoginScreen />);
  fireEvent.changeText(getByTestId('login_email_input'), 'rider@company.com');
  fireEvent.press(getByTestId('login_continue_button'));
  const pin = await waitFor(() => getByTestId('login_pin_input'));
  fireEvent.changeText(pin, '1234');
  fireEvent.press(getByTestId('login_change_email_button'));
  fireEvent.press(getByTestId('login_continue_button'));
  const clearedPin = await waitFor(() => getByTestId('login_pin_input'));
  expect(clearedPin.props.value).toBe('');
});
```

Mock `@/context/AuthContext` so `useAuth()` returns `mockLogin`; mock `@/utils/api` so `api.get('/api/ping')` resolves; mock Reanimated with its Jest mock; and mock `PasswordResetOverlay` as a null component. Set `mockLogin` to resolve `{ success: true, requirePasswordReset: false }` by default. Add separate tests asserting malformed email displays `Please enter a valid email address`, `12x3456` becomes `1234` with no fifth slot, a failed login shows its returned error and hides the signing-in state, and `requirePasswordReset: true` renders the reset overlay. Use accessible labels and stable `testID`s rather than asserting layout implementation details.

- [ ] **Step 2: Run the new login tests to confirm the redesign expectations fail first.**

Run from `mobile-app`:

```bash
npx jest app/__tests__/login.test.tsx --runInBand
```

Expected: failures identify missing image test IDs, four-slot input controls, and explicit Sign In behavior; existing auth implementation remains unchanged at this step.

- [ ] **Step 3: Replace the current login composition with the reference-based screen structure.**

In `login.tsx`, retain the existing auth and server-health functions. Import the assets as static Metro resources:

```ts
const loginHero = require('../assets/images/login-hero-rider.png');
const loginRoadFooter = require('../assets/images/login-road-footer.png');
const errandsWordmark = require('../assets/images/errands-rider-wordmark.png');
const errandsParcelMark = require('../assets/images/errands-parcel-mark.png');
```

Compose the safe-area root from a hero `ImageBackground`, a rounded white form surface overlapping its lower edge, and a bottom `ImageBackground` for the road art. Put the current server-status indicator inside the hero with enough contrast. Place the supplied wordmark in the email state and parcel mark in the PIN/loading states. Add stable test IDs `login_hero_image`, `login_footer_image`, `login_brand_wordmark`, and `login_parcel_mark`. Implement this using the project’s existing `StyleSheet`, safe-area, responsive utilities, and Reanimated transition. Keep the form surface rounded and ensure it does not clip form content.

- [ ] **Step 4: Build the email step using the existing validation flow.**

Use a clearly visible `Email Address` label, an email-keyboard `TextInput`, and a violet `Continue` button with at least a 48dp/44pt effective touch area. Keep `handleNext`, its existing invalid/empty email messages, and the server status indicator. Retain an inline error panel with readable contrast.

- [ ] **Step 5: Replace the custom keypad with four visual PIN slots backed by a concealed numeric input.**

Add a `TextInput` configured with `keyboardType="number-pad"`, `secureTextEntry`, `maxLength={4}`, and a digit-only `onChangeText` handler. Render exactly four visual cells from the entered value; mark the input with `testID="login_pin_input"`, `accessibilityLabel="4-digit PIN"`, and `accessibilityRole="text"`; give each visible slot `testID={`login_pin_slot_${index}`}`. Include the current email with a `Change` action (`testID="login_change_email_button"`), a `Forgot your PIN?` support action that calls the existing supervisor alert, and a violet `Sign In` button (`testID="login_sign_in_button"`). Keep the email and Continue IDs already present: `login_email_input` and `login_continue_button`. Remove the effect that currently logs in automatically after digit four. Keep `handleLogin`'s four-digit guard, PIN translation, loading state, error path, and reset-required overlay.

- [ ] **Step 6: Add the branded signing-in state without showing false progress.**

When `loading` is true, show the supplied parcel mark, the road footer treatment, and `Signing you in…` with an indeterminate `ActivityIndicator` or indeterminate animated bar. Do not show a percentage or fixed progress amount because the login API does not report progress.

- [ ] **Step 7: Run the focused login tests and fix failures.**

Run from `mobile-app`:

```bash
npx jest app/__tests__/login.test.tsx --runInBand
```

Expected: all login screen tests pass, including four-digit translation, explicit submission, email-change reset, invalid email, invalid credentials, and reset-required behavior.

- [ ] **Step 8: Commit the login redesign and tests.**

```bash
git add mobile-app/app/login.tsx mobile-app/app/__tests__/login.test.tsx
git commit -m "feat: redesign rider mobile login"
```

### Task 3: Validate the Mobile App Quality Gate

**Files:**
- No source files; validate Task 1 and Task 2 outputs.

**Interfaces:**
- Consumes the completed login route and its tests.
- Produces fresh lint, typecheck, test-suite, and Expo web-export results.

- [ ] **Step 1: Run lint.**

Run from `mobile-app`:

```bash
npm run lint
```

Expected: no lint errors. Fix any issue in the changed login files before continuing.

- [ ] **Step 2: Run typecheck.**

Run from `mobile-app`:

```bash
npx tsc --noEmit
```

Expected: exit code 0.

- [ ] **Step 3: Run the full mobile test suite.**

Run from `mobile-app`:

```bash
npm test -- --runInBand
```

Expected: all mobile-app Jest tests pass.

- [ ] **Step 4: Export the web target to catch static asset and platform issues.**

Run from `mobile-app`:

```bash
npx expo export --platform web
```

Expected: export completes and bundles each of the four local PNG assets.

- [ ] **Step 5: Manually review on a small and a standard device viewport.**

Verify the hero crop keeps the rider visible; the footer artwork does not obscure fields or buttons; email and PIN content remain scrollable with the keyboard open; Change clears the PIN; errors and server status remain readable; Sign In appears only after four digits and submits only when tapped; loading, password-reset, and help flows remain usable.
