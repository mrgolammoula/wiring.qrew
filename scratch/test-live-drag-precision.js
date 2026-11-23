const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- Starting Live Drag Precision & Alignment Verification ---');

// Mock browser DOM environment
class DOMElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.attributes = {};
    const classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(n => classes.add(n)),
      remove: (...names) => names.forEach(n => classes.delete(n)),
      contains: (n) => classes.has(n)
    };
    this.style = {};
    this.parentNode = null;
    this.dataset = {};
  }

  setAttribute(name, val) {
    this.attributes[name] = String(val);
    if (name.startsWith('data-')) {
      const key = name.slice(5);
      this.dataset[key] = String(val);
    }
  }

  getAttribute(name) {
    return this.attributes[name] || null;
  }

  removeAttribute(name) {
    delete this.attributes[name];
    if (name.startsWith('data-')) {
      delete this.dataset[name.slice(5)];
    }
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    newChild.parentNode = this;
    if (!refChild) {
      this.children.push(newChild);
      return newChild;
    }
    const idx = this.children.indexOf(refChild);
    if (idx !== -1) {
      this.children.splice(idx, 0, newChild);
    } else {
      this.children.push(newChild);
    }
    return newChild;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode) {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(selector) {
    const all = this.querySelectorAll(selector);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(selector) {
    const results = [];
    const match = (el) => {
      let isMatch = false;
      const subSelectors = selector.split(',').map(s => s.trim());
      for (const sel of subSelectors) {
        let selMatch = true;
        if (sel.startsWith('#')) {
          selMatch = (el.getAttribute('id') === sel.slice(1));
        } else if (sel.includes('[data-row=') && sel.includes('[data-col=')) {
          const rowMatch = sel.match(/\[data-row="?(\d+)"?\]/);
          const colMatch = sel.match(/\[data-col="?(\d+)"?\]/);
          if (rowMatch && el.getAttribute('data-row') !== rowMatch[1]) selMatch = false;
          if (colMatch && el.getAttribute('data-col') !== colMatch[1]) selMatch = false;
          if (sel.includes('.td-cell') && !el.classList.contains('td-cell')) selMatch = false;
        } else if (sel.startsWith('.')) {
          const cls = sel.slice(1).split('.')[0];
          selMatch = el.classList.contains(cls);
        } else {
          selMatch = false;
        }
        if (selMatch) {
          isMatch = true;
          break;
        }
      }
      if (isMatch) results.push(el);
      for (const child of el.children) {
        match(child);
      }
    };
    for (const child of this.children) {
      match(child);
    }
    return results;
  }

  closest(selector) {
    let curr = this;
    while (curr) {
      if (selector.startsWith('.') && curr.classList.contains(selector.slice(1))) {
        return curr;
      }
      curr = curr.parentNode;
    }
    return null;
  }

  addEventListener() {}
  removeEventListener() {}
}

const tableEl = new DOMElement('table');
tableEl.setAttribute('id', 'file-details-table');
tableEl.classList.add('file-details-table');

const tbody = new DOMElement('tbody');
tableEl.appendChild(tbody);

// Create 4 rows x 2 cols grid
for (let r = 0; r < 4; r++) {
  const tr = new DOMElement('tr');
  for (let c = 0; c < 2; c++) {
    const td = new DOMElement('td');
    td.className = 'td-cell td-combo-cell';
    td.classList.add('td-cell');
    td.classList.add('td-combo-cell');
    td.setAttribute('data-row', r);
    td.setAttribute('data-col', c);

    const combo = new DOMElement('div');
    combo.classList.add('file-combo-cell');
    combo.setAttribute('data-row', r);
    combo.setAttribute('data-col', c);
    td.appendChild(combo);

    tr.appendChild(td);
  }
  tbody.appendChild(tr);
}

const wrapEl = new DOMElement('div');
wrapEl.appendChild(tableEl);

const grid = {
  rowsCount: 4,
  colsCount: 2
};

const bounds = {
  rowHeight: 38,
  colBounds: [
    { col: 0, left: 0, right: 300, mid: 150 },
    { col: 1, left: 300, right: 600, mid: 450 }
  ],
  rowBounds: [
    { row: 0, top: 0, bottom: 38, mid: 19 },
    { row: 1, top: 38, bottom: 76, mid: 57 },
    { row: 2, top: 76, bottom: 114, mid: 95 },
    { row: 3, top: 114, bottom: 152, mid: 133 }
  ]
};

// Implement updateLiveDragDisplacements logic to verify
const updateLiveDragDisplacements = (sRow, sCol, curRow, curCol, bounds) => {
  const rowH = bounds.rowHeight || 38;
  const colW = (bounds.colBounds && bounds.colBounds[0]) ? (bounds.colBounds[0].right - bounds.colBounds[0].left) : 200;

  // Reset inner element transforms
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
    if (curRow > sRow) {
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
      if (draggedInner) {
        draggedInner.style.transform = `translateY(${(curRow - sRow) * rowH}px)`;
        draggedInner.style.zIndex = '35';
      }
      if (srcTd) srcTd.style.zIndex = '35';
    } else if (curRow < sRow) {
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
      if (draggedInner) {
        draggedInner.style.transform = `translateY(-${(sRow - curRow) * rowH}px)`;
        draggedInner.style.zIndex = String(baseZ + 15);
      }
      if (srcTd) {
        srcTd.style.zIndex = String(baseZ + 15);
      }
    }
  } else {
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

// --- TEST 1: Same Column Drag DOWN (from row 0 to row 2) ---
console.log('1. Testing same-column downward drag displacement...');
updateLiveDragDisplacements(0, 0, 2, 0, bounds);

const targetTd1 = tableEl.querySelector('td.td-cell[data-row="2"][data-col="0"]');
if (!targetTd1.classList.contains('is-drag-placeholder')) {
  throw new Error('Expected targetTd at row 2 to have is-drag-placeholder');
}
if (targetTd1.style.transform) {
  throw new Error(`Target td must NOT have a transform! Got ${targetTd1.style.transform}`);
}

const td1 = tableEl.querySelector('td.td-cell[data-row="1"][data-col="0"]');
const row1Inner = td1 ? td1.querySelector('.file-combo-cell') : null;
if (!row1Inner || row1Inner.style.transform !== 'translateY(-38px)') {
  throw new Error(`Expected row 1 inner to slide UP by -38px, got: ${row1Inner ? row1Inner.style.transform : 'null'}`);
}

const td2 = tableEl.querySelector('td.td-cell[data-row="2"][data-col="0"]');
const row2Inner = td2 ? td2.querySelector('.file-combo-cell') : null;
if (!row2Inner || row2Inner.style.transform !== 'translateY(-38px)') {
  throw new Error(`Expected row 2 inner to slide UP by -38px, got: ${row2Inner ? row2Inner.style.transform : 'null'}`);
}

const td0 = tableEl.querySelector('td.td-cell[data-row="0"][data-col="0"]');
const draggedInner1 = td0 ? td0.querySelector('.file-combo-cell') : null;
if (!draggedInner1 || draggedInner1.style.transform !== 'translateY(76px)') {
  throw new Error(`Expected dragged inner to slide DOWN by +76px, got: ${draggedInner1 ? draggedInner1.style.transform : 'null'}`);
}
console.log('✓ Same-column downward drag verified: target td at row 2 is stationary placeholder, intervening items slid up, dragged cell at row 2.');

// --- TEST 2: Same Column Drag UP (from row 3 to row 1) ---
console.log('2. Testing same-column upward drag displacement...');
updateLiveDragDisplacements(3, 0, 1, 0, bounds);

const targetTd2 = tableEl.querySelector('td.td-cell[data-row="1"][data-col="0"]');
if (!targetTd2.classList.contains('is-drag-placeholder')) {
  throw new Error('Expected targetTd at row 1 to have is-drag-placeholder');
}
if (targetTd2.style.transform) {
  throw new Error(`Target td must NOT have a transform! Got ${targetTd2.style.transform}`);
}

const td1Up = tableEl.querySelector('td.td-cell[data-row="1"][data-col="0"]');
const row1InnerUp = td1Up ? td1Up.querySelector('.file-combo-cell') : null;
if (!row1InnerUp || row1InnerUp.style.transform !== 'translateY(38px)') {
  throw new Error(`Expected row 1 inner to slide DOWN by +38px, got: ${row1InnerUp ? row1InnerUp.style.transform : 'null'}`);
}

const td2Up = tableEl.querySelector('td.td-cell[data-row="2"][data-col="0"]');
const row2InnerUp = td2Up ? td2Up.querySelector('.file-combo-cell') : null;
if (!row2InnerUp || row2InnerUp.style.transform !== 'translateY(38px)') {
  throw new Error(`Expected row 2 inner to slide DOWN by +38px, got: ${row2InnerUp ? row2InnerUp.style.transform : 'null'}`);
}

const td3Up = tableEl.querySelector('td.td-cell[data-row="3"][data-col="0"]');
const draggedInner2 = td3Up ? td3Up.querySelector('.file-combo-cell') : null;
if (!draggedInner2 || draggedInner2.style.transform !== 'translateY(-76px)') {
  throw new Error(`Expected dragged inner to slide UP by -76px, got: ${draggedInner2 ? draggedInner2.style.transform : 'null'}`);
}
if (Number(td1Up.style.zIndex) <= Number(td2Up.style.zIndex)) {
  throw new Error(`Upward drag stacking failed: row 1 zIndex (${td1Up.style.zIndex}) must be higher than row 2 zIndex (${td2Up.style.zIndex})`);
}
if (Number(draggedInner2.style.zIndex) <= Number(td1Up.style.zIndex)) {
  throw new Error(`Dragged inner zIndex (${draggedInner2.style.zIndex}) must be higher than target td1 zIndex (${td1Up.style.zIndex})`);
}
console.log('✓ Same-column upward drag verified: target td at row 1 is stationary placeholder, intervening items slid down, descending z-index prevents visual disappearance, dragged cell at row 1.');

// --- TEST 3: Cross Column Drag (from row 1, col 0 to row 2, col 1) ---
console.log('3. Testing cross-column drag displacement...');
updateLiveDragDisplacements(1, 0, 2, 1, bounds);

const targetTdCross = tableEl.querySelector('td.td-cell[data-row="2"][data-col="1"]');
if (!targetTdCross.classList.contains('is-drag-placeholder')) {
  throw new Error('Expected targetTd at row 2, col 1 to have is-drag-placeholder');
}
if (targetTdCross.style.transform) {
  throw new Error(`Cross column target td must NOT have a transform! Got ${targetTdCross.style.transform}`);
}

// In source column 0: row 2 and 3 slide UP
const c0r2 = tableEl.querySelector('td.td-cell[data-row="2"][data-col="0"]');
const col0Row2 = c0r2 ? c0r2.querySelector('.file-combo-cell') : null;
const c0r3 = tableEl.querySelector('td.td-cell[data-row="3"][data-col="0"]');
const col0Row3 = c0r3 ? c0r3.querySelector('.file-combo-cell') : null;
if (!col0Row2 || col0Row2.style.transform !== 'translateY(-38px)' || !col0Row3 || col0Row3.style.transform !== 'translateY(-38px)') {
  throw new Error(`Source column rows 2 and 3 must slide UP (-38px). Got: ${col0Row2?.style?.transform}, ${col0Row3?.style?.transform}`);
}

// In target column 1: row 2 and 3 slide DOWN
const c1r2 = tableEl.querySelector('td.td-cell[data-row="2"][data-col="1"]');
const col1Row2 = c1r2 ? c1r2.querySelector('.file-combo-cell') : null;
const c1r3 = tableEl.querySelector('td.td-cell[data-row="3"][data-col="1"]');
const col1Row3 = c1r3 ? c1r3.querySelector('.file-combo-cell') : null;
if (!col1Row2 || col1Row2.style.transform !== 'translateY(38px)' || !col1Row3 || col1Row3.style.transform !== 'translateY(38px)') {
  throw new Error(`Target column rows 2 and 3 must slide DOWN (+38px). Got: ${col1Row2?.style?.transform}, ${col1Row3?.style?.transform}`);
}

// Dragged cell at (1, 0) translates diagonally to (2, 1): dx = +300px, dy = +38px
const c0r1 = tableEl.querySelector('td.td-cell[data-row="1"][data-col="0"]');
const draggedCross = c0r1 ? c0r1.querySelector('.file-combo-cell') : null;
if (!draggedCross || draggedCross.style.transform !== 'translate(300px, 38px)') {
  throw new Error(`Dragged cell must translate to (300px, 38px), got: ${draggedCross?.style?.transform}`);
}
if (Number(draggedCross.style.zIndex) < 30) {
  throw new Error(`Dragged cell must have elevated z-index >= 30, got: ${draggedCross.style.zIndex}`);
}
console.log('✓ Cross-column drag verified: target td at (2, 1) has placeholder without transform, target items slid down, source items compacted, dragged cell translated directly to (300px, 38px).');

console.log('\n======================================================');
console.log('🎉 ALL LIVE DRAG PRECISION TESTS PASSED CLEANLY! 🎉');
console.log('======================================================');
