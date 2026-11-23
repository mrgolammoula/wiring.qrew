# Template Builder Interface Revamp — Execution Plan

This plan outlines the architecture, layout specifications, and actionable task checklist for revamping the Invoice Template Builder into a flush, edge-to-edge 2-row layout with a compact single-line header and a retractable right sidebar.

---

## 1. Objectives & Architectural Specifications

- **Flush Edge-to-Edge Container (Zero Outer Padding)**:
  - In studio mode, `#main-content` / `.content-area` expands to full available width and viewport height (`calc(100vh - var(--topbar-height))`) with `0` padding.
  - All partitions are demarcated by warm hairline borders (`1px solid var(--color-border)`).
- **Row 1: Compact Single-Line Header (~48px)**:
  - **Left**: Back button (`&larr;` / arrow icon) + Inline editable Template Name (`#designer-title-input`).
  - **Right**: Sidebar toggle button (`# Token Pool` / `Hide Tokens` / `Show Tokens`), `Preview` button, and `Save` button.
- **Row 2: Workspace Body**:
  - **Left / Center**: Template Editor Main Section (File Details header info, Formula Bar `[fx]`, and Integrated spreadsheet table canvas with section rails and totals).
  - **Right**: Retractable Sidebar (`#docked-token-pool`) with `border-left: 1px solid var(--color-border)`. Smooth GPU-accelerated width transition (`320px` $\leftrightarrow$ `0px`).

---

## 2. Layout Blueprint

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ROW 1: COMPACT HEADER (48px)                                                                   │
│ [←] "Harbor Operations Standard"                              [# Tokens]  [Preview]  [Save]    │
├─────────────────────────────────────────────────────────────────┬───────────────────────────────┤
│ ROW 2: TEMPLATE CREATOR MAIN SECTION (flex: 1, scrollable)      │ RETRACTABLE SIDEBAR (320px)   │
│                                                                 │                               │
│  ┌─ FILE DETAILS (Header Information) ────────────────────────┐ │ ┌─ # Token Pool ────────────┐ │
│  │ Name | Port Authority | Vessel IMO | ...                   │ │ │ [Tokens] [Catalog] [Files]│ │
│  └────────────────────────────────────────────────────────────┘ │ ├───────────────────────────┤ │
│                                                                 │ │ GLOBAL CONSTANTS          │ │
│  ┌─ fx [ACTIVE_TOKEN] [ Formula Input Field                 ] ┐ │ │ • DRAFT_RATIO: 1.15       │ │
│  └────────────────────────────────────────────────────────────┘ │ │ • PILOT_BASE: 250         │ │
│                                                                 │ │                           │ │
│  ┌─ SPREADSHEET TABLE CANVAS ─────────────────────────────────┐ │ │ TEMPLATE CONSTANTS        │ │
│  │ SL | Item Name / Deliverable | Type | Amount               │ │ │ • MIN_TUGBOATS: 2         │ │
│  │  1 | Tugboat Assistance      | FIXED| 3,200.00             │ │ └───────────────────────────┘ │
│  │  2 | Diving Inspection Crew  | EDIT | 1,400.00             │ │ (Retractable via toggle     │
│  │    + Add row    + Add section charge                       │ │  or close button)           │
│  │    * Section Total           |      | 4,600.00             │ │                               │
│  └────────────────────────────────────────────────────────────┘ │                               │
└─────────────────────────────────────────────────────────────────┴───────────────────────────────┘
```

---

## 3. Actionable Task Checklist

### Phase 1: Shell & Container Flush Edge-to-Edge Setup
- [x] Add `.studio-mode` toggling in `renderInvoiceTemplatesWorkspace` within `interfaces/office-config/invoice-templates.js`.
- [x] Add `.content-area.studio-mode` rule in `interfaces/office-config/office-config.css` with `padding: 0 !important; max-width: 100% !important; margin: 0 !important; height: calc(100vh - var(--topbar-height)); overflow: hidden;`.
- [x] Ensure exiting studio mode restores standard `.content-area` padding (`24px`) and centered max-width for the template directory view.

### Phase 2: Row 1 — Compact Single-Line Header Refactor
- [x] Refactor `renderSpreadsheetStudio` header markup in `invoice-templates.js` into `.studio-header`.
- [x] Clean up redundant controls: remove zoom buttons, mock avatar, and template settings dropdown from the top bar.
- [x] Implement Left group: Back button (`#btn-studio-back`) + inline template title input (`#designer-title-input`).
- [x] Implement Right group: Retractable sidebar toggle button (`#btn-toggle-sidebar`), Preview button (`#btn-preview-template`), and Save button (`#btn-save-template`).
- [x] Style `.studio-header` in `office-config.css` with `height: 48px; border-bottom: 1px solid var(--color-border); background: var(--color-surface);`.

### Phase 3: Row 2 — Main Section & Retractable Right Sidebar
- [x] Refactor Row 2 layout in `renderSpreadsheetStudio` into `.studio-body`.
- [x] Wrap main editor canvas in `.studio-main-section` with `flex: 1; overflow-y: auto; overflow-x: auto; padding: 20px 24px;`.
- [x] Preserve File Details card, Formula Bar `[fx]`, and the Integrated Spreadsheet Canvas inside `.studio-main-section`.
- [x] Wrap right sidebar in `.studio-sidebar` (`#docked-token-pool`) with `border-left: 1px solid var(--color-border);`.
- [x] Retain existing token pool tabs (**Tokens**, **Catalog**, **Projects**) inside `.studio-sidebar`.

### Phase 4: Interactive Sidebar Toggle State Machine
- [x] Add `sidebarOpen: true` to module-level `state` in `invoice-templates.js`.
- [x] Bind `#btn-toggle-sidebar` in `bindStudioEvents`:
  - Toggle `state.sidebarOpen = !state.sidebarOpen`.
  - Toggle `.collapsed` class on `#docked-token-pool`.
  - Update toggle button active indicator and label text (`Hide Tokens` $\leftrightarrow$ `Show Tokens`).
- [x] Style `.studio-sidebar` and `.studio-sidebar.collapsed` with smooth CSS transitions (`width 220ms cubic-bezier(0.16, 1, 0.3, 1), min-width 220ms, max-width 220ms, opacity 200ms`).

### Phase 5: Design System Tokens & Responsive Adaptations
- [x] Verify 100% token purity: ensure every color, radius, and transition references design system CSS variables (`--color-bg`, `--color-surface`, `--color-surface-white`, `--color-border`, `--panel-accent`).
- [x] Add responsive styles for mobile/tablet (`< 768px`):
  - Sidebar defaults to collapsed or overlay drawer.
  - Header controls wrap or adjust without horizontal blowout.
  - Touch target sizes meet the $\ge 36\text{px}$ standard.

### Phase 6: Verification & Quality Assurance
- [x] Run syntax checks via `node --check` across `interfaces/office-config/invoice-templates.js` and related scripts.
- [x] Verify template title renaming and persisting.
- [x] Verify Preview Modal functionality.
- [x] Verify Template Save functionality with toast notification.
- [x] Verify Back button returning to template directory list.
- [x] Verify sidebar show/hide animation at 60fps with zero layout stutter.
