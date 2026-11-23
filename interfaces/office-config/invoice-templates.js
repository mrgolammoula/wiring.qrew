/**
 * Interface: Office Configuration — Token-Driven Spreadsheet Invoice Templates
 * Implements Sections 4.4 & 4.5 of the Crew Platform System Architecture
 * Reference: Image 1 (Directory View Table) & Image 2 (Spreadsheet Designer Studio)
 */
(() => {
  const Qrew = window.Qrew;

  if (!Qrew.views['office-config']) {
    Qrew.views['office-config'] = {};
  }

  // Active module-level state
  const state = {
    currentOfficeId: 'off_ctg_port',
    currentTenantId: 'ten_sst',
    currentMode: 'list', // 'list' | 'studio'
    directoryView: 'table', // default clean table matching Reference Image 1
    searchTerm: '',
    statusFilter: 'Active', // 'Active' | 'Archived'
    activeTemplate: null, // template object being edited in studio
    gridMode: 'normal', // 'normal' | 'edit'
    selectedGridCells: new Set(),
    lastSelectedGridCell: null,
    selectedCell: null, // { type: 'row'|'charge'|'subtotal'|'grandTotal', sectionId, rowId, chargeId }
    draggedRowId: null,
    draggedFromSectionId: null,
    draggedPremadeItem: null,
    sidebarTab: 'tokens', // 'tokens' | 'catalog' | 'files'
    sidebarOpen: true,
    sectionTokenViews: {}, // sectionId -> 'rows' | 'sections'
    zoomLevel: 100
  };

  Qrew.views['office-config']._state = state;

  /* ==========================================================================
     DAG Formula & Calculation Engine
     ========================================================================== */

  class DAGFormulaEngine {
    constructor(template) {
      this.template = template;
      this.tokens = new Map();
      this.dependents = new Map();
      this.dependencies = new Map();
    }

    buildGraph() {
      this.tokens.clear();
      this.dependents.clear();
      this.dependencies.clear();

      // 1. Global constants
      if (this.template.globalConstants) {
        for (const [key, val] of Object.entries(this.template.globalConstants)) {
          const tokenName = key.trim().toUpperCase();
          this.tokens.set(tokenName, {
            token: tokenName,
            equation: String(val),
            value: Number(val) || 0,
            type: 'global'
          });
        }
      }

      // 2. Local / Template constants
      if (this.template.localConstants) {
        for (const [key, val] of Object.entries(this.template.localConstants)) {
          const tokenName = key.trim().toUpperCase();
          this.tokens.set(tokenName, {
            token: tokenName,
            equation: String(val),
            value: Number(val) || 0,
            type: 'local'
          });
        }
      }

      // 3. File details tokens (e.g. GRT, NRT)
      if (Array.isArray(this.template.headerFields)) {
        this.template.headerFields.forEach(f => {
          const tokenName = (f.key || '').trim().toUpperCase();
          const numVal = isNaN(f.value) ? 0 : Number(f.value);
          this.tokens.set(tokenName, {
            token: tokenName,
            equation: String(numVal),
            value: numVal,
            type: 'fileDetail',
            textValue: f.value
          });
        });
      }

      // 4. Row tokens, Charges, & Section Subtotals
      if (Array.isArray(this.template.sections)) {
        this.template.sections.forEach(sec => {
          if (Array.isArray(sec.rows)) {
            sec.rows.forEach(r => {
              const tokenName = (r.token || '').trim().toUpperCase();
              this.tokens.set(tokenName, {
                token: tokenName,
                equation: r.equation || '0',
                value: 0,
                type: 'row',
                rowId: r.id,
                sectionId: sec.id
              });
            });
          }
          if (Array.isArray(sec.charges)) {
            sec.charges.forEach(c => {
              const tokenName = (c.token || '').trim().toUpperCase();
              this.tokens.set(tokenName, {
                token: tokenName,
                equation: c.equation || '0',
                value: 0,
                type: 'charge',
                chargeId: c.id,
                sectionId: sec.id
              });
            });
          }
          if (sec.subtotal && sec.subtotal.token) {
            const subToken = sec.subtotal.token.trim().toUpperCase();
            this.tokens.set(subToken, {
              token: subToken,
              equation: sec.subtotal.equation || '0',
              value: 0,
              type: 'subtotal',
              sectionId: sec.id
            });
          }
        });
      }

      // 5. Grand Total
      if (this.template.grandTotal && this.template.grandTotal.token) {
        const grandToken = this.template.grandTotal.token.trim().toUpperCase();
        this.tokens.set(grandToken, {
          token: grandToken,
          equation: this.template.grandTotal.equation || '0',
          value: 0,
          type: 'grandTotal'
        });
      }

      // 6. Build Dependency references
      for (const [tokenName, tokenData] of this.tokens.entries()) {
        const refs = this.extractReferences(tokenData.equation);
        this.dependencies.set(tokenName, refs);
        for (const ref of refs) {
          if (!this.dependents.has(ref)) {
            this.dependents.set(ref, new Set());
          }
          this.dependents.get(ref).add(tokenName);
        }
      }
    }

    extractReferences(equation) {
      if (!equation || typeof equation !== 'string') return new Set();
      const trimmed = equation.trim();
      const expr = trimmed.startsWith('=') ? trimmed.substring(1) : trimmed;
      const matches = expr.match(/\b[A-Z_][A-Z0-9_]*\b/g) || [];
      const validRefs = new Set();
      matches.forEach(m => {
        if (this.tokens.has(m)) {
          validRefs.add(m);
        }
      });
      return validRefs;
    }

    detectCycle(targetToken, newEquation) {
      const prospectiveRefs = this.extractReferences(newEquation);
      if (prospectiveRefs.has(targetToken)) {
        return `Self-reference detected: "${targetToken}" cannot reference itself.`;
      }

      const visited = new Set();
      const stack = Array.from(prospectiveRefs);

      while (stack.length > 0) {
        const curr = stack.pop();
        if (curr === targetToken) {
          return `Circular reference detected: ${targetToken} → ${curr} forms a cycle.`;
        }
        if (!visited.has(curr)) {
          visited.add(curr);
          const nextDeps = this.dependencies.get(curr);
          if (nextDeps) {
            nextDeps.forEach(d => stack.push(d));
          }
        }
      }
      return null;
    }

    evaluateAll() {
      this.buildGraph();

      const inDegree = new Map();
      for (const token of this.tokens.keys()) {
        inDegree.set(token, 0);
      }

      for (const [token, deps] of this.dependencies.entries()) {
        inDegree.set(token, deps.size);
      }

      const queue = [];
      for (const [token, deg] of inDegree.entries()) {
        if (deg === 0) queue.push(token);
      }

      const evalOrder = [];
      while (queue.length > 0) {
        const curr = queue.shift();
        evalOrder.push(curr);

        const dependentTokens = this.dependents.get(curr);
        if (dependentTokens) {
          for (const dep of dependentTokens) {
            inDegree.set(dep, inDegree.get(dep) - 1);
            if (inDegree.get(dep) === 0) {
              queue.push(dep);
            }
          }
        }
      }

      const scope = {};
      for (const token of evalOrder) {
        const tData = this.tokens.get(token);
        if (!tData) continue;

        const val = this.safeEval(tData.equation, scope);
        tData.value = val;
        scope[token] = val;
      }

      return this.tokens;
    }

    safeEval(equation, scope) {
      if (!equation || equation.trim() === '') return 0;
      let expr = equation.trim();
      if (expr.startsWith('=')) expr = expr.substring(1).trim();

      if (!isNaN(expr)) {
        return parseFloat(expr);
      }

      let processed = expr;
      const sortedTokens = Object.keys(scope).sort((a, b) => b.length - a.length);
      for (const t of sortedTokens) {
        const regex = new RegExp(`\\b${t}\\b`, 'g');
        processed = processed.replace(regex, String(scope[t] || 0));
      }

      if (!/^[0-9+\-*/().\s%]+$/.test(processed)) {
        return 0;
      }

      processed = processed.replace(/([0-9.]+)%/g, '($1 / 100)');

      try {
        const result = new Function(`"use strict"; return (${processed});`)();
        return isNaN(result) || !isFinite(result) ? 0 : Math.round(result * 100) / 100;
      } catch (e) {
        return 0;
      }
    }
  }

  /* ==========================================================================
     Formatters & Helpers
     ========================================================================== */

  const formatCurrency = (val, symbol = '') => {
    const num = isNaN(val) ? 0 : Number(val);
    const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return symbol ? `${symbol} ${formatted}` : formatted;
  };

  const sanitizeToken = (str) => {
    return (str || '')
      .toUpperCase()
      .replace(/[^A-Z0-9_]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'TOKEN';
  };

  /* ==========================================================================
     1. Template Directory View (Revamped: Active vs Archived, 7-Column Table)
     ========================================================================== */

  const renderTemplatesDirectory = (officeId, tenantId) => {
    const templates = QrewStore.getInvoiceTemplates(officeId);
    const activeCount = templates.filter(t => t.status !== 'Archived').length;
    const archivedCount = templates.filter(t => t.status === 'Archived').length;

    return `
      <div class="tpl-directory-header">
        <div>
          <h1 class="page-title" style="margin:0;font-size:22px;font-weight:800;">Invoice Templates</h1>
          <p class="page-subtitle" style="margin:4px 0 0 0;font-size:13.5px;color:var(--color-text-muted);">
            Build and manage reusable invoice structures, variable tokens, and formulas.
          </p>
        </div>
        <div>
          <button class="btn btn-primary" id="btn-create-template-trigger" style="display:flex;align-items:center;gap:6px;background:#235F42;border-color:#1B4B34;">
            ${QrewUI.getIcon('plus')} Create Template
          </button>
        </div>
      </div>

      <!-- Filters & Search Bar: Active & Archived Tabs -->
      <div class="tpl-filter-bar">
        <div class="tpl-search-box">
          ${QrewUI.getIcon('search')}
          <input
            type="text"
            class="tpl-search-input"
            id="tpl-search-input"
            placeholder="Search templates by name, index, description..."
            value="${QrewUI.escapeHtml(state.searchTerm)}"
          >
        </div>

        ${window.QrewSegmentedPills ? QrewSegmentedPills.renderHtml({
      id: 'tpl-status-filter-pills',
      items: [
        { id: 'Active', label: `Active (${activeCount})` },
        { id: 'Archived', label: `Archived (${archivedCount})` }
      ],
      activeId: state.statusFilter
    }) : `
          <div class="tpl-status-pills">
            <button class="tpl-filter-btn ${state.statusFilter === 'Active' ? 'active' : ''}" data-filter="Active">
              Active (${activeCount})
            </button>
            <button class="tpl-filter-btn ${state.statusFilter === 'Archived' ? 'active' : ''}" data-filter="Archived">
              Archived (${archivedCount})
            </button>
          </div>
        `}
      </div>

      <!-- Revamped Directory Table (7 Columns: Name, Type, Index, Default Currency, Description, Last Updated, Actions) -->
      <div class="tpl-table-wrap">
        ${renderDirectoryTable(officeId, tenantId)}
      </div>
    `;
  };

  const renderDirectoryTable = (officeId, tenantId) => {
    const templates = QrewStore.getInvoiceTemplates(officeId);
    const filtered = templates.filter(tpl => {
      const matchSearch = !state.searchTerm ||
        tpl.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        (tpl.code && tpl.code.toLowerCase().includes(state.searchTerm.toLowerCase())) ||
        (tpl.description && tpl.description.toLowerCase().includes(state.searchTerm.toLowerCase()));

      let matchStatus = true;
      if (state.statusFilter === 'Active') matchStatus = tpl.status !== 'Archived';
      if (state.statusFilter === 'Archived') matchStatus = tpl.status === 'Archived';

      return matchSearch && matchStatus;
    });

    return `
      <table class="tpl-directory-table">
        <thead>
          <tr>
            <th style="min-width: 180px;">Template Name</th>
            <th style="width: 110px;">Type</th>
            <th style="width: 150px;">Index</th>
            <th style="width: 140px;">Default Currency</th>
            <th>Description</th>
            <th style="width: 130px;">Last Updated</th>
            <th style="width: 100px; text-align: center;">Actions</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length === 0 ? `
            <tr>
              <td colspan="7" style="padding: 36px; text-align: center; color: var(--color-text-muted);">
                ${state.statusFilter === 'Archived' ? 'No archived templates found.' : 'No active templates found. Click "Create Template" to get started.'}
              </td>
            </tr>
          ` : filtered.map(tpl => {
      const tplType = (tpl.type || tpl.tag || 'standard').toLowerCase();
      const isStandard = tplType === 'standard';
      const isArchived = tpl.status === 'Archived';

      return `
              <tr data-tplid="${tpl.id}" class="tpl-row-item" style="cursor: pointer;">
                <!-- 1. Template Name -->
                <td>
                  <div class="tpl-name-cell">
                    <span class="tpl-name-title">
                      ${QrewUI.escapeHtml(tpl.name)}
                    </span>
                  </div>
                </td>

                <!-- 2. Type (clean typography, no rounded boxes) -->
                <td>
                  <span class="cell-type-text ${isStandard ? 'type-standard' : 'type-custom'}">
                    ${isStandard ? 'STANDARD' : 'CUSTOM'}
                  </span>
                </td>

                <!-- 3. Index (clean monospace text, no pill wrapper) -->
                <td>
                  <span class="cell-index-text">${QrewUI.escapeHtml(tpl.code || '—')}</span>
                </td>

                <!-- 4. Default Currency (clean text, no badge box) -->
                <td>
                  <span class="cell-currency-text">${QrewUI.escapeHtml(tpl.currency || 'USD')} ${tpl.currencySymbol ? `(${tpl.currencySymbol})` : ''}</span>
                </td>

                <!-- 5. Description -->
                <td class="tpl-desc-cell" style="color: var(--color-text-muted);" title="${QrewUI.escapeHtml(tpl.description || '')}">
                  ${QrewUI.escapeHtml(tpl.description || '—')}
                </td>

                <!-- 6. Last Updated -->
                <td style="color: var(--color-text-muted); font-size: 13px;">
                  ${QrewUI.escapeHtml(tpl.updatedAt || 'Recent')}
                </td>

                <!-- 7. Actions (Active: only edit & archive icon buttons with tooltips) -->
                <td>
                  <div class="tpl-actions-cell" style="justify-content: center; gap: 8px;">
                    ${!isArchived ? `
                      <button class="icon-btn btn-action-edit btn-open-builder" data-tplid="${tpl.id}" title="Edit Template" aria-label="Edit Template">
                        ${QrewUI.getIcon('edit')}
                      </button>
                      <button class="icon-btn btn-action-archive btn-archive-tpl" data-tplid="${tpl.id}" title="Archive Template" aria-label="Archive Template">
                        ${QrewUI.getIcon('archive')}
                      </button>
                    ` : `
                      <button class="icon-btn btn-action-restore btn-restore-tpl" data-tplid="${tpl.id}" title="Restore Template" aria-label="Restore Template">
                        ${QrewUI.getIcon('refresh')}
                      </button>
                      <button class="icon-btn btn-action-delete btn-delete-tpl" data-tplid="${tpl.id}" title="Delete Template Permanently" aria-label="Delete Template Permanently" style="color: var(--color-danger);">
                        ${QrewUI.getIcon('trash')}
                      </button>
                    `}
                  </div>
                </td>
              </tr>
            `;
    }).join('')}
        </tbody>
      </table>
    `;
  };

  /* ==========================================================================
     Format Field Labels & Render File Details Table (Matching Reference Image)
     ========================================================================== */

  const formatFieldLabel = (key) => {
    switch ((key || '').trim().toUpperCase()) {
      case 'NAME': return 'Name';
      case 'STATUS': return 'Status';
      case 'CLIENTID':
      case 'CLIENT': return 'Client';
      case 'TERMINAL': return 'Terminal';
      case 'VOYAGE_NO': return 'Voyage No';
      case 'PORT': return 'Port';
      case 'ARRIVAL': return 'Arrival';
      case 'NRT': return 'NRT';
      case 'BERTHING': return 'Berthing';
      case 'GRT': return 'GRT';
      case 'DEPARTURE': return 'Departure';
      case 'NAME_OF_VESSEL': return 'Name Of Vessel';
      default: return key;
    }
  };

  const getCleanFieldValue = (val) => {
    if (val === null || val === undefined) return '';
    const s = String(val).trim();
    if (s === '—' || s === '-' || s === '–') return '';
    return s;
  };

  /* ==========================================================================
     File Details Mini-Excel Grid Engine (Proximity Dividers, Combo Cells, Merging)
     ========================================================================== */

  const ensureHeaderGrid = (tpl) => {
    if (!tpl.headerGrid || !Array.isArray(tpl.headerGrid.cells)) {
      const standardPairs = [
        ['NAME', 'STATUS'],
        ['CLIENTID', 'TERMINAL'],
        ['VOYAGE_NO', 'PORT'],
        ['ARRIVAL', 'NRT'],
        ['BERTHING', 'GRT'],
        ['DEPARTURE', 'NAME_OF_VESSEL']
      ];

      const fieldMap = new Map();
      (tpl.headerFields || []).forEach((f) => {
        const k = (f.key || '').trim().toUpperCase();
        fieldMap.set(k, f);
      });

      const colsCount = 2;
      const rowsCount = 6;
      const cells = [];
      const usedKeys = new Set();

      standardPairs.forEach(([kLeft, kRight], r) => {
        // Col 0
        const leftField = fieldMap.get(kLeft);
        if (leftField) {
          cells.push({
            id: `cell_${r}_0`,
            row: r,
            col: 0,
            colspan: 1,
            rowspan: 1,
            key: leftField.key,
            label: leftField.label || formatFieldLabel(leftField.key),
            value: leftField.value || ''
          });
          usedKeys.add(kLeft);
        } else {
          cells.push({
            id: `cell_${r}_0`,
            row: r,
            col: 0,
            colspan: 1,
            rowspan: 1,
            key: kLeft,
            label: formatFieldLabel(kLeft),
            value: ''
          });
        }

        // Col 1
        const rightField = fieldMap.get(kRight);
        if (rightField) {
          cells.push({
            id: `cell_${r}_1`,
            row: r,
            col: 1,
            colspan: 1,
            rowspan: 1,
            key: rightField.key,
            label: rightField.label || formatFieldLabel(rightField.key),
            value: rightField.value || ''
          });
          usedKeys.add(kRight);
        } else {
          cells.push({
            id: `cell_${r}_1`,
            row: r,
            col: 1,
            colspan: 1,
            rowspan: 1,
            key: kRight,
            label: formatFieldLabel(kRight),
            value: ''
          });
        }
      });

      // Any remaining custom fields
      let nextRow = rowsCount;
      (tpl.headerFields || []).forEach(f => {
        const k = (f.key || '').trim().toUpperCase();
        if (!usedKeys.has(k)) {
          cells.push({
            id: `cell_${nextRow}_0`,
            row: nextRow,
            col: 0,
            colspan: 1,
            rowspan: 1,
            key: f.key,
            label: f.label || f.key,
            value: f.value || ''
          });
          cells.push({
            id: `cell_${nextRow}_1`,
            row: nextRow,
            col: 1,
            colspan: 1,
            rowspan: 1,
            empty: true
          });
          nextRow++;
        }
      });

      tpl.headerGrid = {
        colsCount,
        rowsCount: Math.max(rowsCount, nextRow),
        cells
      };
    }

    return tpl.headerGrid;
  };

  const syncGridToHeaderFields = (tpl) => {
    if (!tpl.headerGrid || !Array.isArray(tpl.headerGrid.cells)) return;
    const fields = [];
    tpl.headerGrid.cells.forEach(cell => {
      if (!cell.empty && cell.key) {
        fields.push({
          key: cell.key.trim().toUpperCase(),
          label: cell.label || formatFieldLabel(cell.key),
          value: cell.value || ''
        });
      }
    });
    tpl.headerFields = fields;
  };

  const flushGridInputsToTemplate = (wrapEl, tpl) => {
    if (!wrapEl || !tpl || !tpl.headerGrid || !Array.isArray(tpl.headerGrid.cells)) return;
    const grid = tpl.headerGrid;

    wrapEl.querySelectorAll('.combo-key-input').forEach(inp => {
      const r = parseInt(inp.getAttribute('data-row'), 10);
      const c = parseInt(inp.getAttribute('data-col'), 10);
      const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
      if (cell) {
        const cleanKey = inp.value.trim().toUpperCase();
        cell.key = cleanKey;
        cell.label = formatFieldLabel(cleanKey);
      }
    });

    wrapEl.querySelectorAll('.combo-val-input').forEach(inp => {
      const r = parseInt(inp.getAttribute('data-row'), 10);
      const c = parseInt(inp.getAttribute('data-col'), 10);
      const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
      if (cell) {
        const v = inp.value.trim();
        const cleanVal = (v === '—' || v === '-' || v === '–') ? '' : v;
        cell.value = cleanVal;
      }
    });

    syncGridToHeaderFields(tpl);
  };

  const insertGridRow = (tpl, atRowIndex) => {
    const grid = ensureHeaderGrid(tpl);
    grid.cells.forEach(c => {
      if (c.row >= atRowIndex) {
        c.row += 1;
      }
    });
    for (let col = 0; col < grid.colsCount; col++) {
      grid.cells.push({
        id: `cell_${atRowIndex}_${col}_${Date.now()}`,
        row: atRowIndex,
        col,
        colspan: 1,
        rowspan: 1,
        empty: true
      });
    }
    grid.rowsCount += 1;
    syncGridToHeaderFields(tpl);
  };

  const insertGridCol = (tpl, atColIndex) => {
    const grid = ensureHeaderGrid(tpl);
    if (grid.colsCount >= 5) return; // capped at max 5 columns
    grid.cells.forEach(c => {
      if (c.col >= atColIndex) {
        c.col += 1;
      }
    });
    for (let row = 0; row < grid.rowsCount; row++) {
      grid.cells.push({
        id: `cell_${row}_${atColIndex}_${Date.now()}`,
        row,
        col: atColIndex,
        colspan: 1,
        rowspan: 1,
        empty: true
      });
    }
    grid.colsCount += 1;
    syncGridToHeaderFields(tpl);
  };

  const deleteGridRow = (tpl, rowIndex) => {
    const grid = ensureHeaderGrid(tpl);
    if (grid.rowsCount <= 1) return;
    grid.cells = grid.cells.filter(c => c.row !== rowIndex);
    grid.cells.forEach(c => {
      if (c.row > rowIndex) {
        c.row -= 1;
      } else if (c.row < rowIndex && c.row + (c.rowspan || 1) > rowIndex) {
        c.rowspan = Math.max(1, (c.rowspan || 1) - 1);
      }
    });
    grid.rowsCount -= 1;
    syncGridToHeaderFields(tpl);
  };

  const deleteGridCol = (tpl, colIndex) => {
    const grid = ensureHeaderGrid(tpl);
    if (grid.colsCount <= 1) return;
    grid.cells = grid.cells.filter(c => c.col !== colIndex);
    grid.cells.forEach(c => {
      if (c.col > colIndex) {
        c.col -= 1;
      } else if (c.col < colIndex && c.col + (c.colspan || 1) > colIndex) {
        c.colspan = Math.max(1, (c.colspan || 1) - 1);
      }
    });
    grid.colsCount -= 1;
    syncGridToHeaderFields(tpl);
  };

  const mergeCellRight = (tpl, r, c) => {
    const grid = ensureHeaderGrid(tpl);
    const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
    if (!cell) return;
    const currentSpan = cell.colspan || 1;
    const rSpan = cell.rowspan || 1;
    const targetCol = c + currentSpan;
    if (targetCol >= grid.colsCount) return;
    for (let ro = 0; ro < rSpan; ro++) {
      const absorbRow = r + ro;
      grid.cells = grid.cells.filter(other => !(other.row === absorbRow && other.col === targetCol));
    }
    cell.colspan = currentSpan + 1;
    syncGridToHeaderFields(tpl);
  };

  const mergeCellDown = (tpl, r, c) => {
    const grid = ensureHeaderGrid(tpl);
    const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
    if (!cell) return;
    const currentSpan = cell.rowspan || 1;
    const cSpan = cell.colspan || 1;
    const targetRow = r + currentSpan;
    if (targetRow >= grid.rowsCount) return;
    for (let co = 0; co < cSpan; co++) {
      const absorbCol = c + co;
      grid.cells = grid.cells.filter(other => !(other.row === targetRow && other.col === absorbCol));
    }
    cell.rowspan = currentSpan + 1;
    syncGridToHeaderFields(tpl);
  };

  const mergeCellLeft = (tpl, r, c) => {
    const grid = ensureHeaderGrid(tpl);
    const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
    if (!cell || c <= 0) return;
    const currentSpan = cell.colspan || 1;
    const rSpan = cell.rowspan || 1;
    const targetCol = c - 1;
    for (let ro = 0; ro < rSpan; ro++) {
      const absorbRow = r + ro;
      grid.cells = grid.cells.filter(other => !(other.row === absorbRow && other.col === targetCol));
    }
    cell.col = targetCol;
    cell.colspan = currentSpan + 1;
    syncGridToHeaderFields(tpl);
  };

  const mergeCellUp = (tpl, r, c) => {
    const grid = ensureHeaderGrid(tpl);
    const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
    if (!cell || r <= 0) return;
    const currentSpan = cell.rowspan || 1;
    const cSpan = cell.colspan || 1;
    const targetRow = r - 1;
    for (let co = 0; co < cSpan; co++) {
      const absorbCol = c + co;
      grid.cells = grid.cells.filter(other => !(other.row === targetRow && other.col === absorbCol));
    }
    cell.row = targetRow;
    cell.rowspan = currentSpan + 1;
    syncGridToHeaderFields(tpl);
  };

  const switchCellInRow = (tpl, r, c, direction) => {
    const grid = ensureHeaderGrid(tpl);
    const targetCol = direction === 'left' ? c - 1 : c + 1;
    if (targetCol < 0 || targetCol >= grid.colsCount) return;
    let cellA = grid.cells.find(cell => cell.row === r && cell.col === c);
    let cellB = grid.cells.find(cell => cell.row === r && cell.col === targetCol);
    if (!cellA) {
      cellA = { id: `cell_${r}_${c}_${Date.now()}`, row: r, col: c, colspan: 1, rowspan: 1, empty: true, key: '', label: '', value: '' };
      grid.cells.push(cellA);
    }
    if (!cellB) {
      cellB = { id: `cell_${r}_${targetCol}_${Date.now()}`, row: r, col: targetCol, colspan: 1, rowspan: 1, empty: true, key: '', label: '', value: '' };
      grid.cells.push(cellB);
    }
    const tempKey = cellA.key;
    const tempLabel = cellA.label;
    const tempValue = cellA.value;
    const tempEmpty = cellA.empty;

    cellA.key = cellB.key;
    cellA.label = cellB.label;
    cellA.value = cellB.value;
    cellA.empty = cellB.empty;

    cellB.key = tempKey;
    cellB.label = tempLabel;
    cellB.value = tempValue;
    cellB.empty = tempEmpty;
    syncGridToHeaderFields(tpl);
  };

  const switchCellInCol = (tpl, r, c, direction) => {
    const grid = ensureHeaderGrid(tpl);
    const targetRow = direction === 'above' ? r - 1 : r + 1;
    if (targetRow < 0 || targetRow >= grid.rowsCount) return;
    let cellA = grid.cells.find(cell => cell.row === r && cell.col === c);
    let cellB = grid.cells.find(cell => cell.row === targetRow && cell.col === c);
    if (!cellA) {
      cellA = { id: `cell_${r}_${c}_${Date.now()}`, row: r, col: c, colspan: 1, rowspan: 1, empty: true, key: '', label: '', value: '' };
      grid.cells.push(cellA);
    }
    if (!cellB) {
      cellB = { id: `cell_${targetRow}_${c}_${Date.now()}`, row: targetRow, col: c, colspan: 1, rowspan: 1, empty: true, key: '', label: '', value: '' };
      grid.cells.push(cellB);
    }
    const tempKey = cellA.key;
    const tempLabel = cellA.label;
    const tempValue = cellA.value;
    const tempEmpty = cellA.empty;

    cellA.key = cellB.key;
    cellA.label = cellB.label;
    cellA.value = cellB.value;
    cellA.empty = cellB.empty;

    cellB.key = tempKey;
    cellB.label = tempLabel;
    cellB.value = tempValue;
    cellB.empty = tempEmpty;
    syncGridToHeaderFields(tpl);
  };

  const splitCell = (tpl, r, c) => {
    const grid = ensureHeaderGrid(tpl);
    const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
    if (!cell) return;
    const cSpan = cell.colspan || 1;
    const rSpan = cell.rowspan || 1;
    cell.colspan = 1;
    cell.rowspan = 1;
    for (let rowOffset = 0; rowOffset < rSpan; rowOffset++) {
      for (let colOffset = 0; colOffset < cSpan; colOffset++) {
        if (rowOffset === 0 && colOffset === 0) continue;
        const nR = r + rowOffset;
        const nC = c + colOffset;
        if (!grid.cells.some(other => other.row === nR && other.col === nC)) {
          grid.cells.push({
            id: `cell_${nR}_${nC}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            row: nR,
            col: nC,
            colspan: 1,
            rowspan: 1,
            empty: true
          });
        }
      }
    }
    syncGridToHeaderFields(tpl);
  };

  /* ==========================================================================
     Task 2: Shift-Down Drag & Drop Reordering Algorithm
     ========================================================================== */

  const shiftInsertGridCell = (tpl, sRow, sCol, tRow, tCol) => {
    const grid = ensureHeaderGrid(tpl);
    const sCell = grid.cells.find(c => c.row === sRow && c.col === sCol);
    if (!sCell || sCell.empty) return;

    // Helper: snapshot moving cell payload
    const payload = {
      key: sCell.key,
      label: sCell.label,
      value: sCell.value,
      id: sCell.id || `cell_${sRow}_${sCol}`
    };

    if (sCol === tCol) {
      // ----------------------------------------------------
      // CASE 1: Same Column Reordering (sCol === tCol)
      // ----------------------------------------------------
      if (sRow === tRow) return;

      const colCells = [];
      for (let r = 0; r < grid.rowsCount; r++) {
        let cell = grid.cells.find(c => c.row === r && c.col === sCol);
        if (!cell) {
          cell = {
            id: `cell_${r}_${sCol}_${Date.now()}`,
            row: r,
            col: sCol,
            colspan: 1,
            rowspan: 1,
            empty: true
          };
          grid.cells.push(cell);
        }
        colCells.push(cell);
      }

      // Reorder: remove from sRow, insert at tRow
      const [movedItem] = colCells.splice(sRow, 1);
      colCells.splice(tRow, 0, movedItem);

      // Reassign row indices
      colCells.forEach((c, idx) => {
        c.row = idx;
      });
    } else {
      // ----------------------------------------------------
      // CASE 2: Cross Column Insertion (sCol !== tCol)
      // ----------------------------------------------------
      // 1. Collect target column cells
      const tColCells = [];
      for (let r = 0; r < grid.rowsCount; r++) {
        let cell = grid.cells.find(c => c.row === r && c.col === tCol);
        if (!cell) {
          cell = {
            id: `cell_${r}_${tCol}_${Date.now()}`,
            row: r,
            col: tCol,
            colspan: 1,
            rowspan: 1,
            empty: true
          };
          grid.cells.push(cell);
        }
        tColCells.push(cell);
      }

      // 2. Check if target column needs row expansion
      const hasEmptySlotBelowTarget = tColCells.slice(tRow).some(c => c.empty);
      if (!hasEmptySlotBelowTarget) {
        // Expand grid rows by 1 so no populated cell is pushed off or lost
        const newRowIdx = grid.rowsCount;
        grid.rowsCount++;
        for (let col = 0; col < grid.colsCount; col++) {
          if (col !== tCol) {
            grid.cells.push({
              id: `cell_${newRowIdx}_${col}_${Date.now()}`,
              row: newRowIdx,
              col,
              colspan: 1,
              rowspan: 1,
              empty: true
            });
          }
        }
        const newTCell = {
          id: `cell_${newRowIdx}_${tCol}_${Date.now()}`,
          row: newRowIdx,
          col: tCol,
          colspan: 1,
          rowspan: 1,
          empty: true
        };
        grid.cells.push(newTCell);
        tColCells.push(newTCell);
      } else {
        // Find the lowest empty cell in tCol below target to absorb the shift
        for (let r = tColCells.length - 1; r >= tRow; r--) {
          if (tColCells[r].empty) {
            tColCells.splice(r, 1);
            break;
          }
        }
      }

      // Insert moved payload at tRow in tColCells
      const insertedCell = {
        id: payload.id || `cell_${tRow}_${tCol}_${Date.now()}`,
        row: tRow,
        col: tCol,
        colspan: 1,
        rowspan: 1,
        empty: false,
        key: payload.key,
        label: payload.label,
        value: payload.value
      };
      tColCells.splice(tRow, 0, insertedCell);
      tColCells.forEach((c, idx) => {
        c.row = idx;
        c.col = tCol;
      });

      // 3. Compact source column sCol:
      // Cells below sRow shift UP by 1 to fill the gap, leaving bottom slot empty
      const sColCells = [];
      for (let r = 0; r < grid.rowsCount; r++) {
        let cell = grid.cells.find(c => c.row === r && c.col === sCol);
        if (!cell) {
          cell = {
            id: `cell_${r}_${sCol}_${Date.now()}`,
            row: r,
            col: sCol,
            colspan: 1,
            rowspan: 1,
            empty: true
          };
          grid.cells.push(cell);
        }
        sColCells.push(cell);
      }

      // Remove sCell from sColCells
      sColCells.splice(sRow, 1);
      // Append an empty cell at the bottom of sCol
      sColCells.push({
        id: `cell_${grid.rowsCount - 1}_${sCol}_${Date.now()}`,
        row: grid.rowsCount - 1,
        col: sCol,
        colspan: 1,
        rowspan: 1,
        empty: true
      });
      // Reassign row indices for sCol
      sColCells.forEach((c, idx) => {
        c.row = idx;
        c.col = sCol;
      });

      // 4. Update grid.cells with newly organized columns
      const otherColsCells = grid.cells.filter(c => c.col !== sCol && c.col !== tCol);
      grid.cells = [...otherColsCells, ...sColCells, ...tColCells];
    }

    syncGridToHeaderFields(tpl);
  };

  const moveOrSwapGridCell = (tpl, sRow, sCol, tRow, tCol) => {
    shiftInsertGridCell(tpl, sRow, sCol, tRow, tCol);
  };

  /* ==========================================================================
     Auto-Balance Grid: Distribute cells into columns with minimal movement & prune unused
     ========================================================================== */

  const autoBalanceGrid = (tpl) => {
    const grid = ensureHeaderGrid(tpl);
    if (!grid || !Array.isArray(grid.cells)) return;

    // 1. Extract all populated cells (cells that have a key and are not empty)
    const populated = grid.cells.filter(c => !c.empty && c.key && c.key.trim().length > 0);
    const N = populated.length;

    // 2. Identify active columns (columns currently containing at least one populated cell)
    const activeColIndices = [...new Set(populated.map(c => c.col))].sort((a, b) => a - b);

    // 3. Determine target column count K:
    // If activeColIndices has >= 2 columns, preserve active column count up to 5.
    // If only 1 or 0 columns have cells:
    //   If N >= 2, default to standard 2 columns.
    //   If N <= 1, use Math.max(1, Math.min(2, grid.colsCount || 2));
    let targetCols = 2;
    if (activeColIndices.length >= 2) {
      targetCols = Math.min(activeColIndices.length, 5);
    } else if (N >= 2) {
      targetCols = 2;
    } else {
      targetCols = Math.max(1, Math.min(2, grid.colsCount || 2));
    }

    // 4. Determine target row count R:
    const targetRows = Math.max(Math.ceil(N / targetCols), 1);

    // 5. Calculate target capacities per column:
    // Total sum of capacities must be EXACTLY N.
    // The first (N % targetCols) columns receive Math.ceil(N / targetCols) items,
    // and the remaining columns receive Math.floor(N / targetCols) items.
    const remainder = N % targetCols;
    const highCap = Math.ceil(N / targetCols);
    const lowCap = Math.floor(N / targetCols);
    const targetCapacities = [];
    for (let c = 0; c < targetCols; c++) {
      if (remainder === 0) {
        targetCapacities.push(highCap);
      } else {
        targetCapacities.push(c < remainder ? highCap : lowCap);
      }
    }

    // 6. Group existing populated cells by column (sorted by row ascending)
    const existingByCol = Array.from({ length: targetCols }, () => []);
    const overflowPool = [];

    // Map existing active columns to target columns
    populated.sort((a, b) => a.row - b.row);
    populated.forEach(cell => {
      cell.colspan = 1;
      cell.rowspan = 1;

      if (cell.col < targetCols) {
        existingByCol[cell.col].push(cell);
      } else {
        overflowPool.push(cell);
      }
    });

    // 7. Minimal Intercolumn Movement with Right-to-Left Top-to-Bottom Distribution:
    // When there are more cells in the right column than the left, cells at the top of the right column
    // come to the end of the left column sequentially.
    const colAllocations = Array.from({ length: targetCols }, (_, c) => [...existingByCol[c]]);

    // Pass 1: Right-to-Left transfers (cells from TOP of right column shift sequentially to END of left column)
    for (let c = targetCols - 1; c > 0; c--) {
      for (let leftCol = 0; leftCol < c; leftCol++) {
        while (colAllocations[c].length > targetCapacities[c] && colAllocations[leftCol].length < targetCapacities[leftCol]) {
          const item = colAllocations[c].shift(); // Taken from top of right column
          colAllocations[leftCol].push(item);     // Appended sequentially to end of left column
        }
      }
    }

    // Pass 2: Left-to-Right transfers (excess cells from BOTTOM of left column shift sequentially to right column)
    for (let c = 0; c < targetCols - 1; c++) {
      for (let rightCol = c + 1; rightCol < targetCols; rightCol++) {
        if (colAllocations[c].length > targetCapacities[c] && colAllocations[rightCol].length < targetCapacities[rightCol]) {
          const count = Math.min(colAllocations[c].length - targetCapacities[c], targetCapacities[rightCol] - colAllocations[rightCol].length);
          const transferred = colAllocations[c].splice(colAllocations[c].length - count, count);
          colAllocations[rightCol].push(...transferred);
        }
      }
    }

    // Pass 3: Fill any remaining capacity from overflowPool (e.g. from pruned columns >= targetCols)
    for (let c = 0; c < targetCols; c++) {
      while (colAllocations[c].length < targetCapacities[c] && overflowPool.length > 0) {
        colAllocations[c].push(overflowPool.shift());
      }
    }

    // 9. Reconstruct grid.cells with exact dimensions (targetRows x targetCols)
    const newCells = [];
    for (let r = 0; r < targetRows; r++) {
      for (let c = 0; c < targetCols; c++) {
        const item = colAllocations[c][r];
        if (item) {
          item.row = r;
          item.col = c;
          item.empty = false;
          newCells.push(item);
        } else {
          newCells.push({
            id: `cell_${r}_${c}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            row: r,
            col: c,
            colspan: 1,
            rowspan: 1,
            empty: true
          });
        }
      }
    }

    // 10. Update grid dimensions and prune unused rows & columns
    grid.colsCount = targetCols;
    grid.rowsCount = targetRows;
    grid.cells = newCells;

    syncGridToHeaderFields(tpl);
  };

  /* ==========================================================================
     FLIP Smooth Motion Engine for Grid Drag & Drop & Auto-Balance
     ========================================================================== */

  const animateGridFLIP = (wrapEl, tableEl, tpl, officeId, tenantId, mutationFn) => {
    if (!wrapEl || !tableEl) {
      mutationFn();
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }

    if (state.isGridAnimating) return;
    state.isGridAnimating = true;

    // Safety timeout to guarantee unlocking
    const safetyTimer = setTimeout(() => {
      state.isGridAnimating = false;
    }, 600);

    // 1. FIRST: Capture bounding client rects of all populated cells
    const firstRects = new Map();
    wrapEl.querySelectorAll('.file-combo-cell').forEach(el => {
      const cellId = el.getAttribute('data-cellid');
      if (cellId && el.getBoundingClientRect) {
        firstRects.set(cellId, el.getBoundingClientRect());
      }
    });

    const origGrid = tpl.headerGrid ? { rowsCount: tpl.headerGrid.rowsCount, colsCount: tpl.headerGrid.colsCount } : { rowsCount: 1, colsCount: 2 };
    const origRows = origGrid.rowsCount || 1;
    const origCols = origGrid.colsCount || 2;

    // 2. MUTATE: Apply data model changes
    mutationFn();

    // 3. UPDATE DOM: Update only table tbody and colgroup in-place
    const grid = ensureHeaderGrid(tpl);
    const targetRows = grid.rowsCount;
    const targetCols = grid.colsCount;
    const tbody = tableEl.querySelector('tbody');
    const colgroup = tableEl.querySelector('colgroup');

    const extraRowsCount = Math.max(0, origRows - targetRows);
    const extraColsCount = Math.max(0, origCols - targetCols);
    const addedRowsCount = Math.max(0, targetRows - origRows);

    if (colgroup) {
      if (extraColsCount > 0) {
        const newWidthPct = (100 / targetCols).toFixed(2);
        let colsHtml = '';
        for (let c = 0; c < targetCols; c++) {
          colsHtml += `<col style="width: ${newWidthPct}%; transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);">`;
        }
        for (let c = 0; c < extraColsCount; c++) {
          colsHtml += `<col style="width: 0%; transition: width 240ms cubic-bezier(0.16, 1, 0.3, 1);">`;
        }
        colgroup.innerHTML = colsHtml;
      } else {
        colgroup.innerHTML = Array.from({ length: grid.colsCount })
          .map(() => `<col style="width: ${(100 / grid.colsCount).toFixed(2)}%;">`)
          .join('');
      }
    }

    const addedRowElements = [];

    if (tbody) {
      let tbodyHtml = renderFileDetailsGrid(tpl, extraColsCount);

      // If extra rows are being pruned, append collapsing empty rows to tbody
      if (extraRowsCount > 0) {
        for (let r = 0; r < extraRowsCount; r++) {
          let extraRowTds = '';
          for (let c = 0; c < targetCols + extraColsCount; c++) {
            extraRowTds += `<td class="td-cell td-empty-slot" style="padding: 0 !important; border-bottom-color: transparent !important; border-right-color: transparent !important;"><div class="file-empty-slot" style="max-height: 0px; min-height: 0px; height: 0px; opacity: 0; overflow: hidden;"></div></td>`;
          }
          tbodyHtml += `<tr class="grid-row-collapsing" style="height: 0px; overflow: hidden; transition: height 240ms cubic-bezier(0.16, 1, 0.3, 1);">${extraRowTds}</tr>`;
        }
      }

      tbody.innerHTML = tbodyHtml;

      // If new rows are being added (e.g. cross-column drag into full column), initialize them with 0-height and smooth entering expansion
      if (addedRowsCount > 0 && tbody.children) {
        const rows = Array.from(tbody.children);
        for (let r = origRows; r < targetRows; r++) {
          const tr = rows[r];
          if (tr) {
            tr.classList.add('grid-row-entering');
            tr.style.height = '0px';
            tr.style.overflow = 'hidden';
            tr.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
              el.style.maxHeight = '0px';
              el.style.minHeight = '0px';
              el.style.height = '0px';
              el.style.opacity = '0';
              el.style.overflow = 'hidden';
              el.style.transition = 'max-height 260ms cubic-bezier(0.16, 1, 0.3, 1), min-height 260ms, opacity 220ms ease';
            });
            tr.querySelectorAll('td.td-cell').forEach(td => {
              td.style.padding = '0 !important';
              td.style.borderBottom = 'none';
            });
            addedRowElements.push(tr);
          }
        }
      }
    }

    // Rebind event listeners so new DOM is immediately interactive
    bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);

    // 4. LAST & INVERT: Compare new rects with first rects and invert
    const elementsToAnimate = [];
    wrapEl.querySelectorAll('.file-combo-cell').forEach(el => {
      const cellId = el.getAttribute('data-cellid');
      const first = firstRects.get(cellId);
      if (first && el.getBoundingClientRect) {
        const last = el.getBoundingClientRect();
        const dx = (first.left || 0) - (last.left || 0);
        const dy = (first.top || 0) - (last.top || 0);
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = 'none';
          elementsToAnimate.push(el);
        }
      }
    });

    // 5. PLAY: Animate smoothly to natural position (0, 0)
    void wrapEl.offsetHeight;

    requestAnimationFrame(() => {
      elementsToAnimate.forEach(el => {
        el.style.transition = 'transform 280ms cubic-bezier(0.16, 1, 0.3, 1)';
        el.style.transform = '';
      });

      addedRowElements.forEach(tr => {
        tr.style.transition = 'height 260ms cubic-bezier(0.16, 1, 0.3, 1)';
        tr.style.height = '38px';
        tr.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
          el.style.maxHeight = '38px';
          el.style.minHeight = '38px';
          el.style.height = '100%';
          el.style.opacity = '1';
        });
        tr.querySelectorAll('td.td-cell').forEach(td => {
          td.style.borderBottom = '1px solid var(--color-border)';
        });
      });
    });

    setTimeout(() => {
      clearTimeout(safetyTimer);
      elementsToAnimate.forEach(el => {
        el.style.transition = '';
        el.style.transform = '';
      });

      addedRowElements.forEach(tr => {
        tr.classList.remove('grid-row-entering');
        tr.style.transition = '';
        tr.style.height = '';
        tr.style.overflow = '';
        tr.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
          el.style.transition = '';
          el.style.maxHeight = '';
          el.style.minHeight = '';
          el.style.height = '';
          el.style.opacity = '';
          el.style.overflow = '';
        });
        tr.querySelectorAll('td.td-cell').forEach(td => {
          td.style.padding = '';
          td.style.borderBottom = '';
        });
      });

      // Clean up collapsing elements and reset pristine colgroup
      if (tbody) {
        wrapEl.querySelectorAll('tr.grid-row-collapsing').forEach(tr => {
          if (tr.remove) tr.remove();
          else if (tr.parentNode) tr.parentNode.removeChild(tr);
        });
        wrapEl.querySelectorAll('td.td-col-collapsing').forEach(td => {
          if (td.remove) td.remove();
          else if (td.parentNode) td.parentNode.removeChild(td);
        });
      }
      if (colgroup) {
        colgroup.innerHTML = Array.from({ length: grid.colsCount })
          .map(() => `<col style="width: ${(100 / grid.colsCount).toFixed(2)}%;">`)
          .join('');
      }
      if (refreshGridDeleteButtons) {
        refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      }
      state.isGridAnimating = false;
    }, 280);
  };

  Qrew.views['office-config'].shiftInsertGridCell = shiftInsertGridCell;
  Qrew.views['office-config'].animateGridFLIP = animateGridFLIP;
  Qrew.views['office-config'].autoBalanceGrid = autoBalanceGrid;

  const renderFileDetailsGrid = (tpl, extraColsCount = 0) => {
    const grid = ensureHeaderGrid(tpl);
    const { colsCount, rowsCount, cells } = grid;

    const cellMap = new Map();
    cells.forEach(c => {
      cellMap.set(`${c.row},${c.col}`, c);
    });

    const covered = new Set();
    cells.forEach(c => {
      const cSpan = c.colspan || 1;
      const rSpan = c.rowspan || 1;
      if (cSpan > 1 || rSpan > 1) {
        for (let ro = 0; ro < rSpan; ro++) {
          for (let co = 0; co < cSpan; co++) {
            if (ro === 0 && co === 0) continue;
            covered.add(`${c.row + ro},${c.col + co}`);
          }
        }
      }
    });

    const rowsHtml = [];
    for (let r = 0; r < rowsCount; r++) {
      const colsHtml = [];
      const isRowEntering = (state.lastInsertedRowIndex === r);

      for (let c = 0; c < colsCount; c++) {
        const coordKey = `${r},${c}`;
        if (covered.has(coordKey)) {
          continue;
        }

        const cell = cellMap.get(coordKey) || { row: r, col: c, colspan: 1, rowspan: 1, empty: true };
        const cSpan = cell.colspan || 1;
        const rSpan = cell.rowspan || 1;
        const isSelected = state.selectedGridCells && state.selectedGridCells.has(coordKey);
        const isEditMode = state.gridMode === 'edit';
        const isDraggable = !isEditMode;
        const isColEntering = (state.lastInsertedColIndex === c);

        // Delete Row Button: rendered on the rightmost visible cell in row r
        // Delete Col Button: rendered on the bottom-most cell in column c
        const isLastInRow = (c + cSpan >= colsCount);
        const isBottomInCol = (r + rSpan >= rowsCount);

        let deleteRowBtnHtml = '';
        if (!isEditMode && rowsCount > 1 && isLastInRow) {
          for (let sr = 0; sr < rSpan; sr++) {
            const actualRow = r + sr;
            const topStyle = rSpan === 1 ? '' : `top: ${((sr) / rSpan * 100).toFixed(1)}%; height: ${(100 / rSpan).toFixed(1)}%;`;
            deleteRowBtnHtml += `
              <button type="button" class="grid-delete-row-btn" data-row="${actualRow}" ${topStyle ? `style="${topStyle}"` : ''} title="Delete Row ${actualRow + 1}" aria-label="Delete Row ${actualRow + 1}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            `;
          }
        }

        let deleteColBtnHtml = '';
        if (!isEditMode && colsCount > 1 && isBottomInCol) {
          for (let sc = 0; sc < cSpan; sc++) {
            const actualCol = c + sc;
            const leftStyle = cSpan === 1 ? '' : `left: ${((sc) / cSpan * 100).toFixed(1)}%; width: ${(100 / cSpan).toFixed(1)}%;`;
            deleteColBtnHtml += `
              <button type="button" class="grid-delete-col-btn" data-col="${actualCol}" ${leftStyle ? `style="${leftStyle}"` : ''} title="Delete Column ${actualCol + 1}" aria-label="Delete Column ${actualCol + 1}">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            `;
          }
        }

        if (cell.empty || !cell.key) {
          colsHtml.push(`
            <td colspan="${cSpan}" rowspan="${rSpan}" data-row="${r}" data-col="${c}" class="td-cell td-empty-slot ${isSelected ? 'is-selected' : ''} ${isColEntering ? 'td-col-entering' : ''}">
              <div class="file-empty-slot" data-row="${r}" data-col="${c}" data-cellid="cell_empty_${cell.id || `${r}_${c}`}">
                <button type="button" class="btn-slot-add-field" data-row="${r}" data-col="${c}">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>Add Field</span>
                </button>
              </div>
              ${deleteRowBtnHtml}
              ${deleteColBtnHtml}
            </td>
          `);
        } else {
          colsHtml.push(`
            <td colspan="${cSpan}" rowspan="${rSpan}" data-row="${r}" data-col="${c}" class="td-cell td-combo-cell ${isSelected ? 'is-selected' : ''} ${isColEntering ? 'td-col-entering' : ''}">
              <div class="file-combo-cell" draggable="${isDraggable}" data-row="${r}" data-col="${c}" data-cellid="cell_token_${cell.key || (cell.id || `${r}_${c}`)}">
                <div class="combo-key-box" title="Field Token Key: ${QrewUI.escapeHtml(cell.key)}">
                  <input type="text" class="combo-key-input" data-row="${r}" data-col="${c}" value="${QrewUI.escapeHtml(cell.key)}" placeholder="KEY" spellcheck="false" draggable="false">
                </div>
                <div class="combo-val-box">
                  <input type="text" class="combo-val-input" data-row="${r}" data-col="${c}" data-fieldkey="${cell.key}" value="${QrewUI.escapeHtml(getCleanFieldValue(cell.value))}" placeholder="—" draggable="false">
                </div>
                <div class="combo-actions">
                  <button type="button" class="btn-cell-options" data-row="${r}" data-col="${c}" title="Cell Options">⋮</button>
                </div>
              </div>
              ${deleteRowBtnHtml}
              ${deleteColBtnHtml}
            </td>
          `);
        }
      }

      // If extra columns are collapsing during balancing, append collapsing cells
      if (extraColsCount > 0) {
        for (let ec = 0; ec < extraColsCount; ec++) {
          colsHtml.push(`
            <td class="td-cell td-col-collapsing" style="width: 0%; max-width: 0px; padding: 0 !important; border-right-color: transparent !important;">
              <div class="file-empty-slot" style="width: 0px; max-width: 0px; opacity: 0; overflow: hidden;"></div>
            </td>
          `);
        }
      }

      rowsHtml.push(`<tr class="${isRowEntering ? 'grid-row-entering' : ''}">${colsHtml.join('')}</tr>`);
    }

    return rowsHtml.join('');
  };

  const renderFileDetailsTableRows = (fields) => {
    const tpl = state.activeTemplate;
    if (tpl) {
      return renderFileDetailsGrid(tpl);
    }
    return '';
  };

  /* ==========================================================================
     In-Place Smooth Growth & Contraction Animations (Task 1)
     Direct DOM updates: No whole-workspace re-render jumps
     ========================================================================== */

  let refreshGridDeleteButtons;

  const animateInsertGridRow = (officeId, tenantId, tpl, atRow, wrapEl, tableEl) => {
    if (!wrapEl || !tableEl) {
      insertGridRow(tpl, atRow);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }
    const grid = ensureHeaderGrid(tpl);
    const tbody = tableEl.querySelector('tbody');
    if (!tbody) {
      insertGridRow(tpl, atRow);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }

    if (state.isGridAnimating) return;
    state.isGridAnimating = true;

    // Hide proximity lines immediately
    const hLine = wrapEl.querySelector('#grid-divider-hline');
    const vLine = wrapEl.querySelector('#grid-divider-vline');
    if (hLine) hLine.style.display = 'none';
    if (vLine) vLine.style.display = 'none';

    // 1. Update data model
    insertGridRow(tpl, atRow);

    // 2. Build the new row element
    const colsCount = grid.colsCount;
    const newTr = document.createElement('tr');
    newTr.className = 'grid-row-entering';
    newTr.style.height = '0px';
    newTr.style.overflow = 'hidden';

    const colsHtml = [];
    for (let c = 0; c < colsCount; c++) {
      colsHtml.push(`
        <td colspan="1" rowspan="1" data-row="${atRow}" data-col="${c}" class="td-cell td-empty-slot" style="padding:0 !important;border-bottom:none;">
          <div class="file-empty-slot" data-row="${atRow}" data-col="${c}" style="height:0px;min-height:0px;max-height:0px;opacity:0;overflow:hidden;transition:max-height 260ms cubic-bezier(0.16, 1, 0.3, 1), min-height 260ms, opacity 220ms ease;">
            <button type="button" class="btn-slot-add-field" data-row="${atRow}" data-col="${c}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Field</span>
            </button>
          </div>
        </td>
      `);
    }
    newTr.innerHTML = colsHtml.join('');

    // 3. Insert into DOM at index atRow
    const refChild = (tbody.children && tbody.children[atRow]) || null;
    tbody.insertBefore(newTr, refChild);

    // 4. Re-index data-row on all rows in tbody
    if (tbody.children) {
      Array.from(tbody.children).forEach((tr, rIdx) => {
        tr.querySelectorAll('.td-cell').forEach(td => td.setAttribute('data-row', rIdx));
        tr.querySelectorAll('.file-combo-cell, .file-empty-slot, .btn-slot-add-field, .btn-cell-options, .combo-key-input, .combo-val-input, .grid-delete-row-btn').forEach(el => el.setAttribute('data-row', rIdx));
      });
    }

    if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);

    // 5. Trigger smooth expansion in next frame
    requestAnimationFrame(() => {
      newTr.style.transition = 'height 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      newTr.style.height = '38px';
      newTr.querySelectorAll('.file-empty-slot').forEach(slot => {
        slot.style.maxHeight = '38px';
        slot.style.minHeight = '38px';
        slot.style.height = '100%';
        slot.style.opacity = '1';
      });
      newTr.querySelectorAll('td.td-cell').forEach(td => {
        td.style.borderBottom = '1px solid var(--color-border)';
      });
    });

    // 6. Cleanup after transition
    setTimeout(() => {
      newTr.classList.remove('grid-row-entering');
      newTr.style.transition = '';
      newTr.style.height = '';
      newTr.style.overflow = '';
      newTr.querySelectorAll('.file-empty-slot').forEach(slot => {
        slot.style.transition = '';
        slot.style.maxHeight = '';
        slot.style.minHeight = '';
        slot.style.height = '';
        slot.style.opacity = '';
        slot.style.overflow = '';
      });
      newTr.querySelectorAll('td.td-cell').forEach(td => {
        td.style.borderBottom = '';
      });
      state.isGridAnimating = false;
      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);
    }, 280);

    QrewUI.showToast(`Row added at position ${atRow + 1}`, 'info');
  };

  const animateDeleteGridRow = (officeId, tenantId, tpl, atRow, wrapEl, tableEl, toastMsg = null, undoAction = null) => {
    if (!wrapEl || !tableEl) {
      deleteGridRow(tpl, atRow);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }
    const grid = ensureHeaderGrid(tpl);
    if (grid.rowsCount <= 1) return;
    const tbody = tableEl.querySelector('tbody');
    if (!tbody || !tbody.children || !tbody.children[atRow]) {
      deleteGridRow(tpl, atRow);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }

    if (state.isGridAnimating) return;
    state.isGridAnimating = true;

    // Hide proximity lines immediately
    const hLine = wrapEl.querySelector('#grid-divider-hline');
    const vLine = wrapEl.querySelector('#grid-divider-vline');
    if (hLine) hLine.style.display = 'none';
    if (vLine) vLine.style.display = 'none';

    const trToDelete = tbody.children[atRow];
    trToDelete.classList.add('grid-row-collapsing');
    trToDelete.style.transition = 'height 240ms cubic-bezier(0.16, 1, 0.3, 1)';
    trToDelete.style.height = '0px';
    trToDelete.style.overflow = 'hidden';

    trToDelete.querySelectorAll('td.td-cell').forEach(td => {
      td.style.transition = 'padding 240ms cubic-bezier(0.16, 1, 0.3, 1), border-color 200ms ease';
      td.style.padding = '0 !important';
      td.style.borderBottomColor = 'transparent';
      td.style.borderRightColor = 'transparent';
    });

    trToDelete.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
      el.style.transition = 'max-height 240ms cubic-bezier(0.16, 1, 0.3, 1), min-height 240ms, opacity 200ms ease';
      el.style.maxHeight = '0px';
      el.style.minHeight = '0px';
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.overflow = 'hidden';
    });

    setTimeout(() => {
      if (trToDelete.remove) trToDelete.remove();
      else if (trToDelete.parentNode) trToDelete.parentNode.removeChild(trToDelete);

      deleteGridRow(tpl, atRow);

      // Re-index data-row on remaining rows
      if (tbody.children) {
        Array.from(tbody.children).forEach((tr, rIdx) => {
          tr.querySelectorAll('.td-cell').forEach(td => td.setAttribute('data-row', rIdx));
          tr.querySelectorAll('.file-combo-cell, .file-empty-slot, .btn-slot-add-field, .btn-cell-options, .combo-key-input, .combo-val-input, .grid-delete-row-btn').forEach(el => el.setAttribute('data-row', rIdx));
        });
      }

      state.isGridAnimating = false;
      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);
    }, 250);

    const msg = toastMsg || `Row ${atRow + 1} deleted`;
    QrewUI.showToast(msg, 'info', undoAction ? 4500 : 3200, undoAction);
  };

  const animateInsertGridCol = (officeId, tenantId, tpl, atCol, wrapEl, tableEl) => {
    if (!wrapEl || !tableEl) {
      insertGridCol(tpl, atCol);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }
    const grid = ensureHeaderGrid(tpl);
    if (grid.colsCount >= 5) {
      QrewUI.showToast('Column limit reached (Maximum 5 columns).', 'warning');
      return;
    }
    const tbody = tableEl.querySelector('tbody');
    const colgroup = tableEl.querySelector('colgroup');
    if (!tbody) {
      insertGridCol(tpl, atCol);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }

    if (state.isGridAnimating) return;
    state.isGridAnimating = true;

    // Hide proximity lines immediately
    const hLine = wrapEl.querySelector('#grid-divider-hline');
    const vLine = wrapEl.querySelector('#grid-divider-vline');
    if (hLine) hLine.style.display = 'none';
    if (vLine) vLine.style.display = 'none';

    insertGridCol(tpl, atCol);
    const newColsCount = grid.colsCount;
    const newWidthPct = (100 / newColsCount).toFixed(2);

    // Insert new <col> in <colgroup>
    let newCol = null;
    if (colgroup) {
      newCol = document.createElement('col');
      newCol.style.width = '0%';
      newCol.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      const refCol = (colgroup.children && colgroup.children[atCol]) || null;
      colgroup.insertBefore(newCol, refCol);
    }

    // Insert new <td> into every row in tbody
    const newTds = [];
    if (tbody.children) {
      Array.from(tbody.children).forEach((tr, rIdx) => {
        const newTd = document.createElement('td');
        newTd.className = 'td-cell td-empty-slot td-col-entering';
        newTd.setAttribute('colspan', '1');
        newTd.setAttribute('rowspan', '1');
        newTd.setAttribute('data-row', rIdx);
        newTd.setAttribute('data-col', atCol);
        newTd.style.width = '0%';
        newTd.style.maxWidth = '0px';
        newTd.style.opacity = '0';
        newTd.style.overflow = 'hidden';
        newTd.style.padding = '0 !important';
        newTd.style.borderRightColor = 'transparent';
        newTd.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1), max-width 260ms, opacity 240ms ease, border-color 240ms ease';

        newTd.innerHTML = `
          <div class="file-empty-slot" data-row="${rIdx}" data-col="${atCol}" style="width:0px;max-width:0px;opacity:0;overflow:hidden;transition:width 260ms cubic-bezier(0.16, 1, 0.3, 1), max-width 260ms, opacity 240ms ease;">
            <button type="button" class="btn-slot-add-field" data-row="${rIdx}" data-col="${atCol}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Field</span>
            </button>
          </div>
        `;

        const refTd = (tr.children && tr.children[atCol]) || null;
        tr.insertBefore(newTd, refTd);
        newTds.push(newTd);
      });

      // Update data-col attributes on all cells
      Array.from(tbody.children).forEach(tr => {
        if (tr.children) {
          Array.from(tr.children).forEach((td, cIdx) => {
            td.setAttribute('data-col', cIdx);
            td.querySelectorAll('.file-combo-cell, .file-empty-slot, .btn-slot-add-field, .btn-cell-options, .combo-key-input, .combo-val-input, .grid-delete-col-btn').forEach(el => el.setAttribute('data-col', cIdx));
          });
        }
      });

      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
    }

    // Trigger smooth width transition in next animation frame
    requestAnimationFrame(() => {
      if (colgroup && colgroup.children) {
        Array.from(colgroup.children).forEach(col => {
          col.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1)';
          col.style.width = `${newWidthPct}%`;
        });
      }
      tableEl.querySelectorAll('td.td-cell').forEach(td => {
        td.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1), max-width 260ms, opacity 240ms ease, border-color 240ms ease';
        td.style.width = `${newWidthPct}%`;
      });
      newTds.forEach(td => {
        td.style.maxWidth = '';
        td.style.opacity = '1';
        td.style.borderRightColor = '';
        const slot = td.querySelector('.file-empty-slot');
        if (slot) {
          slot.style.width = '100%';
          slot.style.maxWidth = '';
          slot.style.opacity = '1';
        }
      });
    });

    // Cleanup after transition
    setTimeout(() => {
      newTds.forEach(td => {
        td.classList.remove('td-col-entering');
        td.style.transition = '';
        td.style.overflow = '';
        const slot = td.querySelector('.file-empty-slot');
        if (slot) {
          slot.style.transition = '';
          slot.style.width = '';
          slot.style.overflow = '';
        }
      });
      tableEl.querySelectorAll('td.td-cell').forEach(td => {
        td.style.transition = '';
      });
      if (colgroup && colgroup.children) {
        Array.from(colgroup.children).forEach(col => col.style.transition = '');
      }
      state.isGridAnimating = false;
      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);
    }, 280);

    QrewUI.showToast(`Column added at position ${atCol + 1}`, 'info');
  };

  const animateDeleteGridCol = (officeId, tenantId, tpl, atCol, wrapEl, tableEl, toastMsg = null, undoAction = null) => {
    if (!wrapEl || !tableEl) {
      deleteGridCol(tpl, atCol);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }
    const grid = ensureHeaderGrid(tpl);
    if (grid.colsCount <= 1) return;
    const tbody = tableEl.querySelector('tbody');
    const colgroup = tableEl.querySelector('colgroup');
    if (!tbody) {
      deleteGridCol(tpl, atCol);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      return;
    }

    if (state.isGridAnimating) return;
    state.isGridAnimating = true;

    // Hide proximity lines immediately
    const hLine = wrapEl.querySelector('#grid-divider-hline');
    const vLine = wrapEl.querySelector('#grid-divider-vline');
    if (hLine) hLine.style.display = 'none';
    if (vLine) vLine.style.display = 'none';

    const newColsCount = grid.colsCount - 1;
    const newWidthPct = (100 / newColsCount).toFixed(2);

    const targetCol = (colgroup && colgroup.children && colgroup.children[atCol]) || null;
    const tdsToDelete = [];
    if (tbody.children) {
      Array.from(tbody.children).forEach(tr => {
        const td = tr.children && tr.children[atCol];
        if (td) tdsToDelete.push(td);
      });
    }

    if (targetCol) {
      targetCol.style.transition = 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)';
      targetCol.style.width = '0%';
    }
    if (colgroup && colgroup.children) {
      Array.from(colgroup.children).forEach((col, idx) => {
        if (idx !== atCol) {
          col.style.transition = 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)';
          col.style.width = `${newWidthPct}%`;
        }
      });
    }

    tdsToDelete.forEach(td => {
      td.classList.add('td-col-collapsing');
      td.style.transition = 'width 240ms cubic-bezier(0.16, 1, 0.3, 1), max-width 240ms, opacity 200ms ease, border-color 200ms ease, padding 240ms';
      td.style.width = '0%';
      td.style.maxWidth = '0px';
      td.style.opacity = '0';
      td.style.overflow = 'hidden';
      td.style.padding = '0 !important';
      td.style.borderRightColor = 'transparent';
      const inner = td.querySelector('.file-combo-cell, .file-empty-slot');
      if (inner) {
        inner.style.transition = 'width 240ms cubic-bezier(0.16, 1, 0.3, 1), max-width 240ms, opacity 200ms ease';
        inner.style.width = '0px';
        inner.style.maxWidth = '0px';
        inner.style.opacity = '0';
        inner.style.overflow = 'hidden';
      }
    });

    if (tbody.children) {
      Array.from(tbody.children).forEach(tr => {
        if (tr.children) {
          Array.from(tr.children).forEach((td, idx) => {
            if (idx !== atCol) {
              td.style.transition = 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)';
              td.style.width = `${newWidthPct}%`;
            }
          });
        }
      });
    }

    setTimeout(() => {
      if (targetCol) {
        if (targetCol.remove) targetCol.remove();
        else if (targetCol.parentNode) targetCol.parentNode.removeChild(targetCol);
      }
      tdsToDelete.forEach(td => {
        if (td.remove) td.remove();
        else if (td.parentNode) td.parentNode.removeChild(td);
      });

      deleteGridCol(tpl, atCol);

      if (tbody.children) {
        Array.from(tbody.children).forEach(tr => {
          if (tr.children) {
            Array.from(tr.children).forEach((td, cIdx) => {
              td.setAttribute('data-col', cIdx);
              td.querySelectorAll('.file-combo-cell, .file-empty-slot, .btn-slot-add-field, .btn-cell-options, .combo-key-input, .combo-val-input, .grid-delete-col-btn').forEach(el => el.setAttribute('data-col', cIdx));
            });
          }
        });
      }

      tableEl.querySelectorAll('td.td-cell').forEach(td => td.style.transition = '');
      if (colgroup && colgroup.children) {
        Array.from(colgroup.children).forEach(col => col.style.transition = '');
      }

      state.isGridAnimating = false;
      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);
    }, 250);

    const msg = toastMsg || `Column ${atCol + 1} deleted`;
    QrewUI.showToast(msg, 'info', undoAction ? 4500 : 3200, undoAction);
  };

  const animateRestoreGridRow = (officeId, tenantId, tpl, restoredGridSnapshot, restoredRowIdx, wrapEl, tableEl) => {
    if (!wrapEl || !tableEl) {
      tpl.headerGrid = JSON.parse(JSON.stringify(restoredGridSnapshot));
      syncGridToHeaderFields(tpl);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      QrewUI.showToast(`Row ${restoredRowIdx + 1} restored`, 'success');
      return;
    }

    const tbody = tableEl.querySelector('tbody');
    if (!tbody) {
      tpl.headerGrid = JSON.parse(JSON.stringify(restoredGridSnapshot));
      syncGridToHeaderFields(tpl);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      QrewUI.showToast(`Row ${restoredRowIdx + 1} restored`, 'success');
      return;
    }

    state.isGridAnimating = false;
    state.isGridAnimating = true;

    // Hide proximity lines immediately
    const hLine = wrapEl.querySelector('#grid-divider-hline');
    const vLine = wrapEl.querySelector('#grid-divider-vline');
    if (hLine) hLine.style.display = 'none';
    if (vLine) vLine.style.display = 'none';

    // 1. Update data model to snapshot
    tpl.headerGrid = JSON.parse(JSON.stringify(restoredGridSnapshot));
    syncGridToHeaderFields(tpl);

    // 2. Render restored row using full renderFileDetailsGrid in a temp container
    const tempTable = document.createElement('table');
    tempTable.innerHTML = `<tbody>${renderFileDetailsGrid(tpl)}</tbody>`;
    const tempTbody = tempTable.querySelector('tbody');
    const newTr = (tempTbody && tempTbody.children && tempTbody.children[restoredRowIdx]) || null;

    if (!newTr) {
      state.isGridAnimating = false;
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      QrewUI.showToast(`Row ${restoredRowIdx + 1} restored`, 'success');
      return;
    }

    // 3. Set entering classes and 0-height collapse styling for smooth expansion
    newTr.classList.add('grid-row-entering');
    newTr.style.height = '0px';
    newTr.style.overflow = 'hidden';

    newTr.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
      el.style.maxHeight = '0px';
      el.style.minHeight = '0px';
      el.style.height = '0px';
      el.style.opacity = '0';
      el.style.overflow = 'hidden';
      el.style.transition = 'max-height 260ms cubic-bezier(0.16, 1, 0.3, 1), min-height 260ms, opacity 220ms ease';
    });

    newTr.querySelectorAll('td.td-cell').forEach(td => {
      td.style.padding = '0 !important';
      td.style.borderBottom = 'none';
    });

    // 4. Insert into DOM at index restoredRowIdx
    const refChild = (tbody.children && tbody.children[restoredRowIdx]) || null;
    tbody.insertBefore(newTr, refChild);

    // 5. Re-index data-row on all rows in tbody
    if (tbody.children) {
      Array.from(tbody.children).forEach((tr, rIdx) => {
        tr.querySelectorAll('.td-cell').forEach(td => td.setAttribute('data-row', rIdx));
        tr.querySelectorAll('.file-combo-cell, .file-empty-slot, .btn-slot-add-field, .btn-cell-options, .combo-key-input, .combo-val-input, .grid-delete-row-btn').forEach(el => el.setAttribute('data-row', rIdx));
      });
    }

    // 6. Trigger smooth expansion in next animation frame
    requestAnimationFrame(() => {
      newTr.style.transition = 'height 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      newTr.style.height = '38px';
      newTr.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
        el.style.maxHeight = '38px';
        el.style.minHeight = '38px';
        el.style.height = '100%';
        el.style.opacity = '1';
      });
      newTr.querySelectorAll('td.td-cell').forEach(td => {
        td.style.borderBottom = '1px solid var(--color-border)';
      });
    });

    // 7. Cleanup after transition
    setTimeout(() => {
      newTr.classList.remove('grid-row-entering');
      newTr.style.transition = '';
      newTr.style.height = '';
      newTr.style.overflow = '';
      newTr.querySelectorAll('.file-combo-cell, .file-empty-slot').forEach(el => {
        el.style.transition = '';
        el.style.maxHeight = '';
        el.style.minHeight = '';
        el.style.height = '';
        el.style.opacity = '';
        el.style.overflow = '';
      });
      newTr.querySelectorAll('td.td-cell').forEach(td => {
        td.style.borderBottom = '';
        td.style.padding = '';
      });
      state.isGridAnimating = false;
      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);
    }, 280);

    QrewUI.showToast(`Row ${restoredRowIdx + 1} restored`, 'success');
  };

  const animateRestoreGridCol = (officeId, tenantId, tpl, restoredGridSnapshot, restoredColIdx, wrapEl, tableEl) => {
    if (!wrapEl || !tableEl) {
      tpl.headerGrid = JSON.parse(JSON.stringify(restoredGridSnapshot));
      syncGridToHeaderFields(tpl);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      QrewUI.showToast(`Column ${restoredColIdx + 1} restored`, 'success');
      return;
    }

    const tbody = tableEl.querySelector('tbody');
    const colgroup = tableEl.querySelector('colgroup');
    if (!tbody) {
      tpl.headerGrid = JSON.parse(JSON.stringify(restoredGridSnapshot));
      syncGridToHeaderFields(tpl);
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
      QrewUI.showToast(`Column ${restoredColIdx + 1} restored`, 'success');
      return;
    }

    state.isGridAnimating = false;
    state.isGridAnimating = true;

    // Hide proximity lines immediately
    const hLine = wrapEl.querySelector('#grid-divider-hline');
    const vLine = wrapEl.querySelector('#grid-divider-vline');
    if (hLine) hLine.style.display = 'none';
    if (vLine) vLine.style.display = 'none';

    // 1. Update data model to snapshot
    tpl.headerGrid = JSON.parse(JSON.stringify(restoredGridSnapshot));
    syncGridToHeaderFields(tpl);

    // 2. Render all cells using full renderFileDetailsGrid in a temp table
    const tempTable = document.createElement('table');
    tempTable.innerHTML = `<tbody>${renderFileDetailsGrid(tpl)}</tbody>`;
    const tempTbody = tempTable.querySelector('tbody');
    const tempTrs = tempTbody ? tempTbody.children : [];

    const newColsCount = tpl.headerGrid.colsCount;
    const newWidthPct = (100 / newColsCount).toFixed(2);

    // 3. Insert new <col> in <colgroup>
    let newCol = null;
    if (colgroup) {
      newCol = document.createElement('col');
      newCol.style.width = '0%';
      newCol.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1)';
      const refCol = (colgroup.children && colgroup.children[restoredColIdx]) || null;
      colgroup.insertBefore(newCol, refCol);
    }

    // 4. Insert restored <td> into each row in tbody
    const newTds = [];
    if (tbody.children) {
      Array.from(tbody.children).forEach((tr, rIdx) => {
        const sourceTr = tempTrs[rIdx];
        const sourceTd = sourceTr ? sourceTr.children[restoredColIdx] : null;
        let newTd;
        if (sourceTd) {
          newTd = sourceTd;
        } else {
          newTd = document.createElement('td');
          newTd.className = 'td-cell td-empty-slot';
          newTd.setAttribute('colspan', '1');
          newTd.setAttribute('rowspan', '1');
          newTd.setAttribute('data-row', rIdx);
          newTd.setAttribute('data-col', restoredColIdx);
          newTd.innerHTML = `<div class="file-empty-slot" data-row="${rIdx}" data-col="${restoredColIdx}"><button type="button" class="btn-slot-add-field" data-row="${rIdx}" data-col="${restoredColIdx}"><span>Add Field</span></button></div>`;
        }

        newTd.classList.add('td-col-entering');
        newTd.style.width = '0%';
        newTd.style.maxWidth = '0px';
        newTd.style.opacity = '0';
        newTd.style.overflow = 'hidden';
        newTd.style.padding = '0 !important';
        newTd.style.borderRightColor = 'transparent';
        newTd.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1), max-width 260ms, opacity 240ms ease, border-color 240ms ease';

        const inner = newTd.querySelector('.file-combo-cell, .file-empty-slot');
        if (inner) {
          inner.style.width = '0px';
          inner.style.maxWidth = '0px';
          inner.style.opacity = '0';
          inner.style.overflow = 'hidden';
          inner.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1), max-width 260ms, opacity 240ms ease';
        }

        const refTd = (tr.children && tr.children[restoredColIdx]) || null;
        tr.insertBefore(newTd, refTd);
        newTds.push(newTd);
      });

      // Update data-col attributes on all cells
      Array.from(tbody.children).forEach(tr => {
        if (tr.children) {
          Array.from(tr.children).forEach((td, cIdx) => {
            td.setAttribute('data-col', cIdx);
            td.querySelectorAll('.file-combo-cell, .file-empty-slot, .btn-slot-add-field, .btn-cell-options, .combo-key-input, .combo-val-input, .grid-delete-col-btn').forEach(el => el.setAttribute('data-col', cIdx));
          });
        }
      });

      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
    }

    // 5. Trigger smooth width transition in next animation frame
    requestAnimationFrame(() => {
      if (colgroup && colgroup.children) {
        Array.from(colgroup.children).forEach(col => {
          col.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1)';
          col.style.width = `${newWidthPct}%`;
        });
      }
      tableEl.querySelectorAll('td.td-cell').forEach(td => {
        td.style.transition = 'width 260ms cubic-bezier(0.16, 1, 0.3, 1), max-width 260ms, opacity 240ms ease, border-color 240ms ease';
        td.style.width = `${newWidthPct}%`;
      });
      newTds.forEach(td => {
        td.style.maxWidth = '';
        td.style.opacity = '1';
        td.style.borderRightColor = '';
        const inner = td.querySelector('.file-combo-cell, .file-empty-slot');
        if (inner) {
          inner.style.width = '100%';
          inner.style.maxWidth = '';
          inner.style.opacity = '1';
        }
      });
    });

    // 6. Cleanup after transition
    setTimeout(() => {
      newTds.forEach(td => {
        td.classList.remove('td-col-entering');
        td.style.transition = '';
        td.style.overflow = '';
        const inner = td.querySelector('.file-combo-cell, .file-empty-slot');
        if (inner) {
          inner.style.transition = '';
          inner.style.width = '';
          inner.style.overflow = '';
        }
      });
      tableEl.querySelectorAll('td.td-cell').forEach(td => {
        td.style.transition = '';
      });
      if (colgroup && colgroup.children) {
        Array.from(colgroup.children).forEach(col => col.style.transition = '');
      }
      state.isGridAnimating = false;
      if (refreshGridDeleteButtons) refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);
      bindFileDetailsGridEvents(officeId, tenantId, tpl, Qrew.dom.mainContent);
    }, 280);

    QrewUI.showToast(`Column ${restoredColIdx + 1} restored`, 'success');
  };

  Qrew.views['office-config'].animateDeleteGridRow = animateDeleteGridRow;
  Qrew.views['office-config'].animateDeleteGridCol = animateDeleteGridCol;
  Qrew.views['office-config'].animateInsertGridRow = animateInsertGridRow;
  Qrew.views['office-config'].animateInsertGridCol = animateInsertGridCol;
  Qrew.views['office-config'].animateRestoreGridRow = animateRestoreGridRow;
  Qrew.views['office-config'].animateRestoreGridCol = animateRestoreGridCol;

  refreshGridDeleteButtons = (wrapEl, tableEl, tpl, officeId, tenantId) => {
    if (!wrapEl || !tableEl || !tpl) return;
    const grid = ensureHeaderGrid(tpl);
    const { colsCount, rowsCount, cells } = grid;
    const isEditMode = (state.gridMode === 'edit');
    const tbody = tableEl.querySelector('tbody');
    if (!tbody || !tbody.children) return;

    // Remove any existing delete buttons first to avoid duplicates or stale references
    tableEl.querySelectorAll('.grid-delete-row-btn, .grid-delete-col-btn').forEach(el => el.remove());

    if (isEditMode) return;

    // 1. Create Row Delete Buttons (Right edge)
    if (rowsCount > 1) {
      for (let r = 0; r < rowsCount; r++) {
        let targetTd = null;
        let topStyle = '';

        if (cells && Array.isArray(cells)) {
          const coveringCell = cells.find(cCell => {
            const rSpan = cCell.rowspan || 1;
            const cSpan = cCell.colspan || 1;
            return cCell.row <= r && (cCell.row + rSpan) > r && (cCell.col + cSpan) >= colsCount;
          });
          if (coveringCell) {
            targetTd = tableEl.querySelector(`td.td-cell[data-row="${coveringCell.row}"][data-col="${coveringCell.col}"]`);
            const rSpan = coveringCell.rowspan || 1;
            if (rSpan > 1) {
              const sr = r - coveringCell.row;
              topStyle = `top: ${((sr) / rSpan * 100).toFixed(1)}%; height: ${(100 / rSpan).toFixed(1)}%;`;
            }
          }
        }

        if (!targetTd && tbody.children && tbody.children[r]) {
          const rowTds = Array.from(tbody.children[r].querySelectorAll('td.td-cell'));
          if (rowTds.length > 0) targetTd = rowTds[rowTds.length - 1];
        }

        if (!targetTd) continue;

        const rowBtn = document.createElement('button');
        rowBtn.type = 'button';
        rowBtn.className = 'grid-delete-row-btn';
        rowBtn.setAttribute('data-row', String(r));
        if (topStyle) rowBtn.setAttribute('style', topStyle);
        rowBtn.setAttribute('title', `Delete Row ${r + 1}`);
        rowBtn.setAttribute('aria-label', `Delete Row ${r + 1}`);
        rowBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;

        rowBtn.onclick = (e) => {
          e.stopPropagation();
          if (state.isGridAnimating) return;
          const targetRow = parseInt(rowBtn.getAttribute('data-row'), 10);
          if (isNaN(targetRow) || targetRow < 0 || targetRow >= grid.rowsCount) return;
          if (grid.rowsCount <= 1) {
            QrewUI.showToast('Grid must have at least one row.', 'warning');
            return;
          }

          tableEl.querySelectorAll('tr.is-delete-hover, td.is-delete-hover, tr.is-row-delete-hover, td.is-row-delete-hover').forEach(el => {
            el.classList.remove('is-delete-hover');
            el.classList.remove('is-row-delete-hover');
          });
          flushGridInputsToTemplate(wrapEl, tpl);
          const gridSnapshot = JSON.parse(JSON.stringify(grid));
          const populatedInRow = grid.cells.filter(cCell => cCell.row === targetRow && !cCell.empty && cCell.key && cCell.key.trim().length > 0);

          if (populatedInRow.length === 0) {
            animateDeleteGridRow(officeId, tenantId, tpl, targetRow, wrapEl, tableEl, 'Empty row deleted');
          } else {
            const count = populatedInRow.length;
            const msg = `Row ${targetRow + 1} deleted (${count} field${count > 1 ? 's' : ''} removed)`;
            animateDeleteGridRow(officeId, tenantId, tpl, targetRow, wrapEl, tableEl, msg, {
              label: 'Undo',
              onClick: () => {
                animateRestoreGridRow(officeId, tenantId, tpl, gridSnapshot, targetRow, wrapEl, tableEl);
              }
            });
          }
        };

        rowBtn.onmouseenter = () => {
          rowBtn.classList.add('is-hovered');
          const hLine = wrapEl.querySelector('#grid-divider-hline');
          const vLine = wrapEl.querySelector('#grid-divider-vline');
          if (hLine) hLine.style.display = 'none';
          if (vLine) vLine.style.display = 'none';
          const targetRow = parseInt(rowBtn.getAttribute('data-row'), 10);
          const targetTr = (tbody.children && tbody.children[targetRow]) || null;
          if (targetTr) {
            targetTr.classList.add('is-delete-hover');
            targetTr.classList.add('is-row-delete-hover');
          }
          tableEl.querySelectorAll(`.td-cell[data-row="${targetRow}"]`).forEach(td => {
            td.classList.add('is-delete-hover');
            td.classList.add('is-row-delete-hover');
          });
        };

        rowBtn.onmouseleave = () => {
          rowBtn.classList.remove('is-hovered');
          tableEl.querySelectorAll('tr.is-delete-hover, td.is-delete-hover, tr.is-row-delete-hover, td.is-row-delete-hover').forEach(el => {
            el.classList.remove('is-delete-hover');
            el.classList.remove('is-row-delete-hover');
          });
        };

        targetTd.appendChild(rowBtn);
      }
    }

    // 2. Create Column Delete Buttons (Bottom edge)
    if (colsCount > 1) {
      for (let c = 0; c < colsCount; c++) {
        let bottomTd = null;
        let leftStyle = '';

        if (cells && Array.isArray(cells)) {
          const coveringCell = cells.find(cCell => {
            const rSpan = cCell.rowspan || 1;
            const cSpan = cCell.colspan || 1;
            return (cCell.row + rSpan) >= rowsCount && cCell.col <= c && (cCell.col + cSpan) > c;
          });
          if (coveringCell) {
            bottomTd = tableEl.querySelector(`td.td-cell[data-row="${coveringCell.row}"][data-col="${coveringCell.col}"]`);
            const cSpan = coveringCell.colspan || 1;
            if (cSpan > 1) {
              const sc = c - coveringCell.col;
              leftStyle = `left: ${((sc) / cSpan * 100).toFixed(1)}%; width: ${(100 / cSpan).toFixed(1)}%;`;
            }
          }
        }

        if (!bottomTd) {
          const colCells = Array.from(tableEl.querySelectorAll(`.td-cell[data-col="${c}"]`));
          if (colCells.length > 0) bottomTd = colCells[colCells.length - 1];
        }

        if (!bottomTd) continue;

        const colBtn = document.createElement('button');
        colBtn.type = 'button';
        colBtn.className = 'grid-delete-col-btn';
        colBtn.setAttribute('data-col', String(c));
        if (leftStyle) colBtn.setAttribute('style', leftStyle);
        colBtn.setAttribute('title', `Delete Column ${c + 1}`);
        colBtn.setAttribute('aria-label', `Delete Column ${c + 1}`);
        colBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        `;

        colBtn.onclick = (e) => {
          e.stopPropagation();
          if (state.isGridAnimating) return;
          const targetCol = parseInt(colBtn.getAttribute('data-col'), 10);
          if (isNaN(targetCol) || targetCol < 0 || targetCol >= grid.colsCount) return;
          if (grid.colsCount <= 1) {
            QrewUI.showToast('Grid must have at least one column.', 'warning');
            return;
          }

          tableEl.querySelectorAll('tr.is-delete-hover, td.is-delete-hover, td.is-col-delete-hover').forEach(el => {
            el.classList.remove('is-delete-hover');
            el.classList.remove('is-col-delete-hover');
          });
          flushGridInputsToTemplate(wrapEl, tpl);
          const gridSnapshot = JSON.parse(JSON.stringify(grid));
          const populatedInCol = grid.cells.filter(cCell => cCell.col === targetCol && !cCell.empty && cCell.key && cCell.key.trim().length > 0);

          if (populatedInCol.length === 0) {
            animateDeleteGridCol(officeId, tenantId, tpl, targetCol, wrapEl, tableEl, 'Empty column deleted');
          } else {
            const count = populatedInCol.length;
            const msg = `Column ${targetCol + 1} deleted (${count} field${count > 1 ? 's' : ''} removed)`;
            animateDeleteGridCol(officeId, tenantId, tpl, targetCol, wrapEl, tableEl, msg, {
              label: 'Undo',
              onClick: () => {
                animateRestoreGridCol(officeId, tenantId, tpl, gridSnapshot, targetCol, wrapEl, tableEl);
              }
            });
          }
        };

        colBtn.onmouseenter = () => {
          colBtn.classList.add('is-hovered');
          const hLine = wrapEl.querySelector('#grid-divider-hline');
          const vLine = wrapEl.querySelector('#grid-divider-vline');
          if (hLine) hLine.style.display = 'none';
          if (vLine) vLine.style.display = 'none';
          const targetCol = parseInt(colBtn.getAttribute('data-col'), 10);
          tableEl.querySelectorAll(`.td-cell[data-col="${targetCol}"]`).forEach(td => {
            td.classList.add('is-delete-hover');
            td.classList.add('is-col-delete-hover');
          });
        };

        colBtn.onmouseleave = () => {
          colBtn.classList.remove('is-hovered');
          tableEl.querySelectorAll('.td-cell.is-delete-hover, .td-cell.is-col-delete-hover').forEach(td => {
            td.classList.remove('is-delete-hover');
            td.classList.remove('is-col-delete-hover');
          });
        };

        bottomTd.appendChild(colBtn);
      }
    }
  };

  Qrew.views['office-config'].refreshGridDeleteButtons = refreshGridDeleteButtons;

  const bindFileDetailsGridEvents = (officeId, tenantId, tpl, main) => {
    const wrapEl = main.querySelector('#file-table-wrap');
    const tableEl = main.querySelector('#file-details-table');
    const hLine = main.querySelector('#grid-divider-hline');
    const vLine = main.querySelector('#grid-divider-vline');
    const btnInsertRow = main.querySelector('#btn-insert-row');
    const btnInsertCol = main.querySelector('#btn-insert-col');
    const contextMenu = main.querySelector('#cell-context-menu');

    if (!wrapEl || !tableEl) return;

    const grid = ensureHeaderGrid(tpl);

    // 0. Auto-Balance Grid Layout
    const autoBalanceBtn = main.querySelector('#btn-auto-balance-grid');
    if (autoBalanceBtn) {
      autoBalanceBtn.onclick = (e) => {
        e.stopPropagation();
        if (state.isGridAnimating) return;
        flushGridInputsToTemplate(wrapEl, tpl);
        animateGridFLIP(wrapEl, tableEl, tpl, officeId, tenantId, () => {
          autoBalanceGrid(tpl);
        });
        const g = tpl.headerGrid;
        QrewUI.showToast(`Sheet auto-balanced (${g.colsCount} columns, ${g.rowsCount} rows)`, 'success');
      };
    }

    // 0b. Toggle Grid Mode (Normal vs Edit)
    const toggleModeBtn = main.querySelector('#btn-toggle-grid-mode');
    if (toggleModeBtn) {
      toggleModeBtn.onclick = (e) => {
        e.stopPropagation();
        flushGridInputsToTemplate(wrapEl, tpl);
        state.gridMode = state.gridMode === 'edit' ? 'normal' : 'edit';
        renderInvoiceTemplatesWorkspace(officeId, tenantId);
        QrewUI.showToast(state.gridMode === 'edit' ? 'Edit Mode: Click fields to edit' : 'Normal Mode: Select, multi-select, or drag cells', 'info');
      };
    }

    // 0c. Row and Column Delete Badges
    refreshGridDeleteButtons(wrapEl, tableEl, tpl, officeId, tenantId);

    // Hover sync for columns: hovering any cell in col c reveals the delete badge for that col
    wrapEl.querySelectorAll('.td-cell').forEach(td => {
      td.addEventListener('mouseenter', () => {
        const c = td.getAttribute('data-col');
        if (c !== null) {
          const colBtn = wrapEl.querySelector(`.grid-delete-col-btn[data-col="${c}"]`);
          if (colBtn) colBtn.classList.add('is-hovered');
        }
      });
      td.addEventListener('mouseleave', (e) => {
        if (e && e.relatedTarget && e.relatedTarget.closest && (e.relatedTarget.closest('.grid-delete-col-btn') || e.relatedTarget.closest('.grid-delete-row-btn'))) {
          return;
        }
        const c = td.getAttribute('data-col');
        if (c !== null) {
          const colBtn = wrapEl.querySelector(`.grid-delete-col-btn[data-col="${c}"]`);
          if (colBtn) colBtn.classList.remove('is-hovered');
        }
      });
    });

    // Normal Mode: Selection and Multi-Selection
    if (state.gridMode !== 'edit') {
      wrapEl.querySelectorAll('.td-cell').forEach(td => {
        td.onclick = (e) => {
          if (e.target.closest('.btn-cell-options') || e.target.closest('.btn-slot-add-field')) return;
          const r = parseInt(td.getAttribute('data-row'), 10);
          const c = parseInt(td.getAttribute('data-col'), 10);
          const coordKey = `${r},${c}`;

          if (!state.selectedGridCells) state.selectedGridCells = new Set();

          if (e.ctrlKey || e.metaKey) {
            if (state.selectedGridCells.has(coordKey)) {
              state.selectedGridCells.delete(coordKey);
              td.classList.remove('is-selected');
            } else {
              state.selectedGridCells.add(coordKey);
              td.classList.add('is-selected');
            }
          } else if (e.shiftKey && state.lastSelectedGridCell) {
            const rMin = Math.min(state.lastSelectedGridCell.row, r);
            const rMax = Math.max(state.lastSelectedGridCell.row, r);
            const cMin = Math.min(state.lastSelectedGridCell.col, c);
            const cMax = Math.max(state.lastSelectedGridCell.col, c);

            wrapEl.querySelectorAll('.td-cell').forEach(otherTd => {
              const oR = parseInt(otherTd.getAttribute('data-row'), 10);
              const oC = parseInt(otherTd.getAttribute('data-col'), 10);
              if (oR >= rMin && oR <= rMax && oC >= cMin && oC <= cMax) {
                state.selectedGridCells.add(`${oR},${oC}`);
                otherTd.classList.add('is-selected');
              }
            });
          } else {
            state.selectedGridCells.clear();
            wrapEl.querySelectorAll('.td-cell.is-selected').forEach(el => el.classList.remove('is-selected'));
            state.selectedGridCells.add(coordKey);
            td.classList.add('is-selected');
            state.lastSelectedGridCell = { row: r, col: c };
          }
        };
      });
    }

    // 1. Proximity Divider Detection
    const closeThreshold = 10;
    const latchThreshold = 18;
    let isHoveringRowInsert = false;
    let isHoveringColInsert = false;

    if (btnInsertRow) {
      btnInsertRow.onmouseenter = () => {
        isHoveringRowInsert = true;
        if (hLine) hLine.style.display = 'block';
        if (vLine) vLine.style.display = 'none';
      };
      btnInsertRow.onmouseleave = () => {
        isHoveringRowInsert = false;
      };
      btnInsertRow.onclick = (e) => {
        e.stopPropagation();
        isHoveringRowInsert = false;
        if (hLine) hLine.style.display = 'none';
        if (vLine) vLine.style.display = 'none';
        const atRow = parseInt(btnInsertRow.dataset.row || '0', 10);
        animateInsertGridRow(officeId, tenantId, tpl, atRow, wrapEl, tableEl);
      };
    }

    if (btnInsertCol) {
      btnInsertCol.onmouseenter = () => {
        isHoveringColInsert = true;
        if (vLine) vLine.style.display = 'block';
        if (hLine) hLine.style.display = 'none';
      };
      btnInsertCol.onmouseleave = () => {
        isHoveringColInsert = false;
      };
      btnInsertCol.onclick = (e) => {
        e.stopPropagation();
        isHoveringColInsert = false;
        if (hLine) hLine.style.display = 'none';
        if (vLine) vLine.style.display = 'none';
        const atCol = parseInt(btnInsertCol.dataset.col || '0', 10);
        animateInsertGridCol(officeId, tenantId, tpl, atCol, wrapEl, tableEl);
      };
    }

    wrapEl.onmousemove = (e) => {
      if (state.draggedGridCell || (e.target && e.target.closest && (e.target.closest('.grid-delete-row-btn') || e.target.closest('.grid-delete-col-btn')))) {
        if (hLine) hLine.style.display = 'none';
        if (vLine) vLine.style.display = 'none';
        return;
      }
      if (contextMenu && contextMenu.style.display && contextMenu.style.display !== 'none') return;

      // Lock row indicator if hovering row (+) button
      if (isHoveringRowInsert || (e.target && e.target.closest && e.target.closest('#btn-insert-row'))) {
        if (vLine) vLine.style.display = 'none';
        if (hLine) hLine.style.display = 'block';
        return;
      }

      // Lock col indicator if hovering col (+) button
      if (isHoveringColInsert || (e.target && e.target.closest && e.target.closest('#btn-insert-col'))) {
        if (hLine) hLine.style.display = 'none';
        if (vLine) vLine.style.display = 'block';
        return;
      }

      const wrapRect = wrapEl.getBoundingClientRect();
      const tableRect = tableEl.getBoundingClientRect();
      const mX = e.clientX;
      const mY = e.clientY;

      if (mX < tableRect.left - 40 || mX > tableRect.right + 40 || mY < tableRect.top - 40 || mY > tableRect.bottom + 40) {
        if (hLine) hLine.style.display = 'none';
        if (vLine) vLine.style.display = 'none';
        return;
      }

      // Horizontal row dividers with latching hysteresis & button-intersection proximity gating
      const tbodyEl = tableEl.querySelector('tbody');
      const trs = tbodyEl && tbodyEl.children ? Array.from(tbodyEl.children) : Array.from(tableEl.querySelectorAll('tbody > tr'));
      let nearestRowBoundary = null;
      let minRowDist = Infinity;
      let targetRowIdx = 0;

      if (trs.length > 0) {
        const top0 = trs[0].getBoundingClientRect().top;
        const d0 = Math.abs(mY - top0);
        if (d0 < minRowDist) {
          minRowDist = d0;
          nearestRowBoundary = top0;
          targetRowIdx = 0;
        }

        trs.forEach((tr, i) => {
          const btm = tr.getBoundingClientRect().bottom;
          const dist = Math.abs(mY - btm);
          if (dist < minRowDist) {
            minRowDist = dist;
            nearestRowBoundary = btm;
            targetRowIdx = i + 1;
          }
        });
      }

      const isHLineActive = hLine && hLine.style.display === 'block';
      const effectiveRowThreshold = isHLineActive ? latchThreshold : closeThreshold;
      const dxFromLeft = mX - tableRect.left;
      const effectiveRowZoneMax = isHLineActive ? 64 : 56;
      const isNearRowButtonZone = (dxFromLeft >= -32 && dxFromLeft <= effectiveRowZoneMax);
      const canShowHLine = (nearestRowBoundary !== null && minRowDist <= effectiveRowThreshold && isNearRowButtonZone);

      // Vertical column dividers with latching hysteresis & button-intersection proximity gating (capped at 5)
      let canShowVLine = false;
      let nearestColBoundary = null;
      let targetColIdx = 0;

      if (grid.colsCount < 5) {
        const colW = tableRect.width / grid.colsCount;
        let minColDist = Infinity;

        for (let c = 0; c <= grid.colsCount; c++) {
          const colX = tableRect.left + (colW * c);
          const dist = Math.abs(mX - colX);
          if (dist < minColDist) {
            minColDist = dist;
            nearestColBoundary = colX;
            targetColIdx = c;
          }
        }

        const isVLineActive = vLine && vLine.style.display === 'block';
        const effectiveColThreshold = isVLineActive ? latchThreshold : closeThreshold;
        const dyFromTop = mY - tableRect.top;
        const effectiveColZoneMax = isVLineActive ? 52 : 44;
        const isNearColButtonZone = (dyFromTop >= -32 && dyFromTop <= effectiveColZoneMax);
        canShowVLine = (nearestColBoundary !== null && minColDist <= effectiveColThreshold && isNearColButtonZone);
      }

      // Mutual exclusion: if both qualify (e.g. top-left corner), pick the one closer to its (+) button
      let showH = canShowHLine;
      let showV = canShowVLine;

      if (showH && showV && nearestRowBoundary !== null && nearestColBoundary !== null) {
        const distToRowBtn = Math.hypot(mX - tableRect.left, mY - nearestRowBoundary);
        const distToColBtn = Math.hypot(mX - nearestColBoundary, mY - tableRect.top);
        if (distToRowBtn <= distToColBtn) {
          showV = false;
        } else {
          showH = false;
        }
      }

      if (hLine) {
        if (showH && nearestRowBoundary !== null) {
          hLine.style.display = 'block';
          hLine.style.top = `${nearestRowBoundary - wrapRect.top}px`;
          hLine.style.left = `${tableRect.left - wrapRect.left}px`;
          hLine.style.width = `${tableRect.width}px`;
          if (btnInsertRow) {
            if (!btnInsertRow.dataset) btnInsertRow.dataset = {};
            btnInsertRow.dataset.row = String(targetRowIdx);
          }
        } else if (!isHoveringRowInsert) {
          hLine.style.display = 'none';
        }
      }

      if (vLine) {
        if (showV && nearestColBoundary !== null) {
          vLine.style.display = 'block';
          vLine.style.left = `${nearestColBoundary - wrapRect.left}px`;
          vLine.style.top = `${tableRect.top - wrapRect.top}px`;
          vLine.style.height = `${tableRect.height}px`;
          if (btnInsertCol) {
            if (!btnInsertCol.dataset) btnInsertCol.dataset = {};
            btnInsertCol.dataset.col = String(targetColIdx);
          }
        } else if (!isHoveringColInsert) {
          vLine.style.display = 'none';
        }
      }
    };

    wrapEl.onmouseleave = (e) => {
      if (e && e.relatedTarget && e.relatedTarget.closest && (e.relatedTarget.closest('#grid-divider-hline') || e.relatedTarget.closest('#grid-divider-vline'))) {
        return;
      }
      if (!isHoveringRowInsert && !isHoveringColInsert) {
        if (hLine) hLine.style.display = 'none';
        if (vLine) vLine.style.display = 'none';
      }
    };

    // 2. Live Interactive Drag & Drop with Center-Crossing Physics (Active only in Normal Mode)
    if (state.gridMode !== 'edit') {
      let liveDragState = null;

      const resetLiveDragVisuals = () => {
        tableEl.querySelectorAll('.td-cell, .file-combo-cell, .file-empty-slot').forEach(el => {
          el.style.transform = '';
          el.style.transition = '';
        });
        wrapEl.querySelectorAll('.is-drag-placeholder').forEach(el => el.classList.remove('is-drag-placeholder'));
        wrapEl.querySelectorAll('.is-dragging').forEach(el => el.classList.remove('is-dragging'));
        wrapEl.querySelectorAll('.grid-drop-target').forEach(el => el.classList.remove('grid-drop-target'));
      };

      const measureGridBounds = () => {
        const tableRect = tableEl.getBoundingClientRect ? tableEl.getBoundingClientRect() : { top: 0, bottom: 0, left: 0, right: 0, width: 0, height: 0 };
        const tbody = tableEl.querySelector('tbody');
        const trs = tbody ? Array.from(tbody.children).filter(tr => !tr.classList.contains('grid-row-collapsing')) : [];

        const rowBounds = trs.map((tr, idx) => {
          const rect = tr.getBoundingClientRect ? tr.getBoundingClientRect() : { top: idx * 38, bottom: (idx + 1) * 38, height: 38 };
          return {
            row: idx,
            top: rect.top,
            bottom: rect.bottom,
            height: rect.height || 38,
            mid: (rect.top + rect.bottom) / 2
          };
        });

        const colsCount = Math.max(grid.colsCount || 1, 1);
        const colW = tableRect.width > 0 ? (tableRect.width / colsCount) : 100;
        const colBounds = [];
        for (let c = 0; c < colsCount; c++) {
          const left = tableRect.left + (c * colW);
          const right = left + colW;
          colBounds.push({
            col: c,
            left,
            right,
            mid: (left + right) / 2
          });
        }

        const rowHeight = rowBounds[0] ? rowBounds[0].height : 38;
        return { rowBounds, colBounds, tableRect, rowHeight };
      };

      const evaluateCenterCrossingRow = (clientY, rowBounds, currentRow) => {
        if (!rowBounds || rowBounds.length === 0) return 0;
        const count = rowBounds.length;

        // Downward center crossing: require moving past row R's midpoint with +3px deadband
        for (let r = count - 1; r > currentRow; r--) {
          if (clientY > rowBounds[r].mid + 3) {
            return r;
          }
        }

        // Upward center crossing: require moving above row R's midpoint with -3px deadband
        for (let r = 0; r < currentRow; r++) {
          if (clientY < rowBounds[r].mid - 3) {
            return r;
          }
        }

        return currentRow;
      };

      const evaluateCenterCrossingCol = (clientX, colBounds, currentCol) => {
        if (!colBounds || colBounds.length === 0) return 0;
        const count = colBounds.length;

        for (let c = count - 1; c > currentCol; c--) {
          if (clientX > colBounds[c].left + 3) {
            return c;
          }
        }

        for (let c = 0; c < currentCol; c++) {
          if (clientX < colBounds[c].right - 3) {
            return c;
          }
        }

        return currentCol;
      };

      Qrew.views['office-config'].evaluateCenterCrossingRow = evaluateCenterCrossingRow;
      Qrew.views['office-config'].evaluateCenterCrossingCol = evaluateCenterCrossingCol;

      const updateLiveDragDisplacements = (sRow, sCol, curRow, curCol, bounds) => {
        const rowH = bounds.rowHeight || 38;
        const colW = (bounds.colBounds && bounds.colBounds[0]) ? (bounds.colBounds[0].right - bounds.colBounds[0].left) : 200;

        // Reset transforms, transitions, and z-indexes on all cells and inner elements
        tableEl.querySelectorAll('.td-cell, .file-combo-cell, .file-empty-slot').forEach(el => {
          el.style.transform = '';
          el.style.transition = 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)';
          el.style.zIndex = '';
        });
        wrapEl.querySelectorAll('.is-drag-placeholder').forEach(el => el.classList.remove('is-drag-placeholder'));

        // Target table cell receives placeholder and is NEVER translated
        const targetTd = tableEl.querySelector(`td.td-cell[data-row="${curRow}"][data-col="${curCol}"]`);
        if (targetTd) {
          targetTd.classList.add('is-drag-placeholder');
        }

        const srcTd = tableEl.querySelector(`td.td-cell[data-row="${sRow}"][data-col="${sCol}"]`);
        const draggedInner = srcTd ? srcTd.querySelector('.file-combo-cell') : null;

        const getInner = (r, c) => {
          const td = tableEl.querySelector(`td.td-cell[data-row="${r}"][data-col="${c}"]`);
          return td ? td.querySelector('.file-combo-cell, .file-empty-slot') : null;
        };
        const getTd = (r, c) => {
          return tableEl.querySelector(`td.td-cell[data-row="${r}"][data-col="${c}"]`);
        };

        if (curCol === sCol) {
          // ==================================================
          // SAME COLUMN DISPLACEMENTS
          // ==================================================
          if (curRow > sRow) {
            // Dragged DOWN: intervening rows (sRow + 1 .. curRow) slide UP by rowH
            for (let r = sRow + 1; r <= curRow; r++) {
              const inner = getInner(r, sCol);
              const rTd = getTd(r, sCol);
              if (inner && inner !== draggedInner) {
                inner.style.transform = `translateY(-${rowH}px)`;
                const z = 10 + (r - sRow);
                inner.style.zIndex = z;
                if (rTd) rTd.style.zIndex = z;
              }
            }
            // Dragged cell slides DOWN to curRow and stays on top
            if (draggedInner) {
              draggedInner.style.transform = `translateY(${(curRow - sRow) * rowH}px)`;
              draggedInner.style.zIndex = '35';
            }
            if (srcTd) srcTd.style.zIndex = '35';
          } else if (curRow < sRow) {
            // Dragged UP: intervening rows (curRow .. sRow - 1) slide DOWN by rowH
            // When sliding DOWN, earlier rows (r) slide into later rows (r + 1).
            // To prevent row r from being covered by row r + 1's opaque td background,
            // row r and its inner element must have a higher z-index than row r + 1.
            const count = (sRow - curRow);
            const baseZ = 20 + count;

            for (let r = curRow; r < sRow; r++) {
              const inner = getInner(r, sCol);
              const rTd = getTd(r, sCol);
              const z = baseZ - (r - curRow);
              if (inner && inner !== draggedInner) {
                inner.style.transform = `translateY(${rowH}px)`;
                inner.style.zIndex = z;
              }
              if (rTd) {
                rTd.style.zIndex = z;
              }
            }
            // Dragged cell slides UP to curRow and has highest z-index
            if (draggedInner) {
              draggedInner.style.transform = `translateY(-${(sRow - curRow) * rowH}px)`;
              draggedInner.style.zIndex = String(baseZ + 15);
            }
            if (srcTd) {
              srcTd.style.zIndex = String(baseZ + 15);
            }
          } else {
            // curRow === sRow: resting at source
            if (draggedInner) {
              draggedInner.style.transform = '';
            }
          }
        } else {
          // ==================================================
          // CROSS-COLUMN DISPLACEMENTS
          // ==================================================
          // In Source Column sCol: rows below sRow slide UP to compact the column
          for (let r = sRow + 1; r < grid.rowsCount; r++) {
            const inner = getInner(r, sCol);
            const rTd = getTd(r, sCol);
            if (inner && inner !== draggedInner) {
              inner.style.transform = `translateY(-${rowH}px)`;
              const z = 10 + (r - sRow);
              inner.style.zIndex = z;
              if (rTd) rTd.style.zIndex = z;
            }
          }

          // In Target Column curCol: rows at and below curRow slide DOWN to open vacancy
          const targetCount = (grid.rowsCount - curRow);
          const baseTargetZ = 20 + targetCount;
          for (let r = curRow; r < grid.rowsCount; r++) {
            const inner = getInner(r, curCol);
            const rTd = getTd(r, curCol);
            const z = baseTargetZ - (r - curRow);
            if (inner && inner !== draggedInner) {
              inner.style.transform = `translateY(${rowH}px)`;
              inner.style.zIndex = z;
            }
            if (rTd) {
              rTd.style.zIndex = z;
            }
          }

          // Dragged cell translates diagonally across columns (dx) and rows (dy) into target position
          if (draggedInner) {
            const dx = (curCol - sCol) * colW;
            const dy = (curRow - sRow) * rowH;
            draggedInner.style.transform = `translate(${dx}px, ${dy}px)`;
            draggedInner.style.zIndex = String(baseTargetZ + 15);
          }
          if (srcTd) {
            srcTd.style.zIndex = String(baseTargetZ + 15);
          }
        }
      };

      Qrew.views['office-config'].updateLiveDragDisplacements = updateLiveDragDisplacements;

      wrapEl.querySelectorAll('.file-combo-cell').forEach(cellEl => {
        cellEl.addEventListener('dragstart', (e) => {
          const r = parseInt(cellEl.getAttribute('data-row'), 10);
          const c = parseInt(cellEl.getAttribute('data-col'), 10);
          const cell = grid.cells.find(cellItem => cellItem.row === r && cellItem.col === c);

          const bounds = measureGridBounds();
          const rect = cellEl.getBoundingClientRect ? cellEl.getBoundingClientRect() : {
            top: bounds.rowBounds[r] ? bounds.rowBounds[r].top : r * 38,
            bottom: bounds.rowBounds[r] ? bounds.rowBounds[r].bottom : (r + 1) * 38,
            left: bounds.colBounds[c] ? bounds.colBounds[c].left : 0,
            right: bounds.colBounds[c] ? bounds.colBounds[c].right : 200,
            width: bounds.colBounds[c] ? (bounds.colBounds[c].right - bounds.colBounds[c].left) : 200,
            height: bounds.rowHeight || 38
          };

          const initialRowCenter = bounds.rowBounds[r] ? bounds.rowBounds[r].mid : ((rect.top + rect.bottom) / 2);
          const initialColCenter = bounds.colBounds[c] ? bounds.colBounds[c].mid : ((rect.left + rect.right) / 2);

          liveDragState = {
            sourceRow: r,
            sourceCol: c,
            currentRow: r,
            currentCol: c,
            draggedKey: (cell && cell.key) || '',
            draggedEl: cellEl,
            startCursorX: (typeof e.clientX === 'number') ? e.clientX : initialColCenter,
            startCursorY: (typeof e.clientY === 'number') ? e.clientY : initialRowCenter,
            initialRowCenter,
            initialColCenter,
            bounds
          };
          state.draggedGridCell = { row: r, col: c };

          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify({ row: r, col: c }));
          }

          cellEl.classList.add('is-dragging');
          const td = cellEl.closest('.td-cell');
          if (td) td.classList.add('is-drag-placeholder');

          if (hLine) hLine.style.display = 'none';
          if (vLine) vLine.style.display = 'none';
        });

        cellEl.addEventListener('dragend', () => {
          resetLiveDragVisuals();
          state.draggedGridCell = null;
          liveDragState = null;
        });
      });

      wrapEl.addEventListener('dragover', (e) => {
        if (!liveDragState) return;
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';

        const bounds = liveDragState.bounds || measureGridBounds();

        // Calculate dragging row's actual vertical and horizontal centers
        const deltaX = (typeof e.clientX === 'number') ? (e.clientX - liveDragState.startCursorX) : 0;
        const deltaY = (typeof e.clientY === 'number') ? (e.clientY - liveDragState.startCursorY) : 0;
        const draggingCenterY = liveDragState.initialRowCenter + deltaY;
        const draggingCenterX = liveDragState.initialColCenter + deltaX;

        const newRow = evaluateCenterCrossingRow(draggingCenterY, bounds.rowBounds, liveDragState.currentRow);
        const newCol = evaluateCenterCrossingCol(draggingCenterX, bounds.colBounds, liveDragState.currentCol);

        if (newRow !== liveDragState.currentRow || newCol !== liveDragState.currentCol) {
          liveDragState.currentRow = newRow;
          liveDragState.currentCol = newCol;
          updateLiveDragDisplacements(liveDragState.sourceRow, liveDragState.sourceCol, newRow, newCol, bounds);
        }
      });

      wrapEl.addEventListener('dragleave', (e) => {
        if (!e.relatedTarget || !wrapEl.contains(e.relatedTarget)) {
          if (liveDragState) {
            liveDragState.currentRow = liveDragState.sourceRow;
            liveDragState.currentCol = liveDragState.sourceCol;
            updateLiveDragDisplacements(liveDragState.sourceRow, liveDragState.sourceCol, liveDragState.sourceRow, liveDragState.sourceCol, liveDragState.bounds);
          }
        }
      });

      const handleGridDrop = (e) => {
        e.preventDefault();
        if (!liveDragState && !state.draggedGridCell) return;
        const sRow = liveDragState ? liveDragState.sourceRow : (state.draggedGridCell ? state.draggedGridCell.row : null);
        const sCol = liveDragState ? liveDragState.sourceCol : (state.draggedGridCell ? state.draggedGridCell.col : null);
        const tRow = liveDragState ? liveDragState.currentRow : (e.target && e.target.closest ? parseInt(e.target.closest('.td-cell')?.getAttribute('data-row') || '0', 10) : 0);
        const tCol = liveDragState ? liveDragState.currentCol : (e.target && e.target.closest ? parseInt(e.target.closest('.td-cell')?.getAttribute('data-col') || '0', 10) : 0);

        resetLiveDragVisuals();
        state.draggedGridCell = null;
        liveDragState = null;

        if (sRow !== null && sCol !== null && (sRow !== tRow || sCol !== tCol)) {
          animateGridFLIP(wrapEl, tableEl, tpl, officeId, tenantId, () => {
            shiftInsertGridCell(tpl, sRow, sCol, tRow, tCol);
          });
        }
      };

      wrapEl.addEventListener('drop', handleGridDrop);
      wrapEl.querySelectorAll('.td-cell').forEach(td => {
        td.addEventListener('drop', handleGridDrop);
      });
    }

    // 3. Inline Cell Editing & Focus/Cursor Handling
    wrapEl.querySelectorAll('.combo-val-input, .combo-key-input').forEach(inp => {
      inp.addEventListener('focus', (e) => {
        const v = e.target.value.trim();
        if (v === '—' || v === '-' || v === '–') {
          e.target.value = '';
        } else if (v.length > 0) {
          const len = e.target.value.length;
          requestAnimationFrame(() => {
            try {
              e.target.setSelectionRange(len, len);
            } catch (err) {}
          });
        }
      });

      inp.addEventListener('mouseup', (e) => {
        if (e.target.dataset.justFocused === 'true') {
          e.target.dataset.justFocused = 'false';
          const len = e.target.value.length;
          if (len > 0) {
            try {
              e.target.setSelectionRange(len, len);
            } catch (err) {}
          }
        }
      });

      inp.addEventListener('mousedown', (e) => {
        if (document.activeElement !== e.target) {
          e.target.dataset.justFocused = 'true';
        }
      });
    });

    wrapEl.querySelectorAll('.combo-key-input').forEach(inp => {
      inp.oninput = (e) => {
        const r = parseInt(e.target.getAttribute('data-row'), 10);
        const c = parseInt(e.target.getAttribute('data-col'), 10);
        const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
        if (cell) {
          cell.key = e.target.value.trim().toUpperCase();
          cell.label = formatFieldLabel(cell.key);
          syncGridToHeaderFields(tpl);
        }
      };

      inp.onchange = (e) => {
        const r = parseInt(e.target.getAttribute('data-row'), 10);
        const c = parseInt(e.target.getAttribute('data-col'), 10);
        const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
        if (cell) {
          const cleanKey = e.target.value.trim().toUpperCase();
          cell.key = cleanKey;
          cell.label = formatFieldLabel(cleanKey);
          e.target.value = cleanKey;
          syncGridToHeaderFields(tpl);
          if (cleanKey === 'GRT' || cleanKey === 'NRT' || cleanKey === 'NAME') {
            renderInvoiceTemplatesWorkspace(officeId, tenantId);
          }
        }
      };
    });

    wrapEl.querySelectorAll('.combo-val-input').forEach(inp => {
      inp.onfocus = (e) => {
        const v = e.target.value.trim();
        if (v === '—' || v === '-' || v === '–') {
          e.target.value = '';
        }
      };

      inp.oninput = (e) => {
        const r = parseInt(e.target.getAttribute('data-row'), 10);
        const c = parseInt(e.target.getAttribute('data-col'), 10);
        const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
        if (cell) {
          const v = e.target.value;
          cell.value = (v.trim() === '—' || v.trim() === '-' || v.trim() === '–') ? '' : v;
          syncGridToHeaderFields(tpl);
        }
      };

      inp.onchange = (e) => {
        const r = parseInt(e.target.getAttribute('data-row'), 10);
        const c = parseInt(e.target.getAttribute('data-col'), 10);
        const cell = grid.cells.find(cell => cell.row === r && cell.col === c);
        if (cell) {
          const v = e.target.value.trim();
          const cleanVal = (v === '—' || v === '-' || v === '–') ? '' : v;
          cell.value = cleanVal;
          e.target.value = cleanVal;
          syncGridToHeaderFields(tpl);
          if (cell.key === 'GRT' || cell.key === 'NRT' || cell.key === 'NAME') {
            renderInvoiceTemplatesWorkspace(officeId, tenantId);
          }
        }
      };
    });

    // 4. Empty Slot "+ Add Field" Click
    wrapEl.querySelectorAll('.btn-slot-add-field').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const r = parseInt(btn.getAttribute('data-row'), 10);
        const c = parseInt(btn.getAttribute('data-col'), 10);
        openAddFieldModal(officeId, tenantId, r, c);
      };
    });

    // 5. Cell Context Menu
    const closeContextMenu = () => {
      if (contextMenu) {
        contextMenu.style.display = 'none';
        contextMenu.innerHTML = '';
      }
    };

    document.addEventListener('click', (e) => {
      if (contextMenu && !contextMenu.contains(e.target)) {
        closeContextMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeContextMenu();
      }
    });

    wrapEl.querySelectorAll('.btn-cell-options').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const r = parseInt(btn.getAttribute('data-row'), 10);
        const c = parseInt(btn.getAttribute('data-col'), 10);
        const cell = grid.cells.find(cell => cell.row === r && cell.col === c) || { row: r, col: c, colspan: 1, rowspan: 1, empty: true };
        const cSpan = cell.colspan || 1;
        const rSpan = cell.rowspan || 1;

        const canMergeLeft = c > 0;
        const canMergeRight = (c + cSpan) < grid.colsCount;
        const canMergeUp = r > 0;
        const canMergeDown = (r + rSpan) < grid.rowsCount;
        const canSplit = cSpan > 1 || rSpan > 1;
        const canDeleteRow = grid.rowsCount > 1;
        const canDeleteCol = grid.colsCount > 1;
        const canInsertCol = grid.colsCount < 5;
        const canSwitchRowLeft = c > 0;
        const canSwitchRowRight = c < grid.colsCount - 1;
        const canSwitchColAbove = r > 0;
        const canSwitchColBelow = r < grid.rowsCount - 1;

        const wrapRect = wrapEl.getBoundingClientRect();
        const btnRect = btn.getBoundingClientRect();

        const menuWidth = 236;
        const menuX = (btnRect.right - wrapRect.left + menuWidth > wrapRect.width)
          ? (btnRect.left - wrapRect.left - menuWidth - 4)
          : (btnRect.right - wrapRect.left + 4);
        const menuY = btnRect.top - wrapRect.top;

        if (contextMenu) {
          contextMenu.innerHTML = `
            <div class="cell-menu-row">
              <span class="cell-menu-label">Merge Cell</span>
              <div class="cell-menu-actions">
                <button type="button" class="cell-menu-action ${!canMergeLeft ? 'disabled' : ''}" data-act="merge-left" ${!canMergeLeft ? 'disabled' : ''}>Left</button>
                <button type="button" class="cell-menu-action ${!canMergeRight ? 'disabled' : ''}" data-act="merge-right" ${!canMergeRight ? 'disabled' : ''}>Right</button>
              </div>
            </div>
            ${canSplit ? `
              <div class="cell-menu-row">
                <span class="cell-menu-label">Split / Unmerge</span>
                <div class="cell-menu-actions">
                  <button type="button" class="cell-menu-action" data-act="split">Split</button>
                </div>
              </div>
            ` : ''}
            <div class="cell-menu-divider"></div>
            <div class="cell-menu-row">
              <span class="cell-menu-label">Insert Row</span>
              <div class="cell-menu-actions">
                <button type="button" class="cell-menu-action" data-act="ins-row-above">Above</button>
                <button type="button" class="cell-menu-action" data-act="ins-row-below">Below</button>
              </div>
            </div>
            <div class="cell-menu-row">
              <span class="cell-menu-label">Insert Column</span>
              <div class="cell-menu-actions">
                <button type="button" class="cell-menu-action ${!canInsertCol ? 'disabled' : ''}" data-act="ins-col-left" ${!canInsertCol ? 'disabled' : ''}>Left</button>
                <button type="button" class="cell-menu-action ${!canInsertCol ? 'disabled' : ''}" data-act="ins-col-right" ${!canInsertCol ? 'disabled' : ''}>Right</button>
              </div>
            </div>
            <div class="cell-menu-divider"></div>
            <div class="cell-menu-row">
              <span class="cell-menu-label">Switch in Row</span>
              <div class="cell-menu-actions">
                <button type="button" class="cell-menu-action ${!canSwitchRowLeft ? 'disabled' : ''}" data-act="switch-row-left" ${!canSwitchRowLeft ? 'disabled' : ''}>Left</button>
                <button type="button" class="cell-menu-action ${!canSwitchRowRight ? 'disabled' : ''}" data-act="switch-row-right" ${!canSwitchRowRight ? 'disabled' : ''}>Right</button>
              </div>
            </div>
            <div class="cell-menu-row">
              <span class="cell-menu-label">Switch in Col</span>
              <div class="cell-menu-actions">
                <button type="button" class="cell-menu-action ${!canSwitchColAbove ? 'disabled' : ''}" data-act="switch-col-above" ${!canSwitchColAbove ? 'disabled' : ''}>Above</button>
                <button type="button" class="cell-menu-action ${!canSwitchColBelow ? 'disabled' : ''}" data-act="switch-col-below" ${!canSwitchColBelow ? 'disabled' : ''}>Below</button>
              </div>
            </div>
            <div class="cell-menu-divider"></div>
            <div class="cell-menu-row">
              <span class="cell-menu-label">Delete</span>
              <div class="cell-menu-actions">
                <button type="button" class="cell-menu-action danger ${!canDeleteRow ? 'disabled' : ''}" data-act="del-row" ${!canDeleteRow ? 'disabled' : ''}>Row</button>
                <button type="button" class="cell-menu-action danger ${!canDeleteCol ? 'disabled' : ''}" data-act="del-col" ${!canDeleteCol ? 'disabled' : ''}>Column</button>
              </div>
            </div>
            ${!cell.empty ? `
              <div class="cell-menu-row">
                <span class="cell-menu-label">Clear Field</span>
                <div class="cell-menu-actions">
                  <button type="button" class="cell-menu-action danger" data-act="clear-cell">Clear</button>
                </div>
              </div>
            ` : ''}
          `;

          contextMenu.style.display = 'flex';
          contextMenu.style.left = `${Math.max(4, menuX)}px`;
          contextMenu.style.top = `${menuY}px`;

          contextMenu.querySelectorAll('.cell-menu-action').forEach(mBtn => {
            mBtn.onclick = (ev) => {
              ev.stopPropagation();
              const act = mBtn.getAttribute('data-act');
              closeContextMenu();

              if (act === 'merge-left') {
                mergeCellLeft(tpl, r, c);
                renderInvoiceTemplatesWorkspace(officeId, tenantId);
              } else if (act === 'merge-right') {
                mergeCellRight(tpl, r, c);
                renderInvoiceTemplatesWorkspace(officeId, tenantId);
              } else if (act === 'merge-up') {
                mergeCellUp(tpl, r, c);
                renderInvoiceTemplatesWorkspace(officeId, tenantId);
              } else if (act === 'merge-down') {
                mergeCellDown(tpl, r, c);
                renderInvoiceTemplatesWorkspace(officeId, tenantId);
              } else if (act === 'split') {
                splitCell(tpl, r, c);
                renderInvoiceTemplatesWorkspace(officeId, tenantId);
              } else if (act === 'ins-row-above') {
                animateInsertGridRow(officeId, tenantId, tpl, r, wrapEl, tableEl);
              } else if (act === 'ins-row-below') {
                animateInsertGridRow(officeId, tenantId, tpl, r + rSpan, wrapEl, tableEl);
              } else if (act === 'ins-col-left') {
                animateInsertGridCol(officeId, tenantId, tpl, c, wrapEl, tableEl);
              } else if (act === 'ins-col-right') {
                animateInsertGridCol(officeId, tenantId, tpl, c + cSpan, wrapEl, tableEl);
              } else if (act === 'switch-row-left') {
                flushGridInputsToTemplate(wrapEl, tpl);
                animateGridFLIP(wrapEl, tableEl, tpl, officeId, tenantId, () => {
                  switchCellInRow(tpl, r, c, 'left');
                });
              } else if (act === 'switch-row-right') {
                flushGridInputsToTemplate(wrapEl, tpl);
                animateGridFLIP(wrapEl, tableEl, tpl, officeId, tenantId, () => {
                  switchCellInRow(tpl, r, c, 'right');
                });
              } else if (act === 'switch-col-above') {
                flushGridInputsToTemplate(wrapEl, tpl);
                animateGridFLIP(wrapEl, tableEl, tpl, officeId, tenantId, () => {
                  switchCellInCol(tpl, r, c, 'above');
                });
              } else if (act === 'switch-col-below') {
                flushGridInputsToTemplate(wrapEl, tpl);
                animateGridFLIP(wrapEl, tableEl, tpl, officeId, tenantId, () => {
                  switchCellInCol(tpl, r, c, 'below');
                });
              } else if (act === 'del-row') {
                const gridSnapshot = JSON.parse(JSON.stringify(grid));
                const populatedInRow = grid.cells.filter(cCell => cCell.row === r && !cCell.empty && cCell.key && cCell.key.trim().length > 0);
                if (populatedInRow.length > 0) {
                  const count = populatedInRow.length;
                  animateDeleteGridRow(officeId, tenantId, tpl, r, wrapEl, tableEl, `Row ${r + 1} deleted (${count} field${count > 1 ? 's' : ''} removed)`, {
                    label: 'Undo',
                    onClick: () => {
                      animateRestoreGridRow(officeId, tenantId, tpl, gridSnapshot, r, wrapEl, tableEl);
                    }
                  });
                } else {
                  animateDeleteGridRow(officeId, tenantId, tpl, r, wrapEl, tableEl, 'Empty row deleted');
                }
              } else if (act === 'del-col') {
                const gridSnapshot = JSON.parse(JSON.stringify(grid));
                const populatedInCol = grid.cells.filter(cCell => cCell.col === c && !cCell.empty && cCell.key && cCell.key.trim().length > 0);
                if (populatedInCol.length > 0) {
                  const count = populatedInCol.length;
                  animateDeleteGridCol(officeId, tenantId, tpl, c, wrapEl, tableEl, `Column ${c + 1} deleted (${count} field${count > 1 ? 's' : ''} removed)`, {
                    label: 'Undo',
                    onClick: () => {
                      animateRestoreGridCol(officeId, tenantId, tpl, gridSnapshot, c, wrapEl, tableEl);
                    }
                  });
                } else {
                  animateDeleteGridCol(officeId, tenantId, tpl, c, wrapEl, tableEl, 'Empty column deleted');
                }
              } else if (act === 'clear-cell') {
                cell.empty = true;
                cell.key = '';
                cell.label = '';
                cell.value = '';
                syncGridToHeaderFields(tpl);
                renderInvoiceTemplatesWorkspace(officeId, tenantId);
              }
            };
          });
        }
      };
    });
  };

  /* ==========================================================================
     2. Template Designer Studio (Layout matching Reference Image 2 & Section 4.5)
     ========================================================================== */

  const renderSpreadsheetStudio = (officeId, tenantId) => {
    const tpl = state.activeTemplate;
    if (!tpl) {
      state.currentMode = 'list';
      return renderTemplatesDirectory(officeId, tenantId);
    }

    const engine = new DAGFormulaEngine(tpl);
    const evaluatedTokens = engine.evaluateAll();

    // Determine current formula bar content
    let formulaBarValue = '';
    let formulaBarCellLabel = 'no cell selected';

    if (state.selectedCell) {
      const { type, sectionId, rowId, chargeId } = state.selectedCell;
      const sec = (tpl.sections || []).find(s => s.id === sectionId);
      if (type === 'row' && sec) {
        const row = (sec.rows || []).find(r => r.id === rowId);
        if (row) {
          formulaBarValue = row.equation || '';
          formulaBarCellLabel = row.token || 'ROW_TOKEN';
        }
      } else if (type === 'charge' && sec) {
        const charge = (sec.charges || []).find(c => c.id === chargeId);
        if (charge) {
          formulaBarValue = charge.equation || '';
          formulaBarCellLabel = charge.token || 'CHARGE_TOKEN';
        }
      } else if (type === 'subtotal' && sec && sec.subtotal) {
        formulaBarValue = sec.subtotal.equation || '';
        formulaBarCellLabel = sec.subtotal.token || 'SECTION_TOTAL';
      } else if (type === 'grandTotal' && tpl.grandTotal) {
        formulaBarValue = tpl.grandTotal.equation || '';
        formulaBarCellLabel = tpl.grandTotal.token || 'TOTAL';
      }
    }

    const grandTotalVal = evaluatedTokens.get(tpl.grandTotal ? tpl.grandTotal.token : 'TOTAL')?.value || 0;

    return `
      <div class="studio-shell designer-shell">
        <!-- ROW 1: COMPACT SINGLE-LINE HEADER (~48px) -->
        <header class="studio-header">
          <div class="studio-header-left">
            <button class="designer-back-arrow" id="btn-studio-back" title="Back to Invoice Templates" aria-label="Back to Invoice Templates">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <input
              type="text"
              class="designer-title-input"
              id="designer-title-input"
              value="${QrewUI.escapeHtml(tpl.name)}"
              placeholder="Template Name"
              title="Click to edit template name"
            >
          </div>

          <div class="studio-header-right">
            <button type="button" class="btn btn-secondary btn-sm ${state.sidebarOpen ? 'active' : ''}" id="btn-toggle-sidebar" title="${state.sidebarOpen ? 'Hide Token Pool Sidebar' : 'Show Token Pool Sidebar'}" aria-label="Toggle Token Pool Sidebar">
              <span class="sidebar-toggle-icon">#</span>
              <span class="sidebar-toggle-label">${state.sidebarOpen ? 'Hide Tokens' : 'Show Tokens'}</span>
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-preview-template">
              Preview
            </button>
            <button type="button" class="btn btn-primary btn-sm" id="btn-save-template">
              ${QrewUI.getIcon('check')} Save
            </button>
          </div>
        </header>

        <!-- ROW 2: WORKSPACE BODY -->
        <div class="studio-body">
          <!-- Main Section: File Details, Formula Bar, Integrated Spreadsheet Canvas -->
          <main class="studio-main-section designer-main-canvas">
            <!-- FILE DETAILS Table Card -->
            <section class="file-details-card">
              <div class="file-details-header">
                <div class="file-details-heading">
                  <span>FILE DETAILS</span>
                </div>
                <div class="file-details-actions">
                  <button type="button" class="btn-file-auto-balance" id="btn-auto-balance-grid" title="Auto-balance grid layout">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"></path>
                    </svg>
                    <span>Auto</span>
                  </button>
                  <button type="button" class="btn-file-toggle-mode ${state.gridMode === 'edit' ? 'active is-edit-mode' : ''}" id="btn-toggle-grid-mode" title="${state.gridMode === 'edit' ? 'Save & Exit Edit Mode' : 'Edit Names and Values'}">
                    ${state.gridMode === 'edit' ? `
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Done</span>
                    ` : `
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                      </svg>
                      <span>Edit</span>
                    `}
                  </button>
                  <button type="button" class="btn-file-add-field" id="btn-add-header-field" title="Add Field">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    <span>Add Field</span>
                  </button>
                </div>
              </div>

              <div class="file-table-wrap" id="file-table-wrap">
                <!-- Proximity Divider Overlay Lines & (+) Badges -->
                <div class="grid-proximity-overlay" id="grid-proximity-overlay">
                  <div class="grid-divider-line h-line" id="grid-divider-hline" style="display:none;">
                    <button type="button" class="grid-insert-btn h-badge" id="btn-insert-row" title="Insert Row">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                  <div class="grid-divider-line v-line" id="grid-divider-vline" style="display:none;">
                    <button type="button" class="grid-insert-btn v-badge" id="btn-insert-col" title="Insert Column">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                  </div>
                </div>

                <table class="file-details-table ${state.gridMode === 'edit' ? 'mode-edit' : 'mode-normal'}" id="file-details-table">
                  <colgroup>
                    ${Array.from({ length: (tpl.headerGrid ? tpl.headerGrid.colsCount : 2) }).map(() => `<col style="width: ${(100 / (tpl.headerGrid ? tpl.headerGrid.colsCount : 2)).toFixed(2)}%;">`).join('')}
                  </colgroup>
                  <tbody>
                    ${renderFileDetailsGrid(tpl)}
                  </tbody>
                </table>

                <div class="cell-context-menu" id="cell-context-menu" style="display:none;"></div>
              </div>
            </section>

            <!-- Formula Bar [fx] (Clean Layout Matching Reference Image) -->
            <div class="formula-bar-container">
              <div class="formula-bar">
                <div class="formula-prefix">
                  <span class="formula-fx-symbol">fx</span>
                  <span class="formula-target-token ${formulaBarCellLabel !== 'no cell selected' ? 'active-token' : ''}" id="designer-active-token-badge">
                    ${QrewUI.escapeHtml(formulaBarCellLabel)}
                  </span>
                </div>
                <input
                  type="text"
                  class="formula-input"
                  id="designer-formula-input"
                  value="${QrewUI.escapeHtml(formulaBarValue)}"
                  placeholder=""
                  spellcheck="false"
                  autocomplete="off"
                >
              </div>
            </div>

            <!-- Spreadsheet Table Canvas with Decoupled Token Column and Colored Section Rails -->
            <div class="designer-table-wrap">
              <table class="sheet-table-integrated" id="designer-main-table">
                <thead>
                  <tr>
                    <th class="col-token"></th>
                    <th class="col-sl" style="width: 44px;">SL</th>
                    <th class="col-item" style="width: 58%;">Item Name / Deliverable (text displayed in PDF)</th>
                    <th class="col-type" style="width: 110px;">Type</th>
                    <th class="col-value" style="width: 140px;">${tpl.currency || 'USD'}</th>
                    <th class="col-actions" style="width: 44px;"></th>
                  </tr>
                </thead>
                <tbody>
                  ${renderDesignerSections(tpl, evaluatedTokens)}

                  <!-- Add section before Grand Total -->
                  <tr class="section-divider-row">
                    <td class="col-token"></td>
                    <td class="col-divider-cell" colspan="5">
                      <button type="button" class="btn-add-section-here" id="btn-add-section-bottom">
                        + Add section here
                      </button>
                    </td>
                  </tr>

                  <!-- Terminal Grand Total Row matching Section 4.5 & Reference Image 2 -->
                  <tr class="grandtotal-row">
                    <td class="col-token">
                      <span class="badge-token badge-global">${tpl.grandTotal ? tpl.grandTotal.token : 'GRAND_TOTAL'}</span>
                    </td>
                    <td class="col-sl"></td>
                    <td class="col-item">
                      <strong>TOTAL</strong>
                    </td>
                    <td class="col-type"></td>
                    <td class="col-value cell-selectable ${state.selectedCell && state.selectedCell.type === 'grandTotal' ? 'cell-selected' : ''}" data-type="grandTotal" style="font-size: 1.05rem;">
                      <div class="val-cell-content">
                        <strong>${formatCurrency(grandTotalVal)}</strong>
                      </div>
                    </td>
                    <td class="col-actions"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </main>

          <!-- Right Side Panel: Retractable Docked Token Pool Sidebar -->
          <aside class="studio-sidebar docked-token-pool ${state.sidebarOpen ? '' : 'collapsed'}" id="docked-token-pool">
            <div class="token-pool-header">
              <div class="token-pool-title">
                <span># Token Pool</span>
                <button type="button" class="sidebar-close-btn" id="btn-close-sidebar" title="Close Sidebar" aria-label="Close Sidebar">&times;</button>
              </div>
              <div class="token-pool-tabs">
                <button type="button" class="token-tab-btn ${state.sidebarTab === 'tokens' ? 'active' : ''}" data-tab="tokens">Tokens</button>
                <button type="button" class="token-tab-btn ${state.sidebarTab === 'catalog' ? 'active' : ''}" data-tab="catalog">📦 Catalog</button>
                <button type="button" class="token-tab-btn ${state.sidebarTab === 'files' ? 'active' : ''}" data-tab="files">⚡ Projects</button>
              </div>
            </div>

            <div class="token-pool-body">
              ${state.sidebarTab === 'tokens' ? renderTokenPoolTab(tpl, evaluatedTokens) :
        state.sidebarTab === 'catalog' ? renderCatalogTab() :
          renderFilesTab(tpl)}
            </div>
          </aside>
        </div>
      </div>
    `;
  };

  /* ==========================================================================
     Sidebar Tabs Renderers: Tokens, Catalog, Files
     ========================================================================== */

  const renderTokenPoolTab = (tpl, evaluatedTokens) => {
    return `
      <!-- 1. GLOBAL CONSTANTS -->
      <div class="token-group-card">
        <div class="token-group-header">
          <span class="token-group-title">
            <span>GLOBAL CONSTANTS</span>
            <span style="font-size:10px;color:var(--color-text-muted);">&#x24D8;</span>
          </span>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-global-const" style="font-size:10px;padding:1px 6px;">+</button>
        </div>
        <div class="token-items-list">
          ${Object.entries(tpl.globalConstants || {}).map(([key, val]) => `
            <div class="token-pill-item pool-insertable-token" data-token="${key}" title="Click to insert ${key} into active formula">
              <span class="token-pill-name"><span class="token-pill-dot"></span>${key}</span>
              <span class="token-pill-val">${val}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 2. TEMPLATE CONSTANTS -->
      <div class="token-group-card">
        <div class="token-group-header">
          <span class="token-group-title">
            <span>TEMPLATE CONSTANTS</span>
            <span style="font-size:10px;color:var(--color-text-muted);">&#x24D8;</span>
          </span>
          <button type="button" class="btn btn-secondary btn-sm" id="btn-add-local-const" style="font-size:10px;padding:1px 6px;">+</button>
        </div>
        <div class="token-items-list">
          ${Object.keys(tpl.localConstants || {}).length === 0 ? `
            <div style="font-size:11px;color:var(--color-text-muted);font-style:italic;padding:4px;">No template constants</div>
          ` : Object.entries(tpl.localConstants).map(([key, val]) => `
            <div class="token-pill-item pool-insertable-token" data-token="${key}" title="Click to insert ${key} into active formula">
              <span class="token-pill-name"><span class="token-pill-dot" style="background:#78618A;"></span>${key}</span>
              <span class="token-pill-val">${val}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 3. FILE DETAILS TOKENS -->
      <div class="token-group-card">
        <div class="token-group-header">
          <span class="token-group-title">
            <span>FILE DETAILS</span>
            <span style="font-size:10px;color:var(--color-text-muted);">&#x24D8;</span>
          </span>
        </div>
        <div class="token-items-list">
          ${(tpl.headerFields || []).map(f => `
            <div class="token-pill-item pool-insertable-token" data-token="${f.key}" title="Click to insert ${f.key} into active formula">
              <span class="token-pill-name"><span class="token-pill-dot" style="background:#355C7D;"></span>${f.key}</span>
              <span class="token-pill-val">${QrewUI.escapeHtml(f.value || '0')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 4. EXPENSE CATEGORIES (Matching Reference Image 2) -->
      <div class="token-group-card">
        <div class="token-group-header">
          <span class="token-group-title">
            <span>EXPENSE CATEGORIES</span>
            <span style="font-size:10px;color:var(--color-text-muted);">&#x24D8;</span>
          </span>
          <span class="token-cat-pill">EXP_TOTAL &#x25BE;</span>
        </div>
        <div class="token-items-list">
          <div class="token-pill-item pool-insertable-token" data-token="LEVY_FUND">
            <span class="token-pill-name"><span class="token-pill-dot" style="background:#9E5334;"></span>LEVY_FUND</span>
            <span class="token-pill-val">Levy Fund 16.53</span>
          </div>
          <div class="token-pill-item pool-insertable-token" data-token="MMD">
            <span class="token-pill-name"><span class="token-pill-dot" style="background:#9E5334;"></span>MMD</span>
            <span class="token-pill-val">MMD 0</span>
          </div>
          <div class="token-pill-item pool-insertable-token" data-token="TRANSPORTATION">
            <span class="token-pill-name"><span class="token-pill-dot" style="background:#9E5334;"></span>TRANSPORTATION</span>
            <span class="token-pill-val">Transportation 0</span>
          </div>
          <div class="token-pill-item pool-insertable-token" data-token="OFFICE">
            <span class="token-pill-name"><span class="token-pill-dot" style="background:#9E5334;"></span>OFFICE</span>
            <span class="token-pill-val">Office 0</span>
          </div>
          <div class="token-pill-item pool-insertable-token" data-token="OTHERS">
            <span class="token-pill-name"><span class="token-pill-dot" style="background:#9E5334;"></span>OTHERS</span>
            <span class="token-pill-val">Others 0</span>
          </div>
        </div>
        <div style="margin-top:6px;font-size:11px;color:var(--color-text-muted);">
          <a href="#office-config/customize-fields" style="color:var(--panel-accent);text-decoration:none;">Manage categories in Customize Fields &nearr;</a>
        </div>
      </div>

      <!-- 5. SECTIONS & LIVE TOTALS TREE (Matching Reference Image 2) -->
      <div class="token-group-card">
        <div class="token-group-header">
          <span class="token-group-title">
            <span>SECTIONS</span>
            <span style="font-size:10px;color:var(--color-text-muted);">&#x24D8;</span>
          </span>
        </div>

        <div class="token-items-list">
          ${(tpl.sections || []).map(sec => {
      const subTotalToken = sec.subtotal ? sec.subtotal.token : '';
      const subTotalVal = evaluatedTokens.get(subTotalToken)?.value || 0;
      const currentSubView = state.sectionTokenViews[sec.id] || 'rows';
      const rowCount = (sec.rows || []).length;

      return `
              <div class="pool-section-block">
                <div class="pool-sec-header">
                  <span style="display:flex;align-items:center;gap:6px;">
                    <span class="section-color-strip strip-${sec.color || 'purple'}" style="height:12px;width:3px;"></span>
                    <strong style="font-size:11.5px;">${QrewUI.escapeHtml(sec.title)}</strong>
                  </span>
                  <span class="pool-sec-total">${formatCurrency(subTotalVal)}</span>
                </div>

                <!-- Sub-toggle: Row Tokens (N) vs Section Tokens -->
                <div class="pool-sec-subtoggles">
                  <button type="button" class="pool-toggle-pill ${currentSubView === 'rows' ? 'active' : ''}" data-secid="${sec.id}" data-view="rows">
                    Row Tokens (${rowCount})
                  </button>
                  <button type="button" class="pool-toggle-pill ${currentSubView === 'sections' ? 'active' : ''}" data-secid="${sec.id}" data-view="sections">
                    Section Tokens
                  </button>
                </div>

                <div class="pool-tokens-sublist">
                  ${currentSubView === 'rows' ? (
          (sec.rows || []).map(r => `
                      <div class="token-pill-item pool-insertable-token" data-token="${r.token}" style="font-size:11px;padding:2px 6px;">
                        <span>&bull; ${r.token} &rsaquo;</span>
                        <span style="color:var(--color-text-muted);">${formatCurrency(evaluatedTokens.get(r.token)?.value || 0)}</span>
                      </div>
                    `).join('')
        ) : (
          `
                      <div class="token-pill-item pool-insertable-token" data-token="${subTotalToken}" style="font-size:11px;padding:2px 6px;">
                        <span>&Sigma; ${subTotalToken}</span>
                        <span style="font-weight:700;color:var(--panel-accent);">${formatCurrency(subTotalVal)}</span>
                      </div>
                      ${(sec.charges || []).map(c => `
                        <div class="token-pill-item pool-insertable-token" data-token="${c.token}" style="font-size:11px;padding:2px 6px;">
                          <span>% ${c.token}</span>
                          <span style="color:var(--color-text-muted);">${formatCurrency(evaluatedTokens.get(c.token)?.value || 0)}</span>
                        </div>
                      `).join('')}
                    `
        )}
                </div>
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;
  };

  const renderCatalogTab = () => {
    const catalog = QrewStore.getPremadeDeliverables();
    return `
      <div class="catalog-shelf-wrap">
        <div style="font-size:11.5px;color:var(--color-text-muted);margin-bottom:10px;">
          Drag and drop any premade deliverable row directly into a section on the canvas.
        </div>
        <div class="catalog-items-list">
          ${catalog.map(item => `
            <div class="catalog-draggable-card" draggable="true" data-token="${item.token}" data-name="${QrewUI.escapeHtml(item.name)}" data-equation="${item.equation}">
              <div class="catalog-card-header">
                <span class="catalog-card-token">${item.token}</span>
                <span class="catalog-card-price">${item.equation.startsWith('=') ? 'Formula' : '$' + item.equation}</span>
              </div>
              <div class="catalog-card-title">${QrewUI.escapeHtml(item.name)}</div>
              <div class="catalog-card-footer">
                <span class="catalog-card-cat">${item.category || 'General'}</span>
                <span class="catalog-card-drag-hint">&varr; Drag to section</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  const renderFilesTab = (tpl) => {
    const files = QrewStore.getOperationalFiles(state.currentOfficeId);
    return `
      <div class="files-shelf-wrap">
        <div style="font-size:11.5px;color:var(--color-text-muted);margin-bottom:10px;">
          Select an operational project to prepopulate header fields and live values into this invoice template.
        </div>
        <div class="files-items-list">
          ${files.map(f => `
            <div class="file-select-card" data-fileid="${f.id}">
              <div class="file-card-title">${QrewUI.escapeHtml(f.title)}</div>
              <div class="file-card-meta">
                <span>Code: <strong>${f.fileCode}</strong></span>
                <span>Client: ${QrewUI.escapeHtml(f.clientName)}</span>
              </div>
              ${f.vesselName ? `
                <div class="file-card-vessel">
                  <span>Vessel: <strong>${f.vesselName}</strong></span> |
                  <span>GRT: ${f.grt || 0}</span> |
                  <span>Port: ${f.portCall || 'Chittagong'}</span>
                </div>
              ` : ''}
              <button type="button" class="btn btn-secondary btn-sm btn-apply-file-details" data-fileid="${f.id}" style="width:100%;margin-top:8px;font-size:11.5px;">
                ⚡ Apply to Header Fields
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  };

  /* ==========================================================================
     Designer Section Rows Renderer (Fully Interactive & Editable)
     ========================================================================== */

  const renderDesignerSections = (tpl, evaluatedTokens) => {
    let globalRowIndex = 1;

    return (tpl.sections || []).map((sec, secIdx) => {
      const color = sec.color || (secIdx === 0 ? 'green' : secIdx === 1 ? 'blue' : 'orange');
      const subTotalToken = sec.subtotal ? sec.subtotal.token : `SEC${secIdx + 1}_TOTAL`;
      const subTotalVal = evaluatedTokens.get(subTotalToken)?.value || 0;

      return `
        <!-- Section Divider: Add section here matching Reference Image -->
        <tr class="section-divider-row">
          <td class="col-token"></td>
          <td class="col-divider-cell" colspan="5">
            <button type="button" class="btn-add-section-here" data-insert-before="${sec.id}">
              + Add section here
            </button>
          </td>
        </tr>

        <!-- Section 1 Header: Unified with no middle border & colored vertical rail -->
        <tr class="section-row-header" data-sectionid="${sec.id}">
          <td class="col-token"></td>
          <td class="col-section-title" colspan="5">
            <div class="section-rail-bar">
              <div class="section-rail-left">
                <span class="section-color-strip strip-${color}"></span>
                <input
                  type="text"
                  class="section-title-input title-${color}"
                  data-sectionid="${sec.id}"
                  value="${QrewUI.escapeHtml(sec.title)}"
                  title="Click to rename section"
                >
              </div>
              <div class="section-rail-actions">
                ${tpl.sections.length > 1 ? `
                  <button type="button" class="icon-btn btn-delete-section" data-sectionid="${sec.id}" title="Delete Section" style="color:var(--color-danger);padding:2px;opacity:0.6;">
                    ${QrewUI.getIcon('trash')}
                  </button>
                ` : ''}
              </div>
            </div>
          </td>
        </tr>

        <!-- Line Item Rows -->
        ${(sec.rows || []).map(row => {
        const val = evaluatedTokens.get(row.token)?.value || 0;
        const isSelected = state.selectedCell && state.selectedCell.type === 'row' && state.selectedCell.rowId === row.id;
        const sl = row.sl || globalRowIndex++;
        const isEditable = (row.editable === 'EDITABLE' || row.editable === 'editable');

        return `
            <tr class="designer-row sheet-row ${isSelected ? 'row-selected' : ''}" data-sectionid="${sec.id}" data-rowid="${row.id}">
              <!-- 1. Decoupled Token Column -->
              <td class="col-token">
                <span class="badge-token badge-row btn-rename-token" data-token="${row.token}" data-sectionid="${sec.id}" data-rowid="${row.id}" title="Click to rename token variable">
                  ${QrewUI.escapeHtml(row.token)}
                </span>
              </td>

              <!-- 2. SL Column -->
              <td class="col-sl">${sl}</td>

              <!-- 3. Item Name / Deliverable Column (Inline Editable) -->
              <td class="col-item">
                <div class="item-name-wrap">
                  <span class="row-drag-handle" draggable="true" data-sectionid="${sec.id}" data-rowid="${row.id}" title="Drag to reorder row">&#x22EE;&#x22EE;</span>
                  <input
                    type="text"
                    class="row-name-input"
                    data-sectionid="${sec.id}"
                    data-rowid="${row.id}"
                    value="${QrewUI.escapeHtml(row.name)}"
                    placeholder="Item / deliverable description"
                  >
                </div>
              </td>

              <!-- 4. Type Column (Interactive Toggle: Editable vs Fixed) -->
              <td class="col-type">
                <button
                  type="button"
                  class="btn-type-toggle ${isEditable ? 'type-editable' : 'type-fixed'}"
                  data-sectionid="${sec.id}"
                  data-rowid="${row.id}"
                  title="Click to toggle: Editable by billing clerk vs Fixed formula"
                >
                  ${isEditable ? 'EDITABLE' : 'NOT EDITABLE'}
                </button>
              </td>

              <!-- 5. Value Column (Click to select & edit in fx bar, double click to inline edit) -->
              <td class="col-value cell-selectable ${isSelected ? 'cell-selected' : ''}" data-type="row" data-sectionid="${sec.id}" data-rowid="${row.id}">
                <div class="val-cell-content">
                  <span class="cell-val-text">${formatCurrency(val)}</span>
                </div>
              </td>

              <!-- 6. Actions Column -->
              <td class="col-actions">
                <button type="button" class="row-delete-btn" data-sectionid="${sec.id}" data-rowid="${row.id}" title="Delete row">&times;</button>
              </td>
            </tr>
          `;
      }).join('')}

        <!-- Section Charges (VAT, Surcharges) -->
        ${(sec.charges || []).map(charge => {
        const val = evaluatedTokens.get(charge.token)?.value || 0;
        const isSelected = state.selectedCell && state.selectedCell.type === 'charge' && state.selectedCell.chargeId === charge.id;

        return `
            <tr class="section-charge-row ${isSelected ? 'row-selected' : ''}" data-sectionid="${sec.id}" data-chargeid="${charge.id}">
              <td class="col-token">
                <span class="badge-token badge-local">${QrewUI.escapeHtml(charge.token)}</span>
              </td>
              <td class="col-sl"></td>
              <td class="col-item" style="text-align:right;padding-right:24px;font-style:italic;color:var(--color-text-muted);">
                ${QrewUI.escapeHtml(charge.name)}
              </td>
              <td class="col-type">
                <span class="btn-type-toggle type-fixed" style="cursor:default;">NOT EDITABLE</span>
              </td>
              <td class="col-value cell-selectable ${isSelected ? 'cell-selected' : ''}" data-type="charge" data-sectionid="${sec.id}" data-chargeid="${charge.id}">
                <div class="val-cell-content">
                  <span>${val > 0 ? formatCurrency(val) : '—'}</span>
                </div>
              </td>
              <td class="col-actions">
                <button type="button" class="charge-delete-btn" data-sectionid="${sec.id}" data-chargeid="${charge.id}" title="Delete charge">&times;</button>
              </td>
            </tr>
          `;
      }).join('')}

        <!-- Section Action Row (+ Add row and + Add section charge) matching User Specification -->
        <tr class="section-actions-row section-drop-target" data-sectionid="${sec.id}">
          <td class="col-token"></td>
          <td class="col-add-row-cell" colspan="2">
            <button type="button" class="btn-action-add btn-add-row-trigger" data-sectionid="${sec.id}">
              + Add row
            </button>
          </td>
          <td class="col-add-charge-cell" colspan="3">
            <button type="button" class="btn-action-add btn-add-charge-trigger" data-sectionid="${sec.id}">
              + Add section charge
            </button>
          </td>
        </tr>

        <!-- Section Subtotal Row: Merged SL, Name, and Type columns matching User Specification -->
        <tr class="subtotal-row ${state.selectedCell && state.selectedCell.type === 'subtotal' && state.selectedCell.sectionId === sec.id ? 'row-selected' : ''}" data-sectionid="${sec.id}">
          <td class="col-token">
            <span class="badge-token badge-local">${subTotalToken}</span>
          </td>
          <td class="col-subtotal-label" colspan="3">
            <strong>&lowast; Section Total</strong>
          </td>
          <td class="col-value cell-selectable ${state.selectedCell && state.selectedCell.type === 'subtotal' && state.selectedCell.sectionId === sec.id ? 'cell-selected' : ''}" data-type="subtotal" data-sectionid="${sec.id}">
            <div class="val-cell-content">
              <strong>${formatCurrency(subTotalVal)}</strong>
            </div>
          </td>
          <td class="col-actions"></td>
        </tr>
      `;
    }).join('');
  };

  /* ==========================================================================
     3. Modals: Create Template, Prepopulate, Add Row, Add Section Charge, Add Section
     ========================================================================== */

  const openCreateTemplateModal = (officeId, tenantId) => {
    const existingTemplates = QrewStore.getInvoiceTemplates(officeId);
    const count = existingTemplates.length + 1;
    const defaultName = `Custom Template ${count}`;
    const defaultCode = `INV-26-00${count}`;

    QrewUI.openModal({
      title: 'Create New Invoice Template',
      bodyHtml: `
        <form id="create-template-form" onsubmit="return false;">
          <!-- 1. Template Name -->
          <div class="form-group">
            <label class="form-label" for="new-tpl-name">Template Name <span class="required" style="color:var(--color-danger);">*</span></label>
            <input type="text" id="new-tpl-name" class="form-input" value="${defaultName}" placeholder="e.g. Chittagong Port PDA" required autofocus>
          </div>

          <!-- 2. Type & 3. Index (Responsive Row) -->
          <div class="form-row form-row-responsive" style="display:flex;gap:12px;margin-top:14px;flex-wrap:wrap;">
            <div class="form-group" style="flex:1;min-width:140px;">
              <label class="form-label" for="new-tpl-type">Type <span class="required" style="color:var(--color-danger);">*</span></label>
              <select id="new-tpl-type" class="form-select">
                <option value="custom" selected>Custom</option>
                <option value="standard">Standard</option>
              </select>
            </div>
            <div class="form-group" style="flex:1.5;min-width:180px;">
              <label class="form-label" for="new-tpl-code">Index (Document Indexing) <span class="required" style="color:var(--color-danger);">*</span></label>
              <input type="text" id="new-tpl-code" class="form-input" value="${defaultCode}" style="font-family:var(--font-mono);" required>
            </div>
          </div>

          <!-- 4. Default Currency -->
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="new-tpl-currency">Default Currency <span class="required" style="color:var(--color-danger);">*</span></label>
            <select id="new-tpl-currency" class="form-select">
              <option value="USD" selected>USD ($)</option>
              <option value="BDT">BDT (৳)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="SGD">SGD (S$)</option>
              <option value="AED">AED (AED)</option>
            </select>
          </div>

          <!-- 5. Description -->
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="new-tpl-desc">Description</label>
            <textarea id="new-tpl-desc" class="form-textarea" rows="3" placeholder="Describe the purpose, scope, or usage of this template..."></textarea>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-create-tpl" style="background:#235F42;border-color:#1B4B34;">Create &amp; Open Builder</button>
      `,
      onOpen: (modalEl) => {
        const submitBtn = modalEl.querySelector('#btn-submit-create-tpl');
        submitBtn.onclick = () => {
          const name = modalEl.querySelector('#new-tpl-name').value.trim() || defaultName;
          const type = modalEl.querySelector('#new-tpl-type').value || 'custom';
          const code = modalEl.querySelector('#new-tpl-code').value.trim() || defaultCode;
          const currency = modalEl.querySelector('#new-tpl-currency').value || 'USD';
          const description = modalEl.querySelector('#new-tpl-desc').value.trim();

          const currencySymbols = { USD: '$', BDT: '৳', EUR: '€', GBP: '£', SGD: 'S$', AED: 'AED' };
          const currencySymbol = currencySymbols[currency] || '$';

          const headerFields = [
            { key: 'NAME', label: 'Name', value: `${name} Operation` },
            { key: 'STATUS', label: 'Status', value: 'Active' },
            { key: 'CLIENTID', label: 'Client', value: '—' },
            { key: 'TERMINAL', label: 'Terminal', value: '—' },
            { key: 'VOYAGE_NO', label: 'Voyage No', value: '—' },
            { key: 'PORT', label: 'Port', value: '—' },
            { key: 'ARRIVAL', label: 'Arrival', value: '—' },
            { key: 'NRT', label: 'NRT', value: '—' },
            { key: 'BERTHING', label: 'Berthing', value: '—' },
            { key: 'GRT', label: 'GRT', value: '—' },
            { key: 'DEPARTURE', label: 'Departure', value: '—' },
            { key: 'NAME_OF_VESSEL', label: 'Name Of Vessel', value: '—' }
          ];

          const sections = [
            {
              id: 'sec_1',
              title: 'Section 1: Service Operations',
              color: 'green',
              rows: [
                { id: 'r1_' + Date.now().toString(36), token: 'SERVICE_BASE', name: 'Base Operational Service', equation: '1000', sl: 1, editable: 'NOT EDITABLE' }
              ],
              charges: [],
              subtotal: { token: 'SEC1_TOTAL', label: 'Section Total', equation: '= SERVICE_BASE' }
            }
          ];

          const newTemplate = {
            name,
            type,
            tag: type.toUpperCase(),
            code,
            description: description || 'Custom invoice template',
            status: 'Active',
            currency,
            currencySymbol,
            updatedAt: 'Just now',
            createdAt: new Date().toISOString().split('T')[0],
            headerFields,
            globalConstants: {
              DOLLAR_RATE: 121,
              PORT_DUES_PER_GRT: 0.31,
              SOURCE_TAX_RATE: 0.08
            },
            localConstants: {},
            sections,
            grandTotal: {
              token: 'GRAND_TOTAL',
              label: 'TOTAL',
              equation: '= SEC1_TOTAL'
            }
          };

          const created = QrewStore.createInvoiceTemplate(officeId, newTemplate);
          state.activeTemplate = JSON.parse(JSON.stringify(created));
          state.currentMode = 'studio';
          state.selectedCell = null;

          QrewUI.closeModal();
          QrewUI.showToast(`Template "${created.name}" created!`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };
      }
    });
  };

  const openPrepopulateModal = (officeId, tenantId) => {
    const tpl = state.activeTemplate;
    if (!tpl) return;
    const operationalFiles = QrewStore.getOperationalFiles(officeId);

    QrewUI.openModal({
      title: 'Prepopulate File Details from Operational Project',
      bodyHtml: `
        <div class="form-group">
          <label class="form-label" for="select-prepop-proj">Choose Operational Project / Product</label>
          <select id="select-prepop-proj" class="form-select">
            ${operationalFiles.map(f => `
              <option value="${f.id}">${f.fileCode}: ${f.title} (${f.clientName})</option>
            `).join('')}
          </select>
          <span class="form-hint">Applying an operational file will update header fields and recalculate dependent tokens live.</span>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-confirm-prepop">Apply to Header Fields</button>
      `,
      onOpen: (modalEl) => {
        const selectEl = modalEl.querySelector('#select-prepop-proj');
        const applyBtn = modalEl.querySelector('#btn-confirm-prepop');

        applyBtn.onclick = () => {
          const fileId = selectEl.value;
          const file = operationalFiles.find(f => f.id === fileId);
          if (file) {
            applyFileDetailsToTemplate(tpl, file);
            QrewUI.closeModal();
            QrewUI.showToast(`Prepopulated header fields from ${file.title}!`, 'success');
            renderInvoiceTemplatesWorkspace(officeId, tenantId);
          }
        };
      }
    });
  };

  const applyFileDetailsToTemplate = (tpl, file) => {
    const map = {
      NAME: `${file.title} Port Call`,
      STATUS: file.status || 'Active',
      CLIENTID: file.clientName || 'Apex Shipping Lines Ltd.',
      TERMINAL: file.terminal || 'NCT Berth 4',
      VOYAGE_NO: file.voyageNo || 'V-2026-08',
      PORT: file.portCall || 'Chittagong Port',
      ARRIVAL: file.arrivalDate || '2026-11-20',
      NRT: String(file.nrt || 0),
      BERTHING: file.berthingDate || '2026-11-21',
      GRT: String(file.grt || 0),
      DEPARTURE: file.departureDate || '2026-11-25',
      NAME_OF_VESSEL: file.vesselName || file.title
    };

    if (!Array.isArray(tpl.headerFields)) tpl.headerFields = [];
    tpl.headerFields.forEach(f => {
      const k = (f.key || '').trim().toUpperCase();
      if (map[k] !== undefined) {
        f.value = map[k];
      }
    });
  };

  const openAddRowModal = (secId, officeId, tenantId) => {
    const tpl = state.activeTemplate;
    if (!tpl) return;
    const sec = (tpl.sections || []).find(s => s.id === secId);
    if (!sec) return;

    const rowCount = (tpl.sections || []).reduce((acc, s) => acc + (s.rows || []).length, 0) + 1;
    const defaultToken = `ROW_${rowCount}`;

    QrewUI.openModal({
      title: `Add Deliverable Row to ${sec.title}`,
      bodyHtml: `
        <form id="add-row-modal-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="modal-row-name">Row Name / Label <span class="required">*</span></label>
            <input type="text" id="modal-row-name" class="form-input" placeholder="e.g. PORT TUG HIRE 1 UNIT MANDATORY PAY" required autofocus>
            <span class="form-hint">Text displayed in client PDF document.</span>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-row-token">Row Token Variable <span class="required">*</span></label>
            <input type="text" id="modal-row-token" class="form-input" value="${defaultToken}" style="font-family:var(--font-mono);text-transform:uppercase;" required>
            <span class="form-hint">Unique token identifier (e.g. <code>${defaultToken}</code>) used in calculation formulas.</span>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-row-type">Billing Mode</label>
            <select id="modal-row-type" class="form-select">
              <option value="EDITABLE">Editable (Operator can adjust amount during billing)</option>
              <option value="FIXED">Fixed (Standard tariff or calculated by formula)</option>
            </select>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-row-eq">Amount or Formula</label>
            <input type="text" id="modal-row-eq" class="form-input" value="0" style="font-family:var(--font-mono);">
            <span class="form-hint">Numeric value (e.g. <code>1230</code>) or formula (e.g. <code>= PILOT * 1.5</code>).</span>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-modal-row">Add Row</button>
      `,
      onOpen: (modalEl) => {
        const nameInp = modalEl.querySelector('#modal-row-name');
        const tokenInp = modalEl.querySelector('#modal-row-token');
        const eqInp = modalEl.querySelector('#modal-row-eq');
        const typeSelect = modalEl.querySelector('#modal-row-type');
        const submitBtn = modalEl.querySelector('#btn-submit-modal-row');

        let userEditedToken = false;
        tokenInp.oninput = () => {
          userEditedToken = true;
          tokenInp.value = sanitizeToken(tokenInp.value);
        };

        nameInp.oninput = () => {
          if (!userEditedToken) {
            const suggested = sanitizeToken(nameInp.value);
            if (suggested && suggested !== 'TOKEN') {
              tokenInp.value = suggested;
            }
          }
        };

        const doSubmit = () => {
          const name = nameInp.value.trim();
          const token = sanitizeToken(tokenInp.value);
          const equation = eqInp.value.trim() || '0';
          const editable = typeSelect.value;

          if (!name) {
            alert('Please enter a row name.');
            nameInp.focus();
            return;
          }
          if (!token) {
            alert('Please enter a valid token identifier.');
            tokenInp.focus();
            return;
          }

          const engine = new DAGFormulaEngine(tpl);
          engine.buildGraph();
          if (engine.tokens.has(token)) {
            alert(`Token "${token}" is already in use. Please choose a unique token name.`);
            tokenInp.focus();
            return;
          }

          const newRow = {
            id: 'r_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 3),
            token,
            name,
            equation,
            editable,
            sl: (sec.rows || []).length + 1
          };

          if (!sec.rows) sec.rows = [];
          sec.rows.push(newRow);

          // Update section subtotal equation
          if (sec.subtotal && sec.subtotal.equation.startsWith('=')) {
            const allTokens = sec.rows.map(r => r.token);
            sec.subtotal.equation = '= ' + allTokens.join(' + ');
          }

          QrewUI.closeModal();
          state.selectedCell = { type: 'row', sectionId: sec.id, rowId: newRow.id };
          QrewUI.showToast(`Row "${name}" [${token}] added.`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };

        submitBtn.onclick = doSubmit;
        modalEl.querySelector('#add-row-modal-form').onsubmit = (e) => {
          e.preventDefault();
          doSubmit();
        };
      }
    });
  };

  const openAddSectionChargeModal = (secId, officeId, tenantId) => {
    const tpl = state.activeTemplate;
    if (!tpl) return;
    const sec = (tpl.sections || []).find(s => s.id === secId);
    if (!sec) return;

    QrewUI.openModal({
      title: `Add Section Charge to ${sec.title}`,
      bodyHtml: `
        <form id="add-charge-modal-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="modal-charge-name">Charge Name / Label <span class="required">*</span></label>
            <input type="text" id="modal-charge-name" class="form-input" placeholder="e.g. Vat or Source Tax" required autofocus>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-charge-token">Charge Token Variable <span class="required">*</span></label>
            <input type="text" id="modal-charge-token" class="form-input" placeholder="e.g. SEC_VAT" style="font-family:var(--font-mono);text-transform:uppercase;" required>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-charge-eq">Amount or Formula</label>
            <input type="text" id="modal-charge-eq" class="form-input" value="0" style="font-family:var(--font-mono);">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-modal-charge">Add Charge</button>
      `,
      onOpen: (modalEl) => {
        const nameInp = modalEl.querySelector('#modal-charge-name');
        const tokenInp = modalEl.querySelector('#modal-charge-token');
        const eqInp = modalEl.querySelector('#modal-charge-eq');
        const submitBtn = modalEl.querySelector('#btn-submit-modal-charge');

        nameInp.oninput = () => {
          tokenInp.value = sanitizeToken(nameInp.value);
        };

        const doSubmit = () => {
          const name = nameInp.value.trim();
          const token = sanitizeToken(tokenInp.value);
          const equation = eqInp.value.trim() || '0';

          if (!name || !token) return;

          if (!sec.charges) sec.charges = [];
          sec.charges.push({
            id: 'c_' + Date.now().toString(36),
            token,
            name,
            equation,
            editable: 'FIXED'
          });

          QrewUI.closeModal();
          QrewUI.showToast(`Charge "${name}" added.`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };

        submitBtn.onclick = doSubmit;
        modalEl.querySelector('#add-charge-modal-form').onsubmit = (e) => {
          e.preventDefault();
          doSubmit();
        };
      }
    });
  };

  const openAddSectionModal = (officeId, tenantId, insertBeforeId = null) => {
    const tpl = state.activeTemplate;
    if (!tpl) return;

    const secCount = (tpl.sections || []).length + 1;
    const defaultSecTitle = `SECTION ${secCount}`;
    const defaultSubtotalToken = `SEC${secCount}_TOTAL`;

    QrewUI.openModal({
      title: 'Add New Calculation Section',
      bodyHtml: `
        <form id="add-sec-modal-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="modal-sec-title">Section Name / Title <span class="required">*</span></label>
            <input type="text" id="modal-sec-title" class="form-input" value="${defaultSecTitle}" placeholder="e.g. AS PER PORT TARIFF" required autofocus>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-sec-color">Section Color Accent</label>
            <select id="modal-sec-color" class="form-select">
              <option value="green">Green (Port Tariff)</option>
              <option value="blue">Blue (Tariff)</option>
              <option value="orange">Orange (Private Service)</option>
              <option value="purple">Purple (Standard)</option>
            </select>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-sec-token">Subtotal Token Variable <span class="required">*</span></label>
            <input type="text" id="modal-sec-token" class="form-input" value="${defaultSubtotalToken}" style="font-family:var(--font-mono);text-transform:uppercase;" required>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-modal-sec">Add Section</button>
      `,
      onOpen: (modalEl) => {
        const titleInp = modalEl.querySelector('#modal-sec-title');
        const colorSelect = modalEl.querySelector('#modal-sec-color');
        const tokenInp = modalEl.querySelector('#modal-sec-token');
        const submitBtn = modalEl.querySelector('#btn-submit-modal-sec');

        const doSubmit = () => {
          const title = titleInp.value.trim();
          const color = colorSelect.value;
          const subtotalToken = sanitizeToken(tokenInp.value);

          if (!title || !subtotalToken) return;

          const newSec = {
            id: 'sec_' + Date.now().toString(36),
            title: title.toUpperCase(),
            color,
            rows: [
              {
                id: 'r_' + Date.now().toString(36),
                token: `${subtotalToken}_ITEM1`,
                name: 'Standard Deliverable',
                equation: '0',
                editable: 'EDITABLE',
                sl: 1
              }
            ],
            charges: [],
            subtotal: {
              token: subtotalToken,
              label: 'Section Total',
              equation: `= ${subtotalToken}_ITEM1`
            }
          };

          if (insertBeforeId) {
            const idx = tpl.sections.findIndex(s => s.id === insertBeforeId);
            if (idx !== -1) {
              tpl.sections.splice(idx, 0, newSec);
            } else {
              tpl.sections.push(newSec);
            }
          } else {
            tpl.sections.push(newSec);
          }

          if (tpl.grandTotal && tpl.grandTotal.equation.includes('SEC')) {
            const allSubtotals = tpl.sections.map(s => s.subtotal.token);
            tpl.grandTotal.equation = '= ' + allSubtotals.join(' + ');
          }

          QrewUI.closeModal();
          QrewUI.showToast(`Section "${title}" added.`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };

        submitBtn.onclick = doSubmit;
        modalEl.querySelector('#add-sec-modal-form').onsubmit = (e) => {
          e.preventDefault();
          doSubmit();
        };
      }
    });
  };

  const openAddFieldModal = (officeId, tenantId, targetRow, targetCol) => {
    const tpl = state.activeTemplate;
    if (!tpl) return;

    QrewUI.openModal({
      title: 'Add File Details Field',
      bodyHtml: `
        <form id="add-field-modal-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="modal-field-label">Field Label <span class="required">*</span></label>
            <input type="text" id="modal-field-label" class="form-input" placeholder="e.g. Master's Name or LOA (Length Overall)" required autofocus>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-field-key">Field Token Key <span class="required">*</span></label>
            <input type="text" id="modal-field-key" class="form-input" placeholder="e.g. LOA" style="font-family:var(--font-mono);text-transform:uppercase;" required>
            <span class="form-hint">Used as a token variable in formulas (e.g. <code>LOA</code>).</span>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="modal-field-val">Initial Value</label>
            <input type="text" id="modal-field-val" class="form-input" value="" placeholder="—">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-modal-field">Add Field</button>
      `,
      onOpen: (modalEl) => {
        const labelInp = modalEl.querySelector('#modal-field-label');
        const keyInp = modalEl.querySelector('#modal-field-key');
        const valInp = modalEl.querySelector('#modal-field-val');
        const submitBtn = modalEl.querySelector('#btn-submit-modal-field');

        labelInp.oninput = () => {
          keyInp.value = sanitizeToken(labelInp.value);
        };

        const doSubmit = () => {
          const label = labelInp.value.trim();
          const key = sanitizeToken(keyInp.value);
          const rawVal = valInp.value.trim();
          const val = (rawVal === '—' || rawVal === '-' || rawVal === '–') ? '' : rawVal;

          if (!label || !key) return;

          const grid = ensureHeaderGrid(tpl);
          if (targetRow !== undefined && targetCol !== undefined) {
            const cell = grid.cells.find(c => c.row === targetRow && c.col === targetCol);
            if (cell) {
              cell.empty = false;
              cell.key = key;
              cell.label = label;
              cell.value = val;
            } else {
              grid.cells.push({
                id: `cell_${targetRow}_${targetCol}_${Date.now()}`,
                row: targetRow,
                col: targetCol,
                colspan: 1,
                rowspan: 1,
                key,
                label,
                value: val
              });
            }
          } else {
            let emptyCell = grid.cells.find(c => c.empty);
            if (emptyCell) {
              emptyCell.empty = false;
              emptyCell.key = key;
              emptyCell.label = label;
              emptyCell.value = val;
            } else {
              const newRow = grid.rowsCount;
              grid.rowsCount++;
              state.lastInsertedRowIndex = newRow;
              grid.cells.push({
                id: `cell_${newRow}_0_${Date.now()}`,
                row: newRow,
                col: 0,
                colspan: 1,
                rowspan: 1,
                key,
                label,
                value: val
              });
              for (let c = 1; c < grid.colsCount; c++) {
                grid.cells.push({
                  id: `cell_${newRow}_${c}_${Date.now()}`,
                  row: newRow,
                  col: c,
                  colspan: 1,
                  rowspan: 1,
                  empty: true
                });
              }
              setTimeout(() => {
                if (state.lastInsertedRowIndex === newRow) delete state.lastInsertedRowIndex;
              }, 260);
            }
          }
          syncGridToHeaderFields(tpl);

          QrewUI.closeModal();
          QrewUI.showToast(`Header field "${label}" added.`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };

        submitBtn.onclick = doSubmit;
      }
    });
  };

  const openEditDetailsModal = (tplId, officeId, tenantId) => {
    const tpl = QrewStore.getInvoiceTemplateById(tplId);
    if (!tpl) return;

    QrewUI.openModal({
      title: `Edit Details: ${tpl.name}`,
      bodyHtml: `
        <form id="edit-tpl-details-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="edit-tpl-name">Template Name <span class="required">*</span></label>
            <input type="text" id="edit-tpl-name" class="form-input" value="${QrewUI.escapeHtml(tpl.name)}" required autofocus>
          </div>

          <div class="form-row" style="display:flex;gap:12px;margin-top:14px;">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="edit-tpl-code">Document Indexing Code</label>
              <input type="text" id="edit-tpl-code" class="form-input" value="${QrewUI.escapeHtml(tpl.code)}" style="font-family:var(--font-mono);">
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="edit-tpl-tag">Tag / Badge</label>
              <input type="text" id="edit-tpl-tag" class="form-input" value="${QrewUI.escapeHtml(tpl.tag || 'STANDARD')}">
            </div>
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="edit-tpl-desc">Description</label>
            <input type="text" id="edit-tpl-desc" class="form-input" value="${QrewUI.escapeHtml(tpl.description || '')}">
          </div>

          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="edit-tpl-status">Status</label>
            <select id="edit-tpl-status" class="form-select">
              <option value="Active" ${tpl.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Draft" ${tpl.status === 'Draft' ? 'selected' : ''}>Draft</option>
            </select>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-edit-details">Save Changes</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#btn-submit-edit-details').onclick = () => {
          tpl.name = modalEl.querySelector('#edit-tpl-name').value.trim() || tpl.name;
          tpl.code = modalEl.querySelector('#edit-tpl-code').value.trim() || tpl.code;
          tpl.tag = modalEl.querySelector('#edit-tpl-tag').value.trim() || 'STANDARD';
          tpl.description = modalEl.querySelector('#edit-tpl-desc').value.trim() || '—';
          tpl.status = modalEl.querySelector('#edit-tpl-status').value;
          tpl.updatedAt = 'Just now';

          QrewStore.updateInvoiceTemplate(tpl.id, tpl);
          QrewUI.closeModal();
          QrewUI.showToast(`Template "${tpl.name}" updated!`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };
      }
    });
  };

  const openTemplateSettingsModal = (officeId, tenantId) => {
    const tpl = state.activeTemplate;
    if (!tpl) return;

    QrewUI.openModal({
      title: 'Template Settings',
      bodyHtml: `
        <form id="tpl-settings-form" onsubmit="return false;">
          <div class="form-group">
            <label class="form-label" for="set-tpl-name">Template Name</label>
            <input type="text" id="set-tpl-name" class="form-input" value="${QrewUI.escapeHtml(tpl.name)}">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="set-tpl-code">Document Indexing Format / Code</label>
            <input type="text" id="set-tpl-code" class="form-input" value="${QrewUI.escapeHtml(tpl.code)}" style="font-family:var(--font-mono);">
          </div>
          <div class="form-row" style="display:flex;gap:12px;margin-top:14px;">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="set-tpl-currency">Currency Code</label>
              <input type="text" id="set-tpl-currency" class="form-input" value="${QrewUI.escapeHtml(tpl.currency || 'USD')}">
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="set-tpl-symbol">Currency Symbol</label>
              <input type="text" id="set-tpl-symbol" class="form-input" value="${QrewUI.escapeHtml(tpl.currencySymbol || '$')}">
            </div>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label" for="set-tpl-desc">Description</label>
            <input type="text" id="set-tpl-desc" class="form-input" value="${QrewUI.escapeHtml(tpl.description || '')}">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-settings">Update Settings</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#btn-save-settings').onclick = () => {
          tpl.name = modalEl.querySelector('#set-tpl-name').value.trim() || tpl.name;
          tpl.code = modalEl.querySelector('#set-tpl-code').value.trim() || tpl.code;
          tpl.currency = modalEl.querySelector('#set-tpl-currency').value.trim() || 'USD';
          tpl.currencySymbol = modalEl.querySelector('#set-tpl-symbol').value.trim() || '$';
          tpl.description = modalEl.querySelector('#set-tpl-desc').value.trim();

          QrewUI.closeModal();
          QrewUI.showToast('Template settings updated.', 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };
      }
    });
  };

  /* ==========================================================================
     4. Workspace Controller & Event Binders
     ========================================================================== */

  const openStudio = (id, officeId, tenantId) => {
    const tpl = QrewStore.getInvoiceTemplateById(id);
    if (tpl) {
      state.activeTemplate = JSON.parse(JSON.stringify(tpl));
      state.currentMode = 'studio';
      state.selectedCell = null;
      renderInvoiceTemplatesWorkspace(officeId, tenantId);
    }
  };

  const renderInvoiceTemplatesWorkspace = (officeId, tenantId) => {
    state.currentOfficeId = officeId;
    state.currentTenantId = tenantId;

    const main = Qrew.dom.mainContent;
    if (!main) return;

    if (state.currentMode === 'studio') {
      main.classList.add('studio-mode');
      main.innerHTML = renderSpreadsheetStudio(officeId, tenantId);
      bindStudioEvents(officeId, tenantId);
    } else {
      main.classList.remove('studio-mode');
      main.innerHTML = renderTemplatesDirectory(officeId, tenantId);
      bindDirectoryEvents(officeId, tenantId);
    }
  };

  const bindTableEvents = (officeId, tenantId) => {
    const main = Qrew.dom.mainContent;

    // Row click anywhere on a template row (excluding buttons) opens builder/editor
    main.querySelectorAll('.tpl-row-item').forEach(row => {
      row.onclick = (e) => {
        if (e.target.closest('button, a, input, select, textarea, .icon-btn')) {
          return;
        }
        const id = row.getAttribute('data-tplid');
        if (id) {
          openStudio(id, officeId, tenantId);
        }
      };
    });

    // Builder / Edit button -> Open Designer
    main.querySelectorAll('.btn-open-builder').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-tplid');
        openStudio(id, officeId, tenantId);
      };
    });

    // Archive Template (Active Tab)
    main.querySelectorAll('.btn-archive-tpl').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-tplid');
        const tpl = QrewStore.getInvoiceTemplateById(id);
        if (tpl) {
          QrewStore.archiveInvoiceTemplate(id);
          QrewUI.showToast(`Template "${tpl.name}" moved to archives.`, 'info');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Restore Template (Archived Tab)
    main.querySelectorAll('.btn-restore-tpl').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-tplid');
        const tpl = QrewStore.getInvoiceTemplateById(id);
        if (tpl) {
          QrewStore.unarchiveInvoiceTemplate(id);
          QrewUI.showToast(`Template "${tpl.name}" restored to Active.`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Delete Template (Permanently in Archived Tab)
    main.querySelectorAll('.btn-delete-tpl').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = e.currentTarget.getAttribute('data-tplid');
        const tpl = QrewStore.getInvoiceTemplateById(id);
        if (tpl) {
          QrewUI.confirmDialog({
            title: 'Delete Template Permanently',
            message: `Are you sure you want to permanently delete template "${tpl.name}" (${tpl.code})? This action cannot be undone.`,
            confirmText: 'Delete Template',
            confirmClass: 'btn-danger',
            onConfirm: () => {
              QrewStore.deleteInvoiceTemplate(id);
              QrewUI.showToast(`Template "${tpl.name}" deleted.`, 'info');
              renderInvoiceTemplatesWorkspace(officeId, tenantId);
            }
          });
        }
      };
    });
  };

  const bindDirectoryEvents = (officeId, tenantId) => {
    const main = Qrew.dom.mainContent;

    const searchInput = main.querySelector('#tpl-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        state.searchTerm = e.target.value;
        const tableWrap = main.querySelector('.tpl-table-wrap');
        if (tableWrap) {
          tableWrap.innerHTML = renderDirectoryTable(officeId, tenantId);
          bindTableEvents(officeId, tenantId);
        } else {
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    }

    if (window.QrewSegmentedPills) {
      QrewSegmentedPills.mount('#tpl-status-filter-pills', {
        activeId: state.statusFilter,
        onChange: (newStatus) => {
          state.statusFilter = newStatus;
          const tableWrap = main.querySelector('.tpl-table-wrap');
          if (tableWrap) {
            tableWrap.innerHTML = renderDirectoryTable(officeId, tenantId);
            bindTableEvents(officeId, tenantId);
          } else {
            renderInvoiceTemplatesWorkspace(officeId, tenantId);
          }
        }
      });
    } else {
      main.querySelectorAll('.tpl-filter-btn').forEach(btn => {
        btn.onclick = (e) => {
          state.statusFilter = e.currentTarget.getAttribute('data-filter');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        };
      });
    }

    // Create Template Button in header
    const createBtn = main.querySelector('#btn-create-template-trigger');
    if (createBtn) {
      createBtn.onclick = () => openCreateTemplateModal(officeId, tenantId);
    }

    bindTableEvents(officeId, tenantId);
  };

  const bindStudioEvents = (officeId, tenantId) => {
    const main = Qrew.dom.mainContent;
    const tpl = state.activeTemplate;
    if (!tpl) return;

    // Mini-Excel Grid Interactions (Proximity insertion, combo cells, drag-and-drop, options)
    bindFileDetailsGridEvents(officeId, tenantId, tpl, main);

    // Back to Directory
    const backBtn = main.querySelector('#btn-studio-back');
    if (backBtn) {
      backBtn.onclick = () => {
        state.currentMode = 'list';
        state.activeTemplate = null;
        renderInvoiceTemplatesWorkspace(officeId, tenantId);
      };
    }

    // Title input
    const titleInp = main.querySelector('#designer-title-input');
    if (titleInp) {
      titleInp.oninput = (e) => {
        tpl.name = e.target.value;
      };
      titleInp.onchange = (e) => {
        tpl.name = e.target.value.trim() || 'Untitled Template';
      };
    }

    // Section title inputs
    main.querySelectorAll('.section-title-input').forEach(inp => {
      inp.oninput = (e) => {
        const secId = e.target.getAttribute('data-sectionid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          sec.title = e.target.value;
        }
      };
      inp.onchange = (e) => {
        const secId = e.target.getAttribute('data-sectionid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          sec.title = e.target.value.trim().toUpperCase() || 'SECTION';
        }
      };
    });

    // Retractable Sidebar Toggle & Close
    const sidebarToggleBtn = main.querySelector('#btn-toggle-sidebar');
    const sidebarCloseBtn = main.querySelector('#btn-close-sidebar');
    const sidebarEl = main.querySelector('#docked-token-pool');

    const updateSidebarUi = (isOpen) => {
      state.sidebarOpen = isOpen;
      if (!sidebarEl) return;
      if (state.sidebarOpen) {
        sidebarEl.classList.remove('collapsed');
        if (sidebarToggleBtn) {
          sidebarToggleBtn.classList.add('active');
          const lbl = sidebarToggleBtn.querySelector('.sidebar-toggle-label');
          if (lbl) lbl.textContent = 'Hide Tokens';
          sidebarToggleBtn.setAttribute('title', 'Hide Token Pool Sidebar');
        }
      } else {
        sidebarEl.classList.add('collapsed');
        if (sidebarToggleBtn) {
          sidebarToggleBtn.classList.remove('active');
          const lbl = sidebarToggleBtn.querySelector('.sidebar-toggle-label');
          if (lbl) lbl.textContent = 'Show Tokens';
          sidebarToggleBtn.setAttribute('title', 'Show Token Pool Sidebar');
        }
      }
    };

    if (sidebarToggleBtn) {
      sidebarToggleBtn.onclick = () => {
        updateSidebarUi(!state.sidebarOpen);
      };
    }

    if (sidebarCloseBtn) {
      sidebarCloseBtn.onclick = () => {
        updateSidebarUi(false);
      };
    }

    // Save template
    const saveBtn = main.querySelector('#btn-save-template');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const wrapEl = main.querySelector('#file-table-wrap');
        if (wrapEl) flushGridInputsToTemplate(wrapEl, tpl);
        if (tpl.id && QrewStore.getInvoiceTemplateById(tpl.id)) {
          QrewStore.updateInvoiceTemplate(tpl.id, tpl);
          QrewUI.showToast(`Template "${tpl.name}" saved successfully!`, 'success');
        } else {
          const created = QrewStore.createInvoiceTemplate(officeId, tpl);
          tpl.id = created.id;
          QrewUI.showToast(`Template "${created.name}" created!`, 'success');
        }
      };
    }

    // Preview template button
    const previewBtn = main.querySelector('#btn-preview-template');
    if (previewBtn) {
      previewBtn.onclick = () => openInvoicePreviewModal(tpl);
    }

    // Prepopulate from Project inline button
    const prepopInlineBtn = main.querySelector('#btn-prepop-inline');
    if (prepopInlineBtn) {
      prepopInlineBtn.onclick = () => openPrepopulateModal(officeId, tenantId);
    }

    // Header field inputs inline edit
    main.querySelectorAll('.header-field-input:not(.combo-val-input)').forEach(inp => {
      inp.onfocus = (e) => {
        const v = e.target.value.trim();
        if (v === '—' || v === '-' || v === '–') {
          e.target.value = '';
        }
      };

      inp.oninput = (e) => {
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        const key = e.target.getAttribute('data-fieldkey');
        const v = e.target.value;
        const cleanVal = (v.trim() === '—' || v.trim() === '-' || v.trim() === '–') ? '' : v;
        if (!Array.isArray(tpl.headerFields)) tpl.headerFields = [];
        if (idx >= 0 && tpl.headerFields[idx]) {
          tpl.headerFields[idx].value = cleanVal;
        } else if (key) {
          const found = tpl.headerFields.find(f => f.key === key);
          if (found) {
            found.value = cleanVal;
          } else {
            tpl.headerFields.push({ key, label: formatFieldLabel(key), value: cleanVal });
          }
        }
      };

      inp.onchange = (e) => {
        const key = e.target.getAttribute('data-fieldkey');
        const v = e.target.value.trim();
        const cleanVal = (v === '—' || v === '-' || v === '–') ? '' : v;
        e.target.value = cleanVal;
        const idx = parseInt(e.target.getAttribute('data-idx'), 10);
        if (idx >= 0 && tpl.headerFields && tpl.headerFields[idx]) {
          tpl.headerFields[idx].value = cleanVal;
        } else if (key && tpl.headerFields) {
          const found = tpl.headerFields.find(f => f.key === key);
          if (found) found.value = cleanVal;
        }
        if (key === 'GRT' || key === 'NRT' || key === 'NAME') {
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Add Field in Header Details
    const addFieldBtn = main.querySelector('#btn-add-header-field');
    if (addFieldBtn) {
      addFieldBtn.onclick = () => openAddFieldModal(officeId, tenantId);
    }

    // Add Section Here buttons
    main.querySelectorAll('.btn-add-section-here').forEach(btn => {
      btn.onclick = (e) => {
        const insertBeforeId = e.currentTarget.getAttribute('data-insert-before');
        openAddSectionModal(officeId, tenantId, insertBeforeId);
      };
    });

    const addSecBottomBtn = main.querySelector('#btn-add-section-bottom');
    if (addSecBottomBtn) {
      addSecBottomBtn.onclick = () => openAddSectionModal(officeId, tenantId);
    }

    // Add Row Trigger
    main.querySelectorAll('.btn-add-row-trigger').forEach(btn => {
      btn.onclick = (e) => {
        const secId = e.currentTarget.getAttribute('data-sectionid');
        openAddRowModal(secId, officeId, tenantId);
      };
    });

    // Add Charge Trigger
    main.querySelectorAll('.btn-add-charge-trigger').forEach(btn => {
      btn.onclick = (e) => {
        const secId = e.currentTarget.getAttribute('data-sectionid');
        openAddSectionChargeModal(secId, officeId, tenantId);
      };
    });

    // Row Name Inline Edit (Smooth & without losing focus)
    main.querySelectorAll('.row-name-input').forEach(inp => {
      inp.onfocus = (e) => {
        const v = e.target.value.trim();
        if (v === '—' || v === '-' || v === '–') {
          e.target.value = '';
        }
      };
      inp.oninput = (e) => {
        const secId = e.target.getAttribute('data-sectionid');
        const rowId = e.target.getAttribute('data-rowid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          const row = (sec.rows || []).find(r => r.id === rowId);
          if (row) {
            row.name = e.target.value;
          }
        }
      };
      inp.onchange = (e) => {
        const secId = e.target.getAttribute('data-sectionid');
        const rowId = e.target.getAttribute('data-rowid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          const row = (sec.rows || []).find(r => r.id === rowId);
          if (row) {
            const v = e.target.value.trim();
            row.name = (v === '—' || v === '-' || v === '–') ? '' : v;
          }
        }
      };
    });

    // Type Toggle Button (EDITABLE vs FIXED)
    main.querySelectorAll('.btn-type-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const secId = e.currentTarget.getAttribute('data-sectionid');
        const rowId = e.currentTarget.getAttribute('data-rowid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          const row = (sec.rows || []).find(r => r.id === rowId);
          if (row) {
            const isNowEditable = !(row.editable === 'EDITABLE' || row.editable === 'editable');
            row.editable = isNowEditable ? 'EDITABLE' : 'FIXED';
            e.currentTarget.className = `btn-type-toggle ${isNowEditable ? 'type-editable' : 'type-fixed'}`;
            e.currentTarget.textContent = isNowEditable ? 'EDITABLE' : 'NOT EDITABLE';
            QrewUI.showToast(`Row "${row.name}" set to ${isNowEditable ? 'Editable' : 'Not Editable'}.`, 'info');
          }
        }
      };
    });

    // Rename Token Button
    main.querySelectorAll('.btn-rename-token').forEach(btn => {
      btn.onclick = (e) => {
        const secId = e.currentTarget.getAttribute('data-sectionid');
        const rowId = e.currentTarget.getAttribute('data-rowid');
        const currentToken = e.currentTarget.getAttribute('data-token');
        const newTokenInput = prompt(`Rename token variable for "${currentToken}":`, currentToken);
        if (!newTokenInput) return;
        const newToken = sanitizeToken(newTokenInput);
        if (newToken === currentToken) return;

        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          const row = (sec.rows || []).find(r => r.id === rowId);
          if (row) {
            row.token = newToken;
            // Update subtotal equation if referencing old token
            if (sec.subtotal && sec.subtotal.equation) {
              const reg = new RegExp(`\\b${currentToken}\\b`, 'g');
              sec.subtotal.equation = sec.subtotal.equation.replace(reg, newToken);
            }
            renderInvoiceTemplatesWorkspace(officeId, tenantId);
          }
        }
      };
    });

    // Row Delete
    main.querySelectorAll('.row-delete-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const secId = e.currentTarget.getAttribute('data-sectionid');
        const rowId = e.currentTarget.getAttribute('data-rowid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          sec.rows = (sec.rows || []).filter(r => r.id !== rowId);
          if (sec.subtotal) {
            sec.subtotal.equation = sec.rows.length > 0 ? '= ' + sec.rows.map(r => r.token).join(' + ') : '= 0';
          }
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Charge Delete
    main.querySelectorAll('.charge-delete-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const secId = e.currentTarget.getAttribute('data-sectionid');
        const chargeId = e.currentTarget.getAttribute('data-chargeid');
        const sec = (tpl.sections || []).find(s => s.id === secId);
        if (sec) {
          sec.charges = (sec.charges || []).filter(c => c.id !== chargeId);
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Delete Section
    main.querySelectorAll('.btn-delete-section').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const secId = e.currentTarget.getAttribute('data-sectionid');
        if (confirm('Delete this section and its deliverables?')) {
          tpl.sections = (tpl.sections || []).filter(s => s.id !== secId);
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Cell Selection -> Highlights cell & syncs with formula bar
    main.querySelectorAll('.cell-selectable').forEach(cell => {
      cell.onclick = (e) => {
        const type = cell.getAttribute('data-type');
        const sectionId = cell.getAttribute('data-sectionid');
        const rowId = cell.getAttribute('data-rowid');
        const chargeId = cell.getAttribute('data-chargeid');

        state.selectedCell = { type, sectionId, rowId, chargeId };

        main.querySelectorAll('.cell-selectable').forEach(c => c.classList.remove('cell-selected'));
        cell.classList.add('cell-selected');

        main.querySelectorAll('.sheet-row, .section-charge-row, .subtotal-row, .grandtotal-row').forEach(r => r.classList.remove('row-selected'));
        const parentRow = cell.closest('tr');
        if (parentRow) parentRow.classList.add('row-selected');

        let formulaBarValue = '';
        let formulaBarCellLabel = 'no cell selected';
        const sec = (tpl.sections || []).find(s => s.id === sectionId);
        if (type === 'row' && sec) {
          const row = (sec.rows || []).find(r => r.id === rowId);
          if (row) {
            formulaBarValue = row.equation || '';
            formulaBarCellLabel = row.token || 'ROW_TOKEN';
          }
        } else if (type === 'charge' && sec) {
          const charge = (sec.charges || []).find(c => c.id === chargeId);
          if (charge) {
            formulaBarValue = charge.equation || '';
            formulaBarCellLabel = charge.token || 'CHARGE_TOKEN';
          }
        } else if (type === 'subtotal' && sec && sec.subtotal) {
          formulaBarValue = sec.subtotal.equation || '';
          formulaBarCellLabel = sec.subtotal.token || 'SECTION_TOTAL';
        } else if (type === 'grandTotal' && tpl.grandTotal) {
          formulaBarValue = tpl.grandTotal.equation || '';
          formulaBarCellLabel = tpl.grandTotal.token || 'TOTAL';
        }

        const formulaInput = main.querySelector('#designer-formula-input');
        const activeTokenBadge = main.querySelector('#designer-active-token-badge');
        if (formulaInput) {
          formulaInput.value = formulaBarValue;
          formulaInput.focus();
          formulaInput.select();
        }
        if (activeTokenBadge) {
          activeTokenBadge.textContent = formulaBarCellLabel;
          if (formulaBarCellLabel !== 'no cell selected') {
            activeTokenBadge.classList.add('active-token');
          } else {
            activeTokenBadge.classList.remove('active-token');
          }
        }
      };

      // Double-click cell to inline edit formula or amount
      cell.ondblclick = (e) => {
        e.stopPropagation();
        const type = cell.getAttribute('data-type');
        const sectionId = cell.getAttribute('data-sectionid');
        const rowId = cell.getAttribute('data-rowid');
        const sec = (tpl.sections || []).find(s => s.id === sectionId);
        let currEquation = '0';
        if (type === 'row' && sec) {
          const row = (sec.rows || []).find(r => r.id === rowId);
          if (row) currEquation = row.equation || '0';
        }
        const newEq = prompt('Enter Amount or Formula (e.g. 1500 or = PILOT * 1.5):', currEquation);
        if (newEq !== null) {
          commitFormula(newEq.trim() || '0', tpl, officeId, tenantId);
        }
      };
    });

    // Formula Input Enter & Change Handlers
    const formulaInput = main.querySelector('#designer-formula-input');
    if (formulaInput) {
      formulaInput.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commitFormula(formulaInput.value.trim(), tpl, officeId, tenantId);
        } else if (e.key === 'Escape') {
          state.selectedCell = null;
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
      formulaInput.onchange = () => {
        if (state.selectedCell) {
          commitFormula(formulaInput.value.trim(), tpl, officeId, tenantId);
        }
      };
    }

    // Token Pool insertable token click -> Inserts token into formula bar!
    main.querySelectorAll('.pool-insertable-token').forEach(item => {
      item.onclick = (e) => {
        const token = e.currentTarget.getAttribute('data-token');
        if (!token) return;

        const inp = main.querySelector('#designer-formula-input');
        if (inp && state.selectedCell) {
          inp.value = inp.value ? `${inp.value} + ${token}` : `= ${token}`;
          commitFormula(inp.value, tpl, officeId, tenantId);
          QrewUI.showToast(`Inserted token "${token}" into formula.`, 'info');
        } else {
          QrewUI.showToast(`Select a cell to apply token "${token}" to its formula.`, 'info');
        }
      };
    });

    // Sidebar Tab Switcher
    main.querySelectorAll('.token-tab-btn').forEach(btn => {
      btn.onclick = (e) => {
        state.sidebarTab = e.currentTarget.getAttribute('data-tab');
        renderInvoiceTemplatesWorkspace(officeId, tenantId);
      };
    });

    // Section Tokens Sub-toggle (Row Tokens vs Section Tokens)
    main.querySelectorAll('.pool-toggle-pill').forEach(pill => {
      pill.onclick = (e) => {
        const secId = e.currentTarget.getAttribute('data-secid');
        const view = e.currentTarget.getAttribute('data-view');
        state.sectionTokenViews[secId] = view;
        renderInvoiceTemplatesWorkspace(officeId, tenantId);
      };
    });

    // Apply file details from projects shelf
    main.querySelectorAll('.btn-apply-file-details').forEach(btn => {
      btn.onclick = (e) => {
        const fileId = e.currentTarget.getAttribute('data-fileid');
        const file = QrewStore.getOperationalFiles(officeId).find(f => f.id === fileId);
        if (file) {
          applyFileDetailsToTemplate(tpl, file);
          QrewUI.showToast(`Applied header details from ${file.title}!`, 'success');
          renderInvoiceTemplatesWorkspace(officeId, tenantId);
        }
      };
    });

    // Add Global Constant Button
    const addGlobalBtn = main.querySelector('#btn-add-global-const');
    if (addGlobalBtn) {
      addGlobalBtn.onclick = () => {
        const name = prompt('Enter new Global Constant name (e.g. PORT_TAX):');
        if (!name) return;
        const val = prompt('Enter constant numeric value:', '100');
        if (!val || isNaN(val)) return;

        const token = sanitizeToken(name);
        tpl.globalConstants[token] = parseFloat(val);
        QrewUI.showToast(`Global Constant "${token} = ${val}" added.`, 'success');
        renderInvoiceTemplatesWorkspace(officeId, tenantId);
      };
    }

    // Add Local Constant Button
    const addLocalBtn = main.querySelector('#btn-add-local-const');
    if (addLocalBtn) {
      addLocalBtn.onclick = () => {
        const name = prompt('Enter new Template Constant name:');
        if (!name) return;
        const val = prompt('Enter constant value:', '50');
        if (!val || isNaN(val)) return;

        const token = sanitizeToken(name);
        if (!tpl.localConstants) tpl.localConstants = {};
        tpl.localConstants[token] = parseFloat(val);
        QrewUI.showToast(`Template Constant "${token} = ${val}" added.`, 'success');
        renderInvoiceTemplatesWorkspace(officeId, tenantId);
      };
    }

    // Drag and Drop: Strictly on row handles and catalog items
    bindRowDragAndDrop(main, tpl, officeId, tenantId);
  };

  const commitFormula = (newEq, tpl, officeId, tenantId) => {
    if (!state.selectedCell) return;
    const { type, sectionId, rowId, chargeId } = state.selectedCell;

    const sec = (tpl.sections || []).find(s => s.id === sectionId);
    let targetToken = '';

    if (type === 'row' && sec) {
      const row = (sec.rows || []).find(r => r.id === rowId);
      if (row) {
        targetToken = row.token;
        const engine = new DAGFormulaEngine(tpl);
        engine.buildGraph();
        const cycle = engine.detectCycle(targetToken, newEq);
        if (cycle) {
          alert(cycle);
          return;
        }
        row.equation = newEq;
      }
    } else if (type === 'charge' && sec) {
      const charge = (sec.charges || []).find(c => c.id === chargeId);
      if (charge) {
        targetToken = charge.token;
        charge.equation = newEq;
      }
    } else if (type === 'subtotal' && sec && sec.subtotal) {
      targetToken = sec.subtotal.token;
      sec.subtotal.equation = newEq;
    } else if (type === 'grandTotal' && tpl.grandTotal) {
      targetToken = tpl.grandTotal.token;
      tpl.grandTotal.equation = newEq;
    }

    renderInvoiceTemplatesWorkspace(officeId, tenantId);
  };

  const bindRowDragAndDrop = (main, tpl, officeId, tenantId) => {
    // 1. Existing row handle drag & drop (draggable on handle only so text inputs work properly)
    main.querySelectorAll('.row-drag-handle').forEach(handle => {
      handle.addEventListener('dragstart', (e) => {
        state.draggedRowId = handle.getAttribute('data-rowid');
        state.draggedFromSectionId = handle.getAttribute('data-sectionid');
        const rowTr = handle.closest('tr');
        if (rowTr) rowTr.style.opacity = '0.5';
        e.dataTransfer.setData('text/plain', state.draggedRowId);
      });

      handle.addEventListener('dragend', () => {
        const rowTr = handle.closest('tr');
        if (rowTr) rowTr.style.opacity = '1';
        state.draggedRowId = null;
        state.draggedFromSectionId = null;
      });
    });

    main.querySelectorAll('.sheet-row').forEach(row => {
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        row.classList.add('row-drag-over');
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('row-drag-over');
      });

      row.addEventListener('drop', (e) => {
        e.preventDefault();
        row.classList.remove('row-drag-over');

        const targetRowId = row.getAttribute('data-rowid');
        const targetSectionId = row.getAttribute('data-sectionid');
        const sourceRowId = state.draggedRowId;
        const sourceSectionId = state.draggedFromSectionId;

        // If dropping a premade catalog card
        if (state.draggedPremadeItem) {
          insertPremadeItemIntoSection(state.draggedPremadeItem, targetSectionId, tpl, officeId, tenantId);
          state.draggedPremadeItem = null;
          return;
        }

        if (!sourceRowId || sourceRowId === targetRowId) return;

        const srcSec = (tpl.sections || []).find(s => s.id === sourceSectionId);
        const tgtSec = (tpl.sections || []).find(s => s.id === targetSectionId);
        if (!srcSec || !tgtSec) return;

        const srcIdx = (srcSec.rows || []).findIndex(r => r.id === sourceRowId);
        if (srcIdx === -1) return;

        const [movedRow] = srcSec.rows.splice(srcIdx, 1);
        const tgtIdx = (tgtSec.rows || []).findIndex(r => r.id === targetRowId);

        tgtSec.rows.splice(tgtIdx, 0, movedRow);

        if (srcSec.subtotal && srcSec.subtotal.equation.startsWith('=')) {
          srcSec.subtotal.equation = srcSec.rows.length > 0 ? '= ' + srcSec.rows.map(r => r.token).join(' + ') : '= 0';
        }
        if (tgtSec !== srcSec && tgtSec.subtotal && tgtSec.subtotal.equation.startsWith('=')) {
          tgtSec.subtotal.equation = tgtSec.rows.length > 0 ? '= ' + tgtSec.rows.map(r => r.token).join(' + ') : '= 0';
        }

        renderInvoiceTemplatesWorkspace(officeId, tenantId);
      });
    });

    // 2. Catalog cards dragging
    main.querySelectorAll('.catalog-draggable-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        state.draggedPremadeItem = {
          token: card.getAttribute('data-token'),
          name: card.getAttribute('data-name'),
          equation: card.getAttribute('data-equation')
        };
        card.style.opacity = '0.5';
      });

      card.addEventListener('dragend', () => {
        card.style.opacity = '1';
        state.draggedPremadeItem = null;
      });
    });

    // 3. Section drop target zone
    main.querySelectorAll('.section-drop-target').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drop-target-active');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drop-target-active');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drop-target-active');
        const secId = zone.getAttribute('data-sectionid');

        if (state.draggedPremadeItem) {
          insertPremadeItemIntoSection(state.draggedPremadeItem, secId, tpl, officeId, tenantId);
          state.draggedPremadeItem = null;
        }
      });
    });
  };

  const insertPremadeItemIntoSection = (item, secId, tpl, officeId, tenantId) => {
    const sec = (tpl.sections || []).find(s => s.id === secId);
    if (!sec) return;

    let token = sanitizeToken(item.token);
    const engine = new DAGFormulaEngine(tpl);
    engine.buildGraph();
    let counter = 1;
    while (engine.tokens.has(token)) {
      token = `${sanitizeToken(item.token)}_${counter++}`;
    }

    const newRow = {
      id: 'r_' + Date.now().toString(36),
      token,
      name: item.name,
      equation: item.equation || '0',
      editable: 'EDITABLE',
      sl: (sec.rows || []).length + 1
    };

    if (!sec.rows) sec.rows = [];
    sec.rows.push(newRow);

    if (sec.subtotal && sec.subtotal.equation.startsWith('=')) {
      sec.subtotal.equation = '= ' + sec.rows.map(r => r.token).join(' + ');
    }

    QrewUI.showToast(`Added premade row "${item.name}" to ${sec.title}!`, 'success');
    renderInvoiceTemplatesWorkspace(officeId, tenantId);
  };

  const openInvoicePreviewModal = (tpl) => {
    const engine = new DAGFormulaEngine(tpl);
    const evalTokens = engine.evaluateAll();
    const total = evalTokens.get(tpl.grandTotal ? tpl.grandTotal.token : 'TOTAL')?.value || 0;

    QrewUI.openModal({
      title: `Generated Invoice: ${tpl.name} (${tpl.code})`,
      bodyHtml: `
        <div class="printable-invoice-canvas">
          <div class="invoice-modal-header">
            <div>
              <h2 style="margin:0;font-size:20px;color:#235F42;font-weight:800;">SST SHIPPING &amp; LOGISTICS</h2>
              <div style="font-size:12px;color:var(--color-text-muted);">Chittagong Port Marine Terminal</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:18px;font-weight:800;">${tpl.name}</div>
              <div style="font-family:var(--font-mono);font-size:12px;color:var(--color-text-muted);">Ref: ${tpl.code}</div>
            </div>
          </div>

          <div class="invoice-modal-details-grid">
            ${(tpl.headerFields || []).map(f => `
              <div><strong>${f.label || f.key}:</strong> ${f.value || '—'}</div>
            `).join('')}
          </div>

          <table class="invoice-modal-table">
            <thead>
              <tr>
                <th style="width:40px;">SL</th>
                <th>Deliverable / Description</th>
                <th style="text-align:right;width:140px;">Amount (${tpl.currency || 'USD'})</th>
              </tr>
            </thead>
            <tbody>
              ${(tpl.sections || []).map(sec => `
                <tr class="invoice-sec-header-row">
                  <td colspan="3" style="color:#235F42;font-weight:700;">${sec.title}</td>
                </tr>
                ${(sec.rows || []).map(r => `
                  <tr>
                    <td style="color:var(--color-text-muted);">${r.sl || ''}</td>
                    <td>${r.name}</td>
                    <td style="text-align:right;font-family:var(--font-mono);font-weight:600;">${formatCurrency(evalTokens.get(r.token)?.value || 0)}</td>
                  </tr>
                `).join('')}
                ${(sec.charges || []).map(c => `
                  <tr style="color:var(--color-text-muted);font-style:italic;">
                    <td></td>
                    <td style="text-align:right;padding-right:16px;">${c.name}</td>
                    <td style="text-align:right;font-family:var(--font-mono);">${formatCurrency(evalTokens.get(c.token)?.value || 0)}</td>
                  </tr>
                `).join('')}
              `).join('')}
            </tbody>
          </table>

          <div class="invoice-modal-total-banner">
            <span>TOTAL BALANCE DUE</span>
            <span style="font-family:var(--font-mono);">${formatCurrency(total, tpl.currencySymbol || '$')}</span>
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Close</button>
        <button class="btn btn-primary" onclick="window.print()" style="background:#235F42;border-color:#1B4B34;">Print / Save PDF</button>
      `
    });
  };

  /* ==========================================================================
     Interface Entry Point
     ========================================================================== */

  Qrew.views['office-config'].renderInvoiceTemplates = (officeId, tenantId) => {
    renderInvoiceTemplatesWorkspace(officeId, tenantId);
  };
})();
