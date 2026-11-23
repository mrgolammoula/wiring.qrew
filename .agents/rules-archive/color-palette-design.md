---
trigger: always_on
description: "UI/UX design standards and color palette rules to prevent generic AI-generated interfaces."
---

# UI/UX Design Rules & Color Palette

Add these variables to your root CSS file:

```css
:root {
  --color-primary: #0F766E;            /* Primary Teal (Main Brand Color) */
  --color-primary-hover: #115E59;      /* Primary Button Hover in Light */
  --color-secondary: #2563EB;          /* Secondary Blue (Platform / Admin Accents) */
  --color-accent-orange: #EA580C;      /* Accent Orange (Config / Highlight Accents) */
  --color-supporting-purple: #7C3AED;  /* Supporting Purple (Tenant Accents) */

  --color-bg: #F8FAFC;                 /* Light Background (Slate-50) */
  --color-surface: #F1F5F9;            /* Secondary Surface / Containers (Slate-100) */
  --color-surface-white: #FFFFFF;      /* Primary Surface: Clean White for Cards & Elevated Surfaces */
  --color-surface-hover: #E2E8F0;      /* Hover Surface (Slate-200) */

  --color-text-primary: #1E293B;       /* Primary Text (Slate-800) */
  --color-text-muted: #64748B;         /* Secondary Text (Slate-500) */

  --color-accent: #0F766E;             /* Primary Button */
  --color-accent-hover: #115E59;       /* Primary Button Hover */
  --color-dark: #0B1220;               /* Dark Navy Background */

  --color-border: #E2E8F0;             /* Border (Slate-200) */
  --color-border-subtle: #F1F5F9;      /* Subtle Border */
  --color-border-strong: #CBD5E1;      /* Stronger Border (Slate-300) */
}

[data-theme="dark"] {
  --color-primary: #0F766E;
  --color-primary-hover: #14B8A6;
  --color-secondary: #2563EB;
  --color-accent-orange: #EA580C;
  --color-supporting-purple: #7C3AED;

  --color-bg: #0B1220;                 /* Deep Navy Background */
  --color-surface: #1E293B;            /* Secondary Surface */
  --color-surface-white: #151F32;      /* Primary Surface: Cards & Elevated Containers in Dark Mode */
  --color-surface-hover: #293548;      /* Hover Surface */

  --color-text-primary: #F1F5F9;       /* Primary Text (Dark) */
  --color-text-muted: #94A3B8;         /* Secondary Text (Dark) */

  --color-accent: #0F766E;             /* Primary Button */
  --color-accent-hover: #14B8A6;       /* Primary Button Hover in Dark */
  --color-dark: #0B1220;

  --color-border: #293548;             /* Dark Border */
  --color-border-subtle: #1E293B;      /* Subtle Dark Border */
  --color-border-strong: #334155;      /* Stronger Dark Border */

  /* Dark Theme Brighter Brand Accent Variants for Visibility */
  --accent-teal-bright: #2DD4BF;
  --accent-blue-bright: #60A5FA;
  --accent-orange-bright: #FB923C;
  --accent-purple-bright: #A78BFA;
}

body {
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, sans-serif;
}
```
