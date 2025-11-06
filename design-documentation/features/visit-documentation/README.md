# Feature: Mobile Point-of-Care Documentation

**Priority:** P0 - Core Value Proposition  
**User Story:** As a home care caregiver, I want to document patient assessments directly on my mobile device during visits, so that I can eliminate after-hours paperwork and reduce documentation time.

---

## Design Brief

### User Experience Analysis

**Primary Goal:** Reduce documentation time from 15-20 minutes to <10 minutes per visit

**Success Criteria:**

- Documentation feels faster than paper
- Works perfectly offline
- Requires minimal training
- Prevents common errors
- Feels natural during care delivery

**Pain Points Addressed:**

- After-hours paperwork (3-5 hours/week)
- Duplicate data entry
- Disconnection between care and documentation
- Paper forms getting lost/damaged
- Illegible handwriting

**Primary Persona:** Sarah, 34, RN

- Works 8-hour shifts, visits 6-8 clients daily
- Moderate tech comfort
- Wears gloves during many visits
- Works in varied lighting conditions
- Carries supplies, needs one-handed operation

---

## Information Architecture

### Screen Hierarchy

```
1. Today's Schedule (Home)
   ├── 2. Client Profile
   │   ├── 3. Start Visit
   │   │   ├── 4. Care Plan Review
   │   │   ├── 5. Documentation Form
   │   │   │   ├── Vitals
   │   │   │   ├── Assessment
   │   │   │   ├── Interventions
   │   │   │   ├── Photos
   │   │   │   └── Notes
   │   │   ├── 6. Client Signature
   │   │   └── 7. Complete Visit
   │   └── Visit History
   └── Settings
```

### Navigation Structure

- **Primary:** Linear flow — open to Today's Schedule, tap a visit, swipe back to go home
- **Secondary:** Contextual actions inside the visit (Start Visit, Complete Visit, Alert)
- **Tertiary:** None. No tab bars, drawers, or auxiliary menus.

### Mental Model

**Metaphor:** A digital clipboard that follows you through your day  
**User expectation:** Linear flow matching physical visit sequence  
**Key insight:** Don't make users think about "the app" - make them think about the patient

---

## User Journey Mapping

### Core Experience Flow

#### 1. Morning Preparation (2 minutes)

```
User opens app → Sees today's schedule → Reviews client list → Notes any alerts
```

**Design Focus:**

- Instant load (<2 seconds)
- Clear visual hierarchy of visits
- Urgent alerts immediately visible
- Offline indicator if no connection

#### 2. Arriving at Client Home (30 seconds)

```
User taps client card → Reviews profile → Taps "Start Visit" → GPS auto-check-in
```

**Design Focus:**

- One-tap to start
- Automatic location verification
- Quick profile glance (photo, key alerts, last visit summary)
- Clear indication visit has started

#### 3. Care Plan Review (30 seconds)

```
User sees one-page care plan → Notes any changes → Proceeds to documentation
```

**Design Focus:**

- Single-screen summary
- Highlight recent changes
- Quick access to full plan if needed
- Swipe to proceed

#### 4. Documentation (5-8 minutes)

```
User documents vitals → Assessment → Interventions → Takes photos → Adds notes
```

**Design Focus:**

- Smart defaults from last visit
- Large touch targets
- Voice-to-text option
- Auto-save every 30 seconds
- Clear progress indicator

#### 5. Client Signature (30 seconds)

```
User hands device to client → Client signs → User confirms
```

**Design Focus:**

- Full-screen signature pad
- Clear instructions for client
- Easy clear/retry
- Accessibility for limited dexterity

#### 6. Visit Completion (30 seconds)

```
User reviews summary → Taps "Complete Visit" → GPS auto-check-out → Confirmation
```

**Design Focus:**

- Quick summary review
- One-tap completion
- Automatic time calculation
- Clear success confirmation
- Immediate sync if online

### Advanced User Flow: Complex Visit

**Scenario:** Wound care with multiple photos and detailed notes

```
Standard flow +
├── Multiple photo capture with annotations
├── Wound measurement tool
├── Comparison with previous photos
└── Detailed progress notes
```

**Design Adaptation:**

- Photo gallery view
- Side-by-side comparison mode
- Measurement overlay tool
- Extended notes field with templates

### Edge Case Flow: Offline Visit

**Scenario:** No connectivity during entire visit

```
All standard flows work identically +
├── Offline indicator in status bar
├── "Will sync when connected" message
└── Local storage confirmation
```

**Design Assurance:**

- No functionality loss
- Clear offline status
- Confidence-building messaging
- Automatic sync when connected

---

## Screen-by-Screen Specifications

### Screen 1: Today's Schedule

**Purpose:** Show today's visits at a glance, enable quick navigation

**Layout:**

- Top app bar: Date, sync status, settings icon
- Visit cards: Scrollable list
- Bottom navigation: Home (active), Messages, Profile
- Floating action button: Add unscheduled visit

**Visit Card Anatomy:**

```
┌─────────────────────────────────────┐
│ 9:00 AM - 9:45 AM          [Status] │
│ Margaret Thompson, 82               │
│ 📍 123 Oak Street                   │
│ 💊 Medication management            │
│ ⚠️ New care plan update             │
└─────────────────────────────────────┘
```

**Visual Specifications:**

- Card: White background, 8px radius, shadow-1
- Spacing: 16px between cards, 16px side margins
- Time: Body Large (18px), Gray 900
- Name: H3 (20px), Semibold, Gray 900
- Address: Body Small (14px), Gray 700
- Visit type: Body Small (14px), Gray 700, icon prefix
- Alert: Body Small (14px), Warning Amber, icon prefix

**Status Indicators:**

- **Upcoming:** Primary Blue dot
- **In Progress:** Success Green dot + pulsing animation
- **Completed:** Success Green checkmark
- **Overdue:** Error Red exclamation

**Interaction:**

- Tap card → Navigate to Client Profile
- Swipe right → Quick actions (Call, Navigate, Reschedule)
- Pull to refresh → Sync latest schedule

**States:**

- **Empty:** "No visits scheduled today" with illustration
- **Loading:** Skeleton cards with shimmer effect
- **Error:** "Can't load schedule" with retry button
- **Offline:** Banner "Showing cached schedule"

---

### Screen 2: Client Profile

**Purpose:** Quick reference for client information before starting visit

**Layout:**

- Top app bar: Back button, client name, actions (call, navigate)
- Hero section: Photo, key info
- Tabs: Overview, History, Care Plan, Contacts
- Floating action button: "Start Visit"

**Hero Section:**

```
┌─────────────────────────────────────┐
│     [Photo]                         │
│  Margaret Thompson, 82              │
│  Last visit: 3 days ago             │
│  ⚠️ Fall risk - use walker          │
└─────────────────────────────────────┘
```

**Overview Tab:**

- Allergies (if any) - Error Red background
- Current medications - Expandable list
- Recent vitals - Chart visualization
- Active care plan - One-line summary

**Visual Specifications:**

- Photo: 80px circle, centered
- Name: H2 (24px), Semibold, Gray 900
- Age: Body (16px), Gray 700
- Last visit: Caption (12px), Gray 500
- Alert: Body (16px), Warning Amber background, 8px padding

**Interaction:**

- Tap photo → Full-screen view
- Tap medication → Details modal
- Tap vital → Historical chart
- Tap FAB → Start Visit flow

---

### Screen 3: Start Visit Confirmation

**Purpose:** Verify location and initiate visit tracking

**Layout:**

- Full-screen modal
- Map view showing current location vs. client address
- Confirmation button
- Manual check-in option

**Visual Specifications:**

- Map: 60% of screen height
- Location accuracy: Caption text, Info Purple if <50m, Warning Amber if >50m
- Button: Primary, full-width, "Start Visit at [Time]"
- Manual option: Text button, "Check in manually"

**Interaction:**

- Automatic GPS check-in if within 100m
- Manual check-in if GPS unavailable
- Haptic feedback on successful check-in
- Immediate navigation to Care Plan Review

---

### Screen 4: Care Plan Review

**Purpose:** One-page summary of care plan before documentation

**Layout:**

- Scrollable single screen
- Sections: Goals, Interventions, Precautions, Recent Changes
- Bottom button: "Begin Documentation"

**Visual Specifications:**

- Section headers: H3 (20px), Semibold, Primary Blue
- Content: Body (16px), Gray 900
- Recent changes: Info Purple background, 8px padding
- Spacing: 24px between sections

**Interaction:**

- Tap section → Expand for details
- Tap "Full Care Plan" → Detailed view
- Swipe up → Proceed to documentation
- Tap "Begin Documentation" → Documentation form

---

### Screen 5: Documentation Form

**Purpose:** Capture visit details efficiently with smart defaults

**Layout:**

- Top app bar: Progress indicator, save status, close button
- Tabbed sections: Vitals, Assessment, Interventions, Photos, Notes
- Bottom bar: Previous/Next buttons, Complete Visit
- Auto-save indicator

**Section: Vitals**

```
┌─────────────────────────────────────┐
│ Blood Pressure                      │
│ [120] / [80] mmHg                   │
│ Last: 118/78 (3 days ago)           │
│                                     │
│ Heart Rate                          │
│ [72] bpm                            │
│ Last: 70 (3 days ago)               │
│                                     │
│ [Copy from last visit]              │
└─────────────────────────────────────┘
```

**Visual Specifications:**

- Input fields: 56px height, 16px padding, 4px radius
- Labels: Caption (12px), Medium, Gray 700
- Previous values: Body Small (14px), Gray 500, italic
- Copy button: Secondary, full-width

**Interaction:**

- Tap field → Numeric keyboard
- Tap "Copy from last visit" → Pre-fill all fields with muted styling
- Edit copied value → Change to normal styling
- Voice icon → Voice-to-text input
- Auto-save every 30 seconds → "Saved" indicator

**Section: Assessment**

- Checklist format for common observations
- Quick-tap buttons for common findings
- Free-text field for additional notes
- Photo attachment option

**Section: Interventions**

- Pre-populated from care plan
- Checkboxes for completed tasks
- Time stamps for each intervention
- Notes field for variations

**Section: Photos**

- Camera button (large, centered)
- Gallery view of captured photos
- Annotation tools (arrow, circle, text)
- Comparison with previous photos

**Section: Notes**

- Large text area
- Voice-to-text prominent
- Quick phrase library
- Auto-complete for common terms

---

### Screen 6: Client Signature

**Purpose:** Capture client confirmation of visit

**Layout:**

- Full-screen signature pad
- Instructions at top
- Clear and Done buttons at bottom

**Visual Specifications:**

- Signature area: White background, 2px Gray 300 border
- Instructions: Body (16px), Gray 700, centered
- Clear button: Text button, left
- Done button: Primary button, right

**Interaction:**

- Touch/stylus drawing
- Pinch to zoom (accessibility)
- Tap Clear → Erase signature
- Tap Done → Capture signature, proceed to completion

**Accessibility:**

- Large touch area
- High contrast
- Voice confirmation option for clients unable to sign
- Proxy signature with note field

---

### Screen 7: Visit Completion

**Purpose:** Review and finalize visit documentation

**Layout:**

- Summary card: Key details
- Duration: Auto-calculated
- Review button: "Review documentation"
- Complete button: Primary, full-width
- Save draft button: Secondary

**Summary Card:**

```
┌─────────────────────────────────────┐
│ Visit Summary                       │
│                                     │
│ Duration: 45 minutes                │
│ Check-in: 9:02 AM                   │
│ Check-out: 9:47 AM                  │
│                                     │
│ ✓ Vitals recorded                   │
│ ✓ Assessment complete               │
│ ✓ 3 interventions documented        │
│ ✓ 2 photos captured                 │
│ ✓ Client signature obtained         │
└─────────────────────────────────────┘
```

**Interaction:**

- Tap "Review documentation" → Return to form
- Tap "Complete Visit" → Finalize and sync
- Tap "Save draft" → Save for later completion
- Automatic GPS check-out on completion

**Success State:**

- Full-screen success animation
- "Visit completed" message
- Auto-navigate to schedule after 2 seconds
- Sync status indicator

---

## Responsive Design Specifications

### Small Phones (375px width)

- Single column layout
- Bottom navigation
- Floating action buttons
- Collapsible sections

### Large Phones (414px+ width)

- Slightly wider cards
- More whitespace
- Larger touch targets

### Tablets (768px+ width)

- Two-column layout for forms
- Side-by-side comparison views
- Persistent navigation sidebar
- Larger signature pad

---

## Accessibility Specifications

### Screen Reader Support

- Semantic heading hierarchy
- Descriptive labels for all inputs
- Status announcements for auto-save
- Clear focus order

### Keyboard Navigation

- Tab order follows visual flow
- Enter key submits forms
- Escape key closes modals
- Arrow keys navigate lists

### Visual Accessibility

- Minimum 4.5:1 contrast for all text
- Color not sole indicator of status
- Large text option (120% scale)
- High contrast mode

### Motor Accessibility

- 48px minimum touch targets
- Undo for all actions
- Voice input for all text fields
- Adjustable time limits

---

## Performance Requirements

### Load Times

- Initial screen: <2 seconds
- Screen transitions: <300ms
- Form auto-save: <1 second
- Photo capture: <500ms

### Offline Capability

- All documentation works offline
- Local storage for 30 days of visits
- Automatic sync when connected
- Conflict resolution with user review

### Battery Optimization

- GPS only during check-in/out
- Background sync throttled
- Image compression before storage
- Dark mode option

---

## Implementation Notes for Developers

### State Management

- Local-first architecture
- Optimistic UI updates
- Background sync queue
- Conflict resolution strategy

### Data Validation

- Real-time field validation
- Required field enforcement
- Range checks for vitals
- Photo quality verification

### Error Handling

- Graceful degradation
- Clear error messages
- Retry mechanisms
- Offline queue management

### Testing Priorities

- Offline functionality
- GPS accuracy
- Auto-save reliability
- Cross-device sync

---

## Success Metrics

### Quantitative

- Documentation time: <10 minutes per visit
- Error rate: <2% requiring correction
- Offline success rate: 99%+
- Auto-save success: 99.9%+

### Qualitative

- "Feels faster than paper"
- "I don't think about the app"
- "It just works"
- "I can focus on the patient"

---

## Next Steps

1. Review interaction specifications in `interactions.md`
2. Study accessibility requirements in `accessibility.md`
3. Reference implementation guidelines in `implementation.md`
4. Validate against user journey in `user-journey.md`
