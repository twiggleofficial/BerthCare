# Spacing System

> "Simplicity is the ultimate sophistication. If users need a manual, the design has failed."

**Core Principle:** Space creates clarity. Every pixel of breathing room serves a purpose - guiding attention, reducing cognitive load, and making touch targets effortless even with gloved hands.

---

## Design Philosophy

BerthCare's spacing system is built for real-world home care environments:

- **Glove-friendly touch targets** - Minimum 48px for primary actions
- **Cognitive breathing room** - Strategic whitespace reduces mental fatigue during 8-hour shifts
- **Content hierarchy** - Space defines importance without decoration
- **One-handed operation** - Thumb-zone optimization for mobile documentation

The best spacing is invisible. Users shouldn't think about layout - they should flow through tasks.

---

## Base Unit: 8px

Mathematical foundation for visual harmony. All spacing derives from this single unit, creating predictable rhythm across every screen.

**Why 8px?**

- Divisible by 2 and 4 for flexible scaling
- Aligns with iOS and Android native grid systems
- Creates natural touch target sizes (48px = 6 units)
- Simplifies responsive calculations

---

## Spacing Scale

### Core Scale (Mobile-First)

```
space-2xs:  4px   (0.5 × base)  // Icon-to-text gaps, badge spacing
space-xs:   8px   (1 × base)    // Tight internal padding, chip spacing
space-sm:   12px  (1.5 × base)  // Compact list items, form field internal padding
space-md:   16px  (2 × base)    // Default element spacing, card padding
space-lg:   24px  (3 × base)    // Section breaks, form field vertical spacing
space-xl:   32px  (4 × base)    // Major content blocks, page sections
space-2xl:  48px  (6 × base)    // Screen-level spacing, hero sections
space-3xl:  64px  (8 × base)    // Rare - onboarding, empty states
```

### Touch Target Spacing

```
touch-min:  48px  (6 × base)    // Minimum touch target (WCAG AAA)
touch-comfortable: 56px (7 × base) // Comfortable for gloved hands
touch-primary: 64px (8 × base)  // Primary CTAs, critical actions
```

**Critical:** Never make interactive elements smaller than 48px in any dimension. Home care staff often wear gloves.

---

## Context-Aware Usage

### Visit Documentation Screens

**Goal:** Minimize scrolling, maximize speed

- **Screen margins:** 16px (mobile), 24px (tablet)
- **Form field spacing:** 20px vertical (optimized for scanning)
- **Section breaks:** 32px (clear visual separation)
- **Bottom action bar:** 16px padding + safe area insets

**Rationale:** Tighter spacing reduces scrolling during documentation. Staff complete 6-8 visits per shift - every scroll adds friction.

### Patient Selection & Lists

**Goal:** Scannable, tap-friendly

- **List item height:** 72px minimum (name + metadata + touch target)
- **List item padding:** 16px horizontal, 12px vertical
- **Divider spacing:** 0px (use subtle borders instead)
- **Search bar margin:** 16px bottom

**Rationale:** Larger touch targets prevent mis-taps when selecting patients. Compact vertical spacing shows more clients per screen.

### Care Coordination & Messaging

**Goal:** Readable, conversational

- **Message bubbles:** 12px padding, 8px between messages
- **Timestamp spacing:** 4px above message
- **Avatar to content:** 12px gap
- **Input field padding:** 16px all sides

**Rationale:** Conversational interfaces need tighter spacing to feel natural. Generous input padding makes typing easier.

### Family Portal (Web)

**Goal:** Calm, trustworthy, accessible

- **Content max-width:** 720px (optimal reading length)
- **Section spacing:** 48px vertical
- **Card padding:** 24px all sides
- **Paragraph spacing:** 16px between blocks

**Rationale:** Families need reassurance, not density. Generous spacing creates a calm, professional experience.

---

## Component-Specific Guidelines

### Buttons & Actions

```
Primary Button:
- Padding: 16px horizontal, 16px vertical (48px min height)
- Icon spacing: 8px from text
- Minimum width: 120px

Secondary Button:
- Padding: 12px horizontal, 12px vertical (44px min height)
- Icon spacing: 8px from text

Icon-Only Button:
- Size: 48px × 48px (touch-comfortable)
- Icon: 24px centered
```

### Form Fields

```
Text Input:
- Padding: 16px horizontal, 16px vertical
- Label spacing: 8px above field
- Helper text: 4px below field
- Error message: 4px below field (replaces helper)

Field Groups:
- Between fields: 20px vertical
- Between sections: 32px vertical
- Inline fields: 12px horizontal gap
```

### Cards & Containers

```
Card:
- Padding: 16px all sides (mobile), 24px (tablet+)
- Between cards: 16px vertical
- Card to screen edge: 16px

Modal/Sheet:
- Padding: 24px all sides
- Header spacing: 16px below
- Footer spacing: 16px above
- Content spacing: 20px between elements
```

### Navigation

```
Bottom Tab Bar:
- Height: 56px + safe area
- Icon size: 24px
- Label spacing: 4px above text
- Active indicator: 2px height, 0px from bottom

Top Navigation:
- Height: 56px + safe area
- Side padding: 16px
- Title to icon: 16px
- Action buttons: 48px × 48px
```

---

## Responsive Behavior

### Breakpoints

```
mobile:   < 768px   // Primary target - optimize here first
tablet:   768-1024px // Secondary - more breathing room
desktop:  > 1024px   // Family portal only
```

### Scaling Strategy

**Mobile → Tablet:**

- Increase card padding: 16px → 24px
- Increase screen margins: 16px → 24px
- Maintain touch targets (don't shrink)
- Add horizontal spacing in forms (single → two-column)

**Tablet → Desktop (Family Portal Only):**

- Increase section spacing: 32px → 48px
- Increase card padding: 24px → 32px
- Max content width: 720px (centered)
- Generous side margins: 48px minimum

**Never scale down touch targets.** If space is limited, reduce quantity of elements, not their size.

---

## Implementation

### CSS Custom Properties

```css
:root {
  /* Core Scale */
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

  /* Semantic Spacing */
  --space-screen-margin: 16px;
  --space-card-padding: 16px;
  --space-form-field-gap: 20px;
  --space-section-gap: 32px;

  /* Responsive Overrides */
  @media (min-width: 768px) {
    --space-screen-margin: 24px;
    --space-card-padding: 24px;
  }

  @media (min-width: 1024px) {
    --space-screen-margin: 48px;
    --space-card-padding: 32px;
    --space-section-gap: 48px;
  }
}
```

### React Native / iOS / Android

```javascript
// tokens/spacing.js
export const spacing = {
  '2xs': 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,

  // Touch targets
  touchMin: 48,
  touchComfortable: 56,
  touchPrimary: 64,

  // Semantic
  screenMargin: 16,
  cardPadding: 16,
  formFieldGap: 20,
  sectionGap: 32,
};
```

---

## Accessibility Considerations

### WCAG 2.1 Compliance

- **Touch target minimum:** 48px × 48px (Level AAA: 44px, we exceed)
- **Text spacing:** Minimum 0.5em between paragraphs
- **Focus indicators:** 2px offset from element edge
- **Scroll padding:** 16px top (for sticky headers)

### Cognitive Accessibility

- **Consistent spacing patterns** reduce cognitive load
- **Generous whitespace** helps users with attention difficulties
- **Clear visual grouping** through spacing hierarchy
- **Predictable layouts** across all screens

### Motor Accessibility

- **Large touch targets** accommodate tremors and limited dexterity
- **Spacing between interactive elements** prevents accidental taps
- **Bottom-sheet actions** easier to reach than top navigation
- **Swipe zones** minimum 48px height

---

## Design Principles in Practice

### "Simplicity is the ultimate sophistication"

Every spacing decision removes complexity. We don't add space for decoration - we add it to create clarity.

### "If users need a manual, the design has failed"

Spacing creates intuitive hierarchy. Primary actions are obviously primary. Sections are obviously separate. No explanation needed.

### "Eliminate unnecessary buttons, features, and complexity"

Generous spacing makes fewer elements feel complete. We'd rather have 5 well-spaced actions than 10 cramped ones.

### "The best interface is no interface"

Space makes technology invisible. Users focus on their patients, not our layout.

### "Perfection in details matters"

Every 4px matters. The difference between 16px and 20px field spacing affects documentation speed across thousands of visits.

---

## Testing & Validation

### Before Launch

- [ ] Test all touch targets with gloves (latex and nitrile)
- [ ] Validate one-handed thumb reach on iPhone SE and Pixel 5
- [ ] Verify spacing consistency across iOS and Android
- [ ] Test with screen readers (spacing affects reading flow)
- [ ] Validate in bright sunlight (spacing affects scannability)

### Ongoing Metrics

- **Mis-tap rate:** Track accidental button presses
- **Scroll depth:** Measure if spacing causes excessive scrolling
- **Task completion time:** Spacing should reduce, not increase, time
- **User feedback:** "Too cramped" or "too much scrolling" signals

---

## When to Break the Rules

Rules exist to serve users, not constrain design.

**Break the 8px grid when:**

- Optical alignment requires 1-2px adjustments
- Platform conventions demand different spacing (iOS 15pt vs Android 16dp)
- Accessibility requires larger touch targets
- User testing shows a specific spacing improves task completion

**Never break:**

- Minimum 48px touch targets
- Consistent spacing within a component type
- Responsive scaling principles

---

**Remember:** Space is not empty. It's the canvas that makes content visible. When in doubt, add more space - then remove elements until the design breathes.
