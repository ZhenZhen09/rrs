# Mobile App Login Redesign

## Goal

Redesign the rider app's email and PIN login screens to match the user-provided **Errands Rider App Login Flow** reference and use the supplied local artwork, while preserving the existing four-digit credential contract.

## Visual Direction

- Use the supplied sunset rider panorama as the top hero image, cropped to keep the rider visible on the right and open dark space on the left.
- Use the pale road and hills illustration as a bottom-edge background, behind the login content.
- Use the supplied ERRANDS RIDER APP wordmark on the email step and the parcel mark as the compact brand icon on the PIN/loading steps.
- Use a white, softly rounded form surface overlapping the hero area, with navy text, cool slate input borders, and a vivid violet primary action as shown in the reference.
- Show inline email and PIN errors, a clear email-to-PIN step transition, and a branded "Signing you in…" state.
- Adapt image cropping and content spacing to short screens, safe areas, and the on-screen keyboard. Keep all actionable controls comfortably touchable and labeled for screen readers.

## Login Behavior

- Keep the current sequence: validate email, continue to PIN, authenticate, and use the existing password-reset overlay when required.
- Keep the PIN at **four digits**. The reference image shows six slots, but the user chose to preserve the mobile app's current four-digit login contract.
- Render four concealed PIN slots backed by a numeric native text input; filter non-digits and cap entry at four characters.
- Use an explicit Sign In action, matching the supplied reference. Do not submit automatically when the fourth digit is entered.
- The Change action returns to email entry and clears the entered PIN. The support action keeps the existing supervisor contact alert.
- Keep the server connectivity check and show its status in a compact, readable badge.
- Do not change `useAuth().login`, PIN translation, API requests, auth navigation, or server-side credential validation.

## Supplied Artwork

Source directory: `C:\Users\63938\Downloads\crop images`

| Source image | Intended use | App asset destination |
| --- | --- | --- |
| `ChatGPT Image Oct 8, 2026, 02_19_29 PM-1.png` | Rider panorama hero | `mobile-app/assets/images/login-hero-rider.png` |
| `ChatGPT Image Oct 8, 2026, 02_19_30 PM-2.png` | Pale road footer art | `mobile-app/assets/images/login-road-footer.png` |
| `ChatGPT Image Oct 8, 2026, 02_19_32 PM-3.png` | ERRANDS RIDER APP wordmark | `mobile-app/assets/images/errands-rider-wordmark.png` |
| `ChatGPT Image Oct 8, 2026, 02_19_33 PM-4.png` | Parcel mark | `mobile-app/assets/images/errands-parcel-mark.png` |

Copy the original local PNGs into the app assets. Do not fetch remote images or add a dependency for this redesign.

## Acceptance Criteria

1. Email, PIN, and loading states visually follow the supplied reference and use the four supplied images.
2. The PIN step presents exactly four concealed slots and requires an explicit Sign In tap.
3. Email validation, four-digit PIN translation, authentication, reset-required handling, invalid-login feedback, server status, and support behavior remain functional.
4. Changing the email clears the PIN and returns to email entry.
5. The layout remains usable with the keyboard open and on short mobile viewports; controls retain accessible labels and at least 44pt iOS / 48dp Android touch area where applicable.
