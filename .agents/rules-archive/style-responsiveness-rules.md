---
trigger: always_on
description: "Project-wide styling and responsiveness rules for all UI elements and components."
---
# UI Responsiveness & Styling Rules

These rules must be followed whenever designing, implementing, modifying, or refactoring any frontend UI element, component, or layout across the project.

## Core Mandate: Universal Responsiveness

Always take responsiveness into consideration for **each and every UI element** unless explicitly told otherwise. Every component, table, modal, card, control bar, and typography scale must adapt gracefully across all device viewports:
- Mobile (< 640px)
- Tablet (640px – 1024px)
- Laptop / Small Desktop (1024px – 1440px)
- Wide Desktop (> 1440px)

## Key Responsive Standards

1. **Fluid Containers & Boundaries**:
   - Avoid rigid, fixed-pixel widths that can cause layout breaking or horizontal viewport scrolling. Use `max-width`, percentages, flexbox (`flex-wrap`, `min-width: 0`), and CSS grid.
   - Use `box-sizing: border-box` consistently so padding and borders do not inflate element footprints.

2. **Data Tables & Wide Views**:
   - Wrap tabular data and complex grid sheets inside dedicated responsive containers with smooth overflow handling (`overflow-x: auto; -webkit-overflow-scrolling: touch;`).
   - Retain accessibility, readable touch targets (minimum 36–44px for actionable buttons/toggles on mobile/touch), and maintain visual border continuity even on small screens.

3. **Modals & Overlays**:
   - Modals must scale responsively: `width: 90vw; max-width: ...px; max-height: 90vh; overflow-y: auto;`.
   - Form controls inside modals must stack cleanly on narrow viewports (`flex-direction: column;` when screen width is constrained).

4. **Extensibility**:
   - This rule is a living style specification and will continue to be updated with additional guidelines, typography scales, and component constraints as the design system matures.
