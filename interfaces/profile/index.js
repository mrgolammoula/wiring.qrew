/**
 * Interface: Account Settings (Profile, Appearance, Security)
 */
(() => {
  const Qrew = window.Qrew;
  Qrew.views = Qrew.views || {};
  Qrew.views.profile = Qrew.views.profile || {};

  let currentAvatarBg = null;

  const renderProfileTab = (user, ctx) => {
    const avatarBg = currentAvatarBg || user.avatarBg || 'var(--panel-accent, #0D9488)';
    return `
      <div class="settings-card-header">
        <h2 class="settings-card-title">Profile Settings</h2>
      </div>
      <div class="settings-card-body">
        <div class="avatar-preview-wrap">
          <div class="avatar-large" id="profile-avatar-preview" style="background-color:${avatarBg};">
            ${QrewUI.escapeHtml(user.avatar || user.name.charAt(0).toUpperCase())}
          </div>
          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--color-text-primary);margin:0;">${QrewUI.escapeHtml(user.name)}</h3>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">
              <span class="badge" style="background:var(--color-surface);color:var(--panel-accent);border:1px solid var(--color-border);font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;">${QrewUI.escapeHtml(user.role)}</span>
              <span style="font-size:12px;color:var(--color-text-muted);">${QrewUI.escapeHtml(user.email)}</span>
            </div>
            <div class="color-swatch-list">
              <span style="font-size:11.5px;color:var(--color-text-muted);margin-right:4px;">Avatar Color:</span>
              <button type="button" class="color-swatch-btn ${avatarBg === '#0D9488' ? 'active' : ''}" data-color="#0D9488" style="background-color:#0D9488;" title="Teal (Brand)"></button>
              <button type="button" class="color-swatch-btn ${avatarBg === '#2563EB' ? 'active' : ''}" data-color="#2563EB" style="background-color:#2563EB;" title="Blue (Platform)"></button>
              <button type="button" class="color-swatch-btn ${avatarBg === '#7C3AED' ? 'active' : ''}" data-color="#7C3AED" style="background-color:#7C3AED;" title="Purple (Tenant)"></button>
              <button type="button" class="color-swatch-btn ${avatarBg === '#F97316' ? 'active' : ''}" data-color="#F97316" style="background-color:#F97316;" title="Orange (Config)"></button>
              <button type="button" class="color-swatch-btn ${avatarBg === '#1E293B' ? 'active' : ''}" data-color="#1E293B" style="background-color:#1E293B;" title="Dark Slate"></button>
            </div>
          </div>
        </div>

        <form id="profile-details-form" style="display:flex;flex-direction:column;gap:18px;">
          <div class="settings-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label class="form-label">Full Name <span class="required">*</span></label>
              <input type="text" class="form-input" id="profile-name-input" value="${QrewUI.escapeHtml(user.name)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Email Address <span class="required">*</span></label>
              <input type="email" class="form-input" id="profile-email-input" value="${QrewUI.escapeHtml(user.email)}" required>
            </div>
          </div>

          <div class="settings-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label class="form-label">Phone Number</label>
              <input type="tel" class="form-input" id="profile-phone-input" value="${QrewUI.escapeHtml(user.phone || '+880 1712-345678')}" placeholder="+880 1xxx-xxxxxx">
            </div>
            <div class="form-group">
              <label class="form-label">Designation / Role Title</label>
              <input type="text" class="form-input" id="profile-title-input" value="${QrewUI.escapeHtml(user.role)}" placeholder="e.g. Lead Administrator">
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Bio / Profile Description</label>
            <textarea class="form-input" id="profile-bio-input" rows="3" style="resize:vertical;" placeholder="Brief summary of responsibilities...">${QrewUI.escapeHtml(user.bio || 'Managing platform infrastructure, multi-tenant organizations, and system permissions.')}</textarea>
          </div>

          <div class="settings-section-divider"></div>

          <div class="settings-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
            <div class="form-group">
              <label class="form-label">Active Panel Authority</label>
              <input type="text" class="form-input" value="${QrewUI.escapeHtml(user.role)}" disabled style="background:var(--color-surface);color:var(--color-text-muted);cursor:not-allowed;">
            </div>
            <div class="form-group">
              <label class="form-label">Account Operational Status</label>
              <input type="text" class="form-input" value="Active • Operational" disabled style="background:var(--color-surface);color:var(--color-success);font-weight:600;cursor:not-allowed;">
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:12px;margin-top:8px;">
            <button type="submit" class="btn btn-primary" id="btn-save-profile">
              ${QrewUI.getIcon('check')} Save Changes
            </button>
          </div>
        </form>
      </div>
    `;
  };

  const renderAppearanceTab = (user) => {
    const savedTheme = localStorage.getItem('qrew_ui_theme') || 'system';
    const savedAccent = localStorage.getItem('qrew_ui_accent') || '#0D9488';

    return `
      <div class="settings-card-header">
        <h2 class="settings-card-title">Appearance & Display</h2>
      </div>
      <div class="settings-card-body">
        <div>
          <label class="form-label" style="font-size:14px;font-weight:600;margin-bottom:12px;display:block;">Theme</label>
          <div class="appearance-theme-grid">
            <div class="appearance-theme-card ${savedTheme === 'light' ? 'active' : ''}" data-theme="light">
              <div class="theme-preview-box preview-light">
                <div class="mock-topbar"></div>
                <div class="mock-body">
                  <div class="mock-sidebar"></div>
                  <div class="mock-content">
                    <div class="mock-line" style="width:65%;"></div>
                    <div class="mock-line" style="width:90%;"></div>
                    <div class="mock-line" style="width:45%;"></div>
                  </div>
                </div>
              </div>
              <div class="theme-card-footer">
                <span class="theme-name">Light</span>
                <span class="theme-radio-dot"></span>
              </div>
            </div>

            <div class="appearance-theme-card ${savedTheme === 'dark' ? 'active' : ''}" data-theme="dark">
              <div class="theme-preview-box preview-dark">
                <div class="mock-topbar"></div>
                <div class="mock-body">
                  <div class="mock-sidebar"></div>
                  <div class="mock-content">
                    <div class="mock-line" style="width:65%;"></div>
                    <div class="mock-line" style="width:90%;"></div>
                    <div class="mock-line" style="width:45%;"></div>
                  </div>
                </div>
              </div>
              <div class="theme-card-footer">
                <span class="theme-name">Dark</span>
                <span class="theme-radio-dot"></span>
              </div>
            </div>

            <div class="appearance-theme-card ${savedTheme === 'system' ? 'active' : ''}" data-theme="system">
              <div class="theme-preview-box preview-system">
                <div class="mock-half mock-light-half">
                  <div class="mock-topbar"></div>
                  <div class="mock-body">
                    <div class="mock-sidebar"></div>
                    <div class="mock-content">
                      <div class="mock-line" style="width:70%;"></div>
                    </div>
                  </div>
                </div>
                <div class="mock-half mock-dark-half">
                  <div class="mock-topbar"></div>
                  <div class="mock-body">
                    <div class="mock-sidebar"></div>
                    <div class="mock-content">
                      <div class="mock-line" style="width:70%;"></div>
                    </div>
                  </div>
                </div>
              </div>
              <div class="theme-card-footer">
                <span class="theme-name">System</span>
                <span class="theme-radio-dot"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-section-divider"></div>

        <div>
          <label class="form-label" style="font-size:14px;font-weight:600;margin-bottom:12px;display:block;">Accent Color</label>
          <div class="accent-swatch-row">
            <button type="button" class="accent-swatch-item ${savedAccent === '#0D9488' ? 'active' : ''}" data-accent="#0D9488" title="Teal (Brand Default)">
              <span class="swatch-circle" style="background:#0D9488;"></span>
              <span class="swatch-label">Teal</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedAccent === '#2563EB' ? 'active' : ''}" data-accent="#2563EB" title="Blue (Platform)">
              <span class="swatch-circle" style="background:#2563EB;"></span>
              <span class="swatch-label">Blue</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedAccent === '#7C3AED' ? 'active' : ''}" data-accent="#7C3AED" title="Purple (Tenant)">
              <span class="swatch-circle" style="background:#7C3AED;"></span>
              <span class="swatch-label">Purple</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedAccent === '#F97316' ? 'active' : ''}" data-accent="#F97316" title="Orange (Config)">
              <span class="swatch-circle" style="background:#F97316;"></span>
              <span class="swatch-label">Orange</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedAccent === '#059669' ? 'active' : ''}" data-accent="#059669" title="Emerald Green">
              <span class="swatch-circle" style="background:#059669;"></span>
              <span class="swatch-label">Emerald</span>
            </button>
          </div>
        </div>

        <div style="display:flex;justify-content:flex-end;margin-top:24px;">
          <button type="button" class="btn btn-primary" id="btn-save-appearance">
            ${QrewUI.getIcon('check')} Save Preferences
          </button>
        </div>
      </div>
    `;
  };

  const renderSecurityTab = (user) => {
    return `
      <div class="settings-card-header">
        <h2 class="settings-card-title">Security & Authentication</h2>
      </div>
      <div class="settings-card-body">
        <div>
          <h3 style="font-size:15px;font-weight:700;color:var(--color-text-primary);margin-bottom:4px;">Change Password</h3>
          <p style="font-size:12.5px;color:var(--color-text-muted);margin-bottom:16px;">Ensure your account uses a secure password with at least 8 characters.</p>

          <form id="security-password-form" style="display:flex;flex-direction:column;gap:14px;max-width:480px;">
            <div class="form-group">
              <label class="form-label">Current Password <span class="required">*</span></label>
              <input type="password" class="form-input" id="sec-current-pwd" placeholder="••••••••••••" required>
            </div>
            <div class="form-group">
              <label class="form-label">New Password <span class="required">*</span></label>
              <input type="password" class="form-input" id="sec-new-pwd" placeholder="Enter new password" required>
            </div>
            <div class="form-group">
              <label class="form-label">Confirm New Password <span class="required">*</span></label>
              <input type="password" class="form-input" id="sec-confirm-pwd" placeholder="Confirm new password" required>
            </div>
            <div>
              <button type="submit" class="btn btn-primary" id="btn-update-password">
                Update Password
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  };

  const wireTabEvents = (activeTab, user) => {
    if (activeTab === 'profile') {
      const previewEl = document.getElementById('profile-avatar-preview');
      const swatchBtns = document.querySelectorAll('.color-swatch-btn');
      swatchBtns.forEach(btn => {
        btn.onclick = () => {
          swatchBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentAvatarBg = btn.dataset.color;
          if (previewEl) previewEl.style.backgroundColor = currentAvatarBg;
        };
      });

      const form = document.getElementById('profile-details-form');
      if (form) {
        form.onsubmit = (e) => {
          e.preventDefault();
          const name = document.getElementById('profile-name-input').value.trim();
          const email = document.getElementById('profile-email-input').value.trim();
          const phone = document.getElementById('profile-phone-input').value.trim();
          const role = document.getElementById('profile-title-input').value.trim();
          const bio = document.getElementById('profile-bio-input').value.trim();

          if (!name || !email) {
            alert('Please provide your name and email address.');
            return;
          }

          try {
            const ws = Qrew.state.activeWorkspace || 'platform';
            let overrides = {};
            try {
              overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
            } catch (err) {}

            const avatarBg = currentAvatarBg || user.avatarBg || 'var(--panel-accent, #0D9488)';
            overrides[ws] = {
              name,
              email,
              phone,
              role: role || user.role,
              bio,
              avatar: name.charAt(0).toUpperCase(),
              avatarBg
            };
            localStorage.setItem('qrew_panel_user_overrides', JSON.stringify(overrides));

            if (ws === 'platform' || ws === 'super-admin') {
              try { QrewStore.updateCurrentUser({ name, email }); } catch (err) {}
            }

            Qrew.shell.syncHeaderUserProfile();
            QrewUI.showToast('Profile updated successfully!', 'success');
          } catch (err) {
            alert(err.message);
          }
        };
      }
    } else if (activeTab === 'appearance') {
      const themeCards = document.querySelectorAll('.appearance-theme-card');
      themeCards.forEach(card => {
        card.onclick = () => {
          themeCards.forEach(c => c.classList.remove('active'));
          card.classList.add('active');
          const chosen = card.dataset.theme;
          localStorage.setItem('qrew_ui_theme', chosen);
          if (Qrew.shell.applyAppearanceSettings) {
            Qrew.shell.applyAppearanceSettings();
          }
          const themeName = card.querySelector('.theme-name').textContent;
          QrewUI.showToast(`Theme switched to ${themeName}.`, 'info');
        };
      });

      const accentItems = document.querySelectorAll('.accent-swatch-item');
      accentItems.forEach(item => {
        item.onclick = () => {
          accentItems.forEach(i => i.classList.remove('active'));
          item.classList.add('active');
          const chosenAccent = item.dataset.accent;
          localStorage.setItem('qrew_ui_accent', chosenAccent);
          if (Qrew.shell.applyAppearanceSettings) {
            Qrew.shell.applyAppearanceSettings();
          }
          const label = item.querySelector('.swatch-label').textContent;
          QrewUI.showToast(`Accent color updated to ${label}.`, 'info');
        };
      });

      const btnSaveApp = document.getElementById('btn-save-appearance');
      if (btnSaveApp) {
        btnSaveApp.onclick = () => {
          QrewUI.showToast('Appearance preferences saved successfully!', 'success');
        };
      }
    } else if (activeTab === 'security') {
      const pwdForm = document.getElementById('security-password-form');
      if (pwdForm) {
        pwdForm.onsubmit = (e) => {
          e.preventDefault();
          const current = document.getElementById('sec-current-pwd').value;
          const newPwd = document.getElementById('sec-new-pwd').value;
          const confirm = document.getElementById('sec-confirm-pwd').value;

          if (!current || !newPwd || !confirm) {
            alert('Please fill out all password fields.');
            return;
          }
          if (newPwd !== confirm) {
            alert('New password and confirmation do not match.');
            return;
          }
          if (newPwd.length < 8) {
            alert('New password must be at least 8 characters long.');
            return;
          }

          pwdForm.reset();
          QrewUI.showToast('Password updated successfully!', 'success');
        };
      }
    }
  };

  const render = (activeTab = 'profile') => {
    const validTabs = ['profile', 'appearance', 'security'];
    const currentTab = validTabs.includes(activeTab) ? activeTab : 'profile';
    const user = Qrew.shell.getPanelUserInfo();
    const ctx = Qrew.buildContext();

    const ws = Qrew.state.activeWorkspace || 'platform';
    let backHref = '#platform/overview';
    let workspaceTitle = 'Platform Admin';

    if (ws === 'super-admin') {
      backHref = '#super-admin/overview';
      workspaceTitle = 'Super Admin';
    } else if (ws === 'tenant') {
      const tid = Qrew.state.currentTenantId || 'ten_sst';
      backHref = `#tenant/overview?id=${tid}`;
      workspaceTitle = 'Tenant Panel';
    } else if (ws === 'office') {
      const tid = Qrew.state.currentTenantId || 'ten_sst';
      const oid = Qrew.state.currentOfficeId || 'off_ctg_port';
      backHref = `#office/dashboard?tenantId=${tid}&officeId=${oid}`;
      workspaceTitle = 'Office Workspace';
    } else if (ws === 'office-admin') {
      const tid = Qrew.state.currentTenantId || 'ten_sst';
      const oid = Qrew.state.currentOfficeId || 'off_ctg_port';
      backHref = `#office-admin/overview?tenantId=${tid}&officeId=${oid}`;
      workspaceTitle = 'Office Admin';
    } else if (ws === 'office-config') {
      backHref = '#office-config';
      workspaceTitle = 'Office Config';
    } else if (ws === 'department') {
      const did = Qrew.state.currentDeptId || 'dept_customs';
      backHref = `#department/overview?deptId=${did}`;
      workspaceTitle = 'Department';
    } else if (ws === 'member') {
      const mid = Qrew.state.currentMemberId || 'usr_nusrat';
      backHref = `#member/overview?userId=${mid}`;
      workspaceTitle = 'Member Workspace';
    }

    Qrew.dom.mainContent.innerHTML = `
      <div class="settings-container">
        <div class="page-header settings-header">
          <div class="page-title-group">
            <h1 class="page-title">Account Settings</h1>
            <p class="page-subtitle">Manage personal profile details, appearance preferences, and account security.</p>
          </div>
          <div class="page-actions">
            <a href="${backHref}" class="btn btn-secondary btn-sm" id="btn-back-to-ws">
              ${QrewUI.getIcon('chevronLeft')} Back to ${workspaceTitle}
            </a>
          </div>
        </div>

        <div class="settings-layout">
          <!-- Settings Sidebar Navigation -->
          <nav class="settings-sidebar" aria-label="Settings Sub Navigation">
            <div class="settings-user-pill-top">
              <div class="avatar-sm" style="background-color:${user.avatarBg || 'var(--panel-accent)'};">
                ${QrewUI.escapeHtml(user.avatar || user.name.charAt(0).toUpperCase())}
              </div>
              <div style="min-width:0;flex:1;">
                <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${QrewUI.escapeHtml(user.name)}</div>
                <div style="font-size:11px;color:var(--color-text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${QrewUI.escapeHtml(user.role)}</div>
              </div>
            </div>

            <div class="nav-divider" style="margin: 8px 4px 10px;"></div>

            <button type="button" class="settings-tab-btn ${currentTab === 'profile' ? 'active' : ''}" data-tab="profile">
              <span class="tab-icon">${QrewUI.getIcon('users')}</span>
              <span>Profile</span>
            </button>
            <button type="button" class="settings-tab-btn ${currentTab === 'appearance' ? 'active' : ''}" data-tab="appearance">
              <span class="tab-icon">${QrewUI.getIcon('layers')}</span>
              <span>Appearance</span>
            </button>
            <button type="button" class="settings-tab-btn ${currentTab === 'security' ? 'active' : ''}" data-tab="security">
              <span class="tab-icon">${QrewUI.getIcon('shield')}</span>
              <span>Security</span>
            </button>
          </nav>

          <!-- Settings Content Area -->
          <div class="settings-content-card" id="settings-tab-content">
            ${currentTab === 'appearance' ? renderAppearanceTab(user) :
              currentTab === 'security' ? renderSecurityTab(user) :
              renderProfileTab(user, ctx)}
          </div>
        </div>
      </div>
    `;

    document.querySelectorAll('.settings-tab-btn').forEach(btn => {
      btn.onclick = () => {
        const tab = btn.dataset.tab;
        Qrew.navigateTo(`#profile?tab=${tab}`);
      };
    });

    Qrew.shell.updateTopbarDomainBadge();
    wireTabEvents(currentTab, user);
  };

  Qrew.views.profile.render = render;
})();
