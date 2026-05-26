export const DarkThemeColors = {
  background: '#051424', // Deep midnight void
  surface: '#0b1326', // Midnight Indigo base
  surfaceContainer: '#122131',
  surfaceVariant: 'rgba(255, 255, 255, 0.03)', // Glass transparency
  border: 'rgba(255, 255, 255, 0.08)', // Inner glow border
  primary: '#bfc6e0',
  onPrimary: '#283044',
  secondary: '#00d2ff', // Vibrant Cyan accent
  electricBlue: '#2d5bff', // Luminous Electric Blue
  tertiary: '#b8c3ff',
  text: '#d4e4fa', // Soft indigo tinted text
  textMuted: '#c6c6cd',
  error: '#ffb4ab',
  warning: '#ffe082',
  success: '#81c784',
};

export const LightThemeColors = {
  background: '#f4f6fa', // Light soft gray-blue
  surface: '#ffffff', // Clean white card surface
  surfaceContainer: '#eef2f7', // Slightly darker gray-blue container
  surfaceVariant: 'rgba(0, 0, 0, 0.02)', // Subtle transparent dark overlay
  border: 'rgba(0, 0, 0, 0.08)', // Soft light border
  primary: '#283044',
  onPrimary: '#ffffff',
  secondary: '#007bb5', // Deep Ocean Blue accent
  electricBlue: '#1e40af', // Deep Royal Blue
  tertiary: '#4b5563',
  text: '#1e293b', // Deep Slate text
  textMuted: '#64748b', // Slate Muted text
  error: '#ba1a1a', // Clear red error
  warning: '#b45309', // Dark amber warning
  success: '#15803d', // Solid green success
};

export const Theme = {
  colors: {
    ...DarkThemeColors,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },
  roundness: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 24,
  },
};
