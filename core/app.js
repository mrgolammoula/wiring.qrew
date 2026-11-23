/**
 * Qrew Core — Namespace, Shared State, Domain Helpers, Interface Registry
 */
(() => {
  const PANEL_THEMES = {
    'platform': {
      name: 'Platform Admin Panel',
      primaryAccent: '#2563EB',
      darkAccent: '#60A5FA',
      lightAccent: '#EFF6FF',
      hoverAccent: '#DBEAFE',
      darkLightAccent: 'rgba(96, 165, 250, 0.18)',
      darkHoverAccent: 'rgba(96, 165, 250, 0.30)'
    },
    'super-admin': {
      name: 'Super Admin',
      primaryAccent: '#2563EB',
      darkAccent: '#60A5FA',
      lightAccent: '#EFF6FF',
      hoverAccent: '#DBEAFE',
      darkLightAccent: 'rgba(96, 165, 250, 0.18)',
      darkHoverAccent: 'rgba(96, 165, 250, 0.30)'
    },
    'tenant': {
      name: 'Tenant Workspace',
      primaryAccent: '#7C3AED',
      darkAccent: '#A78BFA',
      lightAccent: '#F5F3FF',
      hoverAccent: '#EDE9FE',
      darkLightAccent: 'rgba(167, 139, 250, 0.18)',
      darkHoverAccent: 'rgba(167, 139, 250, 0.30)'
    },
    'office': {
      name: 'Office Workspace',
      primaryAccent: '#0F766E',
      darkAccent: '#2DD4BF',
      lightAccent: '#F0FDFA',
      hoverAccent: '#CCFBF1',
      darkLightAccent: 'rgba(45, 212, 191, 0.18)',
      darkHoverAccent: 'rgba(45, 212, 191, 0.30)'
    },
    'office-admin': {
      name: 'Office Admin Panel',
      primaryAccent: '#EA580C',
      darkAccent: '#FB923C',
      lightAccent: '#FFF7ED',
      hoverAccent: '#FFEDD5',
      darkLightAccent: 'rgba(251, 146, 60, 0.18)',
      darkHoverAccent: 'rgba(251, 146, 60, 0.30)'
    },
    'office-config': {
      name: 'Office Config',
      primaryAccent: '#EA580C',
      darkAccent: '#FB923C',
      lightAccent: '#FFF7ED',
      hoverAccent: '#FFEDD5',
      darkLightAccent: 'rgba(251, 146, 60, 0.18)',
      darkHoverAccent: 'rgba(251, 146, 60, 0.30)'
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

    hexToRgb(hex) {
      if (!hex || typeof hex !== 'string') return '37, 99, 235';
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      if (isNaN(num)) return '37, 99, 235';
      const r = (num >> 16) & 255;
      const g = (num >> 8) & 255;
      const b = num & 255;
      return `${r}, ${g}, ${b}`;
    },

    getAccentHover(hex, isDark) {
      const ACCENT_HOVER_MAP = {
        '#2563EB': { light: '#1D4ED8', dark: '#3B82F6' },
        '#60A5FA': { light: '#2563EB', dark: '#93C5FD' },
        '#7C3AED': { light: '#6D28D9', dark: '#8B5CF6' },
        '#A78BFA': { light: '#7C3AED', dark: '#C4B5FD' },
        '#0F766E': { light: '#115E59', dark: '#14B8A6' },
        '#0D9488': { light: '#0F766E', dark: '#14B8A6' },
        '#2DD4BF': { light: '#0F766E', dark: '#5EEAD4' },
        '#EA580C': { light: '#C2410C', dark: '#FB923C' },
        '#F97316': { light: '#EA580C', dark: '#FB923C' },
        '#FB923C': { light: '#EA580C', dark: '#FDBA74' },
        '#059669': { light: '#047857', dark: '#10B981' }
      };
      if (!hex || typeof hex !== 'string') return isDark ? '#3B82F6' : '#1D4ED8';
      const upper = hex.toUpperCase();
      for (const [key, val] of Object.entries(ACCENT_HOVER_MAP)) {
        if (key.toUpperCase() === upper) {
          return isDark ? val.dark : val.light;
        }
      }
      let c = hex.replace('#', '');
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      let num = parseInt(c, 16);
      if (isNaN(num)) return isDark ? '#3B82F6' : '#1D4ED8';
      let factor = isDark ? 28 : -28;
      let r = Math.min(255, Math.max(0, ((num >> 16) & 255) + factor));
      let g = Math.min(255, Math.max(0, ((num >> 8) & 255) + factor));
      let b = Math.min(255, Math.max(0, (num & 255) + factor));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    },

    applyPanelTheme(workspace) {
      const theme = PANEL_THEMES[workspace] || PANEL_THEMES['platform'];
      document.body.setAttribute('data-workspace', workspace);
      document.body.classList.remove('ws-platform', 'ws-super-admin', 'ws-tenant', 'ws-office', 'ws-office-admin', 'ws-office-config');
      document.body.classList.add(`ws-${workspace}`);

      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      const secondaryCustom = localStorage.getItem('qrew_ui_secondary') || localStorage.getItem('qrew_ui_accent');

      if (document.documentElement && document.documentElement.style && document.documentElement.style.setProperty) {
        if (secondaryCustom && secondaryCustom !== 'default') {
          const rgb = this.hexToRgb(secondaryCustom);
          const lightTint = isDark ? `rgba(${rgb}, 0.2)` : `rgba(${rgb}, 0.12)`;
          const hoverTint = isDark ? `rgba(${rgb}, 0.32)` : `rgba(${rgb}, 0.2)`;
          const accentHover = this.getAccentHover(secondaryCustom, isDark);

          document.documentElement.style.setProperty('--color-secondary', secondaryCustom);
          document.documentElement.style.setProperty('--panel-accent', secondaryCustom);
          document.documentElement.style.setProperty('--panel-accent-light', lightTint);
          document.documentElement.style.setProperty('--panel-accent-hover', hoverTint);
          document.documentElement.style.setProperty('--color-accent', secondaryCustom);
          document.documentElement.style.setProperty('--color-accent-hover', accentHover);
        } else {
          const effectiveAccent = isDark ? (theme.darkAccent || theme.primaryAccent) : theme.primaryAccent;
          const light = isDark ? (theme.darkLightAccent || 'rgba(96, 165, 250, 0.18)') : theme.lightAccent;
          const hover = isDark ? (theme.darkHoverAccent || 'rgba(96, 165, 250, 0.30)') : theme.hoverAccent;
          const accentHover = this.getAccentHover(effectiveAccent, isDark);

          document.documentElement.style.removeProperty('--color-secondary');
          document.documentElement.style.setProperty('--panel-accent', effectiveAccent);
          document.documentElement.style.setProperty('--panel-accent-light', light);
          document.documentElement.style.setProperty('--panel-accent-hover', hover);
          document.documentElement.style.setProperty('--color-accent', effectiveAccent);
          document.documentElement.style.setProperty('--color-accent-hover', accentHover);
        }
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
