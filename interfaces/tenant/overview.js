/**
 * Interface: Tenant Workspace — Overview View
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.views.tenant.renderOverview = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId);
    if (!tenant) {
      Qrew.views.tenant.renderNotFound(tenantId);
      return;
    }

    Qrew.dom.mainContent.innerHTML = `
      <!-- Tenant Overview Header Card -->
      <div class="detail-header-card">
        <div>
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
            <h1 class="page-title" style="margin:0;">${QrewUI.escapeHtml(tenant.name)}</h1>
            ${QrewUI.statusBadge(tenant.status)}
          </div>
        </div>

        <div class="page-actions">
          <button class="btn btn-secondary" id="btn-edit-tenant-header">
            ${QrewUI.getIcon('edit')} Edit Tenant
          </button>
          <button class="btn btn-outline" id="btn-toggle-tenant-header">
            ${tenant.status === 'Active' ? 'Suspend Tenant' : 'Activate Tenant'}
          </button>
        </div>

        <div class="detail-meta-grid">
          <div class="meta-item">
            <span class="meta-label">Tenant ID</span>
            <span class="meta-value"><span class="id-badge">${tenant.id}</span></span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Tenant Owner</span>
            <span class="meta-value">${QrewUI.escapeHtml(tenant.ownerName)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Owner Email</span>
            <span class="meta-value">${QrewUI.escapeHtml(tenant.ownerEmail)}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Offices</span>
            <span class="meta-value">${tenant.officeCount}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Total Members</span>
            <span class="meta-value">${tenant.memberCount}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Created Date</span>
            <span class="meta-value">${tenant.createdAt}</span>
          </div>
        </div>
      </div>

      <!-- Quick Metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Branch Offices</span>
            <div class="metric-icon-wrap">${QrewUI.getIcon('offices')}</div>
          </div>
          <div class="metric-value-row">
            <div class="metric-value">${tenant.offices.length}</div>
            <div class="metric-subtext">Active locations</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Organization Members</span>
            <div class="metric-icon-wrap">${QrewUI.getIcon('users')}</div>
          </div>
          <div class="metric-value-row">
            <div class="metric-value">${tenant.members.length}</div>
            <div class="metric-subtext">Verified personnel</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Tenant Admin</span>
            <div class="metric-icon-wrap" style="color:var(--color-warning);">${QrewUI.getIcon('roles')}</div>
          </div>
          <div class="metric-value-row">
            <div style="font-size:16px;font-weight:700;">${QrewUI.escapeHtml(tenant.ownerName)}</div>
            <div class="metric-subtext">Scoped admin</div>
          </div>
        </div>
      </div>

      <!-- Quick Lists Grid -->
      <div class="dashboard-grid">
        <!-- Offices Quick Preview -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Branch Offices</h2>
            </div>
          </div>
          <div class="table-wrapper" style="border:none;box-shadow:none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Office Name</th>
                  <th>Location</th>
                  <th>Staff</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${tenant.offices.map(o => `
                  <tr>
                    <td>
                      <a href="#office/overview?tenantId=${tenant.id}&officeId=${o.id}" class="table-row-link">
                        <strong>${QrewUI.escapeHtml(o.name)}</strong>
                      </a>
                    </td>
                    <td>${QrewUI.escapeHtml(o.location)}</td>
                    <td>${o.staffCount} staff</td>
                    <td>${QrewUI.statusBadge(o.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Members Quick Preview -->
        <div class="card">
          <div class="card-header">
            <div>
              <h2 class="card-title">Tenant Members</h2>
            </div>
          </div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${tenant.members.map(m => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 10px;background:var(--color-surface);border-radius:var(--radius-sm);border:1px solid var(--color-border-subtle);">
                  <div>
                    <strong>${QrewUI.escapeHtml(m.user.name)}</strong>
                    <div style="font-size:11px;color:var(--color-text-muted);">${QrewUI.escapeHtml(m.user.email)}</div>
                  </div>
                  ${QrewUI.roleBadge(m.tenantRole, 'tenant')}
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-edit-tenant-header').onclick = () => Qrew.actions.openEditTenantModal(tenant.id);
    document.getElementById('btn-toggle-tenant-header').onclick = () => Qrew.actions.handleToggleTenantStatus(tenant.id, tenant.status);
  };
})();
