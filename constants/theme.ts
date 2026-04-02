/**
 * Kcalyx Theme System
 * Centralized color palette and tokens used throughout the application.
 * Modify these values to change the app's look and feel globally.
 */

export const THEME = {
  // Core Colors
  bg: '#0A0B0D',           // Primary background
  surface: '#13151A',      // Surface for cards and secondary areas
  surfaceElevated: '#1C1F27', // Slightly lighter surface for nested elements
  border: '#242830',       // Standard border color
  
  // Brand & Action Colors
  accent: '#6EE7B7',       // Main brand color (Mint Green)
  accentDim: '#1A3B30',    // Muted/Low-opacity version of accent
  accentSecondary: '#818CF8', // Secondary indigo (used in charts/icons)
  indigo: '#818CF8',       // Explicit indigo access
  indigoDim: '#1E1F3A',    // Muted indigo
  amber: '#FCD34D',        // Warning/Highlight (Consistency)
  rose: '#F43F5E',         // Danger/Remove actions
  danger: '#F87171',       // Error/Delete alerts
  dangerDim: '#2D1515',    // Muted danger background
  
  google: '#4285F4',        // Google Brand Color
  googleDim: '#0F1E3A',     // Muted Google background
  
  // Typography
  text: '#F1F5F9',         // Primary text
  textMuted: '#64748B',    // Subtitles and less important info
  textSubtle: '#94A3B8',   // Inline labels and helper text
  
  // Status & Success
  success: '#34D399',      // Verified/Success states
  
  // Transparency Helpers (useful for gradients or overlays)
  overlay: 'rgba(0, 0, 0, 0.8)',
};

// Keeping the original Expo structure for compatibility if needed elsewhere
export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#0a7ea4',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#0a7ea4',
  },
  dark: {
    text: THEME.text,
    background: THEME.bg,
    tint: THEME.accent,
    icon: THEME.textMuted,
    tabIconDefault: THEME.textMuted,
    tabIconSelected: THEME.accent,
  },
};
