# Data Bridge

**Priority:** P2 - Enabler for Adoption  
**User Story:** As an administrator, I want to export visit data and import client information, so that BerthCare can coexist with existing systems during transition.

---

## Design Philosophy

This feature shouldn't exist. In a perfect world, BerthCare is the only system.

But we live in reality. Organizations have legacy systems. We need to coexist during transition. So we build the simplest possible bridge—then work to make it obsolete.

**The principle:** If you need a manual, the design has failed.

---

## What We're Building

Three interactions. That's it.

1. **Import client roster** - Drag CSV, see preview, click import
2. **Export visit data** - Happens automatically at 6 PM daily
3. **Manual export** - When someone needs historical data

No configuration. No field mapping. No integration wizards. No API keys.

---

## What We're Not Building

We said no to everything else:

- Complex ETL pipelines
- Real-time bidirectional sync
- Custom integrations per client
- FHIR/HL7 complexity
- API marketplace
- Webhook configurations
- Data transformation wizards
- Field mapping interfaces

**Why?** Because complexity kills adoption. This is a temporary bridge, not a permanent platform.

---

## User Experience

### Import Client Roster

**The flow:**

1. Open BerthCare web portal
2. Drag CSV file onto screen
3. See preview: "142 clients ready to import"
4. Click "Import"
5. Done

**Time:** 30 seconds

**File format:** Standard CSV with required fields

```csv
first_name,last_name,date_of_birth,address,phone
Margaret,Thompson,1943-05-12,"123 Oak St, Calgary",403-555-0123
```

No field mapping. No data transformation. Standard fields only.

### Daily Export

**The flow:**

1. System generates PDF at 6 PM
2. System emails PDF to coordinator
3. Done

**User action required:** None

**Email content:**

```
Subject: Daily Visit Summary - October 6, 2025

45 visits completed
3 visits in progress
0 visits missed
Total hours: 33.5

Detailed report attached (PDF)
```

### Manual Export

**The flow:**

1. Select date range
2. Choose format (PDF or CSV)
3. Click "Export"
4. Download starts immediately

**Time:** 5 seconds

No queues. No "we'll email you when ready." Instant download.

---

## Visual Design

### Import Screen

**Initial state:**

```
┌─────────────────────────────────────┐
│                                     │
│     ┌─────────────────────────┐    │
│     │                         │    │
│     │   Drag CSV file here    │    │
│     │                         │    │
│     └─────────────────────────┘    │
│                                     │
│ Required: first_name, last_name,    │
│ date_of_birth, address              │
│                                     │
│ [Download sample CSV]               │
└─────────────────────────────────────┘
```

**After file drop:**

```
┌─────────────────────────────────────┐
│ ✓ 142 clients ready                │
│ ⚠ 3 warnings                        │
│ ✕ 2 errors                          │
│                                     │
│ Warnings (will import):             │
│ • John Doe: Missing phone           │
│ • Jane Smith: Invalid postal code   │
│                                     │
│ Errors (won't import):              │
│ • Row 45: Missing last name         │
│ • Row 67: Invalid date format       │
│                                     │
│ [Cancel]        [Import 142]        │
└─────────────────────────────────────┘
```

**Design principle:** Show what will happen. Let admin decide. Don't block on warnings.

### Export Screen

**Manual export:**

```
┌─────────────────────────────────────┐
│ Export Data                         │
│                                     │
│ [Oct 1, 2025] to [Oct 6, 2025]     │
│                                     │
│ ○ PDF (for printing)                │
│ ● CSV (for spreadsheets)            │
│                                     │
│ [Cancel]              [Export]      │
└─────────────────────────────────────┘
```

**Design principle:** Minimal options. Instant download. No configuration.

### Daily Email

**Subject:** Daily Visit Summary - October 6, 2025

**Body:**

```
45 visits completed
3 visits in progress
0 visits missed
Total hours: 33.5

Detailed report attached (PDF)
```

**Design principle:** Scannable at a glance. Detailed report for those who need it.

---

## Interaction Design

### Import Flow

**State 1: Empty**

- Large drop zone (300px height)
- Clear instructions
- Sample CSV download link
- No distractions

**State 2: Validating**

- Progress indicator
- "Checking 142 rows..."
- Takes <2 seconds for 500 rows

**State 3: Preview**

- Summary at top (success/warning/error counts)
- Expandable details for warnings/errors
- Primary action: "Import [count]"
- Secondary action: "Cancel"

**State 4: Importing**

- Progress bar
- "Importing 142 clients..."
- Takes <5 seconds for 500 rows

**State 5: Complete**

- Success message
- "142 clients imported"
- Auto-dismiss after 3 seconds

### Export Flow

**Manual export:**

- Date picker (defaults to last 7 days)
- Format toggle (PDF/CSV)
- Single "Export" button
- Download starts immediately
- No loading states needed (<1 second)

**Daily export:**

- Happens automatically at 6 PM
- No user interaction
- Email sent to coordinator list
- Failure notification if email fails

### Error States

**Import errors:**

- Show specific row numbers
- Explain what's wrong
- Suggest how to fix
- Allow partial import (skip error rows)

**Export errors:**

- "No visits found for this date range"
- "Export too large (>10,000 visits). Try smaller range."
- Clear, actionable messages

---

## Design System Application

### Typography

**Import screen:**

- Heading: 24px, semibold
- Instructions: 16px, regular
- Error messages: 14px, medium
- Row details: 14px, regular

**Export screen:**

- Heading: 24px, semibold
- Date labels: 14px, medium
- Format options: 16px, regular

**Email:**

- Subject: System default
- Body: 16px, regular, monospace for numbers
- Attachment name: 14px, regular

### Color

**Status indicators:**

- Success: Green (#10B981)
- Warning: Amber (#F59E0B)
- Error: Red (#EF4444)
- Neutral: Gray (#6B7280)

**Interactive elements:**

- Primary button: Brand blue
- Drop zone: Light gray background, dashed border
- Drop zone (hover): Slightly darker gray
- Drop zone (active): Brand blue tint

### Spacing

**Import screen:**

- Drop zone: 48px padding
- Section spacing: 32px
- List item spacing: 16px
- Button spacing: 16px

**Export screen:**

- Form spacing: 24px between fields
- Button spacing: 16px
- Modal padding: 32px

### Motion

**Import:**

- File drop: 200ms ease-out scale animation
- Validation: Spinner rotation
- Success: 300ms fade-in with subtle scale
- Auto-dismiss: 200ms fade-out

**Export:**

- Button press: 100ms scale down
- Download start: Immediate (no animation)

**Principle:** Motion confirms action. Never decorative.

---

## Accessibility

### Import Screen

**Keyboard navigation:**

- Tab to drop zone
- Enter/Space to open file picker
- Tab through preview items
- Enter to confirm import

**Screen reader:**

- Drop zone: "Drop CSV file here, or press Enter to browse"
- Preview: "142 clients ready to import, 3 warnings, 2 errors"
- Each error: "Row 45: Missing last name"
- Success: "Import complete. 142 clients added."

**Visual:**

- High contrast borders on drop zone
- Clear focus indicators
- Error messages in red with icons (not color alone)
- Success messages in green with icons

### Export Screen

**Keyboard navigation:**

- Tab through date pickers
- Arrow keys to select format
- Enter to export

**Screen reader:**

- Date range: "From October 1, 2025 to October 6, 2025"
- Format: "PDF selected. For printing and records."
- Export button: "Export 45 visits as PDF"

**Visual:**

- Clear focus indicators on all controls
- Large touch targets (44px minimum)
- High contrast text

### Email

**Plain text version included**
**Links clearly labeled**
**Attachment name descriptive: "BerthCare-Daily-Summary-2025-10-06.pdf"**

---

## Responsive Design

### Import Screen

**Desktop (>1024px):**

- Drop zone: 600px wide, 300px tall
- Preview: Two columns (warnings | errors)
- Buttons: Right-aligned

**Tablet (768-1024px):**

- Drop zone: Full width, 250px tall
- Preview: Single column
- Buttons: Right-aligned

**Mobile (<768px):**

- Drop zone: Full width, 200px tall
- Preview: Single column, scrollable
- Buttons: Full width, stacked

### Export Screen

**Desktop:**

- Modal: 500px wide, centered
- Date pickers: Side by side
- Format: Radio buttons horizontal

**Tablet:**

- Modal: 90% width, centered
- Date pickers: Side by side
- Format: Radio buttons horizontal

**Mobile:**

- Modal: Full screen
- Date pickers: Stacked
- Format: Radio buttons vertical
- Buttons: Full width

---

## Performance

### Import

**Target:**

- Validate 500 rows: <2 seconds
- Import 500 rows: <5 seconds
- Total time: <10 seconds

**Optimization:**

- Parse CSV in chunks
- Validate in background
- Show progress for >100 rows

### Export

**Target:**

- Generate PDF: <3 seconds for 100 visits
- Generate CSV: <1 second for 1000 visits
- Download start: Immediate

**Optimization:**

- Pre-generate daily PDFs at 6 PM
- Stream large CSV files
- Compress PDFs for email

### Daily Email

**Target:**

- Send time: 6:00 PM ±5 minutes
- Delivery: <30 seconds
- Reliability: 99.9%

**Optimization:**

- Queue emails for batch sending
- Retry failed sends (3 attempts)
- Alert admin if batch fails

---

## Edge Cases

### Import

**Empty file:**

- Show: "File is empty. Download sample CSV?"

**Wrong format:**

- Show: "File must be CSV format"

**Missing required columns:**

- Show: "Missing required columns: last_name, date_of_birth"

**Duplicate clients:**

- Skip duplicates (match on name + DOB)
- Show: "3 duplicates skipped"

**Large file (>10,000 rows):**

- Show: "File too large. Maximum 10,000 clients per import."

### Export

**No visits in date range:**

- Show: "No visits found for this date range"

**Date range too large (>90 days):**

- Show: "Date range too large. Maximum 90 days."

**Export too large (>10,000 visits):**

- Show: "Export too large. Try a smaller date range."

### Daily Email

**No visits today:**

- Still send email: "0 visits completed today"

**Email delivery fails:**

- Retry 3 times
- Alert admin if all retries fail
- Store PDF for manual download

---

## Success Metrics

**Import:**

- Time to import 500 clients: <10 seconds
- Error rate: <5% of rows
- User success: 95% complete without help

**Export:**

- Daily email delivery: 100% on time
- Manual export time: <5 seconds
- coordinator satisfaction: 80%+ find reports useful

**Adoption:**

- 90% of organizations import clients in first week
- 80% of coordinators use daily reports
- <5 support tickets per month after first month

---

## Future Vision

### Phase 2 (Months 7-12)

- Direct database integration (read-only)
- Real-time data push (one-way)
- FHIR API (if required for compliance)

### Phase 3 (Year 2+)

- BerthCare becomes the system of record
- No exports needed
- No imports needed
- This feature disappears

**Goal:** Make this feature obsolete within 12 months.

---

## Design Principles Applied

**"Simplicity is the ultimate sophistication"**

- Drag-and-drop import. Automatic daily export. No configuration.

**"If users need a manual, the design has failed"**

- Drop zone is self-explanatory. Export is two clicks. Email is automatic.

**"The best interface is no interface"**

- Daily export happens automatically. No user action required.

**"Say no to 1,000 things"**

- No field mapping. No sync engines. No API configuration. Just CSV and PDF.

**"Focus is about saying no"**

- We said no to complex integrations. We said yes to simple batch operations.

**"This is a temporary bridge"**

- The vision is BerthCare as the only system. This feature should disappear.

---

**This feature exists to enable adoption, not to be permanent. We'll make it work flawlessly, then work to make it unnecessary.**
