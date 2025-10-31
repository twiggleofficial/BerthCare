# Motion System

> "The best interface is no interface. Motion should be invisible - felt, not seen."

Motion in BerthCare exists to communicate system state, guide attention, and maintain spatial continuity. Every animation serves the user's understanding, never decoration.

---

## Design Philosophy

Motion must be:

- **Invisible** - Users shouldn't notice animations, only feel responsiveness
- **Instant** - Healthcare workers are moving fast; the interface must keep up
- **Purposeful** - Every motion communicates state, progress, or spatial relationship
- **Accessible** - Respect cognitive load and motion sensitivity
- **Battery-conscious** - Optimize for 8+ hour shifts on mobile devices

**Core Principle:** If an animation doesn't help the user understand what's happening, delete it.

---

## Duration Tokens

Motion timing is calibrated for mobile devices held in one hand, often with gloves, during active patient care.

```css
/* Micro-interactions - immediate feedback */
--duration-instant: 80ms;

/* State changes - button presses, toggles, selections */
--duration-quick: 150ms;

/* Transitions - navigation, modals, sheets */
--duration-standard: 250ms;

/* Complex choreography - multi-element sequences */
--duration-deliberate: 400ms;
```

**Hard Rule:** No animation exceeds 400ms. caregivers document 6-8 visits per shift - every millisecond compounds.

**Context-Aware Timing:**

- Offline mode: Reduce all durations by 30% (instant feedback critical when sync is delayed)
- Low battery (<20%): Disable non-essential animations automatically
- Slow device performance: Gracefully degrade to instant state changes

---

## Easing Curves

Physics-based easing creates natural, predictable motion that matches real-world expectations.

```css
/* Standard - balanced motion for most transitions */
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
/* Use: Screen transitions, modal appearances, content reveals */

/* Emphasized - elements entering the viewport */
--ease-emphasized: cubic-bezier(0, 0, 0.2, 1);
/* Use: Success confirmations, important alerts, data loading complete */

/* Accelerate - elements exiting or dismissing */
--ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
/* Use: Modal dismissals, navigation exits, form cancellations */

/* Sharp - immediate, decisive actions */
--ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);
/* Use: Button presses, toggle switches, checkbox selections */

/* Bounce - playful feedback for positive actions */
--ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
/* Use: Visit completion, successful sync, achievement moments */
/* Warning: Use sparingly - only for celebratory moments */
```

**Selection Guide:**

- Entering screen: `ease-emphasized` (welcoming, decelerating)
- Exiting screen: `ease-accelerate` (quick departure)
- User-initiated action: `ease-sharp` (responsive, immediate)
- System feedback: `ease-standard` (neutral, informative)

---

## Motion Patterns

### Critical User Feedback

These animations communicate system state and must never be disabled.

#### Button Press

```css
/* Visual confirmation of touch target activation */
transform: scale(1) → scale(0.96);
duration: var(--duration-instant);
easing: var(--ease-sharp);
```

**Purpose:** Immediate tactile feedback, especially critical for gloved hands on mobile devices.

#### Toggle Switch

```css
/* State change with clear before/after */
transform: translateX(0) → translateX(20px);
background: var(--color-neutral-300) → var(--color-primary-500);
duration: var(--duration-quick);
easing: var(--ease-sharp);
```

**Purpose:** Binary state changes must be instantly clear (online/offline, enabled/disabled).

#### Checkbox Selection

```css
/* Checkmark appearance with subtle scale */
opacity: 0 → 1;
transform: scale(0.8) → scale(1);
duration: var(--duration-quick);
easing: var(--ease-emphasized);
```

**Purpose:** Confirm selection in forms where multiple items may be checked rapidly.

---

### Navigation & Spatial Continuity

Motion maintains spatial relationships as users move through the app hierarchy.

#### Screen Transition (Forward)

```css
/* New screen slides in from right, current screen fades */
.entering-screen {
  transform: translateX(100%) → translateX(0);
  opacity: 0.8 → 1;
  duration: var(--duration-standard);
  easing: var(--ease-emphasized);
}

.exiting-screen {
  transform: translateX(0) → translateX(-30%);
  opacity: 1 → 0.4;
  duration: var(--duration-standard);
  easing: var(--ease-accelerate);
}
```

**Purpose:** Communicate hierarchy - moving deeper into content.

#### Screen Transition (Back)

```css
/* Reverse of forward - maintains spatial model */
.entering-screen {
  transform: translateX(-30%) → translateX(0);
  opacity: 0.4 → 1;
  duration: var(--duration-standard);
  easing: var(--ease-emphasized);
}

.exiting-screen {
  transform: translateX(0) → translateX(100%);
  opacity: 1 → 0.8;
  duration: var(--duration-standard);
  easing: var(--ease-accelerate);
}
```

**Purpose:** Communicate returning to previous context.

#### Bottom Sheet Appearance

```css
/* Modal content slides up from bottom */
transform: translateY(100%) → translateY(0);
duration: var(--duration-standard);
easing: var(--ease-emphasized);

/* Backdrop fades in simultaneously */
.backdrop {
  opacity: 0 → 1;
  duration: var(--duration-standard);
  easing: linear;
}
```

**Purpose:** One-handed reachability on mobile - content emerges from thumb zone.

---

### Content & Data Loading

Communicate system processing without blocking user progress.

#### Skeleton Screen Pulse

```css
/* Subtle shimmer indicates loading state */
opacity: 0.4 → 0.6 → 0.4;
duration: 1500ms;
easing: ease-in-out;
iteration: infinite;
```

**Purpose:** Show content structure while data loads, maintain context.

#### Progressive Content Reveal

```css
/* Staggered fade-in as content loads */
.content-item {
  opacity: 0 → 1;
  transform: translateY(8px) → translateY(0);
  duration: var(--duration-quick);
  easing: var(--ease-emphasized);
  delay: calc(var(--item-index) * 50ms);
}
```

**Purpose:** Reduce perceived loading time, guide eye down the page naturally.

#### Sync Status Indicator

```css
/* Rotating icon for active sync */
transform: rotate(0deg) → rotate(360deg);
duration: 1000ms;
easing: linear;
iteration: infinite;

/* Success state - scale bounce */
transform: scale(1) → scale(1.2) → scale(1);
duration: var(--duration-deliberate);
easing: var(--ease-bounce);
```

**Purpose:** Critical feedback for offline-first app - users must know sync status.

---

### Feedback & Confirmation

Celebrate success, communicate errors, guide attention.

#### Success Confirmation

```css
/* Checkmark with scale and fade */
.success-icon {
  opacity: 0 → 1;
  transform: scale(0.5) → scale(1.1) → scale(1);
  duration: var(--duration-deliberate);
  easing: var(--ease-bounce);
}

/* Background color pulse */
.success-container {
  background: var(--color-success-50) → var(--color-success-100) → var(--color-success-50);
  duration: 600ms;
  easing: ease-in-out;
}
```

**Purpose:** Positive reinforcement for visit completion, successful sync, task completion.

#### Error Shake

```css
/* Horizontal shake to indicate invalid input */
transform: translateX(0) → translateX(-8px) → translateX(8px) → translateX(0);
duration: var(--duration-standard);
easing: var(--ease-sharp);
```

**Purpose:** Draw attention to error without blocking workflow. Use sparingly.

#### Toast Notification

```css
/* Slide in from top with fade */
transform: translateY(-100%) → translateY(0);
opacity: 0 → 1;
duration: var(--duration-standard);
easing: var(--ease-emphasized);

/* Auto-dismiss after 4s */
delay: 4000ms;
transform: translateY(0) → translateY(-100%);
opacity: 1 → 0;
duration: var(--duration-quick);
easing: var(--ease-accelerate);
```

**Purpose:** Non-blocking system messages (sync complete, new message, etc.).

---

### Micro-interactions

Subtle details that make the interface feel alive and responsive.

#### Input Focus

```css
/* Border color and shadow transition */
border-color: var(--color-neutral-300) → var(--color-primary-500);
box-shadow: 0 0 0 0 → 0 0 0 4px rgba(primary, 0.1);
duration: var(--duration-quick);
easing: var(--ease-standard);
```

**Purpose:** Clear focus indication for keyboard navigation and accessibility.

#### Ripple Effect (Touch Feedback)

```css
/* Expanding circle from touch point */
.ripple {
  transform: scale(0) → scale(2);
  opacity: 0.3 → 0;
  duration: var(--duration-deliberate);
  easing: var(--ease-standard);
}
```

**Purpose:** Material Design pattern - confirms touch registration on large buttons.

#### Hover State (Web/Tablet)

```css
/* Subtle elevation increase */
transform: translateY(0) → translateY(-2px);
box-shadow: elevation-1 → elevation-2;
duration: var(--duration-instant);
easing: var(--ease-standard);
```

**Purpose:** Indicate interactivity on pointer devices. Disable on touch-only devices.

---

## Accessibility & Performance

### Reduced Motion

Respect user preferences and cognitive needs.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  /* Preserve critical feedback animations */
  .critical-feedback {
    animation-duration: var(--duration-instant) !important;
    transition-duration: var(--duration-instant) !important;
  }
}
```

**Critical Feedback Exceptions:**

- Button press feedback (scale)
- Toggle switch state change
- Sync status indicators
- Error shake animations

These animations communicate essential system state and should use minimal duration rather than being eliminated entirely.

### Battery Optimization

```javascript
// Detect low battery and reduce animations
if (navigator.getBattery) {
  navigator.getBattery().then((battery) => {
    if (battery.level < 0.2) {
      document.documentElement.classList.add('low-battery-mode');
    }
  });
}
```

```css
.low-battery-mode {
  --duration-instant: 50ms;
  --duration-quick: 80ms;
  --duration-standard: 120ms;
  --duration-deliberate: 200ms;
}

.low-battery-mode .non-essential-animation {
  animation: none !important;
  transition: none !important;
}
```

### Performance Guidelines

1. **Use transform and opacity only** - These properties don't trigger layout recalculation
2. **Avoid animating:** width, height, top, left, margin, padding
3. **Use will-change sparingly** - Only for animations about to occur, remove after
4. **Limit simultaneous animations** - Maximum 3 elements animating at once
5. **Test on 3-year-old devices** - Performance target: iPhone 8, Samsung Galaxy S8

```css
/* Good - GPU accelerated */
.optimized {
  transform: translateX(100px);
  opacity: 0.5;
}

/* Bad - triggers layout recalculation */
.unoptimized {
  left: 100px;
  width: 200px;
}
```

---

## Implementation Guidelines

### CSS Variables Integration

```css
:root {
  /* Duration tokens */
  --duration-instant: 80ms;
  --duration-quick: 150ms;
  --duration-standard: 250ms;
  --duration-deliberate: 400ms;

  /* Easing tokens */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

/* Apply to components */
.button {
  transition: transform var(--duration-instant) var(--ease-sharp);
}

.button:active {
  transform: scale(0.96);
}
```

### React Native / Mobile Implementation

```javascript
import { Animated, Easing } from 'react-native';

const DURATION = {
  instant: 80,
  quick: 150,
  standard: 250,
  deliberate: 400,
};

const EASING = {
  standard: Easing.bezier(0.4, 0.0, 0.2, 1),
  emphasized: Easing.bezier(0.0, 0.0, 0.2, 1),
  accelerate: Easing.bezier(0.4, 0.0, 1, 1),
  sharp: Easing.bezier(0.4, 0.0, 0.6, 1),
};

// Example: Button press animation
const scaleValue = new Animated.Value(1);

const animatePress = () => {
  Animated.sequence([
    Animated.timing(scaleValue, {
      toValue: 0.96,
      duration: DURATION.instant,
      easing: EASING.sharp,
      useNativeDriver: true,
    }),
    Animated.timing(scaleValue, {
      toValue: 1,
      duration: DURATION.instant,
      easing: EASING.sharp,
      useNativeDriver: true,
    }),
  ]).start();
};
```

---

## Testing & Quality Assurance

### Animation Checklist

Before shipping any animated component:

- [ ] Animation duration ≤ 400ms
- [ ] Uses only `transform` and `opacity` (performance)
- [ ] Respects `prefers-reduced-motion`
- [ ] Tested on 3-year-old device (iPhone 8 / Galaxy S8)
- [ ] Works correctly in offline mode
- [ ] Doesn't block user interaction
- [ ] Provides clear feedback for user action
- [ ] Maintains 60fps on target devices
- [ ] Gracefully degrades on slow devices
- [ ] Battery impact measured and acceptable

### User Testing Focus

When testing motion with caregivers:

1. **Responsiveness perception** - Does the app feel instant?
2. **Clarity of feedback** - Do users understand what happened?
3. **Distraction level** - Do animations help or hinder focus?
4. **Glove usability** - Can users see feedback with gloves on?
5. **Outdoor visibility** - Are animations visible in bright sunlight?

---

## Motion Governance

### When to Add Animation

✅ **Add animation when:**

- Communicating system state change (loading, success, error)
- Maintaining spatial continuity during navigation
- Providing immediate feedback for user actions
- Guiding attention to important information
- Celebrating meaningful achievements

❌ **Don't add animation for:**

- Decoration or "delight" without purpose
- Slowing down user workflows
- Showing off technical capability
- Following trends without user benefit
- Compensating for slow performance

### Review Process

All new animations must be reviewed for:

1. **Purpose** - What user need does this serve?
2. **Performance** - Measured frame rate on target devices
3. **Accessibility** - Reduced motion handling
4. **Battery impact** - Power consumption measurement
5. **User validation** - Tested with actual caregivers in field conditions

---

**Remember:** In healthcare, every second matters. Motion should accelerate understanding, never delay it. When in doubt, make it faster or remove it entirely.
