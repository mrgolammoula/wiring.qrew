/**
 * Interface: Account Settings (Profile, Appearance, Security)
 */
(() => {
  const Qrew = window.Qrew;
  Qrew.views = Qrew.views || {};
  Qrew.views.profile = Qrew.views.profile || {};

  let currentAvatarBg = null;
  let currentAvatarPhoto = null;

  const renderProfileTab = (user, ctx) => {
    const avatarBg = currentAvatarBg || user.avatarBg || 'var(--panel-accent, #0D9488)';
    const avatarPhoto = (currentAvatarPhoto !== null) ? currentAvatarPhoto : (user.photo || '');

    return `
      <div class="settings-card-header">
        <h2 class="settings-card-title">Profile Settings</h2>
      </div>
      <div class="settings-card-body">
        <div class="avatar-preview-wrap">
          <div class="avatar-hover-wrapper" id="avatar-hover-wrapper">
            <div class="avatar-large" id="profile-avatar-preview" style="background-color:${avatarBg};" title="Click or hover to change avatar">
              ${avatarPhoto ? `<img src="${avatarPhoto}" alt="${user.name}" class="avatar-large-img" id="profile-avatar-img">` : `<span id="profile-avatar-initial">${QrewUI.escapeHtml(user.avatar || user.name.charAt(0).toUpperCase())}</span>`}
              
              <div class="avatar-hover-overlay">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                <span class="avatar-hover-text">Change</span>
              </div>
            </div>

            <!-- Floating Options Popover on Hover -->
            <div class="avatar-options-popover" id="avatar-options-popover">
              <div class="avatar-popover-header">
                <span class="avatar-popover-title">Avatar Options</span>
              </div>

              <!-- Option 1: Picture -->
              <div class="avatar-popover-section">
                <div class="avatar-popover-label">Picture</div>
                <div class="avatar-popover-actions">
                  <button type="button" class="btn btn-secondary btn-sm" id="btn-upload-photo">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span>Upload Picture</span>
                  </button>
                  <button type="button" class="btn btn-secondary btn-sm btn-remove-photo" id="btn-remove-photo" style="display:${avatarPhoto ? 'inline-flex' : 'none'};">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    <span>Remove</span>
                  </button>
                </div>
                <input type="file" id="avatar-file-input" accept="image/png, image/jpeg, image/webp" style="display:none;" />
              </div>

              <div class="avatar-popover-divider"></div>

              <!-- Option 2: Color Change -->
              <div class="avatar-popover-section">
                <div class="avatar-popover-label">Avatar Color</div>
                <div class="color-swatch-list in-popover">
                  <button type="button" class="color-swatch-btn ${avatarBg === '#0F766E' || avatarBg === '#0D9488' ? 'active' : ''}" data-color="#0F766E" style="background-color:#0F766E;" title="Teal (Brand)"></button>
                  <button type="button" class="color-swatch-btn ${avatarBg === '#2563EB' ? 'active' : ''}" data-color="#2563EB" style="background-color:#2563EB;" title="Blue (Platform)"></button>
                  <button type="button" class="color-swatch-btn ${avatarBg === '#7C3AED' ? 'active' : ''}" data-color="#7C3AED" style="background-color:#7C3AED;" title="Purple (Tenant)"></button>
                  <button type="button" class="color-swatch-btn ${avatarBg === '#EA580C' || avatarBg === '#F97316' ? 'active' : ''}" data-color="#EA580C" style="background-color:#EA580C;" title="Orange (Config)"></button>
                  <button type="button" class="color-swatch-btn ${avatarBg === '#1E293B' ? 'active' : ''}" data-color="#1E293B" style="background-color:#1E293B;" title="Dark Slate"></button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 style="font-size:16px;font-weight:700;color:var(--color-text-primary);margin:0;">${QrewUI.escapeHtml(user.name)}</h3>
            <div style="margin-top:4px;display:flex;align-items:center;gap:8px;">
              <span class="badge" style="background:var(--color-surface);color:var(--panel-accent);border:1px solid var(--color-border);font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;">${QrewUI.escapeHtml(user.role)}</span>
              <span style="font-size:12px;color:var(--color-text-muted);">${QrewUI.escapeHtml(user.email)}</span>
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
              <label class="form-label">Address</label>
              <input type="text" class="form-input" id="profile-address-input" value="${QrewUI.escapeHtml(user.address || 'Gulshan-2, Dhaka')}" placeholder="e.g. Gulshan-2, Dhaka">
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

          <div class="settings-form-footer" style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--color-border-subtle);">
            <button type="button" class="btn btn-danger-light" id="btn-delete-profile" title="Delete Account Profile">
              ${QrewUI.getIcon('trash')} Delete Account
            </button>
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
    const savedSecondary = localStorage.getItem('qrew_ui_secondary') || localStorage.getItem('qrew_ui_accent') || 'default';

    return `
      <div class="settings-card-header">
        <h2 class="settings-card-title">Appearance & Display</h2>
      </div>
      <div class="settings-card-body">
        <div>
          <label class="form-label" style="font-size:14px;font-weight:600;margin-bottom:12px;display:block;">Primary Theme</label>
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
          <label class="form-label" style="font-size:14px;font-weight:600;margin-bottom:6px;display:block;">Secondary Color</label>
          <p style="font-size:13px;color:var(--color-text-muted);margin:0 0 14px 0;">By default, each workspace panel uses its dedicated color scheme (Platform: Blue, Tenant: Purple, Office: Teal, Config: Orange). You can override the secondary color across panels below.</p>
          <div class="accent-swatch-row">
            <button type="button" class="accent-swatch-item ${savedSecondary === 'default' ? 'active' : ''}" data-accent="default" title="Default (Panel Preset)">
              <span class="swatch-circle swatch-default-preset"></span>
              <span class="swatch-label">Default (Panel Preset)</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedSecondary === '#2563EB' ? 'active' : ''}" data-accent="#2563EB" title="Blue (Platform)">
              <span class="swatch-circle" style="background:#2563EB;"></span>
              <span class="swatch-label">Blue</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedSecondary === '#7C3AED' ? 'active' : ''}" data-accent="#7C3AED" title="Purple (Tenant)">
              <span class="swatch-circle" style="background:#7C3AED;"></span>
              <span class="swatch-label">Purple</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedSecondary === '#0F766E' || savedSecondary === '#0D9488' ? 'active' : ''}" data-accent="#0F766E" title="Teal (Office)">
              <span class="swatch-circle" style="background:#0F766E;"></span>
              <span class="swatch-label">Teal</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedSecondary === '#EA580C' || savedSecondary === '#F97316' ? 'active' : ''}" data-accent="#EA580C" title="Orange (Config)">
              <span class="swatch-circle" style="background:#EA580C;"></span>
              <span class="swatch-label">Orange</span>
            </button>
            <button type="button" class="accent-swatch-item ${savedSecondary === '#059669' ? 'active' : ''}" data-accent="#059669" title="Emerald Green">
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

  const is2FAActive = (user) => {
    const ws = (Qrew.state && Qrew.state.activeWorkspace) || 'platform';
    let overrides = {};
    try {
      overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
    } catch (e) {}
    const userKey = 'qrew_2fa_' + (user.email || ws);
    return Boolean((overrides[ws] && overrides[ws].twoFactorEnabled) || localStorage.getItem(userKey) === 'true');
  };

  const renderSecurityTab = (user) => {
    const is2FA = is2FAActive(user);

    return `
      <div class="settings-card-header">
        <h2 class="settings-card-title">Security & Authentication</h2>
      </div>
      <div class="settings-card-body">
        <!-- Change Password Section -->
        <div>
          <h3 style="font-size:15px;font-weight:700;color:var(--color-text-primary);margin-bottom:4px;">Change Password</h3>
          <p style="font-size:12.5px;color:var(--color-text-muted);margin-bottom:14px;">Ensure your account uses a secure password with at least 8 characters.</p>

          <form id="security-password-form" style="display:flex;flex-direction:column;gap:12px;max-width:680px;">
            <div class="form-group" style="max-width:330px;">
              <label class="form-label">Current Password <span class="required">*</span></label>
              <input type="password" class="form-input" id="sec-current-pwd" placeholder="••••••••••••" required>
            </div>
            <div class="settings-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">
              <div class="form-group">
                <label class="form-label">New Password <span class="required">*</span></label>
                <input type="password" class="form-input" id="sec-new-pwd" placeholder="Enter new password" required>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm New Password <span class="required">*</span></label>
                <input type="password" class="form-input" id="sec-confirm-pwd" placeholder="Confirm new password" required>
              </div>
            </div>
            <div>
              <button type="submit" class="btn btn-primary" id="btn-update-password">
                Update Password
              </button>
            </div>
          </form>
        </div>

        <div class="settings-section-divider" style="margin: 20px 0;"></div>

        <!-- Two-Factor Authentication (2FA) Section -->
        <div id="security-2fa-section">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;">
                <h3 style="font-size:15px;font-weight:700;color:var(--color-text-primary);margin:0;">Two-Factor Authentication (2FA)</h3>
                <span id="twofa-status-badge" class="badge ${is2FA ? 'twofa-badge-active' : 'twofa-badge-inactive'}" style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px;">
                  ${is2FA ? 'Enabled • Protected' : 'Not Configured'}
                </span>
              </div>
              <p style="font-size:12.5px;color:var(--color-text-muted);margin:6px 0 0;max-width:560px;">
                Add an extra layer of defense to your profile. When 2FA is active, signing in requires a 6-digit verification code from your authenticator app in addition to your password.
              </p>
            </div>

            <div id="twofa-header-actions">
              ${is2FA ? `
                <button type="button" class="btn btn-secondary btn-sm" id="btn-disable-2fa" style="color:var(--color-danger, #EF4444);border-color:rgba(239,68,68,0.3);">
                  Disable 2FA
                </button>
              ` : `
                <button type="button" class="btn btn-primary" id="btn-setup-2fa" style="display:inline-flex;align-items:center;gap:7px;">
                  ${QrewUI.getIcon('shield')}
                  <span>Configure 2FA</span>
                </button>
              `}
            </div>
          </div>

          <!-- 2FA Methods / Status Box -->
          <div class="security-2fa-box ${is2FA ? 'is-active' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
              <div style="display:flex;align-items:center;gap:14px;">
                <div style="width:42px;height:42px;border-radius:var(--radius-md);background:${is2FA ? 'rgba(13,148,136,0.15)' : 'var(--color-surface-hover)'};color:${is2FA ? 'var(--color-accent)' : 'var(--color-text-muted)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                </div>
                <div>
                  <div style="font-size:13.5px;font-weight:600;color:var(--color-text-primary);display:flex;align-items:center;gap:8px;">
                    <span>Authenticator App (TOTP)</span>
                    <span style="font-size:10.5px;font-weight:600;padding:1px 6px;border-radius:3px;background:var(--color-surface-hover);color:var(--color-text-muted);">Recommended</span>
                  </div>
                  <div style="font-size:12px;color:var(--color-text-muted);margin-top:2px;">
                    Google Authenticator, Microsoft Authenticator, 1Password, Authy
                  </div>
                </div>
              </div>

              <div>
                ${is2FA ? `
                  <div style="display:flex;align-items:center;gap:8px;">
                    <button type="button" class="btn btn-secondary btn-sm" id="btn-view-backup-codes">
                      Backup Codes
                    </button>
                    <span style="font-size:12px;color:var(--color-success);font-weight:600;display:inline-flex;align-items:center;gap:4px;">
                      ${QrewUI.getIcon('check')} Active
                    </span>
                  </div>
                ` : `
                  <span style="font-size:12px;color:var(--color-text-muted);">Ready to pair</span>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  };

  const wireTabEvents = (activeTab, user) => {
    if (activeTab === 'profile') {
      const wrapperEl = document.getElementById('avatar-hover-wrapper');
      const previewEl = document.getElementById('profile-avatar-preview');
      const fileInput = document.getElementById('avatar-file-input');
      const btnUpload = document.getElementById('btn-upload-photo');
      const btnRemove = document.getElementById('btn-remove-photo');
      const swatchBtns = document.querySelectorAll('.color-swatch-btn');

      // Toggle popover on avatar click
      if (previewEl && wrapperEl) {
        previewEl.onclick = (e) => {
          e.stopPropagation();
          wrapperEl.classList.toggle('is-open');
        };
      }

      // Close popover when clicking outside
      const onDocClick = (e) => {
        if (wrapperEl && !wrapperEl.contains(e.target)) {
          wrapperEl.classList.remove('is-open');
        }
      };
      document.addEventListener('click', onDocClick);

      // Upload picture handler
      if (btnUpload && fileInput) {
        btnUpload.onclick = (e) => {
          e.stopPropagation();
          fileInput.click();
        };

        fileInput.onchange = (e) => {
          const file = e.target.files && e.target.files[0];
          if (!file) return;
          if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file (PNG, JPEG, WebP).');
            return;
          }

          const reader = new FileReader();
          reader.onload = (event) => {
            currentAvatarPhoto = event.target.result;
            if (previewEl) {
              const existingImg = previewEl.querySelector('#profile-avatar-img');
              const initialEl = previewEl.querySelector('#profile-avatar-initial');
              if (initialEl) initialEl.style.display = 'none';

              if (existingImg) {
                existingImg.src = currentAvatarPhoto;
                existingImg.style.display = 'block';
              } else {
                const img = document.createElement('img');
                img.id = 'profile-avatar-img';
                img.className = 'avatar-large-img';
                img.src = currentAvatarPhoto;
                img.alt = user.name;
                previewEl.insertBefore(img, previewEl.firstChild);
              }
            }
            if (btnRemove) btnRemove.style.display = 'inline-flex';
          };
          reader.readAsDataURL(file);
        };
      }

      // Remove picture handler
      if (btnRemove) {
        btnRemove.onclick = (e) => {
          e.stopPropagation();
          currentAvatarPhoto = '';
          if (fileInput) fileInput.value = '';
          if (previewEl) {
            const existingImg = previewEl.querySelector('#profile-avatar-img');
            if (existingImg) existingImg.remove();
            let initialEl = previewEl.querySelector('#profile-avatar-initial');
            if (!initialEl) {
              initialEl = document.createElement('span');
              initialEl.id = 'profile-avatar-initial';
              initialEl.textContent = user.avatar || user.name.charAt(0).toUpperCase();
              previewEl.insertBefore(initialEl, previewEl.firstChild);
            }
            initialEl.style.display = 'inline';
          }
          btnRemove.style.display = 'none';
        };
      }

      // Swatch color selection
      swatchBtns.forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
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
          const address = document.getElementById('profile-address-input') ? document.getElementById('profile-address-input').value.trim() : (user.address || '');
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
            const photo = (currentAvatarPhoto !== null) ? currentAvatarPhoto : (user.photo || '');

            overrides[ws] = {
              name,
              email,
              phone,
              address: address || user.address || 'Gulshan-2, Dhaka',
              role: user.role,
              bio,
              avatar: name.charAt(0).toUpperCase(),
              avatarBg,
              photo
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

      const btnDelete = document.getElementById('btn-delete-profile');
      if (btnDelete) {
        btnDelete.onclick = () => {
          QrewUI.confirmDialog({
            title: 'Delete Account',
            message: `Are you sure you want to delete the account profile for <strong>${QrewUI.escapeHtml(user.name || 'this user')}</strong>? This action will remove custom profile information and restore defaults.`,
            confirmText: 'Delete Account',
            confirmClass: 'btn-danger',
            icon: 'trash',
            iconColor: 'var(--color-danger)',
            onConfirm: () => {
              const ws = (Qrew.state && Qrew.state.activeWorkspace) || 'platform';
              try {
                let overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
                delete overrides[ws];
                localStorage.setItem('qrew_panel_user_overrides', JSON.stringify(overrides));
              } catch (e) {}

              localStorage.removeItem('qrew_profile_name');
              localStorage.removeItem('qrew_profile_email');
              localStorage.removeItem('qrew_profile_phone');
              localStorage.removeItem('qrew_profile_address');
              localStorage.removeItem('qrew_profile_bio');
              localStorage.removeItem('qrew_user_avatar_url');

              QrewUI.showToast('Account profile deleted successfully.', 'info');
              if (Qrew.shell.syncHeaderUserProfile) {
                Qrew.shell.syncHeaderUserProfile();
              }
              if (Qrew.interfaces && Qrew.interfaces.profile) {
                Qrew.interfaces.profile.render(Qrew.state.currentView, Qrew.buildContext());
              }
            }
          });
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
          const chosenSecondary = item.dataset.accent;
          if (chosenSecondary === 'default') {
            localStorage.removeItem('qrew_ui_secondary');
            localStorage.removeItem('qrew_ui_accent');
          } else {
            localStorage.setItem('qrew_ui_secondary', chosenSecondary);
            localStorage.setItem('qrew_ui_accent', chosenSecondary);
          }
          if (Qrew.shell.applyAppearanceSettings) {
            Qrew.shell.applyAppearanceSettings();
          }
          const label = item.querySelector('.swatch-label').textContent;
          QrewUI.showToast(`Secondary color updated to ${label}.`, 'info');
        };
      });

      const btnSaveApp = document.getElementById('btn-save-appearance');
      if (btnSaveApp) {
        btnSaveApp.onclick = () => {
          if (Qrew.shell.applyAppearanceSettings) {
            Qrew.shell.applyAppearanceSettings();
          }
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

      const BACKUP_CODES = [
        '8492-4102', '3819-5820', '7401-9283', '1948-2840',
        '5829-1039', '4820-5819', '9182-3749', '2048-1938'
      ];

      // Setup 2FA Flow
      const btnSetup = document.getElementById('btn-setup-2fa');
      if (btnSetup) {
        btnSetup.onclick = () => {
          const secretKey = 'JBSW Y3DP EHPK 3PXP';
          const qrSvg = `
            <svg width="140" height="140" viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="140" height="140" rx="8" fill="#FFFFFF"/>
              <rect x="14" y="14" width="35" height="35" rx="3" fill="#090D16"/>
              <rect x="21" y="21" width="21" height="21" rx="2" fill="#FFFFFF"/>
              <rect x="26" y="26" width="11" height="11" rx="1" fill="#0D9488"/>
              <rect x="91" y="14" width="35" height="35" rx="3" fill="#090D16"/>
              <rect x="98" y="21" width="21" height="21" rx="2" fill="#FFFFFF"/>
              <rect x="103" y="26" width="11" height="11" rx="1" fill="#0D9488"/>
              <rect x="14" y="91" width="35" height="35" rx="3" fill="#090D16"/>
              <rect x="21" y="98" width="21" height="21" rx="2" fill="#FFFFFF"/>
              <rect x="26" y="103" width="11" height="11" rx="1" fill="#0D9488"/>
              <rect x="56" y="18" width="7" height="7" fill="#090D16"/>
              <rect x="68" y="18" width="7" height="7" fill="#090D16"/>
              <rect x="56" y="32" width="7" height="7" fill="#090D16"/>
              <rect x="75" y="32" width="7" height="7" fill="#090D16"/>
              <rect x="62" y="44" width="7" height="7" fill="#090D16"/>
              <rect x="75" y="44" width="7" height="7" fill="#090D16"/>
              <rect x="18" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="32" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="44" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="56" y="56" width="14" height="14" rx="2" fill="#0D9488"/>
              <rect x="77" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="91" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="105" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="115" y="56" width="7" height="7" fill="#090D16"/>
              <rect x="18" y="68" width="7" height="7" fill="#090D16"/>
              <rect x="37" y="68" width="7" height="7" fill="#090D16"/>
              <rect x="75" y="68" width="7" height="7" fill="#090D16"/>
              <rect x="98" y="68" width="7" height="7" fill="#090D16"/>
              <rect x="115" y="68" width="7" height="7" fill="#090D16"/>
              <rect x="56" y="80" width="7" height="7" fill="#090D16"/>
              <rect x="68" y="80" width="7" height="7" fill="#090D16"/>
              <rect x="85" y="80" width="7" height="7" fill="#090D16"/>
              <rect x="105" y="80" width="7" height="7" fill="#090D16"/>
              <rect x="56" y="94" width="7" height="7" fill="#090D16"/>
              <rect x="75" y="94" width="7" height="7" fill="#090D16"/>
              <rect x="91" y="94" width="7" height="7" fill="#090D16"/>
              <rect x="112" y="94" width="7" height="7" fill="#090D16"/>
              <rect x="62" y="108" width="7" height="7" fill="#090D16"/>
              <rect x="80" y="108" width="7" height="7" fill="#090D16"/>
              <rect x="98" y="108" width="7" height="7" fill="#090D16"/>
              <rect x="115" y="108" width="7" height="7" fill="#090D16"/>
            </svg>
          `;

          QrewUI.openModal({
            title: 'Set Up Two-Factor Authentication',
            bodyHtml: `
              <div class="twofa-setup-wrap">
                <!-- Step 1 -->
                <div class="twofa-step-card">
                  <div style="display:flex;align-items:center;margin-bottom:8px;">
                    <span class="twofa-step-num">1</span>
                    <span style="font-size:13.5px;font-weight:700;color:var(--color-text-primary);">Scan QR code with Authenticator app</span>
                  </div>
                  <p style="font-size:12px;color:var(--color-text-muted);margin:0 0 10px;">
                    Use Google Authenticator, 1Password, Microsoft Authenticator or Authy on your mobile phone to scan this QR code:
                  </p>
                  
                  <div class="twofa-qr-container">
                    ${qrSvg}
                  </div>

                  <div style="font-size:11.5px;color:var(--color-text-muted);margin-bottom:6px;">Or manually enter the setup key:</div>
                  <div class="twofa-secret-box">
                    <span>${secretKey}</span>
                    <button type="button" class="btn btn-secondary btn-sm" id="modal-copy-secret" style="font-size:11px;padding:3px 8px;">Copy</button>
                  </div>
                </div>

                <!-- Step 2 -->
                <div class="twofa-step-card">
                  <div style="display:flex;align-items:center;margin-bottom:8px;">
                    <span class="twofa-step-num">2</span>
                    <span style="font-size:13.5px;font-weight:700;color:var(--color-text-primary);">Verify 6-digit authentication code</span>
                  </div>
                  <p style="font-size:12px;color:var(--color-text-muted);margin:0 0 12px;">
                    Enter the current 6-digit one-time code generated by your authenticator app:
                  </p>
                  <input type="text" id="modal-twofa-code" class="form-input twofa-code-input" placeholder="000 000" maxlength="6" autocomplete="off" />
                </div>
              </div>
            `,
            footerHtml: `
              <button type="button" class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
              <button type="button" class="btn btn-primary" id="modal-btn-verify-2fa">Verify &amp; Activate 2FA</button>
            `
          });

          // Copy key action
          const copyBtn = document.getElementById('modal-copy-secret');
          if (copyBtn) {
            copyBtn.onclick = () => {
              navigator.clipboard?.writeText('JBSWY3DPEHPK3PXP');
              copyBtn.textContent = 'Copied!';
              setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
            };
          }

          // Verify button action
          const verifyBtn = document.getElementById('modal-btn-verify-2fa');
          const codeInput = document.getElementById('modal-twofa-code');
          if (verifyBtn) {
            verifyBtn.onclick = () => {
              const code = codeInput ? codeInput.value.replace(/\s+/g, '') : '';
              if (!code || code.length < 6) {
                alert('Please enter the 6-digit verification code from your authenticator app (e.g. 123456).');
                return;
              }

              // Save 2FA state
              const ws = (Qrew.state && Qrew.state.activeWorkspace) || 'platform';
              localStorage.setItem('qrew_2fa_' + (user.email || ws), 'true');
              let overrides = {};
              try {
                overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
              } catch (e) {}
              if (!overrides[ws]) overrides[ws] = {};
              overrides[ws].twoFactorEnabled = true;
              localStorage.setItem('qrew_panel_user_overrides', JSON.stringify(overrides));

              QrewUI.closeModal();

              // Show Backup Codes modal
              setTimeout(() => {
                QrewUI.openModal({
                  title: 'Two-Factor Authentication Enabled',
                  bodyHtml: `
                    <div>
                      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;color:var(--color-success);">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                        <span style="font-size:14px;font-weight:700;">Your account is now protected with 2FA</span>
                      </div>
                      <p style="font-size:12.5px;color:var(--color-text-muted);margin:0 0 14px;">
                        Save these emergency recovery codes in a safe place. If you ever lose access to your phone or authenticator app, each code can be used once to sign in:
                      </p>

                      <div class="twofa-backup-grid">
                        ${BACKUP_CODES.map(c => `<div class="twofa-backup-code">${c}</div>`).join('')}
                      </div>
                    </div>
                  `,
                  footerHtml: `
                    <button type="button" class="btn btn-secondary" id="modal-copy-backup-codes">Copy All Codes</button>
                    <button type="button" class="btn btn-primary" onclick="QrewUI.closeModal(); Qrew.views.profile.render('security');">Done</button>
                  `
                });

                const copyBackupBtn = document.getElementById('modal-copy-backup-codes');
                if (copyBackupBtn) {
                  copyBackupBtn.onclick = () => {
                    navigator.clipboard?.writeText(BACKUP_CODES.join('\n'));
                    copyBackupBtn.textContent = 'Codes Copied!';
                    setTimeout(() => { copyBackupBtn.textContent = 'Copy All Codes'; }, 1500);
                  };
                }

                QrewUI.showToast('Two-Factor Authentication enabled successfully!', 'success');
              }, 150);
            };
          }
        };
      }

      // Disable 2FA Flow
      const btnDisable = document.getElementById('btn-disable-2fa');
      if (btnDisable) {
        btnDisable.onclick = () => {
          QrewUI.confirmDialog({
            title: 'Disable Two-Factor Authentication',
            message: 'Are you sure you want to disable 2FA? This will remove the extra security layer from your account and make it more vulnerable.',
            confirmText: 'Disable 2FA',
            danger: true,
            onConfirm: () => {
              const ws = (Qrew.state && Qrew.state.activeWorkspace) || 'platform';
              localStorage.removeItem('qrew_2fa_' + (user.email || ws));
              let overrides = {};
              try {
                overrides = JSON.parse(localStorage.getItem('qrew_panel_user_overrides') || '{}');
              } catch (e) {}
              if (overrides[ws]) {
                overrides[ws].twoFactorEnabled = false;
                localStorage.setItem('qrew_panel_user_overrides', JSON.stringify(overrides));
              }
              QrewUI.showToast('Two-Factor Authentication has been disabled.', 'info');
              render('security');
            }
          });
        };
      }

      // View Backup Codes Flow
      const btnViewBackup = document.getElementById('btn-view-backup-codes');
      if (btnViewBackup) {
        btnViewBackup.onclick = () => {
          QrewUI.openModal({
            title: 'Emergency Backup Recovery Codes',
            bodyHtml: `
              <div>
                <p style="font-size:12.5px;color:var(--color-text-muted);margin:0 0 14px;">
                  Each code below can be used once if you lose access to your authenticator app. Store them safely:
                </p>
                <div class="twofa-backup-grid">
                  ${BACKUP_CODES.map(c => `<div class="twofa-backup-code">${c}</div>`).join('')}
                </div>
              </div>
            `,
            footerHtml: `
              <button type="button" class="btn btn-secondary" id="modal-copy-backup-codes2">Copy All Codes</button>
              <button type="button" class="btn btn-primary" onclick="QrewUI.closeModal()">Close</button>
            `
          });

          const copyBtn2 = document.getElementById('modal-copy-backup-codes2');
          if (copyBtn2) {
            copyBtn2.onclick = () => {
              navigator.clipboard?.writeText(BACKUP_CODES.join('\n'));
              copyBtn2.textContent = 'Codes Copied!';
              setTimeout(() => { copyBtn2.textContent = 'Copy All Codes'; }, 1500);
            };
          }
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
