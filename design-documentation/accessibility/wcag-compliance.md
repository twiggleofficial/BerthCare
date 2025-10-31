# WCAG 2.1 AA Compliance Guide

**Target:** WCAG 2.1 Level AA compliance for all BerthCare interfaces  
**Rationale:** Ensure usability for all users, including those with disabilities

---

## Compliance Overview

### Success Criteria Summary

| Level   | Criteria Met | Criteria Total | Status       |
| ------- | ------------ | -------------- | ------------ |
| **A**   | TBD          | 30             | In Progress  |
| **AA**  | TBD          | 20             | In Progress  |
| **AAA** | TBD          | 28             | Aspirational |

---

## Perceivable

### 1.1 Text Alternatives

#### 1.1.1 Non-text Content (A)

**Requirement:** All non-text content has text alternative

**Implementation:**

- **Images:** Alt text describing content/function
- **Icons:** ARIA labels for meaning
- **Charts:** Text summary of data
- **Photos:** Description of clinical relevance

**Examples:**

```html
<!-- Client photo -->
<img src="client.jpg" alt="Margaret Thompson, 82 years old" />

<!-- Status icon -->
<svg aria-label="Visit completed successfully">...</svg>

<!-- Wound photo -->
<img src="wound.jpg" alt="Leg wound, 2cm diameter, moderate drainage, healing well" />
```

**Testing:**

- Turn off images, verify text alternatives
- Use screen reader, verify all content announced
- Check decorative images have empty alt=""

---

### 1.2 Time-based Media

#### 1.2.1 Audio-only and Video-only (A)

**Requirement:** Provide alternatives for audio/video content

**Implementation:**

- **Training videos:** Provide transcripts
- **Voice notes:** Automatic transcription
- **Video calls:** Closed captions option

**BerthCare Application:**

- Voice-to-text documentation includes text version
- Training materials have written guides
- Video tutorials have captions

---

### 1.3 Adaptable

#### 1.3.1 Info and Relationships (A)

**Requirement:** Information structure is programmatically determinable

**Implementation:**

- **Semantic HTML:** Use proper heading hierarchy (h1, h2, h3)
- **Form labels:** Associate labels with inputs
- **Lists:** Use ul/ol for lists
- **Tables:** Use proper table markup with headers

**Examples:**

```html
<!-- Proper heading hierarchy -->
<h1>Visit Documentation</h1>
<h2>Vital Signs</h2>
<h3>Blood Pressure</h3>

<!-- Form labels -->
<label for="bp-systolic">Systolic</label>
<input id="bp-systolic" type="number" />

<!-- Data table -->
<table>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">Blood Pressure</th>
    </tr>
  </thead>
  <tbody>
    ...
  </tbody>
</table>
```

#### 1.3.2 Meaningful Sequence (A)

**Requirement:** Content order makes sense when linearized

**Implementation:**

- **Reading order:** Matches visual order
- **Tab order:** Logical flow through interactive elements
- **Screen reader order:** Follows visual hierarchy

**Testing:**

- Navigate with Tab key, verify logical order
- Use screen reader, verify content makes sense
- Disable CSS, verify content order

#### 1.3.3 Sensory Characteristics (A)

**Requirement:** Don't rely solely on sensory characteristics

**Implementation:**

- **Not just color:** "Required fields marked with asterisk (\*) and red border"
- **Not just shape:** "Tap the circular blue button" → "Tap the Start Visit button"
- **Not just position:** "See below" → "See the Medication List section"

**Examples:**

```
❌ "Tap the red button to complete"
✅ "Tap the Complete Visit button (red)"

❌ "Fields on the right are optional"
✅ "Optional fields are marked with (optional)"

❌ "The round icon indicates status"
✅ "Status: Completed (green checkmark icon)"
```

#### 1.3.4 Orientation (AA)

**Requirement:** Content works in both portrait and landscape

**Implementation:**

- **Responsive design:** Adapts to orientation
- **No orientation lock:** Unless essential (e.g., signature)
- **Rotation support:** Content reflows appropriately

**BerthCare Application:**

- All screens work in both orientations
- Signature pad suggests landscape but allows portrait
- Forms adapt layout based on orientation

#### 1.3.5 Identify Input Purpose (AA)

**Requirement:** Input purpose can be programmatically determined

**Implementation:**

- **Autocomplete attributes:** Use HTML autocomplete
- **Input types:** Use appropriate input types
- **ARIA labels:** Describe input purpose

**Examples:**

```html
<input type="email" autocomplete="email" aria-label="Your email address" />

<input type="tel" autocomplete="tel" aria-label="Client phone number" />
```

---

### 1.4 Distinguishable

#### 1.4.1 Use of Color (A)

**Requirement:** Color is not the only visual means of conveying information

**Implementation:**

- **Status indicators:** Color + icon + text
- **Required fields:** Red border + asterisk + label
- **Errors:** Red color + icon + error message
- **Links:** Underline + color

**Examples:**

```
Visit Status:
✅ Completed (green checkmark + text)
⚠️ Pending (amber warning + text)
❌ Overdue (red X + text)

Required Field:
* Blood Pressure (red asterisk + red border + label)
```

#### 1.4.2 Audio Control (A)

**Requirement:** Provide controls for audio that plays automatically

**Implementation:**

- **No auto-play:** Audio never plays automatically
- **User control:** User initiates all audio
- **Volume control:** System volume controls work

**BerthCare Application:**

- Voice-to-text requires user tap to activate
- No background audio
- Notification sounds respect system settings

#### 1.4.3 Contrast (Minimum) (AA)

**Requirement:** 4.5:1 contrast for normal text, 3:1 for large text

**Implementation:**

- **Text colors:** All meet minimum contrast
- **UI components:** Borders and icons meet 3:1
- **States:** Hover/focus states maintain contrast

**Color Pairings:**

```
✅ Gray 900 (#212121) on White (#FFFFFF) = 16.1:1
✅ Gray 700 (#616161) on White (#FFFFFF) = 7.4:1
✅ Primary Blue (#0066CC) on White (#FFFFFF) = 7.3:1
✅ Error Red (#D32F2F) on White (#FFFFFF) = 5.9:1
✅ White (#FFFFFF) on Primary Blue (#0066CC) = 7.3:1

❌ Gray 500 (#9E9E9E) on White (#FFFFFF) = 3.6:1 (use for large text only)
```

**Testing:**

- Use contrast checker tool
- Test all text/background combinations
- Verify UI component contrast

#### 1.4.4 Resize Text (AA)

**Requirement:** Text can be resized up to 200% without loss of content or functionality

**Implementation:**

- **Relative units:** Use rem/em, not px
- **Responsive design:** Layout adapts to text size
- **No horizontal scrolling:** Content reflows

**Testing:**

- Increase browser text size to 200%
- Verify all content visible
- Verify no horizontal scrolling
- Test on mobile with large text setting

#### 1.4.5 Images of Text (AA)

**Requirement:** Use actual text rather than images of text

**Implementation:**

- **Real text:** Use HTML text with CSS styling
- **Logos:** Exception for branding
- **Icons:** Use icon fonts or SVG

**BerthCare Application:**

- All UI text is real text
- No text in images except logos
- Charts use SVG with text elements

#### 1.4.10 Reflow (AA)

**Requirement:** Content reflows without horizontal scrolling at 320px width

**Implementation:**

- **Mobile-first design:** Designed for 320px+
- **Responsive layouts:** Adapt to viewport
- **No fixed widths:** Use flexible layouts

**Testing:**

- Test at 320px width
- Verify no horizontal scrolling
- Verify all content accessible

#### 1.4.11 Non-text Contrast (AA)

**Requirement:** 3:1 contrast for UI components and graphical objects

**Implementation:**

- **Buttons:** Border/background meets 3:1
- **Form inputs:** Border meets 3:1
- **Icons:** Meet 3:1 against background
- **Focus indicators:** Meet 3:1

**Examples:**

```
✅ Button border (Primary Blue #0066CC) on White = 7.3:1
✅ Input border (Gray 300 #E0E0E0) on White = 1.3:1 (needs improvement)
✅ Focus indicator (Primary Blue #0066CC) on White = 7.3:1
```

#### 1.4.12 Text Spacing (AA)

**Requirement:** No loss of content when text spacing is adjusted

**Implementation:**

- **Line height:** Support 1.5x font size
- **Paragraph spacing:** Support 2x font size
- **Letter spacing:** Support 0.12x font size
- **Word spacing:** Support 0.16x font size

**Testing:**

- Apply text spacing bookmarklet
- Verify no content loss
- Verify no overlapping text

#### 1.4.13 Content on Hover or Focus (AA)

**Requirement:** Hover/focus content is dismissible, hoverable, and persistent

**Implementation:**

- **Dismissible:** Escape key closes
- **Hoverable:** Can move pointer over content
- **Persistent:** Remains until dismissed

**BerthCare Application:**

- Tooltips dismissible with Escape
- Popovers remain when hovering
- Modals persist until user action

---

## Operable

### 2.1 Keyboard Accessible

#### 2.1.1 Keyboard (A)

**Requirement:** All functionality available via keyboard

**Implementation:**

- **Tab navigation:** All interactive elements
- **Enter/Space:** Activate buttons
- **Arrow keys:** Navigate lists/menus
- **Escape:** Close modals/dialogs

**Testing:**

- Unplug mouse
- Navigate entire app with keyboard
- Verify all actions possible

#### 2.1.2 No Keyboard Trap (A)

**Requirement:** Keyboard focus can move away from any component

**Implementation:**

- **Modal focus trap:** Tab cycles within modal, Escape exits
- **No infinite loops:** Focus can always escape
- **Clear exit:** Instructions provided if non-standard

**Testing:**

- Tab through entire app
- Verify can exit all components
- Test modals and overlays

#### 2.1.4 Character Key Shortcuts (A)

**Requirement:** Single-key shortcuts can be turned off or remapped

**Implementation:**

- **No single-key shortcuts:** Use modifier keys (Ctrl, Alt, Cmd)
- **Configurable:** Allow users to customize shortcuts
- **Context-specific:** Only active when component focused

**BerthCare Application:**

- No single-key shortcuts in MVP
- Future shortcuts use Cmd/Ctrl modifiers

---

### 2.2 Enough Time

#### 2.2.1 Timing Adjustable (A)

**Requirement:** Users can extend time limits

**Implementation:**

- **Session timeout:** 30-minute warning before logout
- **Auto-save:** No time limit on form completion
- **Extend option:** Allow session extension

**BerthCare Application:**

- No time limits on documentation
- Auto-save every 30 seconds
- Session timeout with extension option

#### 2.2.2 Pause, Stop, Hide (A)

**Requirement:** Users can control moving, blinking, or scrolling content

**Implementation:**

- **No auto-play:** No automatic animations
- **User control:** User initiates all motion
- **Pause option:** Provide pause for animations

**BerthCare Application:**

- No auto-playing content
- Animations respect reduced-motion preference
- Loading spinners only during active loading

---

### 2.3 Seizures and Physical Reactions

#### 2.3.1 Three Flashes or Below Threshold (A)

**Requirement:** No content flashes more than 3 times per second

**Implementation:**

- **No flashing:** Avoid flashing content
- **Smooth animations:** Use gradual transitions
- **Safe thresholds:** Stay below 3 flashes/second

**BerthCare Application:**

- No flashing content
- Smooth fade/slide animations
- Loading spinners rotate smoothly

---

### 2.4 Navigable

#### 2.4.1 Bypass Blocks (A)

**Requirement:** Provide skip links to bypass repeated content

**Implementation:**

- **Skip to main:** "Skip to main content" link
- **Skip navigation:** Bypass navigation blocks
- **Landmarks:** Use ARIA landmarks

**Examples:**

```html
<a href="#main-content" class="skip-link"> Skip to main content </a>

<nav aria-label="Primary navigation">...</nav>
<main id="main-content">...</main>
```

#### 2.4.2 Page Titled (A)

**Requirement:** Pages have descriptive titles

**Implementation:**

- **Unique titles:** Each screen has unique title
- **Descriptive:** Title describes page purpose
- **Context:** Include app name

**Examples:**

```
"Today's Schedule - BerthCare"
"Visit Documentation: Margaret Thompson - BerthCare"
"Settings - BerthCare"
```

#### 2.4.3 Focus Order (A)

**Requirement:** Focus order is logical and meaningful

**Implementation:**

- **Visual order:** Tab order matches visual order
- **Logical flow:** Follows user workflow
- **No surprises:** Focus doesn't jump unexpectedly

**Testing:**

- Tab through page
- Verify order makes sense
- Check modals and overlays

#### 2.4.4 Link Purpose (In Context) (A)

**Requirement:** Link purpose is clear from link text or context

**Implementation:**

- **Descriptive text:** "View care plan" not "Click here"
- **Context:** Surrounding text provides context
- **ARIA labels:** Add labels if needed

**Examples:**

```
❌ "Click here for more information"
✅ "View Margaret's care plan"

❌ "Read more"
✅ "Read more about wound care procedures"
```

#### 2.4.5 Multiple Ways (AA)

**Requirement:** Multiple ways to find pages

**Implementation:**

- **Navigation menu:** Primary navigation
- **Search:** Search functionality
- **Breadcrumbs:** Show location in hierarchy

**BerthCare Application:**

- Bottom navigation for main sections
- Search for clients
- Recent visits list
- Favorites/pinned clients

#### 2.4.6 Headings and Labels (AA)

**Requirement:** Headings and labels are descriptive

**Implementation:**

- **Clear headings:** Describe section content
- **Unique labels:** Each form field has unique label
- **Hierarchy:** Proper heading levels (h1, h2, h3)

**Examples:**

```
✅ "Blood Pressure Reading"
❌ "Reading"

✅ "Systolic Blood Pressure (mmHg)"
❌ "Value"
```

#### 2.4.7 Focus Visible (AA)

**Requirement:** Keyboard focus indicator is visible

**Implementation:**

- **Clear indicator:** 2px solid Primary Blue outline
- **High contrast:** Meets 3:1 contrast ratio
- **Always visible:** Never remove focus indicator

**CSS:**

```css
*:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Never do this */
*:focus {
  outline: none; /* ❌ */
}
```

---

### 2.5 Input Modalities

#### 2.5.1 Pointer Gestures (A)

**Requirement:** All functionality available with single-pointer actions

**Implementation:**

- **No complex gestures:** Avoid pinch, multi-finger swipes
- **Alternatives:** Provide buttons for all actions
- **Simple taps:** Primary interaction is tap

**BerthCare Application:**

- All actions available via tap
- Swipe gestures have button alternatives
- No pinch-to-zoom required

#### 2.5.2 Pointer Cancellation (A)

**Requirement:** Actions triggered on up-event, not down-event

**Implementation:**

- **Up-event:** Trigger on touch release
- **Abort option:** Can move pointer away to cancel
- **Undo:** Provide undo for critical actions

**BerthCare Application:**

- Buttons activate on release
- Can drag away to cancel
- Undo available for 5 seconds

#### 2.5.3 Label in Name (A)

**Requirement:** Accessible name includes visible label

**Implementation:**

- **Match text:** ARIA label includes visible text
- **Same order:** Text appears in same order
- **Complete match:** Entire visible label included

**Examples:**

```html
<!-- Visible label: "Start Visit" -->
<button aria-label="Start Visit with Margaret Thompson">Start Visit</button>
```

#### 2.5.4 Motion Actuation (A)

**Requirement:** Functionality triggered by motion can be disabled

**Implementation:**

- **No required motion:** Don't require shaking, tilting
- **Alternative input:** Provide button alternative
- **Disable option:** Allow disabling motion controls

**BerthCare Application:**

- No motion-based controls in MVP
- All actions via tap/click

---

## Understandable

### 3.1 Readable

#### 3.1.1 Language of Page (A)

**Requirement:** Page language is programmatically determined

**Implementation:**

```html
<html lang="en"></html>
```

#### 3.1.2 Language of Parts (AA)

**Requirement:** Language changes are marked

**Implementation:**

```html
<p>The client said <span lang="fr">"Je me sens bien"</span></p>
```

---

### 3.2 Predictable

#### 3.2.1 On Focus (A)

**Requirement:** Focus doesn't trigger unexpected context changes

**Implementation:**

- **No auto-submit:** Forms don't submit on focus
- **No navigation:** Focus doesn't change page
- **Predictable:** Focus behavior is consistent

#### 3.2.2 On Input (A)

**Requirement:** Input doesn't trigger unexpected context changes

**Implementation:**

- **Explicit submission:** Forms require button press
- **No auto-navigation:** Input doesn't change page
- **Clear feedback:** Changes are announced

#### 3.2.3 Consistent Navigation (AA)

**Requirement:** Navigation is consistent across pages

**Implementation:**

- **Same location:** Navigation in same place
- **Same order:** Items in same order
- **Same labels:** Consistent naming

**BerthCare Application:**

- Bottom navigation always present
- Same order: Home, Messages, Profile
- Consistent icons and labels

#### 3.2.4 Consistent Identification (AA)

**Requirement:** Components with same functionality are identified consistently

**Implementation:**

- **Same icons:** Save always uses same icon
- **Same labels:** Delete always labeled "Delete"
- **Same behavior:** Actions work the same way

---

### 3.3 Input Assistance

#### 3.3.1 Error Identification (A)

**Requirement:** Errors are clearly identified

**Implementation:**

- **Clear message:** Describe the error
- **Location:** Identify which field has error
- **Suggestion:** Provide correction guidance

**Examples:**

```
❌ "Error"
✅ "Blood pressure is required. Please enter a value."

❌ "Invalid input"
✅ "Systolic blood pressure must be between 70 and 200 mmHg"
```

#### 3.3.2 Labels or Instructions (A)

**Requirement:** Labels or instructions provided for user input

**Implementation:**

- **Clear labels:** Every input has label
- **Instructions:** Complex inputs have instructions
- **Examples:** Provide format examples

**Examples:**

```html
<label for="phone">
  Phone Number
  <span class="hint">Format: (555) 555-5555</span>
</label>
<input id="phone" type="tel" placeholder="(555) 555-5555" />
```

#### 3.3.3 Error Suggestion (AA)

**Requirement:** Provide suggestions for fixing errors

**Implementation:**

- **Specific guidance:** Tell user how to fix
- **Examples:** Show correct format
- **Alternatives:** Suggest valid options

**Examples:**

```
❌ "Invalid date"
✅ "Date must be in the format MM/DD/YYYY. Example: 10/06/2025"

❌ "Wrong value"
✅ "Blood pressure must be a number between 70 and 200"
```

#### 3.3.4 Error Prevention (Legal, Financial, Data) (AA)

**Requirement:** Provide confirmation for important actions

**Implementation:**

- **Confirmation:** Ask before deleting/submitting
- **Review:** Allow review before final submission
- **Undo:** Provide undo for reversible actions

**BerthCare Application:**

- Confirm before deleting visit
- Review summary before completing visit
- 5-second undo for completed visits

---

## Robust

### 4.1 Compatible

#### 4.1.1 Parsing (A)

**Requirement:** Markup is valid and well-formed

**Implementation:**

- **Valid HTML:** No parsing errors
- **Unique IDs:** All IDs are unique
- **Proper nesting:** Elements properly nested
- **Complete tags:** All tags closed

**Testing:**

- Validate HTML with W3C validator
- Check for duplicate IDs
- Verify proper nesting

#### 4.1.2 Name, Role, Value (A)

**Requirement:** UI components have accessible name, role, and value

**Implementation:**

- **Semantic HTML:** Use proper elements
- **ARIA attributes:** Add when needed
- **State changes:** Announce state changes

**Examples:**

```html
<button aria-label="Start visit" aria-pressed="false">Start Visit</button>

<input type="checkbox" id="medication-taken" aria-checked="true" />
<label for="medication-taken">Medication taken</label>
```

#### 4.1.3 Status Messages (AA)

**Requirement:** Status messages are announced to screen readers

**Implementation:**

- **ARIA live regions:** Use for dynamic updates
- **Polite announcements:** Don't interrupt user
- **Clear messages:** Describe what happened

**Examples:**

```html
<div role="status" aria-live="polite">Visit saved successfully</div>

<div role="alert" aria-live="assertive">Error: Unable to save visit. Please try again.</div>
```

---

## Testing Checklist

### Automated Testing

- [ ] Run axe DevTools
- [ ] Run WAVE browser extension
- [ ] Validate HTML with W3C validator
- [ ] Check color contrast with tool
- [ ] Test with Lighthouse accessibility audit

### Manual Testing

- [ ] Navigate entire app with keyboard only
- [ ] Test with screen reader (VoiceOver, TalkBack, NVDA)
- [ ] Increase text size to 200%
- [ ] Test with high contrast mode
- [ ] Test with reduced motion enabled
- [ ] Test with zoom at 400%
- [ ] Test on mobile with large text
- [ ] Test with voice control

### User Testing

- [ ] Test with users who use screen readers
- [ ] Test with users with motor disabilities
- [ ] Test with users with low vision
- [ ] Test with users with cognitive disabilities
- [ ] Collect feedback and iterate

---

## Resources

### Tools

- **axe DevTools:** Browser extension for automated testing
- **WAVE:** Web accessibility evaluation tool
- **Color Contrast Analyzer:** Check contrast ratios
- **Screen readers:** VoiceOver (iOS/Mac), TalkBack (Android), NVDA (Windows)

### Guidelines

- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM:** https://webaim.org/

### Training

- **W3C WAI Tutorials:** https://www.w3.org/WAI/tutorials/
- **Deque University:** https://dequeuniversity.com/
- **A11ycasts:** https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g

---

## Ongoing Compliance

### Process

1. **Design review:** Check accessibility during design
2. **Development:** Build with accessibility in mind
3. **Testing:** Test before release
4. **Audit:** Regular accessibility audits
5. **Remediation:** Fix issues promptly
6. **Training:** Ongoing team training

### Responsibility

- **Designers:** Create accessible designs
- **Developers:** Implement accessibility features
- **QA:** Test for accessibility
- **Product:** Prioritize accessibility
- **Everyone:** Advocate for users

---

**Remember:** Accessibility is not a feature, it's a requirement. Every user deserves a great experience.
