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

    // Ensure the current active tenant is expanded by default
    if (!treeState.expandedTenants.has(tenant.id) && treeState.expandedTenants.size === 0) {
      treeState.expandedTenants.add(tenant.id);
    }

    const allTenants = QrewStore.getTenants();
    const totalOfficesCount = allTenants.reduce((sum, t) => sum + (QrewStore.getOfficesByTenant(t.id) || []).length, 0);

    const renderTreeNodes = () => {
      const filter = (treeState.searchTerm || '').toLowerCase().trim();
      const treeListEl = document.getElementById('tree-root-list');
      if (!treeListEl) return;

      treeListEl.innerHTML = allTenants.map(t => {
        const tenantOffices = QrewStore.getOfficesByTenant(t.id) || [];
        const tenantMembers = QrewStore.getTenantMembers(t.id) || [];

        const filteredOffices = filter
          ? tenantOffices.filter(o =>
              o.name.toLowerCase().includes(filter) ||
              o.id.toLowerCase().includes(filter) ||
              (o.location && o.location.toLowerCase().includes(filter))
            )
          : tenantOffices;

        if (filter && filteredOffices.length > 0) {
          treeState.expandedTenants.add(t.id);
        }

        const isExpanded = treeState.expandedTenants.has(t.id);

        return `
          <div class="tree-tenant-card" data-tenant-id="${t.id}">
            <!-- Tenant Root Folder Row -->
            <div class="tree-tenant-row ${isExpanded ? 'expanded' : ''}" data-tenant-id="${t.id}" role="button" tabindex="0" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="Tenant Organization ${QrewUI.escapeHtml(t.name)}">
              <div class="tree-tenant-left">
                <span class="tree-chevron" aria-hidden="true">${QrewUI.getIcon('chevronRight')}</span>
                <span class="tree-folder-icon" aria-hidden="true">
                  ${isExpanded ? QrewUI.getIcon('folderOpen') : QrewUI.getIcon('folderClosed')}
                </span>
                <div class="tree-tenant-name-group">
                  <span class="tree-tenant-title">${QrewUI.escapeHtml(t.name)}</span>
                  <span class="tree-id-badge" title="Tenant Organization Identifier">${t.id}</span>
                </div>
              </div>

              <div class="tree-tenant-meta">
                <span class="tree-meta-item" title="Organization Account Owner">
                  <span class="tree-meta-icon">${QrewUI.getIcon('users')}</span>
                  <span class="tree-meta-label">Owner:</span>
                  <strong style="color:var(--color-text-primary);">${QrewUI.escapeHtml(t.ownerName || 'Rafiqul Islam')}</strong>
                </span>
                <span class="tree-meta-divider" aria-hidden="true">•</span>
                <span class="tree-meta-badge" title="Total Offices">
                  ${tenantOffices.length} office${tenantOffices.length === 1 ? '' : 's'}
                </span>
                <span class="tree-meta-divider" aria-hidden="true">•</span>
                <span class="tree-meta-item" title="Total Organization Members" style="color:var(--color-text-muted);">
                  ${tenantMembers.length} member${tenantMembers.length === 1 ? '' : 's'}
                </span>
                <span class="tree-meta-divider" aria-hidden="true">•</span>
                <span class="tree-meta-item">
                  ${QrewUI.statusBadge(t.status)}
                </span>
                <span class="tree-meta-divider" aria-hidden="true">•</span>
                <span class="tree-meta-date" title="Organization Created Date">
                  Est. ${t.createdAt || '2026-09-12'}
                </span>
              </div>

              <div class="tree-actions-wrap" onclick="event.stopPropagation()">
                <button class="action-icon-btn edit-tenant-btn" data-id="${t.id}" title="Edit Organization Details" aria-label="Edit Tenant Organization">
                  ${QrewUI.getIcon('edit')}
                </button>
                <div class="tree-action-dropdown-wrap">
                  <button class="action-icon-btn tree-dropdown-trigger" data-dropdown="tenant-menu-${t.id}" title="More Actions" aria-label="More Organization Actions">
                    ${QrewUI.getIcon('moreHorizontal')}
                  </button>
                  <div class="tree-action-menu" id="tenant-menu-${t.id}">
                    <button class="tree-action-item edit-tenant-btn" data-id="${t.id}">
                      ${QrewUI.getIcon('edit')} <span>Edit Organization</span>
                    </button>
                    <button class="tree-action-item toggle-tenant-btn" data-id="${t.id}" data-status="${t.status}">
                      ${QrewUI.getIcon('power')} <span>${t.status === 'Active' ? 'Suspend Organization' : 'Activate Organization'}</span>
                    </button>
                    <div class="tree-action-divider"></div>
                    <button class="tree-action-item danger delete-tenant-btn" data-id="${t.id}" data-name="${QrewUI.escapeHtml(t.name)}">
                      ${QrewUI.getIcon('trash')} <span>Delete Organization</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Child Offices Tree Branch -->
            ${isExpanded ? `
              <div class="tree-branch-container">
                ${filteredOffices.length === 0 ? `
                  <div style="padding:16px 20px;background:var(--color-surface-white);border:1px dashed var(--color-border);border-radius:var(--radius-md);display:flex;align-items:center;justify-content:space-between;">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <span style="color:var(--color-text-muted);font-size:13px;">
                        ${filter ? `No offices match "${QrewUI.escapeHtml(filter)}"` : 'No offices created yet under this organization.'}
                      </span>
                    </div>
                    <button class="btn btn-secondary btn-sm create-office-tenant-btn" data-tenant-id="${t.id}">
                      ${QrewUI.getIcon('plus')} Add Office
                    </button>
                  </div>
                ` : filteredOffices.map(off => `
                  <div class="tree-office-item" data-id="${off.id}">
                    <!-- Group 1: Office Identity -->
                    <div class="tree-office-identity">
                      <div class="tree-office-icon-wrap" aria-hidden="true" title="Facility Branch">
                        ${QrewUI.getIcon('building2') || QrewUI.getIcon('building')}
                      </div>
                      <div class="tree-office-title-wrap">
                        <a href="#office/overview?tenantId=${t.id}&officeId=${off.id}" class="tree-office-name" title="Open Branch Facility Workspace">
                          ${QrewUI.escapeHtml(off.name)}
                        </a>
                        <span class="tree-id-badge" title="Branch Office Identifier">${off.id}</span>
                      </div>
                    </div>

                    <!-- Group 2: Office Metadata -->
                    <div class="tree-office-meta">
                      <span class="tree-office-location" title="Branch Physical Location">
                        ${QrewUI.getIcon('mapPin')}
                        <span>${QrewUI.escapeHtml(off.location || 'Location Not Specified')}</span>
                      </span>
                      <span class="tree-meta-divider" aria-hidden="true">•</span>
                      <span class="tree-office-staff-badge" title="Deployed Staff Members">
                        ${QrewUI.getIcon('users')}
                        <span>${off.staffCount} staff member${off.staffCount === 1 ? '' : 's'}</span>
                      </span>
                      <span class="tree-meta-divider" aria-hidden="true">•</span>
                      <span class="tree-office-status">
                        ${QrewUI.statusBadge(off.status)}
                      </span>
                    </div>

                    <!-- Group 3: Office Actions -->
                    <div class="tree-office-actions" onclick="event.stopPropagation()">
                      <div class="tree-action-dropdown-wrap">
                        <button class="action-icon-btn tree-dropdown-trigger" data-dropdown="office-menu-${off.id}" title="More Office Actions" aria-label="More Office Actions">
                          ${QrewUI.getIcon('moreHorizontal')}
                        </button>
                        <div class="tree-action-menu" id="office-menu-${off.id}">
                          <a href="#office/overview?tenantId=${t.id}&officeId=${off.id}" class="tree-action-item" title="Open Branch Hub">
                            ${QrewUI.getIcon('building')} <span>Open Branch Hub</span>
                          </a>
                          <a href="#office-admin/overview?tenantId=${t.id}&officeId=${off.id}" class="tree-action-item" title="Open Office Administration">
                            ${QrewUI.getIcon('shield')} <span>Office Admin</span>
                          </a>
                          <a href="#office-config?tenantId=${t.id}&officeId=${off.id}" class="tree-action-item" title="Configure Facility Specs, Shift Templates & Custom Fields">
                            ${QrewUI.getIcon('settings')} <span>Configure Facility Specs</span>
                          </a>
                          <button class="tree-action-item edit-office-btn" data-id="${off.id}">
                            ${QrewUI.getIcon('edit')} <span>Edit Office Details</span>
                          </button>
                          <button class="tree-action-item toggle-office-btn" data-id="${off.id}" data-status="${off.status}">
                            ${QrewUI.getIcon('power')} <span>${off.status === 'Active' ? 'Suspend Office' : 'Activate Office'}</span>
                          </button>
                          <div class="tree-action-divider"></div>
                          <button class="tree-action-item danger delete-office-btn" data-id="${off.id}" data-name="${QrewUI.escapeHtml(off.name)}" data-tenant-id="${t.id}">
                            ${QrewUI.getIcon('trash')} <span>Delete Office Branch</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');

      // Wire Event Handlers
      treeListEl.querySelectorAll('.tree-dropdown-trigger').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const targetMenuId = btn.dataset.dropdown;
          const targetMenu = document.getElementById(targetMenuId);
          const wasOpen = targetMenu && targetMenu.classList.contains('show');

          document.querySelectorAll('.tree-action-menu.show').forEach(m => m.classList.remove('show'));

          if (!wasOpen && targetMenu) {
            targetMenu.classList.add('show');
          }
        };
      });

      treeListEl.querySelectorAll('.tree-tenant-row').forEach(row => {
        row.onclick = () => {
          const tid = row.dataset.tenantId;
          if (treeState.expandedTenants.has(tid)) {
            treeState.expandedTenants.delete(tid);
          } else {
            treeState.expandedTenants.add(tid);
          }
          renderTreeNodes();
        };

        row.onkeydown = (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            row.click();
          }
        };
      });

      const closeOpenMenus = () => {
        document.querySelectorAll('.tree-action-menu.show').forEach(m => m.classList.remove('show'));
      };

      treeListEl.querySelectorAll('.edit-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.openEditTenantModal(btn.dataset.id);
        };
      });

      treeListEl.querySelectorAll('.toggle-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.handleToggleTenantStatus(btn.dataset.id, btn.dataset.status);
        };
      });

      treeListEl.querySelectorAll('.delete-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.handleDeleteTenant(btn.dataset.id, btn.dataset.name);
        };
      });

      treeListEl.querySelectorAll('.edit-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          openEditOfficeModal(btn.dataset.id);
        };
      });

      treeListEl.querySelectorAll('.toggle-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          handleToggleOfficeStatus(btn.dataset.id, btn.dataset.status);
        };
      });

      treeListEl.querySelectorAll('.delete-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          handleDeleteOffice(btn.dataset.id, btn.dataset.name, btn.dataset.tenantId || tenant.id);
        };
      });

      treeListEl.querySelectorAll('.create-office-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          openCreateOfficeModal(btn.dataset.tenantId);
        };
      });
    };

    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-title-group">
          <h1 class="page-title">Branch & Facility Offices</h1>
          <p class="page-subtitle">Hierarchical tree view of organization facilities, offices, and operational branches.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-create-office">
            ${QrewUI.getIcon('plus')} Create Office
          </button>
        </div>
      </div>

      <div class="tree-view-wrapper">
        <!-- Tree Toolbar -->
        <div class="tree-toolbar">
          <div class="tree-search-wrap">
            <span class="tree-search-icon">${QrewUI.getIcon('search')}</span>
            <input type="text" class="tree-search-input" id="tree-search-input" placeholder="Search offices, IDs, or locations..." value="${QrewUI.escapeHtml(treeState.searchTerm)}">
          </div>

          <div class="tree-toolbar-actions">
            <span class="tree-meta-badge" style="background:var(--color-surface);color:var(--color-text-muted);border:1px solid var(--color-border);font-size:12px;padding:5px 10px;">
              ${allTenants.length} Tenant${allTenants.length === 1 ? '' : 's'} • ${totalOfficesCount} Offices
            </span>
          </div>
        </div>

        <!-- Tree Nodes List -->
        <div class="tree-root-list" id="tree-root-list"></div>
      </div>
    `;

    renderTreeNodes();

    const searchInput = document.getElementById('tree-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        treeState.searchTerm = e.target.value;
        renderTreeNodes();
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
