/**
 * Qrew - Data Layer & State Management (localStorage backed)
 * Hierarchical Multi-Tenant Access Control: Platform -> Tenants -> Offices -> Office Members
 */

const STORAGE_KEY = 'qrew_platform_state_v4';

const DEFAULT_DATA = {
  currentUser: {
    id: 'usr_sakib',
    name: 'Sakib',
    email: 'sakib@qrew.io',
    platformRole: 'Platform Owner',
    avatar: 'S'
  },
  users: [
    { id: 'usr_sakib', name: 'Sakib', email: 'sakib@qrew.io', platformRole: 'Platform Owner', status: 'Active', createdAt: '2026-08-01' },
    { id: 'usr_mina', name: 'Mina Chowdhury', email: 'mina@qrew.io', platformRole: 'Platform Admin', status: 'Active', createdAt: '2026-08-15' },
    { id: 'usr_jack', name: 'Jack Rahman', email: 'jack@qrew.io', platformRole: 'Platform User', status: 'Active', createdAt: '2026-09-01' },
    { id: 'usr_fahim', name: 'Fahim Karim', email: 'fahim@qrew.io', platformRole: 'Platform User', status: 'Active', createdAt: '2026-09-10' },
    { id: 'usr_nusrat', name: 'Nusrat Jahan', email: 'nusrat@qrew.io', platformRole: 'Platform User', status: 'Active', createdAt: '2026-09-22' },
    { id: 'usr_rafiq', name: 'Rafiqul Islam', email: 'rafiq@qrew.io', platformRole: 'Platform User', status: 'Active', createdAt: '2026-10-02' },
    { id: 'usr_tanvir', name: 'Tanvir Hasan', email: 'tanvir@qrew.io', platformRole: 'Platform User', status: 'Active', createdAt: '2026-10-18' }
  ],
  tenants: [
    {
      id: 'ten_sst',
      name: 'SST',
      ownerName: 'Rafiqul Islam',
      ownerEmail: 'rafiq@sst.com',
      status: 'Active',
      createdAt: '2026-09-12'
    }
  ],
  offices: [
    {
      id: 'off_ctg_port',
      tenantId: 'ten_sst',
      name: 'Chittagong Port Office',
      location: 'Port Access Road, Chittagong',
      status: 'Active',
      createdAt: '2026-09-15'
    },
    {
      id: 'off_mgl_port',
      tenantId: 'ten_sst',
      name: 'Mongla Port Office',
      location: 'Mongla Port Area, Bagerhat, Khulna',
      status: 'Active',
      createdAt: '2026-09-18'
    }
  ],
  tenantMembers: [
    { id: 'tm_1', tenantId: 'ten_sst', userId: 'usr_rafiq', tenantRole: 'Tenant Admin', status: 'Active', joinedAt: '2026-09-12' },
    { id: 'tm_2', tenantId: 'ten_sst', userId: 'usr_jack', tenantRole: 'Tenant Manager', status: 'Active', joinedAt: '2026-09-14' },
    { id: 'tm_3', tenantId: 'ten_sst', userId: 'usr_nusrat', tenantRole: 'Tenant Member', status: 'Active', joinedAt: '2026-09-25' },
    { id: 'tm_4', tenantId: 'ten_sst', userId: 'usr_tanvir', tenantRole: 'Tenant Member', status: 'Active', joinedAt: '2026-10-05' },
    { id: 'tm_5', tenantId: 'ten_sst', userId: 'usr_mina', tenantRole: 'Tenant Member', status: 'Active', joinedAt: '2026-10-10' },
    { id: 'tm_6', tenantId: 'ten_sst', userId: 'usr_fahim', tenantRole: 'Tenant Member', status: 'Active', joinedAt: '2026-10-12' }
  ],
  officeStaff: [
    { id: 'os_1', officeId: 'off_ctg_port', tenantId: 'ten_sst', userId: 'usr_rafiq', officeRole: 'Office Manager', status: 'Active', assignedAt: '2026-09-15' },
    { id: 'os_2', officeId: 'off_ctg_port', tenantId: 'ten_sst', userId: 'usr_jack', officeRole: 'Office Supervisor', status: 'Active', assignedAt: '2026-09-16' },
    { id: 'os_3', officeId: 'off_ctg_port', tenantId: 'ten_sst', userId: 'usr_nusrat', officeRole: 'Office Staff', status: 'Active', assignedAt: '2026-09-26' },
    { id: 'os_4', officeId: 'off_mgl_port', tenantId: 'ten_sst', userId: 'usr_tanvir', officeRole: 'Office Staff', status: 'Active', assignedAt: '2026-10-06' }
  ],
  departments: [
    { id: 'dept_ctg_ops', officeId: 'off_ctg_port', name: 'Port Operations', code: 'OPS', leadName: 'Rafiqul Islam', capacity: 15, status: 'Active', description: 'Container terminal dispatch, berths, and vessel clearance' },
    { id: 'dept_ctg_log', officeId: 'off_ctg_port', name: 'Fleet & Logistics', code: 'LOG', leadName: 'Jack Rahman', capacity: 10, status: 'Active', description: 'Heavy transport logistics, truck fleets, and freight forwarding' },
    { id: 'dept_ctg_sec', officeId: 'off_ctg_port', name: 'Facility Security', code: 'SEC', leadName: 'Nusrat Jahan', capacity: 8, status: 'Active', description: 'CCTV surveillance, entry-exit gate control, and safety protocols' },
    { id: 'dept_ctg_cust', officeId: 'off_ctg_port', name: 'Customs & Compliance', code: 'CST', leadName: 'Tanvir Hasan', capacity: 6, status: 'Active', description: 'Tariff verification, regulatory filings, and inspection oversight' },
    { id: 'dept_mgl_ops', officeId: 'off_mgl_port', name: 'Maritime Cargo & Dispatch', code: 'MCD', leadName: 'Tanvir Hasan', capacity: 12, status: 'Active', description: 'Mongla jetty cargo operations, lighter vessel coordination, and customs handling' }
  ],
  departmentMembers: [
    { id: 'dm_1', deptId: 'dept_ctg_ops', userId: 'usr_rafiq', deptRole: 'Department Lead', shift: 'Morning (08:00 - 16:00)', status: 'On Duty' },
    { id: 'dm_2', deptId: 'dept_ctg_ops', userId: 'usr_nusrat', deptRole: 'Operations Specialist', shift: 'Morning (08:00 - 16:00)', status: 'On Duty' },
    { id: 'dm_3', deptId: 'dept_ctg_log', userId: 'usr_jack', deptRole: 'Logistics Supervisor', shift: 'Evening (14:00 - 22:00)', status: 'Upcoming' },
    { id: 'dm_4', deptId: 'dept_ctg_sec', userId: 'usr_tanvir', deptRole: 'Security Officer', shift: 'Night (22:00 - 06:00)', status: 'Off Duty' }
  ],
  officeConfigs: {
    'off_ctg_port': {
      code: 'CTG-PORT-01',
      tier: 'Tier 1 Regional Hub',
      floorArea: '18,500 sq ft',
      maxOccupancy: 120,
      operatingHours: '24/7 Continuous (3 Shifts)',
      primaryContact: '+880 31 710000',
      emergencyContact: '+880 31 710999',
      shifts: ['Morning (08:00 - 16:00)', 'Evening (14:00 - 22:00)', 'Night (22:00 - 06:00)'],
      checkInGrace: '15 mins',
      accessControlMode: 'Biometric + Smart Card'
    },
    'off_mgl_port': {
      code: 'MGL-PORT-02',
      tier: 'Tier 2 Coastal Port Facility',
      floorArea: '12,400 sq ft',
      maxOccupancy: 80,
      operatingHours: '24/7 Continuous Operations',
      primaryContact: '+880 4662 75100',
      emergencyContact: '+880 4662 75199',
      shifts: ['Morning (08:00 - 16:00)', 'Evening (14:00 - 22:00)'],
      checkInGrace: '15 mins',
      accessControlMode: 'Biometric Smart Access'
    }
  },
  memberTasks: [
    { id: 'tsk_1', userId: 'usr_nusrat', deptId: 'dept_ctg_ops', title: 'Verify inbound cargo manifests for Berth 4', status: 'Completed', priority: 'High', dueTime: '11:00 AM', category: 'Compliance' },
    { id: 'tsk_2', userId: 'usr_nusrat', deptId: 'dept_ctg_ops', title: 'Conduct dock gantry crane equipment safety checklist', status: 'In Progress', priority: 'High', dueTime: '02:30 PM', category: 'Inspection' },
    { id: 'tsk_3', userId: 'usr_nusrat', deptId: 'dept_ctg_ops', title: 'Submit end-of-shift dispatch report to Rafiqul Islam', status: 'Pending', priority: 'Normal', dueTime: '03:45 PM', category: 'Reporting' },
    { id: 'tsk_4', userId: 'usr_jack', deptId: 'dept_ctg_log', title: 'Audit fleet fuel consumption logs for October', status: 'Completed', priority: 'Normal', dueTime: '04:00 PM', category: 'Audit' },
    { id: 'tsk_5', userId: 'usr_jack', deptId: 'dept_ctg_log', title: 'Dispatch trailer convoy 12-B to Dhaka corridor', status: 'In Progress', priority: 'High', dueTime: '06:00 PM', category: 'Dispatch' },
    { id: 'tsk_6', userId: 'usr_rafiq', deptId: 'dept_ctg_ops', title: 'Review port authority customs clearance backlog', status: 'In Progress', priority: 'High', dueTime: '01:00 PM', category: 'Review' },
    { id: 'tsk_7', userId: 'usr_mina', deptId: 'dept_dhk_trade', title: 'Authorize quarterly agricultural commodity futures', status: 'Pending', priority: 'High', dueTime: '04:30 PM', category: 'Trading' },
    { id: 'tsk_8', userId: 'usr_tanvir', deptId: 'dept_ctg_sec', title: 'Patrol Gate 3 biometric access terminals', status: 'In Progress', priority: 'Normal', dueTime: '11:30 PM', category: 'Security' }
  ],
  memberActivity: [
    { id: 'act_1', userId: 'usr_nusrat', title: 'Shift Check-In', description: 'Checked in for Morning Shift (08:00 - 16:00) at Terminal 1', timestamp: 'Today, 07:54 AM', type: 'checkin' },
    { id: 'act_2', userId: 'usr_nusrat', title: 'Task Completed', description: 'Marked "Verify inbound cargo manifests" as Completed', timestamp: 'Today, 10:48 AM', type: 'task' },
    { id: 'act_3', userId: 'usr_nusrat', title: 'Safety Protocol Acknowledged', description: 'Read and acknowledged Terminal Safety Circular #402', timestamp: 'Yesterday, 03:15 PM', type: 'system' }
  ],
  roles: {
    platform: [
      {
        id: 'role_plt_owner',
        name: 'Platform Owner',
        description: 'Complete administrative control over the entire platform, tenants, and system-level configuration.',
        permissions: ['platform_read', 'platform_crud', 'tenant_create', 'tenant_read', 'tenant_update', 'tenant_delete']
      },
      {
        id: 'role_plt_admin',
        name: 'Platform Admin',
        description: 'Operational administration of tenants, user accounts, and platform monitoring.',
        permissions: ['platform_read', 'tenant_create', 'tenant_read', 'tenant_update']
      },
      {
        id: 'role_plt_user',
        name: 'Platform User',
        description: 'Base platform account with view privileges and membership access across assigned tenants.',
        permissions: ['platform_read', 'tenant_read']
      }
    ],
    tenant: [
      {
        id: 'role_ten_admin',
        name: 'Tenant Admin',
        description: 'Autonomous administration within the tenant: manage tenant offices, tenant members, and tenant settings.',
        permissions: ['tenant_read', 'tenant_update', 'office_create', 'office_read', 'office_update', 'office_delete']
      },
      {
        id: 'role_ten_manager',
        name: 'Tenant Manager',
        description: 'Supervise office operations, oversee member assignments, and audit tenant activities.',
        permissions: ['tenant_read', 'office_read', 'office_update']
      },
      {
        id: 'role_ten_member',
        name: 'Tenant Member',
        description: 'Verified organization member eligible for assignment to tenant offices.',
        permissions: ['tenant_read', 'office_read']
      }
    ],
    office: [
      {
        id: 'role_off_manager',
        name: 'Office Manager',
        description: 'Oversees office facilities, assigns office staff, and controls branch operations.',
        permissions: ['office_read', 'office_update', 'office_create_off_mem', 'office_del_off_mem', 'office_update_off_mem', 'office_read_off_mem']
      },
      {
        id: 'role_off_supervisor',
        name: 'Office Supervisor',
        description: 'Supervises daily office workflows, shift rosters, and staff check-ins.',
        permissions: ['office_read', 'office_update_off_mem', 'office_read_off_mem']
      },
      {
        id: 'role_off_staff',
        name: 'Office Staff',
        description: 'General staff member working on-site at this designated office location.',
        permissions: ['office_read', 'office_read_off_mem']
      }
    ]
  },
  auditLogs: [
    {
      id: 'LOG-108',
      actor: 'Sakib',
      action: 'ASSIGN_ROLE',
      resourceType: 'Office Staff',
      resourceId: 'off_mgl_port',
      description: 'Assigned Tanvir Hasan as Office Staff for Mongla Port Office',
      timestamp: '2026-10-18 14:15:00'
    },
    {
      id: 'LOG-107',
      actor: 'Sakib',
      action: 'CREATE',
      resourceType: 'Office',
      resourceId: 'off_mgl_port',
      description: 'Created office Mongla Port Office under SST',
      timestamp: '2026-09-18 11:30:00'
    },
    {
      id: 'LOG-106',
      actor: 'Sakib',
      action: 'ASSIGN_ROLE',
      resourceType: 'Office Staff',
      resourceId: 'off_ctg_port',
      description: 'Assigned Jack Rahman as Office Supervisor for Chittagong Port Office',
      timestamp: '2026-09-16 09:45:00'
    },
    {
      id: 'LOG-105',
      actor: 'Sakib',
      action: 'CREATE',
      resourceType: 'Office',
      resourceId: 'off_ctg_port',
      description: 'Created office Chittagong Port Office under SST',
      timestamp: '2026-09-15 13:00:00'
    },
    {
      id: 'LOG-104',
      actor: 'Sakib',
      action: 'ADD_MEMBER',
      resourceType: 'Tenant Member',
      resourceId: 'ten_sst',
      description: 'Added Jack Rahman as Tenant Manager in SST',
      timestamp: '2026-09-14 15:10:00'
    },
    {
      id: 'LOG-101',
      actor: 'Sakib',
      action: 'CREATE',
      resourceType: 'Tenant',
      resourceId: 'ten_sst',
      description: 'Provisioned organization SST for Rafiqul Islam',
      timestamp: '2026-09-12 09:00:00'
    }
  ]
};

class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      // Clear legacy storage keys if present
      localStorage.removeItem('qrew_platform_state');
      localStorage.removeItem('qrew_platform_state_v2');
      localStorage.removeItem('qrew_platform_state_v3');

      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Reset only if the stored shape is unusable (bump STORAGE_KEY when the seed changes)
        if (!Array.isArray(parsed.tenants) || !Array.isArray(parsed.offices) || !Array.isArray(parsed.users)) {
          return this.reset();
        }
        // Backward-compatibility guarantee: ensure new properties exist
        if (!parsed.departments || parsed.departments.length === 0) parsed.departments = JSON.parse(JSON.stringify(DEFAULT_DATA.departments || []));
        if (!parsed.departmentMembers || parsed.departmentMembers.length === 0) parsed.departmentMembers = JSON.parse(JSON.stringify(DEFAULT_DATA.departmentMembers || []));
        if (!parsed.officeConfigs || Object.keys(parsed.officeConfigs).length === 0) parsed.officeConfigs = JSON.parse(JSON.stringify(DEFAULT_DATA.officeConfigs || {}));
        if (!parsed.memberTasks || parsed.memberTasks.length === 0) parsed.memberTasks = JSON.parse(JSON.stringify(DEFAULT_DATA.memberTasks || []));
        if (!parsed.memberActivity || parsed.memberActivity.length === 0) parsed.memberActivity = JSON.parse(JSON.stringify(DEFAULT_DATA.memberActivity || []));
        return parsed;
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial dataset.', e);
    }
    this.saveData(DEFAULT_DATA);
    return JSON.parse(JSON.stringify(DEFAULT_DATA));
  }

  saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to write to localStorage', e);
    }
  }

  save() {
    this.saveData(this.data);
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
    return this.data;
  }

  // --- Current User ---
  getCurrentUser() {
    return this.data.currentUser;
  }

  updateCurrentUser({ name, email }) {
    if (!name || !email) throw new Error('Name and email are required.');

    const oldName = this.data.currentUser.name;
    this.data.currentUser.name = name.trim();
    this.data.currentUser.email = email.trim();
    this.data.currentUser.avatar = name.trim().charAt(0).toUpperCase();

    // Synchronize in platform users directory
    const userInList = this.data.users.find(u => u.id === this.data.currentUser.id);
    if (userInList) {
      userInList.name = this.data.currentUser.name;
      userInList.email = this.data.currentUser.email;
    }

    this.addAuditLog(
      this.data.currentUser.name,
      'UPDATE',
      'Platform User',
      this.data.currentUser.id,
      `Updated user profile (Name: "${this.data.currentUser.name}", Email: "${this.data.currentUser.email}")`
    );

    this.save();
    return this.data.currentUser;
  }

  // --- Statistics ---
  getStats() {
    const totalTenants = this.data.tenants.length;
    const activeTenants = this.data.tenants.filter(t => t.status === 'Active').length;
    const totalOffices = this.data.offices.length;
    const totalUsers = this.data.users.length;
    return {
      totalTenants,
      activeTenants,
      totalOffices,
      totalUsers
    };
  }

  // --- Tenants ---
  getTenants() {
    return this.data.tenants.map(tenant => {
      const officeCount = this.data.offices.filter(o => o.tenantId === tenant.id).length;
      const memberCount = this.data.tenantMembers.filter(m => m.tenantId === tenant.id).length;
      return {
        ...tenant,
        officeCount,
        memberCount
      };
    });
  }

  getTenantById(id) {
    let tenant = this.data.tenants.find(t => t.id === id);
    // Graceful fallback for legacy ten_ctg or default single tenant
    if (!tenant && (id === 'ten_ctg' || !id || this.data.tenants.length === 1)) {
      tenant = this.data.tenants[0];
    }
    if (!tenant) return null;
    const offices = this.getOfficesByTenant(tenant.id);
    const members = this.getTenantMembers(tenant.id);
    return {
      ...tenant,
      offices,
      members,
      officeCount: offices.length,
      memberCount: members.length
    };
  }

  createTenant({ name, ownerName, ownerEmail }) {
    const id = 'ten_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 16) + '_' + Math.floor(Math.random() * 1000);
    const date = new Date().toISOString().split('T')[0];
    
    // Ensure owner exists as a user or create user
    let user = this.data.users.find(u => u.email.toLowerCase() === ownerEmail.toLowerCase() || u.name.toLowerCase() === ownerName.toLowerCase());

    // BUSINESS RULE: A Platform Owner cannot be assigned as a Tenant Admin or Tenant Owner
    if (user && user.platformRole === 'Platform Owner') {
      throw new Error(`Business Rule Violation: "${user.name}" is a Platform Owner. A Platform Owner cannot be a Tenant Admin or Tenant Owner.`);
    }

    if (!user) {
      user = {
        id: 'usr_' + Math.floor(Math.random() * 9000 + 1000),
        name: ownerName,
        email: ownerEmail,
        platformRole: 'Platform User',
        status: 'Active',
        createdAt: date
      };
      this.data.users.push(user);
    }

    const newTenant = {
      id,
      name,
      ownerName: user.name,
      ownerEmail: user.email,
      status: 'Active',
      createdAt: date
    };

    this.data.tenants.unshift(newTenant);

    // Make the owner a Tenant Admin
    this.data.tenantMembers.push({
      id: 'tm_' + Date.now() + '_' + Math.floor(Math.random() * 100),
      tenantId: id,
      userId: user.id,
      tenantRole: 'Tenant Admin',
      status: 'Active',
      joinedAt: date
    });

    this.addAuditLog(
      this.data.currentUser.name,
      'CREATE',
      'Tenant',
      id,
      `Created tenant "${name}" assigned to ${ownerName}`
    );

    this.save();
    return newTenant;
  }

  updateTenant(id, updates) {
    const tenant = this.data.tenants.find(t => t.id === id);
    if (!tenant) return null;

    const oldStatus = tenant.status;
    Object.assign(tenant, updates);

    let action = 'UPDATE';
    let desc = `Updated tenant "${tenant.name}" properties`;
    if (updates.status && updates.status !== oldStatus) {
      action = 'STATUS_CHANGE';
      desc = `${updates.status === 'Active' ? 'Activated' : 'Suspended'} tenant "${tenant.name}"`;
    }

    this.addAuditLog(
      this.data.currentUser.name,
      action,
      'Tenant',
      id,
      desc
    );

    this.save();
    return tenant;
  }

  deleteTenant(id) {
    const index = this.data.tenants.findIndex(t => t.id === id);
    if (index === -1) throw new Error('Tenant not found');

    const tenant = this.data.tenants[index];

    // Cascade remove all offices, memberships, and staff under this tenant
    const tenantOfficeIds = this.data.offices.filter(o => o.tenantId === id).map(o => o.id);
    this.data.officeStaff = this.data.officeStaff.filter(os => !tenantOfficeIds.includes(os.officeId));
    this.data.offices = this.data.offices.filter(o => o.tenantId !== id);
    this.data.tenantMembers = this.data.tenantMembers.filter(tm => tm.tenantId !== id);

    // Remove tenant
    this.data.tenants.splice(index, 1);

    this.addAuditLog(
      this.data.currentUser.name,
      'DELETE',
      'Tenant',
      id,
      `Permanently deleted tenant organization "${tenant.name}"`
    );

    this.save();
    return true;
  }

  // --- Offices ---
  getOfficesByTenant(tenantId) {
    const targetId = (tenantId === 'ten_ctg' || !tenantId) ? 'ten_sst' : tenantId;
    return this.data.offices
      .filter(o => o.tenantId === targetId || o.tenantId === tenantId)
      .map(office => {
        const staffCount = this.data.officeStaff.filter(s => s.officeId === office.id).length;
        return {
          ...office,
          staffCount
        };
      });
  }

  getOfficeById(officeId) {
    let office = this.data.offices.find(o => o.id === officeId);
    if (!office && officeId === 'off_ctg_agr') {
      office = this.data.offices.find(o => o.id === 'off_mgl_port');
    }
    if (!office) return null;
    const tenant = this.data.tenants.find(t => t.id === office.tenantId);
    const staff = this.getOfficeStaff(office.id);
    return {
      ...office,
      tenant,
      staff,
      staffCount: staff.length
    };
  }

  createOffice(tenantId, { name, location }) {
    if (!tenantId) {
      throw new Error('Scope Violation: An office can only be created under an explicit tenant organization.');
    }
    const tenant = this.data.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Parent tenant not found.');

    const id = 'off_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 14) + '_' + Math.floor(Math.random() * 1000);
    const date = new Date().toISOString().split('T')[0];

    const newOffice = {
      id,
      tenantId,
      name,
      location: location || 'Headquarters',
      status: 'Active',
      createdAt: date
    };

    this.data.offices.push(newOffice);

    this.addAuditLog(
      this.data.currentUser.name,
      'CREATE',
      'Office',
      id,
      `Created office "${name}" under tenant "${tenant.name}"`
    );

    this.save();
    return newOffice;
  }

  updateOffice(officeId, updates, tenantId) {
    const office = this.data.offices.find(o => o.id === officeId);
    if (!office) throw new Error('Office not found');

    if (tenantId && office.tenantId !== tenantId) {
      throw new Error('Scope Violation: Office does not belong to the specified tenant organization.');
    }

    const oldStatus = office.status;
    const safeUpdates = { ...updates };
    delete safeUpdates.tenantId;
    delete safeUpdates.id;

    Object.assign(office, safeUpdates);

    let action = 'UPDATE';
    let desc = `Updated office "${office.name}" information`;
    if (updates.status && updates.status !== oldStatus) {
      action = 'STATUS_CHANGE';
      desc = `${updates.status === 'Active' ? 'Activated' : 'Suspended'} office "${office.name}"`;
    }

    this.addAuditLog(
      this.data.currentUser.name,
      action,
      'Office',
      officeId,
      desc
    );

    this.save();
    return office;
  }

  deleteOffice(officeId, tenantId) {
    const index = this.data.offices.findIndex(o => o.id === officeId);
    if (index === -1) throw new Error('Office not found');

    const office = this.data.offices[index];
    if (tenantId && office.tenantId !== tenantId) {
      throw new Error('Scope Violation: Office does not belong to the specified tenant organization.');
    }

    // Cascade remove all office staff
    this.data.officeStaff = this.data.officeStaff.filter(os => os.officeId !== officeId);

    // Remove office
    this.data.offices.splice(index, 1);

    this.addAuditLog(
      this.data.currentUser.name,
      'DELETE',
      'Office',
      officeId,
      `Deleted office branch "${office.name}"`
    );

    this.save();
    return true;
  }

  // --- Tenant Members ---
  getTenantMembers(tenantId) {
    const targetId = (tenantId === 'ten_ctg' || !tenantId) ? 'ten_sst' : tenantId;
    return this.data.tenantMembers
      .filter(tm => tm.tenantId === targetId || tm.tenantId === tenantId)
      .map(tm => {
        const user = this.data.users.find(u => u.id === tm.userId);
        return {
          ...tm,
          user: user || { id: tm.userId, name: 'Unknown User', email: 'unknown@qrew.io' }
        };
      });
  }

  addTenantMember(tenantId, { userId, name, email, tenantRole }) {
    const tenant = this.data.tenants.find(t => t.id === tenantId);
    if (!tenant) throw new Error('Tenant not found');

    let user;
    if (userId) {
      user = this.data.users.find(u => u.id === userId);
    } else if (email) {
      user = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        user = {
          id: 'usr_' + Math.floor(Math.random() * 9000 + 1000),
          name: name || email.split('@')[0],
          email: email,
          platformRole: 'Platform User',
          status: 'Active',
          createdAt: new Date().toISOString().split('T')[0]
        };
        this.data.users.push(user);
      }
    }

    if (!user) throw new Error('User selection or valid email is required.');

    // BUSINESS RULE: A Platform Owner cannot be assigned as a Tenant Admin
    if (user.platformRole === 'Platform Owner' && (tenantRole === 'Tenant Admin' || !tenantRole)) {
      throw new Error(`Business Rule Violation: "${user.name}" is a Platform Owner. A Platform Owner cannot be assigned as a Tenant Admin.`);
    }

    // Check if already a member of this tenant
    const existing = this.data.tenantMembers.find(m => m.tenantId === tenantId && m.userId === user.id);
    if (existing) {
      throw new Error(`"${user.name}" is already a member of this tenant.`);
    }

    const newMember = {
      id: 'tm_' + Date.now(),
      tenantId,
      userId: user.id,
      tenantRole: tenantRole || 'Tenant Member',
      status: 'Active',
      joinedAt: new Date().toISOString().split('T')[0]
    };

    this.data.tenantMembers.push(newMember);

    this.addAuditLog(
      this.data.currentUser.name,
      'ADD_MEMBER',
      'Tenant Member',
      tenantId,
      `Added "${user.name}" as ${newMember.tenantRole} to tenant "${tenant.name}"`
    );

    this.save();
    return { ...newMember, user };
  }

  updateTenantMemberRole(tenantId, userId, newRole) {
    const member = this.data.tenantMembers.find(m => m.tenantId === tenantId && m.userId === userId);
    if (!member) throw new Error('Tenant membership not found.');
    
    const user = this.data.users.find(u => u.id === userId);

    // BUSINESS RULE: A Platform Owner cannot be assigned as a Tenant Admin
    if (user && user.platformRole === 'Platform Owner' && newRole === 'Tenant Admin') {
      throw new Error(`Business Rule Violation: "${user.name}" is a Platform Owner and cannot hold the Tenant Admin role.`);
    }

    const tenant = this.data.tenants.find(t => t.id === tenantId);
    const oldRole = member.tenantRole;
    member.tenantRole = newRole;

    this.addAuditLog(
      this.data.currentUser.name,
      'ASSIGN_ROLE',
      'Tenant Member',
      tenantId,
      `Changed role of "${user ? user.name : userId}" from "${oldRole}" to "${newRole}" in tenant "${tenant ? tenant.name : tenantId}"`
    );

    this.save();
    return member;
  }

  removeTenantMember(tenantId, userId) {
    const memberIndex = this.data.tenantMembers.findIndex(m => m.tenantId === tenantId && m.userId === userId);
    if (memberIndex === -1) throw new Error('Tenant member not found.');

    const user = this.data.users.find(u => u.id === userId);
    const tenant = this.data.tenants.find(t => t.id === tenantId);

    // Business rule cascade: When removed from tenant, also remove from all offices belonging to that tenant!
    const tenantOffices = this.data.offices.filter(o => o.tenantId === tenantId).map(o => o.id);
    this.data.officeStaff = this.data.officeStaff.filter(os => !(tenantOffices.includes(os.officeId) && os.userId === userId));

    this.data.tenantMembers.splice(memberIndex, 1);

    this.addAuditLog(
      this.data.currentUser.name,
      'DELETE',
      'Tenant Member',
      tenantId,
      `Removed "${user ? user.name : userId}" from tenant "${tenant ? tenant.name : tenantId}" and associated offices`
    );

    this.save();
    return true;
  }

  // --- Office Staff ---
  getOfficeStaff(officeId) {
    return this.data.officeStaff
      .filter(os => os.officeId === officeId)
      .map(os => {
        const user = this.data.users.find(u => u.id === os.userId);
        return {
          ...os,
          user: user || { id: os.userId, name: 'Unknown User', email: 'unknown@qrew.io' }
        };
      });
  }

  /**
   * CRITICAL BUSINESS RULE:
   * Only users who are ALREADY members of the parent tenant can be added as office staff!
   */
  getEligibleUsersForOffice(officeId) {
    const office = this.data.offices.find(o => o.id === officeId);
    if (!office) return [];

    // 1. Get all members of the parent tenant
    const tenantMembers = this.getTenantMembers(office.tenantId);

    // 2. Filter out users who are already assigned to this specific office
    const existingStaffUserIds = this.data.officeStaff
      .filter(os => os.officeId === officeId)
      .map(os => os.userId);

    return tenantMembers
      .filter(tm => !existingStaffUserIds.includes(tm.userId))
      .map(tm => ({
        userId: tm.userId,
        name: tm.user.name,
        email: tm.user.email,
        tenantRole: tm.tenantRole
      }));
  }

  addOfficeStaff(officeId, { userId, name, email, officeRole }) {
    const office = this.data.offices.find(o => o.id === officeId);
    if (!office) throw new Error('Office not found');

    let user;
    if (userId) {
      user = this.data.users.find(u => u.id === userId);
    } else if (name && name.trim()) {
      const cleanName = name.trim();
      user = this.data.users.find(u => u.name.toLowerCase() === cleanName.toLowerCase());
      if (!user) {
        const slug = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        const tenant = this.data.tenants.find(t => t.id === office.tenantId);
        const domain = tenant ? tenant.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'qrew';
        user = {
          id: 'usr_' + Math.floor(Math.random() * 9000 + 1000),
          name: cleanName,
          email: email || `${slug}@${domain}.io`,
          platformRole: 'Platform User',
          status: 'Active',
          createdAt: new Date().toISOString().split('T')[0]
        };
        this.data.users.push(user);
      }
    }

    if (!user) {
      throw new Error('Staff name is required.');
    }

    // Ensure user is enrolled in the parent tenant organization
    const isTenantMember = this.data.tenantMembers.some(
      tm => tm.tenantId === office.tenantId && tm.userId === user.id
    );

    if (!isTenantMember) {
      this.data.tenantMembers.push({
        id: 'tm_' + Date.now(),
        tenantId: office.tenantId,
        userId: user.id,
        tenantRole: 'Tenant Member',
        status: 'Active',
        joinedAt: new Date().toISOString().split('T')[0]
      });
    }

    // Check if already in office
    const existing = this.data.officeStaff.find(os => os.officeId === officeId && os.userId === user.id);
    if (existing) {
      throw new Error(`"${user.name}" is already assigned as staff in this office.`);
    }

    const newStaff = {
      id: 'os_' + Date.now(),
      officeId,
      tenantId: office.tenantId,
      userId: user.id,
      officeRole: officeRole || 'Office Staff',
      status: 'Active',
      assignedAt: new Date().toISOString().split('T')[0]
    };

    this.data.officeStaff.push(newStaff);

    this.addAuditLog(
      this.data.currentUser.name,
      'ASSIGN_ROLE',
      'Office Staff',
      officeId,
      `Assigned "${user.name}" as ${newStaff.officeRole} in office "${office.name}"`
    );

    this.save();
    return { ...newStaff, user };
  }

  updateOfficeStaffRole(officeId, userId, newRole) {
    const staff = this.data.officeStaff.find(s => s.officeId === officeId && s.userId === userId);
    if (!staff) throw new Error('Staff member not found in this office.');

    const user = this.data.users.find(u => u.id === userId);
    const office = this.data.offices.find(o => o.id === officeId);
    const oldRole = staff.officeRole;
    staff.officeRole = newRole;

    this.addAuditLog(
      this.data.currentUser.name,
      'ASSIGN_ROLE',
      'Office Staff',
      officeId,
      `Changed office role of "${user ? user.name : userId}" from "${oldRole}" to "${newRole}" at "${office ? office.name : officeId}"`
    );

    this.save();
    return staff;
  }

  removeOfficeStaff(officeId, userId) {
    const index = this.data.officeStaff.findIndex(s => s.officeId === officeId && s.userId === userId);
    if (index === -1) throw new Error('Staff record not found.');

    const user = this.data.users.find(u => u.id === userId);
    const office = this.data.offices.find(o => o.id === officeId);

    this.data.officeStaff.splice(index, 1);

    this.addAuditLog(
      this.data.currentUser.name,
      'DELETE',
      'Office Staff',
      officeId,
      `Removed "${user ? user.name : userId}" from office "${office ? office.name : officeId}"`
    );

    this.save();
    return true;
  }

  // --- Platform Users ---
  getPlatformUsers() {
    return this.data.users.map(u => {
      // Calculate active tenant memberships
      const tenantCount = this.data.tenantMembers.filter(tm => tm.userId === u.id).length;
      return {
        ...u,
        tenantCount
      };
    });
  }

  getUsers() {
    return this.getPlatformUsers();
  }

  getUserById(userId) {
    return this.getUserDetails(userId);
  }

  getUserDetails(userId) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;

    const tenantMemberships = this.data.tenantMembers
      .filter(tm => tm.userId === userId)
      .map(tm => {
        const tenant = this.data.tenants.find(t => t.id === tm.tenantId);
        return {
          ...tm,
          tenantName: tenant ? tenant.name : tm.tenantId
        };
      });

    const officeAssignments = this.data.officeStaff
      .filter(os => os.userId === userId)
      .map(os => {
        const office = this.data.offices.find(o => o.id === os.officeId);
        const tenant = this.data.tenants.find(t => t.id === os.tenantId);
        return {
          ...os,
          officeName: office ? office.name : os.officeId,
          tenantName: tenant ? tenant.name : os.tenantId
        };
      });

    return {
      ...user,
      tenantMemberships,
      officeAssignments
    };
  }

  createPlatformUser({ name, email, platformRole }) {
    const existing = this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) throw new Error('A user with this email address already exists.');

    const newUser = {
      id: 'usr_' + Math.floor(Math.random() * 9000 + 1000),
      name,
      email,
      platformRole: platformRole || 'Platform User',
      status: 'Active',
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.data.users.unshift(newUser);

    this.addAuditLog(
      this.data.currentUser.name,
      'CREATE',
      'Platform User',
      newUser.id,
      `Created platform user "${name}" (${email}) with role ${newUser.platformRole}`
    );

    this.save();
    return newUser;
  }

  updatePlatformUser(userId, updates) {
    const user = this.data.users.find(u => u.id === userId);
    if (!user) return null;

    // BUSINESS RULE: A Tenant Admin cannot be made a Platform Owner
    if (updates.platformRole === 'Platform Owner') {
      const isTenantAdmin = this.data.tenantMembers.some(tm => tm.userId === userId && tm.tenantRole === 'Tenant Admin');
      if (isTenantAdmin) {
        throw new Error(`Business Rule Violation: "${user.name}" is currently a Tenant Admin in an organization and cannot be assigned the Platform Owner role.`);
      }
    }

    const oldRole = user.platformRole;
    const oldStatus = user.status;
    Object.assign(user, updates);

    let action = 'UPDATE';
    let desc = `Updated user "${user.name}" profile`;

    if (updates.platformRole && updates.platformRole !== oldRole) {
      action = 'ASSIGN_ROLE';
      desc = `Changed platform role of "${user.name}" from "${oldRole}" to "${updates.platformRole}"`;
    } else if (updates.status && updates.status !== oldStatus) {
      action = 'STATUS_CHANGE';
      desc = `${updates.status === 'Active' ? 'Activated' : 'Deactivated'} platform user "${user.name}"`;
    }

    this.addAuditLog(
      this.data.currentUser.name,
      action,
      'Platform User',
      userId,
      desc
    );

    this.save();
    return user;
  }

  // --- Roles & Permissions ---
  getRoles(level) {
    if (level && this.data.roles[level]) {
      return this.data.roles[level];
    }
    return this.data.roles;
  }

  // Count assigned members to a specific role
  getAssignedCountForRole(roleName, level) {
    if (level === 'platform') {
      return this.data.users.filter(u => u.platformRole === roleName).length;
    } else if (level === 'tenant') {
      return this.data.tenantMembers.filter(tm => tm.tenantRole === roleName).length;
    } else if (level === 'office') {
      return this.data.officeStaff.filter(os => os.officeRole === roleName).length;
    }
    return 0;
  }

  // --- Audit Logs ---
  getAuditLogs() {
    return [...this.data.auditLogs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getAuditLogsByTenant(tenantId) {
    const targetId = (tenantId === 'ten_ctg' || !tenantId) ? 'ten_sst' : tenantId;
    const tenantOffices = this.data.offices.filter(o => o.tenantId === targetId).map(o => o.id);
    return this.getAuditLogs().filter(log => log.resourceId === targetId || tenantOffices.includes(log.resourceId));
  }

  getAuditLogsByOffice(officeId) {
    return this.getAuditLogs().filter(log => log.resourceId === officeId || (log.description && log.description.toLowerCase().includes(officeId.toLowerCase())));
  }

  addAuditLog(actor, action, resourceType, resourceId, description) {
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    
    const newLog = {
      id: 'LOG-' + Math.floor(Math.random() * 90000 + 10000),
      actor: actor || this.data.currentUser.name,
      action,
      resourceType,
      resourceId,
      description,
      timestamp
    };

    this.data.auditLogs.unshift(newLog);
    // Keep max 200 logs in storage
    if (this.data.auditLogs.length > 200) {
      this.data.auditLogs.pop();
    }

    this.save();
    return newLog;
  }

  // ==========================================
  // Office Configuration Centre (Interface 4)
  // ==========================================
  getOfficeConfig(officeId) {
    if (!this.data.officeConfigs) this.data.officeConfigs = {};
    if (this.data.officeConfigs[officeId]) {
      return { ...this.data.officeConfigs[officeId] };
    }
    // Return sensible fallback config if not yet customized
    const office = this.getOfficeById(officeId);
    const officeName = office ? office.name : 'Branch';
    return {
      code: (officeName.slice(0, 3).toUpperCase()) + '-01',
      tier: 'Standard Branch Facility',
      floorArea: '5,000 sq ft',
      maxOccupancy: 50,
      operatingHours: '09:00 - 18:00 (Standard Shift)',
      primaryContact: '+880 31 000000',
      emergencyContact: '+880 31 999999',
      shifts: ['Standard Day (09:00 - 18:00)'],
      checkInGrace: '15 mins',
      accessControlMode: 'Smart Card RFID'
    };
  }

  saveOfficeConfig(officeId, specs) {
    if (!this.data.officeConfigs) this.data.officeConfigs = {};
    this.data.officeConfigs[officeId] = {
      ...this.getOfficeConfig(officeId),
      ...specs
    };

    const office = this.getOfficeById(officeId);
    const officeName = office ? office.name : officeId;
    this.addAuditLog(
      this.data.currentUser.name,
      'UPDATE_CONFIG',
      'Office Facility',
      officeId,
      `Updated facility specifications and operational parameters for "${officeName}"`
    );

    this.save();
    return this.data.officeConfigs[officeId];
  }

  // ==========================================
  // Department Management & Provisioning (Interfaces 4, 5, 6)
  // ==========================================
  getDepartments(officeId = null) {
    if (!this.data.departments) this.data.departments = [];
    if (officeId) {
      return this.data.departments.filter(d => d.officeId === officeId);
    }
    return [...this.data.departments];
  }

  getDepartmentById(deptId) {
    if (!this.data.departments) this.data.departments = [];
    return this.data.departments.find(d => d.id === deptId) || null;
  }

  createDepartment(deptData) {
    if (!this.data.departments) this.data.departments = [];
    const id = 'dept_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
    const newDept = {
      id,
      officeId: deptData.officeId,
      name: (deptData.name || '').trim(),
      code: (deptData.code || 'GEN').toUpperCase().trim(),
      leadName: (deptData.leadName || 'Unassigned').trim(),
      capacity: parseInt(deptData.capacity, 10) || 10,
      status: deptData.status || 'Active',
      description: (deptData.description || '').trim(),
      createdAt: new Date().toISOString().split('T')[0]
    };

    this.data.departments.push(newDept);

    const office = this.getOfficeById(deptData.officeId);
    this.addAuditLog(
      this.data.currentUser.name,
      'CREATE_DEPT',
      'Department',
      id,
      `Provisioned department "${newDept.name}" [${newDept.code}] at ${office ? office.name : deptData.officeId}`
    );

    this.save();
    return newDept;
  }

  updateDepartment(deptId, updates) {
    const dept = this.getDepartmentById(deptId);
    if (!dept) throw new Error('Department not found');

    if (updates.name) dept.name = updates.name.trim();
    if (updates.code) dept.code = updates.code.toUpperCase().trim();
    if (updates.leadName) dept.leadName = updates.leadName.trim();
    if (updates.capacity) dept.capacity = parseInt(updates.capacity, 10);
    if (updates.status) dept.status = updates.status;
    if (updates.description !== undefined) dept.description = updates.description.trim();

    this.addAuditLog(
      this.data.currentUser.name,
      'UPDATE_DEPT',
      'Department',
      deptId,
      `Updated settings for department "${dept.name}"`
    );

    this.save();
    return dept;
  }

  deleteDepartment(deptId) {
    const dept = this.getDepartmentById(deptId);
    if (!dept) throw new Error('Department not found');

    const deptName = dept.name;
    this.data.departments = this.data.departments.filter(d => d.id !== deptId);
    // Remove linked department members
    if (this.data.departmentMembers) {
      this.data.departmentMembers = this.data.departmentMembers.filter(dm => dm.deptId !== deptId);
    }

    this.addAuditLog(
      this.data.currentUser.name,
      'DELETE_DEPT',
      'Department',
      deptId,
      `Deprovisioned department "${deptName}" and reallocated roster`
    );

    this.save();
    return true;
  }

  // ==========================================
  // Department Members (Interface 6)
  // ==========================================
  getDepartmentMembers(deptId = null) {
    if (!this.data.departmentMembers) this.data.departmentMembers = [];
    if (deptId) {
      return this.data.departmentMembers.filter(dm => dm.deptId === deptId).map(dm => {
        const user = this.getUserById(dm.userId) || { name: 'Unknown User', email: '', platformRole: 'Staff' };
        return { ...dm, user };
      });
    }
    return this.data.departmentMembers.map(dm => {
      const user = this.getUserById(dm.userId) || { name: 'Unknown User', email: '', platformRole: 'Staff' };
      return { ...dm, user };
    });
  }

  addDepartmentMember(deptId, userId, deptRole = 'Staff Specialist', shift = 'Standard Day (09:00 - 18:00)') {
    if (!this.data.departmentMembers) this.data.departmentMembers = [];
    const existing = this.data.departmentMembers.find(dm => dm.deptId === deptId && dm.userId === userId);
    if (existing) {
      existing.deptRole = deptRole;
      existing.shift = shift;
      this.save();
      return existing;
    }

    const id = 'dm_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
    const newAssignment = {
      id,
      deptId,
      userId,
      deptRole,
      shift,
      status: 'On Duty'
    };
    this.data.departmentMembers.push(newAssignment);

    const user = this.getUserById(userId);
    const dept = this.getDepartmentById(deptId);
    this.addAuditLog(
      this.data.currentUser.name,
      'ASSIGN_DEPT_MEMBER',
      'Department Member',
      id,
      `Assigned ${user ? user.name : userId} to ${dept ? dept.name : deptId} as ${deptRole}`
    );

    this.save();
    return newAssignment;
  }

  removeDepartmentMember(memberId) {
    if (!this.data.departmentMembers) return false;
    const member = this.data.departmentMembers.find(m => m.id === memberId);
    if (!member) return false;

    const user = this.getUserById(member.userId);
    const dept = this.getDepartmentById(member.deptId);

    this.data.departmentMembers = this.data.departmentMembers.filter(m => m.id !== memberId);
    this.addAuditLog(
      this.data.currentUser.name,
      'REMOVE_DEPT_MEMBER',
      'Department Member',
      memberId,
      `Removed ${user ? user.name : 'Member'} from ${dept ? dept.name : 'Department'}`
    );

    this.save();
    return true;
  }

  // ==========================================
  // Member Workspace Tasks & Activity (Interface 7)
  // ==========================================
  getMemberTasks(userId = null) {
    if (!this.data.memberTasks) this.data.memberTasks = [];
    if (userId) {
      return this.data.memberTasks.filter(t => t.userId === userId);
    }
    return [...this.data.memberTasks];
  }

  getTasksByDepartment(deptId) {
    if (!this.data.memberTasks) this.data.memberTasks = [];
    return this.data.memberTasks.filter(t => t.deptId === deptId);
  }

  toggleTaskStatus(taskId) {
    if (!this.data.memberTasks) return null;
    const task = this.data.memberTasks.find(t => t.id === taskId);
    if (!task) return null;

    task.status = (task.status === 'Completed') ? 'In Progress' : 'Completed';
    this.addMemberActivity(
      task.userId,
      task.status === 'Completed' ? 'Task Completed' : 'Task Reopened',
      `Marked task "${task.title}" as ${task.status}`,
      'task'
    );

    this.save();
    return task;
  }

  createMemberTask(userId, deptId, title, priority = 'Normal', dueTime = 'Today', category = 'Operations') {
    if (!this.data.memberTasks) this.data.memberTasks = [];
    const id = 'tsk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4);
    const newTask = {
      id,
      userId,
      deptId,
      title: title.trim(),
      priority,
      dueTime,
      category,
      status: 'Pending'
    };
    this.data.memberTasks.unshift(newTask);

    this.addMemberActivity(
      userId,
      'New Task Assigned',
      `Assigned task: "${newTask.title}" [${priority} Priority]`,
      'task'
    );

    this.save();
    return newTask;
  }

  getMemberActivities(userId) {
    if (!this.data.memberActivity) this.data.memberActivity = [];
    return this.data.memberActivity.filter(a => a.userId === userId);
  }

  addMemberActivity(userId, title, description, type = 'general') {
    if (!this.data.memberActivity) this.data.memberActivity = [];
    const pad = (n) => String(n).padStart(2, '0');
    const now = new Date();
    const timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    const newActivity = {
      id: 'act_' + Date.now().toString(36),
      userId,
      title,
      description,
      timestamp: `Today, ${timeStr}`,
      type
    };
    this.data.memberActivity.unshift(newActivity);
    if (this.data.memberActivity.length > 50) this.data.memberActivity.pop();
    this.save();
    return newActivity;
  }
}

// Global instance
window.QrewStore = new DataStore();
