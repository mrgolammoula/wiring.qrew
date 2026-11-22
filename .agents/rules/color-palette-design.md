---
trigger: always_on
description: "UI/UX design standards and color palette rules to prevent generic AI-generated interfaces."
---

# UI/UX Design Rules & Color Palette

Add these variables to your root CSS file:

```css
:root {
  --color-primary: #0D9488;            /* Primary Teal (Main Brand Color) */
  --color-secondary: #2563EB;          /* Secondary Blue (Platform / Admin Accents) */
  --color-accent-orange: #F97316;      /* Accent Orange (Config / Highlight Accents) */
  --color-supporting-purple: #7C3AED;  /* Supporting Purple (Tenant Accents) */

  --color-bg: #F8FAFC;                 /* Light Background (Slate-50) */
  --color-surface: #F1F5F9;            /* Light Surface / Containers (Slate-100) */
  --color-surface-white: #FFFFFF;      /* Clean White for Cards & Elevated Surfaces */
  --color-surface-hover: #E2E8F0;      /* Surface Hover State (Slate-200) */

  --color-text-primary: #1E293B;       /* Primary Text (Light - Slate-800) */
  --color-text-muted: #64748B;         /* Muted Text (Light - Slate-500) */

  --color-accent: #0D9488;             /* Primary Teal (Primary Buttons & Main Actions) */
  --color-accent-hover: #0F766E;       /* Deep Teal (Button Hover) */
  --color-dark: #090D16;               /* Dark Background */

  --color-border: #E2E8F0;             /* Soft Border (Slate-200) */
  --color-border-subtle: #F1F5F9;      /* Subtle Border */
  --color-border-strong: #CBD5E1;      /* Stronger Border (Slate-300) */
}

[data-theme="dark"] {
  --color-bg: #090D16;                 /* Dark Background */
  --color-surface: #131D31;            /* Dark Surface */
  --color-surface-white: #131D31;      /* Cards & Elevated Containers in Dark Mode */
  --color-surface-hover: #1E293B;      /* Dark Surface Hover State */

  --color-text-primary: #F1F5F9;       /* Primary Text (Dark) */
  --color-text-muted: #94A3B8;         /* Muted Text (Dark) */

  --color-accent: #0D9488;             /* Primary Teal */
  --color-accent-hover: #14B8A6;       /* Bright Teal Hover in Dark */
  --color-dark: #090D16;

  --color-border: #1E293B;             /* Dark Border */
  --color-border-subtle: #172338;      /* Subtle Dark Border */
  --color-border-strong: #334155;      /* Stronger Dark Border */
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}
```
