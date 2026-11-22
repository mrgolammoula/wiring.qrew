/**
 * Interface: Tenant Workspace — Hierarchical Offices Tree Explorer & Office CRUD Modals
 */
(() => {
  const Qrew = window.Qrew;

  const treeState = {
    expandedTenants: new Set(),
    searchTerm: ''
  };

  const openCreateOfficeModal = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId);
    if (!tenant) return;

    QrewUI.openModal({
      title: `Create Office for ${tenant.name}`,
      bodyHtml: `
        <form id="create-office-form">
          <div class="form-group">
            <label class="form-label">Office / Branch Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="new-office-name" placeholder="e.g. Downtown Regional Office" required>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label">Location / Address</label>
            <input type="text" class="form-input" id="new-office-location" placeholder="e.g. 450 Market Street, Suite 800">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-create-office">Create Office</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#btn-submit-create-office').onclick = () => {
          const name = modalEl.querySelector('#new-office-name').value.trim();
          const location = modalEl.querySelector('#new-office-location').value.trim();
          if (!name) return;

          try {
            const office = QrewStore.createOffice(tenantId, { name, location });
            Qrew.state.currentOfficeId = office.id;
            QrewUI.closeModal();
            QrewUI.showToast(`Office "${office.name}" created under ${tenant.name}!`, 'success');
            Qrew.handleRouteChange();
          } catch (e) {
            alert(e.message);
          }
        };
      }
    });
  };

  const openEditOfficeModal = (officeId) => {
    const office = QrewStore.getOfficeById(officeId);
    if (!office) return;

    QrewUI.openModal({
      title: `Edit Office: ${office.name}`,
      bodyHtml: `
        <form>
          <div class="form-group">
            <label class="form-label">Office Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="edit-office-name" value="${QrewUI.escapeHtml(office.name)}" required>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label">Location / Address</label>
            <input type="text" class="form-input" id="edit-office-loc" value="${QrewUI.escapeHtml(office.location || '')}">
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label">Office Status</label>
            <select class="form-select" id="edit-office-status">
              <option value="Active" ${office.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Suspended" ${office.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-edit-office">Save Changes</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#btn-submit-edit-office').onclick = () => {
          const name = modalEl.querySelector('#edit-office-name').value.trim();
          const location = modalEl.querySelector('#edit-office-loc').value.trim();
          const status = modalEl.querySelector('#edit-office-status').value;
          if (!name) return;

          QrewStore.updateOffice(officeId, { name, location, status }, office.tenantId);
          QrewUI.closeModal();
          QrewUI.showToast(`Office "${name}" updated.`, 'success');
          Qrew.handleRouteChange();
        };
      }
    });
  };

  const handleToggleOfficeStatus = (officeId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    const office = QrewStore.getOfficeById(officeId);
    const scopeTenantId = office ? office.tenantId : Qrew.state.currentTenantId;
    QrewUI.confirmDialog({
      title: `${newStatus === 'Active' ? 'Activate' : 'Suspend'} Office`,
      message: `Change office status to "${newStatus}"?`,
      confirmText: `${newStatus === 'Active' ? 'Activate' : 'Suspend'}`,
      confirmClass: newStatus === 'Active' ? 'btn-primary' : 'btn-danger',
      onConfirm: () => {
        QrewStore.updateOffice(officeId, { status: newStatus }, scopeTenantId);
        QrewUI.showToast(`Office marked as ${newStatus}.`, 'success');
        Qrew.handleRouteChange();
      }
    });
  };

  const handleDeleteOffice = (officeId, officeName, tenantId) => {
    QrewUI.confirmDialog({
      title: 'Delete Office Branch',
      message: `Permanently delete branch office "${officeName}"? All staff assignments for this office will be revoked.`,
      confirmText: 'Delete Office',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        try {
          QrewStore.deleteOffice(officeId, tenantId);
          QrewUI.showToast(`Office "${officeName}" deleted.`, 'success');
          const remaining = QrewStore.getOfficesByTenant(tenantId);
          Qrew.state.currentOfficeId = remaining.length > 0 ? remaining[0].id : '';
          Qrew.handleRouteChange();
        } catch (e) {
          QrewUI.showToast(e.message, 'error');
        }
      }
    });
  };

  const renderTenantOffices = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId) || QrewStore.getTenants()[0];
    if (!tenant) return Qrew.views.tenant.renderNotFound(tenantId);

    const renderOfficeNodes = () => {
      const filter = (treeState.searchTerm || '').toLowerCase().trim();
      const listEl = document.getElementById('tree-root-list');
      if (!listEl) return;

      const tenantOffices = QrewStore.getOfficesByTenant(tenant.id) || [];
      const filteredOffices = filter
        ? tenantOffices.filter(o =>
            o.name.toLowerCase().includes(filter) ||
            o.id.toLowerCase().includes(filter) ||
            (o.location && o.location.toLowerCase().includes(filter))
          )
        : tenantOffices;

      const countBadge = document.getElementById('offices-count-badge');
      if (countBadge) {
        countBadge.textContent = `${tenantOffices.length} Office${tenantOffices.length === 1 ? '' : 's'}`;
      }

      if (filteredOffices.length === 0) {
        listEl.innerHTML = `
          <div style="padding:40px 24px;text-align:center;background:var(--color-surface-white);border:1px dashed var(--color-border);border-radius:var(--radius-md);">
            <p style="color:var(--color-text-muted);font-size:13.5px;margin:0 0 14px;">
              ${filter ? `No offices match "${QrewUI.escapeHtml(filter)}"` : 'No offices created yet under this organization.'}
            </p>
            <button class="btn btn-secondary btn-sm" id="btn-empty-add-office">
              ${QrewUI.getIcon('plus')} Create Office
            </button>
          </div>
        `;
        const addBtn = document.getElementById('btn-empty-add-office');
        if (addBtn) addBtn.onclick = () => openCreateOfficeModal(tenant.id);
        return;
      }

      listEl.innerHTML = `
        <div class="offices-list-header">
          <div class="offices-th-identity">Office</div>
          <div class="offices-th-location">Location</div>
          <div class="offices-th-staff">Staff</div>
          <div class="offices-th-status">Status</div>
          <div class="offices-th-actions">Actions</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${filteredOffices.map(off => `
            <div class="tree-office-item" data-id="${off.id}">
              <!-- Col 1: Identity -->
              <div class="office-col-identity">
                <div class="tree-office-icon-wrap" aria-hidden="true" title="Facility Branch">
                  ${QrewUI.getIcon('building2') || QrewUI.getIcon('building')}
                </div>
                <div class="office-title-wrap">
                  <a href="#office/overview?tenantId=${tenant.id}&officeId=${off.id}" class="office-name-link" title="Open Branch Facility Workspace">
                    ${QrewUI.escapeHtml(off.name)}
                  </a>
                  <span class="tree-id-badge" title="Branch Office Identifier">${off.id}</span>
                </div>
              </div>

              <!-- Col 2: Location -->
              <div class="office-col-location">
                <span class="office-meta-icon">${QrewUI.getIcon('mapPin')}</span>
                <span class="office-meta-text" title="${QrewUI.escapeHtml(off.location || 'Location Not Specified')}">${QrewUI.escapeHtml(off.location || 'Location Not Specified')}</span>
              </div>

              <!-- Col 3: Staff -->
              <div class="office-col-staff">
                <span class="office-meta-icon">${QrewUI.getIcon('users')}</span>
                <span>${off.staffCount} staff member${off.staffCount === 1 ? '' : 's'}</span>
              </div>

              <!-- Col 4: Status -->
              <div class="office-col-status">
                ${QrewUI.statusBadge(off.status)}
              </div>

              <!-- Col 5: Actions -->
              <div class="office-col-actions" onclick="event.stopPropagation()">
                <button class="action-icon-btn edit-office-btn" data-id="${off.id}" title="Edit Office Details" aria-label="Edit Office">
                  ${QrewUI.getIcon('edit')}
                </button>
                <div class="tree-action-dropdown-wrap">
                  <button class="action-icon-btn tree-dropdown-trigger" data-dropdown="office-menu-${off.id}" title="More Office Actions" aria-label="More Office Actions">
                    ${QrewUI.getIcon('moreHorizontal')}
                  </button>
                  <div class="tree-action-menu" id="office-menu-${off.id}">
                    <a href="#office/overview?tenantId=${tenant.id}&officeId=${off.id}" class="tree-action-item" title="Open Branch Hub">
                      ${QrewUI.getIcon('building')} <span>Open Branch Hub</span>
                    </a>
                    <a href="#office-admin/overview?tenantId=${tenant.id}&officeId=${off.id}" onclick="Qrew.actions.confirmSwitchToOfficeAdmin(event, '${tenant.id}', '${off.id}')" class="tree-action-item" title="Open Office Administration">
                      ${QrewUI.getIcon('shield')} <span>Office Admin</span>
                    </a>
                    <a href="#office-config?tenantId=${tenant.id}&officeId=${off.id}" class="tree-action-item" title="Configure Facility Specs, Shift Templates & Custom Fields">
                      ${QrewUI.getIcon('settings')} <span>Configure Facility Specs</span>
                    </a>
                    <button class="tree-action-item edit-office-btn" data-id="${off.id}">
                      ${QrewUI.getIcon('edit')} <span>Edit Office Details</span>
                    </button>
                    <button class="tree-action-item toggle-office-btn" data-id="${off.id}" data-status="${off.status}">
                      ${QrewUI.getIcon('power')} <span>${off.status === 'Active' ? 'Suspend Office' : 'Activate Office'}</span>
                    </button>
                    <div class="tree-action-divider"></div>
                    <button class="tree-action-item danger delete-office-btn" data-id="${off.id}" data-name="${QrewUI.escapeHtml(off.name)}" data-tenant-id="${tenant.id}">
                      ${QrewUI.getIcon('trash')} <span>Delete Office Branch</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Wire Event Handlers
      const closeOpenMenus = () => {
        document.querySelectorAll('.tree-action-menu.show').forEach(m => {
          m.classList.remove('show');
          const item = m.closest('.tree-office-item');
          if (item) item.style.zIndex = '';
        });
      };

      listEl.querySelectorAll('.tree-dropdown-trigger').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const targetMenuId = btn.dataset.dropdown;
          const targetMenu = document.getElementById(targetMenuId);
          const wasOpen = targetMenu && targetMenu.classList.contains('show');

          closeOpenMenus();

          if (!wasOpen && targetMenu) {
            targetMenu.classList.add('show');
            const item = targetMenu.closest('.tree-office-item');
            if (item) item.style.zIndex = '50';
          }
        };
      });

      listEl.querySelectorAll('.edit-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          openEditOfficeModal(btn.dataset.id);
        };
      });

      listEl.querySelectorAll('.toggle-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          handleToggleOfficeStatus(btn.dataset.id, btn.dataset.status);
        };
      });

      listEl.querySelectorAll('.delete-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          handleDeleteOffice(btn.dataset.id, btn.dataset.name, btn.dataset.tenantId || tenant.id);
        };
      });
    };

    const tenantOffices = QrewStore.getOfficesByTenant(tenant.id) || [];

    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-title-group">
          <h1 class="page-title">Branch & Facility Offices</h1>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-create-office">
            ${QrewUI.getIcon('plus')} Create Office
          </button>
        </div>
      </div>

      <div class="tree-view-wrapper">
        <!-- Toolbar -->
        <div class="tree-toolbar">
          <div class="tree-search-wrap">
            <span class="tree-search-icon">${QrewUI.getIcon('search')}</span>
            <input type="text" class="tree-search-input" id="tree-search-input" placeholder="Search offices, IDs, or locations..." value="${QrewUI.escapeHtml(treeState.searchTerm)}">
          </div>

          <div class="tree-toolbar-actions">
            <span class="tree-meta-badge" id="offices-count-badge" style="background:var(--color-surface);color:var(--color-text-muted);border:1px solid var(--color-border);font-size:12px;padding:5px 10px;">
              ${tenantOffices.length} Office${tenantOffices.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        <!-- Direct Offices List -->
        <div class="tree-root-list" id="tree-root-list"></div>
      </div>
    `;

    renderOfficeNodes();

    const searchInput = document.getElementById('tree-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        treeState.searchTerm = e.target.value;
        renderOfficeNodes();
      };
    }

    document.getElementById('btn-create-office').onclick = () => openCreateOfficeModal(tenant.id);
  };

  Qrew.views.tenant.renderOffices = renderTenantOffices;
  Qrew.actions.openCreateOfficeModal = openCreateOfficeModal;
  Qrew.actions.openEditOfficeModal = openEditOfficeModal;
  Qrew.actions.handleToggleOfficeStatus = handleToggleOfficeStatus;
  Qrew.actions.handleDeleteOffice = handleDeleteOffice;
})();
