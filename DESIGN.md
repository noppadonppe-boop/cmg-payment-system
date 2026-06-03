---
name: Soft Ledger Experience
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434652'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#747783'
  outline-variant: '#c4c6d3'
  surface-tint: '#345ab0'
  primary: '#345ab0'
  on-primary: '#ffffff'
  primary-container: '#7da0fa'
  on-primary-container: '#003484'
  inverse-primary: '#b2c5ff'
  secondary: '#674ead'
  on-secondary: '#ffffff'
  secondary-container: '#b399fe'
  on-secondary-container: '#452a89'
  tertiary: '#5a5f68'
  on-tertiary: '#ffffff'
  tertiary-container: '#9ea3ad'
  on-tertiary-container: '#343942'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#154296'
  secondary-fixed: '#e8ddff'
  secondary-fixed-dim: '#cfbdff'
  on-secondary-fixed: '#21005d'
  on-secondary-fixed-variant: '#4e3493'
  tertiary-fixed: '#dee2ed'
  tertiary-fixed-dim: '#c2c6d1'
  on-tertiary-fixed: '#171c23'
  on-tertiary-fixed-variant: '#424750'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.4'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  sidebar-width: 280px
  container-max: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is centered on a "Soft Modernism" aesthetic, designed to transform the often-stressful task of slip management into a calm, approachable experience. The target audience includes small business owners and individuals who value efficiency without the coldness of traditional accounting software.

The UI leverages a mix of **Minimalism** and **Glassmorphism**, emphasizing heavy whitespace, breathing room, and a sense of lightness. The emotional response should be one of clarity and trust. Every interaction is designed to feel "cushioned"—avoiding sharp edges or harsh contrasts in favor of gentle gradients and fluid transitions.

## Colors

The palette is built on a foundation of "Soft White" to minimize eye strain. 
- **Primary (Pastel Blue):** Used for main actions, active states, and primary navigation elements. It conveys reliability.
- **Secondary (Pastel Purple):** Used for accents, highlights, and secondary data visualizations to add a touch of creative warmth.
- **Backgrounds:** Utilize a very light "Cool White" (#F8FAFF) rather than pure white to allow white cards to "pop" with subtle depth.
- **Gradients:** Use linear gradients from Primary to Secondary (45-degree angle) sparingly for high-impact areas like the file upload zone or "Total" cards.

## Typography

This design system uses a dual-font strategy. **Plus Jakarta Sans** provides a friendly, geometric personality for headers and brand-heavy moments. **Inter** is utilized for body text and data-heavy tables due to its exceptional legibility at small sizes and its "functional" neutrality.

When displaying monetary values in summary cards, use `headline-lg` with a slightly tighter letter spacing to emphasize the importance of the figure.

## Layout & Spacing

The layout follows a **Fixed Sidebar** model with a fluid content area.
- **Sidebar:** Remains fixed at 280px on desktop. On mobile, it collapses into a bottom navigation bar or a slide-out drawer.
- **Grid:** A 12-column grid is used for the main content area, though most summary cards should span 3 or 4 columns.
- **Rhythm:** An 8px linear scale governs all padding and margins. Generous padding (minimum 24px) should be applied inside cards to maintain the "airy" feel.
- **Alignment:** Content is vertically aligned to the top, allowing the "Summary Totals" to be the first point of visual contact.

## Elevation & Depth

Hierarchy is established through **Ambient Shadows** rather than borders. Surfaces should feel like they are floating slightly above the background.
- **Level 1 (Cards/Tables):** Use a soft, diffused shadow: `0px 4px 20px rgba(100, 116, 139, 0.06)`.
- **Level 2 (Dropdowns/Modals):** A deeper, more pronounced shadow: `0px 10px 30px rgba(100, 116, 139, 0.12)`.
- **Inner Depth:** For "Upload Zones," use a subtle inner shadow or a dashed light-blue border to create a "recessed" physical feel.
- **Backdrop Blur:** Modals and sidebar overlays should use a 12px blur with a 60% opacity white background to maintain context while focusing the user.

## Shapes

The shape language is consistently "Rounded." 
- **Small Elements (Buttons, Inputs):** 0.5rem (8px).
- **Medium Elements (Cards, Tables):** 1rem (16px).
- **Large Elements (File Upload Zones, Featured Summaries):** 1.5rem (24px).
- **Interactive States:** On hover, buttons should not get sharper; instead, they may expand slightly (scale 1.02) to reinforce the "soft" and responsive nature of the UI.

## Components

### Sidebar Navigation
The sidebar uses a transparent background with a subtle right-border separator. Active states use a "Pill" shape background in the Primary Pastel Blue at 10% opacity, with a solid 4px left-indicator bar.

### Data Tables
Tables should have no vertical borders. Row highlighting is essential: use a very soft Pastel Purple (#F5F3FF) on hover. The header row should be in `label-sm` with a subtle gray color to keep focus on the data.

### Summary Cards
These are the focal point of the dashboard. Use a white background with Level 1 elevation. Include a small icon in the top right, encased in a circular pastel-colored container.

### File Upload Zone
A large, "squishy" feeling area. Use a dashed border in Primary Blue. When a file is dragged over, the background should transition to a light Pastel Blue gradient.

### Buttons & Inputs
- **Primary Button:** Solid Pastel Blue with white text, using the Level 2 roundedness.
- **Inputs:** Use a soft-gray background (#F1F5F9) that turns white with a 2px Pastel Blue border on focus. No harsh black outlines.
