/**
 * Qrew Segmented Pills Component
 * Reusable, accessible segmented control with a smooth GPU-accelerated
 * sliding indicator and zero layout shift (CLS = 0).
 */

const QrewSegmentedPills = (() => {
  /**
   * Generates the HTML string for the segmented pill control.
   * @param {Object} options
   * @param {string} options.id - Container element ID
   * @param {Array<{id: string, label: string}>} options.items - Pill tab definitions
   * @param {string} options.activeId - Currently active item ID
   * @param {string} [options.className] - Additional CSS class names
   * @returns {string} HTML markup
   */
  const renderHtml = ({ id, items = [], activeId, className = '' }) => {
    return `
      <div class="segmented-pills-track ${className}" id="${id}" role="tablist">
        <div class="segmented-pills-glider" aria-hidden="true"></div>
        ${items.map(item => {
          const isActive = item.id === activeId;
          return `
            <button
              type="button"
              role="tab"
              class="segmented-pill-btn ${isActive ? 'active' : ''}"
              data-pill-id="${item.id}"
              aria-selected="${isActive ? 'true' : 'false'}"
            >
              ${QrewUI.escapeHtml(item.label)}
            </button>
          `;
        }).join('')}
      </div>
    `;
  };

  /**
   * Mounts the segmented pill control: attaches event listeners, performs initial
   * glider positioning, and binds a ResizeObserver for responsive alignment.
   * @param {string|HTMLElement} target - Container element or CSS selector
   * @param {Object} options
   * @param {string} options.activeId - Current active item ID
   * @param {Function} options.onChange - Callback fired when selection changes: (selectedId) => void
   * @returns {Object} Control instance with destroy and select methods
   */
  const mount = (target, { activeId, onChange }) => {
    const track = typeof target === 'string' ? document.querySelector(target) : target;
    if (!track) return null;

    const glider = track.querySelector('.segmented-pills-glider');
    const buttons = Array.from(track.querySelectorAll('.segmented-pill-btn'));

    let currentActiveId = activeId;
    let isInitial = true;

    const syncGliderPosition = (btn, animate = true) => {
      if (!btn || !glider) return;

      const left = btn.offsetLeft;
      const width = btn.offsetWidth;

      if (!animate || isInitial) {
        // Suppress transition for instant first-render positioning
        glider.style.transition = 'none';
        glider.style.transform = `translate3d(${left}px, 0, 0)`;
        glider.style.width = `${width}px`;

        // Force reflow and re-enable smooth transition
        void glider.offsetWidth;
        glider.style.transition = '';
      } else {
        glider.style.transform = `translate3d(${left}px, 0, 0)`;
        glider.style.width = `${width}px`;
      }
    };

    const select = (newId, fireCallback = true) => {
      const targetBtn = buttons.find(b => b.getAttribute('data-pill-id') === newId);
      if (!targetBtn) return;

      buttons.forEach(b => {
        const isSelected = b === targetBtn;
        b.classList.toggle('active', isSelected);
        b.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      });

      currentActiveId = newId;
      syncGliderPosition(targetBtn, true);

      if (fireCallback && typeof onChange === 'function') {
        onChange(newId);
      }
    };

    // Attach click listeners to pill buttons
    buttons.forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        const pillId = btn.getAttribute('data-pill-id');
        if (pillId === currentActiveId) return;
        select(pillId, true);
      };
    });

    // Initial positioning after layout renders
    requestAnimationFrame(() => {
      const initialBtn = buttons.find(b => b.getAttribute('data-pill-id') === currentActiveId) || buttons[0];
      if (initialBtn) {
        syncGliderPosition(initialBtn, false);
      }
      isInitial = false;
    });

    // ResizeObserver ensures glider remains pixel-aligned if viewport resizes
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        const activeBtn = buttons.find(b => b.getAttribute('data-pill-id') === currentActiveId);
        if (activeBtn) {
          syncGliderPosition(activeBtn, false);
        }
      });
      resizeObserver.observe(track);
    }

    return {
      select,
      destroy: () => {
        if (resizeObserver) resizeObserver.disconnect();
      }
    };
  };

  return {
    renderHtml,
    mount
  };
})();

window.QrewSegmentedPills = QrewSegmentedPills;
