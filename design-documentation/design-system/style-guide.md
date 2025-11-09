# BerthCare Design System

**Version:** 2.0.0  
**Last Updated:** November 8, 2025

---

## Design Philosophy

> "Simplicity is the ultimate sophistication. If users need a manual, the design has failed."

BerthCare exists to eliminate friction between caregivers and the people they serve. Every design decision starts with a simple question: **Does this help a caregiver provide better care?**

### Core Principles

**Invisible Technology**  
The best interface is no interface. Technology should fade into the background, letting caregivers focus on what matters—their patients.

**Ruthless Simplicity**  
Say no to 1,000 things. Every button, every feature, every pixel must justify its existence. If it doesn't serve the user's immediate goal, it doesn't belong.

**Designed for Reality**  
Our users wear gloves. They work in dim hallways. Their hands are full. They're interrupted constantly. Design for the real world, not the ideal one.

**Perfection in Details**  
The parts you can't see should be as beautiful as the parts you can. Quality goes all the way through—from the corner radius of a button to the timing of an animation.

**Think Different**  
Question every assumption. Break from conventional wisdom when necessary. Create products people don't know they need yet.

---

## Product Architecture

BerthCare is a mobile-first home care documentation platform with three primary interfaces:

### Mobile Apps (iOS & Android)
**Primary users:** Home care workers, care coordinators  
**Purpose:** Visit documentation, care coordination, offline-first workflows  
**Design system applies:** All tokens, components, and patterns

### Web Portal (Admin/Coordinator)
**Primary users:** Administrators, care coordinators  
**Purpose:** Client management, reporting, team oversight, data import/export  
**Design system applies:** Colors, typography, spacing (adapted for desktop)

### SMS Communication (Family Updates)
**Primary users:** Family members  
**Purpose:** Daily care updates, status notifications  
**Design system applies:** Tone, voice, microcopy only (no visual design)

---

## Design Tokens

Our design system is built on four foundational token systems. Each is documented in detail:

- **[Colors](./tokens/colors.md)** - Foundation, semantic, and functional color tokens
- **[Typography](./tokens/typography.md)** - Font scales, weights, and text styles
- **[Spacing](./tokens/spacing.md)** - 8px grid system and layout principles
- **[Motion](./tokens/motion.md)** - Animation durations, easing, and patterns

### Quick Reference

**Colors:**
- Trust Blue `#0066CC` - Primary actions
- Complete Green `#00A84F` - Success states
- Urgent Red `#D32F2F` - Errors and critical alerts
- Neutral scale - 11 steps from white to black

**Typography:**
- Base size: 17px (not 16px)
- Three weights: Regular (400), Semibold (600), Bold (700)
- System fonts only: -apple-system, Roboto, Segoe UI

**Spacing:**
- 8px base unit
- Touch targets: 48px minimum (56px comfortable)
- Screen margins: 16px mobile, 24px tablet

**Motion:**
- Instant: 80ms
- Quick: 150ms
- Standard: 250ms
- Maximum: 400ms (never exceed)

---

## Core Features

BerthCare focuses on essential home care workflows:

1. **Visit Documentation** - Mobile point-of-care documentation with offline support
2. **Electronic Visit Verification** - Invisible GPS verification, no check-in screens
3. **Smart Data Reuse** - Copy previous visit data, edit only what changed
4. **Care Coordination** - One-tap alerts to care team via voice/SMS
5. **Family Communication** - Automated daily SMS updates (no portal)
6. **Data Bridge** - Simple CSV import/export for legacy system coexistence
7. **Authentication** - Biometric-first, 60-second activation

**What we don't build:**
- Messaging platforms
- Social features
- Complex dashboards
- Feature-heavy portals
- Anything that doesn't directly serve caregivers

---

## Component Patterns

### Buttons

**Primary Button**
- Height: 48px minimum (56px comfortable)
- Padding: 16px horizontal
- Font: 17px Semibold
- Color: White on Trust Blue
- Corner radius: 12px
- Touch target: 48px × 48px minimum

**Secondary Button**
- Same dimensions as primary
- Color: Trust Blue on transparent
- Border: 1px solid Trust Blue

**Icon-Only Button**
- Size: 48px × 48px
- Icon: 24px centered
- Always include accessibility label

### Forms

**Text Input**
- Height: 48px
- Padding: 16px horizontal
- Font: 17px Regular
- Border: 1px solid neutral-300
- Focus: 2px solid Trust Blue
- Corner radius: 12px

**Field Spacing**
- Label to input: 8px
- Between fields: 20px
- Helper text: 4px below field

### Cards

**Standard Card**
- Padding: 16px (mobile), 24px (tablet)
- Corner radius: 12px
- Shadow: Level 1 (resting)
- Background: White

**Card Spacing**
- Between cards: 16px
- Card to screen edge: 16px

### Navigation

**Bottom Tab Bar**
- Height: 56px + safe area
- Icons: 24px
- 3-5 tabs maximum
- Active state: Trust Blue filled icon

**Top Navigation**
- Height: 56px + safe area
- Title: 20px Semibold
- Back button: 48px × 48px touch target

---

## Accessibility

**Philosophy:** Accessibility is not a feature. It's a requirement.

### Non-Negotiables

**Color Contrast**
- Body text: 4.5:1 minimum (WCAG AA)
- Large text (20pt+): 3:1 minimum
- Interactive elements: 3:1 minimum
- Test every color combination. No exceptions.

**Touch Targets**
- Minimum: 48px × 48px (exceeds WCAG AAA)
- Comfortable: 56px × 56px
- Spacing: 8px minimum between targets
- caregivers wear gloves. Make targets big.

**Focus Indicators**
- Always visible
- 2px solid Trust Blue
- 2px offset from element
- Never remove `:focus` styles

**Screen Readers**
- Use semantic HTML: `<button>` not `<div onclick>`
- Provide text alternatives for all images
- Labels for all form inputs
- ARIA labels for icon buttons
- ARIA live regions for dynamic changes

**Testing Checklist**
- [ ] Navigate with keyboard only
- [ ] Test with VoiceOver (iOS) or TalkBack (Android)
- [ ] Test with 200% text size
- [ ] Test with high contrast mode
- [ ] Test with reduced motion enabled
- [ ] Test with gloves on
- [ ] Test in bright sunlight
- [ ] Test in dim hallways

**If you can't use it with gloves on, redesign it.**

---

## Platform Adaptations

**Philosophy:** Feel native. Look like you belong.

### iOS (Primary Platform)

- Use SF Pro (automatic with system fonts)
- Support Dynamic Type
- Tab bar at bottom (3-5 items)
- Swipe back gesture
- Haptic feedback: Light (button), Medium (success), Heavy (error)
- Respect safe areas (notch, home indicator)
- Offline-first architecture

### Android (Primary Platform)

- Use Roboto (automatic with system fonts)
- Support font scaling
- Bottom navigation (3-5 items)
- Back button in top-left
- Use elevation for hierarchy
- Support adaptive icons
- Offline-first architecture

### Web (Admin/Coordinator Portal Only)

- Progressive enhancement
- Mobile-first responsive design
- Breakpoints: 768px (tablet), 1024px (desktop)
- Keyboard navigation with visible focus
- Browser support: Latest 2 versions of Chrome, Safari, Firefox, Edge
- Used for: Client management, reporting, team coordination

---

## Implementation

### Design Tokens (CSS)

```css
:root {
  /* Colors - Foundation */
  --color-trust-500: #0066cc;
  --color-trust-600: #0052a3;
  --color-trust-700: #003d7a;
  
  --color-complete-500: #00a84f;
  --color-complete-700: #007637;
  
  --color-urgent-500: #d32f2f;
  --color-urgent-700: #a12121;
  
  --color-attention-500: #ffa000;
  --color-attention-700: #cc7a00;

  /* Colors - Neutral */
  --color-neutral-0: #ffffff;
  --color-neutral-100: #f5f5f5;
  --color-neutral-300: #e0e0e0;
  --color-neutral-500: #9e9e9e;
  --color-neutral-700: #616161;
  --color-neutral-900: #212121;

  /* Colors - Functional */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-700);
  --color-text-link: var(--color-trust-500);
  --color-surface-primary: var(--color-neutral-0);
  --color-surface-secondary: var(--color-neutral-100);
  --color-border-default: var(--color-neutral-300);

  /* Spacing (8px grid) */
  --space-2xs: 4px;
  --space-xs: 8px;
  --space-sm: 12px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;
  --space-3xl: 64px;

  /* Touch Targets */
  --touch-min: 48px;
  --touch-comfortable: 56px;
  --touch-primary: 64px;

  /* Typography */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  --font-size-title: 28px;
  --font-size-heading: 20px;
  --font-size-body: 17px;
  --font-size-small: 15px;
  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Motion */
  --duration-instant: 80ms;
  --duration-quick: 150ms;
  --duration-standard: 250ms;
  --duration-deliberate: 400ms;
  
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-emphasized: cubic-bezier(0, 0, 0.2, 1);
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);
  --ease-sharp: cubic-bezier(0.4, 0, 0.6, 1);

  /* Elevation */
  --shadow-resting: 0 1px 3px rgba(0, 0, 0, 0.1);
  --shadow-raised: 0 2px 8px rgba(0, 0, 0, 0.12);
  --shadow-floating: 0 8px 24px rgba(0, 0, 0, 0.15);

  /* Radius */
  --radius-default: 12px;
  --radius-small: 8px;
}
```

### React Native / Mobile

```javascript
export const tokens = {
  colors: {
    trust: { 500: '#0066CC', 600: '#0052A3', 700: '#003D7A' },
    complete: { 500: '#00A84F', 700: '#007637' },
    urgent: { 500: '#D32F2F', 700: '#A12121' },
    neutral: {
      0: '#FFFFFF',
      100: '#F5F5F5',
      300: '#E0E0E0',
      500: '#9E9E9E',
      700: '#616161',
      900: '#212121',
    },
  },
  spacing: {
    '2xs': 4, xs: 8, sm: 12, md: 16,
    lg: 24, xl: 32, '2xl': 48, '3xl': 64,
    touchMin: 48, touchComfortable: 56,
  },
  typography: {
    title: { fontSize: 28, fontWeight: '700', lineHeight: 36 },
    heading: { fontSize: 20, fontWeight: '600', lineHeight: 28 },
    body: { fontSize: 17, fontWeight: '400', lineHeight: 26 },
    small: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  },
  motion: {
    duration: { instant: 80, quick: 150, standard: 250, deliberate: 400 },
  },
};
```

---

## Design Principles in Practice

### Question Everything

Before adding a feature, ask:
- Does this help a caregiver provide better care?
- Can we solve this without adding UI?
- What can we remove instead?

### Start with the User Experience

Work backwards from the goal:
1. What is the user trying to accomplish?
2. What's the fastest path to that goal?
3. What can we eliminate?
4. Now design the interface.

### Obsess Over Details

The details matter:
- Corner radius: 12px, not 10px or 15px
- Animation: 150ms, not 200ms
- Touch target: 48px minimum, 56px comfortable
- Line height: 1.5x minimum for body text

Test everything:
- In bright sunlight
- In dim hallways
- With gloves on
- With one hand
- While walking
- While interrupted

### Say No

Say no to 1,000 things. Focus is about saying no to good ideas.

We say no to:
- Features that serve edge cases
- Customization that creates complexity
- "Nice to have" additions
- Anything that doesn't serve the core mission

We say yes to:
- Removing features
- Simplifying workflows
- Eliminating steps
- Making technology invisible

---

## Testing Protocol

Before shipping any design:

**Real-World Testing**
- [ ] Test with gloves on (latex and nitrile)
- [ ] Test in bright sunlight outdoors
- [ ] Test in dim hallway lighting
- [ ] Test one-handed on smallest device (iPhone SE)
- [ ] Test while walking
- [ ] Test at end of shift (tired eyes, low patience)

**Accessibility Testing**
- [ ] Navigate with keyboard only
- [ ] Test with VoiceOver (iOS) or TalkBack (Android)
- [ ] Test with 200% text size
- [ ] Test with high contrast mode
- [ ] Test with reduced motion enabled
- [ ] Verify all color contrasts meet WCAG AA minimum

**Performance Testing**
- [ ] Test on 3-year-old devices (iPhone 8, Galaxy S8)
- [ ] Verify animations maintain 60fps
- [ ] Test in offline mode
- [ ] Measure battery impact during 8-hour shift

---

## Living Document

This style guide evolves. As we learn from users, we refine our approach.

**Current focus areas:**
- Offline state communication
- Glove-friendly interactions
- One-handed operation
- Interruption recovery

**Next review:** December 2025

---

**Questions?** Challenge these guidelines. Make them better. Design is never finished.
