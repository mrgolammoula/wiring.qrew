/**
 * Interface: Office Workspace — Financials Operations Hub
 * Comprehensive financial dashboard, invoice management, cash flow ledger, and analytics.
 */
(() => {
  const Qrew = window.Qrew;

  if (!Qrew.views.office) {
    Qrew.views.office = {};
  }

  // Module local state
  const state = {
    activeTab: 'invoices', // 'invoices' | 'ledger' | 'analytics'
    invoiceSearch: '',
    statusFilter: 'all', // 'all' | 'Paid' | 'Pending' | 'Overdue' | 'Draft'
    ledgerFilter: 'all', // 'all' | 'Credit' | 'Debit'
    currentOfficeId: null,
    currentTenantId: null
  };

  /**
   * Status badge helper for financial invoices
   */
  const getInvoiceBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'paid') {
      return `<span class="badge badge-active"><span class="badge-dot"></span>Paid</span>`;
    } else if (s === 'pending') {
      return `<span class="badge badge-pending"><span class="badge-dot"></span>Pending</span>`;
    } else if (s === 'overdue') {
      return `<span class="badge badge-expired"><span class="badge-dot"></span>Overdue</span>`;
    } else if (s === 'draft') {
      return `<span class="badge badge-suspended"><span class="badge-dot"></span>Draft</span>`;
    }
    return `<span class="badge badge-pending">${QrewUI.escapeHtml(status)}</span>`;
  };

  /**
   * Currency formatter helper
   */
  const formatMoney = (amount, symbol = '$') => {
    return `${symbol}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Main Financials View Renderer
   */
  Qrew.views.office.renderFinancials = (officeId, tenantId) => {
    state.currentOfficeId = officeId || Qrew.state.currentOfficeId || 'off_ctg_port';
    state.currentTenantId = tenantId || Qrew.state.currentTenantId || 'ten_sst';

    const office = QrewStore.getOfficeById(state.currentOfficeId);
    const tenant = QrewStore.getTenantById(state.currentTenantId);

    const invoices = QrewStore.getOfficeInvoices(state.currentOfficeId);
    const transactions = QrewStore.getOfficeTransactions(state.currentOfficeId);

    // Calculate Financial KPIs
    const totalBilled = invoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const totalCollected = paidInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

    const pendingInvoices = invoices.filter(inv => inv.status === 'Pending');
    const totalPending = pendingInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

    const overdueInvoices = invoices.filter(inv => inv.status === 'Overdue');
    const totalOverdue = overdueInvoices.reduce((acc, inv) => acc + (Number(inv.amount) || 0), 0);

    const totalDebits = transactions
      .filter(t => t.type === 'Debit')
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const netMargin = totalCollected - totalDebits;
    const marginPercent = totalCollected > 0 ? Math.round((netMargin / totalCollected) * 100) : 0;

    // Filter Invoices
    const filteredInvoices = invoices.filter(inv => {
      const matchesSearch = !state.invoiceSearch ||
        inv.invoiceNo.toLowerCase().includes(state.invoiceSearch.toLowerCase()) ||
        inv.clientName.toLowerCase().includes(state.invoiceSearch.toLowerCase()) ||
        (inv.vessel && inv.vessel.toLowerCase().includes(state.invoiceSearch.toLowerCase()));

      const matchesStatus = state.statusFilter === 'all' || inv.status === state.statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Filter Transactions
    const filteredTransactions = transactions.filter(t => {
      if (state.ledgerFilter === 'all') return true;
      return t.type === state.ledgerFilter;
    });

    // Render HTML shell
    Qrew.dom.mainContent.innerHTML = `
      <div class="financials-hub-container">
        <!-- Header Card -->
        <div class="detail-header-card" style="margin-bottom:20px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px;">
            <div>
              <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                <h1 class="page-title" style="margin:0;font-size:24px;font-weight:700;">Financials & Billing</h1>
                <span class="id-badge">${office ? QrewUI.escapeHtml(office.name) : 'Chittagong Port Office'}</span>
              </div>
              <p style="margin:0;font-size:13px;color:var(--color-text-muted);">
                Centralized financial management, disbursement accounts, client invoicing, and cash flow ledger.
              </p>
            </div>

            <div class="page-actions" style="display:flex;gap:10px;flex-wrap:wrap;">
              <button class="btn btn-primary" id="btn-create-invoice">
                ${QrewUI.getIcon('plus')} New Invoice
              </button>
              <button class="btn btn-secondary" id="btn-record-transaction">
                ${QrewUI.getIcon('dollar')} Record Transaction
              </button>
              <button class="btn btn-outline" id="btn-export-financials" title="Export CSV Report">
                ${QrewUI.getIcon('file')} Export CSV
              </button>
              <a href="#office-config/overview?tenantId=${state.currentTenantId}&officeId=${state.currentOfficeId}" class="btn btn-outline" style="text-decoration:none;" title="Open Spreadsheet Invoice Template Studio">
                ${QrewUI.getIcon('invoice')} Template Studio &rarr;
              </a>
            </div>
          </div>
        </div>

        <!-- Metric KPI Cards -->
        <div class="metrics-grid" style="grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:16px; margin-bottom:24px;">
          <!-- Total Billed -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Total Billed Revenue</span>
              <div class="metric-icon-wrap" style="color:var(--color-accent);">${QrewUI.getIcon('dollar')}</div>
            </div>
            <div class="metric-value-row">
              <div class="metric-value">${formatMoney(totalBilled)}</div>
              <div class="metric-subtext" style="color:var(--color-success);font-weight:600;">+14.2% vs last month</div>
            </div>
          </div>

          <!-- Total Collected -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Paid / Collected</span>
              <div class="metric-icon-wrap" style="color:var(--color-success);">${QrewUI.getIcon('check')}</div>
            </div>
            <div class="metric-value-row">
              <div class="metric-value">${formatMoney(totalCollected)}</div>
              <div class="metric-subtext">${paidInvoices.length} invoices settled (${totalBilled > 0 ? Math.round((totalCollected/totalBilled)*100) : 0}%)</div>
            </div>
          </div>

          <!-- Outstanding / Pending -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Outstanding Balance</span>
              <div class="metric-icon-wrap" style="color:var(--color-warning);">${QrewUI.getIcon('activity')}</div>
            </div>
            <div class="metric-value-row">
              <div class="metric-value">${formatMoney(totalPending)}</div>
              <div class="metric-subtext">${pendingInvoices.length} pending settlement</div>
            </div>
          </div>

          <!-- Overdue -->
          <div class="metric-card" style="${totalOverdue > 0 ? 'border-color:var(--color-danger);' : ''}">
            <div class="metric-header">
              <span class="metric-label">Overdue Invoices</span>
              <div class="metric-icon-wrap" style="color:var(--color-danger);">${QrewUI.getIcon('alert')}</div>
            </div>
            <div class="metric-value-row">
              <div class="metric-value" style="${totalOverdue > 0 ? 'color:var(--color-danger);' : ''}">${formatMoney(totalOverdue)}</div>
              <div class="metric-subtext" style="${totalOverdue > 0 ? 'color:var(--color-danger);font-weight:600;' : ''}">${overdueInvoices.length} past grace period</div>
            </div>
          </div>

          <!-- Net Margin -->
          <div class="metric-card">
            <div class="metric-header">
              <span class="metric-label">Operating Net Margin</span>
              <div class="metric-icon-wrap" style="color:var(--color-secondary);">${QrewUI.getIcon('overview')}</div>
            </div>
            <div class="metric-value-row">
              <div class="metric-value">${formatMoney(netMargin)}</div>
              <div class="metric-subtext" style="color:var(--color-success);">${marginPercent}% operational profit</div>
            </div>
          </div>
        </div>

        <!-- Navigation Tabs -->
        <div class="financial-tabs" style="display:flex;gap:8px;border-bottom:1px solid var(--color-border);margin-bottom:20px;">
          <button class="tab-btn ${state.activeTab === 'invoices' ? 'active' : ''}" id="tab-invoices" style="padding:10px 18px;font-size:14px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid ${state.activeTab === 'invoices' ? 'var(--panel-accent, var(--color-accent))' : 'transparent'};color:${state.activeTab === 'invoices' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};">
            ${QrewUI.getIcon('invoice')} Invoices & Billing (${invoices.length})
          </button>
          <button class="tab-btn ${state.activeTab === 'ledger' ? 'active' : ''}" id="tab-ledger" style="padding:10px 18px;font-size:14px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid ${state.activeTab === 'ledger' ? 'var(--panel-accent, var(--color-accent))' : 'transparent'};color:${state.activeTab === 'ledger' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};">
            ${QrewUI.getIcon('dollar')} Cash Flow Ledger (${transactions.length})
          </button>
          <button class="tab-btn ${state.activeTab === 'analytics' ? 'active' : ''}" id="tab-analytics" style="padding:10px 18px;font-size:14px;font-weight:600;border:none;background:none;cursor:pointer;border-bottom:2px solid ${state.activeTab === 'analytics' ? 'var(--panel-accent, var(--color-accent))' : 'transparent'};color:${state.activeTab === 'analytics' ? 'var(--color-text-primary)' : 'var(--color-text-muted)'};">
            ${QrewUI.getIcon('activity')} Financial Analytics
          </button>
        </div>

        <!-- TAB CONTENT 1: INVOICES & BILLING -->
        <div id="content-tab-invoices" style="${state.activeTab === 'invoices' ? 'display:block;' : 'display:none;'}">
          <div class="card" style="padding:20px;">
            <!-- Filter & Search Bar -->
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
              <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:240px;max-width:380px;">
                <div style="position:relative;width:100%;">
                  <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--color-text-muted);">${QrewUI.getIcon('search')}</span>
                  <input type="text" id="financial-search-input" class="form-input" style="padding-left:34px;width:100%;font-size:13px;" placeholder="Search invoice, client, vessel..." value="${QrewUI.escapeHtml(state.invoiceSearch)}">
                </div>
              </div>

              <!-- Status Pills -->
              <div class="status-pills" style="display:flex;gap:6px;flex-wrap:wrap;">
                ${['all', 'Paid', 'Pending', 'Overdue', 'Draft'].map(status => {
                  const count = status === 'all' ? invoices.length : invoices.filter(i => i.status === status).length;
                  const isSelected = state.statusFilter === status;
                  return `
                    <button class="btn ${isSelected ? 'btn-primary' : 'btn-secondary'} btn-filter-status" data-status="${status}" style="font-size:12px;padding:6px 12px;border-radius:16px;">
                      ${status === 'all' ? 'All' : status} (${count})
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Invoices Table -->
            ${filteredInvoices.length === 0 ? `
              <div style="text-align:center;padding:48px 20px;color:var(--color-text-muted);">
                <div style="margin-bottom:12px;">${QrewUI.getIcon('invoice')}</div>
                <h3 style="font-size:16px;font-weight:600;margin-bottom:4px;color:var(--color-text-primary);">No invoices found</h3>
                <p style="font-size:13px;margin:0 0 16px 0;">No billing records match your search or filter criteria.</p>
                <button class="btn btn-secondary" onclick="document.getElementById('financial-search-input').value='';document.querySelector('[data-status=all]').click();">
                  Reset Filters
                </button>
              </div>
            ` : `
              <div class="table-responsive" style="overflow-x:auto;">
                <table class="data-table" style="width:100%;border-collapse:collapse;font-size:13px;">
                  <thead>
                    <tr style="border-bottom:1px solid var(--color-border);text-align:left;color:var(--color-text-muted);font-weight:600;">
                      <th style="padding:10px 12px;">Invoice No</th>
                      <th style="padding:10px 12px;">Client / Partner</th>
                      <th style="padding:10px 12px;">Vessel / Service</th>
                      <th style="padding:10px 12px;">Issue Date</th>
                      <th style="padding:10px 12px;">Due Date</th>
                      <th style="padding:10px 12px;text-align:right;">Amount</th>
                      <th style="padding:10px 12px;text-align:center;">Status</th>
                      <th style="padding:10px 12px;text-align:right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredInvoices.map(inv => `
                      <tr style="border-bottom:1px solid var(--color-border-subtle);transition:background 0.15s ease;" onmouseover="this.style.backgroundColor='var(--color-surface)'" onmouseout="this.style.backgroundColor='transparent'">
                        <td style="padding:12px;">
                          <span class="id-badge" style="font-weight:700;cursor:pointer;" onclick="Qrew.views.office.openInvoicePreview('${inv.id}')" title="Click to view details">
                            ${QrewUI.escapeHtml(inv.invoiceNo)}
                          </span>
                        </td>
                        <td style="padding:12px;">
                          <div style="font-weight:600;color:var(--color-text-primary);">${QrewUI.escapeHtml(inv.clientName)}</div>
                          <div style="font-size:11px;color:var(--color-text-muted);">${QrewUI.escapeHtml(inv.clientCode || '')}</div>
                        </td>
                        <td style="padding:12px;">
                          <div style="color:var(--color-text-primary);">${QrewUI.escapeHtml(inv.vessel || 'General Call')}</div>
                          <div style="font-size:11px;color:var(--color-text-muted);">${QrewUI.escapeHtml(inv.voyageNo || '')}</div>
                        </td>
                        <td style="padding:12px;color:var(--color-text-muted);">${inv.issueDate}</td>
                        <td style="padding:12px;color:var(--color-text-muted);">${inv.dueDate}</td>
                        <td style="padding:12px;text-align:right;font-weight:700;color:var(--color-text-primary);">
                          ${formatMoney(inv.amount, inv.currencySymbol || '$')}
                        </td>
                        <td style="padding:12px;text-align:center;">
                          ${getInvoiceBadge(inv.status)}
                        </td>
                        <td style="padding:12px;text-align:right;">
                          <div style="display:inline-flex;gap:6px;align-items:center;">
                            <button class="btn btn-secondary btn-icon" style="padding:5px 8px;font-size:11px;" onclick="Qrew.views.office.openInvoicePreview('${inv.id}')" title="Preview / Print Invoice">
                              ${QrewUI.getIcon('file')} View
                            </button>
                            ${inv.status !== 'Paid' ? `
                              <button class="btn btn-secondary btn-icon" style="padding:5px 8px;font-size:11px;color:var(--color-success);" onclick="Qrew.views.office.quickMarkPaid('${inv.id}')" title="Mark as Paid">
                                ${QrewUI.getIcon('check')} Settle
                              </button>
                              <button class="btn btn-secondary btn-icon" style="padding:5px 8px;font-size:11px;" onclick="QrewUI.showToast('Payment reminder dispatched to ${QrewUI.escapeHtml(inv.clientName)}', 'info')" title="Send Reminder">
                                ${QrewUI.getIcon('bell')}
                              </button>
                            ` : ''}
                            <button class="btn btn-secondary btn-icon btn-danger-light" style="padding:5px 8px;font-size:11px;" onclick="Qrew.views.office.deleteInvoicePrompt('${inv.id}')" title="Delete Invoice">
                              ${QrewUI.getIcon('trash')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <!-- TAB CONTENT 2: CASH FLOW LEDGER -->
        <div id="content-tab-ledger" style="${state.activeTab === 'ledger' ? 'display:block;' : 'display:none;'}">
          <div class="card" style="padding:20px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:18px;">
              <div>
                <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700;">Operational Cash Flow & Disbursements</h3>
                <span style="font-size:12px;color:var(--color-text-muted);">Real-time audit log of incoming settlements and port disbursements.</span>
              </div>
              <div style="display:flex;gap:6px;">
                <button class="btn ${state.ledgerFilter === 'all' ? 'btn-primary' : 'btn-secondary'} btn-filter-ledger" data-type="all" style="font-size:12px;padding:6px 12px;border-radius:16px;">All</button>
                <button class="btn ${state.ledgerFilter === 'Credit' ? 'btn-primary' : 'btn-secondary'} btn-filter-ledger" data-type="Credit" style="font-size:12px;padding:6px 12px;border-radius:16px;">Credits (Inflows)</button>
                <button class="btn ${state.ledgerFilter === 'Debit' ? 'btn-primary' : 'btn-secondary'} btn-filter-ledger" data-type="Debit" style="font-size:12px;padding:6px 12px;border-radius:16px;">Debits (Outflows)</button>
              </div>
            </div>

            <div class="table-responsive" style="overflow-x:auto;">
              <table class="data-table" style="width:100%;border-collapse:collapse;font-size:13px;">
                <thead>
                  <tr style="border-bottom:1px solid var(--color-border);text-align:left;color:var(--color-text-muted);font-weight:600;">
                    <th style="padding:10px 12px;">Date</th>
                    <th style="padding:10px 12px;">Ref No</th>
                    <th style="padding:10px 12px;">Type</th>
                    <th style="padding:10px 12px;">Category</th>
                    <th style="padding:10px 12px;">Description</th>
                    <th style="padding:10px 12px;">Method</th>
                    <th style="padding:10px 12px;text-align:right;">Amount</th>
                    <th style="padding:10px 12px;text-align:center;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredTransactions.map(txn => `
                    <tr style="border-bottom:1px solid var(--color-border-subtle);">
                      <td style="padding:12px;color:var(--color-text-muted);">${txn.date}</td>
                      <td style="padding:12px;"><span class="id-badge">${QrewUI.escapeHtml(txn.reference)}</span></td>
                      <td style="padding:12px;">
                        ${txn.type === 'Credit'
                          ? `<span class="badge badge-active" style="color:var(--color-success);font-weight:700;">+ Credit</span>`
                          : `<span class="badge badge-expired" style="color:var(--color-danger);font-weight:700;">- Debit</span>`}
                      </td>
                      <td style="padding:12px;font-weight:600;">${QrewUI.escapeHtml(txn.category)}</td>
                      <td style="padding:12px;color:var(--color-text-muted);">${QrewUI.escapeHtml(txn.description)}</td>
                      <td style="padding:12px;"><span class="badge-role office">${QrewUI.escapeHtml(txn.method)}</span></td>
                      <td style="padding:12px;text-align:right;font-weight:700;${txn.type === 'Credit' ? 'color:var(--color-success);' : 'color:var(--color-danger);'}">
                        ${txn.type === 'Credit' ? '+' : '-'}${formatMoney(txn.amount)}
                      </td>
                      <td style="padding:12px;text-align:center;">
                        <span class="badge badge-active"><span class="badge-dot"></span>Completed</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- TAB CONTENT 3: FINANCIAL ANALYTICS -->
        <div id="content-tab-analytics" style="${state.activeTab === 'analytics' ? 'display:block;' : 'display:none;'}">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:20px;">
            <!-- Revenue by Client Partner -->
            <div class="card" style="padding:20px;">
              <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:700;">Revenue by Client Account</h3>
              <div style="display:flex;flex-direction:column;gap:14px;">
                ${[
                  { name: 'Apex Shipping Lines Ltd.', amount: 48500, percent: 34, color: '#3B82F6' },
                  { name: 'Maersk Bangladesh Ltd.', amount: 36200, percent: 25, color: '#10B981' },
                  { name: 'Cosco Shipping Lines', amount: 28900, percent: 20, color: '#8B5CF6' },
                  { name: 'Hapag-Lloyd Maritime', amount: 14850, percent: 11, color: '#F59E0B' },
                  { name: 'Evergreen Marine Corp', amount: 14400, percent: 10, color: '#EC4899' }
                ].map(item => `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                      <span style="font-weight:600;color:var(--color-text-primary);">${item.name}</span>
                      <span style="font-weight:700;">${formatMoney(item.amount)} (${item.percent}%)</span>
                    </div>
                    <div style="width:100%;height:8px;background:var(--color-border);border-radius:4px;overflow:hidden;">
                      <div style="width:${item.percent}%;height:100%;background:${item.color};border-radius:4px;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Operational Expense Breakdown -->
            <div class="card" style="padding:20px;">
              <h3 style="margin:0 0 16px 0;font-size:16px;font-weight:700;">Disbursement Categories</h3>
              <div style="display:flex;flex-direction:column;gap:14px;">
                ${[
                  { name: 'Port Authority Tariffs & Berthage', amount: 14200, percent: 49, color: '#EF4444' },
                  { name: 'Harbor Tug & Towage Assistance', amount: 5600, percent: 20, color: '#F97316' },
                  { name: 'Stevedoring & Heavy Lift Rental', amount: 3800, percent: 13, color: '#EAB308' },
                  { name: 'Customs & Regulatory Clearances', amount: 1950, percent: 7, color: '#6366F1' },
                  { name: 'Terminal Facility Retainers', amount: 3200, percent: 11, color: '#64748B' }
                ].map(item => `
                  <div>
                    <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                      <span style="font-weight:600;color:var(--color-text-primary);">${item.name}</span>
                      <span style="font-weight:700;">${formatMoney(item.amount)} (${item.percent}%)</span>
                    </div>
                    <div style="width:100%;height:8px;background:var(--color-border);border-radius:4px;overflow:hidden;">
                      <div style="width:${item.percent}%;height:100%;background:${item.color};border-radius:4px;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Attach Event Listeners
    setupEventListeners();
  };

  /**
   * DOM Listeners attachment
   */
  const setupEventListeners = () => {
    // Tab switching
    const tabInvoices = document.getElementById('tab-invoices');
    const tabLedger = document.getElementById('tab-ledger');
    const tabAnalytics = document.getElementById('tab-analytics');

    if (tabInvoices) {
      tabInvoices.onclick = () => {
        state.activeTab = 'invoices';
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    }
    if (tabLedger) {
      tabLedger.onclick = () => {
        state.activeTab = 'ledger';
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    }
    if (tabAnalytics) {
      tabAnalytics.onclick = () => {
        state.activeTab = 'analytics';
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    }

    // Search input
    const searchInput = document.getElementById('financial-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        state.invoiceSearch = e.target.value;
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
        const inputNow = document.getElementById('financial-search-input');
        if (inputNow) {
          inputNow.focus();
          inputNow.selectionStart = inputNow.selectionEnd = inputNow.value.length;
        }
      };
    }

    // Status filter pills
    document.querySelectorAll('.btn-filter-status').forEach(btn => {
      btn.onclick = (e) => {
        state.statusFilter = btn.getAttribute('data-status');
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    });

    // Ledger filter buttons
    document.querySelectorAll('.btn-filter-ledger').forEach(btn => {
      btn.onclick = (e) => {
        state.ledgerFilter = btn.getAttribute('data-type');
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    });

    // Action button: Create Invoice
    const createBtn = document.getElementById('btn-create-invoice');
    if (createBtn) {
      createBtn.onclick = () => openCreateInvoiceModal();
    }

    // Action button: Record Transaction
    const recordBtn = document.getElementById('btn-record-transaction');
    if (recordBtn) {
      recordBtn.onclick = () => openRecordTransactionModal();
    }

    // Action button: Export CSV
    const exportBtn = document.getElementById('btn-export-financials');
    if (exportBtn) {
      exportBtn.onclick = () => exportFinancialsCSV();
    }
  };

  /**
   * Modal: Create Invoice
   */
  const openCreateInvoiceModal = () => {
    const templates = QrewStore.getInvoiceTemplates(state.currentOfficeId);
    const clients = [
      { name: 'Apex Shipping Lines Ltd.', code: 'APEX-SHP' },
      { name: 'Maersk Bangladesh Ltd.', code: 'MAERSK-BD' },
      { name: 'Hapag-Lloyd Maritime', code: 'HL-MAR' },
      { name: 'Cosco Shipping Lines', code: 'COSCO-BD' },
      { name: 'Evergreen Marine Corp', code: 'EMC-LINE' },
      { name: 'MSC Mediterranean Shipping', code: 'MSC-MAR' }
    ];

    QrewUI.openModal({
      title: 'Generate New Office Invoice',
      bodyHtml: `
        <form id="create-invoice-form" style="display:flex;flex-direction:column;gap:14px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="inv-client">Client / Shipping Partner *</label>
              <select id="inv-client" class="form-input" required>
                ${clients.map(c => `<option value="${c.name}" data-code="${c.code}">${c.name} (${c.code})</option>`).join('')}
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="inv-template">Linked Invoice Template</label>
              <select id="inv-template" class="form-input">
                <option value="">Standard Maritime Invoice</option>
                ${templates.map(t => `<option value="${t.id}">${QrewUI.escapeHtml(t.name)} (${t.code})</option>`).join('')}
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="inv-vessel">Vessel / Project Name *</label>
              <input type="text" id="inv-vessel" class="form-input" placeholder="e.g. MV Banglar Protik" required>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="inv-voyage">Voyage / Call Reference</label>
              <input type="text" id="inv-voyage" class="form-input" placeholder="e.g. V-2026-14" value="V-2026-${Math.floor(10 + Math.random()*90)}">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="inv-amount">Total Billed Amount ($ USD) *</label>
              <input type="number" step="0.01" min="1" id="inv-amount" class="form-input" placeholder="e.g. 25000.00" required>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="inv-due">Payment Due Date *</label>
              <input type="date" id="inv-due" class="form-input" value="${new Date(Date.now() + 30*86400000).toISOString().split('T')[0]}" required>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="inv-desc">Primary Deliverable / Scope of Service</label>
            <input type="text" id="inv-desc" class="form-input" placeholder="e.g. Harbor Towage, Berth Hire & Port Clearance Dues" value="Maritime Port Agency, Berthing & Pilotage Assistance">
          </div>

          <div class="form-group">
            <label class="form-label" for="inv-notes">Disbursement Notes</label>
            <textarea id="inv-notes" class="form-input" rows="2" placeholder="Payment terms, bank details, or master sign-off notes..."></textarea>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-create-invoice">Issue Invoice</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#create-invoice-form');
        const submitBtn = modalEl.querySelector('#btn-submit-create-invoice');

        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const clientSelect = document.getElementById('inv-client');
          const clientName = clientSelect.value;
          const clientCode = clientSelect.options[clientSelect.selectedIndex].getAttribute('data-code');
          const vessel = document.getElementById('inv-vessel').value.trim();
          const voyageNo = document.getElementById('inv-voyage').value.trim();
          const amount = parseFloat(document.getElementById('inv-amount').value);
          const dueDate = document.getElementById('inv-due').value;
          const description = document.getElementById('inv-desc').value.trim();
          const notes = document.getElementById('inv-notes').value.trim();

          const newInv = QrewStore.createOfficeInvoice(state.currentOfficeId, {
            clientName,
            clientCode,
            vessel,
            voyageNo,
            amount,
            dueDate,
            description,
            notes,
            status: 'Pending'
          });

          QrewUI.closeModal();
          QrewUI.showToast(`Invoice ${newInv.invoiceNo} successfully generated for ${clientName}`, 'success');
          Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
        };
      }
    });
  };

  /**
   * Modal: Record Transaction (Payment / Disbursement)
   */
  const openRecordTransactionModal = () => {
    QrewUI.openModal({
      title: 'Record Financial Transaction',
      bodyHtml: `
        <form id="record-txn-form" style="display:flex;flex-direction:column;gap:14px;">
          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="txn-type">Transaction Type *</label>
              <select id="txn-type" class="form-input" required>
                <option value="Credit">Credit (Client Settlement Inflow)</option>
                <option value="Debit">Debit (Disbursement / Port Expense Outflow)</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="txn-amount">Amount ($ USD) *</label>
              <input type="number" step="0.01" min="1" id="txn-amount" class="form-input" placeholder="e.g. 15000.00" required>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="txn-category">Category *</label>
              <select id="txn-category" class="form-input">
                <option value="Client Settlement">Client Settlement</option>
                <option value="Port Authority Tariff">Port Authority Tariff</option>
                <option value="Towage & Marine Service">Towage & Marine Service</option>
                <option value="Stevedoring & Equipment">Stevedoring & Equipment</option>
                <option value="Customs & Regulatory">Customs & Regulatory</option>
                <option value="Operational Petty Cash">Operational Petty Cash</option>
              </select>
            </div>
            <div class="form-group" style="flex:1;">
              <label class="form-label" for="txn-method">Payment Method *</label>
              <select id="txn-method" class="form-input">
                <option value="SWIFT Wire">SWIFT Wire Transfer</option>
                <option value="Bank Draft">Bank Draft / Cheque</option>
                <option value="Letter of Credit">Letter of Credit (LC)</option>
                <option value="Pay Order">Pay Order</option>
                <option value="Cash Disbursement">Cash Disbursement</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="txn-desc">Transaction Description *</label>
            <input type="text" id="txn-desc" class="form-input" placeholder="e.g. Chittagong Port Authority Berthing tariff for NCT Berth 4" required>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-record-txn">Record Transaction</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#record-txn-form');
        const submitBtn = modalEl.querySelector('#btn-submit-record-txn');

        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const type = document.getElementById('txn-type').value;
          const amount = parseFloat(document.getElementById('txn-amount').value);
          const category = document.getElementById('txn-category').value;
          const method = document.getElementById('txn-method').value;
          const description = document.getElementById('txn-desc').value.trim();

          const txn = QrewStore.createOfficeTransaction(state.currentOfficeId, {
            type,
            amount,
            category,
            method,
            description
          });

          QrewUI.closeModal();
          QrewUI.showToast(`Transaction ${txn.reference} logged successfully (${type}: $${amount.toLocaleString()})`, 'success');
          Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
        };
      }
    });
  };

  /**
   * Modal: Full Invoice Details & Print Preview
   */
  Qrew.views.office.openInvoicePreview = (invoiceId) => {
    const inv = QrewStore.getOfficeInvoiceById(invoiceId);
    if (!inv) return;

    const office = QrewStore.getOfficeById(inv.officeId);
    const tenant = QrewStore.getTenantById(inv.tenantId);

    const subtotal = inv.items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
    const tax = subtotal * 0.15; // 15% VAT
    const grandTotal = subtotal + tax;

    QrewUI.openModal({
      title: `Invoice Details — ${inv.invoiceNo}`,
      bodyHtml: `
        <div id="printable-invoice" style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;font-family:inherit;">
          <!-- Invoice Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid var(--color-border);padding-bottom:16px;margin-bottom:18px;">
            <div>
              <div style="font-size:22px;font-weight:800;color:var(--panel-accent, var(--color-accent));">${tenant ? QrewUI.escapeHtml(tenant.name) : 'SST Port Agency'}</div>
              <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);margin-top:2px;">${office ? QrewUI.escapeHtml(office.name) : 'Chittagong Port Office'}</div>
              <div style="font-size:12px;color:var(--color-text-muted);">${office ? QrewUI.escapeHtml(office.location) : 'Agrabad C/A, Chittagong, Bangladesh'}</div>
              <div style="font-size:12px;color:var(--color-text-muted);">Email: agency@sst.com | Tel: +880 1711-234567</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:20px;font-weight:800;letter-spacing:1px;color:var(--color-text-primary);">COMMERCIAL INVOICE</div>
              <div style="font-size:14px;font-weight:700;color:var(--color-accent);">${QrewUI.escapeHtml(inv.invoiceNo)}</div>
              <div style="font-size:12px;margin-top:4px;">${getInvoiceBadge(inv.status)}</div>
            </div>
          </div>

          <!-- Vessel & Client Metadata Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:12px;background:var(--color-surface-white);border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-bottom:20px;font-size:12px;">
            <div>
              <div style="color:var(--color-text-muted);text-transform:uppercase;font-size:10px;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">Billed To (Client):</div>
              <div style="font-weight:700;font-size:13px;color:var(--color-text-primary);">${QrewUI.escapeHtml(inv.clientName)}</div>
              <div style="color:var(--color-text-muted);">${QrewUI.escapeHtml(inv.clientCode || 'Verified Account')}</div>
            </div>
            <div style="text-align:right;">
              <div><strong>Vessel:</strong> ${QrewUI.escapeHtml(inv.vessel || 'N/A')}</div>
              <div><strong>Voyage No:</strong> ${QrewUI.escapeHtml(inv.voyageNo || 'N/A')}</div>
              <div><strong>Date of Issue:</strong> ${inv.issueDate}</div>
              <div><strong>Payment Due:</strong> ${inv.dueDate}</div>
            </div>
          </div>

          <!-- Line Items Table -->
          <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px;">
            <thead>
              <tr style="border-bottom:1px solid var(--color-border);background:var(--color-surface);color:var(--color-text-muted);font-weight:700;">
                <th style="padding:8px 12px;text-align:left;">#</th>
                <th style="padding:8px 12px;text-align:left;">Deliverable / Service Particulars</th>
                <th style="padding:8px 12px;text-align:right;">Amount (USD)</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map((it, idx) => `
                <tr style="border-bottom:1px solid var(--color-border-subtle);">
                  <td style="padding:10px 12px;color:var(--color-text-muted);">${idx + 1}</td>
                  <td style="padding:10px 12px;font-weight:500;">${QrewUI.escapeHtml(it.name)}</td>
                  <td style="padding:10px 12px;text-align:right;font-weight:600;">$${Number(it.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <!-- Financial Calculation Totals -->
          <div style="display:flex;justify-content:flex-end;margin-bottom:18px;">
            <div style="width:260px;font-size:13px;">
              <div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--color-text-muted);">
                <span>Subtotal:</span>
                <span style="font-weight:600;color:var(--color-text-primary);">$${subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:4px 0;color:var(--color-text-muted);">
                <span>Port & Govt VAT (15%):</span>
                <span style="font-weight:600;color:var(--color-text-primary);">$${tax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--color-border);font-size:15px;font-weight:800;color:var(--panel-accent, var(--color-accent));">
                <span>Grand Total:</span>
                <span>$${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          <!-- Notes -->
          ${inv.notes ? `
            <div style="font-size:12px;color:var(--color-text-muted);background:var(--color-surface-white);padding:10px;border-radius:var(--radius-sm);border:1px solid var(--color-border);">
              <strong>Remarks:</strong> ${QrewUI.escapeHtml(inv.notes)}
            </div>
          ` : ''}
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Close</button>
        <button class="btn btn-outline" onclick="window.print()">
          ${QrewUI.getIcon('file')} Print Invoice
        </button>
        ${inv.status !== 'Paid' ? `
          <button class="btn btn-primary" onclick="Qrew.views.office.quickMarkPaid('${inv.id}')">
            ${QrewUI.getIcon('check')} Mark as Paid
          </button>
        ` : ''}
      `
    });
  };

  /**
   * Action: Quick Mark Paid
   */
  Qrew.views.office.quickMarkPaid = (invoiceId) => {
    const inv = QrewStore.getOfficeInvoiceById(invoiceId);
    if (!inv) return;

    QrewStore.updateOfficeInvoiceStatus(invoiceId, 'Paid');

    // Automatically record corresponding credit transaction in ledger
    QrewStore.createOfficeTransaction(inv.officeId, {
      type: 'Credit',
      amount: inv.amount,
      category: 'Client Settlement',
      method: 'SWIFT Wire',
      description: `Settlement received for ${inv.invoiceNo} (${inv.clientName})`
    });

    QrewUI.closeModal();
    QrewUI.showToast(`Invoice ${inv.invoiceNo} marked as Paid. Transaction credited to cash flow.`, 'success');
    Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
  };

  /**
   * Action: Delete Invoice Prompt
   */
  Qrew.views.office.deleteInvoicePrompt = (invoiceId) => {
    const inv = QrewStore.getOfficeInvoiceById(invoiceId);
    if (!inv) return;

    QrewUI.confirmDialog({
      title: 'Delete Invoice?',
      message: `Are you sure you want to permanently delete invoice "${inv.invoiceNo}" for ${inv.clientName}? This action is irreversible.`,
      confirmLabel: 'Delete Invoice',
      confirmVariant: 'danger',
      onConfirm: () => {
        QrewStore.deleteOfficeInvoice(invoiceId);
        QrewUI.showToast(`Invoice ${inv.invoiceNo} was deleted.`, 'info');
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      }
    });
  };

  /**
   * Action: Export Financials to CSV
   */
  const exportFinancialsCSV = () => {
    const invoices = QrewStore.getOfficeInvoices(state.currentOfficeId);
    if (!invoices || !invoices.length) {
      QrewUI.showToast('No invoices to export.', 'warning');
      return;
    }

    const headers = ['Invoice No', 'Client Name', 'Client Code', 'Vessel', 'Voyage', 'Issue Date', 'Due Date', 'Amount (USD)', 'Status'];
    const rows = invoices.map(i => [
      `"${i.invoiceNo}"`,
      `"${i.clientName}"`,
      `"${i.clientCode || ''}"`,
      `"${i.vessel || ''}"`,
      `"${i.voyageNo || ''}"`,
      `"${i.issueDate}"`,
      `"${i.dueDate}"`,
      i.amount,
      `"${i.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Office_Financials_Report_${state.currentOfficeId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    QrewUI.showToast('Financial CSV report downloaded.', 'success');
  };
})();
