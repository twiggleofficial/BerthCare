# Typography System

**Philosophy:** If a caregiver can't read it while walking between rooms, it's too small. If they need to squint in bright sunlight or dim hallways, we've failed.

Typography is invisible when it works. It should never make you think—just read, understand, act.

---

## Font Stack

### Primary Font Family

```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
```

**Why system fonts:**

- Instant load (0ms)
- Familiar to every user
- Optimized for their device
- Free
- Battle-tested readability

### Platform-Specific

- **iOS:** SF Pro (automatic)
- **Android:** Roboto (automatic)
- **Windows:** Segoe UI (automatic)
- **Web:** System default

**No custom fonts.** System fonts are perfect. Don't fix what isn't broken.

---

## Font Weights

We use three weights. That's it.

```
regular:  400  // Everything
semibold: 600  // Emphasis
bold:     700  // Critical information only
```

**Why only three:**

- Fewer choices = faster decisions
- Clear hierarchy without thinking
- Better performance
- Easier to maintain

**Usage:**

- **Regular (400):** Body text, descriptions, labels, captions—everything by default
- **Semibold (600):** Buttons, subheadings, important but not critical
- **Bold (700):** Page titles, alerts, critical patient information

**Never use:**

- Thin, light, or extralight (unreadable on mobile)
- Extrabold or black (aggressive, hard to read)

---

## Type Scale

**Base:** 17px—not 16px. One pixel makes a difference.

### Universal Scale (All Devices)

| Token     | Size | Line Height | Weight         | Use Case                             |
| --------- | ---- | ----------- | -------------- | ------------------------------------ |
| `title`   | 28px | 36px (1.29) | Bold (700)     | Page titles only                     |
| `heading` | 20px | 28px (1.4)  | Semibold (600) | Section headers, card titles         |
| `body`    | 17px | 26px (1.53) | Regular (400)  | Everything—default text              |
| `small`   | 15px | 22px (1.47) | Regular (400)  | Metadata, timestamps, secondary info |
| `button`  | 17px | 24px (1.41) | Semibold (600) | All interactive elements             |

**No mobile/desktop split.** One scale. Works everywhere.

**Why 17px base:**

- iOS default is 17px (not 16px)
- More readable at arm's length
- Better for aging eyes
- caregivers work in motion—every pixel counts

**Why so few sizes:**

- Five sizes is enough
- Fewer decisions = faster design
- Easier to maintain consistency
- Forces simplicity

---

## Design Tokens

```css
/* Font family */
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

/* Sizes */
--font-size-title: 28px;
--font-size-heading: 20px;
--font-size-body: 17px;
--font-size-small: 15px;
--font-size-button: 17px;

/* Weights */
--font-weight-regular: 400;
--font-weight-semibold: 600;
--font-weight-bold: 700;

/* Line heights */
--line-height-title: 36px;
--line-height-heading: 28px;
--line-height-body: 26px;
--line-height-small: 22px;
--line-height-button: 24px;

/* Letter spacing */
--letter-spacing-title: -0.5px;
--letter-spacing-default: 0;
```

**That's it.** No more tokens needed.

---

## Line Height

**Rule:** 1.5x minimum for body text. Always.

### Guidelines

- **Title:** 1.29 (tight for impact)
- **Heading:** 1.4 (balanced)
- **Body:** 1.53 (generous—this is where people read)
- **Small:** 1.47 (still comfortable)
- **Button:** 1.41 (centered, balanced)

**Why generous line height:**

- caregivers read while walking
- Poor lighting conditions (hallways, patient homes)
- Reduces eye strain during 8-hour shifts
- Better for aging eyes
- Easier to scan quickly

**Never:**

- Line height below 1.2 for anything
- Line height below 1.5 for body text
- Tight line height for long-form content

---

## Letter Spacing

**Default:** 0 (system default is perfect)

**Only one exception:**

- **Title:** -0.5px (slightly tighter for large text)

**Everything else:** 0

**Why:**

- System defaults are optimized
- Adjusting letter spacing rarely improves readability
- Adds complexity for minimal gain
- Can break on different devices

**Never:**

- Negative letter spacing on body text
- Positive letter spacing on buttons (makes them harder to read)
- All caps with tight spacing (unreadable)

---

## Text Styles

### Emphasis

```css
/* Normal emphasis */
font-weight: 600; /* Semibold */

/* Critical emphasis (alerts, warnings) */
font-weight: 700; /* Bold */
color: error-600;
```

**Never use italic.** It's harder to read on screens, especially in motion.

### De-emphasis

```css
/* Secondary text */
color: gray-600;
font-size: 15px; /* Small size */

/* Disabled text */
color: gray-400;
opacity: 0.5;
```

### Links

```css
color: primary-600;
text-decoration: underline;
font-weight: 400; /* Regular */

/* Pressed */
color: primary-700;
```

**No hover states.** This is a mobile app. Touch, not hover.

---

## Text Alignment

**Default:** Left-align everything.

**Exceptions:**

- Modal titles: Center
- Empty states: Center
- Button text: Center

**Never:**

- Right-align (confusing for most users)
- Justify (creates rivers of whitespace, hard to read)
- Center-align body text (hard to scan)

**Why left-align:**

- Fastest to read
- Easiest to scan
- Most familiar
- Works for all content lengths

---

## Text Truncation

**Avoid truncation.** Show the full text whenever possible.

### When you must truncate:

**Single line:**

```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
```

**Use only for:**

- Patient names in tight lists
- Addresses in compact views

**Multi-line (2 lines max):**

```css
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
```

**Use only for:**

- Note previews in lists
- Message previews

**Better solution:** Expand the container. Don't hide information from caregivers.

---

## Implementation

### CSS (Web/Family Portal)

```css
:root {
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

  --font-size-title: 28px;
  --font-size-heading: 20px;
  --font-size-body: 17px;
  --font-size-small: 15px;

  --font-weight-regular: 400;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  --line-height-title: 36px;
  --line-height-heading: 28px;
  --line-height-body: 26px;
  --line-height-small: 22px;
}

.title {
  font-size: var(--font-size-title);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-title);
  letter-spacing: -0.5px;
}

.heading {
  font-size: var(--font-size-heading);
  font-weight: var(--font-weight-semibold);
  line-height: var(--line-height-heading);
}

.body {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  line-height: var(--line-height-body);
}
```

### React Native (Mobile App)

```javascript
export const typography = {
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
  },
  body: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
  },
  small: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
  },
  button: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
  },
};

// Usage
<Text style={typography.body}>Patient notes go here</Text>;
```

### Swift (iOS)

```swift
extension Font {
  static let title = Font.system(size: 28, weight: .bold)
  static let heading = Font.system(size: 20, weight: .semibold)
  static let body = Font.system(size: 17, weight: .regular)
  static let small = Font.system(size: 15, weight: .regular)
  static let button = Font.system(size: 17, weight: .semibold)
}

// Usage
Text("Visit Complete")
  .font(.title)
```

### Kotlin (Android)

```xml
<!-- res/values/styles.xml -->
<style name="TextAppearance.Title">
  <item name="android:textSize">28sp</item>
  <item name="android:fontFamily">sans-serif</item>
  <item name="android:textStyle">bold</item>
  <item name="android:lineSpacingExtra">8sp</item>
</style>

<style name="TextAppearance.Body">
  <item name="android:textSize">17sp</item>
  <item name="android:fontFamily">sans-serif</item>
  <item name="android:lineSpacingExtra">9sp</item>
</style>
```

---

## Responsive Typography

**No breakpoints.** Same sizes everywhere.

**Why:**

- Mobile is the primary device
- caregivers don't use desktops in the field
- One scale = simpler code
- Consistency across devices

### User Preferences

```css
/* Respect system text size */
font-size: 1rem; /* Scales with user settings */

/* Support Dynamic Type (iOS) */
font: -apple-system-body;

/* Support font scaling (Android) */
/* Automatic with sp units */
```

**Always respect user preferences.** If they set large text, honor it.

---

## Accessibility

### Minimum Sizes

- **Body text:** 17px (our base)
- **Small text:** 15px (never smaller)
- **No text below 15px** (period)

### Contrast Requirements

- **All text:** 4.5:1 minimum (WCAG AA)
- **Critical text:** 7:1 (WCAG AAA)
- **Test in sunlight** (not just on your desk)

### Scalability

- Use relative units (rem, em, sp)
- Support up to 200% text zoom
- Layout must not break at 200%
- No horizontal scrolling ever

### Screen Readers

- Semantic HTML always (h1, h2, p, button, etc.)
- Proper heading hierarchy (never skip levels)
- Descriptive labels (not "Click here")
- Test with VoiceOver (iOS) and TalkBack (Android)

### Real-World Testing

- Test with gloves on
- Test in bright sunlight
- Test in dim hallways
- Test while walking
- Test with tired eyes at end of shift

---

## Platform Adaptations

### iOS

```swift
// Use Dynamic Type
Text("Patient Name")
  .font(.body)  // Automatically scales with user settings

// Our custom styles
Text("Visit Complete")
  .font(.system(size: 17, weight: .regular))
```

**Dynamic Type Support:**

- Map our styles to iOS text styles
- Title → Large Title
- Heading → Headline
- Body → Body
- Small → Subheadline
- Button → Headline

### Android

```kotlin
// Use sp units (scales with user settings)
android:textSize="17sp"

// Our custom styles
<TextView
  android:textSize="17sp"
  android:fontFamily="sans-serif"
  android:textColor="@color/gray_900" />
```

**Material Design Adaptation:**

- Use our scale, not Material's
- But respect Material's spacing and layout
- Use sp units for all text sizes
- Support system font scaling

### Web (Family Portal)

```css
/* Use rem units */
font-size: 1.0625rem; /* 17px */

/* Respect user preferences */
@media (prefers-reduced-motion) {
  /* No animated text */
}
```

**We don't follow platform guidelines blindly.** We use what works for caregivers in the field.

---

## Usage Examples

### Page Title

```css
font-size: 28px;
font-weight: 700;
line-height: 36px;
letter-spacing: -0.5px;
color: gray-900;
```

**Use for:** Screen titles only (Visit Documentation, Patient Profile)

### Section Heading

```css
font-size: 20px;
font-weight: 600;
line-height: 28px;
color: gray-900;
margin-bottom: 12px;
```

**Use for:** Section headers, card titles (Vital Signs, Care Notes)

### Body Text

```css
font-size: 17px;
font-weight: 400;
line-height: 26px;
color: gray-900;
```

**Use for:** Everything—notes, descriptions, form fields, lists

### Small Text

```css
font-size: 15px;
font-weight: 400;
line-height: 22px;
color: gray-600;
```

**Use for:** Timestamps, metadata, helper text

### Button

```css
font-size: 17px;
font-weight: 600;
line-height: 24px;
text-align: center;
color: white;
```

**Use for:** All buttons, all interactive elements

---

## Testing Checklist

**Before shipping any text:**

- [ ] Readable at arm's length while standing
- [ ] Readable while walking
- [ ] Readable in bright sunlight (test outside)
- [ ] Readable in dim hallway lighting
- [ ] Readable with tired eyes (test at 5pm, not 9am)
- [ ] Works with gloves on (touch targets large enough)
- [ ] Minimum 17px for body text (15px for small text)
- [ ] Line height ≥ 1.5 for body text
- [ ] Contrast ≥ 4.5:1 (test with contrast checker)
- [ ] Works at 200% zoom (no horizontal scroll)
- [ ] Proper heading hierarchy (h1 → h2 → h3, no skipping)
- [ ] Screen reader announces correctly (test with VoiceOver/TalkBack)
- [ ] Respects system font size settings
- [ ] No truncation unless absolutely necessary
- [ ] No all-caps (harder to read)
- [ ] No italic (harder to read on screens)

**If it fails any test, fix it. No exceptions.**

---

## Implementation

### CSS

```css
:root {
  /* Font family */
  --font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;

  /* Sizes */
  --font-size-h1: 32px;
  --font-size-h2: 24px;
  --font-size-h3: 20px;
  --font-size-body-large: 18px;
  --font-size-body: 16px;
  --font-size-body-small: 14px;
  --font-size-caption: 12px;

  /* Weights */
  --font-weight-regular: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;

  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
}

.h1 {
  font-size: var(--font-size-h1);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}
```

### React Native

```javascript
export const typography = {
  h1: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.25,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
};
```

---

**Remember:** Typography is 95% of design. Get this right, and everything else falls into place.
