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

            <div class="tenant-nav-actions" style="display:flex;align-items:center;gap:10px;">
              <a href="#landing" class="tenant-nav-btn tenant-nav-btn-platform" title="Return to Qrew Global SaaS Landing">
                ← Qrew Platform
              </a>
              <a href="#tenant/overview?id=${tenant.id}" class="tenant-nav-btn tenant-nav-btn-admin">
                Tenant Admin Panel →
              </a>
            </div>
          </div>
        </header>

        <!-- Tenant Hero Section -->
        <section class="tenant-landing-hero">
          <div class="landing-container">
            <h1 class="landing-hero-title">
              ${QrewUI.escapeHtml(tenant.name)} Operations Portal
            </h1>

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
      </div>
    `;
  };

  Qrew.registerInterface({
    id: 'tenant-landing',
    landingMode: true,
    render: (_view, ctx) => renderTenantLandingPage(ctx.state.currentTenantId)
  });
})();
