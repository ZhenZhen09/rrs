# Enterprise-Grade Implementation Plan (Leaflet Stack)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Rider Scheduling System into a high-availability, secure, and traffic-aware enterprise logistics platform while maintaining the Leaflet/OpenStreetMap ecosystem.

**Architecture:** We will implement a Hybrid-Intelligence Architecture. While the UI remains on Leaflet for cross-platform consistency, the backend will provide "Headless" traffic data and atomic route synchronization via Redis.

**Tech Stack:** Node.js (Clustered), Redis, Leaflet (Web/WebView), Google Maps Distance Matrix API (Headless), MySQL (Master/Slave).

---

### Task 1: Comprehensive Audit Logging (Compliance Layer)

**Files:**
- Create: `server/middleware/audit.ts`
- Modify: `server/index.ts`, `server/routes/requests.ts`
- Database: Create `system_audit_logs` table.

- [ ] **Step 1: Create the audit log table**
```sql
CREATE TABLE system_audit_logs (
  id VARCHAR(50) PRIMARY KEY,
  admin_id VARCHAR(50),
  action_type VARCHAR(50), -- e.g., 'RESEQUENCE', 'APPROVE', 'CANCEL'
  target_id VARCHAR(50), -- request_id or rider_id
  payload JSON, -- the before/after state
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address VARCHAR(45)
);
```

- [ ] **Step 2: Implement Audit Middleware**
Create `server/middleware/audit.ts` to automatically capture sensitive Admin actions.

- [ ] **Step 3: Integrate with Interceptor route**
Modify the resequence endpoint to log the exact move made by the Admin.

---

### Task 2: Horizontal Socket Scaling (Redis Integration)

**Files:**
- Modify: `server/presence.ts`, `server/index.ts`
- Tech: `@socket.io/redis-adapter`, `redis`

- [ ] **Step 1: Install Redis dependencies**
```bash
npm install socket.io @socket.io/redis-adapter redis
```

- [ ] **Step 2: Configure Redis Adapter**
Update `server/index.ts` to use the Redis adapter, allowing multiple backend instances to share the same "Rider Room" state.

---

### Task 3: Traffic-Aware Interceptor (Leaflet + Headless Data)

**Files:**
- Modify: `src/app/components/Admin/EnhancedBatchApproveModal.tsx`
- Create: `server/services/traffic.ts`

- [ ] **Step 1: Create Headless Traffic Service**
Implement `server/services/traffic.ts` using Google Maps Distance Matrix API. This service will return `duration_in_traffic` for a given list of waypoints.

- [ ] **Step 2: Leaflet Badge Integration**
Modify the Interceptor Modal to show an **"ETA" badge** next to each ranking badge. This data is fetched from the traffic service whenever the sequence changes.

- [ ] **Step 3: SLA Breach Animation**
If the Traffic Service predicts an arrival after the `time_window`, make the Leaflet card's ranking badge pulse in **Rose Red** and show a "High Risk" tooltip.

---

### Task 4: Geofencing & Automated Presence (Layer 4 Enforcement)

**Files:**
- Modify: `server/locationTracking.ts`, `server/routes/users.ts`

- [ ] **Step 1: Haversine Geofence Logic**
Implement the Haversine formula in `server/locationTracking.ts` to calculate the distance between the rider's GPS and the Leaflet-defined destination coordinate.

- [ ] **Step 2: Auto-Arrive Trigger**
If a rider is within 100m of the destination for >2 minutes, automatically update `delivery_status` to `arrived` via the backend and sync with the Rider app.

---

### Task 5: Mobile Offline Resiliency (WebView Optimization)

**Files:**
- Modify: `mobile-app/app/job/[id].tsx`

- [ ] **Step 1: Implement LocalStorage Sync**
Update the job details view to cache route data in `AsyncStorage`. If the Leaflet WebView fails to load due to no internet, show the "Last Known Route" from cache.
