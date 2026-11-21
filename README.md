# Qrew — Frontend Wireframe

Clickable, frontend-only wireframe of the Qrew multi-tenant platform. It is organized **per interface** so each screen group is self-contained, easy to extend while wireframing, and straightforward to migrate or leave behind when copying markup/styles into the real app.

No build step, no bundler, no dependencies (works directly over `file://` as well as HTTP). Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
# or
python -m http.server 8080
```

## Hierarchy

```
Platform → Tenant → Office → Department → Member
```

| Level | Owns | Cannot |
|---|---|---|
| Platform | Tenants (CRUD, suspend), platform users & roles | Manage offices or office staff directly |
| Tenant | Offices (CRUD), tenant member pool, tenant roles, domain/plan settings | Create tenants |
| Office | Office staff, departments, invoices, clients, files | Create/edit offices |
| Department | Department roster, operational queue | — |
| Member | Own tasks, shift, activity | — |

Business rules enforced in `core/data.js`:

1. A Platform Owner cannot be a Tenant Admin/Owner.
2. A user must be a tenant member before being assigned to one of that tenant's offices.
   Deleting a tenant or office cascades to its memberships/staff.
3. Mutations are written to an audit log.

## Folder Structure

```text
index.html                         App shell & ordered script/stylesheet manifest
README.md                          Architecture & wireframe guide
.agents/rules/                     Palette and UI/UX guidelines

styles/                            Shared design system & shell CSS
  tokens.css                       :root colors, fonts, shadows, radii, layout metrics
  shell.css                        Reset, sidebar, topbar, domain badge, responsive rules
  components.css                   Reusable buttons, cards, tables, badges, modals, toasts

core/                              Shared runtime (classic scripts on window.Qrew)
  ui.js                            QrewUI: SVG icons, modal, confirmDialog, toast, badges, emptyState
  data.js                          QrewStore: localStorage-backed seed data, RBAC, business rules
  app.js                           Namespace, shared state, domain helpers, interface registry
  router.js                        Hash parser (including legacy aliases) & route dispatcher
  shell.js                         Sidebar/topbar/profile rendering, global listeners, boot

wireframe/                         Wireframe-only conveniences (do not copy to real app)
  personas.js                      1-Click Persona Login modal

interfaces/                        One folder per workspace / interface
  landing/
    landing.css                    Platform & Tenant landing styles
    platform-landing.js            #landing
    tenant-landing.js              #tenant-landing?id=
  platform/
    tenants.js                     Tenants directory + tenant CRUD modals
    index.js                       #platform/* (Overview, Tenants, 9 titled placeholders)
  super-admin/
    index.js                       #super-admin/* (Permission Catalog, Platform Setting placeholders)
  tenant/
    overview.js                    #tenant/overview?id=
    offices.js                     #tenant/offices?id= + office CRUD modals
    members.js                     #tenant/members?id= + member role/assignment modals
    roles.js                       #tenant/roles?id=
    settings.js                    #tenant/settings?id= (company profile, domain, plan)
    index.js                       Tenant workspace registration, sidebar, tenant picker
  office-config/
    index.js                       #office-config/* (4 titled placeholders + all-offices picker)
  office/
    index.js                       #office/* (5 titled placeholders + tenant-offices picker)
  office-admin/
    index.js                       #office-admin/* (3 titled placeholders + tenant-offices picker)
  department/
    department.css                 Department workspace styles
    index.js                       #department/* (KPIs, roster, queue, task & staff modals)
  member/
    member.css                     Member workspace styles
    index.js                       #member/* (profile, shift, checklist, contacts, activity)
```

## Routes

| Workspace | Route prefix | Topbar domain | Status |
|---|---|---|---|
| Platform landing | `#landing` | — | Built |
| Tenant landing | `#tenant-landing?id=` | — | Built |
| Platform Admin | `#platform/*` | `app.qrew.com/admin` | Overview + 3-level Tenants tree built; 9 placeholders |
| Super Admin | `#super-admin/*` | `app.qrew.com/admin` | 2 placeholders |
| Tenant | `#tenant/*?id=` | `app.<tenant>.com` | Overview, 2-level Offices tree, Members, Roles, Settings built |
| Office Config | `#office-config/*?tenantId=&officeId=` | `app.qrew.com/office config` | 4 placeholders |
| Office | `#office/*?tenantId=&officeId=` | `sst.ctg.com` / `sst.mgl.com` | 5 placeholders |
| Office Admin | `#office-admin/*?tenantId=&officeId=` | `sst.ctg.com/admin` / `sst.mgl.com/admin` | 3 placeholders |
| Department | `#department/*?deptId=` | `sst.ctg.com` / `sst.mgl.com` | Built |
| Member | `#member/*?userId=` | `sst.ctg.com` / `sst.mgl.com` | Built |

## Shell & UI Highlights

- **Per-panel color identity:** `core/app.js` + `styles/tokens.css` apply `--panel-accent`, `--panel-accent-light`, and `--panel-accent-hover` dynamically per workspace, with panel-scoped user persona sync in `core/shell.js`.
- **Collapsible sidebar:** Toggle via the header button (`#sidebar-toggle-btn`) or `Ctrl+B` / `Cmd+B`, with collapsed state persisted in `localStorage` (`qrew_sidebar_collapsed`) and hover tooltips.
- **Hierarchical tree explorers:** `#platform/tenants` (3-level root → tenant → office) and `#tenant/offices` (2-level tenant → office) support search, status filtering, and action menus.

## Adding or Extending an Interface

1. **New view in an existing interface**: add or replace the view branch in `interfaces/<name>/index.js` (or extract a sub-file like `interfaces/tenant/offices.js` and include its `<script>` tag in `index.html`).
2. **New interface**: create `interfaces/<name>/index.js` calling `Qrew.registerInterface({ id, brandHome, getDomainBadge, getSidebarConfig, render })`, add its route normalization in `core/router.js`, and add its `<script>` (and optional `.css`) tag to `index.html`.

## Data & Wireframe-Only Items

- State lives in `localStorage` under `qrew_platform_state_v4`, seeded with one tenant (`SST`), two port offices (`Chittagong Port Office`, `Mongla Port Office`), departments, users, tasks, and audit logs. Use **Profile menu → Reset Demo Data** to restore the seed. Bump `STORAGE_KEY` in `core/data.js` when the seed shape changes.
- Items marked `wireframe-only` (`wireframe/personas.js`, quick-switch bars in `interfaces/member/index.js` and `interfaces/landing/platform-landing.js`, and the demo reset menu item) are for testing flows and should not be copied into the production app.
