# Qrew — Frontend Wireframe

Clickable, frontend-only wireframe of the Qrew multi-tenant platform. It is used to agree on
**information architecture, navigation, role boundaries and screen inventory** before building
the real app. Parts of the markup/CSS may be lifted into the real app; the demo conveniences
(persona login, cross-workspace jump links, reset button) are wireframe-only.

No build step, no dependencies. Open `index.html` in a browser, or serve the folder:

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

Business rules enforced in `js/data.js`:

1. A Platform Owner cannot be a Tenant Admin/Owner.
2. A user must be a tenant member before being assigned to one of that tenant's offices.
   Deleting a tenant or office cascades to its memberships/staff.
3. Mutations are written to an audit log.

## Routes

Hash-based router in `js/app.js`. Each workspace has its own sidebar.

| Workspace | Route prefix | Status |
|---|---|---|
| Platform landing | `#landing` | Built |
| Tenant landing | `#tenant-landing?id=` | Built |
| Platform Admin | `#platform/*` | Overview + Tenants built; other sections are titled placeholders |
| Super Admin | `#super-admin/*` | Placeholders |
| Tenant | `#tenant/*?id=` | Overview, Offices, Members, Roles, Settings built |
| Office Config | `#office-config/*?tenantId=&officeId=` | Placeholders |
| Office | `#office/*?tenantId=&officeId=` | Placeholders |
| Office Admin | `#office-admin/*?tenantId=&officeId=` | Placeholders |
| Department | `#department/*?deptId=` | Built |
| Member | `#member/*?userId=` | Built |

The topbar shows a simulated URL for the current workspace (e.g. `App.Qrew.com/Admin`,
`App.SST.com`, `SST.CTG.com/Admin`) to communicate which domain each screen will live on.

## Files

```
index.html          App shell (sidebar, topbar, content area)
css/style.css       Design tokens + component styles
js/components.js    QrewUI: icons, modal, confirm dialog, toast, badges, empty state
js/data.js          QrewStore: localStorage-backed seed data, RBAC and business rules
js/app.js           Router, sidebars, view renderers, modals
.agents/rules/      Palette and UI/UX rules the wireframe follows
```

## Data

State lives in `localStorage` under `qrew_platform_state_v4`, seeded with one tenant (SST),
two port offices (Chittagong, Mongla), departments, users, tasks and audit entries.
Use **Profile menu → Reset Demo Data** to restore the seed. Bump `STORAGE_KEY` in
`js/data.js` when the seed shape changes.
