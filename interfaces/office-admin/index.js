/**
 * Interface: Office Admin Panel (SST.CTG.com/Admin / SST.MGL.com/Admin)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.registerInterface({
    id: 'office-admin',
    brandHome: 'tenant',

    getDomainBadge: ({ office, view }) => {
      const subPath = (view && view !== 'overview') ? `/${view}` : '';
      return {
        text: `${Qrew.getOfficeDomain(office)}/admin${subPath}`,
        dotColor: 'var(--panel-accent)'
      };
    },

    getSidebarConfig: ({ state, view, tenant, office }) => {
      const initial = tenant ? tenant.name.charAt(0).toUpperCase() : 'S';
      const tenantId = tenant ? tenant.id : state.currentTenantId;
      const officeId = office ? office.id : state.currentOfficeId;
      const officesInTenant = tenant ? QrewStore.getOfficesByTenant(tenant.id) : [];

      const officeName = office ? office.name : 'Chittagong Port Office';

      return {
        logoText: initial,
        logoBg: 'var(--panel-accent, var(--color-accent))',
        brandName: tenant ? tenant.name : 'SST',
        brandBadge: `${officeName} Admin`,
        brandTitle: `Go to ${tenant ? tenant.name : 'Tenant'} Landing Page (${Qrew.getTenantDomain(state.currentTenantId)})`,
        picker: {
          label: '',
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
            <a class="nav-item ${view === 'overview' ? 'active' : ''}" href="#office-admin/overview?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
              <span class="nav-label">Overview</span>
            </a>
            <a class="nav-item ${view === 'invoice' ? 'active' : ''}" href="#office-admin/invoice?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('invoice')}</span>
              <span class="nav-label">Invoice</span>
            </a>

            <div class="nav-divider"></div>

            <a class="nav-item ${view === 'staffs-management' || view === 'staff' ? 'active' : ''}" href="#office-admin/staffs-management?tenantId=${tenantId}&officeId=${officeId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Staffs Management</span>
            </a>
          </div>
        `,
        footerHtml: ''
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
