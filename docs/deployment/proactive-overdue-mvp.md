# Proactive overdue MVP deployment

1. Set `OVERDUE_WARNING_THRESHOLD_MINUTES` on the server (defaults to `30`; valid values are 1–1440).
2. Back up the database and run `node scripts/migrate-proactive-overdue.cjs` with the production database environment configured. The migration is safe to rerun; malformed legacy time windows remain without a calculated deadline.
3. Deploy the backend before the clients. The backend worker checks eligible requests every 30 seconds, persists schedule deadlines, and creates rider/admin in-app notifications once per warning state.
4. Deploy the web admin and rider mobile clients. Existing response fields remain available; the new deadline/state fields are additive.
5. Confirm a near-deadline task displays **AT RISK**, then confirm it displays **OVERDUE** only after its deadline. Verify one notification per rider/admin and confirm the task stays active until a person completes, cancels, or fails it.

`failed_at` is populated when a task is marked failed. `failure_reason_code` is nullable for this MVP and is reserved for the structured failure-reason workflow in Phase 2. `overdue_at` records the scheduled deadline when the worker first observes an overdue task (or when a late task is marked failed).

Roll back by stopping the new application version. The migration columns can remain safely in place; do not drop them while application versions that use them are deployed.
