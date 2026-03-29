export const colors = {
  bg: '#0A0A0F',
  surface: '#14141F',
  surfaceLight: '#1E1E2E',
  surfaceAccent: '#252538',
  border: '#2A2A3D',
  borderLight: '#3A3A50',

  text: '#F0F0F5',
  textSecondary: '#8E8EA0',
  textMuted: '#5A5A70',

  accent: '#F59E0B',
  accentLight: '#FBBF24',
  accentDark: '#D97706',
  accentBg: 'rgba(245, 158, 11, 0.12)',

  coral: '#FF6B6B',
  teal: '#2DD4BF',
  blue: '#60A5FA',

  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
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
