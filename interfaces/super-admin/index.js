/**
 * Interface: Super Admin (App.Qrew.com/Admin)
 */
(() => {
  const Qrew = window.Qrew;

  // ─── Platform Access ─────────────────────────────────────────────────────────
  const renderSuperAdminPlatformAccess = () => {
    const users = QrewStore.getPlatformUsers();
    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-title-group">
          <h1 class="page-title">Platform Access</h1>
          <p class="page-subtitle">Create and manage platform administrator accounts, roles, and authentication security</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onclick="QrewUI.showToast('Account creation flow coming in full build.','info')">${QrewUI.getIcon('plus')} Create Administrator</button>
        </div>
      </div>

      <div class="metrics-grid" style="margin-bottom:24px;">
        <div class="metric-card">
          <div class="metric-header"><span class="metric-label">Total Administrators</span><div class="metric-icon-wrap">${QrewUI.getIcon('users')}</div></div>
          <div class="metric-value-row"><div class="metric-value">${users.length}</div><div class="metric-subtext">Platform accounts</div></div>
        </div>
        <div class="metric-card">
          <div class="metric-header"><span class="metric-label">Super Admins</span><div class="metric-icon-wrap" style="color:var(--panel-accent);">${QrewUI.getIcon('shield')}</div></div>
          <div class="metric-value-row"><div class="metric-value">${users.filter(u=>u.platformRole==='Platform Owner').length}</div><div class="metric-subtext">Highest authority</div></div>
        </div>
        <div class="metric-card">
          <div class="metric-header"><span class="metric-label">MFA Enrolled</span><div class="metric-icon-wrap" style="color:#22c55e;">${QrewUI.getIcon('check')}</div></div>
          <div class="metric-value-row"><div class="metric-value">${users.length}</div><div class="metric-subtext">100% — mandatory</div></div>
        </div>
        <div class="metric-card">
          <div class="metric-header"><span class="metric-label">Active Accounts</span><div class="metric-icon-wrap">${QrewUI.getIcon('activity')}</div></div>
          <div class="metric-value-row"><div class="metric-value">${users.filter(u=>u.status==='Active').length}</div><div class="metric-subtext">No suspensions</div></div>
        </div>
      </div>

      <div class="card">
        <div class="card-header" style="flex-wrap:wrap;gap:12px;">
          <div><h2 class="card-title">Administrator Accounts</h2><p class="card-subtitle">Direct-creation only — no invitations</p></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <div style="position:relative;">
              <input type="text" class="form-input" placeholder="Search by name or email…" style="padding-left:30px;width:220px;" oninput="
                const q=this.value.toLowerCase();
                document.querySelectorAll('#sa-pa-table tbody tr').forEach(r=>{r.style.display=r.textContent.toLowerCase().includes(q)?'':'none';});
              ">
              <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--color-text-muted);">${QrewUI.getIcon('search')}</span>
            </div>
            <select class="form-input" style="width:150px;font-size:13px;" onchange="
              const v=this.value;
              document.querySelectorAll('#sa-pa-table tbody tr').forEach(r=>{r.style.display=(!v||r.dataset.role===v)?'':'none';});
            ">
              <option value="">All Roles</option>
              <option value="Platform Owner">Platform Owner</option>
              <option value="Platform Admin">Platform Admin</option>
              <option value="Platform User">Platform User</option>
            </select>
          </div>
        </div>
        <div class="table-wrapper" style="border:none;box-shadow:none;">
          <table class="data-table" id="sa-pa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Assigned Role</th>
                <th>MFA</th>
                <th>Account Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr data-role="${u.platformRole}">
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="user-avatar" style="width:30px;height:30px;font-size:12px;background:var(--panel-accent);">${u.name.charAt(0).toUpperCase()}</div>
                      <strong>${QrewUI.escapeHtml(u.name)}</strong>
                    </div>
                  </td>
                  <td style="color:var(--color-text-muted);font-size:13px;">${QrewUI.escapeHtml(u.email)}</td>
                  <td>${QrewUI.roleBadge(u.platformRole, 'platform')}</td>
                  <td><span class="badge badge-active"><span class="badge-dot"></span>Enrolled</span></td>
                  <td>${QrewUI.statusBadge(u.status)}</td>
                  <td style="color:var(--color-text-muted);font-size:13px;">${u.createdAt}</td>
                  <td>
                    <div style="display:flex;gap:6px;">
                      <button class="btn btn-secondary btn-sm" onclick="QrewUI.showToast('Role editor coming in full build.','info')" title="Edit roles">${QrewUI.getIcon('edit')}</button>
                      <button class="btn btn-secondary btn-sm" onclick="QrewUI.showToast('Account actions coming in full build.','info')" title="More actions">${QrewUI.getIcon('moreVertical')}</button>
                    </div>
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:20px;">
        <div class="card-header"><div><h2 class="card-title">Safety Constraints</h2><p class="card-subtitle">Non-negotiable platform rules</p></div></div>
        <div style="display:flex;flex-direction:column;gap:0;">
          ${[
            ['Platform Owner is the highest authority — no second-administrator approval needed', 'Enforced'],
            ['No invitation workflow — only existing Super Admin creates accounts directly', 'Enforced'],
            ['MFA is mandatory — temporary bypass is prohibited', 'Enforced'],
            ['Platform roles are separate from tenant/office roles', 'Enforced'],
            ['Last usable Super Admin is protected from deletion/suspension', 'Enforced'],
          ].map(([rule, status], i, arr) => `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;${i<arr.length-1?'border-bottom:1px solid var(--color-border-subtle);':''}">
              <span style="font-size:13px;">${rule}</span>
              <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:3px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">${status}</span>
            </div>`).join('')}
        </div>
      </div>
    `;
  };

  // ─── Permission Catalog ──────────────────────────────────────────────────────
  const selectedPermKeys = new Set();

  window.QrewPermCatalog = {
    selectedKeys: selectedPermKeys,

    toggleCard: (cardEl) => {
      const key = cardEl.getAttribute('data-raw-key');
      if (!key) return;
      if (selectedPermKeys.has(key)) {
        selectedPermKeys.delete(key);
        cardEl.classList.remove('selected');
        cardEl.setAttribute('aria-checked', 'false');
        const stateTag = cardEl.querySelector('.perm-state-tag');
        if (stateTag) stateTag.textContent = 'Unselected';
      } else {
        selectedPermKeys.add(key);
        cardEl.classList.add('selected');
        cardEl.setAttribute('aria-checked', 'true');
        const stateTag = cardEl.querySelector('.perm-state-tag');
        if (stateTag) stateTag.textContent = 'Selected';
      }
      window.QrewPermCatalog.updateUI();
    },

    selectAll: () => {
      const cards = document.querySelectorAll('.perm-card');
      let targetCards = [...cards].filter(c => c.style.display !== 'none');
      if (targetCards.length === 0) targetCards = [...cards];

      targetCards.forEach(card => {
        const key = card.getAttribute('data-raw-key');
        if (key) {
          selectedPermKeys.add(key);
          card.classList.add('selected');
          card.setAttribute('aria-checked', 'true');
          const stateTag = card.querySelector('.perm-state-tag');
          if (stateTag) stateTag.textContent = 'Selected';
        }
      });
      window.QrewPermCatalog.updateUI();
      QrewUI.showToast(`Selected all ${targetCards.length} permissions`, 'info');
    },

    deselectAll: () => {
      selectedPermKeys.clear();
      document.querySelectorAll('.perm-card').forEach(card => {
        card.classList.remove('selected');
        card.setAttribute('aria-checked', 'false');
        const stateTag = card.querySelector('.perm-state-tag');
        if (stateTag) stateTag.textContent = 'Unselected';
      });
      window.QrewPermCatalog.updateUI();
      QrewUI.showToast('Deselected all permissions', 'info');
    },

    selectCategory: (categoryName) => {
      const catSection = document.querySelector(`.perm-category[data-category="${categoryName}"]`);
      if (!catSection) return;
      const cards = catSection.querySelectorAll('.perm-card');
      cards.forEach(card => {
        const key = card.getAttribute('data-raw-key');
        if (key) {
          selectedPermKeys.add(key);
          card.classList.add('selected');
          card.setAttribute('aria-checked', 'true');
          const stateTag = card.querySelector('.perm-state-tag');
          if (stateTag) stateTag.textContent = 'Selected';
        }
      });
      window.QrewPermCatalog.updateUI();
      QrewUI.showToast(`Selected all permissions in ${categoryName}`, 'info');
    },

    deselectCategory: (categoryName) => {
      const catSection = document.querySelector(`.perm-category[data-category="${categoryName}"]`);
      if (!catSection) return;
      const cards = catSection.querySelectorAll('.perm-card');
      cards.forEach(card => {
        const key = card.getAttribute('data-raw-key');
        if (key) {
          selectedPermKeys.delete(key);
          card.classList.remove('selected');
          card.setAttribute('aria-checked', 'false');
          const stateTag = card.querySelector('.perm-state-tag');
          if (stateTag) stateTag.textContent = 'Unselected';
        }
      });
      window.QrewPermCatalog.updateUI();
      QrewUI.showToast(`Deselected permissions in ${categoryName}`, 'info');
    },

    updateUI: () => {
      const count = selectedPermKeys.size;
      const total = 21;
      const badge = document.getElementById('perm-counter-badge');
      const pill = document.getElementById('perm-counter-pill');
      const text = document.getElementById('perm-counter-text');
      const deselectBtn = document.getElementById('btn-deselect-all');

      if (badge && pill && text) {
        badge.textContent = count;
        text.textContent = `of ${total} selected`;

        badge.classList.remove('bump');
        void badge.offsetWidth;
        badge.classList.add('bump');

        if (count > 0) {
          pill.classList.add('has-selection');
          if (deselectBtn) deselectBtn.removeAttribute('disabled');
        } else {
          pill.classList.remove('has-selection');
          if (deselectBtn) deselectBtn.setAttribute('disabled', 'true');
        }
      }

      // Update per-category counter status
      document.querySelectorAll('.perm-category').forEach(catSec => {
        const catName = catSec.getAttribute('data-category');
        const cards = catSec.querySelectorAll('.perm-card');
        const selectedInCat = [...cards].filter(c => selectedPermKeys.has(c.getAttribute('data-raw-key'))).length;
        const statusEl = catSec.querySelector('.perm-category-status');
        if (statusEl) {
          statusEl.textContent = `${selectedInCat} of ${cards.length} selected`;
          if (selectedInCat > 0) {
            statusEl.style.color = 'var(--color-accent)';
            statusEl.style.fontWeight = '600';
          } else {
            statusEl.style.color = 'var(--color-text-muted)';
            statusEl.style.fontWeight = '500';
          }
        }
      });
    }
  };

  const renderPermissionCatalog = () => {
    const permissions = [
      {
        key: 'platform:read',
        title: 'Read Platform Records',
        scope: 'Platform Governance',
        category: 'Platform',
        description: 'Access root-level telemetry, tenant metadata, administrative logs, and platform health metrics.',
        type: 'read'
      },
      {
        key: 'platform:manage',
        title: 'Root Platform Administration',
        scope: 'Root Authority',
        category: 'Platform',
        description: 'Full administrative sovereignty to configure platform policies, administrator roles, and security parameters.',
        type: 'write'
      },
      {
        key: 'tenant:create',
        title: 'Provision Tenant Workspace',
        scope: 'Multi-Tenant Root',
        category: 'Tenants',
        description: 'Provision new isolated tenant organizations, initialize root data partitions, and configure subscription plans.',
        type: 'write'
      },
      {
        key: 'tenant:read',
        title: 'Inspect Tenant Directory',
        scope: 'Platform Directory',
        category: 'Tenants',
        description: 'Browse tenant organization directory, configuration snapshots, office counts, and active subscription health.',
        type: 'read'
      },
      {
        key: 'tenant:update',
        title: 'Modify Organization Settings',
        scope: 'Tenant Configuration',
        category: 'Tenants',
        description: 'Update legal company details, custom domain mappings, technical contacts, and subscription tiers.',
        type: 'write'
      },
      {
        key: 'tenant:delete',
        title: 'Destroy Tenant Organization',
        scope: 'Irreversible Cascade',
        category: 'Tenants',
        description: 'Permanently purge organization tenant instance, cascading across all branch offices, staff, and records.',
        type: 'danger'
      },
      {
        key: 'tenant:suspend',
        title: 'Suspend Organization Access',
        scope: 'Security Lockdown',
        category: 'Tenants',
        description: 'Temporarily freeze all login sessions, staff access, and API credentials for an organization.',
        type: 'danger'
      },
      {
        key: 'office:create',
        title: 'Open Branch Office',
        scope: 'Branch Hierarchy',
        category: 'Offices',
        description: 'Establish operational branch offices or port facilities mapped under a verified tenant.',
        type: 'write'
      },
      {
        key: 'office:read',
        title: 'View Office Operations',
        scope: 'Branch Operations',
        category: 'Offices',
        description: 'Inspect branch office rosters, operational departments, invoices, client records, and active project files.',
        type: 'read'
      },
      {
        key: 'office:update',
        title: 'Configure Office Hub',
        scope: 'Branch Management',
        category: 'Offices',
        description: 'Update branch settings, departmental allocations, timezone preferences, and local operating codes.',
        type: 'write'
      },
      {
        key: 'office:delete',
        title: 'Decommission Branch Office',
        scope: 'Branch Cascade',
        category: 'Offices',
        description: 'Dismantle an office facility, revoking local operational access and reassigning staff members.',
        type: 'danger'
      },
      {
        key: 'audit:view',
        title: 'Audit Trail Inspection',
        scope: 'Security Compliance',
        category: 'Audit',
        description: 'Inspect chronological, tamper-evident audit events, actor IP addresses, and state mutation diffs.',
        type: 'read'
      },
      {
        key: 'audit:export',
        title: 'Export Audit Archives',
        scope: 'Regulatory Export',
        category: 'Audit',
        description: 'Generate cryptographically verified compliance logs and signed audit archives for external scrutiny.',
        type: 'write'
      },
      {
        key: 'support:request',
        title: 'Request Support Session',
        scope: 'Impersonation Gateway',
        category: 'Support Access',
        description: 'Request time-boxed, scoped elevation to inspect tenant issues with mandatory justification logging.',
        type: 'write'
      },
      {
        key: 'support:revoke',
        title: 'Sever Active Support',
        scope: 'Immediate Lockdown',
        category: 'Support Access',
        description: 'Immediately terminate ongoing platform support sessions and invalidate all temporary elevation tokens.',
        type: 'danger'
      },
      {
        key: 'catalog:read',
        title: 'Explore Blueprint Catalog',
        scope: 'Template Library',
        category: 'Templates',
        description: 'Browse prebuilt organizational blueprints, workflow stage templates, and permission bundles.',
        type: 'read'
      },
      {
        key: 'catalog:manage',
        title: 'Publish Blueprint Templates',
        scope: 'Template Authoring',
        category: 'Templates',
        description: 'Author, version, and publish reusable organizational blueprint templates platform-wide.',
        type: 'write'
      },
      {
        key: 'entitlement:read',
        title: 'View Quotas & Features',
        scope: 'Plan Entitlements',
        category: 'Entitlements',
        description: 'Inspect plan feature flags, operational capacity quotas, and custom tenant entitlement overrides.',
        type: 'read'
      },
      {
        key: 'entitlement:manage',
        title: 'Override Feature Entitlements',
        scope: 'Quota Authority',
        category: 'Entitlements',
        description: 'Grant custom feature overrides, elevate resource limits, and tailor plan capabilities per tenant.',
        type: 'write'
      },
      {
        key: 'settings:read',
        title: 'View Security Baselines',
        scope: 'Platform Policy',
        category: 'Platform Settings',
        description: 'View global security standards, MFA mandates, authentication lockout triggers, and session rules.',
        type: 'read'
      },
      {
        key: 'settings:manage',
        title: 'Govern Platform Security',
        scope: 'Root Governance',
        category: 'Platform Settings',
        description: 'Reconfigure root authentication thresholds, session TTLs, TLS rules, and system-wide security controls.',
        type: 'danger'
      },
    ];

    const grouped = {};
    permissions.forEach(p => {
      if (!grouped[p.category]) grouped[p.category] = [];
      grouped[p.category].push(p);
    });

    const typeBadge = t =>
      t === 'read'   ? '<span class="perm-type-badge read">Read</span>' :
      t === 'write'  ? '<span class="perm-type-badge write">Write</span>' :
                       '<span class="perm-type-badge danger">Destructive</span>';

    Qrew.dom.mainContent.innerHTML = `
      <style id="perm-catalog-custom-styles">
        /* Toolbar */
        .perm-toolbar-card {
          background: #ffffff;
          border: 1px solid var(--color-border);
          border-radius: 12px;
          padding: 16px 20px;
          margin-bottom: 28px;
          box-shadow: 0 1px 3px rgba(31, 29, 26, 0.04);
        }
        .perm-counter-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          font-weight: 600;
          padding: 6px 14px;
          border-radius: 20px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          transition: all 0.2s ease;
        }
        .perm-counter-pill.has-selection {
          background: rgba(158, 83, 52, 0.08);
          border-color: rgba(158, 83, 52, 0.35);
          color: var(--color-accent);
        }
        .perm-counter-badge {
          background: var(--color-accent);
          color: #fff;
          font-size: 11px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 12px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 20px;
          transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .perm-counter-badge.bump {
          animation: permBadgePulse 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes permBadgePulse {
          0% { transform: scale(1); }
          45% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }

        /* Category Header */
        .perm-category-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 12px;
          margin-bottom: 14px;
          padding-bottom: 10px;
          border-bottom: 1px solid var(--color-border);
        }
        .perm-category-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .perm-category-title {
          font-size: 17px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          letter-spacing: -0.2px;
        }
        .perm-category-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 12px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
        }
        .perm-category-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .perm-category-status {
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text-muted);
          margin-right: 6px;
        }
        .btn-cat-action {
          padding: 4px 10px;
          font-size: 11.5px;
          font-weight: 600;
          border-radius: 6px;
          border: 1px solid var(--color-border);
          background: #ffffff;
          color: var(--color-text-primary);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .btn-cat-action:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background: #FAF7F4;
        }

        /* Bespoke Permission Cards */
        .perm-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 14px;
        }
        .perm-card {
          position: relative;
          background: #ffffff;
          border: 1.5px solid var(--color-border);
          border-left: 3.5px solid transparent;
          border-radius: 10px;
          padding: 16px 18px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          cursor: pointer;
          user-select: none;
          box-shadow: 0 1px 3px rgba(31, 29, 26, 0.04);
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                      border-color 0.18s ease,
                      border-left-color 0.18s ease,
                      background-color 0.18s ease;
        }
        .perm-card:hover {
          transform: translateY(-2px);
          border-color: #CEC5B8;
          box-shadow: 0 8px 20px -2px rgba(31, 29, 26, 0.08);
        }
        .perm-card:active {
          transform: scale(0.988) translateY(0);
          transition-duration: 0.06s;
        }
        .perm-card.selected {
          background-color: #FFFDFB;
          border-color: var(--color-accent);
          border-left-color: var(--color-accent);
          box-shadow: 0 0 0 1px var(--color-accent), 0 10px 24px -2px rgba(158, 83, 52, 0.14);
          transform: translateY(-2px);
        }
        .perm-card:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }

        /* Card Head */
        .perm-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
        }
        .perm-card-header-left {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }
        .perm-card-check {
          width: 22px;
          height: 22px;
          border-radius: 6px;
          border: 1.5px solid var(--color-border);
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .perm-card:hover .perm-card-check {
          border-color: #B5ACA0;
        }
        .perm-card.selected .perm-card-check {
          background: var(--color-accent);
          border-color: var(--color-accent);
          box-shadow: 0 2px 6px rgba(158, 83, 52, 0.35);
        }
        .perm-card-check svg {
          opacity: 0;
          transform: scale(0.2) rotate(-20deg);
          transition: transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.16s ease;
        }
        .perm-card.selected .perm-card-check svg {
          opacity: 1;
          transform: scale(1) rotate(0deg);
          animation: permCheckPop 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        @keyframes permCheckPop {
          0% { transform: scale(0) rotate(-25deg); opacity: 0; }
          65% { transform: scale(1.25) rotate(4deg); opacity: 1; }
          85% { transform: scale(0.92) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }

        .perm-card-titles {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .perm-card-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin: 0;
          line-height: 1.3;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .perm-card.selected .perm-card-title {
          color: var(--color-accent);
        }
        .perm-card-scope {
          font-size: 11px;
          font-weight: 500;
          color: var(--color-text-muted);
          letter-spacing: 0.2px;
        }

        /* Type Badges */
        .perm-type-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .perm-type-badge.read {
          background: #EEF4FF;
          color: #1D4ED8;
          border: 1px solid #DBEAFE;
        }
        .perm-type-badge.write {
          background: #ECFDF5;
          color: #047857;
          border: 1px solid #D1FAE5;
        }
        .perm-type-badge.danger {
          background: #FEF2F2;
          color: #B91C1C;
          border: 1px solid #FECACA;
        }

        /* Card Description */
        .perm-card-desc {
          font-size: 12.5px;
          color: var(--color-text-muted);
          line-height: 1.45;
          margin: 0;
        }

        /* Card Foot */
        .perm-card-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding-top: 10px;
          border-top: 1px solid rgba(227, 221, 211, 0.7);
          margin-top: auto;
        }
        .perm-key-tag {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 11px;
          font-weight: 600;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          padding: 3px 8px;
          border-radius: 5px;
          color: var(--color-text-primary);
        }
        .perm-key-namespace {
          color: var(--color-text-muted);
        }
        .perm-state-tag {
          font-size: 11px;
          font-weight: 600;
          padding: 2px 7px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }
        .perm-card:not(.selected) .perm-state-tag {
          color: var(--color-text-muted);
          background: transparent;
        }
        .perm-card.selected .perm-state-tag {
          color: var(--color-accent);
          background: rgba(158, 83, 52, 0.08);
        }
      </style>

      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-title-group">
          <h1 class="page-title">Permission Catalog</h1>
          <p class="page-subtitle">System-managed catalog of ${permissions.length} platform permission keys — interactive selection & RBAC assignment</p>
        </div>
      </div>

      <div class="perm-toolbar-card">
        <!-- Filter & Search Row -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
          <div style="position:relative;flex:1;min-width:220px;max-width:380px;">
            <input type="text" class="form-input" placeholder="Search permissions or descriptions…" style="padding-left:30px;" oninput="
              const q=this.value.toLowerCase();
              document.querySelectorAll('.perm-card').forEach(c=>{
                const match = c.dataset.key.includes(q) || c.dataset.desc.includes(q) || c.dataset.title.includes(q);
                c.style.display = match ? '' : 'none';
              });
              document.querySelectorAll('.perm-category').forEach(sec=>{
                const visible=[...sec.querySelectorAll('.perm-card')].some(c=>c.style.display!=='none');
                sec.style.display=visible?'':'none';
              });
            ">
            <span style="position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--color-text-muted);">${QrewUI.getIcon('search')}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn btn-secondary btn-sm" onclick="
              document.querySelectorAll('.perm-card').forEach(c=>c.style.display=c.dataset.type==='read'?'':'none');
              document.querySelectorAll('.perm-category').forEach(sec=>{const v=[...sec.querySelectorAll('.perm-card')].some(c=>c.style.display!=='none');sec.style.display=v?'':'none';});
            ">Read</button>
            <button class="btn btn-secondary btn-sm" onclick="
              document.querySelectorAll('.perm-card').forEach(c=>c.style.display=c.dataset.type==='write'?'':'none');
              document.querySelectorAll('.perm-category').forEach(sec=>{const v=[...sec.querySelectorAll('.perm-card')].some(c=>c.style.display!=='none');sec.style.display=v?'':'none';});
            ">Write</button>
            <button class="btn btn-secondary btn-sm" onclick="
              document.querySelectorAll('.perm-card').forEach(c=>c.style.display=c.dataset.type==='danger'?'':'none');
              document.querySelectorAll('.perm-category').forEach(sec=>{const v=[...sec.querySelectorAll('.perm-card')].some(c=>c.style.display!=='none');sec.style.display=v?'':'none';});
            ">Destructive</button>
            <button class="btn btn-secondary btn-sm" onclick="
              document.querySelectorAll('.perm-card').forEach(c=>c.style.display='');
              document.querySelectorAll('.perm-category').forEach(s=>s.style.display='');
            ">Clear Filter</button>
          </div>
        </div>

        <!-- Selection Controls Row -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-top:14px;border-top:1px solid var(--color-border);">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="perm-counter-pill" id="perm-counter-pill">
              <span class="perm-counter-badge" id="perm-counter-badge">${selectedPermKeys.size}</span>
              <span id="perm-counter-text">of ${permissions.length} selected</span>
            </span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-select-all" onclick="QrewPermCatalog.selectAll()">
              ${QrewUI.getIcon('check')} Select All (${permissions.length})
            </button>
            <button type="button" class="btn btn-secondary btn-sm" id="btn-deselect-all" onclick="QrewPermCatalog.deselectAll()" ${selectedPermKeys.size === 0 ? 'disabled' : ''}>
              Deselect All
            </button>
          </div>
        </div>
      </div>

      ${Object.entries(grouped).map(([category, perms]) => {
        const catSlug = category.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return `
        <div class="perm-category" data-category="${category}" style="margin-bottom:28px;">
          <div class="perm-category-header">
            <div class="perm-category-info">
              <h2 class="perm-category-title">${category}</h2>
              <span class="perm-category-badge">${perms.length}</span>
            </div>
            <div class="perm-category-actions">
              <span class="perm-category-status" id="cat-status-${catSlug}">0 of ${perms.length} selected</span>
              <button type="button" class="btn-cat-action" onclick="QrewPermCatalog.selectCategory('${category}')" title="Select all ${category} permissions">
                Select all
              </button>
              <button type="button" class="btn-cat-action" onclick="QrewPermCatalog.deselectCategory('${category}')" title="Deselect all ${category} permissions">
                Deselect
              </button>
            </div>
          </div>
          <div class="perm-cards-grid">
            ${perms.map(p => {
              const isSelected = selectedPermKeys.has(p.key);
              const [ns, action] = p.key.split(':');
              return `
              <div class="perm-card ${isSelected ? 'selected' : ''}"
                   tabindex="0"
                   role="checkbox"
                   aria-checked="${isSelected ? 'true' : 'false'}"
                   data-key="${p.key.toLowerCase()}"
                   data-raw-key="${p.key}"
                   data-title="${p.title.toLowerCase()}"
                   data-category="${category}"
                   data-desc="${p.description.toLowerCase()}"
                   data-type="${p.type}"
                   onclick="QrewPermCatalog.toggleCard(this)"
                   onkeydown="if(event.key===' '||event.key==='Enter'){event.preventDefault();QrewPermCatalog.toggleCard(this);}">
                
                <div class="perm-card-head">
                  <div class="perm-card-header-left">
                    <div class="perm-card-check" aria-hidden="true">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div class="perm-card-titles">
                      <h3 class="perm-card-title">${p.title}</h3>
                      <span class="perm-card-scope">${p.scope}</span>
                    </div>
                  </div>
                  ${typeBadge(p.type)}
                </div>

                <p class="perm-card-desc">${p.description}</p>

                <div class="perm-card-foot">
                  <code class="perm-key-tag">
                    <span class="perm-key-namespace">${ns}:</span>${action}
                  </code>
                  <span class="perm-state-tag">${isSelected ? 'Selected' : 'Unselected'}</span>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`;
      }).join('')}
    `;
    window.QrewPermCatalog.updateUI();
  };

  // ─── Platform Settings ───────────────────────────────────────────────────────
  const renderSuperAdminPlatformSettings = () => {
    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom:24px;">
        <div class="page-title-group">
          <h1 class="page-title">Platform Settings</h1>
          <p class="page-subtitle">Global Qrew platform policies and security controls — Super Admin only</p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary" onclick="QrewUI.showToast('Changes saved.','success')">${QrewUI.getIcon('check')} Save Changes</button>
        </div>
      </div>

      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:var(--radius-md);padding:12px 16px;margin-bottom:24px;display:flex;align-items:center;gap:10px;">
        <span style="color:#dc2626;">${QrewUI.getIcon('alert')}</span>
        <span style="font-size:13px;color:#991b1b;font-weight:600;">Changes here affect all tenants and offices platform-wide. High-impact changes require re-authentication.</span>
      </div>

      ${[
        {
          title: 'Security & Authentication',
          fields: [
            { label: 'MFA Requirement', hint: 'Mandatory for all platform admins', value: 'Mandatory', locked: true },
            { label: 'Reauthentication for sensitive actions', hint: 'Step-up auth required', value: 'Enabled', locked: true },
            { label: 'Failed login lockout threshold', hint: 'Attempts before lockout', value: '5 attempts', locked: false },
            { label: 'Password policy', hint: 'Complexity requirements', value: 'Strong (min 12 chars, mixed)', locked: false },
          ]
        },
        {
          title: 'Sessions & Access Safety',
          fields: [
            { label: 'Admin session lifetime', hint: 'Maximum session duration', value: '8 hours', locked: false },
            { label: 'Idle timeout', hint: 'Inactivity before session ends', value: '30 minutes', locked: false },
            { label: 'Revoke sessions on role change', hint: 'Force re-login after role changes', value: 'Enabled', locked: true },
            { label: 'Concurrent session limit', hint: 'Per administrator account', value: '1 (enforced)', locked: false },
          ]
        },
        {
          title: 'Platform Domains & Custom Domains',
          fields: [
            { label: 'Platform root domain', hint: 'Read-only', value: 'qrew.com', locked: true },
            { label: 'Tenant subdomain format', hint: 'Naming convention enforced', value: '<tenant>.qrew.com', locked: true },
            { label: 'Custom domain verification required', hint: 'DNS verification before activation', value: 'Yes', locked: true },
            { label: 'TLS enforcement', hint: 'All traffic must use TLS', value: 'Mandatory', locked: true },
          ]
        },
        {
          title: 'Audit & Logging',
          fields: [
            { label: 'Core security event logging', hint: 'Cannot be disabled', value: 'Always on', locked: true },
            { label: 'Sensitive action logging', hint: 'Actor, before/after values, outcome', value: 'Enabled', locked: true },
            { label: 'Audit log retention', hint: 'Default retention period', value: '365 days', locked: false },
            { label: 'Admin audit own actions', hint: 'Self-actions are always logged', value: 'Mandatory', locked: true },
          ]
        },
        {
          title: 'Data Retention & Recovery',
          fields: [
            { label: 'Account recovery window', hint: 'Time to restore after deletion', value: 'TBD — pending policy decision', locked: false },
            { label: 'Legal hold support', hint: 'Prevent purge during active holds', value: 'Planned', locked: false },
            { label: 'Tenant archive retention', hint: 'Post-deletion data window', value: 'TBD', locked: false },
          ]
        },
      ].map(section => `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <h2 class="card-title">${section.title}</h2>
          </div>
          <div style="display:flex;flex-direction:column;">
            ${section.fields.map((f, i, arr) => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 20px;${i<arr.length-1?'border-bottom:1px solid var(--color-border-subtle);':''}">
                <div>
                  <div style="font-size:14px;font-weight:600;">${f.label}</div>
                  <div style="font-size:11px;color:var(--color-text-muted);margin-top:2px;">${f.hint}</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span style="font-size:13px;">${f.value}</span>
                  ${f.locked
                    ? '<span style="font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;">LOCKED</span>'
                    : `<button class="btn btn-secondary btn-sm" onclick="QrewUI.showToast('Edit coming in full build.','info')">${QrewUI.getIcon('edit')}</button>`
                  }
                </div>
              </div>`).join('')}
          </div>
        </div>`).join('')}
    `;
  };

  // ─── Interface Registration ──────────────────────────────────────────────────
  Qrew.registerInterface({
    id: 'super-admin',
    brandHome: 'platform',

    getDomainBadge: ({ view }) => {
      const subPath = view ? `/${view}` : '/permission-catalog';
      return {
        text: `app.qrew.com/super-admin${subPath}`,
        dotColor: 'var(--panel-accent)'
      };
    },

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
          <a class="nav-item ${view === 'platform-access' ? 'active' : ''}" href="#super-admin/platform-access">
            <span class="nav-icon">${QrewUI.getIcon('users')}</span>
            <span class="nav-label">Platform Access</span>
          </a>
          <a class="nav-item ${view === 'permission-catalog' ? 'active' : ''}" href="#super-admin/permission-catalog">
            <span class="nav-icon">${QrewUI.getIcon('shield')}</span>
            <span class="nav-label">Permission Catalog</span>
          </a>
          <a class="nav-item ${view === 'platform-settings' || view === 'platform-setting' ? 'active' : ''}" href="#super-admin/platform-settings">
            <span class="nav-icon">${QrewUI.getIcon('settings')}</span>
            <span class="nav-label">Platform Settings</span>
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
      switch (view) {
        case 'platform-access':   return renderSuperAdminPlatformAccess();
        case 'permission-catalog':return renderPermissionCatalog();
        case 'platform-settings':
        case 'platform-setting':  return renderSuperAdminPlatformSettings();
        default:                  return renderPermissionCatalog();
      }
    }
  });
})();
