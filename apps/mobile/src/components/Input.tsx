import { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';

import type { BerthcareTheme } from '../design-system';
import { Typography } from './Typography';

type ValidationState = 'default' | 'success' | 'error';

export type InputProps = TextInputProps & {
  label: string;
  helperText?: string;
  contextText?: string;
  validationState?: ValidationState;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * Adaptive input field per design-documentation/design-system/components/forms.md
 * and the WCAG checkpoints in design-documentation/accessibility/wcag-compliance.md:
 * persistent label, 56pt height, AA contrast, and no motion distractions.
 */
export const Input = forwardRef<TextInput, InputProps>(function InputField(
  {
    label,
    helperText,
    contextText,
    validationState = 'default',
    containerStyle,
    style: inputStyle,
    accessibilityLabel,
    ...rest
  },
  ref,
) {
  const theme = useTheme<BerthcareTheme>();
  const { colors, spacing, typography } = theme.tokens;
  const [isFocused, setIsFocused] = useState(false);
  const { onFocus: propsOnFocus, onBlur: propsOnBlur, ...inputProps } = rest;

  const stateStyles = resolveStateStyles(colors, validationState, isFocused);
  const isMultiline = Boolean(inputProps.multiline);

  return (
    <View style={containerStyle}>
      <Typography
        variant="small"
        weight={typography.weights.semibold}
        color={colors.functional.text.secondary}
        style={styles.label}
      >
        {label}
      </Typography>

      <View
        style={[
          styles.inputWrapper,
          {
            minHeight: 56,
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: spacing.scale.md,
            borderColor: stateStyles.borderColor,
            borderWidth: stateStyles.borderWidth,
            backgroundColor: colors.functional.surface.primary,
            shadowColor: stateStyles.shadowColor,
            shadowOpacity: stateStyles.shadowOpacity,
            shadowOffset: stateStyles.shadowOffset,
            shadowRadius: stateStyles.shadowRadius,
            elevation: stateStyles.elevation,
          },
        ]}
      >
        <TextInput
          ref={ref}
          accessibilityLabel={accessibilityLabel ?? label}
          placeholderTextColor={colors.functional.text.tertiary}
          style={[
            styles.input,
            {
              fontFamily: typography.fontFamily.base,
              fontSize: typography.scale.body.fontSize,
              lineHeight: isMultiline ? typography.scale.body.lineHeight : undefined,
              textAlignVertical: isMultiline ? 'top' : 'center',
              color: colors.functional.text.primary,
            },
            inputStyle,
          ]}
          onFocus={(event) => {
            setIsFocused(true);
            propsOnFocus?.(event);
          }}
          onBlur={(event) => {
            setIsFocused(false);
            propsOnBlur?.(event);
          }}
          {...inputProps}
        />
      </View>

      {contextText && (
        <Typography
          variant="caption"
          color={colors.functional.text.secondary}
          style={styles.caption}
        >
          {contextText}
        </Typography>
      )}

      {helperText && (
        <Typography
          variant="caption"
          color={
            validationState === 'error'
              ? colors.functional.text.error
              : validationState === 'success'
                ? colors.functional.text.success
                : colors.functional.text.secondary
          }
          style={styles.helper}
        >
          {helperText}
        </Typography>
      )}
    </View>
  );
});

const resolveStateStyles = (
  colors: BerthcareTheme['tokens']['colors'],
  validationState: ValidationState,
  isFocused: boolean,
): ViewStyle & {
  borderColor: string;
  borderWidth: number;
  elevation: number;
} => {
  if (validationState === 'error') {
    return {
      borderColor: colors.functional.border.error,
      borderWidth: 2,
      shadowColor: colors.semantic.urgent[500],
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 4,
      elevation: 0,
    };
  }

  if (validationState === 'success') {
    return {
      borderColor: colors.functional.border.success,
      borderWidth: 2,
      shadowColor: colors.functional.border.success,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 6,
      elevation: 0,
    };
  }

  if (isFocused) {
    return {
      borderColor: colors.functional.border.focus,
      borderWidth: 2,
      shadowColor: colors.functional.border.focus,
      shadowOpacity: 0.16,
      shadowOffset: { width: 0, height: 0 },
      shadowRadius: 4,
      elevation: 0,
    };
  }

  return {
    borderColor: colors.functional.border.default,
    borderWidth: 1,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    elevation: 0,
  };
};

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
  },
  inputWrapper: {
    justifyContent: 'center',
  },
  input: {
    padding: 0,
  },
  caption: {
    marginTop: 4,
  },
  helper: {
    marginTop: 4,
  },
});
