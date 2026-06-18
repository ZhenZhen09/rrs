# Location Data Auto-Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically recover and persist missing GPS coordinates for delivery requests to ensure map visualizations work for legacy or broken data.

**Architecture:** A frontend "Repair Hook" in the Admin Dispatch Console detects missing coordinates, calls the Geoapify API, and patches the backend database.

**Tech Stack:** React, Express, MySQL, Geoapify API, Zod.

---

### Task 1: Backend Schema and Validation

**Files:**
- Modify: `server/schemas/requestSchema.ts`

- [ ] **Step 1: Add patchLocationsSchema.**

```typescript
export const patchLocationsSchema = z.object({
  pickup: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional(),
  dropoff: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});
```

- [ ] **Step 2: Verify syntax.**
Ensure `z` is imported.

---

### Task 2: Backend Patch Endpoint

**Files:**
- Modify: `server/routes/requests.ts`

- [ ] **Step 1: Implement the patch-locations endpoint.**
Add this route before the `GET /:id` route to avoid conflict.

```typescript
router.put('/:id/patch-locations', authorize(['admin']), validate(patchLocationsSchema), async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { pickup, dropoff } = req.body;
  
  try {
    const updates: string[] = [];
    const params: any[] = [];
    
    if (pickup) {
      updates.push('pickup_lat = ?, pickup_lng = ?');
      params.push(pickup.lat, pickup.lng);
    }
    
    if (dropoff) {
      updates.push('dropoff_lat = ?, dropoff_lng = ?');
      params.push(dropoff.lat, dropoff.lng);
    }
    
    if (updates.length === 0) return res.status(400).json({ error: 'No coordinates provided' });
    
    params.push(id);
    await pool.query(`UPDATE delivery_requests SET ${updates.join(', ')} WHERE request_id = ?`, params);
    
    await logAction((req as any).user.id, 'PATCH_LOCATION', 'delivery_requests', id, { pickup, dropoff });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Patch location error:', error);
    res.status(500).json({ error: 'Database update failed' });
  }
});
```

---

### Task 3: Frontend Recovery Hook

**Files:**
- Modify: `src/app/components/Admin/Dispatch/DispatchMapView.tsx`

- [ ] **Step 1: Add recovery logic and geocoding helper.**
Modify `DispatchMapView.tsx` to include the geocoding logic. Use the existing API key: `e981beca841349698124675a91674f3a`.

```typescript
// Add imports
import { Loader2 } from 'lucide-react';
import { useData } from '../../../context/DataContext';

// Inside DispatchMapView component
const { fetchWithAuth, refreshData } = useData();
const [isRecovering, setIsRecovering] = React.useState(false);
const [recoveredOrigin, setRecoveredOrigin] = React.useState<any>(null);
const [recoveredDest, setRecoveredDest] = React.useState<any>(null);

const GEOAPIFY_KEY = "e981beca841349698124675a91674f3a";

React.useEffect(() => {
  const recover = async () => {
    if (hasValidOrigin && hasValidDest) return;
    if (isRecovering) return;

    setIsRecovering(true);
    try {
      let newOrigin = null;
      let newDest = null;

      if (!hasValidOrigin && origin.address) {
        const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(origin.address)}&apiKey=${GEOAPIFY_KEY}`);
        const data = await res.json();
        if (data.features?.[0]) {
          newOrigin = { lat: data.features[0].properties.lat, lng: data.features[0].properties.lon };
          setRecoveredOrigin(newOrigin);
        }
      }

      if (!hasValidDest && destination.address) {
        const res = await fetch(`https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(destination.address)}&apiKey=${GEOAPIFY_KEY}`);
        const data = await res.json();
        if (data.features?.[0]) {
          newDest = { lat: data.features[0].properties.lat, lng: data.features[0].properties.lon };
          setRecoveredDest(newDest);
        }
      }

      // Persist to DB
      if (newOrigin || newDest) {
        // Find request ID - we need to pass it as a prop or find it in context
        // NOTE: Update DispatchMapViewProps to include requestId
        const reqId = (origin as any).request_id || (destination as any).request_id; 
        if (reqId) {
          await fetchWithAuth(`/api/requests/${reqId}/patch-locations`, {
            method: 'PUT',
            body: JSON.stringify({ pickup: newOrigin, dropoff: newDest })
          });
          refreshData(); // Sync global state
        }
      }
    } catch (e) {
      console.error("Recovery failed", e);
    } finally {
      setIsRecovering(false);
    }
  };

  recover();
}, [origin.address, destination.address, hasValidOrigin, hasValidDest]);
```

- [ ] **Step 2: Update UI to show "Recovering" state.**

```typescript
// Replace the error return with:
if ((!hasValidOrigin && !recoveredOrigin) || (!hasValidDest && !recoveredDest)) {
  return (
    <div className="w-full h-full rounded-[2rem] bg-slate-50 border border-slate-100 flex flex-col items-center justify-center p-6 text-center gap-3">
      <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
        {isRecovering ? <Loader2 className="h-6 w-6 text-pink-500 animate-spin" /> : <MapPin className="h-6 w-6 text-slate-400" />}
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
          {isRecovering ? "Recovering Location..." : "Location Data Missing"}
        </p>
        <p className="text-[9px] font-bold text-slate-400 mt-1">
          {isRecovering ? "Fetching coordinates from address data" : "Coordinates are required to render route visualization"}
        </p>
      </div>
    </div>
  );
}
```

---

### Task 4: Verification

- [ ] **Step 1: Manual DB Sabotage.**
Run SQL: `UPDATE delivery_requests SET pickup_lat = NULL WHERE request_id = 'req_some_id'`.
- [ ] **Step 2: Verify UI.**
Open request in Dispatch Console. See "Recovering..." state followed by map appearance.
- [ ] **Step 3: Verify Persistence.**
Check DB again to confirm `pickup_lat` is populated.
