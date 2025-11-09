# Draft PR – Mobile Foundation

> Branch: `main` → `feat/mobile-foundation`  
> Design lens: begin with caregiver flows so every interaction feels obvious and delightful.

## Intent
Bootstrap the mobile surface so caregivers land inside a cohesive, obvious experience from the first tap. This draft PR will stay open while we build the Expo shell, shared design system, navigation, and authentication moments that unblock tasks M1-M11.

## Delivery Checklist
- [ ] Expo setup & performance envelope (M1, M10, M11)
- [ ] Navigation scaffold with deep links (M4)
- [ ] Design system tokens + primitives (M2, M3)
- [ ] Auth experience (activation + secure session) (M5, M6, M7, M8, M9)

## Component Preview
- Run `pnpm --filter @berthcare/mobile expo start` and open the **Open component preview ↗** link (dev-only) on the home screen to load `/component-preview`.
- The preview surface renders Button, Card, Input, and Typography states exactly as specified in design-documentation/design-system/components and the WCAG notes in design-documentation/accessibility.
- Use this route for visual review or quick regressions without wiring backend data.

## Linked Tasks
- [ ] [M1 – Initialize React Native app with Expo](project-documentation/task-plan.md#L62)
- [ ] [M2 – Set up design system tokens](project-documentation/task-plan.md#L63)
- [ ] [M3 – Implement core UI components](project-documentation/task-plan.md#L64)
- [ ] [M4 – Set up navigation structure](project-documentation/task-plan.md#L65)
- [ ] [M5 – Implement global state management](project-documentation/task-plan.md#L66)
- [ ] [M6 – Implement API client](project-documentation/task-plan.md#L67)
- [ ] [M7 – Implement activation experience](project-documentation/task-plan.md#L68)
- [ ] [M8 – Implement biometric + PIN enrollment](project-documentation/task-plan.md#L69)
- [ ] [M9 – Implement protected route wrapper](project-documentation/task-plan.md#L70)
- [ ] [M10 – Implement offline detection](project-documentation/task-plan.md#L71)
- [ ] [M11 – Add app launch performance optimization](project-documentation/task-plan.md#L72)

## Testing & Verification (to complete before moving PR out of draft)
- [ ] `pnpm --filter apps/mobile lint`
- [ ] `pnpm --filter apps/mobile test`
- [ ] `pnpm --filter apps/mobile expo start`
- [ ] iOS + Android smoke tests covering activation, navigation, offline banner, and protected route unlock

## Rollout Notes
- Keep Expo + React Navigation upgrades isolated to this branch to avoid churn on backend-focused work.
- Capture any follow-up issues (copy, animations, polish) as separate tasks so this PR stays focused on foundational flows.
