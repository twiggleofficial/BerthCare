# Feature: Smart Data Reuse

**Priority:** P0 - Directly Addresses Primary Pain Point  
**User Story:** As a home care worker, I want to copy previous visit data and edit only what changed, so that I don't have to re-enter repetitive information.

---

## Design Brief

### The Core Problem

Home care workers document the same information repeatedly:

- Client demographics (never change)
- Medication lists (change rarely)
- Baseline vitals (change slightly)
- Care routines (mostly consistent)

**Current reality:** 15 minutes of documentation, 10 minutes is redundant typing.

**Design goal:** Make redundant entry impossible. Show what changed, hide what didn't.

---

## Design Principles

### 1. Copy is the Default

**Don't ask "Do you want to copy?"** - Just copy everything and let users edit what changed.

### 2. Visual Distinction

**Copied data looks different** - Muted styling until edited, then normal styling.

### 3. Change Highlighting

**Show what's different** - Side-by-side comparison with previous visit.

### 4. Smart Suggestions

**Predict likely changes** - Based on patterns and time elapsed.

---

## User Journey

### Scenario: Routine Medication Management Visit

**Without Smart Reuse (Current State):**

```
1. Open blank form
2. Type client name
3. Type address
4. Type medication list (12 medications)
5. Type dosages
6. Type administration times
7. Document compliance
8. Add notes
Total time: 15 minutes
```

**With Smart Reuse (Designed State):**

```
1. Open form → All previous data pre-filled (muted)
2. Tap "All medications taken" → Compliance documented
3. Edit one field: "Metformin - missed morning dose"
4. Add note: "Client forgot, will set alarm"
Total time: 3 minutes
```

**Time saved:** 12 minutes per visit × 6 visits/day = 72 minutes/day

---

## Screen Specifications

### Documentation Form with Smart Reuse

**Visual States:**

#### State 1: Copied Data (Unedited)

```
┌─────────────────────────────────────┐
│ Blood Pressure                      │
│ 120 / 80 mmHg                       │ ← Muted (Gray 500)
│ ↻ From last visit (3 days ago)     │ ← Small indicator
└─────────────────────────────────────┘
```

#### State 2: Edited Data

```
┌─────────────────────────────────────┐
│ Blood Pressure                      │
│ 125 / 82 mmHg                       │ ← Normal (Gray 900)
│ ✏️ Edited (was 120/80)              │ ← Change indicator
└─────────────────────────────────────┘
```

#### State 3: New Data

```
┌─────────────────────────────────────┐
│ Blood Pressure                      │
│ [___] / [___] mmHg                  │ ← Empty, normal styling
│ No previous data                    │ ← Info message
└─────────────────────────────────────┘
```

---

## Copy Strategies by Data Type

### Static Data (Always Copy)

- Client demographics
- Address
- Emergency contacts
- Allergies
- Chronic conditions

**UI Treatment:** Pre-filled, locked, "View only" indicator

### Semi-Static Data (Copy with Review)

- Medication list
- Care plan goals
- Equipment needs
- Mobility status

**UI Treatment:** Pre-filled, muted, "Review and update" prompt

### Dynamic Data (Copy with Highlight)

- Vital signs
- Pain levels
- Mood assessment
- Skin condition

**UI Treatment:** Pre-filled, muted, side-by-side comparison with last visit

### Time-Sensitive Data (Never Copy)

- Visit date/time
- Signature
- Photos
- Incident reports

**UI Treatment:** Always empty, normal styling

---

## Comparison View

### Side-by-Side Comparison

**Purpose:** Show changes at a glance for dynamic data

```
┌─────────────────────────────────────┐
│ Vital Signs Comparison              │
│                                     │
│ Blood Pressure                      │
│ Today: 125/82    Last: 120/80      │
│ ↑ Slightly elevated                 │
│                                     │
│ Heart Rate                          │
│ Today: 72        Last: 70          │
│ → Stable                            │
│                                     │
│ Weight                              │
│ Today: 68kg      Last: 69kg        │
│ ↓ 1kg decrease                      │
└─────────────────────────────────────┘
```

**Visual Specifications:**

- Split layout: 50/50 width
- Today: Normal styling (Gray 900)
- Last: Muted styling (Gray 500)
- Change indicator: Icon + text
  - ↑ Increase: Warning Amber
  - ↓ Decrease: Info Purple
  - → Stable: Success Green

**Interaction:**

- Tap value → Edit mode
- Swipe left → Hide comparison
- Tap "Show trend" → Historical chart

---

## Quick Actions

### Bulk Copy Options

**Purpose:** One-tap copy for common scenarios

```
┌─────────────────────────────────────┐
│ Quick Copy Options                  │
│                                     │
│ [Copy All from Last Visit]          │
│ [Copy Vitals Only]                  │
│ [Copy Medications Only]             │
│ [Copy Assessment Only]              │
│ [Start Fresh]                       │
└─────────────────────────────────────┘
```

**Interaction:**

- Appears on form entry
- Dismissible
- Selection remembered per visit type

### Smart Suggestions

**Purpose:** Predict likely changes based on patterns

```
┌─────────────────────────────────────┐
│ Suggested Updates                   │
│                                     │
│ ⚡ Blood pressure often higher      │
│    on Mondays - check carefully     │
│                                     │
│ ⚡ Wound typically measured weekly   │
│    Last measured 6 days ago         │
└─────────────────────────────────────┘
```

**Visual Specifications:**

- Card: Info Purple background (light)
- Icon: Lightning bolt
- Text: Body Small (14px)
- Dismissible with "Got it" button

---

## Template Library

### Pre-Built Templates

**Purpose:** Common visit types with smart defaults

**Template Types:**

1. **Medication Management**
   - Pre-filled medication list
   - Compliance checkboxes
   - Side effects checklist
   - Refill needs

2. **Wound Care**
   - Wound location diagram
   - Measurement fields
   - Photo comparison
   - Healing progress scale

3. **ADL Assessment**
   - Activity checklist
   - Independence scale
   - Equipment needs
   - Safety concerns

4. **Safety Check**
   - Home environment checklist
   - Fall risk assessment
   - Emergency preparedness
   - Contact verification

**Template Selection:**

```
┌─────────────────────────────────────┐
│ Select Visit Type                   │
│                                     │
│ [💊 Medication Management]          │
│ [🩹 Wound Care]                     │
│ [🚶 ADL Assessment]                 │
│ [🏠 Safety Check]                   │
│ [📋 General Visit]                  │
└─────────────────────────────────────┘
```

**Interaction:**

- Appears after "Start Visit"
- Selection remembered per client
- Can change mid-visit

---

## Quick Notes Library

### Common Phrases

**Purpose:** One-tap insertion of frequently used phrases

**Categories:**

- **Compliance:** "All medications taken as prescribed"
- **Progress:** "Wound showing signs of improvement"
- **Concerns:** "Client reports increased pain"
- **Follow-up:** "RN follow-up recommended"

**UI Implementation:**

```
┌─────────────────────────────────────┐
│ Notes                               │
│ [Microphone icon] [Quick phrases]   │
│                                     │
│ [Text area]                         │
│                                     │
│ Quick Phrases:                      │
│ • All medications taken             │
│ • Wound improving                   │
│ • Client in good spirits            │
│ • No concerns noted                 │
└─────────────────────────────────────┘
```

**Interaction:**

- Tap phrase → Insert at cursor
- Long press → Edit phrase
- Swipe left → Delete phrase
- "+" button → Add custom phrase

---

## Change Tracking

### Audit Trail

**Purpose:** Show what was copied vs. what was edited

**Implementation:**

- Metadata stored with each field
- Visible in review mode
- Accessible to coordinators

**Review Mode:**

```
┌─────────────────────────────────────┐
│ Documentation Review                │
│                                     │
│ ✓ Copied from last visit: 8 fields │
│ ✏️ Edited: 3 fields                 │
│ ➕ New data: 2 fields               │
│                                     │
│ [View Details]                      │
└─────────────────────────────────────┘
```

**Detail View:**

- Field name
- Previous value
- New value
- Edit timestamp
- Editor name

---

## Error Prevention

### Smart Validation

**Scenario:** Copied data might be outdated

**Prevention:**

1. **Time-based warnings**

   ```
   ⚠️ Last visit was 7 days ago
   Please review all copied data carefully
   ```

2. **Value range checks**

   ```
   ⚠️ Blood pressure significantly different from last visit
   Previous: 120/80 → Current: 160/95
   Please confirm this reading
   ```

3. **Required review fields**
   ```
   ⚠️ These fields require review:
   • Medication list (last updated 30 days ago)
   • Emergency contacts (last verified 90 days ago)
   ```

**Visual Treatment:**

- Warning Amber background
- Icon prefix
- Checkbox to confirm review
- Cannot complete visit until confirmed

---

## Accessibility Considerations

### Screen Reader Support

- Announce copied vs. edited state
- Read previous values on focus
- Describe change indicators

### Keyboard Navigation

- Tab through copied fields
- Space to edit
- Escape to revert to copied value

### Visual Accessibility

- Clear visual distinction between states
- Not relying on color alone
- High contrast mode support

---

## Performance Optimization

### Data Loading

- Pre-fetch last visit data on client selection
- Cache common templates locally
- Lazy load historical comparisons

### Storage

- Store only deltas, not full copies
- Compress historical data
- Purge old drafts automatically

---

## Success Metrics

### Quantitative

- **Time savings:** 50% reduction in documentation time
- **Copy usage:** 80%+ of visits use copy feature
- **Edit rate:** Average 3-5 fields edited per visit
- **Error rate:** <1% incorrect copied data

### Qualitative

- "I never type the same thing twice"
- "It knows what I need"
- "Editing is faster than starting fresh"
- "I can focus on what changed"

---

## Implementation Priority

### Phase 1 (MVP)

- Basic copy from last visit
- Visual distinction (muted vs. normal)
- Edit tracking
- Quick copy buttons

### Phase 2 (Post-MVP)

- Template library
- Quick notes library
- Side-by-side comparison
- Smart suggestions

### Phase 3 (Advanced)

- Predictive pre-filling
- Pattern recognition
- Automated change detection
- AI-powered suggestions

---

## Next Steps

1. Review interaction patterns in `interactions.md`
2. Study data model in `implementation.md`
3. Validate with user testing
4. Iterate based on feedback
