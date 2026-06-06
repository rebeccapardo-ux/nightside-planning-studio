// Shared UI layout constants.

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
