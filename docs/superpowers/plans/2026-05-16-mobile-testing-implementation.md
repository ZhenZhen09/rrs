# Mobile App Testing Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a professional multi-layered testing infrastructure in the `mobile-app` directory without modifying existing application logic.

**Architecture:** 
- **Unit/Integration:** Jest + RTL for isolated logic testing.
- **E2E:** Maestro for full-flow verification on emulator.
- **Scripts:** Unified test execution via `package.json`.

**Tech Stack:** Jest, Expo, React Native Testing Library, Maestro

---

### Task 1: Environment Setup (Jest & Infrastructure)

**Files:**
- Modify: `mobile-app/package.json`
- Create: `mobile-app/jest.config.js`
- Create: `mobile-app/__tests__/setup.ts`

- [ ] **Step 1: Install testing dependencies in `mobile-app`.**
  - Command: `cd mobile-app && npm install --save-dev jest jest-expo @testing-library/react-native @testing-library/jest-native react-test-renderer`
- [ ] **Step 2: Add test scripts to `mobile-app/package.json`.**
  - Scripts: `"test": "jest", "test:watch": "jest --watch", "test:coverage": "jest --coverage"`
- [ ] **Step 3: Create `mobile-app/jest.config.js`.**
  - Content: Preset `jest-expo`, setupFilesAfterEnv configuration.
- [ ] **Step 4: Create `mobile-app/__tests__/setup.ts`.**
  - Content: Mocks for `AsyncStorage`, `SecureStore`, and `Location`.

---

### Task 2: Implement Logic & Service Tests

**Files:**
- Create: `mobile-app/utils/__tests__/dateUtils.test.ts`
- Create: `mobile-app/services/__tests__/apiService.test.ts`

- [ ] **Step 1: Write unit tests for `dateUtils.ts`.**
  - Verify formatting and parsing logic.
- [ ] **Step 2: Write integration tests for `apiService.ts`.**
  - Mock `axios` to verify request/response handling.
- [ ] **Step 3: Run `npm test` and verify pass.**

---

### Task 3: Implement Professional E2E Flow (Maestro)

**Files:**
- Create: `.maestro/full-delivery-lifecycle.yaml`

- [ ] **Step 1: Create a comprehensive Maestro flow.**
  - Flow: Login -> History -> Home -> Job Detail -> Start -> Arrive -> Complete.
  - Use high-fidelity assertions (checking for specific text/ids).
- [ ] **Step 2: Verify on emulator.**
  - Run: `maestro test .maestro/full-delivery-lifecycle.yaml`

---

### Task 4: Rapid Validation & Reporting

- [ ] **Step 1: Run full unit suite with coverage.**
- [ ] **Step 2: Capture visual evidence from Maestro run.**
- [ ] **Step 3: Generate `MOBILE_TEST_REPORT_2026-05-16.md`.**
