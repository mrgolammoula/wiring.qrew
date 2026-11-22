/**
 * Interface: Tenant Super Admin Workspace
 */
(() => {
  const Qrew = window.Qrew;

  const PAGE_TITLES = {
    'plan-and-entitlement': 'Plan and Entitlement',
    'qrew-profile': 'Qrew Profile',
    'setting': 'Setting',
    'settings': 'Setting',
    'domain-config': 'Domain Config',
    'company-profile': 'Company Profile'
  };

  Qrew.registerInterface({
    id: 'tenant-super-admin',
    brandHome: 'tenant',

    getDomainBadge: ({ tenant, view }) => {
      const tenantName = (tenant && tenant.name) ? tenant.name.toLowerCase() : 'sst';
      const subPath = view ? `/${view}` : '/plan-and-entitlement';
      return {
        text: `app.${tenantName}.com/super-admin${subPath}`,
        dotColor: 'var(--panel-accent)'
      };
    },

    getSidebarConfig: ({ state, view, tenant }) => {
      const initial = tenant ? tenant.name.charAt(0).toUpperCase() : 'T';
      const tenantId = tenant ? tenant.id : state.currentTenantId;

      return {
        logoText: initial,
        logoBg: 'var(--panel-accent, var(--color-warning))',
        brandName: tenant ? tenant.name : 'Tenant',
        brandBadge: 'Tenant Super Admin',
        brandTitle: `Go to ${tenant ? tenant.name : 'Tenant'} Landing Page (${Qrew.getTenantDomain(state.currentTenantId)})`,
        picker: null,
        navHtml: `
          <div class="nav-section">
            <a class="nav-item ${view === 'plan-and-entitlement' ? 'active' : ''}" href="#tenant-super-admin/plan-and-entitlement?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('layers')}</span>
              <span class="nav-label">Plan and Entitlement</span>
            </a>
            <a class="nav-item ${view === 'qrew-profile' ? 'active' : ''}" href="#tenant-super-admin/qrew-profile?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Qrew Profile</span>
            </a>
            <a class="nav-item ${view === 'setting' || view === 'settings' ? 'active' : ''}" href="#tenant-super-admin/setting?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
              <span class="nav-label">Setting</span>
            </a>
            <a class="nav-item ${view === 'domain-config' ? 'active' : ''}" href="#tenant-super-admin/domain-config?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('globe')}</span>
              <span class="nav-label">Domain Config</span>
            </a>
            <a class="nav-item ${view === 'company-profile' ? 'active' : ''}" href="#tenant-super-admin/company-profile?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('building')}</span>
              <span class="nav-label">Company Profile</span>
            </a>
          </div>
        `,
        footerHtml: `
          <a class="footer-action-link" href="#tenant/overview?id=${tenantId}" title="Back to Tenant Workspace" data-tooltip="Tenant Workspace">
            <span class="footer-action-icon">${QrewUI.getIcon('chevronLeft')}</span>
            <span class="footer-action-label">&larr; Tenant Workspace</span>
          </a>
        `
      };
    },

    render: (view) => {
      const title = PAGE_TITLES[view] || 'Plan and Entitlement';
      return Qrew.renderBlankTitledPage(title);
    }
  });
})();
