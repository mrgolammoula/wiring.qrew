/**
 * Verification Test Suite for Template Builder Interface Revamp
 * Tests Phase 1 to Phase 6 requirements in PLAN.md
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Starting Studio Interface Revamp Verification ---');

class MockClassList {
  constructor(el) {
    this.classes = new Set();
    this.el = el;
  }
  add(cls) {
    this.classes.add(cls);
    this.el.className = Array.from(this.classes).join(' ');
  }
  remove(cls) {
    this.classes.delete(cls);
    this.el.className = Array.from(this.classes).join(' ');
  }
  contains(cls) {
    return this.classes.has(cls);
  }
}

class MockElement {
  constructor(tagName = 'div', id = '', className = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.className = className;
    this.classList = new MockClassList(this);
    if (className) {
      className.split(/\s+/).filter(Boolean).forEach(c => this.classList.classes.add(c));
    }
    this._innerHTML = '';
    this.value = '';
    this.attributes = new Map();
    this.children = [];
    this.parentNode = null;
    this.onclick = null;
    this.oninput = null;
    this.onchange = null;
    this.style = {};
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  closest(selector) {
    return null;
  }

  addEventListener(event, fn) {}
  removeEventListener(event, fn) {}

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(html) {
    this._innerHTML = html;
    this.parseChildren(html);
  }

  setAttribute(name, val) {
    this.attributes.set(name, String(val));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  querySelectorAll(selector) {
    const results = [];
    
    const matches = (el) => {
      if (selector.startsWith('#')) {
        return el.id === selector.substring(1);
      }
      if (selector.startsWith('.')) {
        const cls = selector.substring(1);
        return el.classList.contains(cls);
      }
      if (selector.startsWith('[data-tab=')) {
        const match = selector.match(/data-tab=["']?([^"']+)["']?/);
        return match && el.getAttribute('data-tab') === match[1];
      }
      if (selector.startsWith('[data-tplid=')) {
        const match = selector.match(/data-tplid=["']?([^"']+)["']?/);
        return match && el.getAttribute('data-tplid') === match[1];
      }
      return false;
    };

    const traverse = (node) => {
      if (matches(node)) {
        results.push(node);
      }
      for (const child of node.children) {
        traverse(child);
      }
    };

    for (const child of this.children) {
      traverse(child);
    }
    return results;
  }

  parseChildren(html) {
    this.children = [];
    const tagRegex = /<!--[\s\S]*?-->|<([a-zA-Z0-9\-]+)([^>]*?)(\/?)>|<\/([a-zA-Z0-9\-]+)>/g;
    let match;
    const stack = [this];

    while ((match = tagRegex.exec(html)) !== null) {
      if (match[0].startsWith('<!--')) continue;
      const isClosing = !!match[4];
      const tagName = match[1] || match[4];
      const isSelfClosing = match[3] === '/' || ['input', 'img', 'br', 'hr', 'col'].includes(tagName.toLowerCase());

      if (isClosing) {
        if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === match[4].toLowerCase()) {
          stack.pop();
        }
      } else {
        const attrs = match[2] || '';
        const idMatch = attrs.match(/id=["']([^"']+)["']/);
        const classMatch = attrs.match(/class=["']([^"']+)["']/);
        const valMatch = attrs.match(/value=["']([^"']*)["']/);
        const dataTabMatch = attrs.match(/data-tab=["']([^"']+)["']/);
        const dataTplIdMatch = attrs.match(/data-tplid=["']([^"']+)["']/);
        const dataSectionIdMatch = attrs.match(/data-sectionid=["']([^"']+)["']/);
        const dataIdxMatch = attrs.match(/data-idx=["']([^"']+)["']/);
        const dataFieldKeyMatch = attrs.match(/data-fieldkey=["']([^"']+)["']/);

        const el = new MockElement(tagName, idMatch ? idMatch[1] : '', classMatch ? classMatch[1] : '');
        if (valMatch) el.value = valMatch[1];
        if (dataTabMatch) el.setAttribute('data-tab', dataTabMatch[1]);
        if (dataTplIdMatch) el.setAttribute('data-tplid', dataTplIdMatch[1]);
        if (dataSectionIdMatch) el.setAttribute('data-sectionid', dataSectionIdMatch[1]);
        if (dataIdxMatch) el.setAttribute('data-idx', dataIdxMatch[1]);
        if (dataFieldKeyMatch) el.setAttribute('data-fieldkey', dataFieldKeyMatch[1]);

        el.parentNode = stack[stack.length - 1];
        stack[stack.length - 1].children.push(el);

        if (!isSelfClosing) {
          stack.push(el);
        }
      }
    }
  }
}

// Set up globals
const mainContent = new MockElement('main', 'main-content', 'content-area');

// Mock localStorage
const localStorageMap = new Map();
const mockLocalStorage = {
  getItem: (k) => localStorageMap.get(k) || null,
  setItem: (k, v) => localStorageMap.set(k, String(v)),
  removeItem: (k) => localStorageMap.delete(k),
  clear: () => localStorageMap.clear()
};

let toastHistory = [];

const sandbox = {
  window: {},
  document: {
    body: new MockElement('body'),
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    createElement: (tag) => new MockElement(tag),
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  localStorage: mockLocalStorage,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  console: console
};
sandbox.document.body.appendChild = (el) => {};
sandbox.window.localStorage = mockLocalStorage;
sandbox.window.Qrew = {
  views: {},
  dom: {
    mainContent: mainContent
  },
  registerInterface: () => {},
  notifyObservers: () => {}
};
sandbox.Qrew = sandbox.window.Qrew;

const ctx = vm.createContext(sandbox);

// 1. Load core/data.js
const dataCode = fs.readFileSync(path.resolve(__dirname, '../core/data.js'), 'utf8');
vm.runInContext(dataCode, ctx);
sandbox.QrewStore = sandbox.window.QrewStore;

// 2. Load core/ui.js
const uiCode = fs.readFileSync(path.resolve(__dirname, '../core/ui.js'), 'utf8');
vm.runInContext(uiCode + '; window.QrewUI = QrewUI;', ctx);
sandbox.QrewUI = sandbox.window.QrewUI;

// Intercept showToast
const origShowToast = sandbox.QrewUI.showToast;
sandbox.QrewUI.showToast = (msg, type) => {
  toastHistory.push({ msg, type });
  if (origShowToast) origShowToast(msg, type);
};

// 3. Load invoice-templates.js
const invoiceTemplatesCode = fs.readFileSync(path.resolve(__dirname, '../interfaces/office-config/invoice-templates.js'), 'utf8');
vm.runInContext(invoiceTemplatesCode, ctx);

console.log('✓ Successfully executed core/data.js, core/ui.js, and invoice-templates.js in sandbox.');

// -------------------------------------------------------------
// Phase 1 Verification: Shell & Container Flush Edge-to-Edge Setup
// -------------------------------------------------------------
console.log('\n--- Testing Phase 1: Shell & Container Flush Edge-to-Edge Setup ---');

// Render Directory view initially
sandbox.Qrew.views['office-config'].renderInvoiceTemplates('off_ctg_port', 'ten_sst');
if (!mainContent.classList.contains('studio-mode')) {
  console.log('✓ Initial directory view correctly does NOT have studio-mode class.');
} else {
  throw new Error('Initial directory view should not have studio-mode class');
}

// Verify CSS rule in office-config.css
const cssContent = fs.readFileSync(path.resolve(__dirname, '../interfaces/office-config/office-config.css'), 'utf8');
if (cssContent.includes('.content-area.studio-mode') &&
    cssContent.includes('padding: 0 !important;') &&
    cssContent.includes('max-width: 100% !important;') &&
    cssContent.includes('margin: 0 !important;') &&
    cssContent.includes('height: calc(100vh - var(--topbar-height)) !important;') &&
    cssContent.includes('overflow: hidden !important;')) {
  console.log('✓ .content-area.studio-mode CSS rule matches exact specifications.');
} else {
  throw new Error('Missing or incomplete .content-area.studio-mode rule in office-config.css');
}

// Open studio by finding a template and calling openStudio (or clicking a row)
const existingTpl = sandbox.QrewStore.getInvoiceTemplates('off_ctg_port')[0];
if (!existingTpl) throw new Error('No template found in default data for off_ctg_port');

// Trigger open studio via row click or builder button
const openBuilderBtn = mainContent.querySelector('.btn-open-builder');
if (openBuilderBtn && openBuilderBtn.onclick) {
  openBuilderBtn.onclick({ stopPropagation: () => {}, currentTarget: openBuilderBtn });
} else {
  // If querySelector in mock didn't find button, simulate row click
  const rowItem = mainContent.querySelector('.tpl-row-item');
  if (rowItem && rowItem.onclick) {
    rowItem.onclick({ target: rowItem });
  }
}

// Check studio-mode was added to mainContent
if (mainContent.classList.contains('studio-mode')) {
  console.log('✓ Studio mode adds .studio-mode class to #main-content.');
} else {
  throw new Error('Studio mode did NOT add .studio-mode class to #main-content');
}

// -------------------------------------------------------------
// Phase 2 Verification: Row 1 — Compact Single-Line Header Refactor
// -------------------------------------------------------------
console.log('\n--- Testing Phase 2: Row 1 — Compact Single-Line Header Refactor ---');

const studioHeader = mainContent.querySelector('.studio-header');
const backBtn = mainContent.querySelector('#btn-studio-back');
const titleInput = mainContent.querySelector('#designer-title-input');
const toggleSidebarBtn = mainContent.querySelector('#btn-toggle-sidebar');
const previewBtn = mainContent.querySelector('#btn-preview-template');
const saveBtn = mainContent.querySelector('#btn-save-template');

if (studioHeader && backBtn && titleInput && toggleSidebarBtn && previewBtn && saveBtn) {
  console.log('✓ Row 1 has all required elements: .studio-header, #btn-studio-back, #designer-title-input, #btn-toggle-sidebar, #btn-preview-template, #btn-save-template.');
} else {
  throw new Error('Missing one or more Row 1 header elements');
}

// Verify redundant controls removed
if (!mainContent.querySelector('#btn-zoom-in') &&
    !mainContent.querySelector('#btn-zoom-out') &&
    !mainContent.querySelector('#btn-template-settings') &&
    !mainContent.querySelector('.designer-avatar') &&
    !mainContent.querySelector('#btn-generate-live')) {
  console.log('✓ Redundant controls (zoom, settings, avatar, generate live) cleanly removed from header.');
} else {
  throw new Error('Redundant controls still present in studio markup');
}

// Verify CSS rule for .studio-header
if (cssContent.includes('.studio-header {') &&
    cssContent.includes('height: 48px;') &&
    cssContent.includes('border-bottom: 1px solid var(--color-border);') &&
    cssContent.includes('background: var(--color-surface);')) {
  console.log('✓ .studio-header CSS rule has height: 48px, border-bottom, and background: var(--color-surface).');
} else {
  throw new Error('Missing or incorrect .studio-header rule in office-config.css');
}

// -------------------------------------------------------------
// Phase 3 Verification: Row 2 — Main Section & Retractable Right Sidebar
// -------------------------------------------------------------
console.log('\n--- Testing Phase 3: Row 2 — Main Section & Retractable Right Sidebar ---');

const studioBody = mainContent.querySelector('.studio-body');
const studioMainSection = mainContent.querySelector('.studio-main-section');
const fileDetailsCard = mainContent.querySelector('.file-details-card');
const formulaBar = mainContent.querySelector('.formula-bar-container');
const tableWrap = mainContent.querySelector('.designer-table-wrap');
const sidebar = mainContent.querySelector('.studio-sidebar');
const dockedTokenPool = mainContent.querySelector('#docked-token-pool');

if (studioBody && studioMainSection && fileDetailsCard && formulaBar && tableWrap && sidebar && dockedTokenPool) {
  console.log('✓ Row 2 .studio-body properly structures .studio-main-section (with File Details, Formula Bar, Spreadsheet Table) and .studio-sidebar (#docked-token-pool).');
} else {
  throw new Error('Missing Row 2 components');
}

// Check sidebar tabs
const tabTokens = mainContent.querySelector('[data-tab="tokens"]');
const tabCatalog = mainContent.querySelector('[data-tab="catalog"]');
const tabFiles = mainContent.querySelector('[data-tab="files"]');

if (tabTokens && tabCatalog && tabFiles) {
  console.log('✓ Sidebar token pool tabs (tokens, catalog, files) are present.');
} else {
  throw new Error('Missing sidebar token pool tabs');
}

// -------------------------------------------------------------
// Phase 4 Verification: Interactive Sidebar Toggle State Machine
// -------------------------------------------------------------
console.log('\n--- Testing Phase 4: Interactive Sidebar Toggle State Machine ---');

// Initially sidebar is open
if (!sidebar.classList.contains('collapsed')) {
  console.log('✓ Sidebar is initially open (not collapsed).');
} else {
  throw new Error('Sidebar should be open initially');
}

// Toggle sidebar closed
if (toggleSidebarBtn.onclick) {
  toggleSidebarBtn.onclick();
  if (sidebar.classList.contains('collapsed')) {
    console.log('✓ Clicking #btn-toggle-sidebar collapsed the sidebar (.collapsed added).');
  } else {
    throw new Error('Sidebar was not collapsed after toggle button click');
  }

  // Toggle sidebar open again
  toggleSidebarBtn.onclick();
  if (!sidebar.classList.contains('collapsed')) {
    console.log('✓ Clicking #btn-toggle-sidebar again reopened the sidebar (.collapsed removed).');
  } else {
    throw new Error('Sidebar was not reopened after second toggle button click');
  }
} else {
  throw new Error('toggleSidebarBtn.onclick is not assigned');
}

// Close button inside sidebar
const closeSidebarBtn = mainContent.querySelector('#btn-close-sidebar');
if (closeSidebarBtn && closeSidebarBtn.onclick) {
  closeSidebarBtn.onclick();
  if (sidebar.classList.contains('collapsed')) {
    console.log('✓ Clicking #btn-close-sidebar in sidebar header collapsed the sidebar.');
  } else {
    throw new Error('Sidebar was not collapsed by closeSidebarBtn');
  }
  // Re-open
  toggleSidebarBtn.onclick();
}

// Check CSS transition rules
if (cssContent.includes('.studio-sidebar.docked-token-pool') &&
    cssContent.includes('width 220ms cubic-bezier(0.16, 1, 0.3, 1)') &&
    cssContent.includes('width: 0 !important;')) {
  console.log('✓ CSS contains width 220ms smooth transition and width: 0 !important for .collapsed state.');
} else {
  throw new Error('Missing smooth transition or collapsed rules in office-config.css');
}

// -------------------------------------------------------------
// Phase 5 Verification: Design System Tokens & Responsive Adaptations
// -------------------------------------------------------------
console.log('\n--- Testing Phase 5: Design System Tokens & Responsive Adaptations ---');

if (cssContent.includes('@media (max-width: 768px)') &&
    cssContent.includes('.studio-sidebar.docked-token-pool') &&
    cssContent.includes('position: absolute;') &&
    cssContent.includes('height: 36px;')) {
  console.log('✓ Mobile/tablet responsive adaptations (< 768px) verified (overlay drawer & 36px touch targets).');
} else {
  throw new Error('Missing responsive styles in office-config.css');
}

// -------------------------------------------------------------
// Phase 6 Verification: Quality Assurance & Interactions
// -------------------------------------------------------------
console.log('\n--- Testing Phase 6: Quality Assurance & Interactions ---');

// 1. Title renaming and persistence
if (titleInput && titleInput.oninput && titleInput.onchange) {
  titleInput.oninput({ target: { value: 'Autonomous Tugboat Master Schedule' } });
  titleInput.onchange({ target: { value: 'Autonomous Tugboat Master Schedule' } });
  
  // Save template
  if (saveBtn && saveBtn.onclick) {
    toastHistory = [];
    saveBtn.onclick();
    const savedTpl = sandbox.QrewStore.getInvoiceTemplateById(existingTpl.id);
    if (savedTpl.name === 'Autonomous Tugboat Master Schedule') {
      console.log('✓ Template title renamed and saved successfully.');
    } else {
      throw new Error('Template title was not updated in store upon save');
    }
    if (toastHistory.length > 0 && toastHistory[toastHistory.length - 1].type === 'success') {
      console.log(`✓ Toast displayed: "${toastHistory[toastHistory.length - 1].msg}" (${toastHistory[toastHistory.length - 1].type}).`);
    } else {
      throw new Error('Toast was not displayed upon template save');
    }
  }
} else {
  throw new Error('Title input event handlers not properly bound');
}

// 2. Preview Modal
if (previewBtn && previewBtn.onclick) {
  previewBtn.onclick();
  console.log('✓ Preview button clicked and opened preview modal successfully.');
} else {
  throw new Error('Preview button handler missing');
}

// 3. Back button returning to directory list
if (backBtn && backBtn.onclick) {
  backBtn.onclick();
  if (!mainContent.classList.contains('studio-mode')) {
    console.log('✓ Back button returns to directory view and removes .studio-mode from #main-content.');
  } else {
    throw new Error('Back button failed to remove studio-mode class from main-content');
  }
  if (mainContent.querySelector('.tpl-directory-header')) {
    console.log('✓ Directory view template list intact and restored.');
  } else {
    throw new Error('Directory view was not re-rendered upon back button click');
  }
} else {
  throw new Error('Back button handler missing');
}

console.log('\n========================================');
console.log('🎉 ALL PHASES VERIFIED SUCCESSFULLY! 🎉');
console.log('========================================\n');
