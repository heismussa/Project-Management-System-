export const BRAND_MAROON = '#962c30'
export const PHASE_LABELS = { initiation: 'Initiation', planning: 'Planning', execution: 'Execution', closure: 'Closure' }

// House card chrome used across every dashboard's cards/panels.
export const DASHBOARD_CARD_STYLE = {
  borderRadius: 12,
  background: '#fff',
  border: '1px solid #f0eeee',
  borderTop: '4px solid #7b3030',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  overflow: 'hidden',
}

// Body text and captions inside a tinted card stay this neutral colour —
// only the icon, figure, and label take the card's accent.
export const DASHBOARD_CARD_BODY_TEXT = '#1F2937'

// Tinted metric-card themes: one accent shared by a card's icon, number,
// and label so they read as one unit (never a coloured icon next to a
// muted-grey label). Add a theme here rather than hardcoding hex values
// in a component.
export const DASHBOARD_CARD_THEMES = {
  amber: {
    background: '#FFFDF6',
    border: '#F3DFA8',
    divider: '#F3E5BE',
    accent: '#F2A900',
    link: '#B7791F',
  },
  green: {
    background: '#F8FFF5',
    border: '#D5EBCB',
    divider: '#D9EED7',
    accent: '#2E9E55',
    track: '#D9EED7',
    link: '#2E9E55',
  },
  red: {
    background: '#FFF6F6',
    border: '#F3D6D6',
    divider: '#F5DEDE',
    accent: '#C0392B',
    link: '#C0392B',
  },
  orange: {
    background: '#FFF8F3',
    border: '#F4DCC7',
    divider: '#F6E3D2',
    accent: '#C2410C',
    link: '#C2410C',
  },
  blue: {
    background: '#F5F9FF',
    border: '#D6E4F7',
    divider: '#DEE9F9',
    accent: '#1D4ED8',
    link: '#1D4ED8',
  },
}
