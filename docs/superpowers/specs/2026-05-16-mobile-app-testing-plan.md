# Software Testing Spec: Mobile App Full Suite

## 1. Goal
Implement a professional testing infrastructure for the React Native (Expo) mobile application to ensure reliability, security, and consistent user experience across the delivery lifecycle.

## 2. Testing Pyramid Architecture

### A. Unit & Integration Layer (Jest + RTL)
- **Tooling:** `jest`, `jest-expo`, `@testing-library/react-native`.
- **Scope:**
  - **Business Logic:** `utils/`, `services/apiService.ts`.
  - **State Management:** `context/AuthContext.tsx`, `context/LocationContext.tsx`.
  - **Component Quality:** `components/ui/` components (ensuring accessibility and theme consistency).
- **Execution:** Fast, runs in CI or local terminal without an emulator.

### B. End-to-End Layer (Maestro)
- **Tooling:** Maestro.
- **Scope:**
  - **Critical User Journey:** Login -> Dashboard -> Job Acceptance -> Delivery Completion.
  - **Hardware Integration:** GPS tracking permission prompts, real-time socket updates.
  - **Offline Resilience:** App behavior during network loss (NetInfo integration).
- **Execution:** Runs on Android Emulator or Physical Device.

## 3. Key Test Scenarios

### Security & Auth
- **Login Persistence:** Verify that the JWT is securely stored in `expo-secure-store` and persists after app restart.
- **Token Expiry:** Verify that the app automatically redirects to the Login screen if the API returns a 401 Unauthorized.

### Logistics & Tracking
- **Geofence Simulation:** (Maestro) Verify status changes correctly when coordinates are injected near the drop-off.
- **Background Tracking:** Verify `expo-location` task manager continues to ping the backend when the app is backgrounded.

### UI/UX
- **Theming:** Verify components adapt to system appearance (Light/Dark mode) using `use-theme-color.ts`.
- **Loading States:** Verify "Skeleton" or "Loader" presence during slow API responses.

## 4. Implementation Strategy
1. **Infrastructure:** Configure `jest-expo` and install missing testing dependencies.
2. **Utilities:** Write unit tests for `dateUtils` and `mapUtils`.
3. **Mocks:** Create a robust `axios` and `SecureStore` mock for service testing.
4. **Maestro Flows:** Create `.maestro/flows/full-lifecycle.yaml`.
5. **CI Integration:** Update `package.json` with `test`, `test:watch`, and `test:coverage` scripts.
