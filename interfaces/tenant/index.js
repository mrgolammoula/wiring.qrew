/**
 * Interface: Tenant Workspace (App.<Tenant>.com)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.views.tenant.renderNotFound = (tenantId) => {
    Qrew.dom.mainContent.innerHTML = `
      <div class="card" style="padding:32px;">
        ${QrewUI.emptyState({
          title: 'Tenant Organization Not Found',
          description: `The tenant "${tenantId}" does not exist in the database.`,
          actionHtml: `<a href="#platform/tenants" class="btn btn-primary">Return to Tenants Directory</a>`
        })}
      </div>
    `;
  };

  Qrew.registerInterface({
    id: 'tenant',
    brandHome: 'tenant',

    getDomainBadge: ({ tenant }) => {
      const tenantName = (tenant && tenant.name) ? tenant.name.toLowerCase() : 'sst';
      return {
        text: `app.${tenantName}.com`,
        dotColor: 'var(--panel-accent)'
      };
    },

    getSidebarConfig: ({ state, view, tenant }) => {
      const initial = tenant ? tenant.name.charAt(0).toUpperCase() : 'T';
      const tenantId = tenant ? tenant.id : state.currentTenantId;
      const allTenants = QrewStore.getTenants();

      return {
        logoText: initial,
        logoBg: 'var(--panel-accent, var(--color-warning))',
        brandName: tenant ? tenant.name : 'Tenant',
        brandBadge: 'Tenant Workspace',
        brandTitle: `Go to ${tenant ? tenant.name : 'Tenant'} Landing Page (${Qrew.getTenantDomain(state.currentTenantId)})`,
        picker: {
          label: 'Active Organization',
          optionsHtml: allTenants.map(t => `
            <option value="${t.id}" ${tenant && t.id === tenant.id ? 'selected' : ''}>${QrewUI.escapeHtml(t.name)}</option>
          `).join(''),
          onChange: (e) => {
            Qrew.state.currentTenantId = e.target.value;
            const offices = QrewStore.getOfficesByTenant(Qrew.state.currentTenantId);
            if (offices.length > 0) Qrew.state.currentOfficeId = offices[0].id;
            Qrew.navigateTo(`#tenant/${Qrew.state.currentView}?id=${Qrew.state.currentTenantId}`);
          }
        },
        navHtml: `
          <div class="nav-section">
            <div class="nav-section-title">Tenant Workspace</div>
            <a class="nav-item ${view === 'overview' ? 'active' : ''}" href="#tenant/overview?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
              <span class="nav-label">Overview</span>
            </a>
            <a class="nav-item ${view === 'offices' ? 'active' : ''}" href="#tenant/offices?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('offices')}</span>
              <span class="nav-label">Offices</span>
            </a>
            <a class="nav-item ${view === 'members' ? 'active' : ''}" href="#tenant/members?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Members</span>
            </a>
            <a class="nav-item ${view === 'roles' ? 'active' : ''}" href="#tenant/roles?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('roles')}</span>
              <span class="nav-label">Tenant Roles</span>
            </a>
            <a class="nav-item ${view === 'settings' ? 'active' : ''}" href="#tenant/settings?id=${tenantId}">
              <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
              <span class="nav-label">Settings</span>
            </a>
          </div>
          <div class="nav-section" style="margin-top:16px;">
            <div class="nav-section-title">Platform</div>
            <a class="nav-item" href="#landing" style="color:var(--panel-accent, var(--color-accent));font-weight:600;">
              <span class="nav-icon">${QrewUI.getIcon('chevronLeft')}</span>
              <span class="nav-label">&larr; Qrew Landing Page</span>
            </a>
          </div>
        `
      };
    },

    render: (view, ctx) => {
      const tenantId = ctx.params.id || ctx.state.currentTenantId;
      switch (view) {
        case 'overview':
          return Qrew.views.tenant.renderOverview(tenantId);
        case 'offices':
          return Qrew.views.tenant.renderOffices(tenantId);
        case 'members':
          return Qrew.views.tenant.renderMembers(tenantId);
        case 'roles':
          return Qrew.views.tenant.renderRoles(tenantId);
        case 'settings':
          return Qrew.views.tenant.renderSettings(tenantId);
        default:
          return Qrew.views.tenant.renderOverview(tenantId);
      }
    }
  });
})();
