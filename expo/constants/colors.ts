export const colors = {
  bg: '#0A0A0A',
  surface: '#141414',
  surfaceLight: '#1E1E1E',
  surfaceAccent: '#282828',
  border: '#2A2A2A',
  borderLight: '#3A3A3A',

  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#666666',

  accent: '#E5192A',
  accentLight: '#FF2D3B',
  accentDark: '#B81422',
  accentBg: 'rgba(229, 25, 42, 0.12)',

  coral: '#FF4D4D',
  teal: '#FFFFFF',
  blue: '#CCCCCC',

  error: '#FF3B30',
  success: '#E5192A',
  warning: '#FF6B6B',
};

export default {
  light: {
    text: colors.text,
    background: colors.bg,
    tint: colors.accent,
    primary: colors.accent,
    secondary: colors.accentLight,
    gray: {
      50: colors.surfaceLight,
      100: colors.surface,
      200: colors.border,
      300: colors.borderLight,
      400: colors.textMuted,
      500: colors.textSecondary,
      600: colors.textSecondary,
      700: colors.text,
      800: colors.text,
      900: colors.text,
    },
    error: colors.error,
    success: colors.success,
  },
};
