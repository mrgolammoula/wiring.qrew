/**
 * Interface: Tenant Workspace — Members Directory & Member Modals
 */
(() => {
  const Qrew = window.Qrew;

  const openAddTenantMemberModal = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId);
    const allUsers = QrewStore.getPlatformUsers();
    const existingMemberUserIds = tenant.members.map(m => m.userId);
    const nonMemberUsers = allUsers.filter(u => !existingMemberUserIds.includes(u.id));

    QrewUI.openModal({
      title: `Add Member to ${tenant.name}`,
      bodyHtml: `
        <div class="notice-box" style="margin-bottom:12px;">
          ${QrewUI.getIcon('info')}
          <div>
            <strong>Access Rule:</strong> A Platform Owner cannot be assigned as a Tenant Admin. Platform governance remains decoupled from tenant administration.
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Select Existing Platform User</label>
          <select class="form-select" id="new-member-user-id">
            <option value="">-- Choose User (or type email below) --</option>
            ${nonMemberUsers.map(u => `
              <option value="${u.id}" data-role="${u.platformRole}">${QrewUI.escapeHtml(u.name)} (${QrewUI.escapeHtml(u.email)}) [${u.platformRole}]</option>
            `).join('')}
          </select>
        </div>

        <div style="text-align:center;font-size:11px;color:var(--color-text-muted);margin:4px 0;">— OR INVITE NEW USER —</div>

        <div class="form-group">
          <label class="form-label">New User Name</label>
          <input type="text" class="form-input" id="new-member-custom-name" placeholder="e.g. Asif Mahmud">
        </div>

        <div class="form-group" style="margin-top:10px;">
          <label class="form-label">New User Email</label>
          <input type="email" class="form-input" id="new-member-custom-email" placeholder="e.g. asif@company.com">
        </div>

        <div class="form-group" style="margin-top:14px;">
          <label class="form-label">Tenant Role <span class="required">*</span></label>
          <select class="form-select" id="new-member-role">
            <option value="Tenant Member">Tenant Member</option>
            <option value="Tenant Manager">Tenant Manager</option>
            <option value="Tenant Admin" id="opt-tenant-admin">Tenant Admin</option>
          </select>
          <span class="form-hint" id="role-restriction-hint" style="color:var(--color-warning);display:none;">Platform Owners cannot be assigned the Tenant Admin role.</span>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-add-tenant-member">Add Member</button>
      `,
      onOpen: (modalEl) => {
        const userSelect = modalEl.querySelector('#new-member-user-id');
        const roleSelect = modalEl.querySelector('#new-member-role');
        const optAdmin = modalEl.querySelector('#opt-tenant-admin');
        const hintEl = modalEl.querySelector('#role-restriction-hint');

        const updateRoleOptions = () => {
          const selectedOpt = userSelect.options[userSelect.selectedIndex];
          const isPlatformOwner = selectedOpt && selectedOpt.dataset.role === 'Platform Owner';
          if (isPlatformOwner) {
            optAdmin.disabled = true;
            hintEl.style.display = 'block';
            if (roleSelect.value === 'Tenant Admin') {
              roleSelect.value = 'Tenant Member';
            }
          } else {
            optAdmin.disabled = false;
            hintEl.style.display = 'none';
          }
        };

        userSelect.onchange = updateRoleOptions;

        modalEl.querySelector('#btn-submit-add-tenant-member').onclick = () => {
          const userId = userSelect.value;
          const name = modalEl.querySelector('#new-member-custom-name').value.trim();
          const email = modalEl.querySelector('#new-member-custom-email').value.trim();
          const tenantRole = roleSelect.value;

          if (!userId && !email) {
            alert('Please select an existing user or enter a valid email.');
            return;
          }

          try {
            QrewStore.addTenantMember(tenantId, { userId, name, email, tenantRole });
            QrewUI.closeModal();
            QrewUI.showToast(`Member added to ${tenant.name}!`, 'success');
            Qrew.handleRouteChange();
          } catch (e) {
            alert(e.message);
          }
        };
      }
    });
  };

  const openChangeTenantRoleModal = (tenantId, userId, currentRole) => {
    const user = QrewStore.data.users.find(u => u.id === userId);
    const isPlatformOwner = user && user.platformRole === 'Platform Owner';

    QrewUI.openModal({
      title: `Change Tenant Role: ${user ? user.name : ''}`,
      bodyHtml: `
        ${isPlatformOwner ? `
          <div class="notice-box" style="margin-bottom:12px;">
            ${QrewUI.getIcon('alert')}
            <div>
              <strong>Role Restriction:</strong> "${user.name}" is a Platform Owner. A Platform Owner cannot be assigned the Tenant Admin role.
            </div>
          </div>
        ` : ''}
        <div class="form-group">
          <label class="form-label">Select New Tenant Role</label>
          <select class="form-select" id="change-tenant-role-select">
            <option value="Tenant Member" ${currentRole === 'Tenant Member' ? 'selected' : ''}>Tenant Member</option>
            <option value="Tenant Manager" ${currentRole === 'Tenant Manager' ? 'selected' : ''}>Tenant Manager</option>
            <option value="Tenant Admin" ${currentRole === 'Tenant Admin' ? 'selected' : ''} ${isPlatformOwner ? 'disabled' : ''}>
              Tenant Admin ${isPlatformOwner ? '(Restricted for Platform Owner)' : ''}
            </option>
          </select>
          <span class="form-hint">Applies scoped access control inside this tenant.</span>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-change-tenant-role">Update Role</button>
      `,
      onOpen: (modalEl) => {
        modalEl.querySelector('#btn-submit-change-tenant-role').onclick = () => {
          const newRole = modalEl.querySelector('#change-tenant-role-select').value;
          try {
            QrewStore.updateTenantMemberRole(tenantId, userId, newRole);
            QrewUI.closeModal();
            QrewUI.showToast(`Tenant role updated to ${newRole}.`, 'success');
            Qrew.handleRouteChange();
          } catch (e) {
            alert(e.message);
          }
        };
      }
    });
  };

  const handleRemoveTenantMember = (tenantId, userId, name) => {
    QrewUI.confirmDialog({
      title: 'Remove Tenant Member',
      message: `Are you sure you want to remove "${name}" from this tenant? Business rule cascade: They will also be removed from any offices in this tenant!`,
      confirmText: 'Remove Member',
      confirmClass: 'btn-danger',
      onConfirm: () => {
        QrewStore.removeTenantMember(tenantId, userId);
        QrewUI.showToast(`Removed "${name}" from tenant and child offices.`, 'success');
        Qrew.handleRouteChange();
      }
    });
  };

  Qrew.views.tenant.renderMembers = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId);
    if (!tenant) return Qrew.views.tenant.renderNotFound(tenantId);

    const members = QrewStore.getTenantMembers(tenant.id);
    const main = Qrew.dom.mainContent;

    main.innerHTML = `
      <div class="page-header">
        <div class="page-title-group">
          <h1 class="page-title">Tenant Members</h1>
          <p class="page-subtitle">Users verified with organization membership in ${QrewUI.escapeHtml(tenant.name)}.</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" id="btn-add-tenant-member">
            ${QrewUI.getIcon('plus')} Add Member
          </button>
        </div>
      </div>

      <div class="notice-box" style="margin-bottom:16px;">
        ${QrewUI.getIcon('info')}
        <div>
          <strong>Qrew Membership & Access Governance:</strong> Tenant members hold scoped organization roles.
          <strong>A Platform Owner cannot be assigned as a Tenant Admin</strong> to enforce architectural separation between global infrastructure governance and tenant administration.
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th>Tenant Role</th>
              <th>Status</th>
              <th>Joined Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${members.length === 0 ? `
              <tr>
                <td colspan="6">
                  ${QrewUI.emptyState({
                    title: 'No members in this tenant',
                    description: 'Add members to this organization to allow office assignments and access.'
                  })}
                </td>
              </tr>
            ` : members.map(m => `
              <tr>
                <td>
                  <strong>${QrewUI.escapeHtml(m.user.name)}</strong>
                </td>
                <td>${QrewUI.escapeHtml(m.user.email)}</td>
                <td>${QrewUI.roleBadge(m.tenantRole, 'tenant')}</td>
                <td>${QrewUI.statusBadge(m.status)}</td>
                <td>${m.joinedAt}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-secondary btn-sm change-tenant-role-btn" data-userid="${m.userId}" data-currentrole="${m.tenantRole}">
                      Change Role
                    </button>
                    <button class="action-icon-btn danger remove-tenant-member-btn" data-userid="${m.userId}" data-name="${m.user.name}" title="Remove Member">
                      ${QrewUI.getIcon('trash')}
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    document.getElementById('btn-add-tenant-member').onclick = () => openAddTenantMemberModal(tenant.id);
    main.querySelectorAll('.change-tenant-role-btn').forEach(btn => {
      btn.onclick = () => openChangeTenantRoleModal(tenant.id, btn.dataset.userid, btn.dataset.currentrole);
    });
    main.querySelectorAll('.remove-tenant-member-btn').forEach(btn => {
      btn.onclick = () => handleRemoveTenantMember(tenant.id, btn.dataset.userid, btn.dataset.name);
    });
  };
})();
