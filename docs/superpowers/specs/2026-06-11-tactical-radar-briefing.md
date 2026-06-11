# Tactical Radar Briefing Spec

**Goal:** Create a high-impact, eye-catching entry screen (Mission Briefing) that summarizes active tasks and prioritizes overdues every time the rider opens the app.

**Target Audience:** Riders using the mobile-app.

---

## 1. UX Design (Tactical SITREP)

### Visual Language: "The Radar"
- **Background:** Deep Tactical Slate (`#0F172A`) with a subtle radial gradient.
- **The Central Hub:** A large, high-contrast white number showing total active tasks.
- **The Rings (Animated):**
  - **Overdue Ring:** Bold Red (`#EF4444`). Pulsates if `overdueCount > 0`.
  - **Today Ring:** Emerald Green (`#10B981`). Static or subtle shimmer.
- **Action Banner:** A frosted glass (blur) card at the bottom containing the first mission's location.

### Interaction Flow
1. **Trigger:** Show on every "Cold Start" (fresh launch) or when app returns from background after > 5 minutes.
2. **Animation Sequence:**
   - Background fades in (200ms).
   - Radar rings "ping" from center (500ms).
   - Task counts count up from 0 to actual value (300ms).
   - "Next Stop" banner slides up from bottom (400ms).
3. **Dismissal:**
   - User tap anywhere or swipe up.
   - Auto-dismiss after 3.5 seconds of inactivity.

---

## 2. Content Logic

### SITREP Headings
- **Condition Green:** (0 Overdue) -> "RADAR CLEAR"
- **Condition Red:** (>0 Overdue) -> "RED ZONE ACTIVE"

### Primary Instruction
- "Clear your backlog first. Priority 1: [Location Name]" (if overdue exists)
- "Ready for launch. Priority 1: [Location Name]" (if only today tasks exist)

---

## 3. Technical Implementation (React Native)

- **Storage:** Use `AsyncStorage` to track the last "Seen" timestamp to avoid over-showing.
- **Animation:** `Moti` (based on Reanimated 2) for the pulsating radar rings.
- **Haptics:** `Expo Haptics` (Impact Heavy if overdue, Light if clear).
- **Placement:** A global modal or high-z-index component in the root `_layout.tsx` of the `mobile-app`.

---

## 4. UI/UX Pro Max Compliance
- **Accessibility:** Text contrast ratio > 4.5:1.
- **Touch Target:** Entire screen is dismissible (No pixel-perfect hunting).
- **Motion:** Respects `prefers-reduced-motion` system settings.
