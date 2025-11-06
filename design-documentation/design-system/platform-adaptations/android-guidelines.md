# Android Platform Guidelines

**Philosophy:** Feel native. BerthCare should feel like it belongs on Android.

---

## Material Design Compliance

### Material Design 3 Principles

- Use Material Icons
- Implement Material ripple effects
- Follow Material navigation patterns
- Use Roboto font family
- Respect system navigation
- Support Material You (dynamic colors)

---

## Navigation Patterns

### Linear Flow

- Single-activity architecture with fragments for Today and Visit
- Use Material top app bar only to surface the back arrow when gesture navigation is unavailable
- No bottom navigation, drawers, or rail components
- Keep action icons to a maximum of one contextual item (e.g., overflow for alert history if ever introduced)

### System Back

- Always handle the hardware back button
- From Visit → Today
- From Today → exit app (with confirmation only if unsynced data exists)

---

## Components

### Buttons

- Rounded corners (8dp radius)
- Minimum height: 48dp
- Material ripple effect
- Roboto font, Medium weight
- Elevation changes on press

### Cards

- Elevation: 1dp default
- Corner radius: 8dp
- Ripple on tap
- Can be elevated on hover

### FAB (Floating Action Button)

- Size: 56dp × 56dp
- Elevation: 6dp
- Ripple effect
- Position: 16dp from edges

---

## Material Ripple

```kotlin
// Bounded ripple (within view)
android:background="?attr/selectableItemBackground"

// Unbounded ripple (circular, extends beyond view)
android:background="?attr/selectableItemBackgroundBorderless"

// Custom ripple color
<ripple android:color="@color/primary_ripple">
    <item android:drawable="@color/surface"/>
</ripple>
```

---

## Elevation & Shadows

```
Resting elevation:
- Cards: 1dp
- FAB: 6dp
- App bar: 0dp (4dp when scrolled)
- Modal: 8dp
- Dialog: 24dp

Raised elevation (pressed):
- Cards: 2dp
- FAB: 12dp
- Buttons: 2dp
```

---

## Gestures

### Standard Gestures

- **Tap:** Primary action
- **Long press:** Context menu
- **Swipe:** Navigate, reveal actions
- **Pull down:** Refresh
- **Swipe from edge:** Navigation drawer

### System Gestures

- **Back:** Previous screen
- **Home:** Exit to home
- **Recent:** App switcher

---

## Haptics

```kotlin
// Light vibration - button taps
view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)

// Medium vibration - selections
view.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)

// Heavy vibration - errors
view.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)

// Custom vibration
val vibrator = getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
vibrator.vibrate(VibrationEffect.createOneShot(10, VibrationEffect.DEFAULT_AMPLITUDE))
```

---

## System Bars

### Status Bar

- Height: 24dp
- Transparent or colored
- Light/dark icons based on background

### Navigation Bar

- Height: 48dp (3-button) or gesture area
- Transparent or colored
- Respect gesture navigation

```kotlin
// Edge-to-edge
WindowCompat.setDecorFitsSystemWindows(window, false)

// Insets
ViewCompat.setOnApplyWindowInsetsListener(view) { v, insets ->
    val systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
    v.setPadding(systemBars.left, systemBars.top, systemBars.right, systemBars.bottom)
    insets
}
```

---

## Material You (Dynamic Colors)

```kotlin
// Use dynamic colors (Android 12+)
if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
    dynamicColorScheme(context)
} else {
    // Fallback to static colors
    lightColorScheme(
        primary = Color(0xFF0066CC),
        // ...
    )
}
```

---

## Dark Theme

```kotlin
// Detect dark theme
val isDarkTheme = isSystemInDarkTheme()

// Use Material color scheme
MaterialTheme(
    colorScheme = if (isDarkTheme) darkColorScheme() else lightColorScheme()
) {
    // Content
}
```

---

## Accessibility

### TalkBack

- Content descriptions
- Proper focus order
- Announce state changes
- Custom actions

### Large Text

- Support up to 200% text size
- Use sp for text sizes
- Maintain layout at large sizes

### Touch Targets

- Minimum 48dp × 48dp
- Adequate spacing between targets

---

## Testing Checklist

- [ ] Works with TalkBack
- [ ] Supports large text
- [ ] Hardware back button works
- [ ] Ripple effects work
- [ ] Haptics feel right
- [ ] Dark theme looks good
- [ ] Follows Material Design
- [ ] Uses Material Icons
- [ ] Edge-to-edge layout
- [ ] Respects system navigation

---

**Remember:** Android users expect Material Design. Embrace elevation, ripples, and system integration.
