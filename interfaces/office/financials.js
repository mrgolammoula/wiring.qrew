/**
 * Interface: Office Workspace — Financials Dashboard
 * Matches Reference UI (qrew-six.vercel.app/dashboard/financials)
 * Implements Expenses, Requisitions, and Wallets with exact column order:
 * 'File / Project' -> 'Spent By' -> 'Category' -> 'Description' -> 'Date' -> 'Amount'
 */
(() => {
  const Qrew = window.Qrew;

  if (!Qrew.views.office) {
    Qrew.views.office = {};
  }

  // Module state
  const state = {
    activeTab: 'expenses', // 'expenses' | 'requisitions' | 'wallets'
    searchTerm: '',
    currentOfficeId: null,
    currentTenantId: null
  };

  /**
   * Currency formatter helper
   */
  const formatMoney = (amount, symbol = '$') => {
    return `${symbol}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * Status badge helper for requisitions
   */
  const getRequisitionBadge = (status) => {
    const s = (status || 'Pending').toLowerCase();
    if (s === 'approved' || s === 'disbursed') {
      return `<span class="badge badge-active"><span class="badge-dot"></span>${QrewUI.escapeHtml(status)}</span>`;
    } else if (s === 'pending') {
      return `<span class="badge badge-pending"><span class="badge-dot"></span>Pending</span>`;
    } else if (s === 'rejected') {
      return `<span class="badge badge-expired"><span class="badge-dot"></span>Rejected</span>`;
    }
    return `<span class="badge badge-pending">${QrewUI.escapeHtml(status)}</span>`;
  };

  /**
   * Main Financials View Renderer
   */
  Qrew.views.office.renderFinancials = (officeId, tenantId) => {
    state.currentOfficeId = officeId || Qrew.state.currentOfficeId || 'off_ctg_port';
    state.currentTenantId = tenantId || Qrew.state.currentTenantId || 'ten_sst';

    const office = QrewStore.getOfficeById(state.currentOfficeId);
    const expenses = QrewStore.getOfficeExpenses(state.currentOfficeId);
    const requisitions = QrewStore.getOfficeRequisitions(state.currentOfficeId);
    const wallets = QrewStore.getOfficeWallets(state.currentOfficeId);

    // Filter expenses by search if present
    const filteredExpenses = expenses.filter(exp => {
      if (!state.searchTerm) return true;
      const q = state.searchTerm.toLowerCase();
      return (exp.fileProject && exp.fileProject.toLowerCase().includes(q)) ||
        (exp.spentBy && exp.spentBy.toLowerCase().includes(q)) ||
        (exp.category && exp.category.toLowerCase().includes(q)) ||
        (exp.description && exp.description.toLowerCase().includes(q));
    });

    // Render HTML shell matching the reference image layout
    Qrew.dom.mainContent.innerHTML = `
      <div class="financials-dashboard" style="max-width: 1200px; margin: 0 auto; padding: 4px 0 32px 0;">
        
        <!-- Header Section -->
        <div class="financials-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <h1 class="page-title" style="font-size: 26px; font-weight: 700; color: var(--color-text-primary); margin: 0 0 6px 0;">
              Financials Dashboard
            </h1>
            <p style="font-size: 14px; color: var(--color-text-muted); margin: 0;">
              Manage organizational expenses and fund requisitions.
            </p>
          </div>

          <!-- Top-right Action Buttons -->
          <div class="header-actions" style="display: flex; align-items: center; gap: 12px;">
            <button class="btn btn-secondary" id="btn-request-funds" style="padding: 8px 16px; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Request Funds
            </button>
            <button class="btn" id="btn-log-expense" style="background-color: #059669; color: #FFFFFF; border: 1px solid #059669; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: var(--radius-sm); display: inline-flex; align-items: center; gap: 6px; box-shadow: var(--shadow-xs);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Log Expense
            </button>
          </div>
        </div>

        <!-- Sub-navigation Tabs (Pill style matching reference image) -->
        <div class="tabs-container" style="display: inline-flex; background: var(--color-surface, #F1F5F9); padding: 4px; border-radius: 8px; margin-bottom: 20px; border: 1px solid var(--color-border-subtle, #E2E8F0);">
          <button class="tab-pill ${state.activeTab === 'expenses' ? 'active' : ''}" id="tab-expenses" style="padding: 6px 16px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; border-radius: 6px; transition: all 0.15s ease; ${state.activeTab === 'expenses' ? 'background: #FFFFFF; color: var(--color-text-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: var(--color-text-muted);'}">
            Expenses
          </button>
          <button class="tab-pill ${state.activeTab === 'requisitions' ? 'active' : ''}" id="tab-requisitions" style="padding: 6px 16px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; border-radius: 6px; transition: all 0.15s ease; ${state.activeTab === 'requisitions' ? 'background: #FFFFFF; color: var(--color-text-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: var(--color-text-muted);'}">
            Requisitions
          </button>
          <button class="tab-pill ${state.activeTab === 'wallets' ? 'active' : ''}" id="tab-wallets" style="padding: 6px 16px; font-size: 13px; font-weight: 500; border: none; cursor: pointer; border-radius: 6px; transition: all 0.15s ease; ${state.activeTab === 'wallets' ? 'background: #FFFFFF; color: var(--color-text-primary); font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.08);' : 'background: transparent; color: var(--color-text-muted);'}">
            Wallets
          </button>
        </div>

        <!-- TAB 1: EXPENSES TABLE -->
        <div id="content-expenses" style="${state.activeTab === 'expenses' ? 'display:block;' : 'display:none;'}">
          <div class="card" style="background: var(--color-surface-white, #FFFFFF); border: 1px solid var(--color-border, #E2E8F0); border-radius: var(--radius-md, 8px); overflow: hidden; box-shadow: var(--shadow-xs);">
            
            ${filteredExpenses.length === 0 ? `
              <!-- Empty state matching reference image -->
              <div style="padding: 80px 20px; text-align: center; color: var(--color-text-muted);">
                <p style="font-size: 14px; margin: 0; color: var(--color-text-muted);">No expenses found.</p>
              </div>
            ` : `
              <div class="table-responsive" style="overflow-x: auto;">
                <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--color-border, #E2E8F0); text-align: left; color: var(--color-text-muted); font-size: 12px; font-weight: 600;">
                      <th style="padding: 14px 18px; width: 22%;">File / Project</th>
                      <th style="padding: 14px 18px; width: 15%;">Spent By</th>
                      <th style="padding: 14px 18px; width: 16%;">Category</th>
                      <th style="padding: 14px 18px; width: 25%;">Description</th>
                      <th style="padding: 14px 18px; width: 11%;">Date</th>
                      <th style="padding: 14px 18px; width: 11%; text-align: right;">Amount</th>
                      <th style="padding: 14px 14px; width: 5%; text-align: center;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${filteredExpenses.map(exp => `
                      <tr style="border-bottom: 1px solid var(--color-border-subtle, #F1F5F9); transition: background 0.15s ease;" onmouseover="this.style.backgroundColor='var(--color-surface)'" onmouseout="this.style.backgroundColor='transparent'">
                        
                        <!-- 1. File / Project -->
                        <td style="padding: 14px 18px; font-weight: 600; color: var(--color-text-primary);">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="color: var(--panel-accent, var(--color-accent));">${QrewUI.getIcon('folder')}</span>
                            <span>${QrewUI.escapeHtml(exp.fileProject)}</span>
                          </div>
                        </td>

                        <!-- 2. Spent By -->
                        <td style="padding: 14px 18px; color: var(--color-text-primary);">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--color-surface); border: 1px solid var(--color-border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--color-text-primary);">
                              ${exp.spentBy ? exp.spentBy.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <span style="font-weight: 500;">${QrewUI.escapeHtml(exp.spentBy)}</span>
                          </div>
                        </td>

                        <!-- 3. Category -->
                        <td style="padding: 14px 18px;">
                          <span class="badge-role office" style="font-size: 11px; padding: 3px 8px; border-radius: 4px; background: var(--color-surface); border: 1px solid var(--color-border);">
                            ${QrewUI.escapeHtml(exp.category)}
                          </span>
                        </td>

                        <!-- 4. Description -->
                        <td style="padding: 14px 18px; color: var(--color-text-secondary); line-height: 1.4;">
                          ${QrewUI.escapeHtml(exp.description)}
                        </td>

                        <!-- 5. Date -->
                        <td style="padding: 14px 18px; color: var(--color-text-muted); font-size: 12px; white-space: nowrap;">
                          ${exp.date}
                        </td>

                        <!-- 6. Amount -->
                        <td style="padding: 14px 18px; text-align: right; font-weight: 700; color: var(--color-text-primary); font-size: 13px; white-space: nowrap;">
                          ${formatMoney(exp.amount, '$')}
                        </td>

                        <!-- Action / Delete -->
                        <td style="padding: 14px 14px; text-align: center;">
                          <button class="btn btn-secondary btn-icon btn-danger-light" style="padding: 4px 6px; font-size: 11px; border: none;" onclick="Qrew.views.office.deleteExpensePrompt('${exp.id}')" title="Delete Expense">
                            ${QrewUI.getIcon('trash')}
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <!-- TAB 2: REQUISITIONS TABLE -->
        <div id="content-requisitions" style="${state.activeTab === 'requisitions' ? 'display:block;' : 'display:none;'}">
          <div class="card" style="background: var(--color-surface-white, #FFFFFF); border: 1px solid var(--color-border, #E2E8F0); border-radius: var(--radius-md, 8px); overflow: hidden; box-shadow: var(--shadow-xs);">
            ${requisitions.length === 0 ? `
              <div style="padding: 80px 20px; text-align: center; color: var(--color-text-muted);">
                <p style="font-size: 14px; margin: 0; color: var(--color-text-muted);">No requisitions found.</p>
              </div>
            ` : `
              <div class="table-responsive" style="overflow-x: auto;">
                <table class="data-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
                  <thead>
                    <tr style="border-bottom: 1px solid var(--color-border, #E2E8F0); text-align: left; color: var(--color-text-muted); font-size: 12px; font-weight: 600;">
                      <th style="padding: 14px 18px;">Requisition #</th>
                      <th style="padding: 14px 18px;">Requested By</th>
                      <th style="padding: 14px 18px;">Category</th>
                      <th style="padding: 14px 18px;">Purpose / Reason</th>
                      <th style="padding: 14px 18px;">Date</th>
                      <th style="padding: 14px 18px; text-align: right;">Amount</th>
                      <th style="padding: 14px 18px; text-align: center;">Status</th>
                      <th style="padding: 14px 18px; text-align: right;">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${requisitions.map(req => `
                      <tr style="border-bottom: 1px solid var(--color-border-subtle, #F1F5F9);">
                        <td style="padding: 14px 18px; font-weight: 700;">
                          <span class="id-badge">${QrewUI.escapeHtml(req.requisitionNo)}</span>
                        </td>
                        <td style="padding: 14px 18px; font-weight: 500;">${QrewUI.escapeHtml(req.requestedBy)}</td>
                        <td style="padding: 14px 18px;"><span class="badge-role office">${QrewUI.escapeHtml(req.category)}</span></td>
                        <td style="padding: 14px 18px; color: var(--color-text-secondary);">${QrewUI.escapeHtml(req.purpose)}</td>
                        <td style="padding: 14px 18px; color: var(--color-text-muted); font-size: 12px;">${req.date}</td>
                        <td style="padding: 14px 18px; text-align: right; font-weight: 700; color: var(--color-text-primary);">${formatMoney(req.amount)}</td>
                        <td style="padding: 14px 18px; text-align: center;">${getRequisitionBadge(req.status)}</td>
                        <td style="padding: 14px 18px; text-align: right;">
                          ${req.status === 'Pending' ? `
                            <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px; color: var(--color-success);" onclick="Qrew.views.office.approveRequisition('${req.id}')">
                              Approve
                            </button>
                          ` : `
                            <span style="font-size: 12px; color: var(--color-text-muted);">Reconciled</span>
                          `}
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `}
          </div>
        </div>

        <!-- TAB 3: WALLETS -->
        <div id="content-wallets" style="${state.activeTab === 'wallets' ? 'display:block;' : 'display:none;'}">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 18px;">
            ${wallets.map(w => {
              const percent = w.monthlyLimit > 0 ? Math.min(100, Math.round((w.spentThisMonth / w.monthlyLimit) * 100)) : 0;
              return `
                <div class="card" style="background: var(--color-surface-white, #FFFFFF); border: 1px solid var(--color-border, #E2E8F0); border-radius: var(--radius-md, 8px); padding: 20px; box-shadow: var(--shadow-xs);">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                    <div style="font-weight: 700; font-size: 15px; color: var(--color-text-primary);">${QrewUI.escapeHtml(w.name)}</div>
                    <div style="width: 32px; height: 32px; border-radius: 8px; background: ${w.color}15; color: ${w.color}; display: flex; align-items: center; justify-content: center;">
                      ${QrewUI.getIcon(w.icon || 'dollar')}
                    </div>
                  </div>

                  <div style="margin-bottom: 16px;">
                    <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--color-text-muted); font-weight: 600;">Available Balance</span>
                    <div style="font-size: 26px; font-weight: 800; color: var(--color-text-primary); margin-top: 2px;">
                      ${formatMoney(w.balance)}
                    </div>
                  </div>

                  <div style="border-top: 1px solid var(--color-border-subtle); padding-top: 14px; margin-bottom: 14px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                      <span style="color: var(--color-text-muted);">Monthly Spent</span>
                      <span style="font-weight: 600;">${formatMoney(w.spentThisMonth)} / ${formatMoney(w.monthlyLimit)}</span>
                    </div>
                    <div style="width: 100%; height: 6px; background: var(--color-border); border-radius: 3px; overflow: hidden;">
                      <div style="width: ${percent}%; height: 100%; background: ${w.color}; border-radius: 3px;"></div>
                    </div>
                  </div>

                  <button class="btn btn-secondary" style="width: 100%; font-size: 12px; padding: 7px 12px;" onclick="Qrew.views.office.topUpWalletPrompt('${w.id}', '${QrewUI.escapeHtml(w.name)}')">
                    ${QrewUI.getIcon('plus')} Top Up Balance
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

      </div>
    `;

    // Attach Event Handlers
    attachHandlers();
  };

  /**
   * DOM Event Listeners
   */
  const attachHandlers = () => {
    // Tab switching
    const tabExpenses = document.getElementById('tab-expenses');
    const tabRequisitions = document.getElementById('tab-requisitions');
    const tabWallets = document.getElementById('tab-wallets');

    if (tabExpenses) {
      tabExpenses.onclick = () => {
        state.activeTab = 'expenses';
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    }
    if (tabRequisitions) {
      tabRequisitions.onclick = () => {
        state.activeTab = 'requisitions';
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    }
    if (tabWallets) {
      tabWallets.onclick = () => {
        state.activeTab = 'wallets';
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      };
    }

    // Top action buttons
    const logExpenseBtn = document.getElementById('btn-log-expense');
    if (logExpenseBtn) {
      logExpenseBtn.onclick = () => openLogExpenseModal();
    }

    const requestFundsBtn = document.getElementById('btn-request-funds');
    if (requestFundsBtn) {
      requestFundsBtn.onclick = () => openRequestFundsModal();
    }
  };

  /**
   * Modal: Log Expense
   * Fields correspond to the table columns:
   * 'File / Project', 'Spent By', 'Category', 'Description', 'Date', 'Amount'
   */
  const openLogExpenseModal = () => {
    const operationalFiles = QrewStore.getOperationalFiles(state.currentOfficeId);
    const officeStaff = QrewStore.getOfficeStaff(state.currentOfficeId);
    const wallets = QrewStore.getOfficeWallets(state.currentOfficeId);

    const categories = [
      'Port Authority Tariffs',
      'Towage & Harbor Pilotage',
      'Logistics & Transport',
      'Customs & Regulatory',
      'Stevedoring & Heavy Lift',
      'Office & Facilities',
      'Fuel & Bunker',
      'Meals & Operations Welfare'
    ];

    QrewUI.openModal({
      title: 'Log New Expense',
      bodyHtml: `
        <form id="log-expense-form" style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- File / Project -->
          <div class="form-group">
            <label class="form-label" for="exp-file-project">File / Project *</label>
            <input list="projects-list" id="exp-file-project" class="form-input" placeholder="Select or type file / project (e.g. PRJ-CTG-0042)" required>
            <datalist id="projects-list">
              ${operationalFiles.map(f => `<option value="${f.fileCode} (${f.title})">`).join('')}
              <option value="General Operations">
              <option value="PRJ-CTG-0042 (MV Meghna Harmony)">
              <option value="PRJ-CTG-0041 (MV Northern Diamond)">
              <option value="PRJ-CTG-0039 (MV Ocean Voyager)">
              <option value="PRJ-CTG-0038 (MV Banglar Samriddhi)">
            </datalist>
          </div>

          <div class="form-row">
            <!-- Spent By -->
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="exp-spent-by">Spent By *</label>
              <input list="staff-list" id="exp-spent-by" class="form-input" placeholder="Person who spent" required>
              <datalist id="staff-list">
                ${officeStaff.map(s => `<option value="${s.user.name}">`).join('')}
                <option value="Rafiqul Islam">
                <option value="Jack Rahman">
                <option value="Nusrat Jahan">
              </datalist>
            </div>

            <!-- Category -->
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="exp-category">Category *</label>
              <select id="exp-category" class="form-input" required>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
              </select>
            </div>
          </div>

          <!-- Description -->
          <div class="form-group">
            <label class="form-label" for="exp-desc">Description *</label>
            <input type="text" id="exp-desc" class="form-input" placeholder="What was the expenditure for?" required>
          </div>

          <div class="form-row">
            <!-- Date -->
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="exp-date">Date *</label>
              <input type="date" id="exp-date" class="form-input" value="${new Date().toISOString().split('T')[0]}" required>
            </div>

            <!-- Amount -->
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="exp-amount">Amount ($ USD) *</label>
              <input type="number" step="0.01" min="0.01" id="exp-amount" class="form-input" placeholder="0.00" required>
            </div>
          </div>

          <!-- Wallet Source -->
          <div class="form-group">
            <label class="form-label" for="exp-wallet">Deduct From Wallet</label>
            <select id="exp-wallet" class="form-input">
              ${wallets.map(w => `<option value="${w.name}">${w.name} (Balance: $${w.balance.toLocaleString()})</option>`).join('')}
            </select>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn" id="btn-submit-log-expense" style="background-color: #059669; color: #FFFFFF; border: 1px solid #059669; font-weight: 600;">Save Expense</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#log-expense-form');
        const submitBtn = modalEl.querySelector('#btn-submit-log-expense');

        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const fileProject = document.getElementById('exp-file-project').value.trim();
          const spentBy = document.getElementById('exp-spent-by').value.trim();
          const category = document.getElementById('exp-category').value;
          const description = document.getElementById('exp-desc').value.trim();
          const date = document.getElementById('exp-date').value;
          const amount = parseFloat(document.getElementById('exp-amount').value);
          const wallet = document.getElementById('exp-wallet').value;

          QrewStore.createOfficeExpense(state.currentOfficeId, {
            fileProject,
            spentBy,
            category,
            description,
            date,
            amount,
            wallet
          });

          QrewUI.closeModal();
          QrewUI.showToast(`Expense of $${amount.toFixed(2)} recorded for "${fileProject}"`, 'success');
          state.activeTab = 'expenses';
          Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
        };
      }
    });
  };

  /**
   * Modal: Request Funds
   */
  const openRequestFundsModal = () => {
    const officeStaff = QrewStore.getOfficeStaff(state.currentOfficeId);
    const wallets = QrewStore.getOfficeWallets(state.currentOfficeId);

    QrewUI.openModal({
      title: 'Request Operational Funds',
      bodyHtml: `
        <form id="request-funds-form" style="display: flex; flex-direction: column; gap: 14px;">
          <div class="form-group">
            <label class="form-label" for="req-purpose">Purpose / Requisition Reason *</label>
            <input type="text" id="req-purpose" class="form-input" placeholder="e.g. Harbor tugboat fuel advance for vessel berthing" required>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="req-amount">Amount Requested ($ USD) *</label>
              <input type="number" step="0.01" min="1" id="req-amount" class="form-input" placeholder="0.00" required>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="req-category">Category *</label>
              <select id="req-category" class="form-input">
                <option value="Port Operations">Port Operations</option>
                <option value="Customs Clearance">Customs Clearance</option>
                <option value="Petty Cash">Petty Cash Replenishment</option>
                <option value="Emergency Disbursal">Emergency Disbursal</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="req-by">Requested By *</label>
              <input list="req-staff-list" id="req-by" class="form-input" placeholder="Staff Name" required>
              <datalist id="req-staff-list">
                ${officeStaff.map(s => `<option value="${s.user.name}">`).join('')}
                <option value="Jack Rahman">
                <option value="Rafiqul Islam">
                <option value="Nusrat Jahan">
              </datalist>
            </div>
            <div class="form-group" style="flex: 1;">
              <label class="form-label" for="req-wallet">Target Wallet</label>
              <select id="req-wallet" class="form-input">
                ${wallets.map(w => `<option value="${w.name}">${w.name}</option>`).join('')}
              </select>
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-req-funds">Submit Requisition</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#request-funds-form');
        const submitBtn = modalEl.querySelector('#btn-submit-req-funds');

        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }

          const purpose = document.getElementById('req-purpose').value.trim();
          const amount = parseFloat(document.getElementById('req-amount').value);
          const category = document.getElementById('req-category').value;
          const requestedBy = document.getElementById('req-by').value.trim();
          const wallet = document.getElementById('req-wallet').value;

          const req = QrewStore.createOfficeRequisition(state.currentOfficeId, {
            purpose,
            amount,
            category,
            requestedBy,
            wallet
          });

          QrewUI.closeModal();
          QrewUI.showToast(`Fund requisition ${req.requisitionNo} submitted for approval`, 'success');
          state.activeTab = 'requisitions';
          Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
        };
      }
    });
  };

  /**
   * Action: Delete Expense Prompt
   */
  Qrew.views.office.deleteExpensePrompt = (id) => {
    QrewUI.confirmDialog({
      title: 'Delete Expense Record?',
      message: 'Are you sure you want to delete this expense record? This will remove the voucher from the financial records.',
      confirmLabel: 'Delete Expense',
      confirmVariant: 'danger',
      onConfirm: () => {
        QrewStore.deleteOfficeExpense(id);
        QrewUI.showToast('Expense record deleted.', 'info');
        Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
      }
    });
  };

  /**
   * Action: Approve Requisition
   */
  Qrew.views.office.approveRequisition = (id) => {
    QrewStore.updateOfficeRequisitionStatus(id, 'Approved');
    QrewUI.showToast('Requisition approved and scheduled for disbursement.', 'success');
    Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
  };

  /**
   * Action: Top Up Wallet
   */
  Qrew.views.office.topUpWalletPrompt = (id, name) => {
    QrewUI.openModal({
      title: `Top Up ${name}`,
      bodyHtml: `
        <div style="margin-bottom: 12px; font-size: 13px; color: var(--color-text-muted);">
          Allocate additional operating budget to this wallet.
        </div>
        <div class="form-group">
          <label class="form-label" for="topup-amount">Top Up Amount ($ USD) *</label>
          <input type="number" step="100" min="50" id="topup-amount" class="form-input" value="1000" required>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-confirm-topup">Add Funds</button>
      `,
      onOpen: (modalEl) => {
        const confirmBtn = modalEl.querySelector('#btn-confirm-topup');
        confirmBtn.onclick = () => {
          const amt = parseFloat(document.getElementById('topup-amount').value);
          if (!amt || amt <= 0) return;
          QrewStore.topUpOfficeWallet(id, amt);
          QrewUI.closeModal();
          QrewUI.showToast(`$${amt.toLocaleString()} added to ${name}`, 'success');
          Qrew.views.office.renderFinancials(state.currentOfficeId, state.currentTenantId);
        };
      }
    });
  };
})();
