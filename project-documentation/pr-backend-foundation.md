# Draft PR – Backend Foundation (`feat/backend-foundation`)

## Summary

- Launch the backend foundation stream with a lean, predictable services mindset and obsessive attention to unseen details.
- Track all backend foundation scope (tasks B1–B10) from the implementation plan as part of this draft.
- Use this branch to stage schema, API scaffolding, authentication flows, and end-to-end tests before requesting review.

## Checklist

- [ ] Database schema in place — covers [B2 – Design and implement database schema](./task-plan.md#b2-design-and-implement-database-schema)
- [ ] API scaffold assembled — covers [B1 – Initialize backend application](./task-plan.md#b1-initialize-backend-application)
- [ ] Auth endpoints functional — covers [B5](./task-plan.md#b5-implement-activation-initiation-endpoint), [B6](./task-plan.md#b6-implement-activation-completion-and-device-sessions), [B7](./task-plan.md#b7-implement-authorization-middleware), [B10](./task-plan.md#b10-implement-session-refresh-and-revocation-endpoints)
- [ ] Tests green — spans [B1](./task-plan.md#b1-initialize-backend-application), [B5](./task-plan.md#b5-implement-activation-initiation-endpoint)–[B10](./task-plan.md#b10-implement-session-refresh-and-revocation-endpoints)

### Linked Tasks (B1–B10)

- [ ] [B1 – Initialize backend application](./task-plan.md#b1-initialize-backend-application)
- [ ] [B2 – Design and implement database schema](./task-plan.md#b2-design-and-implement-database-schema)
- [ ] [B3 – Implement database connection pool](./task-plan.md#b3-implement-database-connection-pool)
- [ ] [B4 – Implement Redis cache layer](./task-plan.md#b4-implement-redis-cache-layer)
- [ ] [B5 – Implement activation initiation endpoint](./task-plan.md#b5-implement-activation-initiation-endpoint)
- [ ] [B6 – Implement activation completion & device sessions](./task-plan.md#b6-implement-activation-completion-and-device-sessions)
- [ ] [B7 – Implement authorization middleware](./task-plan.md#b7-implement-authorization-middleware)
- [ ] [B8 – Implement error handling middleware](./task-plan.md#b8-implement-error-handling-middleware)
- [ ] [B9 – Implement API versioning and base routes](./task-plan.md#b9-implement-api-versioning-and-base-routes)
- [ ] [B10 – Implement session refresh & revocation endpoints](./task-plan.md#b10-implement-session-refresh-and-revocation-endpoints)

## Launch Steps

1. Complete the checklist above as commits land on `feat/backend-foundation`.
2. Push the branch to GitHub and open a draft PR titled **"feat: backend foundation bootstrap"** using this content as the body.
3. Ensure CI pipelines run on the draft PR so status checks stay visible while development continues.
