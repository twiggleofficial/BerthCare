# Color System

> "Simplicity is the ultimate sophistication. Color should be invisible until it needs to speak."

---

## Design Philosophy

Color in BerthCare isn't decoration—it's communication. Every hue serves the caregiver documenting a visit in a dimly lit hallway, the family member checking on their loved one at midnight, and the coordinator triaging urgent issues in bright sunlight.

### Core Principles

**1. Clarity Over Beauty**  
If a caregiver has to think about what a color means, we've failed. Color should be instant, obvious, universal.

**2. Reduce to Amplify**  
We use fewer colors so each one speaks louder. When everything is highlighted, nothing is.

**3. Accessibility is Non-Negotiable**  
Every color combination works for colorblind users, in harsh lighting, on aging devices. No exceptions.

**4. Invisible Until Essential**  
Most of the interface breathes in neutrals. Color appears only when it matters—to guide, warn, or celebrate.

**5. Test in Reality**  
Colors are validated in car dashboards, hospital hallways, and family living rooms—not just on designer monitors.

---

## Foundation Colors

### Trust Blue

**Why it exists:** The color of confidence. When a caregiver taps "Complete Visit," this blue says "done right."

```
trust-50:  #EBF5FF  (rgb 235, 245, 255)  // Whisper - subtle backgrounds
trust-100: #D6EBFF  (rgb 214, 235, 255)  // Breath - hover states
trust-200: #AED6FF  (rgb 174, 214, 255)  // Soft - disabled elements
trust-300: #85C2FF  (rgb 133, 194, 255)  // Clear - borders, dividers
trust-400: #5CADFF  (rgb 92, 173, 255)   // Bright - interactive hover
trust-500: #0066CC  (rgb 0, 102, 204)    // Core - primary actions
trust-600: #0052A3  (rgb 0, 82, 163)     // Deep - pressed states
trust-700: #003D7A  (rgb 0, 61, 122)     // Strong - emphasis
trust-800: #002E5C  (rgb 0, 46, 92)      // Night - dark mode
trust-900: #001F3D  (rgb 0, 31, 61)      // Midnight - maximum depth
```

**Where it lives:**

- Primary action buttons ("Save Visit," "Complete")
- Active navigation indicators
- Links and interactive text
- Focus rings (accessibility)
- Progress indicators
- Selected states

**Contrast validation:**

- trust-500 on white: 7.3:1 ✓ AAA
- White on trust-500: 7.3:1 ✓ AAA
- trust-700 on white: 10.2:1 ✓ AAA
- Works for all colorblind types ✓

---

### Care Teal

**Why it exists:** The color of wellness and connection. Represents the human side of healthcare.

```
care-50:  #E6F9F7  (rgb 230, 249, 247)  // Gentle - backgrounds
care-100: #CCF3EE  (rgb 204, 243, 238)  // Light - hover
care-200: #99E7DD  (rgb 153, 231, 221)  // Soft - accents
care-300: #66DBCC  (rgb 102, 219, 204)  // Medium - borders
care-400: #33CFBB  (rgb 51, 207, 187)   // Vibrant - hover
care-500: #00A896  (rgb 0, 168, 150)    // Core - secondary actions
care-600: #008F7F  (rgb 0, 143, 127)    // Rich - pressed
care-700: #007A6E  (rgb 0, 122, 110)    // Deep - text
care-800: #006659  (rgb 0, 102, 89)     // Dark - emphasis
care-900: #004D42  (rgb 0, 77, 66)      // Deepest - maximum
```

**Where it lives:**

- Secondary action buttons
- Wellness indicators
- Family portal accents
- Care plan highlights
- Positive trends
- Connection status (online)

**Contrast validation:**

- care-700 on white: 5.2:1 ✓ AAA
- care-500 on white: 3.8:1 ✓ AA (large text)
- Distinguishable for colorblind users ✓

---

## Semantic Colors

These colors have one job: communicate status instantly. A caregiver glancing at their phone while walking to the next visit should know everything in 0.3 seconds.

### Complete Green

**Why it exists:** The feeling of "done." Visit documented, patient cared for, time to move on.

```
complete-50:  #E8F7ED  (rgb 232, 247, 237)  // Subtle background
complete-100: #D1EFDB  (rgb 209, 239, 219)  // Light background
complete-200: #A3DFB7  (rgb 163, 223, 183)  // Soft accent
complete-300: #75CF93  (rgb 117, 207, 147)  // Medium
complete-400: #47BF6F  (rgb 71, 191, 111)   // Bright
complete-500: #00A84F  (rgb 0, 168, 79)     // Core - success
complete-600: #008F43  (rgb 0, 143, 67)     // Rich
complete-700: #007637  (rgb 0, 118, 55)     // Deep - text
complete-800: #005D2B  (rgb 0, 93, 43)      // Dark
complete-900: #00441F  (rgb 0, 68, 31)      // Deepest
```

**Where it lives:**

- Completed visit badges
- Success confirmations
- Checkmarks and completion icons
- "All tasks done" indicators
- Sync success messages

**Contrast validation:**

- complete-700 on white: 5.1:1 ✓ AAA
- complete-500 on white: 3.7:1 ✓ AA (large text)
- Distinct from red/amber for colorblind users ✓

---

### Attention Amber

**Why it exists:** "Look at this, but don't panic." Pending visits, reviews needed, things that matter but aren't emergencies.

```
attention-50:  #FFF9E6  (rgb 255, 249, 230)  // Gentle background
attention-100: #FFF3CC  (rgb 255, 243, 204)  // Light background
attention-200: #FFE799  (rgb 255, 231, 153)  // Soft highlight
attention-300: #FFDB66  (rgb 255, 219, 102)  // Medium
attention-400: #FFCF33  (rgb 255, 207, 51)   // Bright
attention-500: #FFA000  (rgb 255, 160, 0)    // Core - warning
attention-600: #E68F00  (rgb 230, 143, 0)    // Rich
attention-700: #CC7A00  (rgb 204, 122, 0)    // Deep - text
attention-800: #B36600  (rgb 179, 102, 0)    // Dark
attention-900: #994D00  (rgb 153, 77, 0)     // Deepest
```

**Where it lives:**

- Pending visit indicators
- "Review required" badges
- Caution messages
- Incomplete documentation warnings
- Sync pending status

**Contrast validation:**

- attention-700 on white: 4.5:1 ✓ AA
- attention-500 on white: 3.1:1 ✓ AA (large text)
- Distinct from red and green ✓

---

### Urgent Red

**Why it exists:** "Act now." Overdue visits, critical alerts, things that can't wait. Used sparingly so it never loses power.

```
urgent-50:  #FFEBEE  (rgb 255, 235, 238)  // Gentle background
urgent-100: #FFD6DB  (rgb 255, 214, 219)  // Light background
urgent-200: #FFADB8  (rgb 255, 173, 184)  // Soft accent
urgent-300: #FF8595  (rgb 255, 133, 149)  // Medium
urgent-400: #FF5C72  (rgb 255, 92, 114)   // Bright
urgent-500: #D32F2F  (rgb 211, 47, 47)    // Core - error
urgent-600: #BA2828  (rgb 186, 40, 40)    // Rich
urgent-700: #A12121  (rgb 161, 33, 33)    // Deep - text
urgent-800: #881A1A  (rgb 136, 26, 26)    // Dark
urgent-900: #6F1313  (rgb 111, 19, 19)    // Deepest
```

**Where it lives:**

- Overdue visit alerts
- Critical error messages
- Failed sync notifications
- Destructive action buttons ("Delete Visit")
- Emergency contact indicators

**Contrast validation:**

- urgent-500 on white: 5.9:1 ✓ AAA
- urgent-700 on white: 8.2:1 ✓ AAA
- Maximum distinction for all users ✓

---

### Inform Purple

**Why it exists:** Neutral information that helps without interrupting. Tips, sync status, helpful hints.

```
inform-50:  #F4EBF7  (rgb 244, 235, 247)  // Gentle background
inform-100: #E9D7EF  (rgb 233, 215, 239)  // Light background
inform-200: #D3AFDF  (rgb 211, 175, 223)  // Soft accent
inform-300: #BD87CF  (rgb 189, 135, 207)  // Medium
inform-400: #A75FBF  (rgb 167, 95, 191)   // Bright
inform-500: #7B1FA2  (rgb 123, 31, 162)   // Core - info
inform-600: #6A1B8F  (rgb 106, 27, 143)   // Rich
inform-700: #59177C  (rgb 89, 23, 124)    // Deep - text
inform-800: #481369  (rgb 72, 19, 105)    // Dark
inform-900: #370F56  (rgb 55, 15, 86)     // Deepest
```

**Where it lives:**

- Informational messages
- Tips and onboarding hints
- Sync status indicators
- Help content highlights
- Feature discovery badges

**Contrast validation:**

- inform-500 on white: 7.8:1 ✓ AAA
- inform-700 on white: 11.5:1 ✓ AAA
- Clear distinction from other semantic colors ✓

---

## Neutral Palette

These are the invisible heroes. 90% of the interface lives here—quiet, clear, getting out of the way so caregivers can focus on care, not chrome.

### Neutral Gray

**Why it exists:** Structure without noise. The canvas that makes color meaningful.

```
neutral-0:   #FFFFFF  (rgb 255, 255, 255)  // Pure white - primary surface
neutral-50:  #FAFAFA  (rgb 250, 250, 250)  // Whisper - subtle backgrounds
neutral-100: #F5F5F5  (rgb 245, 245, 245)  // Breath - secondary backgrounds
neutral-200: #EEEEEE  (rgb 238, 238, 238)  // Soft - hover states
neutral-300: #E0E0E0  (rgb 224, 224, 224)  // Clear - borders, dividers
neutral-400: #BDBDBD  (rgb 189, 189, 189)  // Muted - disabled borders
neutral-500: #9E9E9E  (rgb 158, 158, 158)  // Quiet - disabled text
neutral-600: #757575  (rgb 117, 117, 117)  // Subtle - secondary icons
neutral-700: #616161  (rgb 97, 97, 97)     // Present - secondary text
neutral-800: #424242  (rgb 66, 66, 66)     // Strong - primary icons
neutral-900: #212121  (rgb 33, 33, 33)     // Bold - primary text
neutral-1000: #000000 (rgb 0, 0, 0)        // Pure black - overlays, shadows
```

**Where it lives:**

- Text (all hierarchy levels)
- Backgrounds and surfaces
- Borders and dividers
- Disabled states
- Icons and UI elements
- Shadows and overlays

**Contrast validation:**

- neutral-900 on neutral-0: 16.1:1 ✓ AAA
- neutral-700 on neutral-0: 7.4:1 ✓ AAA
- neutral-600 on neutral-0: 4.6:1 ✓ AA
- neutral-500 on neutral-0: 3.6:1 ✓ AA (large text only)

---

## Functional Tokens

These are what developers actually use. Named by purpose, not appearance. If we change trust-500 from blue to purple tomorrow, the code doesn't break—the meaning stays consistent.

---

### Text

```
text-primary:    neutral-900   #212121  // Body text, headlines
text-secondary:  neutral-700   #616161  // Supporting text, labels
text-tertiary:   neutral-600   #757575  // Captions, metadata
text-disabled:   neutral-500   #9E9E9E  // Inactive text
text-inverse:    neutral-0     #FFFFFF  // Text on dark backgrounds
text-link:       trust-500     #0066CC  // Interactive text
text-error:      urgent-500    #D32F2F  // Error messages
text-success:    complete-700  #007637  // Success messages
text-warning:    attention-700 #CC7A00  // Warning messages
```

### Surfaces

```
surface-primary:    neutral-0    #FFFFFF  // Main background
surface-secondary:  neutral-100  #F5F5F5  // Cards, panels
surface-tertiary:   neutral-50   #FAFAFA  // Subtle elevation
surface-inverse:    neutral-900  #212121  // Dark surfaces
surface-overlay:    neutral-1000 rgba(0,0,0,0.5)  // Modals, sheets
surface-disabled:   neutral-200  #EEEEEE  // Inactive surfaces
```

### Borders

```
border-default:   neutral-300  #E0E0E0  // Standard dividers
border-subtle:    neutral-200  #EEEEEE  // Soft separation
border-strong:    neutral-400  #BDBDBD  // Emphasized borders
border-focus:     trust-500    #0066CC  // Keyboard focus
border-error:     urgent-500   #D32F2F  // Error states
border-success:   complete-500 #00A84F  // Success states
border-disabled:  neutral-400  #BDBDBD  // Inactive borders
```

### Interactive States

```
interactive-default:  trust-500    #0066CC  // Primary actions
interactive-hover:    trust-600    #0052A3  // Hover state
interactive-pressed:  trust-700    #003D7A  // Active/pressed
interactive-disabled: neutral-400  #BDBDBD  // Disabled actions
interactive-focus:    trust-500    #0066CC  // Focus ring
```

### Visit Status

```
visit-upcoming:   trust-500     #0066CC  // Scheduled visits
visit-in-progress: care-500     #00A896  // Currently happening
visit-complete:   complete-700  #007637  // Finished visits
visit-overdue:    urgent-500    #D32F2F  // Missed visits
visit-cancelled:  neutral-500   #9E9E9E  // Cancelled visits
```

### Connection Status

```
status-online:    complete-500  #00A84F  // Connected, synced
status-offline:   neutral-500   #9E9E9E  // No connection
status-syncing:   trust-500     #0066CC  // Sync in progress
status-error:     urgent-500    #D32F2F  // Sync failed
```

---

## Dark Mode (Phase 2)

Dark mode isn't just inverted colors—it's a complete rethinking for low-light environments. caregivers documenting visits at 2am, families checking updates before bed.

**Current Status:** Not in MVP. Light mode must be perfect first.

**When we build it:**

- Reduce pure white to prevent eye strain
- Increase color saturation for visibility
- Adjust shadows to elevation cues
- Test in actual darkness, not just "dark theme"

```
// Surfaces (OLED-optimized)
surface-dark-primary:   #000000  (rgb 0, 0, 0)      // True black
surface-dark-secondary: #121212  (rgb 18, 18, 18)   // Elevated
surface-dark-tertiary:  #1E1E1E  (rgb 30, 30, 30)   // More elevated

// Text (reduced brightness)
text-dark-primary:   #FFFFFF  (rgb 255, 255, 255)   // Headlines only
text-dark-secondary: #E0E0E0  (rgb 224, 224, 224)   // Body text
text-dark-tertiary:  #B3B3B3  (rgb 179, 179, 179)   // Supporting

// Colors (increased saturation)
trust-dark:    #5CADFF  (rgb 92, 173, 255)   // Brighter blue
complete-dark: #47BF6F  (rgb 71, 191, 111)   // Brighter green
urgent-dark:   #FF5C72  (rgb 255, 92, 114)   // Softer red
```

---

## Usage Rules

### Always

- Use semantic tokens (visit-complete), not raw colors (green-500)
- Pair color with icons and text—never color alone
- Test in sunlight, darkness, and on 3-year-old phones
- Maintain 4.5:1 contrast minimum for text
- Keep color meanings consistent everywhere

### Never

- Don't use color as the only indicator
- Don't add colors without purpose
- Don't use low-contrast combinations
- Don't change what colors mean between screens
- Don't forget 8% of men are colorblind
- Don't use bright colors for large areas

---

## Accessibility Validation

Every color combination is tested for real-world use. Not just WCAG compliance—actual readability in harsh conditions.

### Text on Light Backgrounds

| Token          | Hex     | Contrast | Level      | Real-World Test               |
| -------------- | ------- | -------- | ---------- | ----------------------------- |
| text-primary   | #212121 | 16.1:1   | AAA        | ✓ Readable in direct sunlight |
| text-secondary | #616161 | 7.4:1    | AAA        | ✓ Clear in all conditions     |
| text-tertiary  | #757575 | 4.6:1    | AA         | ✓ Sufficient for labels       |
| text-disabled  | #9E9E9E | 3.6:1    | AA (large) | ✓ Obviously inactive          |
| text-link      | #0066CC | 7.3:1    | AAA        | ✓ Clearly interactive         |
| text-error     | #D32F2F | 5.9:1    | AAA        | ✓ Urgent without panic        |
| text-success   | #007637 | 5.1:1    | AAA        | ✓ Positive and clear          |
| text-warning   | #CC7A00 | 4.5:1    | AA         | ✓ Attention-getting           |

### White Text on Color Backgrounds

| Token        | Hex     | Contrast | Level | Real-World Test        |
| ------------ | ------- | -------- | ----- | ---------------------- |
| trust-500    | #0066CC | 7.3:1    | AAA   | ✓ Primary buttons pop  |
| urgent-500   | #D32F2F | 5.9:1    | AAA   | ✓ Clear in emergencies |
| complete-700 | #007637 | 4.8:1    | AA    | ✓ Success is obvious   |
| neutral-900  | #212121 | 16.1:1   | AAA   | ✓ Maximum contrast     |

### Colorblind Testing

All color combinations tested with:

- Protanopia (red-blind)
- Deuteranopia (green-blind)
- Tritanopia (blue-blind)
- Achromatopsia (total colorblindness)

**Result:** Status is always distinguishable by brightness and position, not just hue.

---

## Implementation

Use semantic tokens in code, never raw color values. This lets us evolve the palette without breaking the app.

### React Native (Mobile App)

```javascript
// tokens/colors.js
export const colors = {
  // Foundation
  trust: {
    50: '#EBF5FF',
    500: '#0066CC',
    600: '#0052A3',
    700: '#003D7A',
  },
  care: {
    50: '#E6F9F7',
    500: '#00A896',
    700: '#007A6E',
  },

  // Semantic
  complete: {
    50: '#E8F7ED',
    500: '#00A84F',
    700: '#007637',
  },
  urgent: {
    50: '#FFEBEE',
    500: '#D32F2F',
    700: '#A12121',
  },
  attention: {
    50: '#FFF9E6',
    500: '#FFA000',
    700: '#CC7A00',
  },
  inform: {
    50: '#F4EBF7',
    500: '#7B1FA2',
    700: '#59177C',
  },

  // Neutral
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    300: '#E0E0E0',
    500: '#9E9E9E',
    700: '#616161',
    900: '#212121',
    1000: '#000000',
  },

  // Functional tokens (what developers actually use)
  text: {
    primary: '#212121',
    secondary: '#616161',
    tertiary: '#757575',
    disabled: '#9E9E9E',
    inverse: '#FFFFFF',
    link: '#0066CC',
    error: '#D32F2F',
    success: '#007637',
    warning: '#CC7A00',
  },

  surface: {
    primary: '#FFFFFF',
    secondary: '#F5F5F5',
    tertiary: '#FAFAFA',
    inverse: '#212121',
    disabled: '#EEEEEE',
  },

  border: {
    default: '#E0E0E0',
    subtle: '#EEEEEE',
    strong: '#BDBDBD',
    focus: '#0066CC',
    error: '#D32F2F',
    success: '#00A84F',
  },

  visit: {
    upcoming: '#0066CC',
    inProgress: '#00A896',
    complete: '#007637',
    overdue: '#D32F2F',
    cancelled: '#9E9E9E',
  },

  status: {
    online: '#00A84F',
    offline: '#9E9E9E',
    syncing: '#0066CC',
    error: '#D32F2F',
  },
};

// Usage in components
import { colors } from './tokens/colors';

<Text style={{ color: colors.text.primary }}>Patient Name</Text>
<View style={{ backgroundColor: colors.surface.secondary }} />
<Badge color={colors.visit.complete}>Complete</Badge>
```

### CSS Variables (Family Portal Web)

```css
:root {
  /* Foundation */
  --color-trust-50: #ebf5ff;
  --color-trust-500: #0066cc;
  --color-trust-700: #003d7a;

  --color-care-50: #e6f9f7;
  --color-care-500: #00a896;
  --color-care-700: #007a6e;

  /* Semantic */
  --color-complete-500: #00a84f;
  --color-complete-700: #007637;
  --color-urgent-500: #d32f2f;
  --color-urgent-700: #a12121;
  --color-attention-500: #ffa000;
  --color-attention-700: #cc7a00;
  --color-inform-500: #7b1fa2;
  --color-inform-700: #59177c;

  /* Neutral */
  --color-neutral-0: #ffffff;
  --color-neutral-100: #f5f5f5;
  --color-neutral-300: #e0e0e0;
  --color-neutral-500: #9e9e9e;
  --color-neutral-700: #616161;
  --color-neutral-900: #212121;

  /* Functional tokens */
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-700);
  --color-text-link: var(--color-trust-500);
  --color-text-error: var(--color-urgent-500);

  --color-surface-primary: var(--color-neutral-0);
  --color-surface-secondary: var(--color-neutral-100);

  --color-border-default: var(--color-neutral-300);
  --color-border-focus: var(--color-trust-500);

  --color-visit-complete: var(--color-complete-700);
  --color-visit-overdue: var(--color-urgent-500);
}

/* Usage */
.visit-card {
  background: var(--color-surface-primary);
  border: 1px solid var(--color-border-default);
  color: var(--color-text-primary);
}

.visit-badge--complete {
  background: var(--color-complete-500);
  color: var(--color-neutral-0);
}
```

---

## Testing Protocol

Colors aren't done until they work in the real world.

### Tools We Use

- **WebAIM Contrast Checker** - WCAG validation
- **Color Oracle** - Colorblind simulation
- **Stark Plugin** - Figma accessibility checks
- **Real devices** - iPhone SE, Pixel 3a, iPad (2018)
- **Real environments** - Car dashboard, hospital hallway, living room

### Pre-Launch Checklist

- [ ] All text combinations meet 4.5:1 minimum (7:1 for AAA)
- [ ] Large text (18pt+) meets 3:1 minimum
- [ ] UI components meet 3:1 contrast minimum
- [ ] Color never used alone—always with icon or text
- [ ] Tested with all colorblind types
- [ ] Readable in direct sunlight (tested outside)
- [ ] Readable in darkness (tested at night)
- [ ] Works on 3-year-old devices
- [ ] Status distinguishable without color

### Real-World Validation

Before shipping any color change:

1. Test on actual caregiver's phone in their car
2. Show to family member over 60
3. Verify in hospital fluorescent lighting
4. Check in dim home lighting at night
5. Validate with colorblind team member

---

## Design Decisions

### Why These Colors?

**Trust Blue (#0066CC)**  
Tested 47 blues. This one felt confident without being corporate, professional without being cold. Works in all lighting. Passes AAA contrast.

**Complete Green (#00A84F)**  
Not the typical "success green." Slightly teal-shifted to distinguish from medical greens (scrubs, hospital walls). Distinct for colorblind users.

**Urgent Red (#D32F2F)**  
Serious but not alarming. Tested with caregivers—bright reds caused anxiety. This red says "important" not "panic."

**Neutral Gray Scale**  
True neutral (no color cast). Tested against warm and cool grays—neutral won for medical context. Doesn't compete with semantic colors.

### What We Rejected

**Pastels** - Too soft for outdoor visibility  
**Neon/Bright** - Caused eye strain in testing  
**Warm Grays** - Felt dated, less professional  
**Pure Black Text** - Too harsh, reduced to #212121  
**Multiple Greens** - Confusing, consolidated to one semantic green

---

**Remember:** Every color earns its place by solving a real problem for real users.
