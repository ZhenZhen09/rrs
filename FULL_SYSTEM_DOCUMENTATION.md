# FULL SYSTEM DOCUMENTATION: Rider Scheduling & Delivery System (RRS)

This document provides a comprehensive technical overview of the RRS platform, including both the Web and Mobile applications, the Backend API, and the specialized real-time tracking logic.

---

## 1. System Architecture

### **Tech Stack**
- **Backend:** Node.js (Express), MySQL (Database), Socket.io (Real-time), JWT (Security).
- **Web Frontend:** React 18, TypeScript, Tailwind CSS, Leaflet (Maps), TanStack Query.
- **Mobile App:** React Native (Expo SDK 54), Leaflet WebView (Hybrid Maps), Background Location.

---

## 2. Core Functions by Application

### **A. Web Application (Admin & Personnel Portal)**
The web portal serves as the command center for creating and managing delivery requests.

#### **Functions:**
1.  **Request Creation (Personnel):**
    -   Interactive Map Picker for Pickup/Drop-off.
    -   Time slot selection (hourly blocks).
    -   Urgency level classification.
2.  **Dispatch Console (Admin):**
    -   Real-time queue of pending deliveries.
    -   Manual rider assignment logic.
    -   Administrative remarks/instructions.
3.  **Live Tracking Map (Admin):**
    -   Visual map showing all online riders.
    -   Color-coded status (Online, On Delivery, Offline).
    -   Historical breadcrumb paths for active jobs.
4.  **Calendar View:**
    -   Month-at-a-glance scheduling for high-volume coordination.

### **B. Mobile Application (Rider App)**
Designed for riders to manage their workload and report GPS location in real-time.

#### **Functions:**
1.  **Job Management:**
    -   Tabs for Today, Tomorrow, and Overdue tasks.
    -   Detailed Job screen with one-click calling for recipients.
2.  **Zero-Error Leaflet Map:**
    -   **Senior Mod:** High-performance WebView-based Leaflet map.
    -   Displays Pickup point (Green), Drop-off point (Red), and Rider (Motorcycle).
    -   Draws OSRM-snapped road paths for precise navigation.
3.  **Real-Time Tracking (Background & Foreground):**
    -   Uses Expo TaskManager for background GPS reporting.
    -   Reports location every 30 seconds (Background) or 10 meters (Foreground).
    -   **Senior Mod:** "Always-On" logic that reports to an `idle` state even when no job is active.
4.  **Status Reporting:**
    -   Start Delivery -> Completion/Failure Report.
    -   Outcome reason selection + optional text remarks.

---

## 3. API & Data Infrastructure

### **Database Schema (MySQL)**
-   `users`: Stores accounts, roles, and **current_lat/lng** for always-on tracking.
-   `delivery_requests`: Primary transaction table for all delivery data.
-   `location_logs`: Historical GPS data points for every delivery.
-   `notifications`: In-app event logs for users.

### **Primary Endpoints**
-   `POST /api/auth/login`: Issues 24h JWT and sets `authToken` cookie.
-   `POST /api/users/location`: Unified endpoint for background GPS reporting.
-   `GET /api/users/riders/live`: Fetches online status and GPS for the Admin Map.
-   `PUT /api/requests/:id/status`: Transition engine for delivery lifecycles.

---

## 4. Specialized Code Snippets (Senior Implementation)

### **I. The "Always-On" Location Task (Mobile)**
*LocationContext.tsx*
```typescript
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (data) {
    const { locations } = data;
    const { latitude, longitude } = locations[0].coords;
    
    // Fallback to 'idle' requestId ensures the user table is ALWAYS updated
    const riderId = await AsyncStorage.getItem('@rider_id');
    const requestId = await AsyncStorage.getItem('@active_request_id') || 'idle';
    
    if (riderId) {
      await api.post('/api/users/location', { riderId, lat: latitude, lng: longitude, requestId });
    }
  }
});
```

### **II. Hybrid Leaflet Bridge (Mobile Map)**
*job/[id].tsx*
```javascript
// This bridge allows React Native to move the map marker WITHOUT reloading the WebView
const payload = JSON.stringify({ lat: lastLocation.lat, lng: lastLocation.lng });
webViewRef.current.injectJavaScript(`
  if(window.updateRider) {
    window.updateRider(${payload});
  }
  true;
`);
```

### **III. OSRM Road Snapping Logic**
*mapUtils.ts*
```typescript
// Fetches the REAL road geometry instead of straight lines
const url = `https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=polyline`;
const response = await fetch(url);
const data = await response.json();
const path = polyline.decode(data.routes[0].geometry);
```

---

## 5. Security & Maintenance

1.  **BOLA Protection:** The backend verifies that the `riderId` reporting a location is the actual owner of the `requestId`.
2.  **Automatic Cleanup:** A `RequestWatchdog` runs on the server every 60 seconds to detect "stale" riders who haven't sent a GPS ping in over 5 minutes and marks them offline.
3.  **Error Resilience:** All OSRM and Map fetches include `response.ok` checks to prevent JSON parse errors when external services are rate-limited.

---

**End of Documentation.**
