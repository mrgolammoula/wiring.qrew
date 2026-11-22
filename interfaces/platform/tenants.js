/**
 * Interface: Platform Admin — Tenants Tree Explorer & Tenant CRUD Modals
 */
(() => {
  const Qrew = window.Qrew;

  const platformTenantTreeState = {
    isRootExpanded: true,
    expandedTenants: new Set(['ten_sst']),
    searchTerm: '',
    statusFilter: 'All'
  };

  const openCreateTenantModal = () => {
    QrewUI.openModal({
      title: 'Create New Tenant Organization',
      bodyHtml: `
        <div class="notice-box" style="margin-bottom:12px;">
          ${QrewUI.getIcon('info')}
          <div>
            <strong>Separation of Duties:</strong> The tenant owner is automatically provisioned as Tenant Admin. A Platform Owner (such as Sakib) cannot be assigned as a Tenant Owner or Tenant Admin.
          </div>
        </div>
        <form id="create-tenant-form">
          <div class="form-group">
            <label class="form-label">Tenant / Organization Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="new-tenant-name" placeholder="e.g. Acme Corporation" required>
            <span class="form-hint">A unique namespace will be established for this tenant.</span>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label">Owner Full Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="new-tenant-owner" placeholder="e.g. Sarah Jenkins" required>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label">Owner Email Address <span class="required">*</span></label>
            <input type="email" class="form-input" id="new-tenant-email" placeholder="e.g. sarah@acme.com" required>
            <span class="form-hint">Owner will automatically be assigned as Tenant Admin. Must not be a Platform Owner.</span>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-create-tenant">Create Tenant</button>
      `,
      onOpen: (modalEl) => {
        const submitBtn = modalEl.querySelector('#btn-submit-create-tenant');
        submitBtn.onclick = () => {
          const name = modalEl.querySelector('#new-tenant-name').value.trim();
          const ownerName = modalEl.querySelector('#new-tenant-owner').value.trim();
          const ownerEmail = modalEl.querySelector('#new-tenant-email').value.trim();

          if (!name || !ownerName || !ownerEmail) {
            alert('Please fill out all required fields.');
            return;
          }

          try {
            const newTenant = QrewStore.createTenant({ name, ownerName, ownerEmail });
            Qrew.state.currentTenantId = newTenant.id;
            QrewUI.closeModal();
            QrewUI.showToast(`Tenant "${newTenant.name}" successfully created!`, 'success');
            Qrew.handleRouteChange();
          } catch (err) {
            alert(err.message);
          }
        };
      }
    });
  };

  const openEditTenantModal = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId);
    if (!tenant) return;

    QrewUI.openModal({
      title: `Edit Tenant: ${tenant.name}`,
      bodyHtml: `
        <form id="edit-tenant-form">
          <div class="form-group">
            <label class="form-label">Tenant Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="edit-tenant-name" value="${QrewUI.escapeHtml(tenant.name)}" required>
          </div>
          <div class="form-group" style="margin-top:14px;">
            <label class="form-label">Tenant Status</label>
            <select class="form-select" id="edit-tenant-status">
              <option value="Active" ${tenant.status === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Suspended" ${tenant.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-edit-tenant">Save Changes</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#btn-submit-edit-tenant').onclick = () => {
          const name = modalEl.querySelector('#edit-tenant-name').value.trim();
          const status = modalEl.querySelector('#edit-tenant-status').value;
          if (!name) return;

          QrewStore.updateTenant(tenantId, { name, status });
          QrewUI.closeModal();
          QrewUI.showToast(`Tenant "${name}" updated.`, 'success');
          Qrew.handleRouteChange();
        };
      }
    });
  };

  const handleToggleTenantStatus = (tenantId, currentStatus) => {
    const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
    const actionVerb = newStatus === 'Active' ? 'activate' : 'suspend';

    QrewUI.confirmDialog({
      title: `${newStatus === 'Active' ? 'Activate' : 'Suspend'} Tenant`,
      message: `Are you sure you want to ${actionVerb} this tenant? Suspended tenants and their offices cannot access operational endpoints.`,
      confirmText: `${newStatus === 'Active' ? 'Activate' : 'Suspend'}`,
      confirmClass: newStatus === 'Active' ? 'btn-primary' : 'btn-danger',
      onConfirm: () => {
        QrewStore.updateTenant(tenantId, { status: newStatus });
        QrewUI.showToast(`Tenant status updated to ${newStatus}.`, 'success');
        Qrew.handleRouteChange();
      }
    });
  };

  const handleDeleteTenant = (tenantId, tenantName) => {
    QrewUI.confirmDialog({
      title: 'Delete Tenant Organization',
      message: `Permanently delete organization "${tenantName}"? This will delete all branch offices, memberships, and staff assignments.`,
      confirmText: 'Delete Tenant',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        try {
          QrewStore.deleteTenant(tenantId);
          QrewUI.showToast(`Tenant "${tenantName}" deleted.`, 'success');
          const remaining = QrewStore.getTenants();
          Qrew.state.currentTenantId = remaining.length > 0 ? remaining[0].id : '';
          const remainingOffices = Qrew.state.currentTenantId ? QrewStore.getOfficesByTenant(Qrew.state.currentTenantId) : [];
          Qrew.state.currentOfficeId = remainingOffices.length > 0 ? remainingOffices[0].id : '';
          Qrew.handleRouteChange();
        } catch (e) {
          QrewUI.showToast(e.message, 'error');
        }
      }
    });
  };

  const renderPlatformTenants = () => {
    const allTenants = QrewStore.getTenants();
    // Default expand all tenants inside root so folder hierarchy is fully visible
    if (platformTenantTreeState.expandedTenants.size === 0 && allTenants.length > 0) {
      allTenants.forEach(t => platformTenantTreeState.expandedTenants.add(t.id));
    }

    const totalOfficesCount = allTenants.reduce((sum, t) => sum + (QrewStore.getOfficesByTenant(t.id) || []).length, 0);
    const totalMembersCount = allTenants.reduce((sum, t) => sum + (QrewStore.getTenantMembers(t.id) || []).length, 0);

    const renderTreeNodes = () => {
      const filter = (platformTenantTreeState.searchTerm || '').toLowerCase().trim();
      const status = platformTenantTreeState.statusFilter || 'All';
      const treeListEl = document.getElementById('tenants-tree-list');
      const statsBadgeEl = document.getElementById('tenants-stats-badge');
      if (!treeListEl) return;

      const filteredTenants = allTenants.filter(t => {
        const tenantOffices = QrewStore.getOfficesByTenant(t.id) || [];
        const matchesSearch = !filter || (
          t.name.toLowerCase().includes(filter) ||
          t.id.toLowerCase().includes(filter) ||
          (t.ownerName && t.ownerName.toLowerCase().includes(filter)) ||
          tenantOffices.some(o =>
            o.name.toLowerCase().includes(filter) ||
            o.id.toLowerCase().includes(filter) ||
            (o.location && o.location.toLowerCase().includes(filter))
          )
        );
        const matchesStatus = status === 'All' || t.status === status;
        return matchesSearch && matchesStatus;
      });

      if (statsBadgeEl) {
        statsBadgeEl.textContent = `${filteredTenants.length} Tenant${filteredTenants.length === 1 ? '' : 's'} • ${totalOfficesCount} Offices`;
      }

      // Auto-expand root and matching tenants if searching
      if (filter) {
        platformTenantTreeState.isRootExpanded = true;
        filteredTenants.forEach(t => platformTenantTreeState.expandedTenants.add(t.id));
      }

      const isRootExpanded = platformTenantTreeState.isRootExpanded;

      treeListEl.innerHTML = `
        ${filteredTenants.length === 0 ? `
          <div style="padding:32px 24px;background:var(--color-surface-white);border:1px dashed var(--color-border);border-radius:var(--radius-md);text-align:center;">
            <span style="color:var(--color-text-muted);font-size:13.5px;">
              ${filter ? `No organizations match "${QrewUI.escapeHtml(filter)}"` : 'No tenant organizations found.'}
            </span>
          </div>
        ` : filteredTenants.map(t => {
          const tenantOffices = QrewStore.getOfficesByTenant(t.id) || [];
          const tenantMembers = QrewStore.getTenantMembers(t.id) || [];
          const isTenantExpanded = platformTenantTreeState.expandedTenants.has(t.id);

          const filteredOffices = filter
            ? tenantOffices.filter(o =>
                o.name.toLowerCase().includes(filter) ||
                o.id.toLowerCase().includes(filter) ||
                (o.location && o.location.toLowerCase().includes(filter))
              )
            : tenantOffices;

          return `
            <div class="tree-tenant-card" data-tenant-id="${t.id}">
              <!-- Tenant Header Row (e.g. SST) -->
              <div class="tree-tenant-row ${isTenantExpanded ? 'expanded' : ''}" data-tenant-id="${t.id}" role="button" tabindex="0" aria-expanded="${isTenantExpanded ? 'true' : 'false'}" aria-label="Tenant Organization ${QrewUI.escapeHtml(t.name)}">
                <!-- Col 1: Identity -->
                <div class="tree-col-identity">
                  <span class="tree-chevron" aria-hidden="true">${QrewUI.getIcon('chevronRight')}</span>
                  <span class="tree-folder-icon" aria-hidden="true">
                    ${isTenantExpanded ? QrewUI.getIcon('folderOpen') : QrewUI.getIcon('folderClosed')}
                  </span>
                  <div class="tree-title-group">
                    <span class="tree-entity-name">${QrewUI.escapeHtml(t.name)}</span>
                    <span class="tree-id-badge" title="Tenant Organization Identifier">${t.id}</span>
                  </div>
                </div>

                <!-- Col 2: Owner Detail -->
                <div class="tree-col-detail">
                  <span class="tree-meta-icon">${QrewUI.getIcon('users')}</span>
                  <span class="tree-meta-label">Owner:</span>
                  <strong class="tree-meta-value">${QrewUI.escapeHtml(t.ownerName || 'Rafiqul Islam')}</strong>
                </div>

                <!-- Col 3: Counts -->
                <div class="tree-col-stats">
                  <span class="tree-meta-pill" title="Total Offices">
                    <span class="tree-meta-icon">${QrewUI.getIcon('building')}</span>
                    <span>${tenantOffices.length} office${tenantOffices.length === 1 ? '' : 's'}</span>
                  </span>
                  <span class="tree-meta-pill" title="Total Members">
                    <span class="tree-meta-icon">${QrewUI.getIcon('users')}</span>
                    <span>${tenantMembers.length} member${tenantMembers.length === 1 ? '' : 's'}</span>
                  </span>
                </div>

                <!-- Col 4: Status -->
                <div class="tree-col-status">
                  ${QrewUI.statusBadge(t.status)}
                </div>

                <!-- Col 5: Created Date -->
                <div class="tree-col-date" title="Organization Created Date">
                  <span>Est. ${t.createdAt || '2026-09-12'}</span>
                </div>

                <!-- Col 6: Actions -->
                <div class="tree-col-actions" onclick="event.stopPropagation()">
                  <button class="action-icon-btn edit-tenant-btn" data-id="${t.id}" title="Edit Organization Details" aria-label="Edit Tenant Organization">
                    ${QrewUI.getIcon('edit')}
                  </button>
                  <div class="tree-action-dropdown-wrap">
                    <button class="action-icon-btn tree-dropdown-trigger" data-dropdown="platform-tenant-menu-${t.id}" title="More Actions" aria-label="More Organization Actions">
                      ${QrewUI.getIcon('moreHorizontal')}
                    </button>
                    <div class="tree-action-menu" id="platform-tenant-menu-${t.id}">
                      <a href="#tenant/overview?id=${t.id}" class="tree-action-item">
                        ${QrewUI.getIcon('overview')} <span>Open Tenant Workspace</span>
                      </a>
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

              <!-- Child Offices Under Tenant -->
              ${isTenantExpanded ? `
                <div class="tree-branch-container nested-offices-branch">
                  ${filteredOffices.length === 0 ? `
                    <div style="padding:14px 18px;background:var(--color-surface-white);border:1px dashed var(--color-border);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;">
                      <span style="color:var(--color-text-muted);font-size:12.5px;">
                        ${filter ? `No offices match "${QrewUI.escapeHtml(filter)}"` : 'No offices created yet under this organization.'}
                      </span>
                      <button class="btn btn-secondary btn-sm create-office-tenant-btn" data-tenant-id="${t.id}">
                        ${QrewUI.getIcon('plus')} Add Office
                      </button>
                    </div>
                  ` : filteredOffices.map(off => `
                    <div class="tree-office-item" data-id="${off.id}">
                      <!-- Col 1: Identity -->
                      <div class="tree-col-identity">
                        <span class="tree-branch-connector" aria-hidden="true"></span>
                        <div class="tree-office-icon-wrap" aria-hidden="true" title="Facility Branch">
                          ${QrewUI.getIcon('building2') || QrewUI.getIcon('building')}
                        </div>
                        <div class="tree-title-group">
                          <a href="#office/overview?tenantId=${t.id}&officeId=${off.id}" class="tree-entity-name tree-office-link" title="Open Branch Facility Workspace">
                            ${QrewUI.escapeHtml(off.name)}
                          </a>
                          <span class="tree-id-badge" title="Branch Office Identifier">${off.id}</span>
                        </div>
                      </div>

                      <!-- Col 2: Location Detail -->
                      <div class="tree-col-detail">
                        <span class="tree-meta-icon">${QrewUI.getIcon('mapPin')}</span>
                        <span class="tree-meta-value" title="${QrewUI.escapeHtml(off.location || 'Location Not Specified')}">${QrewUI.escapeHtml(off.location || 'Location Not Specified')}</span>
                      </div>

                      <!-- Col 3: Staff Count -->
                      <div class="tree-col-stats">
                        <span class="tree-meta-pill" title="Deployed Staff Members">
                          <span class="tree-meta-icon">${QrewUI.getIcon('users')}</span>
                          <span>${off.staffCount} staff member${off.staffCount === 1 ? '' : 's'}</span>
                        </span>
                      </div>

                      <!-- Col 4: Status -->
                      <div class="tree-col-status">
                        ${QrewUI.statusBadge(off.status)}
                      </div>

                      <!-- Col 5: Spacer for Date alignment -->
                      <div class="tree-col-date"></div>

                      <!-- Col 6: Actions -->
                      <div class="tree-col-actions" onclick="event.stopPropagation()">
                        <div class="tree-action-dropdown-wrap">
                          <button class="action-icon-btn tree-dropdown-trigger" data-dropdown="platform-office-menu-${off.id}" title="More Office Actions" aria-label="More Office Actions">
                            ${QrewUI.getIcon('moreHorizontal')}
                          </button>
                          <div class="tree-action-menu" id="platform-office-menu-${off.id}">
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
        }).join('')}
      `;

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
          if (platformTenantTreeState.expandedTenants.has(tid)) {
            platformTenantTreeState.expandedTenants.delete(tid);
          } else {
            platformTenantTreeState.expandedTenants.add(tid);
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
          openEditTenantModal(btn.dataset.id);
        };
      });

      treeListEl.querySelectorAll('.toggle-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          handleToggleTenantStatus(btn.dataset.id, btn.dataset.status);
        };
      });

      treeListEl.querySelectorAll('.delete-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          handleDeleteTenant(btn.dataset.id, btn.dataset.name);
        };
      });

      treeListEl.querySelectorAll('.edit-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.openEditOfficeModal(btn.dataset.id);
        };
      });

      treeListEl.querySelectorAll('.toggle-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.handleToggleOfficeStatus(btn.dataset.id, btn.dataset.status);
        };
      });

      treeListEl.querySelectorAll('.delete-office-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.handleDeleteOffice(btn.dataset.id, btn.dataset.name, btn.dataset.tenantId);
        };
      });

      treeListEl.querySelectorAll('.create-office-tenant-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          closeOpenMenus();
          Qrew.actions.openCreateOfficeModal(btn.dataset.tenantId);
        };
      });
    };

    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom:20px;">
        <div class="page-title-group">
          <h1 class="page-title">Tenant Management</h1>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-create-tenant">
            ${QrewUI.getIcon('plus')} Create Tenant
          </button>
        </div>
      </div>

      <div class="tree-view-wrapper">
        <!-- Tree Toolbar -->
        <div class="tree-toolbar">
          <div class="tree-toolbar-left" style="display:flex;align-items:center;gap:12px;flex:1;max-width:540px;">
            <div class="tree-search-wrap" style="flex:1;">
              <span class="tree-search-icon">${QrewUI.getIcon('search')}</span>
              <input type="text" class="tree-search-input" id="tenant-tree-search" placeholder="Search offices, IDs, or locations..." value="${QrewUI.escapeHtml(platformTenantTreeState.searchTerm)}">
            </div>
            <select class="select-filter" id="tenant-tree-status-filter" style="min-width:130px;height:34px;padding:4px 10px;font-size:12.5px;">
              <option value="All" ${platformTenantTreeState.statusFilter === 'All' ? 'selected' : ''}>All Statuses</option>
              <option value="Active" ${platformTenantTreeState.statusFilter === 'Active' ? 'selected' : ''}>Active</option>
              <option value="Suspended" ${platformTenantTreeState.statusFilter === 'Suspended' ? 'selected' : ''}>Suspended</option>
            </select>
          </div>

          <div class="tree-toolbar-actions">
            <span class="tree-meta-badge" id="tenants-stats-badge" style="background:var(--color-surface);color:var(--color-text-muted);border:1px solid var(--color-border);font-size:12px;padding:5px 10px;">
              ${allTenants.length} Tenant${allTenants.length === 1 ? '' : 's'} • ${totalOfficesCount} Offices
            </span>
            <button class="btn btn-primary btn-sm" id="btn-toolbar-create-tenant" style="display:inline-flex;align-items:center;gap:6px;">
              ${QrewUI.getIcon('plus')} New Tenant
            </button>
          </div>
        </div>

        <!-- Tree Nodes List -->
        <div class="tree-root-list" id="tenants-tree-list"></div>
      </div>
    `;

    document.getElementById('btn-create-tenant').onclick = openCreateTenantModal;
    const btnToolbarCreate = document.getElementById('btn-toolbar-create-tenant');
    if (btnToolbarCreate) btnToolbarCreate.onclick = openCreateTenantModal;

    const searchInput = document.getElementById('tenant-tree-search');
    const statusFilter = document.getElementById('tenant-tree-status-filter');

    if (searchInput) {
      searchInput.oninput = (e) => {
        platformTenantTreeState.searchTerm = e.target.value;
        renderTreeNodes();
      };
    }

    if (statusFilter) {
      statusFilter.onchange = (e) => {
        platformTenantTreeState.statusFilter = e.target.value;
        renderTreeNodes();
      };
    }

    renderTreeNodes();
  };

  Qrew.views.platform.renderTenants = renderPlatformTenants;
  Qrew.actions.openCreateTenantModal = openCreateTenantModal;
  Qrew.actions.openEditTenantModal = openEditTenantModal;
  Qrew.actions.handleToggleTenantStatus = handleToggleTenantStatus;
  Qrew.actions.handleDeleteTenant = handleDeleteTenant;
})();
