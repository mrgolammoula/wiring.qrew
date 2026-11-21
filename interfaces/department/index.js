/**
 * Interface: Department Workspace (KPIs, Staff Roster, Operational Queue)
 */
(() => {
  const Qrew = window.Qrew;

  const openCreateDeptTaskModal = (deptId) => {
    const dept = QrewStore.getDepartmentById(deptId);
    if (!dept) return;

    QrewUI.openModal({
      title: `Add Operational Task to ${dept.name}`,
      bodyHtml: `
        <form id="create-dept-task-form">
          <div class="form-group">
            <label class="form-label" for="task-title">Task Description / Duty *</label>
            <input type="text" id="task-title" class="form-input" placeholder="e.g. Inspect dock container crane safety seal" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="task-category">Category *</label>
              <select id="task-category" class="form-input">
                <option value="Inspection">Inspection</option>
                <option value="Compliance">Compliance</option>
                <option value="Dispatch">Dispatch</option>
                <option value="Security">Security</option>
                <option value="Reporting">Reporting</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="task-priority">Priority *</label>
              <select id="task-priority" class="form-input">
                <option value="High">High</option>
                <option value="Normal" selected>Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="task-due">Due Time</label>
              <input type="text" id="task-due" class="form-input" value="03:00 PM">
            </div>
            <div class="form-group">
              <label class="form-label" for="task-assignee">Assign To Member</label>
              <select id="task-assignee" class="form-input">
                ${QrewStore.getDepartmentMembers(deptId).map(m => `
                  <option value="${m.userId}">${QrewUI.escapeHtml(m.user.name)} (${m.deptRole})</option>
                `).join('')}
              </select>
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-dept-task">Queue Task</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#create-dept-task-form');
        const submitBtn = modalEl.querySelector('#btn-submit-dept-task');
        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          const title = document.getElementById('task-title').value.trim();
          const category = document.getElementById('task-category').value;
          const priority = document.getElementById('task-priority').value;
          const dueTime = document.getElementById('task-due').value.trim();
          const userId = document.getElementById('task-assignee').value || 'usr_nusrat';

          QrewStore.createMemberTask(userId, deptId, title, priority, dueTime, category);
          QrewUI.closeModal();
          QrewUI.showToast('Task added to department operational queue.', 'success');
          renderDepartmentWorkspace(deptId);
        };
      }
    });
  };

  const openAssignDeptMemberModal = (deptId) => {
    const dept = QrewStore.getDepartmentById(deptId);
    if (!dept) return;
    const office = QrewStore.getOfficeById(dept.officeId);
    const officeStaff = office ? QrewStore.getOfficeStaff(office.id) : [];

    QrewUI.openModal({
      title: `Assign Staff to ${dept.name}`,
      bodyHtml: `
        <form id="assign-dept-member-form">
          <div class="form-group">
            <label class="form-label" for="dm-user">Select Office Staff Member *</label>
            <select id="dm-user" class="form-input" required>
              ${officeStaff.length === 0 ? `
                <option disabled selected>No staff assigned to office branch</option>
              ` : officeStaff.map(s => `
                <option value="${s.userId}">${QrewUI.escapeHtml(s.user.name)} (${s.officeRole})</option>
              `).join('')}
            </select>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="dm-role">Department Role *</label>
              <select id="dm-role" class="form-input">
                <option value="Department Lead">Department Lead</option>
                <option value="Senior Specialist">Senior Specialist</option>
                <option value="Operations Specialist" selected>Operations Specialist</option>
                <option value="Field Operator">Field Operator</option>
                <option value="Support Technician">Support Technician</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="dm-shift">Shift Rotation</label>
              <select id="dm-shift" class="form-input">
                <option value="Morning (08:00 - 16:00)" selected>Morning (08:00 - 16:00)</option>
                <option value="Evening (14:00 - 22:00)">Evening (14:00 - 22:00)</option>
                <option value="Night (22:00 - 06:00)">Night (22:00 - 06:00)</option>
              </select>
            </div>
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-submit-dm">Assign to Department</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#assign-dept-member-form');
        const submitBtn = modalEl.querySelector('#btn-submit-dm');
        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          const userId = document.getElementById('dm-user').value;
          const role = document.getElementById('dm-role').value;
          const shift = document.getElementById('dm-shift').value;

          QrewStore.addDepartmentMember(deptId, userId, role, shift);
          QrewUI.closeModal();
          QrewUI.showToast('Staff member assigned to department roster.', 'success');
          renderDepartmentWorkspace(deptId);
        };
      }
    });
  };

  const renderDepartmentWorkspace = (deptId) => {
    let dept = QrewStore.getDepartmentById(deptId);
    if (!dept) {
      const allDepts = QrewStore.getDepartments();
      dept = allDepts[0];
    }
    const main = Qrew.dom.mainContent;
    if (!dept) {
      main.innerHTML = `
        <div class="empty-state">
          <div class="empty-title">Department Not Found</div>
          <div class="empty-desc">Provision a department in the Office Configuration Centre first.</div>
        </div>
      `;
      return;
    }

    const office = QrewStore.getOfficeById(dept.officeId) || { name: 'Office Branch', id: dept.officeId };
    const tenant = QrewStore.getTenantById(office.tenantId) || { name: 'Tenant Organization', id: office.tenantId };
    const deptMembers = QrewStore.getDepartmentMembers(dept.id);
    const tasks = QrewStore.getTasksByDepartment(dept.id);
    const onDutyCount = deptMembers.filter(m => m.status === 'On Duty').length;
    const pendingTasksCount = tasks.filter(t => t.status !== 'Completed').length;

    main.innerHTML = `
      <!-- Department Header -->
      <div class="dept-header-card">
        <div class="dept-header-left">
          <div class="dept-badge-icon">${QrewUI.escapeHtml(dept.code)}</div>
          <div class="dept-title-group">
            <div class="dept-breadcrumb">
              <a href="#tenant-landing?id=${tenant.id}" style="color:var(--color-text-muted);text-decoration:none;">${QrewUI.escapeHtml(tenant.name)}</a>
              <span>/</span>
              <a href="#office/overview?tenantId=${tenant.id}&officeId=${office.id}" style="color:var(--color-text-muted);text-decoration:none;">${QrewUI.escapeHtml(office.name)}</a>
              <span>/</span>
              <span style="color:var(--color-text-primary);font-weight:600;">Department Hub</span>
            </div>
            <h2>${QrewUI.escapeHtml(dept.name)}</h2>
            <div style="font-size:12.5px;color:var(--color-text-muted);display:flex;align-items:center;gap:12px;margin-top:2px;">
              <span>Supervisor: <strong style="color:var(--color-text-primary);">${QrewUI.escapeHtml(dept.leadName)}</strong></span>
              <span>Status: ${QrewUI.statusBadge(dept.status)}</span>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="#tenant-landing?id=${tenant.id}" class="btn btn-secondary btn-sm">
            &larr; ${QrewUI.escapeHtml(tenant.name)} Landing
          </a>
          <button class="btn btn-secondary btn-sm" id="btn-add-dept-task">
            ${QrewUI.getIcon('plus')} Add Task to Queue
          </button>
          <button class="btn btn-primary btn-sm" id="btn-assign-dept-member">
            ${QrewUI.getIcon('users')} Assign Staff
          </button>
        </div>
      </div>

      <!-- Department KPIs -->
      <div class="dept-kpi-row" style="margin:20px 0;">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Assigned Personnel</span>
            <div class="metric-icon-wrap">${QrewUI.getIcon('users')}</div>
          </div>
          <div class="metric-value-row">
            <div class="metric-value">${deptMembers.length}</div>
            <div class="metric-subtext">Capacity: ${dept.capacity} staff</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Active On Duty</span>
            <div class="metric-icon-wrap" style="color:var(--color-success);">${QrewUI.getIcon('check')}</div>
          </div>
          <div class="metric-value-row">
            <div class="metric-value">${onDutyCount}</div>
            <div class="metric-subtext">Currently on shift</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Queue Backlog</span>
            <div class="metric-icon-wrap" style="color:var(--color-accent);">${QrewUI.getIcon('audit')}</div>
          </div>
          <div class="metric-value-row">
            <div class="metric-value">${pendingTasksCount}</div>
            <div class="metric-subtext">Tasks pending execution</div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-label">Shift Coverage</span>
            <div class="metric-icon-wrap">${QrewUI.getIcon('overview')}</div>
          </div>
          <div class="metric-value-row">
            <div class="metric-value">100%</div>
            <div class="metric-subtext">Rotations active</div>
          </div>
        </div>
      </div>

      <!-- Staff Roster & Member Workspace Link -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2 class="card-title">Department Personnel Roster</h2>
            <p class="card-subtitle">Staff assigned to this department with specialized operational roles</p>
          </div>
          <span class="badge" style="background:var(--color-surface);border:1px solid var(--color-border);font-size:11.5px;">${deptMembers.length} Active Staff</span>
        </div>
        <div class="table-wrapper" style="border:none;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Personnel Name</th>
                <th>Email</th>
                <th>Department Role</th>
                <th>Assigned Shift</th>
                <th>Duty Status</th>
                <th style="text-align:right;">Member Workspace</th>
              </tr>
            </thead>
            <tbody>
              ${deptMembers.length === 0 ? `
                <tr>
                  <td colspan="6">
                    ${QrewUI.emptyState({
                      title: 'No Personnel Assigned',
                      description: 'Assign staff members to this department to build the operational team.'
                    })}
                  </td>
                </tr>
              ` : deptMembers.map(m => `
                <tr>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="user-avatar" style="width:28px;height:28px;font-size:11px;">${m.user.name.charAt(0)}</div>
                      <strong>${QrewUI.escapeHtml(m.user.name)}</strong>
                    </div>
                  </td>
                  <td>${QrewUI.escapeHtml(m.user.email)}</td>
                  <td>${QrewUI.roleBadge(m.deptRole, 'office')}</td>
                  <td>${QrewUI.escapeHtml(m.shift)}</td>
                  <td>${QrewUI.statusBadge(m.status === 'On Duty' ? 'Active' : 'Suspended')}</td>
                  <td style="text-align:right;">
                    <a href="#member/overview?userId=${m.userId}" class="btn btn-secondary btn-sm" style="font-size:11.5px;padding:3px 8px;gap:5px;display:inline-flex;align-items:center;" title="Launch Personal Workspace for ${QrewUI.escapeHtml(m.user.name)}">
                      <span>Personal Workspace</span>
                      <span style="font-size:10px;">&rarr;</span>
                    </a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Operational Queue & Daily Assignments -->
      <div class="card">
        <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <h2 class="card-title">Daily Operational Task Queue</h2>
            <p class="card-subtitle">Assigned tasks and field duties running across the current operational window</p>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-quick-add-task">
            ${QrewUI.getIcon('plus')} New Task
          </button>
        </div>
        <div class="card-body">
          <div class="dept-queue-grid">
            ${tasks.length === 0 ? `
              <div style="padding:24px;text-align:center;color:var(--color-text-muted);font-size:13px;">
                No operational tasks currently in queue. Add the first task above.
              </div>
            ` : tasks.map(t => `
              <div class="dept-task-card">
                <div class="dept-task-left">
                  <button class="member-checklist-checkbox toggle-task-btn" data-id="${t.id}" title="Toggle status" style="${t.status === 'Completed' ? 'background:var(--color-accent);border-color:var(--color-accent);color:#fff;' : ''}">
                    ${t.status === 'Completed' ? QrewUI.getIcon('check') : ''}
                  </button>
                  <div>
                    <div class="dept-task-title" style="${t.status === 'Completed' ? 'text-decoration:line-through;opacity:0.7;' : ''}">${QrewUI.escapeHtml(t.title)}</div>
                    <div class="dept-task-meta">
                      <span>Category: <strong>${QrewUI.escapeHtml(t.category)}</strong></span>
                      <span style="margin:0 6px;">•</span>
                      <span>Due: <strong>${QrewUI.escapeHtml(t.dueTime)}</strong></span>
                    </div>
                  </div>
                </div>
                <div class="dept-task-actions">
                  <span class="badge ${t.priority === 'High' ? 'badge-role platform' : 'badge-role tenant'}" style="font-size:10.5px;">${t.priority}</span>
                  ${QrewUI.statusBadge(t.status === 'Completed' ? 'Active' : 'Suspended')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    const addTaskBtn = document.getElementById('btn-add-dept-task');
    if (addTaskBtn) addTaskBtn.onclick = () => openCreateDeptTaskModal(dept.id);

    const quickAddBtn = document.getElementById('btn-quick-add-task');
    if (quickAddBtn) quickAddBtn.onclick = () => openCreateDeptTaskModal(dept.id);

    const assignStaffBtn = document.getElementById('btn-assign-dept-member');
    if (assignStaffBtn) assignStaffBtn.onclick = () => openAssignDeptMemberModal(dept.id);

    main.querySelectorAll('.toggle-task-btn').forEach(btn => {
      btn.onclick = () => {
        const updated = QrewStore.toggleTaskStatus(btn.dataset.id);
        if (updated) {
          QrewUI.showToast(`Task status updated to ${updated.status}.`, 'success');
          renderDepartmentWorkspace(dept.id);
        }
      };
    });
  };

  Qrew.registerInterface({
    id: 'department',
    brandHome: 'tenant',

    getDomainBadge: ({ office }) => ({
      text: Qrew.getOfficeDomain(office),
      dotColor: 'var(--panel-accent)'
    }),

    getSidebarConfig: ({ state, view, office, dept }) => {
      const activeDept = dept || { name: 'Department', code: 'DEP', id: state.currentDeptId };
      const deptId = state.currentDeptId;
      const deptsInOffice = office ? QrewStore.getDepartments(office.id) : [];

      return {
        logoText: activeDept.code || 'D',
        logoBg: 'var(--color-accent)',
        brandName: activeDept.name,
        brandBadge: 'Department Workspace',
        picker: {
          label: `Departments (${office ? office.name : ''})`,
          optionsHtml: deptsInOffice.map(d => `
            <option value="${d.id}" ${d.id === activeDept.id ? 'selected' : ''}>${QrewUI.escapeHtml(d.name)} [${d.code}]</option>
          `).join(''),
          onChange: (e) => {
            Qrew.state.currentDeptId = e.target.value;
            Qrew.navigateTo(`#department/overview?deptId=${Qrew.state.currentDeptId}`);
          }
        },
        navHtml: `
          <div class="nav-section">
            <div class="nav-section-title">Department Hub</div>
            <a class="nav-item ${view === 'overview' ? 'active' : ''}" href="#department/overview?deptId=${deptId}">
              <span class="nav-icon">${QrewUI.getIcon('overview')}</span>
              <span class="nav-label">Overview & KPIs</span>
            </a>
            <a class="nav-item ${view === 'members' ? 'active' : ''}" href="#department/members?deptId=${deptId}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Staff Roster</span>
            </a>
            <a class="nav-item ${view === 'queue' ? 'active' : ''}" href="#department/queue?deptId=${deptId}">
              <span class="nav-icon">${QrewUI.getIcon('audit')}</span>
              <span class="nav-label">Operational Queue</span>
            </a>
          </div>
        `
      };
    },

    render: (_view, ctx) => renderDepartmentWorkspace(ctx.state.currentDeptId)
  });
})();
