/**
 * Qrew Core — Application Shell (Sidebar, Topbar, User Profile, Global Events, Boot)
 */
(() => {
  const Qrew = window.Qrew;

  Qrew.shell.renderSidebar = () => {
    const DOM = Qrew.dom;
    const ctx = Qrew.buildContext();
    const iface = Qrew.interfaces[Qrew.state.activeWorkspace] || Qrew.interfaces.platform;
    if (!iface || !iface.getSidebarConfig) return;

    const cfg = iface.getSidebarConfig(ctx);
    const brandWrapperEl = document.getElementById('brand-wrapper');

    if (DOM.sidebarBrandLogo) {
      DOM.sidebarBrandLogo.textContent = cfg.logoText || 'Q';
      DOM.sidebarBrandLogo.style.backgroundColor = cfg.logoBg || 'var(--panel-accent, var(--color-accent))';
    }
    if (DOM.sidebarBrandName) DOM.sidebarBrandName.textContent = cfg.brandName || 'Qrew';
    if (DOM.sidebarBrandBadge) DOM.sidebarBrandBadge.textContent = cfg.brandBadge || '';
    if (brandWrapperEl && cfg.brandTitle) brandWrapperEl.title = cfg.brandTitle;

    if (DOM.sidebarContextPicker) {
      if (cfg.picker) {
        DOM.sidebarContextPicker.style.display = 'flex';
        if (DOM.sidebarContextLabel) DOM.sidebarContextLabel.textContent = cfg.picker.label || '';
        if (DOM.sidebarContextSelect) {
          DOM.sidebarContextSelect.innerHTML = cfg.picker.optionsHtml || '';
          DOM.sidebarContextSelect.onchange = cfg.picker.onChange || null;
        }
      } else {
        DOM.sidebarContextPicker.style.display = 'none';
        if (DOM.sidebarContextSelect) DOM.sidebarContextSelect.onchange = null;
      }
    }

    if (DOM.sidebarNav) {
      DOM.sidebarNav.innerHTML = cfg.navHtml || '';
      // Equip every navigation item with tooltips & accessibility labels (used by collapsed sidebar)
      DOM.sidebarNav.querySelectorAll('.nav-item').forEach(item => {
        const labelEl = item.querySelector('.nav-label');
        if (labelEl) {
          const text = labelEl.textContent.trim().replace(/^[←→\s]+|[←→\s]+$/g, '');
          item.setAttribute('title', text);
          item.setAttribute('data-tooltip', text);
          item.setAttribute('aria-label', text);
        }
      });
    }
  };

  Qrew.shell.updateTopbarDomainBadge = () => {
    const domainTextEl = document.getElementById('topbar-domain-text');
    const domainDotEl = document.querySelector('.topbar-domain-dot');
    if (!domainTextEl) return;

    const ctx = Qrew.buildContext();
    const iface = Qrew.interfaces[Qrew.state.activeWorkspace] || Qrew.interfaces.platform;
    const badge = (iface && iface.getDomainBadge)
      ? iface.getDomainBadge(ctx)
      : { text: 'app.qrew.com/admin', dotColor: 'var(--panel-accent)' };

    domainTextEl.textContent = badge.text;
    if (domainDotEl) domainDotEl.style.backgroundColor = badge.dotColor || 'var(--panel-accent)';
  };

  Qrew.shell.getPanelUserInfo = () => {
    const ws = Qrew.state.activeWorkspace;
    const tenant = (typeof QrewStore !== 'undefined' && QrewStore.getTenantById)
      ? (QrewStore.getTenantById(Qrew.state.currentTenantId) || QrewStore.getTenants()[0])
      : null;

    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
    } catch (e) {}

    let defaultInfo;
    if (ws === 'platform') {
      defaultInfo = {
        name: 'Sakib',
        role: 'Platform Admin',
        email: 'sakib@qrew.io',
        avatar: 'S',
        avatarBg: 'var(--panel-accent)'
      };
    } else if (ws === 'super-admin') {
      defaultInfo = {
        name: 'Sakib',
        role: 'Super Admin',
        email: 'sakib@qrew.io',
        avatar: 'S',
        avatarBg: 'var(--panel-accent)'
      };
    } else if (ws === 'tenant') {
      const ownerName = (tenant && tenant.ownerName) ? tenant.ownerName : 'Rafiqul Islam';
      const ownerEmail = (tenant && tenant.ownerEmail) ? tenant.ownerEmail : 'rafiq@sst.com';
      defaultInfo = {
        name: ownerName,
        role: 'Tenant Admin',
        email: ownerEmail,
        avatar: ownerName.charAt(0).toUpperCase(),
        avatarBg: 'var(--panel-accent)'
      };
    } else if (ws === 'office-admin') {
      defaultInfo = {
        name: 'Jack Rahman',
        role: 'Office Admin',
        email: 'jack@sst.com',
        avatar: 'J',
        avatarBg: 'var(--panel-accent)'
      };
    } else if (ws === 'office') {
      defaultInfo = {
        name: 'Jack Rahman',
        role: 'Office Manager',
        email: 'jack@sst.com',
        avatar: 'J',
        avatarBg: 'var(--panel-accent)'
      };
    } else if (ws === 'office-config') {
      defaultInfo = {
        name: 'Jack Rahman',
        role: 'Office Admin',
        email: 'jack@sst.com',
        avatar: 'J',
        avatarBg: 'var(--panel-accent)'
      };
    } else if (ws === 'department') {
      const dept = (typeof QrewStore !== 'undefined' && QrewStore.getDepartmentById)
        ? QrewStore.getDepartmentById(Qrew.state.currentDeptId)
        : null;
      const leadName = dept ? (dept.leadName || 'Jack Rahman') : 'Jack Rahman';
      defaultInfo = {
        name: leadName,
        role: 'Department Lead',
        email: 'lead@sst.com',
        avatar: leadName.charAt(0).toUpperCase(),
        avatarBg: 'var(--color-accent)'
      };
    } else if (ws === 'member') {
      const member = (typeof QrewStore !== 'undefined' && QrewStore.getUserById)
        ? QrewStore.getUserById(Qrew.state.currentMemberId)
        : null;
      const memName = (member && member.name) ? member.name : 'Nusrat Jahan';
      const memEmail = (member && member.email) ? member.email : 'nusrat@sst.com';
      defaultInfo = {
        name: memName,
        role: 'Office Staff',
        email: memEmail,
        avatar: memName.charAt(0).toUpperCase(),
        avatarBg: 'var(--color-text-muted)'
      };
    } else {
      defaultInfo = {
        name: 'Sakib',
        role: 'Platform Admin',
        email: 'sakib@qrew.io',
        avatar: 'S',
        avatarBg: 'var(--color-dark)'
      };
    }

    if (overrides && overrides[ws]) {
      return { ...defaultInfo, ...overrides[ws] };
    }
    return defaultInfo;
  };

  Qrew.shell.syncHeaderUserProfile = () => {
    const user = Qrew.shell.getPanelUserInfo();
    const avatarEl = document.getElementById('topbar-user-avatar');
    const nameEl = document.getElementById('topbar-user-name');
    const roleEl = document.getElementById('topbar-user-role');
    const titleEl = document.getElementById('dropdown-user-title');
    const emailEl = document.getElementById('dropdown-user-email');
    const dropdownRoleEl = document.getElementById('dropdown-user-role');

    if (avatarEl) {
      avatarEl.textContent = user.avatar || user.name.charAt(0).toUpperCase();
      avatarEl.style.backgroundColor = user.avatarBg || 'var(--color-dark)';
    }
    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.role;
    if (titleEl) titleEl.textContent = user.name;
    if (emailEl) emailEl.textContent = user.email;
    if (dropdownRoleEl) dropdownRoleEl.textContent = user.role;
  };

  const openEditProfileModal = () => {
    if (Qrew.dom.userDropdownMenu) {
      Qrew.dom.userDropdownMenu.classList.remove('show');
    }
    const user = Qrew.shell.getPanelUserInfo();

    QrewUI.openModal({
      title: 'Edit Profile Settings',
      bodyHtml: `
        <div style="display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:1px solid var(--color-border-subtle);">
          <div class="user-avatar" style="width:48px;height:48px;font-size:18px;font-weight:700;background-color:${user.avatarBg || 'var(--color-dark)'};">
            ${QrewUI.escapeHtml(user.avatar || user.name.charAt(0).toUpperCase())}
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:600;color:var(--color-text-primary);margin:0;">${QrewUI.escapeHtml(user.name)}</h3>
            <div style="margin-top:4px;"><span class="badge" style="background:var(--color-surface);color:var(--color-accent);border:1px solid var(--color-border);font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;">${QrewUI.escapeHtml(user.role)}</span></div>
          </div>
        </div>

        <form id="edit-profile-form" style="display:flex;flex-direction:column;gap:14px;margin-top:14px;">
          <div class="form-group">
            <label class="form-label">Full Name <span class="required">*</span></label>
            <input type="text" class="form-input" id="profile-edit-name" value="${QrewUI.escapeHtml(user.name)}" required>
          </div>

          <div class="form-group">
            <label class="form-label">Email Address <span class="required">*</span></label>
            <input type="email" class="form-input" id="profile-edit-email" value="${QrewUI.escapeHtml(user.email)}" required>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px;">
            <div class="form-group">
              <label class="form-label">Active Panel Role</label>
              <input type="text" class="form-input" value="${QrewUI.escapeHtml(user.role)}" disabled style="background:var(--color-surface);color:var(--color-text-muted);cursor:not-allowed;">
              <span class="form-hint">Role scoped to active panel</span>
            </div>
            <div class="form-group">
              <label class="form-label">Account Status</label>
              <input type="text" class="form-input" value="Active" disabled style="background:var(--color-surface);color:var(--color-text-muted);cursor:not-allowed;">
              <span class="form-hint">Operational</span>
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-profile">Save Changes</button>
      `,
      onOpen: (modalEl) => {
        const nameInput = modalEl.querySelector('#profile-edit-name');
        nameInput.focus();

        modalEl.querySelector('#btn-save-profile').onclick = () => {
          const name = modalEl.querySelector('#profile-edit-name').value.trim();
          const email = modalEl.querySelector('#profile-edit-email').value.trim();

          if (!name || !email) {
            alert('Please provide your name and email address.');
            return;
          }

          try {
            const ws = Qrew.state.activeWorkspace;
            let overrides = {};
            try {
              overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
            } catch (e) {}
            overrides[ws] = { name, email, avatar: name.charAt(0).toUpperCase() };
            localStorage.setItem('qrew_panel_user_overrides', JSON.stringify(overrides));

            if (ws === 'platform' || ws === 'super-admin') {
              try { QrewStore.updateCurrentUser({ name, email }); } catch (e) {}
            }

            Qrew.shell.syncHeaderUserProfile();
            QrewUI.closeModal();
            QrewUI.showToast('Profile updated successfully!', 'success');
          } catch (err) {
            alert(err.message);
          }
        };
      }
    });
  };

  function useReactSidebarState(initialState) {
    let state = initialState;
    const subscribers = [];

    const getState = () => state;

    const setState = (action) => {
      const nextState = typeof action === 'function' ? action(state) : action;
      if (nextState !== state) {
        state = nextState;
        subscribers.forEach(callback => callback(state));
      }
    };

    const subscribe = (callback) => {
      subscribers.push(callback);
      return () => {
        const idx = subscribers.indexOf(callback);
        if (idx !== -1) subscribers.splice(idx, 1);
      };
    };

    return [getState, setState, subscribe];
  }

  document.addEventListener('DOMContentLoaded', () => {
    Qrew.initDom();
    const DOM = Qrew.dom;

    // Persisted Sidebar Collapse State
    const initialSidebarCollapsed = (() => {
      try {
        return localStorage.getItem('qrew_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    })();

    const [getSidebarCollapsed, setSidebarCollapsed, subscribeSidebar] = useReactSidebarState(initialSidebarCollapsed);

    subscribeSidebar((collapsed) => {
      Qrew.state.sidebarCollapsed = collapsed;
      if (DOM.sidebar) {
        DOM.sidebar.classList.toggle('collapsed', collapsed);
      }
      const label = collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)';
      if (DOM.sidebarToggle) {
        DOM.sidebarToggle.setAttribute('title', label);
        DOM.sidebarToggle.setAttribute('aria-label', label);
        DOM.sidebarToggle.setAttribute('data-tooltip', label);
      }
      try {
        localStorage.setItem('qrew_sidebar_collapsed', String(collapsed));
      } catch (e) {}
    });

    if (initialSidebarCollapsed) {
      Qrew.state.sidebarCollapsed = true;
      if (DOM.sidebar) DOM.sidebar.classList.add('collapsed');
      if (DOM.sidebarToggle) {
        DOM.sidebarToggle.setAttribute('title', 'Expand sidebar (Ctrl+B)');
        DOM.sidebarToggle.setAttribute('aria-label', 'Expand sidebar (Ctrl+B)');
        DOM.sidebarToggle.setAttribute('data-tooltip', 'Expand sidebar (Ctrl+B)');
      }
    }

    const toggleSidebar = () => {
      setSidebarCollapsed(prev => !prev);
    };

    window.useSidebarState = {
      getState: getSidebarCollapsed,
      setState: setSidebarCollapsed,
      toggle: toggleSidebar,
      subscribe: subscribeSidebar
    };

    if (DOM.sidebarToggle) {
      DOM.sidebarToggle.onclick = (e) => {
        e.stopPropagation();
        toggleSidebar();
      };
    }

    // Brand logo click navigation
    const navigateBrandHome = (e) => {
      if (e) e.stopPropagation();
      const iface = Qrew.interfaces[Qrew.state.activeWorkspace];
      if (iface && iface.brandHome === 'platform') {
        Qrew.navigateTo('#landing');
      } else {
        const tenantId = Qrew.state.currentTenantId || (QrewStore.getTenants()[0] ? QrewStore.getTenants()[0].id : 'ten_sst');
        Qrew.navigateTo(`#tenant-landing?id=${tenantId}`);
      }
    };

    const sidebarBrandLogo = document.getElementById('sidebar-brand-logo');
    if (sidebarBrandLogo) {
      sidebarBrandLogo.onclick = navigateBrandHome;
    }

    const brandWrapper = document.getElementById('brand-wrapper');
    if (brandWrapper) {
      brandWrapper.onclick = navigateBrandHome;
    }

    const topbarDomainBadge = document.querySelector('.topbar-domain-badge');
    if (topbarDomainBadge) {
      topbarDomainBadge.title = 'Go to Qrew Landing Page';
      topbarDomainBadge.onclick = () => Qrew.navigateTo('#landing');
    }

    // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar; Escape to close menus
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebar();
      } else if (e.key === 'Escape') {
        if (DOM.userDropdownMenu) DOM.userDropdownMenu.classList.remove('show');
        if (DOM.notificationsPopover) DOM.notificationsPopover.classList.remove('show');
        document.querySelectorAll('.tree-action-menu.show').forEach(m => m.classList.remove('show'));
      }
    });

    // Mobile Menu
    if (DOM.mobileMenuBtn) {
      DOM.mobileMenuBtn.onclick = () => {
        if (DOM.sidebar) DOM.sidebar.classList.toggle('mobile-open');
      };
    }

    // User Profile Dropdown
    if (DOM.userDropdownTrigger) {
      DOM.userDropdownTrigger.onclick = (e) => {
        e.stopPropagation();
        if (DOM.userDropdownMenu) DOM.userDropdownMenu.classList.toggle('show');
        if (DOM.notificationsPopover) DOM.notificationsPopover.classList.remove('show');
      };
    }

    // Notifications Popover
    if (DOM.notificationsTrigger) {
      DOM.notificationsTrigger.onclick = (e) => {
        e.stopPropagation();
        const isShowing = DOM.notificationsPopover && DOM.notificationsPopover.classList.contains('show');
        if (!isShowing) {
          const recentLogs = QrewStore.getAuditLogs().slice(0, 5);
          const listEl = document.getElementById('notifications-list');
          if (listEl) {
            listEl.innerHTML = recentLogs.map(l => `
              <div class="notification-item">
                <div class="notification-desc">
                  <strong>${QrewUI.escapeHtml(l.actor)}</strong>: ${QrewUI.escapeHtml(l.description)}
                </div>
                <div class="notification-time">${l.timestamp}</div>
              </div>
            `).join('');
          }
        }
        if (DOM.notificationsPopover) DOM.notificationsPopover.classList.toggle('show');
        if (DOM.userDropdownMenu) DOM.userDropdownMenu.classList.remove('show');
      };
    }

    // Profile Edit Triggers
    const myProfileBtn = document.getElementById('action-my-profile');
    if (myProfileBtn) myProfileBtn.onclick = openEditProfileModal;

    const dropdownHeaderBtn = document.getElementById('dropdown-header-btn');
    if (dropdownHeaderBtn) dropdownHeaderBtn.onclick = openEditProfileModal;

    // Reset Demo Data
    const resetDemoBtn = document.getElementById('action-reset-data');
    if (resetDemoBtn) {
      resetDemoBtn.onclick = () => {
        if (DOM.userDropdownMenu) DOM.userDropdownMenu.classList.remove('show');
        QrewUI.confirmDialog({
          title: 'Reset Demo Database',
          message: 'This will reset all localStorage state back to the initial sample seed data (SST organization).',
          confirmText: 'Reset to Defaults',
          confirmClass: 'btn-danger',
          onConfirm: () => {
            try { localStorage.removeItem('qrew_panel_user_overrides'); } catch (e) {}
            QrewStore.reset();
            Qrew.shell.syncHeaderUserProfile();
            QrewUI.showToast('Demo data restored to initial state.', 'success');
            Qrew.handleRouteChange();
          }
        });
      };
    }

    // Close dropdowns & tree menus when clicking outside
    document.addEventListener('click', () => {
      if (DOM.userDropdownMenu) DOM.userDropdownMenu.classList.remove('show');
      if (DOM.notificationsPopover) DOM.notificationsPopover.classList.remove('show');
      document.querySelectorAll('.tree-action-menu.show').forEach(m => m.classList.remove('show'));
    });

    // Hash Change Listener & Boot
    window.addEventListener('hashchange', Qrew.handleRouteChange);
    Qrew.shell.syncHeaderUserProfile();
    Qrew.handleRouteChange();
  });
})();
