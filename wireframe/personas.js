/**
 * Wireframe-only: 1-Click Persona Login Gateway (not for production copy-over)
 */
(() => {
  const Qrew = window.Qrew;

  const showPersonasModal = () => {
    QrewUI.openModal({
      title: '1-Click Persona Login',
      bodyHtml: `
        <p style="font-size:13.5px;color:var(--color-text-muted);margin-bottom:20px;">
          Select any persona to jump directly into their contextual workspace experience.
        </p>
        <div class="personas-grid" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;">
          <!-- Persona 1 -->
          <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="persona-avatar" style="background-color:var(--color-accent);width:38px;height:38px;font-size:15px;">S</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-text-primary);">Sakib</div>
                <span class="persona-role-badge badge-role platform" style="font-size:10px;">Platform Owner</span>
              </div>
            </div>
            <p style="font-size:12px;color:var(--color-text-muted);margin:0;line-height:1.4;">Global infrastructure, tenants CRUD, platform audit visibility.</p>
            <button class="btn btn-primary btn-sm" onclick="QrewStore.setCurrentUser('usr_sakib');Qrew.shell.syncHeaderUserProfile();QrewUI.closeModal();location.hash='#platform/overview';" style="margin-top:auto;width:100%;">
              Enter as Platform Owner
            </button>
          </div>

          <!-- Persona 2 -->
          <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="persona-avatar" style="background-color:var(--color-warning);width:38px;height:38px;font-size:15px;">R</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-text-primary);">Rafiqul Islam</div>
                <span class="persona-role-badge badge-role tenant" style="font-size:10px;">Tenant Admin</span>
              </div>
            </div>
            <p style="font-size:12px;color:var(--color-text-muted);margin:0;line-height:1.4;">SST organization, branch offices CRUD, member pool.</p>
            <button class="btn btn-primary btn-sm" onclick="QrewStore.setCurrentUser('usr_rafiq');Qrew.shell.syncHeaderUserProfile();QrewUI.closeModal();location.hash='#tenant/overview?id=ten_sst';" style="margin-top:auto;width:100%;">
              Enter as Tenant Admin
            </button>
          </div>

          <!-- Persona 3 -->
          <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="persona-avatar" style="background-color:var(--color-info);width:38px;height:38px;font-size:15px;">J</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-text-primary);">Jack Rahman</div>
                <span class="persona-role-badge badge-role office" style="font-size:10px;">Office Supervisor</span>
              </div>
            </div>
            <p style="font-size:12px;color:var(--color-text-muted);margin:0;line-height:1.4;">Chittagong Port Office, departments, and on-site staff deployment.</p>
            <button class="btn btn-primary btn-sm" onclick="QrewStore.setCurrentUser('usr_jack');Qrew.shell.syncHeaderUserProfile();QrewUI.closeModal();location.hash='#office/overview?tenantId=ten_sst&officeId=off_ctg_port';" style="margin-top:auto;width:100%;">
              Enter as Office Admin
            </button>
          </div>

          <!-- Persona 4 -->
          <div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:16px;display:flex;flex-direction:column;gap:10px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div class="persona-avatar" style="background-color:var(--color-text-muted);width:38px;height:38px;font-size:15px;">N</div>
              <div>
                <div style="font-weight:700;font-size:14px;color:var(--color-text-primary);">Nusrat Jahan</div>
                <span class="persona-role-badge" style="background:var(--color-surface);color:var(--color-text-primary);border:1px solid var(--color-border);font-size:10px;">Office Staff</span>
              </div>
            </div>
            <p style="font-size:12px;color:var(--color-text-muted);margin:0;line-height:1.4;">Chittagong Port member, daily operational duties & personal tasks.</p>
            <button class="btn btn-primary btn-sm" onclick="QrewStore.setCurrentUser('usr_nusrat');Qrew.shell.syncHeaderUserProfile();QrewUI.closeModal();location.hash='#member/overview?userId=usr_nusrat';" style="margin-top:auto;width:100%;">
              Enter as Member
            </button>
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-secondary" onclick="QrewUI.closeModal()">Close</button>
      `
    });
  };

  Qrew.wireframe.showPersonasModal = showPersonasModal;
  window.showPersonasModal = showPersonasModal;
})();
