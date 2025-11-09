# Feedback

**Philosophy:** caregivers need to know what happened, then get back to caring for patients.

---

## The Truth About Feedback in Healthcare

Home care caregivers document 6-8 visits per day while wearing gloves, standing in dim hallways, and thinking about their next patient. They don't have time for complex feedback systems.

**One feedback pattern. Instant clarity. Zero friction.**

If feedback requires thought, the design has failed the caregiver.

---

## Design Philosophy

### "Start with the user experience, then work backwards"

**The user:** Sarah, 34, RN, documenting her 6th visit of the day in a patient's dimly lit kitchen, wearing gloves, phone at 23% battery.

**What she needs:**

- Instant confirmation her work saved
- Zero cognitive load
- No blocking her workflow
- Works with gloves on

**What we eliminated:**

- Snackbars, toasts, notifications (confusing terminology)
- Dismiss buttons (extra tap with gloves)
- Action buttons in alerts (workflow interruption)
- Progress bars (creates anxiety about time)
- Spinners (makes app feel slow)
- Skeleton screens (over-engineered)
- Notification queues (overwhelming)
- Tooltips (doesn't work on mobile)
- Badges (visual clutter)

**What we kept:**

- Status feedback (saved/failed/syncing)
- Haptic confirmation (feel it through gloves)
- Auto-dismiss (no extra taps)
- High contrast (readable in any light)

### "If users need a manual, the design has failed"

A caregiver shouldn't wonder if their visit saved. They should know instantly, without thinking.

**Our approach:** Feedback happens. User understands. User continues caring for patients.

---

## Status Feedback

### Visual Specifications

```
┌─────────────────────────────────────┐
│                                     │
│         [Main Content]              │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ ✓ Visit saved                   │ │
│ └─────────────────────────────────┘ │
└─────────────────────────────────────┘
```

**Dimensions:**

- Width: Full width minus 32px margins (16px each side)
- Height: 56px (optimized for gloved fingers)
- Position: Bottom, 88px from bottom (above nav bar, thumb-safe zone)
- Border radius: 12px (softer, more approachable)

**Colors (semantic, not decorative):**

- Saved: Green `#00C853` background, White text
- Failed: Red `#D32F2F` background, White text
- Syncing: Blue `#0066CC` background, White text
- Offline: Amber `#FF8F00` background, White text

**Typography:**

- Font: 18px, Semibold (600) - larger for readability in field
- Color: White `#FFFFFF`
- Alignment: Left (easier to scan)
- Icon: 24px, left-aligned with 16px padding

**Animation:**

- Enter: Slide up from bottom (150ms, ease-out)
- Stay: 2.5 seconds (tested with real caregivers)
- Exit: Fade out (150ms)
- Haptic: Medium impact on appear (works through gloves)

**Why these specs:**

- 56px height: Easier to see while standing/moving
- Left alignment: Faster to read (Western reading pattern)
- Semibold font: More legible in poor lighting
- 2.5 seconds: Enough to register, not intrusive
- Haptic feedback: Confirmation without looking
- Thumb-safe zone: Won't accidentally tap while holding phone

---

## Four Status Types

### 1. Saved (Green)

```
┌─────────────────────────────────────┐
│ ✓ Visit saved                       │
└─────────────────────────────────────┘
```

**When to use:**

- Visit documentation saved
- Photo uploaded
- Signature captured
- Care plan updated

**Message format:**

- Checkmark icon ✓
- Past tense ("saved" not "saving")
- Specific action ("Visit saved" not "Success")
- 2-3 words maximum
- Haptic: Medium impact

**Why:** caregivers need immediate confirmation their work won't be lost. "Saved" is clearer than "Success."

### 2. Failed (Red)

```
┌─────────────────────────────────────┐
│ ✕ Save failed                       │
└─────────────────────────────────────┘
```

**When to use:**

- Save operation failed
- Photo upload failed
- Validation error
- Critical error

**Message format:**

- X icon ✕
- What failed ("Save failed" not "Error")
- No technical jargon
- 2-3 words maximum
- Haptic: Error notification (3 quick taps)

**Why:** "Failed" is honest and clear. Technical errors are for logs, not caregivers.

### 3. Syncing (Blue)

```
┌─────────────────────────────────────┐
│ ↻ Syncing 3 visits                  │
└─────────────────────────────────────┘
```

**When to use:**

- Background sync in progress
- Uploading offline visits
- Downloading updates

**Message format:**

- Sync icon ↻
- Present continuous ("Syncing" not "Sync")
- Specific count ("3 visits" not "data")
- 2-4 words maximum
- No haptic (background operation)

**Why:** caregivers need to know sync is happening, but it shouldn't interrupt workflow.

### 4. Offline (Amber)

```
┌─────────────────────────────────────┐
│ ⚠ Working offline                   │
└─────────────────────────────────────┘
```

**When to use:**

- No network connection
- Offline mode active
- Will sync later

**Message format:**

- Warning icon ⚠
- Present tense ("Working offline")
- Reassuring tone
- 2-3 words maximum
- Haptic: Warning notification (2 taps)

**Why:** Rural caregivers work offline frequently. This should feel normal, not alarming.

---

## What We Eliminated (And Why)

### ❌ Action Buttons in Status Messages

**Why:** caregivers wear gloves. Every extra tap is friction.

**Old way:**

```
┌─────────────────────────────────────┐
│ Visit saved                 [View]  │
└─────────────────────────────────────┘
```

**New way:**

```
Status confirms action.
Navigation happens through main UI.
No extra taps needed.
```

### ❌ Dismiss Buttons

**Why:** Auto-dismiss after 2.5 seconds. Gloved fingers shouldn't need to tap tiny X buttons.

### ❌ Persistent Status Messages

**Why:** If it needs to persist, it's not status feedback—it's a system state indicator.

### ❌ Status Message Queues

**Why:** Multiple messages = cognitive overload during patient care.

**Old way:**

```
Message 1: "Visit saved"
Message 2: "Photo uploaded"
Message 3: "Signature captured"
Message 4: "Sync complete"
```

**New way:**

```
One message: "Visit saved"
(Everything else happens automatically)
```

### ❌ Progress Bars for Sync

**Why:** Creates anxiety. caregivers don't need to watch progress—they need to know when it's done.

**Old way:**

```
┌─────────────────────────────────────┐
│ Syncing... [████████░░] 80%        │
└─────────────────────────────────────┘
```

**New way:**

```
┌─────────────────────────────────────┐
│ ↻ Syncing 3 visits                  │
└─────────────────────────────────────┘
(Shows count, not percentage)
```

### ❌ Loading Spinners for Quick Actions

**Why:** Makes the app feel slow. Show instant feedback, work in background.

**Old way:**

```
[Spinner] Saving...
(User waits, watching spinner)
```

**New way:**

```
✓ Visit saved
(Instant feedback, background processing)
```

### ❌ Skeleton Screens

**Why:** Over-engineered for a mobile app used in the field. Show content when ready.

### ❌ Tooltips

**Why:** Hover doesn't exist on mobile. If UI needs explanation, redesign the UI.

### ❌ Notification Badges

**Why:** Visual clutter. Important information belongs in the main UI, not hidden in badges.

### ❌ Modal Dialogs for Status

**Why:** Blocking. Interrupting. Status feedback should never block workflow.

**Use modals only for decisions:**

- "Delete this visit?" (destructive action)
- "Work offline?" (mode change)
- "Required field missing" (blocking error)

**Never for status:**

- "Visit saved" (use status message)
- "Sync complete" (use status message)
- "Photo uploaded" (use status message)

---

## When Status Messages Aren't Enough: Decisions

**Status messages are for feedback. Dialogs are for decisions.**

Status: "Visit saved" (information)  
Dialog: "Delete this visit?" (requires decision)

### The Decision Dialog

```
┌─────────────────────────────────────┐
│                                     │
│  ⚠️                                 │
│                                     │
│  Delete this visit?                 │
│                                     │
│  This cannot be undone.             │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         Delete Visit            │ │
│ └─────────────────────────────────┘ │
│                                     │
│          Cancel                     │
│                                     │
└─────────────────────────────────────┘
```

**Specs:**

- Width: 90% screen width, max 340px
- Background: White
- Border radius: 16px
- Overlay: Black 60% opacity (darker for focus)
- Icon: 56px, centered (larger for gloved fingers)
- Title: 22px, Semibold, centered
- Message: 17px, Regular, centered, Gray 700
- Primary button: 56px height, full width (see button component)
- Cancel: 56px height, text link below button
- Spacing: 24px between elements

**When to use:**

- Destructive actions (delete visit, discard changes)
- Mode changes (work offline, end shift)
- Blocking errors (required field missing, invalid data)
- Critical decisions (confirm medication change)

**When NOT to use:**

- Status feedback (use status messages)
- Success confirmations (use status messages)
- Background processes (use status messages)
- Non-critical information (use status messages)

### The Blocking Error Dialog

```
┌─────────────────────────────────────┐
│                                     │
│  ⚠️                                 │
│                                     │
│  Required field missing             │
│                                     │
│  Blood pressure is required for     │
│  this visit type.                   │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │         Add Blood Pressure      │ │
│ └─────────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**When to use:**

- User cannot proceed without action
- Data validation failures
- Required information missing

**Why:** Prevents incomplete documentation while being clear about what's needed.

---

## Loading States

**Show loading only when necessary. Optimize for instant feedback.**

### Initial App Load

```
┌─────────────────────────────────────┐
│                                     │
│                                     │
│              ◐                      │
│          Loading...                 │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**Specs:**

- Spinner: 56px, Primary Blue
- Text: 18px, Semibold, Gray 700
- Centered in screen
- White background
- No overlay (replaces content)

**When to use:**

- Initial app launch
- Login authentication
- First-time data sync

**Performance target:**

- Show immediately
- Remove when content ready
- Target: <2 seconds on 3-year-old device
- If >3 seconds, investigate performance issue

### Content Refresh

```
┌─────────────────────────────────────┐
│ Today's Schedule                    │
│                                     │
│          ◐ Loading visits...        │
│                                     │
└─────────────────────────────────────┘
```

**Specs:**

- Spinner: 32px, Primary Blue
- Text: 17px, Regular, Gray 700
- Centered in content area
- Replaces content (no overlay)

**When to use:**

- Pull-to-refresh
- Loading next day's schedule
- Fetching patient details

**Performance target:**

- Show after 300ms delay (avoid flash for fast loads)
- Remove when content ready
- Target: <1 second

### Background Operations

**Don't show loading for background operations.**

**Examples:**

- Auto-save: Show "✓ Visit saved" when complete
- Photo upload: Show "✓ Photo uploaded" when complete
- Sync: Show "↻ Syncing 3 visits" status message

**Why:** Loading states create anxiety. Status messages provide confidence.

### What We Don't Use

**❌ Skeleton screens:** Over-engineered. Show content when ready.

**❌ Progress percentages:** Creates anxiety. Show status, not progress.

**❌ Spinners for quick actions:** Makes app feel slow. Show instant feedback instead.

**❌ Loading overlays:** Blocks content unnecessarily. Replace content instead.

---

## Real-World Scenarios

### Scenario 1: Completing a Visit

```
Context: Sarah finishes documenting vital signs for Mrs. Johnson
Action: Taps "Complete Visit"
Feedback:
  - Haptic: Medium impact (feels confirmation)
  - Visual: "✓ Visit saved" (green, 2.5 seconds)
  - Auto-save: Happens in background
Result: Returns to schedule, confident work is saved
```

### Scenario 2: Working Offline (Rural Visit)

```
Context: Sarah arrives at remote farmhouse, no cell signal
Action: Opens app
Feedback:
  - Haptic: Warning (2 taps)
  - Visual: "⚠ Working offline" (amber, persistent)
  - Status bar: Offline indicator remains visible
Action: Completes visit documentation
Feedback: "✓ Visit saved" (green, 2.5 seconds)
Note: "Will sync when online" appears in status bar
Result: Sarah continues working, knows sync will happen later
```

### Scenario 3: Returning Online (Automatic Sync)

```
Context: Sarah drives back to town, phone reconnects
Action: Automatic (no user action)
Feedback:
  - Visual: "↻ Syncing 3 visits" (blue, shows count)
  - No haptic (background operation)
Duration: Until sync completes (typically 10-30 seconds)
Then: "✓ Synced" (green, 2.5 seconds)
Result: Sarah knows all visits are now in the system
```

### Scenario 4: Photo Upload Failure

```
Context: Sarah takes photo of wound care, upload fails
Action: Automatic retry (3 attempts)
Feedback: "✕ Photo upload failed" (red, 2.5 seconds)
Haptic: Error (3 quick taps)
Then: Photo saved locally, will retry when connection improves
Status bar: Shows "1 photo pending" indicator
Result: Sarah knows photo is saved, will upload later
```

### Scenario 5: Deleting a Visit (Destructive Action)

```
Context: Sarah accidentally started wrong patient's visit
Action: Taps "Delete Visit"
Feedback: Dialog appears
  - "⚠️ Delete this visit?"
  - "This cannot be undone."
  - [Delete Visit] button (red)
  - [Cancel] link
User choice: Taps "Delete Visit"
Feedback: "✕ Visit deleted" (red, 2.5 seconds)
Result: Returns to schedule, visit removed
```

### Scenario 6: Required Field Missing

```
Context: Sarah tries to complete visit without blood pressure
Action: Taps "Complete Visit"
Feedback: Dialog appears
  - "⚠️ Required field missing"
  - "Blood pressure is required for this visit type."
  - [Add Blood Pressure] button
User action: Taps button
Result: Returns to form, blood pressure field highlighted
```

### Scenario 7: Team Alert (Care Coordination)

```
Context: Sarah notices patient fall risk, alerts team
Action: Taps "Alert Team" with message
Feedback: "✓ Team alerted" (green, 2.5 seconds)
Haptic: Medium impact
Result: Returns to visit, confident team received alert
```

### Scenario 8: Family SMS Update

*Note: This message is sent by a background/out-of-app delivery service, targets family members (not caregivers), and requires no app interaction or caregiver confirmation flow.*

```text
Context: Family member receives daily SMS at 6 PM
Action: None required (automatic)
Feedback: SMS delivered to phone
Content: "Hi Jennifer, your mom had a great day today..."
No app feedback: SMS system handles delivery confirmation
Result: Family receives update, no app interaction needed
```

---

## Message Writing Rules

### Be Specific

```
❌ "Success"
✅ "Visit completed successfully"

❌ "Error"
✅ "Failed to save visit"

❌ "Loading"
✅ "Syncing 3 visits..."
```

### Be Concise

```
❌ "Your visit has been successfully completed and saved to the database"
✅ "Visit completed successfully"

❌ "We were unable to save your visit due to a network connectivity issue"
✅ "Failed to save visit"
```

### Be Human

```
❌ "Operation completed successfully"
✅ "Visit completed successfully"

❌ "ERR_NETWORK_TIMEOUT"
✅ "Connection timed out"

❌ "Data synchronization in progress"
✅ "Syncing..."
```

---

## Message Writing Rules

### Be Specific to Healthcare Context

```
❌ "Success"
✅ "Visit saved"

❌ "Error"
✅ "Save failed"

❌ "Loading"
✅ "Syncing 3 visits"
```

### Be Concise (Glanceable)

```
❌ "Your visit documentation has been successfully saved to the database"
✅ "Visit saved"

❌ "We were unable to save your visit due to a network connectivity issue"
✅ "Save failed"

❌ "Please wait while we synchronize your data with the server"
✅ "Syncing 3 visits"
```

### Be Human (Not Technical)

```
❌ "Operation completed successfully"
✅ "Visit saved"

❌ "ERR_NETWORK_TIMEOUT_408"
✅ "Connection timed out"

❌ "Data synchronization process initiated"
✅ "Syncing"
```

### Use Action-Oriented Language

```
❌ "The visit is now complete"
✅ "Visit saved"

❌ "Synchronization has finished"
✅ "Synced"

❌ "The photo has been uploaded"
✅ "Photo uploaded"
```

### Count When Relevant

```
❌ "Syncing visits"
✅ "Syncing 3 visits"

❌ "Photos pending"
✅ "2 photos pending"

❌ "Team members alerted"
✅ "Team alerted (3 people)"
```

## Accessibility

### Screen Reader

```html
<div role="alert" aria-live="polite" aria-atomic="true">Visit completed successfully</div>
```

**Announces:** Message automatically when it appears.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  .alert {
    animation: none;
    transition: opacity 200ms;
  }
}
```

**Respects:** User's motion preferences.

### Color Blind

- Green/Red distinction: Also uses icons (✓ vs ✕)
- Not relying on color alone
- High contrast text (white on colored background)

---

## Platform Specifics

### iOS

```swift
// Alert
struct AlertView: View {
    var body: some View {
        Text("✓ Visit completed successfully")
            .padding()
            .background(Color.green)
            .foregroundColor(.white)
            .cornerRadius(8)
            .transition(.move(edge: .bottom))
    }
}

// Show for 3 seconds
withAnimation {
    showAlert = true
}
DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
    withAnimation {
        showAlert = false
    }
}
```

### Android

```kotlin
// Alert (using Snackbar)
Snackbar.make(
    view,
    "✓ Visit completed successfully",
    Snackbar.LENGTH_SHORT
).setBackgroundTint(Color.parseColor("#00C853"))
 .setTextColor(Color.WHITE)
 .show()
```

### Web

```javascript
// Alert
function showAlert(message, type) {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  document.body.appendChild(alert);

  setTimeout(() => {
    alert.classList.add('fade-out');
    setTimeout(() => alert.remove(), 200);
  }, 3000);
}

showAlert('✓ Visit completed successfully', 'success');
```

---

## Testing Checklist

- [ ] Alert appears immediately (<100ms)
- [ ] Alert is readable (tested in sunlight)
- [ ] Alert auto-dismisses after 3 seconds (timed)
- [ ] Alert doesn't block content (tested)
- [ ] Message is specific (reviewed)
- [ ] Message is concise (2-5 words)
- [ ] Icon matches type (✓ ✕ ℹ️)
- [ ] Color matches type (green/red/blue)
- [ ] Screen reader announces (tested)
- [ ] Works with reduced motion (tested)
- [ ] Haptic feedback works (felt it)

---

## Design Philosophy in Practice

### "Simplicity is the ultimate sophistication"

One feedback pattern. Four semantic states. 2.5 seconds. Done.

### "Start with the user experience, then work backwards"

Designed for caregivers wearing gloves in dim hallways. Everything else follows from that reality.

### "If users need a manual, the design has failed"

Status appears. caregiver understands. caregiver continues caring for patients. No explanation needed.

### "Say no to 1,000 things"

Eliminated: snackbars, toasts, notifications, banners, popovers, tooltips, badges, progress bars, spinners, skeletons, action buttons, dismiss buttons, queues.

Kept: Status feedback that works with gloves, in any lighting, without interrupting care.

### "Perfection in details matters"

- 56px height (tested with gloved fingers)
- 2.5 seconds duration (tested with real caregivers)
- Haptic feedback (works through gloves)
- Left-aligned text (faster to scan)
- Thumb-safe zone (won't accidentally tap)

### "Make technology invisible"

Feedback happens automatically. caregivers don't think about the system. They think about their patients.

---

## Evolution Roadmap

### Phase 1 (MVP - Months 1-6)

- Four status types (saved/failed/syncing/offline)
- Haptic feedback
- Auto-dismiss
- High contrast for field use

**Success metric:** 95% of caregivers report confidence their work is saved

### Phase 2 (Months 7-12)

- Refined timing based on real usage data
- Optimized haptic patterns
- Enhanced offline state communication
- Battery optimization

**Success metric:** <1 support ticket per 1,000 visits about feedback clarity

### Phase 3 (Year 2+)

- Predictive feedback (anticipate user needs)
- Contextual feedback (adapt to user patterns)
- Accessibility enhancements based on user feedback

**Success metric:** Feedback system becomes invisible—caregivers don't mention it

---

## The Vision

**This is not a feedback system.**

**This is confidence.**

Confidence that work is saved.  
Confidence that sync will happen.  
Confidence that the system is working.

So caregivers can focus on what matters: caring for patients.

---

**Status feedback. Four states. 2.5 seconds. Invisible.**
