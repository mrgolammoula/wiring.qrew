/**
 * Interface: Platform Admin (App.Qrew.com/Admin)
 */
(() => {
  const Qrew = window.Qrew;

  const renderPlatformOverview = () => {
    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom: 24px;">
        <div class="page-title-group">
          <h1 class="page-title" style="font-size: 24px; font-weight: 700; color: var(--color-text-primary); margin: 0;">Platform Dashboard</h1>
        </div>
      </div>
    `;
  };

  const PLACEHOLDER_TITLES = {
    'platform-access': 'Platform Access',
    'permission-access': 'Permission Access',
    'template-defaults': 'Template & Defaults',
    'templates-defaults': 'Template & Defaults',
    'plans-entitlements': 'Plans and Entitlements',
    'usage-analytics': 'Usage & Analytics',
    'audit-log': 'Audit log',
    'audit-logs': 'Audit log',
    'support-access': 'Support Access',
    'system-health': 'System Health and Incidents',
    'platform-settings': 'Platform settings'
  };

  Qrew.registerInterface({
    id: 'platform',
    brandHome: 'platform',

    getDomainBadge: () => ({
      text: 'app.qrew.com/admin',
      dotColor: 'var(--panel-accent)'
    }),

    getSidebarConfig: ({ view }) => ({
      logoText: 'Q',
      logoBg: 'var(--panel-accent, var(--color-accent))',
      brandName: 'Qrew',
      brandBadge: 'Platform Admin',
      brandTitle: 'Go to Platform Landing Page (qrew.com)',
      picker: null,
      navHtml: `
        <div class="nav-section">
          <div class="nav-section-title">Platform Admin</div>
          <a class="nav-item ${view === 'overview' ? 'active' : ''}" href="#platform/overview">
            <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
            <span class="nav-label">Overview</span>
          </a>
          <a class="nav-item ${view === 'tenants' ? 'active' : ''}" href="#platform/tenants">
            <span class="nav-icon">${QrewUI.getIcon('tenants')}</span>
            <span class="nav-label">Tenants</span>
          </a>
          <a class="nav-item ${view === 'platform-access' ? 'active' : ''}" href="#platform/platform-access">
            <span class="nav-icon">${QrewUI.getIcon('users')}</span>
            <span class="nav-label">Platform Access</span>
          </a>
          <a class="nav-item ${view === 'permission-access' ? 'active' : ''}" href="#platform/permission-access">
            <span class="nav-icon">${QrewUI.getIcon('shield')}</span>
            <span class="nav-label">Permission Access</span>
          </a>
          <a class="nav-item ${view === 'template-defaults' ? 'active' : ''}" href="#platform/template-defaults">
            <span class="nav-icon">${QrewUI.getIcon('layers')}</span>
            <span class="nav-label">Template & Defaults</span>
          </a>
          <a class="nav-item ${view === 'plans-entitlements' ? 'active' : ''}" href="#platform/plans-entitlements">
            <span class="nav-icon">${QrewUI.getIcon('dollar')}</span>
            <span class="nav-label">Plans and Entitlements</span>
          </a>
          <a class="nav-item ${view === 'usage-analytics' ? 'active' : ''}" href="#platform/usage-analytics">
            <span class="nav-icon">${QrewUI.getIcon('activity')}</span>
            <span class="nav-label">Usage & Analytics</span>
          </a>
          <a class="nav-item ${view === 'audit-log' || view === 'audit-logs' ? 'active' : ''}" href="#platform/audit-log">
            <span class="nav-icon">${QrewUI.getIcon('audit')}</span>
            <span class="nav-label">Audit log</span>
          </a>
          <a class="nav-item ${view === 'support-access' ? 'active' : ''}" href="#platform/support-access">
            <span class="nav-icon">${QrewUI.getIcon('users')}</span>
            <span class="nav-label">Support Access</span>
          </a>
          <a class="nav-item ${view === 'system-health' ? 'active' : ''}" href="#platform/system-health">
            <span class="nav-icon">${QrewUI.getIcon('activity')}</span>
            <span class="nav-label">System Health and Incidents</span>
          </a>
          <a class="nav-item ${view === 'platform-settings' ? 'active' : ''}" href="#platform/platform-settings">
            <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
            <span class="nav-label">Platform settings</span>
          </a>
        </div>
        <div class="nav-section" style="margin-top:16px;">
          <div class="nav-section-title">Super Administration</div>
          <a class="nav-item" href="#super-admin/permission-catalog" style="color:var(--color-accent);font-weight:600;">
            <span class="nav-icon">${QrewUI.getIcon('shield')}</span>
            <span class="nav-label">Super Admin &rarr;</span>
          </a>
        </div>
      `
    }),

    render: (view) => {
      if (view === 'overview') return renderPlatformOverview();
      if (view === 'tenants') return Qrew.views.platform.renderTenants();
      if (PLACEHOLDER_TITLES[view]) return Qrew.renderBlankTitledPage(PLACEHOLDER_TITLES[view]);
      return renderPlatformOverview();
    }
  });
})();
