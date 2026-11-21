/**
 * Interface: Dedicated Tenant Landing Page (e.g. sst.com)
 */
(() => {
  const Qrew = window.Qrew;

  const renderTenantLandingPage = (tenantId) => {
    const tenant = QrewStore.getTenantById(tenantId) || QrewStore.getTenants()[0];
    const domain = Qrew.getTenantDomain(tenant.id);
    const offices = QrewStore.getOfficesByTenant(tenant.id);
    const members = QrewStore.getTenantMembers(tenant.id);

    Qrew.dom.mainContent.innerHTML = `
      <div class="landing-page">
        <!-- Tenant Sticky Header -->
        <header class="landing-navbar">
          <div class="landing-container landing-navbar-inner">
            <div style="display:flex;align-items:center;gap:12px;">
              <a href="#tenant-landing?id=${tenant.id}" class="landing-brand">
                <div class="landing-brand-logo" style="background-color:var(--color-warning);">${tenant.name.charAt(0)}</div>
                <span class="landing-brand-title">${QrewUI.escapeHtml(tenant.name)}</span>
              </a>
              <span class="tenant-domain-pill">${domain}</span>
            </div>

            <div style="display:flex;align-items:center;gap:10px;">
              <a href="#landing" class="btn btn-secondary btn-sm" title="Return to Qrew Global SaaS Landing">
                ← Qrew Platform
              </a>
              <a href="#tenant/overview?id=${tenant.id}" class="btn btn-primary btn-sm">
                Tenant Admin Panel →
              </a>
            </div>
          </div>
        </header>

        <!-- Tenant Hero Section -->
        <section class="tenant-landing-hero">
          <div class="landing-container">
            <div class="landing-badge">
              <span class="landing-badge-dot"></span>
              <span>Tenant Namespace: ${domain} • Autonomous Organization Operations</span>
            </div>
            <h1 class="landing-hero-title">
              ${QrewUI.escapeHtml(tenant.name)} Operations Portal
            </h1>
            <p class="landing-hero-subtitle">
              Dedicated corporate organization portal for ${QrewUI.escapeHtml(tenant.name)}. Overseeing ${offices.length} physical branch facilities and ${members.length} verified organization members under the ${domain} namespace.
            </p>

            <div class="landing-cta-group">
              <a href="#tenant/overview?id=${tenant.id}" class="btn btn-primary landing-btn-lg" style="display:inline-flex;align-items:center;gap:8px;">
                <span>Open Tenant Admin Panel</span>
                ${QrewUI.getIcon('arrowRight')}
              </a>
              <a href="#tenant/offices?id=${tenant.id}" class="btn btn-secondary landing-btn-lg">
                Manage Offices Directory
              </a>
              <a href="#member/overview?userId=usr_nusrat" class="btn btn-secondary landing-btn-lg">
                Staff Workspace
              </a>
            </div>

            <!-- Organization Metrics Ribbon -->
            <div class="hero-ribbon">
              <div class="hero-ribbon-item">
                <div class="hero-ribbon-val">${offices.length} Branches</div>
                <div class="hero-ribbon-label">Physical Office Facilities</div>
              </div>
              <div class="hero-ribbon-item">
                <div class="hero-ribbon-val">${members.length} Members</div>
                <div class="hero-ribbon-label">Verified Personnel Pool</div>
              </div>
              <div class="hero-ribbon-item">
                <div class="hero-ribbon-val">${tenant.status}</div>
                <div class="hero-ribbon-label">Organization Lifecycle</div>
              </div>
              <div class="hero-ribbon-item">
                <div class="hero-ribbon-val">Tier-3 Scoping</div>
                <div class="hero-ribbon-label">Strict Multi-Tenant Isolation</div>
              </div>
            </div>
          </div>
        </section>

        <!-- Branch Offices Showcase Section -->
        <section style="padding:48px 0 64px;">
          <div class="landing-container">
            <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;flex-wrap:wrap;gap:12px;">
              <div>
                <div class="landing-eyebrow" style="color:var(--color-accent);font-weight:700;font-size:12px;text-transform:uppercase;letter-spacing:0.8px;">Physical Deployment</div>
                <h2 style="font-size:24px;font-weight:800;color:var(--color-text-primary);margin:4px 0 0;">Branch Office Facilities</h2>
                <p style="font-size:13.5px;color:var(--color-text-muted);margin:4px 0 0;">Select a physical office branch below to access its operational workspace or management panel.</p>
              </div>
              <div>
                <a href="#tenant/offices?id=${tenant.id}" class="btn btn-secondary btn-sm">
                  ${QrewUI.getIcon('plus')} Provision New Office
                </a>
              </div>
            </div>

            <div class="tenant-branch-grid">
              ${offices.map(o => {
                const depts = QrewStore.getDepartments(o.id);
                const staff = QrewStore.getOfficeStaff(o.id);
                return `
                  <div class="tenant-branch-card">
                    <div class="tenant-branch-header">
                      <div>
                        <div class="tenant-branch-title">${QrewUI.escapeHtml(o.name)}</div>
                        <div class="tenant-branch-location">${QrewUI.escapeHtml(o.location)}</div>
                      </div>
                      ${QrewUI.statusBadge(o.status)}
                    </div>

                    <div class="tenant-branch-stats">
                      <div>
                        <strong>${depts.length}</strong> <span style="color:var(--color-text-muted);">Departments</span>
                      </div>
                      <div>
                        <strong>${staff.length}</strong> <span style="color:var(--color-text-muted);">Deployed Staff</span>
                      </div>
                      <div class="active-shift-badge">
                        <span>●</span> Shift: Morning
                      </div>
                    </div>

                    <div class="tenant-branch-actions">
                      <a href="#office/overview?tenantId=${tenant.id}&officeId=${o.id}" class="btn btn-primary btn-sm" style="flex:1;text-align:center;">
                        Office Workspace →
                      </a>
                      <a href="#office-admin/overview?tenantId=${tenant.id}&officeId=${o.id}" class="btn btn-secondary btn-sm" title="Office Admin Panel">
                        Admin ⚙
                      </a>
                      <a href="#office-config?tenantId=${tenant.id}&officeId=${o.id}" class="btn btn-secondary btn-sm" title="Facility Specs & Shifts">
                        Config
                      </a>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </section>
      </div>
    `;
  };

  Qrew.registerInterface({
    id: 'tenant-landing',
    landingMode: true,
    render: (_view, ctx) => renderTenantLandingPage(ctx.state.currentTenantId)
  });
})();
