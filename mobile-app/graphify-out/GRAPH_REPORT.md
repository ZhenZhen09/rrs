# Graph Report - mobile-app  (2026-10-25)

## Corpus Check
- 199 files · ~432,226 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 892 nodes · 1931 edges · 80 communities (31 shown, 49 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 9 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5d3300d4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- apiService.ts
- useMessaging.ts
- _layout.tsx
- use-push-notifications.ts
- LocationContext.tsx
- useAuth
- PasswordResetOverlay.tsx
- expo
- devDependencies
- responsive.ts
- index.tsx
- taskFilters.ts
- useLocation
- [id].tsx
- dependencies
- tsconfig.json
- _layout.tsx
- tomorrow.tsx
- FloatingTabBar.tsx
- WebDatabase
- reset-project.js
- TodayRoadBackdrop.tsx
- NotificationModal.tsx
- react
- Welcome to your Expo app 👋
- eslint.config.js
- metro.config.js
- localDb.web.test.ts
- NOTICE.md
- axios
- @bugsnag/expo
- @bugsnag/expo-performance
- expo
- expo-battery
- expo-constants
- expo-crypto
- expo-dev-client
- expo-device
- expo-haptics
- expo-image
- expo-linear-gradient
- expo-linking
- expo-network
- expo-notifications
- expo-router
- expo-secure-store
- expo-splash-screen
- expo-sqlite
- expo-status-bar
- expo-symbols
- expo-system-ui
- expo-task-manager
- @expo/vector-icons
- expo-web-browser
- @gorhom/bottom-sheet
- jwt-decode
- polyline
- react-dom
- react-native
- @react-native-async-storage/async-storage
- @react-native-community/netinfo
- @react-native-firebase/app
- @react-native-firebase/messaging
- react-native-reanimated
- react-native-screens
- react-native-svg
- react-native-web
- react-native-webview
- react-native-worklets
- socket.io-client
- @tanstack/query-async-storage-persister
- @tanstack/react-query
- @types/polyline

## God Nodes (most connected - your core abstractions)
1. `useLocation()` - 33 edges
2. `getDb()` - 28 edges
3. `scale()` - 25 edges
4. `verticalScale()` - 25 edges
5. `useDashboard()` - 22 edges
6. `LocationProvider()` - 21 edges
7. `AuthManager` - 21 edges
8. `useMessaging()` - 20 edges
9. `Job` - 20 edges
10. `useAuth()` - 19 edges

## Surprising Connections (you probably didn't know these)
- `ShiftControlCardProps` --references--> `Job`  [EXTRACTED]
  components/ShiftControlCard.tsx → types/index.ts
- `ShiftControlDrawerProps` --references--> `Job`  [EXTRACTED]
  components/ShiftControlDrawer.tsx → types/index.ts
- `LocationProvider()` --indirect_call--> `message()`  [INFERRED]
  context/LocationContext.tsx → utils/__tests__/messagingSnapshot.test.ts
- `usePushNotifications()` --indirect_call--> `message()`  [INFERRED]
  hooks/use-push-notifications.ts → utils/__tests__/messagingSnapshot.test.ts
- `TabLayout()` --calls--> `useLocation()`  [EXTRACTED]
  app/(tabs)/_layout.tsx → context/LocationContext.tsx

## Import Cycles
- None detected.

## Communities (80 total, 49 thin omitted)

### Community 0 - "apiService.ts"
Cohesion: 0.07
Nodes (57): Config, AuthContext, AuthContextType, AuthProvider(), useJobDetails(), expo-secure-store, expo-sqlite, getCachedJob() (+49 more)

### Community 1 - "useMessaging.ts"
Cohesion: 0.05
Nodes (52): ConversationScreen(), styles, ConversationRow(), styles, MessageBubble(), styles, MessageComposer(), styles (+44 more)

### Community 2 - "_layout.tsx"
Cohesion: 0.06
Nodes (44): RootLayout(), RootLayoutNav(), unstable_settings, errandsWordmark, loginHero, loginRoadFooter, LoginScreen(), statusConfig (+36 more)

### Community 3 - "use-push-notifications.ts"
Cohesion: 0.06
Nodes (45): mockAddNotificationReceivedListener, mockAddNotificationResponseReceivedListener, mockGetInitialNotification, mockGetLastNotificationResponseAsync, mockGetToken, mockInvalidateQueries, mockListenForFcmTokenRefresh, mockNavigate (+37 more)

### Community 4 - "LocationContext.tsx"
Cohesion: 0.07
Nodes (40): mockDashboard, mockCheckIn, mockDashboard, mockRouter, mockToggleDuty, RouteOptimizedModal(), AttendanceStatus, DutyToggleResult (+32 more)

### Community 5 - "useAuth"
Cohesion: 0.05
Nodes (39): plugins, SettingsScreen(), styles, TabLayout(), mockBack, mockUpdateAvatar, mockUser, getRiderAvatarSource() (+31 more)

### Community 6 - "PasswordResetOverlay.tsx"
Cohesion: 0.07
Nodes (25): styles, ParallaxScrollView(), Props, styles, styles, ThemedText(), ThemedTextProps, ThemedView() (+17 more)

### Community 7 - "expo"
Cohesion: 0.05
Nodes (42): backgroundColor, foregroundImage, adaptiveIcon, googleServicesFile, package, permissions, predictiveBackGestureEnabled, softwareKeyboardLayoutMode (+34 more)

### Community 8 - "devDependencies"
Cohesion: 0.05
Nodes (41): config, babel-preset-expo, eslint, eslint-config-expo, jest, jest-expo, devDependencies, babel-preset-expo (+33 more)

### Community 9 - "responsive.ts"
Cohesion: 0.11
Nodes (24): COMMON_HANDOVER_REASONS, HandoverModal(), HandoverModalProps, styles, OverdueTaskCardProps, styles, styles, TaskDetailIcon() (+16 more)

### Community 10 - "index.tsx"
Cohesion: 0.12
Nodes (19): HistoryScreen(), styles, styles, styles, ShiftTaskAccessNotice(), styles, RiderSurfaceGradient(), ScreenHeader() (+11 more)

### Community 11 - "taskFilters.ts"
Cohesion: 0.18
Nodes (13): task, Props, RadarBriefing(), styles, { width }, Props, RadarCircle(), Job (+5 more)

### Community 12 - "useLocation"
Cohesion: 0.16
Nodes (15): ABSENCE_REASONS, AttendanceGate(), AttendanceGateProps, styles, formatShiftStartTime(), minTouchHeight, ShiftControlCard(), ShiftControlCardProps (+7 more)

### Community 13 - "[id].tsx"
Cohesion: 0.15
Nodes (11): JobDetailsScreen(), styles, { width, height }, SequentialLockPanel(), SequentialLockPanelProps, styles, EtaStatus, formatDuration() (+3 more)

### Community 14 - "dependencies"
Cohesion: 0.12
Nodes (17): base-64, expo-file-system, expo-font, expo-location, dependencies, base-64, expo-file-system, expo-font (+9 more)

### Community 15 - "tsconfig.json"
Cohesion: 0.12
Nodes (16): ./*, expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.test.ts, **/*.test.tsx, **/__tests__/**, **/*.ts (+8 more)

### Community 16 - "_layout.tsx"
Cohesion: 0.19
Nodes (12): InboxScreen(), styles, styles, OverdueScreen(), AttendanceLockout(), AttendanceLockoutProps, styles, useDashboard() (+4 more)

### Community 17 - "tomorrow.tsx"
Cohesion: 0.28
Nodes (11): TodayScreen(), styles, TomorrowScreen(), getDeadlineTime(), OverdueTaskCard(), formatDisplayDate(), getLocalDateStr(), parseLocalDate() (+3 more)

### Community 18 - "FloatingTabBar.tsx"
Cohesion: 0.18
Nodes (9): BadgeTone, FloatingTabBar(), FloatingTabBarProps, FloatingTabItem(), FloatingTabItemProps, styles, useTabMotion(), routeLabels (+1 more)

### Community 20 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 21 - "TodayRoadBackdrop.tsx"
Cohesion: 0.50
Nodes (5): styles, TodayRoadBackdrop(), getTodayEmptyStateTopPadding(), getTodayRoadArtworkBottomOffset(), getTodayRoadArtworkHeight()

### Community 22 - "NotificationModal.tsx"
Cohesion: 0.43
Nodes (5): formatNotificationMessage(), NotificationModal(), NotificationModalProps, styles, formatOverdueDuration()

### Community 23 - "react"
Cohesion: 0.33
Nodes (4): react, react, MockMapView, MockMarker

### Community 24 - "Welcome to your Expo app 👋"
Cohesion: 0.33
Nodes (5): Get a fresh project, Get started, Join the community, Learn more, Welcome to your Expo app 👋

## Knowledge Gaps
- **322 isolated node(s):** `fs`, `name`, `slug`, `version`, `orientation` (+317 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `devDependencies`, `react`, `axios`, `@bugsnag/expo`, `@bugsnag/expo-performance`, `expo`, `expo-battery`, `expo-constants`, `expo-crypto`, `expo-dev-client`, `expo-device`, `expo-haptics`, `expo-image`, `expo-linear-gradient`, `expo-linking`, `expo-network`, `expo-notifications`, `expo-router`, `expo-secure-store`, `expo-splash-screen`, `expo-sqlite`, `expo-status-bar`, `expo-symbols`, `expo-system-ui`, `expo-task-manager`, `@expo/vector-icons`, `expo-web-browser`, `@gorhom/bottom-sheet`, `jwt-decode`, `polyline`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `@react-native-firebase/app`, `@react-native-firebase/messaging`, `react-native-reanimated`, `react-native-screens`, `react-native-svg`, `react-native-web`, `react-native-webview`, `react-native-worklets`, `socket.io-client`, `@tanstack/query-async-storage-persister`, `@tanstack/react-query`, `@types/polyline`?**
  _High betweenness centrality (0.264) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `tomorrow.tsx`, `_layout.tsx`, `responsive.ts`, `dependencies`?**
  _High betweenness centrality (0.238) - this node is a cross-community bridge._
- **Why does `TodayScreen()` connect `tomorrow.tsx` to `_layout.tsx`, `index.tsx`, `taskFilters.ts`, `useLocation`, `_layout.tsx`, `TodayRoadBackdrop.tsx`, `NotificationModal.tsx`, `react`?**
  _High betweenness centrality (0.147) - this node is a cross-community bridge._
- **What connects `fs`, `name`, `slug` to the rest of the system?**
  _322 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `apiService.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07394957983193277 - nodes in this community are weakly interconnected._
- **Should `useMessaging.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05473684210526316 - nodes in this community are weakly interconnected._
- **Should `_layout.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05628415300546448 - nodes in this community are weakly interconnected._