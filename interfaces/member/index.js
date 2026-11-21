/**
 * Interface: Office Member Workspace (Personal Shift, Tasks, Activity)
 */
(() => {
  const Qrew = window.Qrew;

  const openCreateMemberTaskModal = (userId, deptId) => {
    QrewUI.openModal({
      title: 'Add Duty to My Daily Checklist',
      bodyHtml: `
        <form id="create-my-task-form">
          <div class="form-group">
            <label class="form-label" for="my-task-title">Duty Description *</label>
            <input type="text" id="my-task-title" class="form-input" placeholder="e.g. Conduct daily dock equipment audit" required>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="my-task-category">Category</label>
              <select id="my-task-category" class="form-input">
                <option value="Operations">Operations</option>
                <option value="Inspection">Inspection</option>
                <option value="Compliance">Compliance</option>
                <option value="Safety">Safety</option>
                <option value="Reporting">Reporting</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="my-task-priority">Priority</label>
              <select id="my-task-priority" class="form-input">
                <option value="High">High</option>
                <option value="Normal" selected>Normal</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="my-task-due">Due Time</label>
            <input type="text" id="my-task-due" class="form-input" value="Today, 04:30 PM">
          </div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-my-task">Add Duty</button>
      `,
      onOpen: (modalEl) => {
        const form = modalEl.querySelector('#create-my-task-form');
        const submitBtn = modalEl.querySelector('#btn-save-my-task');
        submitBtn.onclick = () => {
          if (!form.checkValidity()) {
            form.reportValidity();
            return;
          }
          const title = document.getElementById('my-task-title').value.trim();
          const category = document.getElementById('my-task-category').value;
          const priority = document.getElementById('my-task-priority').value;
          const dueTime = document.getElementById('my-task-due').value.trim();

          QrewStore.createMemberTask(userId, deptId, title, priority, dueTime, category);
          QrewUI.closeModal();
          QrewUI.showToast('Duty added to your checklist.', 'success');
          renderMemberWorkspace(userId);
        };
      }
    });
  };

  const renderMemberWorkspace = (userId) => {
    let user = QrewStore.getUserById(userId) || QrewStore.getCurrentUser();
    if (!user) user = QrewStore.getUsers()[0];

    // Find the member's office and department affiliations
    const officeStaffEntry = (QrewStore.data.officeStaff || []).find(os => os.userId === user.id) || {
      officeId: 'off_ctg_port',
      tenantId: 'ten_sst',
      officeRole: 'Office Staff'
    };
    const office = QrewStore.getOfficeById(officeStaffEntry.officeId) || { name: 'Chittagong Port Office', id: 'off_ctg_port' };
    const tenant = QrewStore.getTenantById(officeStaffEntry.tenantId) || { name: 'SST', id: 'ten_sst' };

    const deptMemberEntry = (QrewStore.data.departmentMembers || []).find(dm => dm.userId === user.id);
    const dept = deptMemberEntry ? QrewStore.getDepartmentById(deptMemberEntry.deptId) : QrewStore.getDepartments(office.id)[0] || { name: 'Port Operations', code: 'OPS', id: 'dept_ctg_ops' };

    const tasks = QrewStore.getMemberTasks(user.id);
    const activities = QrewStore.getMemberActivities(user.id);
    const completedTasksCount = tasks.filter(t => t.status === 'Completed').length;
    const main = Qrew.dom.mainContent;

    main.innerHTML = `
      <div class="member-workspace-layout">
        <!-- Hero Profile & Status Card -->
        <div class="member-hero-card">
          <div class="member-identity">
            <div class="member-large-avatar">${user.name.charAt(0)}</div>
            <div class="member-identity-info">
              <div style="font-size:12px;color:var(--color-text-muted);margin-bottom:3px;display:flex;align-items:center;gap:6px;">
                <a href="#tenant-landing?id=${tenant.id}" style="color:var(--color-text-muted);text-decoration:none;">${QrewUI.escapeHtml(tenant.name)}</a>
                <span>/</span>
                <a href="#office/overview?tenantId=${tenant.id}&officeId=${office.id}" style="color:var(--color-text-muted);text-decoration:none;">${QrewUI.escapeHtml(office.name)}</a>
                <span>/</span>
                <a href="#department/overview?deptId=${dept.id}" style="color:var(--color-text-muted);text-decoration:none;">${QrewUI.escapeHtml(dept.name)}</a>
              </div>
              <h2>${QrewUI.escapeHtml(user.name)}</h2>
              <div class="member-identity-tags">
                <span class="badge badge-role office">${deptMemberEntry ? deptMemberEntry.deptRole : officeStaffEntry.officeRole}</span>
                <span class="badge" style="background:var(--color-surface);border:1px solid var(--color-border);font-size:11.5px;color:var(--color-text-primary);font-family:var(--font-mono);">${dept.code} Division</span>
                <span style="font-size:12.5px;color:var(--color-text-muted);">${QrewUI.escapeHtml(user.email)}</span>
              </div>
            </div>
          </div>
          <div class="member-shift-indicator">
            <div style="display:flex;flex-direction:column;gap:2px;">
              <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:var(--color-text-muted);font-weight:600;">Today's Assigned Shift</span>
              <strong style="font-size:13.5px;color:var(--color-text-primary);">${deptMemberEntry ? deptMemberEntry.shift : 'Morning (08:00 - 16:00)'}</strong>
            </div>
            <div style="border-left:1px solid var(--color-border);padding-left:12px;margin-left:6px;">
              <span class="badge badge-active" style="font-size:11px;"><span class="badge-dot"></span>Checked In</span>
            </div>
          </div>
        </div>

        <!-- Quick Switch Member Buttons (wireframe-only convenience) -->
        <div class="config-banner-card" style="padding:12px 18px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span style="font-size:11.5px;font-weight:700;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-right:4px;">Switch Member:</span>
            ${QrewStore.getUsers().slice(0, 5).map(u => `
              <button class="btn btn-sm ${u.id === user.id ? 'btn-primary' : 'btn-secondary'} switch-member-btn" data-id="${u.id}">
                ${QrewUI.escapeHtml(u.name)}
              </button>
            `).join('')}
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <a href="#tenant-landing?id=${tenant.id}" class="btn btn-secondary btn-sm">
              &larr; ${QrewUI.escapeHtml(tenant.name)} Landing
            </a>
            <a href="#department/overview?deptId=${dept.id}" class="btn btn-secondary btn-sm">
              &larr; Return to Department Hub
            </a>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr;gap:20px;">
          <!-- Left Column: Today's Tasks -->
          <div class="card">
            <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
              <div>
                <h2 class="card-title">My Today's Assigned Duties</h2>
                <p class="card-subtitle">${completedTasksCount} of ${tasks.length} duties completed today</p>
              </div>
              <button class="btn btn-primary btn-sm" id="btn-add-member-task">
                ${QrewUI.getIcon('plus')} Add Task
              </button>
            </div>
            <div class="card-body">
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${tasks.length === 0 ? `
                  <div style="padding:24px;text-align:center;color:var(--color-text-muted);font-size:13px;">
                    No duties currently assigned for this shift. Add one above.
                  </div>
                ` : tasks.map(t => `
                  <div class="member-checklist-item ${t.status === 'Completed' ? 'completed' : ''}">
                    <button class="member-checklist-checkbox member-toggle-task" data-id="${t.id}" title="Toggle completion">
                      ${t.status === 'Completed' ? QrewUI.getIcon('check') : ''}
                    </button>
                    <div class="member-checklist-content">
                      <div class="member-checklist-title">${QrewUI.escapeHtml(t.title)}</div>
                      <div class="member-checklist-sub">
                        <span>Category: <strong>${QrewUI.escapeHtml(t.category)}</strong></span>
                        <span style="margin:0 5px;">•</span>
                        <span>Due: <strong>${QrewUI.escapeHtml(t.dueTime)}</strong></span>
                      </div>
                    </div>
                    <span class="badge ${t.priority === 'High' ? 'badge-role platform' : 'badge-role tenant'}" style="font-size:10px;">${t.priority}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Right Column: Team & Activity -->
          <div style="display:flex;flex-direction:column;gap:20px;">
            <!-- Department Contacts -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title" style="font-size:14.5px;">My Department &amp; Team</h2>
                <p class="card-subtitle">${QrewUI.escapeHtml(dept.name)} Division</p>
              </div>
              <div class="card-body">
                <div style="display:flex;flex-direction:column;gap:10px;">
                  <div class="member-contact-card">
                    <div class="member-contact-avatar">L</div>
                    <div style="flex:1;">
                      <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);">${QrewUI.escapeHtml(dept.leadName)}</div>
                      <div style="font-size:11px;color:var(--color-text-muted);">Department Supervisor</div>
                    </div>
                  </div>
                  <div class="member-contact-card">
                    <div class="member-contact-avatar">M</div>
                    <div style="flex:1;">
                      <div style="font-size:13px;font-weight:600;color:var(--color-text-primary);">${QrewUI.escapeHtml(office.name)}</div>
                      <div style="font-size:11px;color:var(--color-text-muted);">Dispatch Desk (${officeStaffEntry.officeRole})</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Activity Feed -->
            <div class="card">
              <div class="card-header">
                <h2 class="card-title" style="font-size:14.5px;">Activity &amp; Timeclock</h2>
                <p class="card-subtitle">Recent shift events</p>
              </div>
              <div class="card-body">
                <div style="display:flex;flex-direction:column;gap:12px;">
                  ${activities.length === 0 ? `
                    <div style="font-size:12.5px;color:var(--color-text-muted);text-align:center;padding:12px;">No shift activity recorded yet.</div>
                  ` : activities.slice(0, 4).map(a => `
                    <div style="display:flex;gap:10px;font-size:12.5px;">
                      <div style="width:6px;height:6px;border-radius:50%;background:var(--color-accent);margin-top:6px;flex-shrink:0;"></div>
                      <div>
                        <div style="font-weight:600;color:var(--color-text-primary);">${QrewUI.escapeHtml(a.title)}</div>
                        <div style="color:var(--color-text-muted);font-size:11.5px;">${QrewUI.escapeHtml(a.description)}</div>
                        <div style="font-size:10.5px;color:var(--color-text-muted);margin-top:2px;">${a.timestamp}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Event Bindings
    main.querySelectorAll('.switch-member-btn').forEach(btn => {
      btn.onclick = () => {
        Qrew.state.currentMemberId = btn.dataset.id;
        Qrew.navigateTo(`#member/overview?userId=${Qrew.state.currentMemberId}`);
      };
    });

    const addMemberTaskBtn = document.getElementById('btn-add-member-task');
    if (addMemberTaskBtn) {
      addMemberTaskBtn.onclick = () => openCreateMemberTaskModal(user.id, dept.id);
    }

    main.querySelectorAll('.member-toggle-task').forEach(btn => {
      btn.onclick = () => {
        const updated = QrewStore.toggleTaskStatus(btn.dataset.id);
        if (updated) {
          QrewUI.showToast(`Task "${updated.title}" marked as ${updated.status}.`, 'success');
          renderMemberWorkspace(user.id);
        }
      };
    });
  };

  Qrew.registerInterface({
    id: 'member',
    brandHome: 'tenant',

    getDomainBadge: ({ office }) => ({
      text: Qrew.getOfficeDomain(office),
      dotColor: 'var(--panel-accent)'
    }),

    getSidebarConfig: ({ state }) => {
      const memberUser = QrewStore.getUserById(state.currentMemberId) || { id: 'usr_nusrat', name: 'Staff Member', email: '', platformRole: 'Staff' };
      return {
        logoText: memberUser.name ? memberUser.name.charAt(0).toUpperCase() : 'M',
        logoBg: 'var(--color-accent)',
        brandName: memberUser.name,
        brandBadge: 'Member Workspace',
        picker: null,
        navHtml: `
          <div class="nav-section">
            <div class="nav-section-title">My Workspace</div>
            <a class="nav-item active" href="#member/overview?userId=${memberUser.id}">
              <span class="nav-icon">${QrewUI.getIcon('users')}</span>
              <span class="nav-label">Schedule & Tasks</span>
            </a>
          </div>
        `
      };
    },

    render: (_view, ctx) => renderMemberWorkspace(ctx.state.currentMemberId)
  });
})();
