# Draft PR – Backend Foundation (`feat/backend-foundation`)

## Summary
- Launch the backend foundation stream with a lean, predictable services mindset and obsessive attention to unseen details.
- Track all backend foundation scope (tasks B1–B10) from the implementation plan as part of this draft.
- Use this branch to stage schema, API scaffolding, authentication flows, and end-to-end tests before requesting review.

## Checklist
- [ ] Database schema in place — covers [B2 – Design and implement database schema](./task-plan.md#L44)
- [ ] API scaffold assembled — covers [B1 – Initialize backend application](./task-plan.md#L43)
- [ ] Auth endpoints functional — covers [B5](./task-plan.md#L47), [B6](./task-plan.md#L48), [B7](./task-plan.md#L49), [B10](./task-plan.md#L52)
- [ ] Tests green — spans [B1](./task-plan.md#L43), [B5](./task-plan.md#L47)–[B10](./task-plan.md#L52)

### Linked Tasks (B1–B10)
- [ ] [B1 – Initialize backend application](./task-plan.md#L43)
- [ ] [B2 – Design and implement database schema](./task-plan.md#L44)
- [ ] [B3 – Implement database connection pool](./task-plan.md#L45)
- [ ] [B4 – Implement Redis cache layer](./task-plan.md#L46)
- [ ] [B5 – Implement activation initiation endpoint](./task-plan.md#L47)
- [ ] [B6 – Implement activation completion & device sessions](./task-plan.md#L48)
- [ ] [B7 – Implement authorization middleware](./task-plan.md#L49)
- [ ] [B8 – Implement error handling middleware](./task-plan.md#L50)
- [ ] [B9 – Implement API versioning and base routes](./task-plan.md#L51)
- [ ] [B10 – Implement session refresh & revocation endpoints](./task-plan.md#L52)

## Launch Steps
1. Complete the checklist above as commits land on `feat/backend-foundation`.
2. Push the branch to GitHub and open a draft PR titled **"feat: backend foundation bootstrap"** using this content as the body.
3. Ensure CI pipelines run on the draft PR so status checks stay visible while development continues.
