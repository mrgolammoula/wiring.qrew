/**
 * Interface: Super Admin (App.Qrew.com/Admin)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.registerInterface({
    id: 'super-admin',
    brandHome: 'platform',

    getDomainBadge: ({ view }) => {
      const subPath = view ? `/${view}` : '/overview';
      return {
        text: `app.qrew.com/super-admin${subPath}`,
        dotColor: 'var(--panel-accent)'
      };
    },

    getSidebarConfig: ({ view }) => ({
      logoImg: 'assets/logo.png',
      logoText: 'Q',
      logoBg: 'transparent',
      brandName: 'Qrew',
      brandBadge: 'Super Admin',
      brandTitle: 'Go to Platform Landing Page (qrew.com)',
      picker: null,
      navHtml: `
        <div class="nav-section">
          <a class="nav-item ${view === 'overview' ? 'active' : ''}" href="#super-admin/overview">
            <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
            <span class="nav-label">Overview</span>
          </a>

          <div class="nav-divider"></div>

          <a class="nav-item ${view === 'permission-catalog' ? 'active' : ''}" href="#super-admin/permission-catalog">
            <span class="nav-icon">${QrewUI.getIcon('shield')}</span>
            <span class="nav-label">Permission Catalog</span>
          </a>
          <a class="nav-item ${view === 'platform-settings' || view === 'platform-setting' ? 'active' : ''}" href="#super-admin/platform-settings">
            <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
            <span class="nav-label">Platform settings</span>
          </a>
        </div>
      `,
      footerHtml: `
        <a class="footer-action-link" href="#platform/overview" title="Back to Platform Admin" data-tooltip="Platform Admin">
          <span class="footer-action-icon">${QrewUI.getIcon('chevronLeft')}</span>
          <span class="footer-action-label">&larr; Platform Admin</span>
        </a>
      `
    }),

    render: (view) => {
      if (view === 'overview') {
        return Qrew.renderBlankTitledPage('Overview');
      }
      if (view === 'platform-settings' || view === 'platform-setting') {
        return Qrew.renderBlankTitledPage('Platform Settings');
      }
      return Qrew.renderBlankTitledPage('Permission Catalog');
    }
  });
})();
