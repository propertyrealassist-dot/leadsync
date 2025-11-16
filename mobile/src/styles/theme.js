// LeadSync Mobile - Design System
// Matching web app purple/pink gradient theme

export const colors = {
  // Primary colors (matching web app)
  primary: '#8B5CF6',      // Purple
  secondary: '#EC4899',    // Pink

  // Background colors
  background: '#0a0118',   // Deep purple black
  surface: '#1a1028',      // Lighter surface
  surfaceLight: '#2a2038', // Even lighter

  // Gradients
  gradientStart: '#8B5CF6',
  gradientEnd: '#EC4899',

  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',

  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Border & Divider
  border: 'rgba(139, 92, 246, 0.3)',
  divider: 'rgba(139, 92, 246, 0.2)',

  // Overlay
  overlay: 'rgba(10, 1, 24, 0.95)',
  cardBackground: 'rgba(26, 32, 44, 0.7)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  round: 999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const shadows = {
  sm: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

export default {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};
