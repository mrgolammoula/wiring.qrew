/**
 * Qrew Core — Namespace, Shared State, Domain Helpers, Interface Registry
 */
(() => {
  const PANEL_THEMES = {
    'platform': {
      name: 'Platform Admin Panel',
      primaryAccent: '#2563EB',
      lightAccent: '#EFF6FF',
      hoverAccent: '#DBEAFE',
      darkLightAccent: 'rgba(37, 99, 235, 0.2)',
      darkHoverAccent: 'rgba(37, 99, 235, 0.32)'
    },
    'super-admin': {
      name: 'Super Admin',
      primaryAccent: '#2563EB',
      lightAccent: '#EFF6FF',
      hoverAccent: '#DBEAFE',
      darkLightAccent: 'rgba(37, 99, 235, 0.2)',
      darkHoverAccent: 'rgba(37, 99, 235, 0.32)'
    },
    'tenant': {
      name: 'Tenant Workspace',
      primaryAccent: '#7C3AED',
      lightAccent: '#F5F3FF',
      hoverAccent: '#EDE9FE',
      darkLightAccent: 'rgba(124, 58, 237, 0.2)',
      darkHoverAccent: 'rgba(124, 58, 237, 0.32)'
    },
    'office': {
      name: 'Office Workspace',
      primaryAccent: '#0D9488',
      lightAccent: '#F0FDFA',
      hoverAccent: '#CCFBF1',
      darkLightAccent: 'rgba(13, 148, 136, 0.2)',
      darkHoverAccent: 'rgba(13, 148, 136, 0.32)'
    },
    'office-admin': {
      name: 'Office Admin Panel',
      primaryAccent: '#F97316',
      lightAccent: '#FFF7ED',
      hoverAccent: '#FFEDD5',
      darkLightAccent: 'rgba(249, 115, 22, 0.2)',
      darkHoverAccent: 'rgba(249, 115, 22, 0.32)'
    },
    'office-config': {
      name: 'Office Config',
      primaryAccent: '#F97316',
      lightAccent: '#FFF7ED',
      hoverAccent: '#FFEDD5',
      darkLightAccent: 'rgba(249, 115, 22, 0.2)',
      darkHoverAccent: 'rgba(249, 115, 22, 0.32)'
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

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const light = isDark ? (theme.darkLightAccent || 'rgba(37, 99, 235, 0.2)') : theme.lightAccent;
      const hover = isDark ? (theme.darkHoverAccent || 'rgba(37, 99, 235, 0.32)') : theme.hoverAccent;

      if (document.documentElement && document.documentElement.style && document.documentElement.style.setProperty) {
        document.documentElement.style.setProperty('--panel-accent', theme.primaryAccent);
        document.documentElement.style.setProperty('--panel-accent-light', light);
        document.documentElement.style.setProperty('--panel-accent-hover', hover);
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
