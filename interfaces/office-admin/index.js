/**
 * Interface: Office Admin Panel (SST.CTG.com/Admin / SST.MGL.com/Admin)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.registerInterface({
    id: 'office-admin',
    brandHome: 'tenant',

    getDomainBadge: ({ office }) => ({
      text: `${Qrew.getOfficeDomain(office)}/admin`,
      dotColor: 'var(--panel-accent)'
    }),

    getSidebarConfig: ({ state, view, tenant, office }) => {
      const initial = tenant ? tenant.name.charAt(0).toUpperCase() : 'S';
      const tenantId = tenant ? tenant.id : state.currentTenantId;
      const officeId = office ? office.id : state.currentOfficeId;
      const officesInTenant = tenant ? QrewStore.getOfficesByTenant(tenant.id) : [];

      return {
        logoText: initial,
        logoBg: 'var(--panel-accent, var(--color-accent))',
        brandName: tenant ? tenant.name : 'SST',
        brandBadge: office ? office.name : 'Chittagong Port Office',
        brandTitle: `Go to ${tenant ? tenant.name : 'Tenant'} Landing Page (${Qrew.getTenantDomain(state.currentTenantId)})`,
        picker: {
          label: `Branch Admin (${tenant ? tenant.name : ''})`,
          optionsHtml: officesInTenant.length > 0
            ? officesInTenant.map(o => `
                <option value="${o.id}" ${office && o.id === office.id ? 'selected' : ''}>${QrewUI.escapeHtml(o.name)}</option>
              `).join('')
            : '<option disabled selected>No offices created</option>',
          onChange: (e) => {
            Qrew.state.currentOfficeId = e.target.value;
            Qrew.navigateTo(`#office-admin/${Qrew.state.currentView || 'overview'}?tenantId=${tenantId}&officeId=${Qrew.state.currentOfficeId}`);
          }
        },
        navHtml: `
          <div class="nav-section">
            <div class="nav-section-title">Office Admin</div>
            <a class="nav-item ${view === 'overview' ? 'active' : ''}" href="#office-admin/overview?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
              <span class="nav-label">Overview</span>
            </a>
            <a class="nav-item ${view === 'invoice' ? 'active' : ''}" href="#office-admin/invoice?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('invoice')}</span>
              <span class="nav-label">Invoice</span>
            </a>
            <a class="nav-item ${view === 'staffs-management' || view === 'staff' ? 'active' : ''}" href="#office-admin/staffs-management?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Staffs Management</span>
            </a>
          </div>
          <div class="nav-section" style="margin-top:16px;">
            <div class="nav-section-title">Platform</div>
            <a class="nav-item" href="#landing" style="color:var(--color-accent);font-weight:600;">
              <span class="nav-icon">${QrewUI.getIcon('chevronLeft')}</span>
              <span class="nav-label">&larr; Qrew Landing Page</span>
            </a>
          </div>
        `
      };
    },

    render: (view) => {
      switch (view) {
        case 'overview':
          return Qrew.renderBlankTitledPage('Overview');
        case 'invoice':
          return Qrew.renderBlankTitledPage('Invoice');
        case 'staffs-management':
        case 'staff':
          return Qrew.renderBlankTitledPage('Staffs Management');
        default:
          return Qrew.renderBlankTitledPage('Overview');
      }
    }
  });
})();
