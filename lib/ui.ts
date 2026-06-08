// Shared UI layout constants.

// Copy for the ⓘ tooltip on the wishes-docs "Relevant materials" panel header
// (advance-directive = My Care Wishes, funeral-wishes). Shared so the two docs
// can't drift apart. Rendered via <InfoTooltip>.
export const MATERIALS_PANEL_TOOLTIP =
  'These are materials relevant to this document. When you select a question, the most relevant materials move to the top. You can also add more via "+ Add materials."'

// Vertical offset (px) for scrolling an accordion section/item to the top of the
// viewport so its title lands *clear of the sticky GlobalNav*
// (`app/components/GlobalNav.tsx` — `sticky top-0`, 76px tall) with ~20px of
// breathing room. Applied as `scroll-margin-top` on accordion scroll targets;
// `scrollIntoView({ block: 'start' })` honors it, so the existing scroll calls need
// no change.
//
// NOTE: the Key Details deep-link scroll paths (`important-contacts`,
// `personal-admin`) currently hardcode this same 96 via a manual `window.scrollTo`
// (scroll-margin-top doesn't affect those). Unifying them onto this constant is a
// tracked post-launch cleanup.
export const SECTION_SCROLL_MARGIN_TOP = 96

// Minimum time (ms) a "Saving…" indicator should stay visible. Autosaves are fast
// (a single Supabase write), so without a floor the indicator flashes for only the
// network round-trip and reads as subliminal — users don't register that anything
// happened. Each autosave records when it started and awaits this floor before
// flipping to "Saved", so the feedback is perceptible across every input surface.
export const SAVE_INDICATOR_MIN_MS = 400

// Await the remainder of SAVE_INDICATOR_MIN_MS given when the save started. Call it
// right before clearing the "Saving…" state / showing "Saved".
export async function holdSavingIndicator(startedAt: number, minMs = SAVE_INDICATOR_MIN_MS): Promise<void> {
  const elapsed = Date.now() - startedAt
  if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed))
}
