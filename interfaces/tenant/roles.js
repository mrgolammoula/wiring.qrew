/**
 * Interface: Tenant Workspace — Roles & Permissions View
 */
(() => {
  const Qrew = window.Qrew;

  const renderTenantRoles = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId);
    if (!tenant) return Qrew.views.tenant.renderNotFound(tenantId);

    const tenantRoles = QrewStore.getRoles('tenant');
    const currentRole = tenantRoles.find(r => r.id === Qrew.state.selectedRoleId) || tenantRoles[0];
    const main = Qrew.dom.mainContent;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Tenant Roles</h1>
        </div>
      </div>

      <!-- Roles Grid -->
      <div class="roles-grid">
        ${tenantRoles.map(role => {
          const assignedCount = tenant.members.filter(m => m.tenantRole === role.name).length;
          const isSelected = role.id === currentRole.id;
          return `
            <div class="role-card ${isSelected ? 'selected' : ''}" data-roleid="${role.id}">
              <div class="role-card-header">
                <div>
                  <h3 class="role-card-title">${QrewUI.escapeHtml(role.name)}</h3>
                  <div style="margin-top:4px;">${QrewUI.roleBadge(role.name, 'tenant')}</div>
                </div>
                <div style="font-size:11px;font-weight:600;color:var(--panel-accent, var(--color-accent));">
                  ${role.permissions.length} perms
                </div>
              </div>
              <p class="role-card-desc">${QrewUI.escapeHtml(role.description)}</p>
              <div class="role-card-meta">
                <span>In this Tenant:</span>
                <strong>${assignedCount} members</strong>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Permissions Inspector -->
      <div class="permissions-matrix-card">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--color-border-subtle);padding-bottom:16px;">
          <div>
            <h3 style="font-size:16px;font-weight:600;color:var(--color-text-primary);">
              Permissions for "${QrewUI.escapeHtml(currentRole.name)}"
            </h3>
            <p style="font-size:12.5px;color:var(--color-text-muted);">
              Granular capabilities authorized for this tenant role.
            </p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-verify-ten-perms">
            ${QrewUI.getIcon('check')} Verify Permissions
          </button>
        </div>

        <div class="permission-groups-grid">
          <div class="permission-group-card">
            <div class="permission-group-title">
              <span>Tenant Resource</span>
              <span class="id-badge">tenant_*</span>
            </div>
            <div class="permission-list">
              ${['tenant_create', 'tenant_read', 'tenant_update', 'tenant_delete'].map(perm => `
                <label class="permission-item">
                  <input type="checkbox" class="permission-checkbox" ${currentRole.permissions.includes(perm) ? 'checked' : ''} disabled>
                  <span>${perm}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="permission-group-card">
            <div class="permission-group-title">
              <span>Office Operations</span>
              <span class="id-badge">office_*</span>
            </div>
            <div class="permission-list">
              ${['office_create', 'office_read', 'office_update', 'office_delete'].map(perm => `
                <label class="permission-item">
                  <input type="checkbox" class="permission-checkbox" ${currentRole.permissions.includes(perm) ? 'checked' : ''} disabled>
                  <span>${perm}</span>
                </label>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    main.querySelectorAll('.role-card').forEach(card => {
      card.onclick = () => {
        Qrew.state.selectedRoleId = card.dataset.roleid;
        renderTenantRoles(tenantId);
      };
    });

    const verifyBtn = document.getElementById('btn-verify-ten-perms');
    if (verifyBtn) {
      verifyBtn.onclick = () => {
        QrewUI.showToast(`Capabilities verified for ${currentRole.name}.`, 'success');
      };
    }
  };

  Qrew.views.tenant.renderRoles = renderTenantRoles;
})();
