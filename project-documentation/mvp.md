# MVP Recommendation: "BerthCare" - Mobile Documentation App

## Core Philosophy

**Solve the #1 pain point first**: Eliminate the 50% of shift time wasted on duplicate data entry and after-hours paperwork. Prove ROI in 90 days, then expand.

---

## MVP Feature Set (3-6 Month Build)

### 1. Mobile Point-of-Care Documentation (PRIORITY 1)

**What It Does:**

- Smartphone/tablet app for home care caregivers and aides
- Document during the visit, not back at office
- Works offline, syncs when connected
- Pre-populated templates for common visit types (wound care, medication management, ADL assessment, safety check)

**Core Screens:**

- Today's visit schedule
- Client quick-access (photo, key alerts, recent notes)
- Visit documentation form with smart fields
- Photo capture for wounds/conditions
- Digital signature for service confirmation

**Why This First:** Health PEI showed 50% paperwork reduction from this alone. Biggest bang for buck.

---

### 2. Smart Data Reuse (PRIORITY 1)

**What It Does:**

- "Copy from last visit" button for unchanged information
- Auto-populate vital signs from previous entries (edit only what changed)
- Template library for common scenarios
- "Quick notes" shortcuts (e.g., "wound improving," "medication compliance good")

**Example Workflow:**

```
Opening wound care visit:
- App shows: "Last visit: wound 3cm x 2cm, moderate drainage"
- caregiver taps "Copy & Edit"
- Changes only: "now 2.5cm x 1.8cm, minimal drainage"
- Takes new photo
- Done in 2 minutes vs. 10
```

**Why This First:** Directly addresses "cannot copy/edit repetitive entries forcing complete re-charting."

---

### 3. Basic Care Coordination (PRIORITY 2)

**What It Does:**

- Simple shared care plan visible to all team members
- In-app messaging (care team only)
- Care team directory with roles/contact info
- Flagging system for urgent issues

**Core Components:**

- Care plan summary (one-page view)
- Task assignments ("RN follow-up on lab results")
- Team chat tied to specific client
- Alert system for critical changes

**Why This First:** Addresses communication breakdowns without requiring full system integration.

---

### 4. Simple Family Portal (PRIORITY 2)

**What It Does:**

- Read-only web portal for families
- View visit schedule and completion confirmations
- See care plan summary (plain language)
- Medication list
- Contact care coordinator button

**What It Doesn't Do (Yet):**

- Two-way messaging (Phase 2)
- Full chart access
- Observation logging

**Why This First:** 20% of clients don't know case manager; families need basic visibility. This is table stakes.

---

### 5. Electronic Visit Verification (PRIORITY 2)

**What It Does:**

- GPS check-in/out at client location
- Time tracking automatic
- Task checklist for each visit type
- End-of-visit summary auto-generated

**Why This First:** Solves billing/compliance need while providing baseline data quality. Required for reimbursement.

---

### 6. Export/Import Bridge (PRIORITY 3)

**What It Does (MVP Version):**

- Export visit notes as PDF
- Import client roster from CSV
- Daily summary report email to coordinators
- Basic API hooks for future integration

**What It Doesn't Do:**

- Real-time FHIR sync (Phase 2)
- Bi-directional updates
- Full EHR integration

**Why This First:** Provides immediate value without 12-month integration project. Can coexist with current systems.

---

## What's EXPLICITLY NOT in MVP

**Deferred to Phase 2 (Months 7-12):**

- AI ambient documentation
- Advanced clinical decision support
- InterRAI HC integration
- Automated CIHI reporting
- Predictive analytics
- Full FHIR integration with Connect Care
- Unmet needs systematic capture module

**Rationale:** These require significant development time and system integration. Prove core value proposition first.

---

## Technical Architecture (Keep It Simple)

### Frontend

- React Native (single codebase for iOS/Android)
- Offline-first architecture with local SQLite database
- Automatic background sync when connected

### Backend

- Node.js REST API
- PostgreSQL database
- Standard cloud hosting (AWS/Azure Canada regions)
- Basic role-based access control

### Security

- End-to-end encryption
- Canadian data residency
- Basic audit logging
- SOC 2 compliance pathway

**Cost Estimate:** $150K-250K for 6-month build with 3-4 person team.

---

## MVP User Flows

### Primary Flow: Home Visit Documentation

```
1. caregiver opens app on tablet
2. Sees today's schedule (5 clients)
3. Taps first client → sees quick profile
4. Taps "Start Visit" → GPS check-in automatic
5. Reviews care plan (30 seconds)
6. Documents assessment:
   - Vitals: copies last visit, edits BP only
   - Wound care: takes photo, taps "improving" quick note
   - Medications: checks "all taken as prescribed"
   - Safety: uses pre-filled checklist
7. Client signs on screen
8. Taps "Complete Visit" → GPS check-out
9. Total time: 3 minutes vs. 15 minutes on paper/desktop
```

### Secondary Flow: Care Coordination

```
1. Home care aide notices client seems confused
2. Opens app, finds client
3. Taps "Alert Team" → flags RN
4. Writes quick note: "Client confused about medications"
5. RN gets push notification
6. RN reviews in app, messages physician through platform
7. Decision made, documented in shared care plan
8. All team members see update in real-time
9. Total time: 5 minutes vs. phone tag for hours
```

---

## Success Metrics (90-Day Pilot)

### Primary Metrics

- **Documentation time:** Target <10 minutes per visit (from 15-20 minutes)
- **After-hours charting:** Reduce from 3-5 hours/week to <1 hour/week
- **User adoption:** 80%+ of staff using app for majority of visits
- **Family satisfaction:** 70%+ report feeling better informed

### Secondary Metrics

- Visit completion rate (EVV accuracy)
- Time from issue identification to team response
- Staff satisfaction with documentation tools
- System uptime and sync reliability

---

## Go-To-Market Strategy

### Pilot Site Selection (Month 1-2)

- Choose 1-2 home care zones in Alberta
- 20-30 staff members (caregivers, care aides)
- 100-150 clients
- Mix of urban and rural if possible

### Training Approach (Month 3)

- 2-hour initial training session (not 8 hours)
- Hands-on practice with test accounts
- "Super users" trained first to help peers
- Weekly office hours during first month
- In-app chat support with dev team

### Rollout (Months 4-6)

- Week 1: Read-only access, familiarization
- Week 2: Start documenting non-critical visits
- Week 3: Full documentation in app
- Week 4+: Parallel with old system
- Month 3: Transition fully if metrics positive

### Feedback Loop

- Weekly user surveys (1-2 questions)
- Bi-weekly focus groups
- Bug reports tracked in-app
- Rapid iteration on top pain points

---

## Risk Mitigation

### Technical Risks

**Risk:** Offline sync conflicts
**Mitigation:** Last-write-wins with conflict log; manual review if needed

**Risk:** Device/connectivity issues
**Mitigation:** Paper backup forms for true emergencies; 99% uptime SLA

### Adoption Risks

**Risk:** Staff resistance to change
**Mitigation:** Involve frontline staff in design; show time savings in first week

**Risk:** Poor usability leading to abandonment
**Mitigation:** Weekly UX testing sessions; 48-hour turnaround on critical bugs

### Compliance Risks

**Risk:** Privacy breach
**Mitigation:** Full security audit before launch; encryption; limited data collection

**Risk:** Documentation standards not met
**Mitigation:** Regulatory review of templates; maintain paper option during pilot

---

## Decision Framework: Build vs. Buy

### Consider Building If:

- You have development team/budget ($150-250K)
- Need Alberta-specific customization
- Want to own IP for future expansion
- Timeline is 6+ months acceptable

### Consider Buying If:

- Budget <$150K
- Need deployment in <6 months
- Prefer proven solution
- Limited technical team

**Recommendation:** Given AlayaCare already exists with proven ROI in Canada (Health PEI case study), seriously evaluate purchasing/customizing their platform vs. building from scratch. Your competitive advantage should be workflow innovation, not reinventing mobile apps.

---

## The Honest Assessment

**Building this MVP will take 6 months and $200K minimum.** That gets you a functional mobile app that saves staff 2-3 hours per week each. At 30 staff, that's 60-90 hours/week saved = 1.5-2 FTE capacity added.

**However:** The real transformation requires Phase 2 features (AI documentation, full integration, systematic unmet needs capture). The MVP proves the concept and builds user trust, but won't solve the systemic documentation crisis outlined in your research.

**Alternative path:** Pilot AlayaCare or similar existing platform for $50-100K/year, customize it for Alberta needs, and invest your development resources in the truly novel features (unmet needs capture module, AI integration with Connect Care, policy advocacy tools) that existing vendors don't offer.

**The strategic question:** Are you building a documentation app, or are you building the systematic unmet-needs-capture-and-policy-advocacy tool that doesn't exist anywhere? The former has competitors; the latter could be genuinely transformative.
