---
trigger: always_on
description: "UI/UX design standards and color palette rules to prevent generic AI-generated interfaces."
---

# UI/UX Design Rules & Color Palette

Add these variables to your root CSS file:

```css
:root {
  --color-bg: #F7F4F0;                 /* Warm Cream / Ivory (Background) */
  --color-surface: #EFECE6;            /* Soft Oatmeal / Beige (Cards/Containers) */
  --color-text-primary: #1F1D1A;       /* Deep Espresso / Charcoal (Headings/Body) */
  --color-text-muted: #7A736B;         /* Warm Taupe / Gray-Brown (Subheadings) */
  --color-accent: #9E5334;             /* Terracotta / Rust (Primary Buttons) */
  --color-accent-hover: #854327;       /* Deep Rust / Burnt Sienna (Button Hover) */
  --color-dark: #26201D;               /* Rich Dark Brown (Dark Footers/Banners) */
  --color-border: #E3DDD3;             /* Soft Warm Border (Dividers/Outlines) */
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}