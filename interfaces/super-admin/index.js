/**
 * Interface: Super Admin (App.Qrew.com/Admin)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.registerInterface({
    id: 'super-admin',
    brandHome: 'platform',

    getDomainBadge: () => ({
      text: 'app.qrew.com/admin',
      dotColor: 'var(--panel-accent)'
    }),

    getSidebarConfig: ({ view }) => ({
      logoText: 'Q',
      logoBg: 'var(--panel-accent, var(--color-accent))',
      brandName: 'Qrew',
      brandBadge: 'Super Admin',
      brandTitle: 'Go to Platform Landing Page (qrew.com)',
      picker: null,
      navHtml: `
        <div class="nav-section">
          <div class="nav-section-title">Super Admin</div>
          <a class="nav-item ${view === 'permission-catalog' ? 'active' : ''}" href="#super-admin/permission-catalog">
            <span class="nav-icon">${QrewUI.getIcon('shield')}</span>
            <span class="nav-label">Permission Catalog</span>
          </a>
          <a class="nav-item ${view === 'platform-settings' || view === 'platform-setting' ? 'active' : ''}" href="#super-admin/platform-settings">
            <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
            <span class="nav-label">Platform Setting</span>
          </a>
        </div>
        <div class="nav-section" style="margin-top:16px;">
          <a class="nav-item" href="#platform/overview" style="color:var(--color-accent);font-weight:600;">
            <span class="nav-icon">${QrewUI.getIcon('chevronLeft')}</span>
            <span class="nav-label">&larr; Platform Admin</span>
          </a>
        </div>
      `
    }),

    render: (view) => {
      if (view === 'platform-settings' || view === 'platform-setting') {
        return Qrew.renderBlankTitledPage('Platform Setting');
      }
      return Qrew.renderBlankTitledPage('Permission Catalog');
    }
  });
})();
