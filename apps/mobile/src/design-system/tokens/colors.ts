/**
 * Color tokens sourced from design-documentation/design-system/tokens/colors.md.
 * The palette keeps caregiver flows obvious—foundations map directly to semantic
 * and functional tokens so critical states read instantly in the app.
 */
const trustBlue = {
  50: '#EBF5FF',
  100: '#D6EBFF',
  200: '#AED6FF',
  300: '#85C2FF',
  400: '#5CADFF',
  500: '#0066CC',
  600: '#0052A3',
  700: '#003D7A',
  800: '#002E5C',
  900: '#001F3D',
} as const;

const careTeal = {
  50: '#E6F9F7',
  100: '#CCF3EE',
  200: '#99E7DD',
  300: '#66DBCC',
  400: '#33CFBB',
  500: '#00A896',
  600: '#008F7F',
  700: '#007A6E',
  800: '#006659',
  900: '#004D42',
} as const;

const completeGreen = {
  50: '#E8F7ED',
  100: '#D1EFDB',
  200: '#A3DFB7',
  300: '#75CF93',
  400: '#47BF6F',
  500: '#00A84F',
  600: '#008F43',
  700: '#007637',
  800: '#005D2B',
  900: '#00441F',
} as const;

const attentionAmber = {
  50: '#FFF9E6',
  100: '#FFF3CC',
  200: '#FFE799',
  300: '#FFDB66',
  400: '#FFCF33',
  500: '#FFA000',
  600: '#E68F00',
  700: '#CC7A00',
  800: '#B36600',
  900: '#994D00',
} as const;

const urgentRed = {
  50: '#FFEBEE',
  100: '#FFD6DB',
  200: '#FFADB8',
  300: '#FF8595',
  400: '#FF5C72',
  500: '#D32F2F',
  600: '#BA2828',
  700: '#A12121',
  800: '#881A1A',
  900: '#6F1313',
} as const;

const informPurple = {
  50: '#F4EBF7',
  100: '#E9D7EF',
  200: '#D3AFDF',
  300: '#BD87CF',
  400: '#A75FBF',
  500: '#7B1FA2',
  600: '#6A1B8F',
  700: '#59177C',
  800: '#481369',
  900: '#370F56',
} as const;

const neutralGray = {
  0: '#FFFFFF',
  50: '#FAFAFA',
  100: '#F5F5F5',
  200: '#EEEEEE',
  300: '#E0E0E0',
  400: '#BDBDBD',
  500: '#9E9E9E',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
  1000: '#000000',
} as const;

export const colors = {
  foundation: {
    trust: trustBlue,
    care: careTeal,
  },
  semantic: {
    complete: completeGreen,
    attention: attentionAmber,
    urgent: urgentRed,
    inform: informPurple,
  },
  neutral: neutralGray,
  functional: {
    text: {
      primary: neutralGray[900],
      secondary: neutralGray[700],
      tertiary: neutralGray[600],
      disabled: neutralGray[500],
      inverse: neutralGray[0],
      link: trustBlue[500],
      success: completeGreen[700],
      warning: attentionAmber[700],
      error: urgentRed[500],
    },
    surface: {
      primary: neutralGray[0],
      secondary: neutralGray[100],
      tertiary: neutralGray[50],
      inverse: neutralGray[900],
      disabled: neutralGray[200],
      overlay: 'rgba(0, 0, 0, 0.5)',
    },
    border: {
      default: neutralGray[300],
      subtle: neutralGray[200],
      strong: neutralGray[400],
      focus: trustBlue[500],
      error: urgentRed[500],
      success: completeGreen[500],
      disabled: neutralGray[400],
    },
    interactive: {
      primary: trustBlue[500],
      hover: trustBlue[600],
      pressed: trustBlue[700],
      focus: trustBlue[500],
      disabled: neutralGray[400],
    },
    visit: {
      upcoming: trustBlue[500],
      inProgress: careTeal[500],
      complete: completeGreen[700],
      overdue: urgentRed[500],
      cancelled: neutralGray[500],
    },
    status: {
      online: completeGreen[500],
      offline: neutralGray[500],
      syncing: trustBlue[500],
      error: urgentRed[500],
    },
  },
  overlays: {
    scrim: 'rgba(0, 0, 0, 0.5)',
    shadow: 'rgba(0, 0, 0, 0.15)',
  },
} as const;

export type ColorTokens = typeof colors;
