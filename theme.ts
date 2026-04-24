// theme.ts
// Central design system for Dynamic BMS
// Blue = cooling / setpoints    Red = heating / alerts    Green = running OK

export const Colors = {
  // Brand
  cool:        '#3b82f6', // blue  — cooling, numeric setpoints
  coolDim:     '#1d4ed8',
  coolBg:      '#0c1a2e',
  coolBorder:  '#1e3a5f',

  heat:        '#ef4444', // red   — heating, alerts, danger
  heatDim:     '#b91c1c',
  heatBg:      '#1f0a0a',
  heatBorder:  '#5f1d1d',

  on:          '#22c55e', // green — running / live / on
  onDim:       '#166534',
  onBg:        '#0a1a0a',
  onBorder:    '#14532d',

  off:         '#ef4444', // red   — stopped / offline / off
} as const

export type ThemeMode = 'dark' | 'light'

export function getTheme(mode: ThemeMode) {
  const dark = mode === 'dark'

  return {
    mode,
    dark,

    // Backgrounds — layered from deepest to surface
    bg:        dark ? '#000000' : '#f0f2f5',
    bgCard:    dark ? '#0a0a0a' : '#ffffff',
    bgInput:   dark ? '#050505' : '#f8f9fa',
    bgSummary: dark ? '#080808' : '#f4f5f8',

    // Borders
    border:    dark ? '#1a1a1a' : '#e2e5ea',
    borderMid: dark ? '#2a2a2a' : '#d0d4db',

    // Text
    textPrimary:   dark ? '#ffffff' : '#0f1117',
    textSecondary: dark ? '#a0a0a0' : '#4a5568',
    textMuted:     dark ? '#444444' : '#9aa0ad',
    textLabel:     dark ? '#555555' : '#8a909c',

    // Status bar
    statusBar: dark ? 'light-content' : 'dark-content',
    statusBg:  dark ? '#000000' : '#f0f2f5',

    // Tab bar
    tabBg:          dark ? '#050505' : '#ffffff',
    tabBorder:      dark ? '#1a1a1a' : '#e2e5ea',
    tabActive:      dark ? '#ffffff' : '#0f1117',
    tabInactive:    dark ? '#444444' : '#9aa0ad',

    // Toggle track
    switchTrackOn:  dark ? '#166534' : '#22c55e',
    switchTrackOff: dark ? '#2a2a2a' : '#d1d5db',

    // Brand colours always stay consistent
    cool:       Colors.cool,
    coolBg:     dark ? Colors.coolBg    : '#eff6ff',
    coolBorder: dark ? Colors.coolBorder : '#bfdbfe',

    heat:       Colors.heat,
    heatBg:     dark ? Colors.heatBg    : '#fff1f2',
    heatBorder: dark ? Colors.heatBorder : '#fecdd3',

    on:         Colors.on,
    onBg:       dark ? Colors.onBg      : '#f0fdf4',
    onBorder:   dark ? Colors.onBorder  : '#bbf7d0',

    off:        Colors.off,
  }
}

export type Theme = ReturnType<typeof getTheme>