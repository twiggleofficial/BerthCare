# Feature: Electronic Visit Verification

**Priority:** P1 - Required for Compliance  
**User Story:** As a coordinator, I want automated verification of visit times and locations, so that I can ensure compliance and accurate billing.

---

## The Radical Simplification

### What We're NOT Building

❌ Complex check-in/check-out flows  
❌ Manual GPS verification screens  
❌ Time tracking interfaces  
❌ Geofencing configuration  
❌ Approval workflows

### What We ARE Building

✓ **Invisible verification** - It just happens  
✓ **Zero user action** - No buttons to press  
✓ **Automatic everything** - Location, time, duration  
✓ **Trust by default** - Verify, don't interrogate

---

## The Design Philosophy Applied

### "If users need a manual, the design has failed"

**Old thinking:** "Users must check in and check out at each visit"  
**New thinking:** The app knows when you arrive and leave. No action needed.

**How it works:**

1. caregiver taps "Start Visit" on client card
2. App automatically records location and time
3. caregiver does the visit (app is invisible)
4. caregiver taps "Complete Visit"
5. App automatically records end location and time
6. Done. No check-in screens, no GPS verification prompts.

---

## The Invisible Interface

### What the caregiver Sees

```
[Start Visit] button
    ↓
Visit in progress (timer in status bar)
    ↓
[Complete Visit] button
```

**That's it.** No GPS screens. No "verify location" prompts. No "check in" ceremony.

### What Happens Behind the Scenes

- GPS location captured silently
- Time stamped automatically
- Duration calculated
- Geofence validated (if needed)
- Anomalies flagged for review (not blocked)
- Data synced when connected

---

## Challenging Assumptions

### Assumption: "We need to show GPS accuracy to users"

**Challenge:** Why? Does showing "GPS accuracy: 12 meters" help a caregiver do their job?  
**Decision:** No. Hide it. Only show if there's a problem.

### Assumption: "Users must manually check in/out"

**Challenge:** Why can't the app figure this out?  
**Decision:** It can. "Start Visit" = check in. "Complete Visit" = check out.

### Assumption: "We need geofencing to prevent fraud"

**Challenge:** Are we building for the 1% who might cheat, or the 99% who are honest?  
**Decision:** Trust by default. Flag anomalies for review, don't block honest workers.

### Assumption: "coordinators need real-time location tracking"

**Challenge:** Do they? Or do they just need to know visits happened?  
**Decision:** Visits happened. Location verified. That's enough. No Big Brother tracking.

---

## The Magical Experience

### For the caregiver

**Before (typical EVV):**

1. Open app
2. Find client
3. Tap "Check In"
4. Wait for GPS
5. Confirm location
6. Take photo of client (some systems!)
7. Finally start visit
8. Do visit
9. Tap "Check Out"
10. Wait for GPS again
11. Confirm location
12. Done

**After (BerthCare):**

1. Tap "Start Visit"
2. Do visit
3. Tap "Complete Visit"
4. Done

**Time saved:** 2-3 minutes per visit × 6 visits/day = 12-18 minutes/day

---

## When Things Go Wrong

### GPS Unavailable (basement, rural area)

**Old approach:** Block the user. "Cannot check in without GPS."  
**New approach:** Let them work. Flag for review later.

```
Visit starts normally
↓
GPS unavailable detected
↓
Small banner: "Location unavailable - will verify later"
↓
Visit continues
↓
coordinator reviews later (if needed)
```

### Location Doesn't Match

**Old approach:** "You are not at the client location. Cannot check in."  
**New approach:** Trust the caregiver. Flag for review if pattern emerges.

```
Visit starts normally
↓
Location mismatch detected
↓
No user interruption
↓
Flagged for coordinator review
↓
coordinator sees: "3 visits this week had location variances"
↓
coordinator contacts caregiver: "Hey, noticed some location issues..."
```

---

## The coordinator Experience

### Dashboard (Not a Surveillance Tool)

```
┌─────────────────────────────────────┐
│ Today's Visits                      │
│                                     │
│ ✓ 45 completed                      │
│ ○ 3 in progress                     │
│ ⚠ 2 need review                     │
│                                     │
│ [View Details]                      │
└─────────────────────────────────────┘
```

### Review Queue (Only When Needed)

```
┌─────────────────────────────────────┐
│ Visits Needing Review               │
│                                     │
│ Sarah J. - Margaret T.              │
│ Location variance: 150m             │
│ Likely reason: Apartment building   │
│ [Approve] [Contact caregiver]           │
│                                     │
│ Mike C. - John S.                   │
│ No GPS data                         │
│ Likely reason: Rural area           │
│ [Approve] [Contact caregiver]           │
└─────────────────────────────────────┘
```

**Philosophy:** Review exceptions, don't micromanage everyone.

---

## What We're Saying No To

### ❌ Real-time tracking

**Why:** Creepy. Unnecessary. Treats caregivers like suspects.

### ❌ Photo verification

**Why:** Degrading. Clients aren't criminals. caregivers aren't either.

### ❌ Biometric check-in

**Why:** Overkill. Fingerprint scanners for home care? Really?

### ❌ Client signature at check-in AND check-out

**Why:** Once is enough. Don't waste client's time.

### ❌ Geofence configuration per client

**Why:** Too complex. Auto-detect or use address.

### ❌ Manual time entry

**Why:** Error-prone. Automatic is better.

---

## The Technical Magic (Invisible to Users)

### Smart Location Detection

```
1. Start Visit tapped
2. Get GPS coordinates (background, non-blocking)
3. Compare to client address
4. If within 200m: ✓ Verified
5. If 200m-500m: ⚠ Flag for review
6. If >500m or unavailable: ⚠ Flag for review
7. Never block the user
```

### Intelligent Duration Tracking

```
1. Start time: When "Start Visit" tapped
2. End time: When "Complete Visit" tapped
3. Duration: Calculated automatically
4. Anomaly detection:
   - <10 minutes: Flag (too short?)
   - >2 hours: Flag (forgot to complete?)
   - Otherwise: Auto-approve
```

### Battery-Friendly Implementation

```
- GPS only on Start/Complete (not continuous)
- Background location: NO
- Location updates: NO
- Battery drain: Minimal
```

---

## Success Metrics

### For caregivers

- **Zero additional steps** beyond Start/Complete
- **Zero GPS wait time** (happens in background)
- **Zero location errors** blocking work

### For coordinators

- **95%+ auto-approved** visits (no review needed)
- **<5% flagged** for review
- **100% compliant** with regulations

### For Organization

- **Accurate billing** data
- **Audit-ready** documentation
- **Fraud prevention** without surveillance culture

---

## The Compliance Story

### What Regulators Want

- Proof visit happened
- Proof caregiver was there
- Proof of duration
- Audit trail

### What We Provide

- GPS coordinates (when available)
- Timestamp (always)
- Duration (calculated)
- Audit log (automatic)

### What We Don't Do

- Continuous tracking
- Invasive monitoring
- Presumption of guilt
- Bureaucratic overhead

---

## Implementation: The Invisible Way

### User Flow

```
caregiver workflow:
1. Tap "Start Visit" on client card
   → GPS captured silently
   → Timer starts
   → Visit screen opens

2. Document visit (existing flow)

3. Tap "Complete Visit"
   → GPS captured silently
   → Timer stops
   → Duration calculated
   → Data synced
   → Done
```

### No Additional Screens

- No "Check In" screen
- No "Verify Location" screen
- No "Check Out" screen
- No "Confirm Duration" screen

### Only Show When Needed

```
IF GPS unavailable:
  Show small banner: "Location unavailable"
  Don't block workflow

IF location variance >500m:
  Don't show anything to caregiver
  Flag for coordinator review

IF duration <10min or >2hr:
  Don't show anything to caregiver
  Flag for coordinator review
```

---

## The Philosophy in Action

### "Simplicity is the ultimate sophistication"

We removed 8 steps from typical EVV. It's now 2 taps.

### "The best interface is no interface"

EVV happens automatically. No EVV screens exist.

### "Make technology invisible"

caregivers don't think about GPS, geofencing, or verification. They just work.

### "Say no to 1,000 things"

We said no to: real-time tracking, photo verification, biometrics, manual entry, complex geofencing, approval workflows, and surveillance features.

### "Do a few things exceptionally well"

We do one thing: automatically verify visits happened. That's it. But we do it perfectly.

---

**This is how EVV should work. Invisible. Automatic. Trustworthy.**
