# iOS Platform Guidelines

**Philosophy:** Feel native. BerthCare should feel like it belongs on iOS.

---

## iOS Design Language

### Human Interface Guidelines Compliance

- Use SF Symbols for icons
- Follow iOS navigation patterns
- Implement native gestures
- Use system fonts (SF Pro)
- Respect safe areas
- Support Dynamic Type

---

## Navigation Patterns

### Linear Flow

- Use a single `UINavigationController`
- Display the system navigation bar only when the back affordance is required
- Large titles only on the Today screen; Visit screen uses compact title with patient name
- No tab bars, split views, or drawers—ever

### Swipe Back

- Swipe from left edge to go back
- Interactive transition
- Provide the default back arrow for accessibility

---

## Components

### Buttons

- Rounded corners (8pt radius)
- Minimum height: 44pt
- Haptic feedback on tap
- SF Pro font, Semibold

### Lists

- Inset grouped style
- Swipe actions (left/right)
- Disclosure indicators (>)
- Separators (inset)

### Modals

- Sheet presentation
- Drag indicator at top
- Swipe down to dismiss
- Corner radius: 16pt

---

## Gestures

### Standard Gestures

- **Tap:** Primary action
- **Long press:** Context menu
- **Swipe:** Navigate, reveal actions
- **Pinch:** Zoom (where applicable)
- **Pull down:** Refresh

### Custom Gestures

- Avoid conflicting with system gestures
- Provide button alternatives
- Show hints for non-obvious gestures

---

## Haptics

```swift
// Light impact - button taps
UIImpactFeedbackGenerator(style: .light).impactOccurred()

// Medium impact - selections
UIImpactFeedbackGenerator(style: .medium).impactOccurred()

// Heavy impact - errors
UIImpactFeedbackGenerator(style: .heavy).impactOccurred()

// Success notification
UINotificationFeedbackGenerator().notificationOccurred(.success)

// Error notification
UINotificationFeedbackGenerator().notificationOccurred(.error)
```

---

## Safe Areas

```swift
// Respect safe area insets
view.safeAreaLayoutGuide

// Common safe areas:
// - Top: Status bar + notch
// - Bottom: Home indicator
// - Sides: Rounded corners
```

---

## Dynamic Type

```swift
// Support user's text size preference
label.font = UIFont.preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true

// Text styles:
// .largeTitle, .title1, .title2, .title3
// .headline, .body, .callout
// .subheadline, .footnote, .caption1, .caption2
```

---

## Dark Mode

```swift
// Use semantic colors
UIColor.label  // Adapts to light/dark
UIColor.systemBackground
UIColor.secondaryLabel

// Custom colors
UIColor { traitCollection in
    traitCollection.userInterfaceStyle == .dark ? darkColor : lightColor
}
```

---

## Accessibility

### VoiceOver

- Descriptive labels
- Proper traits (button, header, etc.)
- Logical reading order
- Custom actions for complex UI

### Larger Text

- Support up to Accessibility sizes
- Maintain layout at large sizes
- Truncate gracefully

---

## Testing Checklist

- [ ] Works with VoiceOver
- [ ] Supports Dynamic Type
- [ ] Respects safe areas
- [ ] Swipe back works
- [ ] Haptics feel right
- [ ] Dark mode looks good
- [ ] Follows HIG patterns
- [ ] Uses SF Symbols

---

**Remember:** iOS users expect iOS patterns. Don't fight the platform.
