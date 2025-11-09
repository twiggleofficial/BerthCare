# Draft PR – Offline Sync

> Branch: `main` → `feat/offline-sync`  
> Design lens: offline sync must feel effortless—prototype, refine, and keep it invisible.

## Intent
Keep the offline-first experience invisible by staging all WatermelonDB plumbing, sync orchestration, and caregiver-facing affordances on a single draft PR. This branch collects the entire D1–D8 surface so we can iterate on schema mirroring, background sync, and conflict handling without blocking adjacent streams.

## Delivery Checklist
- [ ] WatermelonDB setup & schema parity (D1, D2)
- [ ] Sync engine, queue, and background workers (D3, D4, D5, D6)
- [ ] Conflict resolution UX + sync status surface (D7, D8)

## Linked Tasks (D1–D8)
- [ ] [D1 – Set up WatermelonDB](project-documentation/task-plan.md#task-d1)
- [ ] [D2 – Implement WatermelonDB models](project-documentation/task-plan.md#task-d2)
- [ ] [D3 – Implement local data access layer](project-documentation/task-plan.md#task-d3)
- [ ] [D4 – Implement sync queue](project-documentation/task-plan.md#task-d4)
- [ ] [D5 – Implement sync engine core](project-documentation/task-plan.md#task-d5)
- [ ] [D6 – Implement background sync](project-documentation/task-plan.md#task-d6)
- [ ] [D7 – Implement auto-save for forms](project-documentation/task-plan.md#task-d7)
- [ ] [D8 – Add sync status UI](project-documentation/task-plan.md#task-d8)

## Testing & Verification (before moving PR out of draft)
- [ ] `pnpm --filter apps/mobile lint`
- [ ] `pnpm --filter apps/mobile test`
- [ ] `pnpm --filter apps/mobile expo start`
- [ ] Offline flight checks: enable airplane mode, capture add/edit flows, re-enable network to confirm merge + conflict UI

## Rollout Notes
- Keep WatermelonDB schema updates in lockstep with backend migrations; document any temporary deviations.
- Prototype sync conflict messaging in Figma alongside implementation to confirm it stays invisible unless needed.
- Capture remaining polish or instrumentation gaps as follow-up issues so the branch can merge once checklist items are complete.
