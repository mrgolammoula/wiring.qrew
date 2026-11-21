/**
 * Interface: Office Workspace (SST.CTG.com / SST.MGL.com)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.registerInterface({
    id: 'office',
    brandHome: 'tenant',

    getDomainBadge: ({ office }) => ({
      text: Qrew.getOfficeDomain(office),
      dotColor: 'var(--panel-accent)'
    }),

    getSidebarConfig: ({ state, view, tenant, office }) => {
      const initial = tenant ? tenant.name.charAt(0).toUpperCase() : 'S';
      const tenantId = tenant ? tenant.id : state.currentTenantId;
      const officeId = office ? office.id : state.currentOfficeId;
      const officesInTenant = tenant ? QrewStore.getOfficesByTenant(tenant.id) : [];

      return {
        logoText: initial,
        logoBg: 'var(--panel-accent, var(--color-info))',
        brandName: tenant ? tenant.name : 'SST',
        brandBadge: office ? office.name : 'Chittagong Port Office',
        brandTitle: `Go to ${tenant ? tenant.name : 'Tenant'} Landing Page (${Qrew.getTenantDomain(state.currentTenantId)})`,
        picker: {
          label: `Offices (${tenant ? tenant.name : ''})`,
          optionsHtml: officesInTenant.length > 0
            ? officesInTenant.map(o => `
                <option value="${o.id}" ${office && o.id === office.id ? 'selected' : ''}>${QrewUI.escapeHtml(o.name)}</option>
              `).join('')
            : '<option disabled selected>No offices created</option>',
          onChange: (e) => {
            Qrew.state.currentOfficeId = e.target.value;
            Qrew.navigateTo(`#office/overview?tenantId=${tenantId}&officeId=${Qrew.state.currentOfficeId}`);
          }
        },
        navHtml: `
          <div class="nav-section">
            <div class="nav-section-title">Office</div>
            <a class="nav-item ${view === 'dashboard' || view === 'overview' ? 'active' : ''}" href="#office/dashboard?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
              <span class="nav-label">Dashboard</span>
            </a>
            <a class="nav-item ${view === 'clients' ? 'active' : ''}" href="#office/clients?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Clients</span>
            </a>
            <a class="nav-item ${view === 'files' ? 'active' : ''}" href="#office/files?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('file')}</span>
              <span class="nav-label">Files</span>
            </a>
            <a class="nav-item ${view === 'financials' ? 'active' : ''}" href="#office/financials?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('dollar')}</span>
              <span class="nav-label">Financials</span>
            </a>
            <a class="nav-item ${view === 'staffs' || view === 'staff' ? 'active' : ''}" href="#office/staffs?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Staffs</span>
            </a>
          </div>
          <div class="nav-section" style="margin-top:16px;">
            <div class="nav-section-title">Management</div>
            <a class="nav-item" href="#office-admin/overview?tenantId=${tenantId}&officeId=${officeId}" style="color:var(--color-accent);font-weight:600;">
              <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
              <span class="nav-label">Office Admin Panel &rarr;</span>
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
        case 'dashboard':
        case 'overview':
          return Qrew.renderBlankTitledPage('Dashboard');
        case 'clients':
          return Qrew.renderBlankTitledPage('Clients');
        case 'files':
          return Qrew.renderBlankTitledPage('Files');
        case 'financials':
          return Qrew.renderBlankTitledPage('Financials');
        case 'staffs':
        case 'staff':
          return Qrew.renderBlankTitledPage('Staffs');
        default:
          return Qrew.renderBlankTitledPage('Dashboard');
      }
    }
  });
})();
