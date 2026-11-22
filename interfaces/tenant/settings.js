/**
 * Interface: Tenant Workspace — Organization Settings View
 */
(() => {
  const Qrew = window.Qrew;

  const renderTenantSettings = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId) || QrewStore.getTenants()[0];
    const currentDomain = Qrew.getTenantDomain(tenant.id);
    const planName = tenant.plan || 'Enterprise';
    const planBroughtDate = tenant.createdAt || '2026-09-12';

    Qrew.dom.mainContent.innerHTML = `
      <div class="page-header" style="margin-bottom: 24px;">
        <div class="page-title-group">
          <h1 class="page-title" style="font-size: 24px; font-weight: 700; color: var(--color-text-primary); margin: 0;">Settings</h1>
          <p class="page-subtitle" style="font-size: 14px; color: var(--color-text-muted); margin-top: 4px;">Manage organization profile, primary domain routing, and active subscription plan.</p>
        </div>
      </div>

      <div style="display: flex; flex-direction: column; gap: 24px; max-width: 760px;">
        <!-- Company Profile & Name Edit -->
        <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 16px 0;">Company Profile</h2>
          <form id="tenant-company-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label for="tenant-name-input" style="display: block; font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px;">Company Name</label>
              <input type="text" id="tenant-name-input" class="form-input" value="${QrewUI.escapeHtml(tenant.name)}" required style="width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg); color: var(--color-text-primary); font-size: 14px;">
            </div>
            <div>
              <label for="tenant-owner-name" style="display: block; font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px;">Account Owner</label>
              <input type="text" id="tenant-owner-name" class="form-input" value="${QrewUI.escapeHtml(tenant.ownerName || 'Rafiqul Islam')}" readonly style="width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); color: var(--color-text-muted); font-size: 14px; cursor: not-allowed;">
            </div>
            <div>
              <label for="tenant-owner-email" style="display: block; font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px;">Owner Email</label>
              <input type="email" id="tenant-owner-email" class="form-input" value="${QrewUI.escapeHtml(tenant.ownerEmail || 'rafiq@sst.com')}" readonly style="width: 100%; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-surface); color: var(--color-text-muted); font-size: 14px; cursor: not-allowed;">
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
              <button type="submit" class="btn btn-primary" style="background: var(--color-accent); color: #fff; padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer;">Save Company Changes</button>
            </div>
          </form>
        </div>

        <!-- Domain Configuration -->
        <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 24px;">
          <h2 style="font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 16px 0;">Domain Configuration</h2>
          <form id="tenant-domain-form" style="display: flex; flex-direction: column; gap: 16px;">
            <div>
              <label for="tenant-domain-input" style="display: block; font-size: 13px; font-weight: 500; color: var(--color-text-primary); margin-bottom: 6px;">Custom Domain</label>
              <div class="form-domain-input-group" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <input type="text" id="tenant-domain-input" class="form-input" value="${QrewUI.escapeHtml(currentDomain)}" required style="flex: 1; padding: 8px 12px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-bg); color: var(--color-text-primary); font-size: 14px;">
                <span class="badge badge-active" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 4px; font-size: 12px;"><span class="badge-dot"></span>SSL Active</span>
              </div>
              <p style="font-size: 12px; color: var(--color-text-muted); margin-top: 4px;">Tenant landing and workspace traffic will resolve to this domain.</p>
            </div>
            <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
              <button type="submit" class="btn btn-primary" style="background: var(--color-accent); color: #fff; padding: 8px 16px; border-radius: 6px; border: none; font-weight: 600; cursor: pointer;">Save Domain Settings</button>
            </div>
          </form>
        </div>

        <!-- Plan Brought & Subscription Details -->
        <div class="card" style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; padding: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
            <div>
              <h2 style="font-size: 16px; font-weight: 600; color: var(--color-text-primary); margin: 0 0 4px 0;">Plan Brought</h2>
              <p style="font-size: 13px; color: var(--color-text-muted); margin: 0;">Subscription license and tier entitlement tier</p>
            </div>
            <span class="badge badge-active" style="display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; border-radius: 4px; font-size: 12px;"><span class="badge-dot"></span>Active Subscription</span>
          </div>

          <div style="background: var(--color-bg); border: 1px solid var(--color-border); border-radius: 6px; padding: 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 2px;">Plan Name</div>
              <div style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">${QrewUI.escapeHtml(planName)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 2px;">Billing Frequency</div>
              <div style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">Annual ($1,200/mo)</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 2px;">Provisioned On</div>
              <div style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">${QrewUI.escapeHtml(planBroughtDate)}</div>
            </div>
            <div>
              <div style="font-size: 12px; color: var(--color-text-muted); margin-bottom: 2px;">Offices Entitlement</div>
              <div style="font-size: 15px; font-weight: 600; color: var(--color-text-primary);">Unlimited Branches</div>
            </div>
          </div>

          <div style="font-size: 13px; color: var(--color-text-muted); line-height: 1.6;">
            <div style="font-weight: 600; color: var(--color-text-primary); margin-bottom: 4px;">Included Entitlements:</div>
            <ul style="margin: 0; padding-left: 20px;">
              <li>Unlimited Branch Facilities & Department Hierarchies</li>
              <li>Multi-tiered Role-Based Access Control (RBAC)</li>
              <li>Real-time Operations Mesh & Facility Shift Handover</li>
              <li>Complete Audit Trail Log Retention (365 Days)</li>
              <li>Enterprise Priority Support & 99.99% Uptime Guarantee</li>
            </ul>
          </div>
        </div>
      </div>
    `;

    // Hook up forms
    const companyForm = document.getElementById('tenant-company-form');
    if (companyForm) {
      companyForm.onsubmit = (e) => {
        e.preventDefault();
        const newName = document.getElementById('tenant-name-input').value.trim();
        if (!newName) return;
        QrewStore.updateTenant(tenant.id, { name: newName });
        QrewUI.showToast('Company name updated successfully', 'success');
        Qrew.shell.updateTopbarDomainBadge();
        Qrew.shell.renderSidebar();
        renderTenantSettings(tenant.id);
      };
    }

    const domainForm = document.getElementById('tenant-domain-form');
    if (domainForm) {
      domainForm.onsubmit = (e) => {
        e.preventDefault();
        const newDomain = document.getElementById('tenant-domain-input').value.trim();
        if (!newDomain) return;
        QrewStore.updateTenant(tenant.id, { domain: newDomain });
        QrewUI.showToast('Custom domain updated successfully', 'success');
        Qrew.shell.updateTopbarDomainBadge();
        Qrew.shell.renderSidebar();
        renderTenantSettings(tenant.id);
      };
    }
  };

  Qrew.views.tenant.renderSettings = renderTenantSettings;
})();
