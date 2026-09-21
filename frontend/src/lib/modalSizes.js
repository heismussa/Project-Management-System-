/**
 * Shared modal sizes — content modals fill ~75% of the viewport;
 * small confirms / prompts stay compact.
 */
export const MODAL_WIDTH = {
  /** Full workspace forms & multi-step flows (Register, project detail). */
  xl: '75vw',
  /** Tables + forms (recommend, approve, activity editor). */
  lg: '70vw',
  /** Medium forms / previews. */
  md: '55vw',
  /** Confirms, short prompts, password dialogs. */
  sm: 480,
}

/** Body style for content modals — height is driven by CSS (.pms-modal-*). */
export const MODAL_BODY_STYLE = {
  overflowY: 'auto',
  paddingRight: 4,
}

/** Cap at 75vw so fixed-pixel widths never exceed the target on large screens. */
export function modalWidth(preferredPx, { maxVw = 75, minPx = 480 } = {}) {
  if (typeof window === 'undefined') return preferredPx
  const capped = Math.floor((window.innerWidth * maxVw) / 100)
  return Math.max(minPx, Math.min(preferredPx, capped))
}
