# Mobile Admin Memory Leak & Performance Optimization

## Overview
The `mobile-admin` React Native application is experiencing "Fatal process out of memory: Zone" crashes. The root cause is massive React Context re-renders triggered by high-frequency WebSocket location updates, compounded by rendering large lists inside `ScrollView` and sending huge unthrottled payloads across the React Native WebView bridge.

## 1. Architecture: Zustand Store Migration
**Problem:** `RealTimeContext.tsx` stores highly volatile data (`riderLocations`) alongside static data. Any update to `riderLocations` forces every consumer of the context to completely re-render.
**Solution:** 
- Install `zustand` in the `mobile-admin` workspace.
- Create a global store at `mobile-admin/store/useRealTimeStore.ts`.
- The store will manage: `riderLocations`, `riderPresence`, `isConnected`, `lastRequestUpdate`, `toast`.
- Expose actions: `connectSocket`, `disconnectSocket`, `showToast`, `hideToast`.
- Migrate all files currently importing `useRealTime` to instead select only the specific state they need via `useRealTimeStore` (e.g., `const lastRequestUpdate = useRealTimeStore(state => state.lastRequestUpdate)`). 

## 2. Component Optimization: FlatList Virtualization
**Problem:** Heavy screens render 100+ items inside a `<ScrollView>`, keeping all nodes in active memory and compounding the re-render crash.
**Solution:**
- **`mobile-admin/app/(tabs)/logs.tsx`**: Replace the `<ScrollView>` mapping `filteredLogs` with a `<FlatList>`.
- **`mobile-admin/app/(tabs)/dispatch.tsx`**: Replace `<ScrollView>` mapping `filteredJobs` with `<FlatList>` for the 'Pending' and 'Done' tabs. 

## 3. WebView Bridge Throttling
**Problem:** Map components serialize the entire `riderLocations` object and inject it into the WebView on every single location update.
**Solution:**
- In `mobile-admin/app/(tabs)/map.tsx`, `mobile-admin/components/UI/FleetPulseMap.tsx`, and `mobile-admin/components/Dispatch/TrackingMap.tsx`:
- Wrap the `injectJavaScript` payload mechanism in a throttle or debounce logic (e.g., utilizing a timer ref to limit updates to a maximum of once per 1000ms) to prevent bridging too many large strings simultaneously.

## Scope & Dependencies
- **Dependencies Added:** `zustand` will be added to `mobile-admin/package.json`.
- **Scope Limit:** All changes are strictly confined to the `mobile-admin` directory. No changes to the backend or other apps.
