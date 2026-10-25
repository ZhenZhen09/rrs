# Admin-managed rider shift hours implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin set one shared rider schedule and automatically close every open shift at its Philippine-local end time, then lock rider work until the next eligible day.

**Architecture:** Persist effective-dated schedule revisions and evaluate one server-side policy for shift and job access. A transactional cutoff service closes due sessions at the scheduled timestamp; a worker and request-time reconciliation both invoke it. Admin and rider clients read this server state, while the rider app also hides cached assignments immediately at cutoff when offline.

**Tech Stack:** TypeScript, Express, MySQL, React web admin, Expo React Native rider app, Vitest, Jest.

**Spec:** `docs/superpowers/specs/2026-10-22-admin-managed-shift-hours-design.md`

## Global constraints

- One global schedule for all riders; no per-rider or overnight schedule.
- Philippine time zone: `Asia/Manila`, UTC+08:00. End time initially `19:00`; admin chooses start time before activation.
- Saved changes first apply the next Philippine calendar day.
- Cutoff closes every open shift even with unfinished tasks; it never completes, cancels, or reassigns those tasks.
- After cutoff, rider Today, Upcoming, and Overdue assignments and job actions remain inaccessible until the next eligible start time; admin access remains.
- Preserve unrelated dirty files. After code changes run `graphify update .`, then the `quality-gate` skill sequence: lint → typecheck → test → build; fix and rerun the full sequence on failure.

## Review focus

- A schedule saved at 18:59 must not move today's cutoff; tomorrow must use the new revision. Test in Task 1.
- A worker retry after a manual 18:59 end must preserve the manual timestamp and produce no second event. Test in Task 2.
- A rider request at exactly the end minute must be denied even if the worker has not run. Test in Task 3.
- A cached deep link or queued status update after cutoff must not expose or mutate an active job. Test in Task 3.
- A rider offline at cutoff must see hidden assignments, then the one server closure on reconnect. Test in Task 5.

---

## File map and interfaces

- `server/services/shiftSchedule.ts`: schedule table initialization, revisions, Philippine date/time parsing, and `getShiftPolicy(db, now)`.
- `server/services/shiftCutoff.ts`: `reconcileRiderCutoff(db, riderId, now)` and `reconcileDueCutoffs(db, now)`; uses `shiftSessions` transaction conventions.
- `server/routes/shiftSchedule.ts`: admin GET/PUT schedule and admin cutoff-review reads.
- `server/services/shiftSessions.ts`: shared start/end transaction and scheduled close metadata.
- `server/routes/users.ts`, `server/routes/riderTasks.ts`, `server/routes/requests.ts`: policy enforcement and extended rider shift response.
- `server/index.ts`: initialize schema, mount routes, start worker, and stop worker on shutdown.
- `src/app/pages/Admin/ShiftHours.tsx`, `src/app/pages/Admin/AdminLayout.tsx`: admin schedule page and navigation.
- `src/app/pages/Admin/AttendanceDashboard.tsx`: visible scheduled closure and unfinished-task review entry.
- `mobile-app/context/LocationContext.tsx`, `mobile-app/components/ShiftControlCard.tsx`, rider task tabs, `mobile-app/app/job/[id].tsx`: rider cutoff state and hidden task access.

## Task 1: Persist effective-dated shared schedule and evaluate policy

**Files:** Create `server/services/shiftSchedule.ts`, `server/services/__tests__/shiftSchedule.test.ts`; modify `server/index.ts` only for schema initialization.

**Interfaces:** Produce `type ShiftPolicy = { date: string; startTime: string | null; endTime: string | null; cutoffAt: string | null; canStart: boolean; canWork: boolean; nextStartAt: string | null; active: boolean }`, `ensureShiftScheduleTables(db): Promise<void>`, `getShiftPolicy(db, riderId: string, now: Date): Promise<ShiftPolicy>`, `saveNextDaySchedule(db, actorId, startTime, endTime, now): Promise<ScheduleRevision>`. Define `getPhilippineDateString(now: Date)` in this service for testable date conversion.

- [ ] **Step 1: Write failing policy tests.** Cover no active schedule, `18:59`, exactly `19:00`, next day start, invalid `start >= end`, and a late-day edit taking effect tomorrow. Use injected `Date` values rather than changing global time.

```ts
expect(await getShiftPolicy(db, 'rider-1', new Date('2026-10-22T11:00:00Z')))
  .toMatchObject({ date: '2026-10-22', canStart: false, canWork: false });
expect(await getShiftPolicy(db, 'rider-1', new Date('2026-10-23T01:00:00Z')))
  .toMatchObject({ date: '2026-10-23', canStart: true });
```

- [ ] **Step 2: Run `npx vitest run server/services/__tests__/shiftSchedule.test.ts` and confirm the new policy tests fail.**
- [ ] **Step 3: Implement `shift_schedule_revisions` with unique `effective_date`, `start_time`, `end_time`, `actor_id`, and `created_at`.** Follow existing `ensure*Table` startup patterns. Replace tomorrow's pending revision atomically if the admin edits it again; never alter an already-effective revision. Use `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', ... })` or a project date helper consistently.

```ts
export async function getShiftPolicy(db: Db, riderId: string, now: Date): Promise<ShiftPolicy> {
  const date = getPhilippineDateString(now);
  const revision = await getRevisionForDate(db, date);
  return decidePolicy(date, revision, now);
}
```

- [ ] **Step 4: Run the focused tests and commit only Task 1 files.**

## Task 2: Close due shifts transactionally and recover missed cutoffs

**Files:** Create `server/services/shiftCutoff.ts`, `server/services/__tests__/shiftCutoff.test.ts`; modify `server/services/shiftSessions.ts`, `server/index.ts`.

**Interfaces:** Consume `getShiftPolicy`. Produce `reconcileRiderCutoff(db, riderId, now): Promise<ShiftSession | null>` and `reconcileDueCutoffs(db, now): Promise<number>`. Add `end_source: 'manual' | 'scheduled' | 'legacy'` and `scheduled_cutoff_at` to session data.

- [ ] **Step 1: Write failing service tests.** Verify closure with zero and multiple unfinished tasks, effective timestamp exactly `19:00`, correct attendance date, unchanged delivery rows, idempotent retry, manual-end race, yesterday's missed cutoff, and a pre-activation open session left for admin review.

```ts
const first = await reconcileRiderCutoff(db, 'rider-1', new Date('2026-10-22T11:03:00Z'));
const second = await reconcileRiderCutoff(db, 'rider-1', new Date('2026-10-22T11:04:00Z'));
expect(first?.end_time).toBe('2026-10-22 19:00:00');
expect(second).toBeNull();
expect(await countEvents(db, 'rider-1', 'scheduled_shift_end')).toBe(1);
```

- [ ] **Step 2: Run `npx vitest run server/services/__tests__/shiftCutoff.test.ts` and confirm failure.**
- [ ] **Step 3: Add repeatable schema alteration for closure source and scheduled cutoff, then implement close under the same rider-row lock used by manual shift transitions.** Compute the cutoff from the schedule applicable to the session's start date; update that attendance date, not processing date. Use a deterministic `end_operation_id` derived from the session ID and cutoff, and insert a durable movement or audit event in the transaction.

```ts
await conn.query(
  "UPDATE shift_sessions SET end_time=?, session_state='closed', end_source='scheduled', scheduled_cutoff_at=?, end_operation_id=?, handover_reason='Scheduled shift cutoff', active_task_count_at_end=? WHERE id=? AND session_state='open'",
  [cutoffAt, cutoffAt, `scheduled_${session.id}`, activeTasks.length, session.id],
);
```

- [ ] **Step 4: Start one worker after schema initialization; run it on startup and at least once per minute.** Reconcile due sessions by date, with error logging, no overlapping runs, and timer cleanup on shutdown. Treat post-commit socket/push as best effort; admin review derives from saved session/task data.
- [ ] **Step 5: Run the focused tests and commit only Task 2 files.**

## Task 3: Enforce schedule and cutoff in rider APIs

**Files:** Modify `server/routes/users.ts`, `server/routes/riderTasks.ts`, `server/routes/requests.ts`; create `server/middleware/riderShiftAccess.ts` and focused route tests under `server/routes/__tests__/`.

**Interfaces:** Consume `getShiftPolicy` and `reconcileRiderCutoff`. Produce `requireRiderWorkAccess(req, res, next)` for rider assignment reads and job writes. Extend `/api/users/me/shift-session` with `schedule`, `server_time`, `locked`, `next_start_at`, and `last_end_source`.

- [ ] **Step 1: Write failing route tests.** Exercise present check-in and On Duty before start and at cutoff, same-day restart denial, assignment list/detail after cutoff, status mutation after cutoff, admin list/detail still allowed, and exact-boundary request before worker execution.

```ts
await request(app).put('/api/requests/job-1/status').set('Authorization', riderToken)
  .send({ status: 'completed' }).expect(403);
await request(app).get('/api/requests/job-1').set('Authorization', adminToken).expect(200);
```

- [ ] **Step 2: Run focused Vitest route files and confirm failure.**
- [ ] **Step 3: Reconcile before answering rider shift reads and before rider mutations.** In `users.ts`, gate both present attendance and On Duty; manual end at/after cutoff returns the already scheduled-close state. In `riderTasks.ts`, return no active assignments to locked riders but retain history. In `requests.ts`, filter rider list/counts and deny active-job detail/timeline reads and the rider status/deviation writes at `/:id/status` and `/:id/deviation`; audit any other rider-capable job endpoint while integrating. Keep completed history and admin access.

```ts
if (req.user?.role === 'rider') {
  await reconcileRiderCutoff(pool, req.user.id, new Date());
  const policy = await getShiftPolicy(pool, req.user.id, new Date());
  if (!policy.canWork) return res.status(403).json({ code: 'SHIFT_HOURS_LOCKED', next_start_at: policy.nextStartAt });
}
```

- [ ] **Step 4: Run focused route tests and commit only Task 3 files.**

## Task 4: Add admin schedule API, page, and durable task review

**Files:** Create `server/routes/shiftSchedule.ts`, `src/app/pages/Admin/ShiftHours.tsx`, `tests/unit/admin-shift-hours.test.tsx`; modify `server/index.ts`, `src/app/pages/Admin/AdminLayout.tsx`, `src/app/pages/Admin/AttendanceDashboard.tsx` and focused server route tests.

**Interfaces:** GET `/api/shift-schedule` returns current and next revision plus Philippine date; PUT accepts `{ start_time: 'HH:mm', end_time: 'HH:mm' }` for next-day effect; GET `/api/shift-schedule/cutoff-review?date=YYYY-MM-DD` returns scheduled closures with unfinished tasks and current task IDs.

- [ ] **Step 1: Write failing API and UI tests.** Only admin may save; malformed or overlapping times return 400; saving shows tomorrow's effective date; Attendance exposes a rider with scheduled closure and unfinished tasks. Test desktop and mobile admin navigation access.

```ts
await request(app).put('/api/shift-schedule').set('Authorization', adminToken)
  .send({ start_time: '08:00', end_time: '19:00' }).expect(200);
await request(app).put('/api/shift-schedule').set('Authorization', riderToken)
  .send({ start_time: '08:00', end_time: '19:00' }).expect(403);
```

- [ ] **Step 2: Run focused Vitest tests and confirm failure.**
- [ ] **Step 3: Implement admin-only routes and use the existing audit logger for each accepted revision.** Make schedule persistence authoritative even if a notification fails; expose saved actor and effective date. Query scheduled sessions plus unfinished assigned requests for durable review, show open shifts with unfinished tasks before cutoff, and identify due-but-open shifts when the worker fails.
- [ ] **Step 4: Add lazy-loaded Shift Hours view under Settings.** Show current hours, pending revision, time zone, effective date, validation errors, and a concise hard-cutoff consequence. Link scheduled closures with unfinished jobs to the existing Attendance/Dispatch view.

```tsx
<form onSubmit={saveSchedule}>
  <label>Earliest On Duty <input type="time" value={startTime} onChange={onStartChange} /></label>
  <label>Automatic End shift <input type="time" value={endTime} onChange={onEndChange} /></label>
  <button type="submit">Save for tomorrow</button>
</form>
```

- [ ] **Step 5: Run focused tests and commit only Task 4 files.**

## Task 5: Hide rider assignments and show cutoff state, including offline

**Files:** Modify `mobile-app/context/LocationContext.tsx`, `mobile-app/services/apiService.ts`, `mobile-app/components/ShiftControlCard.tsx`, `mobile-app/app/(tabs)/index.tsx`, `overdue.tsx`, `tomorrow.tsx`, `mobile-app/app/job/[id].tsx`; add focused Jest tests beside affected components/screens.

**Interfaces:** Consume extended rider shift response. Expose `shiftHoursLocked: boolean`, `nextShiftStartAt: string | null`, `shiftSchedule: { start_time: string; end_time: string } | null`, and `lastEndSource` from `useLocation()`.

- [ ] **Step 1: Write failing mobile tests.** At cutoff, all three assignment tabs hide cached tasks, Shift Control replaces On Duty with next start time, job deep link blocks actions, and offline cutoff stays hidden until server resync. Before cutoff, existing task behavior remains.

```tsx
mockUseLocation({ shiftHoursLocked: true, isOnDuty: true, hasOpenShift: true });
expect(screen.queryByTestId('today_task_card_0')).toBeNull();
expect(screen.getByText(/next shift/i)).toBeTruthy();
```

- [ ] **Step 2: Run focused `npm test -- --runInBand` from `mobile-app` and confirm failure.**
- [ ] **Step 3: Store last confirmed schedule and server-time offset per rider.** Use it only for immediate local hiding while offline; call `syncStatus()` on reconnect and app resume. Do not write an end-shift operation locally. If there is no confirmed schedule offline, keep job controls locked.
- [ ] **Step 4: Apply one `canShowAssignments = isShiftStatusReady && hasOpenShift && isOnDuty && !shiftHoursLocked && isNetworkReachable !== false` rule to Today, Upcoming, and Overdue; gate stale job detail screens too.** Show scheduled end and next eligible start in Shift Control; display a pre-cutoff warning while open.
- [ ] **Step 5: Run focused mobile tests and commit only Task 5 files.**

## Task 6: Integrate, verify, and deliver

**Files:** Add or update integration tests for shift cutoff and rider task access; update operational documentation if worker startup or schedule activation needs deployment steps.

- [ ] **Step 1: Test an end-to-end fixture with schedule `08:00–19:00`, one on-duty rider, one open but off-duty rider, and unfinished today/upcoming/overdue tasks.** Assert both shifts close at 19:00, admin tasks remain, rider tasks disappear, and next-day On Duty works at 08:00.
- [ ] **Step 2: Test recovery with the worker stopped from 18:59 through 19:05; restart it and assert exactly one closure at 19:00.** Test a schedule revision saved at 18:59 and a concurrent manual end.
- [ ] **Step 3: Run `graphify update .` after all code changes.**
- [ ] **Step 4: Read `.agents/skills/quality-gate/SKILL.md`, then run its applicable checks in exact order: lint → typecheck → test → build.** Stop at any failure, fix it, and rerun the full sequence. Record commands and results in the final report.
- [ ] **Step 5: Review only feature files and test output, commit the final integration changes, and report behavior and any deployment migration step.**
