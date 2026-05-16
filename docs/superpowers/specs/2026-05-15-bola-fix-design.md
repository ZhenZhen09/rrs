# Security Spec: Fixing BOLA in Location History (Secure Query Pattern)

## 1. Goal
Harden the location tracking and history endpoints to prevent unauthorized access to rider movement data by implement a "Secure Query" pattern that enforces ownership and department isolation at the SQL level.

## 2. Affected Endpoints
- `GET /api/requests/:id/tracking`
- `GET /api/requests/:id/history`

## 3. Implementation Design

### A. Refactor `GET /api/requests/:id/history`
Instead of a two-step process (Fetch Request -> Check Logic -> Fetch Logs), we will use a single SQL query that incorporates authorization logic:

```sql
SELECT ll.* 
FROM location_logs ll
JOIN delivery_requests dr ON ll.request_id = dr.request_id
WHERE ll.request_id = ?
  AND (
    ? = 'admin' OR                               -- Admin can see all
    dr.assigned_rider_id = ? OR                  -- Assigned Rider can see
    dr.requester_id = ? OR                       -- Requester can see
    (dr.requester_department = ? AND dr.requester_department IS NOT NULL) -- Dept match
  )
ORDER BY ll.timestamp ASC
```

### B. Refactor `GET /api/requests/:id/tracking`
Apply the same `JOIN` logic to the live tracking endpoint to ensure even "soft" tracking data is protected.

## 4. Verification Plan
- **Negative Test Case:** Authenticate as a Personnel user and attempt to fetch the history of a `request_id` belonging to a different department.
- **Expected Result:** HTTP 403 Forbidden or empty data set (instead of rider coordinates).
- **Tooling:** Update `tests/location-tracking-validation.spec.ts` with a security-focused test step.
