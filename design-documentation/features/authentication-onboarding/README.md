# Authentication & Onboarding

> **Design Philosophy**: If users need a manual, the design has failed. This authentication experience eliminates unnecessary complexity and makes getting started feel magical.

## Overview

BerthCare's authentication and onboarding experience is designed to get home care caregivers documenting visits within 60 seconds of first launch. We've eliminated traditional multi-step registration flows in favor of a streamlined, role-aware system that recognizes users are often starting their shift and need immediate access.

**Core Principle**: The best interface is no interface. Authentication should be invisible, onboarding should be instant, and users should feel productive from moment one.

---

## User Experience Strategy

### Primary User Goals

1. **Get to work immediately** - No lengthy setup processes blocking access to patient documentation
2. **Feel confident using the app** - Intuitive design that requires zero training
3. **Trust the security** - Biometric authentication that feels both secure and effortless
4. **Understand their role** - Clear context about what they can do and why

### Design Decisions

#### What We're Eliminating

- ❌ Traditional username/password creation flows
- ❌ Multi-screen registration wizards
- ❌ Email verification delays
- ❌ Lengthy terms of service screens
- ❌ Tutorial carousels that users skip
- ❌ Unnecessary profile setup steps

#### What We're Embracing

- ✓ Pre-provisioned accounts (admin creates, user activates)
- ✓ Biometric-first authentication (Face ID/Touch ID/fingerprint)
- ✓ Contextual just-in-time guidance
- ✓ Progressive disclosure of features
- ✓ Single-screen activation experience
- ✓ Immediate value delivery

---

## Information Architecture

### Authentication Flow

```
App Launch
    ↓
[First Time] → Account Activation (60 seconds)
    ↓
Biometric Setup (15 seconds)
    ↓
Role Confirmation (5 seconds)
    ↓
→ Patient List (Ready to work)

[Returning] → Biometric Auth (2 seconds)
    ↓
→ Patient List (Instant access)
```

### Role-Based Entry Points

**Frontline Care Worker (Primary Persona)**

- Direct to patient schedule
- Quick-access documentation shortcuts
- Offline mode indicator prominent

**Care coordinator**

- Team overview dashboard
- Urgent alerts front and center
- Communication tools accessible

**Family Member**

- Loved one's care summary
- Visit history timeline
- Simple contact options

---

## Screen-by-Screen Specifications

### Screen 1: Welcome & Activation

**Purpose**: Transform a pre-provisioned account into an active, personalized experience in under 60 seconds.

#### Visual Design

**Layout Structure**

```
┌─────────────────────────────┐
│                             │
│      [BerthCare Logo]       │
│                             │
│    Welcome, Sarah           │
│                             │
│  [Activation Code Input]    │
│  ┌─────────────────────┐   │
│  │  _ _ _ _ - _ _ _ _  │   │
│  └─────────────────────┘   │
│                             │
│  Received from your         │
│  care coordinator           │
│                             │
│    [Continue Button]        │
│                             │
│                             │
│  Need help? Contact support │
│                             │
└─────────────────────────────┘
```

**Visual Specifications**

- **Background**: Soft gradient from `#FFFFFF` to `#F8FAFB` (barely perceptible, creates depth without distraction)
- **Logo**: 64px height, centered, 80px from top
- **Welcome Text**:
  - Font: SF Pro Display Semibold (iOS) / Roboto Medium (Android)
  - Size: 28px
  - Color: `#1A1A1A`
  - Spacing: 24px below logo
- **Activation Code Input**:
  - 8-character format with auto-hyphen (####-####)
  - Large touch targets: 48px height per character
  - Active state: `#0066CC` border, 2px
  - Inactive state: `#E5E5E5` border, 1px
  - Auto-advance between characters
  - Paste detection for full code
- **Continue Button**:
  - Full-width minus 32px margins
  - Height: 56px (easy thumb reach)
  - Background: `#0066CC` (primary brand)
  - Text: White, 17px, SF Pro Text Semibold
  - Corner radius: 12px
  - Disabled state: `#E5E5E5` background, `#999999` text
  - Active state: Subtle scale animation (0.98x on press)

**Interaction Specifications**

1. **On Launch**:
   - Fade in logo (300ms ease-out)
   - Slide up content (400ms ease-out, 100ms delay)
   - Auto-focus activation code input
   - Show keyboard immediately

2. **Code Entry**:
   - Auto-advance to next character on input
   - Auto-submit when 8 characters entered
   - Haptic feedback on each character (light impact)
   - Error shake animation if invalid (400ms, 3 cycles)

3. **Validation**:
   - Show inline loading indicator (spinner in button)
   - Success: Immediate transition to biometric setup (no confirmation screen)
   - Error: Shake animation + clear message below input
   - Network error: Offline mode explanation with retry option

**Accessibility**

- VoiceOver: "Welcome to BerthCare. Enter your 8-character activation code received from your care coordinator."
- Dynamic Type: Supports up to XXL text sizes
- High Contrast: Border widths increase to 3px
- Keyboard Navigation: Tab order follows visual hierarchy

**Edge Cases**

- **No activation code**: "Contact your care coordinator" link opens in-app support chat
- **Expired code**: Clear message with "Request new code" action
- **Already activated**: Redirect to biometric setup or login
- **Offline activation**: Queue for sync, allow limited offline setup

---

### Screen 2: Biometric Setup

**Purpose**: Establish secure, frictionless authentication in 15 seconds.

#### Visual Design

**Layout Structure**

```
┌─────────────────────────────┐
│                             │
│    [Face ID Icon]           │
│                             │
│   Quick & Secure Access     │
│                             │
│  Use Face ID to sign in     │
│  instantly and keep your    │
│  patient data secure        │
│                             │
│   [Enable Face ID Button]   │
│                             │
│                             │
│   Use passcode instead      │
│                             │
└─────────────────────────────┘
```

**Visual Specifications**

- **Biometric Icon**:
  - 80px diameter circle
  - Animated gradient background (`#0066CC` to `#0052A3`)
  - Face ID/Touch ID/Fingerprint icon in white
  - Subtle pulse animation (2s cycle, infinite)
- **Headline**:
  - Font: SF Pro Display Semibold, 24px
  - Color: `#1A1A1A`
  - Center aligned
- **Description**:
  - Font: SF Pro Text Regular, 17px
  - Color: `#666666`
  - Line height: 1.5
  - Max width: 280px, center aligned
- **Primary Button**: Same specs as Screen 1
- **Secondary Link**:
  - Font: SF Pro Text Regular, 15px
  - Color: `#0066CC`
  - No background, no border
  - Underline on press

**Interaction Specifications**

1. **On Entry**:
   - Detect device biometric capability
   - Show appropriate icon (Face ID/Touch ID/Fingerprint)
   - If no biometric available, skip to passcode setup

2. **Enable Biometric**:
   - Trigger native biometric prompt immediately
   - Success: Haptic success feedback + checkmark animation
   - Failure: Allow retry with clear error message
   - After 2 failures: Suggest passcode alternative

3. **Passcode Alternative**:
   - 6-digit numeric passcode
   - Confirm by re-entry
   - Strength indicator (must not be 123456, 000000, etc.)

**Accessibility**

- VoiceOver: "Enable Face ID for quick and secure access. Your patient data will be protected."
- Alternative text for icons based on device capability
- Support for assistive touch and switch control

**Edge Cases**

- **Biometric enrollment fails**: Graceful fallback to passcode
- **User declines biometric**: Remember preference, don't ask again
- **Device doesn't support biometric**: Skip directly to passcode
- **Corporate policy requires passcode**: Respect MDM settings

---

### Screen 3: Role Confirmation

**Purpose**: Set user expectations and personalize the experience in 5 seconds.

#### Visual Design

**Layout Structure**

```
┌─────────────────────────────┐
│                             │
│   [Checkmark Animation]     │
│                             │
│   You're all set, Sarah!    │
│                             │
│   Your role:                │
│   Home Care caregiver           │
│                             │
│   You can:                  │
│   • Document patient visits │
│   • Update care plans       │
│   • Communicate with team   │
│                             │
│   [Start Working Button]    │
│                             │
└─────────────────────────────┘
```

**Visual Specifications**

- **Success Animation**:
  - Checkmark in circle, 64px
  - Animated draw (500ms) + scale bounce (300ms)
  - Color: `#00C853` (success green)
- **Personalized Greeting**:
  - Font: SF Pro Display Semibold, 24px
  - Color: `#1A1A1A`
- **Role Badge**:
  - Pill shape, `#F0F4F8` background
  - Font: SF Pro Text Medium, 15px
  - Color: `#0066CC`
  - Padding: 8px 16px
- **Capability List**:
  - Font: SF Pro Text Regular, 15px
  - Color: `#333333`
  - Bullet points with 16px spacing
  - Icons next to each capability (16px, `#0066CC`)

**Interaction Specifications**

1. **On Entry**:
   - Play success animation
   - Fade in content sequentially (stagger 100ms)
   - Auto-advance after 3 seconds OR user tap

2. **Start Working**:
   - Smooth transition to main app (400ms cross-fade)
   - Pre-load patient list in background
   - Show loading skeleton if data not ready

**Accessibility**

- VoiceOver: "Setup complete. You're all set, Sarah. Your role is Home Care caregiver. You can document patient visits, update care plans, and communicate with your team."
- Skip button for users who want immediate access

**Edge Cases**

- **Multiple roles**: Show primary role, mention "and more" with details in profile
- **Restricted permissions**: Clearly communicate limitations
- **Offline setup**: Show "Will sync when online" message

---

### Screen 4: First-Time Experience (Contextual Guidance)

**Purpose**: Provide just-in-time guidance without blocking workflow.

#### Design Approach

**No traditional tutorial**. Instead, use:

1. **Contextual Tooltips**
   - Appear on first interaction with key features
   - Dismissible with single tap
   - Never block the interface
   - Maximum 8 words per tooltip

2. **Empty States with Guidance**
   - Patient list empty? Show "Your schedule will appear here"
   - No messages? Show "Team messages appear here"
   - Clear next action in every empty state

3. **Progressive Feature Discovery**
   - Unlock advanced features after basic proficiency
   - Celebrate milestones ("First visit documented! 🎉")
   - Suggest next steps based on usage patterns

**Visual Specifications**

- **Tooltip Style**:
  - Background: `#1A1A1A` with 95% opacity
  - Text: White, SF Pro Text Regular, 15px
  - Padding: 12px 16px
  - Corner radius: 8px
  - Pointer arrow: 8px, pointing to relevant UI element
  - Drop shadow: 0 4px 12px rgba(0,0,0,0.15)

**Interaction Specifications**

- Appear with 300ms fade + slight scale (0.95 to 1.0)
- Auto-dismiss after 5 seconds OR user tap
- Never show same tooltip twice
- Maximum 3 tooltips per session

---

## Authentication States & Transitions

### Biometric Authentication (Returning Users)

**Launch to Ready: 2 seconds**

```
App Launch
    ↓
Splash Screen (500ms)
    ↓
Biometric Prompt (automatic)
    ↓
Success → Patient List (500ms transition)
```

**Visual Design**

- **Splash Screen**:
  - BerthCare logo on white background
  - Subtle fade-in animation
  - Pre-load critical data in background

- **Biometric Prompt**:
  - Native iOS/Android biometric UI
  - Custom fallback UI if needed
  - Clear "Cancel" option returns to passcode

**Error Handling**

- **Biometric Fails**:
  - Allow 3 attempts
  - After 3 failures: Require passcode
  - Clear message: "Face ID not recognized. Use passcode?"

- **Biometric Unavailable**:
  - Automatic fallback to passcode
  - No error message (seamless transition)

### Session Management

**Session Duration**

- **Active Use**: Infinite (while app is in use)
- **Background**: 30 minutes before re-auth required
- **Overnight**: Always require re-auth next day

**Re-authentication Triggers**

- App backgrounded for >30 minutes
- Device locked and unlocked
- Sensitive action (e.g., viewing full patient record)
- User manually logs out

**Seamless Re-auth**

- Biometric prompt appears over current screen
- Success: Resume exactly where user left off
- Failure: Return to login, preserve app state

---

## Role-Specific Onboarding Variations

### Frontline Care Worker

**Focus**: Get to patient documentation immediately

**Onboarding Emphasis**:

- Offline capabilities highlighted
- Quick documentation shortcuts shown first
- Smart data reuse feature introduced on second visit

**First Action Prompt**: "Ready to document your first visit?"

### Care coordinator

**Focus**: Team oversight and communication

**Onboarding Emphasis**:

- Team dashboard overview
- Alert management introduction
- Communication tools highlighted

**First Action Prompt**: "Your team's schedule is ready to review"

### Family Member

**Focus**: Understanding care transparency

**Onboarding Emphasis**:

- Privacy and security explanation
- What information they can see (and can't)
- How to contact care team

**First Action Prompt**: "View your loved one's recent care visits"

---

## Technical Implementation Guidelines

### State Management

**Authentication State**

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  biometricEnabled: boolean;
  sessionExpiry: Date | null;
  requiresReauth: boolean;
}
```

**Onboarding State**

```typescript
interface OnboardingState {
  isComplete: boolean;
  currentStep: 'activation' | 'biometric' | 'role' | 'complete';
  hasSeenTooltips: string[]; // IDs of dismissed tooltips
  firstVisitDocumented: boolean;
}
```

### Security Requirements

**Token Management**

- Access token: 1-hour expiry
- Refresh token: 30-day expiry, secure storage
- Biometric tokens: Device keychain only
- Automatic token refresh in background

**Data Protection**

- All auth data in device secure enclave
- No credentials stored in plain text
- Biometric data never leaves device
- Session tokens encrypted at rest

**Compliance**

- HIA (Health Information Act) compliant
- PIPEDA privacy standards
- SOC 2 Type II requirements
- Audit trail for all auth events

### Performance Targets

**Critical Metrics**

- App launch to biometric prompt: <500ms
- Biometric auth to patient list: <2 seconds total
- Activation flow completion: <60 seconds average
- First-time setup to first action: <90 seconds

**Optimization Strategies**

- Pre-load patient list during biometric auth
- Cache user role and permissions locally
- Lazy load non-critical features
- Progressive image loading for profile photos

### Offline Capabilities

**Offline Activation**

- Allow activation code entry offline
- Queue validation for when online
- Provide limited offline access during setup
- Clear communication about sync status

**Offline Authentication**

- Biometric works offline (device-level)
- Cached credentials for offline access
- Sync auth events when connection restored
- Offline session limit: 8 hours

---

## Animation & Motion Specifications

### Transition Timing

**Philosophy**: Animations should feel instant yet smooth. Nothing should feel sluggish.

**Timing Functions**

- **Ease-out**: Default for most transitions (feels responsive)
- **Spring**: For interactive elements (feels natural)
- **Linear**: For progress indicators only

**Duration Scale**

- **Instant**: 100ms - Feedback for taps
- **Quick**: 200-300ms - Screen transitions
- **Standard**: 400ms - Complex animations
- **Slow**: 600ms+ - Only for celebration moments

### Key Animations

**Success Checkmark**

```
Duration: 800ms total
  0-500ms: Draw checkmark path (ease-out)
  500-800ms: Scale bounce (spring, 1.0 → 1.2 → 1.0)
```

**Screen Transitions**

```
Duration: 400ms
  Outgoing: Fade to 0 opacity + scale to 0.95 (ease-out)
  Incoming: Fade from 0 + scale from 1.05 (ease-out)
  Overlap: 100ms (creates smooth crossfade)
```

**Button Press**

```
Duration: 100ms
  Press: Scale to 0.98 (ease-out)
  Release: Scale to 1.0 (spring)
  Haptic: Light impact on press
```

**Error Shake**

```
Duration: 400ms
  Translate X: 0 → -10 → 10 → -10 → 0 (ease-in-out)
  Cycles: 3
  Haptic: Error notification on start
```

### Haptic Feedback

**iOS Haptic Engine**

- **Light Impact**: Button taps, character entry
- **Medium Impact**: Successful actions
- **Heavy Impact**: Errors, important alerts
- **Success Notification**: Activation complete
- **Error Notification**: Invalid code, auth failure

**Android Vibration**

- **Short (10ms)**: Button taps
- **Medium (50ms)**: Successful actions
- **Pattern**: Errors (50ms, 100ms pause, 50ms)

---

## Accessibility Compliance

### WCAG 2.1 AA Standards

**Visual Accessibility**

- **Color Contrast**: Minimum 4.5:1 for text, 3:1 for UI components
- **Text Size**: Support Dynamic Type up to 200% scaling
- **Touch Targets**: Minimum 44x44pt (iOS) / 48x48dp (Android)
- **Focus Indicators**: 2px border, high contrast color

**Screen Reader Support**

- **VoiceOver/TalkBack**: Full navigation support
- **Semantic Labels**: Descriptive labels for all interactive elements
- **Announcements**: State changes announced clearly
- **Reading Order**: Logical flow matching visual hierarchy

**Motor Accessibility**

- **Large Touch Targets**: All buttons minimum 56px height
- **Spacing**: Minimum 8px between interactive elements
- **Alternative Input**: Full keyboard navigation support
- **Voice Control**: Compatible with voice navigation

**Cognitive Accessibility**

- **Simple Language**: 8th-grade reading level maximum
- **Clear Instructions**: One action per instruction
- **Error Messages**: Plain language with clear resolution steps
- **Consistent Patterns**: Same interactions work the same way everywhere

### Testing Requirements

- Test with VoiceOver/TalkBack enabled
- Test with 200% text scaling
- Test with high contrast mode
- Test with voice control only
- Test with switch control (motor impairment simulation)

---

## Quality Assurance Checklist

### Design System Compliance

- [ ] All colors from approved palette
- [ ] Typography follows scale and hierarchy
- [ ] Spacing uses 8px grid system
- [ ] Components match design system specs
- [ ] Animations follow motion guidelines

### UX Validation

- [ ] User can complete activation in <60 seconds
- [ ] Biometric setup takes <15 seconds
- [ ] Returning user login takes <2 seconds
- [ ] No dead ends or unclear next steps
- [ ] Error messages are helpful and actionable
- [ ] Offline mode clearly communicated

### Accessibility Compliance

- [ ] WCAG 2.1 AA color contrast met
- [ ] VoiceOver/TalkBack fully functional
- [ ] Dynamic Type supported
- [ ] Touch targets meet minimum size
- [ ] Keyboard navigation works
- [ ] High contrast mode supported

### Technical Validation

- [ ] Biometric auth works on all supported devices
- [ ] Offline activation queues properly
- [ ] Session management handles edge cases
- [ ] Token refresh works seamlessly
- [ ] Performance targets met
- [ ] Security requirements satisfied

### Platform-Specific

- [ ] iOS: Face ID/Touch ID integration correct
- [ ] iOS: Safe area handling for notch devices
- [ ] Android: Fingerprint/face unlock integration
- [ ] Android: Back button behavior correct
- [ ] Both: Handles app backgrounding properly
- [ ] Both: Respects system accessibility settings

---

## Success Metrics

### Primary Metrics

- **Time to First Action**: <90 seconds from app launch to first productive action
- **Activation Completion Rate**: >95% of users complete activation
- **Biometric Adoption**: >85% of users enable biometric auth
- **Authentication Success Rate**: >99% successful logins
- **User Satisfaction**: >4.5/5 rating for onboarding experience

### Secondary Metrics

- **Support Tickets**: <2% of users need activation help
- **Biometric Failure Rate**: <1% of auth attempts fail
- **Session Re-auth Frequency**: <3 times per 8-hour shift
- **Tooltip Engagement**: >70% of users interact with contextual guidance
- **Feature Discovery**: >80% of users find key features within first week

### Long-term Indicators

- **Retention**: >90% of activated users remain active after 30 days
- **Login Frequency**: Average 5+ logins per day for frontline workers
- **Biometric Preference**: <5% of users switch back to passcode
- **Onboarding Abandonment**: <1% of users abandon during setup

---

## Future Enhancements (Post-MVP)

### Phase 2 Considerations

Only ship enhancements that keep activation under 60 seconds and remove friction. Candidates (all behind aggressive validation gates):

- **Biometric Re-enrollment**: A single-tap recovery flow when devices reset
- **Ambient Session Health**: Silent checks that keep caregivers logged in without prompts while maintaining security

Everything else—SSO, personalization, multi-device—stays parked unless we can prove it shortens time-to-care.

### Innovation Opportunities

Prototype ideas in design lab only. Do not put on the roadmap until they beat the current experience:

- **Zero-Touch Onboarding**: Coordinator taps their device to provision a new phone in seconds
- **Predictive Pre-loading**: Intelligent prefetch that makes the next visit appear before the caregiver asks

---

## Design Rationale

### Why No Traditional Registration?

**Problem**: Traditional registration flows create friction and delay value delivery.

**Solution**: Pre-provisioned accounts mean users are expected and welcomed, not interrogated. The care coordinator handles administrative setup; the user just activates and starts working.

**Impact**: 60-second activation vs. 5-10 minute traditional registration.

### Why Biometric-First?

**Problem**: Passwords are forgotten, insecure, and slow to enter.

**Solution**: Biometric authentication is faster, more secure, and feels magical. It's the standard users expect from modern apps.

**Impact**: 2-second login vs. 15-30 second password entry.

### Why No Tutorial Carousel?

**Problem**: Users skip tutorials, then feel lost. Tutorials delay getting to actual work.

**Solution**: Contextual, just-in-time guidance appears exactly when needed. Empty states teach through use, not through reading.

**Impact**: Users start working immediately, learn by doing, retain knowledge better.

### Why Role Confirmation Screen?

**Problem**: Users need to understand what they can do and why.

**Solution**: Brief confirmation screen sets expectations and personalizes the experience. It's a moment of clarity, not a barrier.

**Impact**: Reduced confusion, fewer support tickets, better feature discovery.

---

## Developer Handoff Notes

### Implementation Priority

1. **P0 - Critical Path**: Activation flow, biometric setup, basic auth
2. **P1 - Core Experience**: Role confirmation, contextual tooltips, session management
3. **P2 - Polish**: Advanced animations, haptic feedback, edge case handling

### Key Integration Points

- **Backend API**: `/auth/activate`, `/auth/biometric/register`, `/auth/token/refresh`
- **Device APIs**: Biometric (Face ID/Touch ID/Fingerprint), Keychain/Keystore, Haptics
- **Analytics**: Track activation funnel, auth success rates, time-to-first-action
- **Error Logging**: Capture auth failures, activation errors, session issues

### Testing Scenarios

1. **Happy Path**: New user activates, enables biometric, starts working
2. **Biometric Unavailable**: User completes setup with passcode only
3. **Offline Activation**: User activates without network, syncs later
4. **Session Expiry**: User returns after 30 minutes, re-authenticates seamlessly
5. **Multiple Roles**: User with coordinator + caregiver roles sees appropriate experience
6. **Accessibility**: Complete flow with VoiceOver, large text, high contrast

### Performance Monitoring

- Track P95 latency for each screen transition
- Monitor biometric auth success/failure rates
- Alert on activation completion rate drops
- Dashboard for time-to-first-action metrics

---

**Last Updated**: January 2025  
**Design Owner**: UX/UI Design Team  
**Status**: Ready for Development  
**Version**: 1.0
