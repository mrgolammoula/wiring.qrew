/**
 * Qrew Core — Namespace, Shared State, Domain Helpers, Interface Registry
 */
(() => {
  const PANEL_THEMES = {
    'platform': {
      name: 'Platform Admin Panel',
      primaryAccent: '#9E5334',
      lightAccent: '#F5EAE4',
      hoverAccent: '#EBD8CD'
    },
    'super-admin': {
      name: 'Super Admin',
      primaryAccent: '#713B2B',
      lightAccent: '#F2E7E1',
      hoverAccent: '#E3CEBF'
    },
    'tenant': {
      name: 'Tenant Workspace',
      primaryAccent: '#B77942',
      lightAccent: '#F8EFE3',
      hoverAccent: '#EEDCC8'
    },
    'office': {
      name: 'Office Workspace',
      primaryAccent: '#65734B',
      lightAccent: '#EEF0E5',
      hoverAccent: '#D8DDC7'
    },
    'office-admin': {
      name: 'Office Admin Panel',
      primaryAccent: '#A34F43',
      lightAccent: '#F6E9E6',
      hoverAccent: '#EBCBCA'
    },
    'office-config': {
      name: 'Office Config',
      primaryAccent: '#78618A',
      lightAccent: '#F0EBF4',
      hoverAccent: '#DFD3EB'
    }
  };

  const Qrew = {
    state: {
      activeWorkspace: 'platform',
      currentRoute: 'platform/overview',
      currentView: 'overview',
      routeParams: {},
      sidebarCollapsed: false,
      selectedRoleLevel: 'platform',
      selectedRoleId: 'role_plt_owner',
      currentTenantId: 'ten_sst',
      currentOfficeId: 'off_ctg_port',
      currentDeptId: 'dept_ctg_ops',
      currentMemberId: 'usr_nusrat'
    },

    dom: {},
    interfaces: {},
    views: {
      platform: {},
      tenant: {}
    },
    actions: {},
    shell: {},
    wireframe: {},

    initDom() {
      this.dom = {
        mainContent: document.getElementById('main-content'),
        sidebar: document.getElementById('sidebar'),
        sidebarHeader: document.getElementById('sidebar-header'),
        sidebarBrandLogo: document.getElementById('sidebar-brand-logo'),
        sidebarBrandName: document.getElementById('sidebar-brand-name'),
        sidebarBrandBadge: document.getElementById('sidebar-brand-badge'),
        sidebarContextPicker: document.getElementById('sidebar-context-picker'),
        sidebarContextLabel: document.getElementById('sidebar-context-label'),
        sidebarContextSelect: document.getElementById('sidebar-context-select'),
        sidebarNav: document.getElementById('sidebar-nav'),
        sidebarFooter: document.getElementById('sidebar-footer') || document.querySelector('.sidebar-footer'),
        sidebarResizer: document.getElementById('sidebar-resizer'),
        sidebarToggle: document.getElementById('sidebar-toggle-btn'),
        mobileMenuBtn: document.getElementById('mobile-menu-btn'),
        userDropdownTrigger: document.getElementById('user-profile-trigger'),
        userDropdownMenu: document.getElementById('user-dropdown-menu'),
        notificationsTrigger: document.getElementById('notifications-trigger'),
        notificationsPopover: document.getElementById('notifications-popover')
      };
    },

    registerInterface(def) {
      if (def && def.id) {
        this.interfaces[def.id] = def;
      }
    },

    getTenantDomain(tenantId) {
      const targetId = (!tenantId || tenantId === 'ten_ctg') ? (this.state.currentTenantId || 'ten_sst') : tenantId;
      const tenant = (typeof QrewStore !== 'undefined' && QrewStore.getTenantById)
        ? (QrewStore.getTenantById(targetId) || QrewStore.getTenants()[0])
        : null;
      if (tenant && tenant.domain) return tenant.domain;
      return 'sst.com';
    },

    getOfficeDomain(office) {
      const isMongla = office && (office.id === 'off_mgl_port' || (office.name && office.name.toLowerCase().includes('mongla')));
      return isMongla ? 'sst.mgl.com' : 'sst.ctg.com';
    },

    applyPanelTheme(workspace) {
      const theme = PANEL_THEMES[workspace] || PANEL_THEMES['platform'];
      document.body.setAttribute('data-workspace', workspace);
      document.body.classList.remove('ws-platform', 'ws-super-admin', 'ws-tenant', 'ws-office', 'ws-office-admin', 'ws-office-config');
      document.body.classList.add(`ws-${workspace}`);

      if (document.documentElement && document.documentElement.style && document.documentElement.style.setProperty) {
        document.documentElement.style.setProperty('--panel-accent', theme.primaryAccent);
        document.documentElement.style.setProperty('--panel-accent-light', theme.lightAccent);
        document.documentElement.style.setProperty('--panel-accent-hover', theme.hoverAccent);
      }
    },

    renderBlankTitledPage(title) {
      if (!this.dom.mainContent) return;
      this.dom.mainContent.innerHTML = `
        <div class="page-header" style="margin-bottom: 24px;">
          <div class="page-title-group">
            <h1 class="page-title" style="font-size: 24px; font-weight: 700; color: var(--color-text-primary); margin: 0;">${QrewUI.escapeHtml(title)}</h1>
          </div>
        </div>
      `;
    }
  };

  window.Qrew = Qrew;
})();
