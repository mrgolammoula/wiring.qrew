# Qrew — Multi-Tenant Access Control & Operations Platform (MVP)

Qrew is an enterprise-grade multi-tenant management and access-control platform designed with a clean, modern SaaS architecture inspired by Linear, Stripe, and Vercel.

---

## 1. Architectural Model & Hierarchical Scoping

Qrew enforces a strict 4-level organizational hierarchy with isolated operational authorities:

$$\text{Platform} \longrightarrow \text{Tenants} \longrightarrow \text{Offices} \longrightarrow \text{Office Members}$$

### Operational Authority Boundaries

1. **Platform Workspace (Global Governance)**
   * **Strict Ownership**: Manages **Tenants** and Tenant CRUD operations (`Create Tenant`, `Read/Filter Tenants`, `Update Tenant`, `Suspend/Activate Tenant`, `Delete Tenant`).
   * **Platform Assets**: Global platform users, platform roles (`Platform Owner`, `Platform Admin`, `Platform User`), and system-wide audit logs.
   * **Strict Boundary**: Platform level cannot directly create, edit, or delete branch offices, and cannot manage office staff rosters.

2. **Tenant Workspace (Organization Namespace)**
   * **Strict Ownership**: Manages **Offices** and Office CRUD operations (`Create Office`, `Read Offices`, `Update Office Details`, `Suspend/Activate Office`, `Delete Office`).
   * **Tenant Member Pool**: Onboards verified users into the organization and assigns tenant-level roles (`Tenant Admin`, `Tenant Manager`, `Tenant Member`).
   * **Strict Boundary**: Tenant level cannot create tenants (Platform only) and cannot directly assign staff within an office without switching into the designated Office Workspace.

3. **Office Workspace (Physical Branch Workplace)**
   * **Strict Ownership**: Manages **Office Staff Operations** (`Add Office Staff`, `Change Office Role`, `Remove Office Staff`).
   * **Precondition Guard**: Only verified active members of the parent tenant can be assigned as staff to this branch.
   * **Strict Boundary**: Office level cannot create, edit, or suspend offices (managed exclusively by the parent Tenant Workspace). Office metadata is read-only in this tier.

> **Crucial Business Rules**:
> 1. **Separation of Governance**: A **Platform Owner** cannot hold the **Tenant Admin** or **Tenant Owner** role inside any organization. Platform governance remains strictly decoupled from tenant-level operations.
> 2. **Tenant Membership Requirement**: A user must first be an enrolled member of a parent tenant before they can be assigned to an office belonging to that tenant. Removing a user from a tenant automatically revokes their office staff assignments across all child branches.

---

## 2. Technology Stack

* **Markup**: Semantic HTML5
* **Styling**: Modern CSS3 using CSS Custom Properties (Variables), Flexbox, CSS Grid, and custom status indicators
* **Scripting**: Vanilla JavaScript (ES6+ modular architecture, zero frameworks/dependencies)
* **Persistence**: Browser `localStorage` with seed datasets, live data persistence, and one-click database reset

---

## 3. Project File Structure

```
qrew/
├── index.html            # Main semantic application shell and topbar/sidebar layouts
├── css/
│   └── style.css         # Design system tokens, component styling, and responsive layout
├── js/
│   ├── data.js           # localStorage state engine, default seed models, and RBAC query methods
│   ├── components.js     # Modal manager, toast notifications, SVG icons, and badge components
│   └── app.js            # SPA hash router, view renderers, and interactive event handlers
└── README.md             # Architecture documentation and user manual
```

---

## 4. UI/UX Design System & Palette

The user interface adheres to a warm, high-contrast executive editorial palette:

* `--color-bg`: `#F7F4F0` (Warm Cream / Ivory)
* `--color-surface`: `#EFECE6` (Soft Oatmeal / Beige)
* `--color-text-primary`: `#1F1D1A` (Deep Espresso / Charcoal)
* `--color-text-muted`: `#7A736B` (Warm Taupe / Gray-Brown)
* `--color-accent`: `#9E5334` (Terracotta / Rust)
* `--color-accent-hover`: `#854327` (Deep Rust / Burnt Sienna)
* `--color-dark`: `#26201D` (Rich Dark Brown)
* `--color-border`: `#E3DDD3` (Soft Warm Border)

---

## 5. Workspaces & Navigation Architecture

Qrew implements three distinct workspaces accessible via the top-level workspace switcher tabs, each featuring its own dedicated contextual sidebar navigation:

### 1. Platform Workspace
* **Top Navigation Tab**: `Platform`
* **Dedicated Sidebar**:
  - **Overview** (`#platform/overview`): High-level system statistics, recent tenants, and live audit feed.
  - **Tenants** (`#platform/tenants`): Filterable directory of all registered organizations with creation and status management.
  - **Platform Users** (`#platform/users`): Directory of platform credentials, cross-tenant membership inspectors, and account activation.
  - **Platform Roles** (`#platform/roles`): Inspection matrix of platform-level roles (`Platform Owner`, `Platform Admin`, `Platform User`) and permissions.
  - **Audit Logs** (`#platform/audit-logs`): Tamper-evident, filterable activity trail of all platform-wide events.

### 2. Tenant Workspace
* **Top Navigation Tab**: `Tenant`
* **Context Picker**: Organization dropdown selector in sidebar to instantly switch between tenants.
* **Dedicated Sidebar**:
  - **Overview** (`#tenant/overview?id={tenantId}`): Organization metrics, branch summary, and member roster preview.
  - **Offices** (`#tenant/offices?id={tenantId}`): Branch and facility management with creation modals and status toggles.
  - **Members** (`#tenant/members?id={tenantId}`): Organization membership directory with role assignments.
  - **Tenant Roles** (`#tenant/roles?id={tenantId}`): RBAC permissions inspection matrix for tenant operations (`tenant_*`, `office_*`).
  - **Quick Action**: Direct return link `← Return to Platform`.

### 3. Office Workspace
* **Top Navigation Tab**: `Office`
* **Context Picker**: Branch dropdown selector scoped to the parent organization.
* **Dedicated Sidebar**:
  - **Overview** (`#office/overview?tenantId={tenantId}&officeId={officeId}`): Branch facility details, on-site personnel counts, provisioned departments summary, and parent organization linkage.
  - **Staff** (`#office/staff?tenantId={tenantId}&officeId={officeId}`): On-site staff assignments strictly selectable from parent tenant members.
  - **Departments** (`#office/departments?tenantId={tenantId}&officeId={officeId}`): Dedicated directory of branch operational departments with direct click-through to Department Workspaces.
  - **Roles & Permissions** (`#office/roles?tenantId={tenantId}&officeId={officeId}`): Physical facility operational roles (`Office Manager`, `Office Supervisor`, `Office Staff`).
  - **Activity** (`#office/activity?tenantId={tenantId}&officeId={officeId}`): Branch-specific audit and activity log.
  - **Quick Actions**: Link to Facility Configuration Centre, `← Back to Tenant` and `← Return to Platform`.

---

## 6. The 7-Interface System Architecture Flow

Qrew implements the complete 7-interface system architecture flow depicted in the system hierarchy blueprint:

```
[1. Qrew.com Landing & Auth] ──> [Platform User Gateway]
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 ▼                                               ▼
     [2. Platform Admins Panel]                      [3. Tenant Admins Panel]
                 │                                        (ctg.sst.com)
                 ▼                                         │        │
   [4. Office Configuration Centre]                        │        ▼
                 │                                         ▼   [6. Department Workspace]
                 ▼                            [5. Office Admins Panel]      │
    [5. Office Admins Panel]                                                ▼
                                                               [7. Office Member Workspace]
```

### Flow Breakdown & URLs

1. **1. Landing & Authentication (`#landing`)**
   * **Domain Context**: `Qrew.com` public portal.
   * **Features**: Full-width SaaS landing page, hero section, interactive 4-tier architecture cards, enterprise capabilities grid, and 4 one-click persona login cards (Sakib - Platform Owner, Rafiqul Islam - Tenant Admin, Jack Rahman - Office Manager, Nusrat Jahan - Office Staff).

2. **2. Qrew Platform Admins (`#platform/overview`)**
   * **Domain Context**: Global administrative headquarters.
   * **Features**: Global tenant governance, multi-tenant directory, platform credential management, RBAC permission matrices, and a direct launcher into the **Office Configuration Centre**.

3. **3. Tenant Admins Panel (`#tenant/overview?id=ten_ctg`)**
   * **Domain Context**: Organization administration (`ctg.sst.com`).
   * **Features**: Organization overview, branch office directory with quick action links to **Office Configuration Centre** and **Office Admin Panel**, verified member onboarding, and tenant-scoped role configuration.

4. **4. Office Configuration Centre (`#office-config?tenantId=ten_ctg&officeId=off_ctg_port`)**
   * **Domain Context**: Physical plant and infrastructure setup studio.
   * **Features**: Facility code, security classification tier, floor area, occupancy limits, operational shift configuration with check-in grace period, and the **Department Provisioning UI** (provision, edit, or deprovision departments), followed by a 1-click **"Deploy to Office Admin"** transition.

5. **5. Office Admins Panel (`#office/overview?tenantId=ten_ctg&officeId=off_ctg_port`)**
   * **Domain Context**: On-site branch operations management.
   * **Features**: Facility overview, on-site staff roster, a dedicated **Departments** tab (`#office/departments`), role matrices, chronological activity trail, and direct drill-downs into Department Workspaces.

6. **6. Department Workspace (`#department/overview?deptId=dept_ctg_ops`)**
   * **Domain Context**: Operational unit hub (e.g. *Port Operations*, *Fleet & Logistics*, *Facility Security*).
   * **Features**: Department KPIs (Assigned personnel, On-duty today, Queue items, Shift coverage), department staff roster with sub-roles (*Department Lead*, *Operations Specialist*), interactive daily operational queue with status toggles, and direct links to **Office Member Workspaces**.

7. **7. Office Member Workspace (`#member/overview?userId=usr_nusrat`)**
   * **Domain Context**: Individual employee self-service hub (e.g. *Nusrat Jahan, Operations Specialist*).
   * **Features**: Employee profile card with tenant/office/department badges, active shift indicator (`Morning Shift 08:00 - 16:00 • Checked In`), interactive daily task checklist with instant status toggles, department supervisor and on-shift team contact cards, and personal timeclock/activity history.

### Interactive Quick Navigator: "Flow (1-7)"
At any time, clicking the **"Flow (1-7)"** button in the top navigation bar opens an interactive popover allowing immediate 1-click navigation to any of the 7 interfaces.

---

## 7. Key Usability & Enterprise Features

* **Collapsible Sidebar**: Expand/collapse sidebar via the toggle chevron, topbar button, brand logo click, or the `Ctrl+B` / `Cmd+B` keyboard shortcut.
* **Editable User Profile**: Access "My Profile" directly from the user dropdown to edit user name, email, or view current permissions.
* **Strict Role Separation Enforcement**: Architectural guards prevent Platform Owners from being assigned Tenant Admin roles.
* **Strict Tenant Member Scoping**: Office staff assignment modals only allow picking verified members of the governing organization.
* **Demo Data Reset**: Instant one-click restore from the top-right profile dropdown.

7. **Audit Logs (`#audit-logs`)**
   * Chronological activity feed tracking every creation, update, deletion, role assignment, and status change.
   * Live keyword search, action filter, and resource type filter.

---

## 6. How to Run Locally

Because Qrew is built entirely with native web technologies, no build tools, bundlers, or `npm install` steps are required:

1. Open `index.html` directly in any modern web browser (Chrome, Edge, Firefox, Safari).
2. Alternatively, serve with a lightweight local HTTP server:
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
3. Use the top-right profile menu (`SA` avatar) to **Reset Demo Data** at any time to return to the original initial seed data.
#   Q r e w  
 