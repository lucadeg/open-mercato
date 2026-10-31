# Moser Commerce SaaS Super Admin

## TLDR

Add an app-owned Open Mercato module named `moser_saas_admin` that becomes the SaaS control surface for Moser Commerce.
It is visible only to platform super-admins and composes existing Open Mercato tenant, organization, staff, CRM,
customer-account, customer-role and audit capabilities instead of duplicating those authorities.

The first implementation is deliberately schema-free: it adds no new cross-tenant table and never bypasses tenant or
organization scope. Seller tenants may be administered globally through the existing directory tenant authority.
Customers, testers, scouts and other portal personas remain tenant/organization-scoped and are managed through
existing CRM/customer-account role surfaces after selecting the intended tenant/organization.

## Overview

Moser Commerce already owns storefront, Seller Manager and commerce workflows.
Open Mercato already supplies multi-tenancy, organization hierarchy, RBAC, users, CRM people, portal accounts,
portal roles and audit logs. The super-admin surface must combine these systems without creating a second identity,
tenant, customer or permission database.

The dedicated fork branch is `feat/moser-saas-super-admin` on `lucadeg/open-mercato`.
Upstream remains `open-mercato/open-mercato`; the fork branch is the Moser SaaS customization boundary.
## Problem Statement

Moser needs one SaaS-level administrative area to operate all sellers and their users while retaining strict isolation.
The requested operational populations include sellers, customers, testers, scouts and future personas.

A naive global table that joins all customer/persona records across tenants would violate Open Mercato's tenant model.
A second role/identity registry would also drift from Open Mercato and Moser authorities.

## Proposed Solution

Create `apps/mercato/src/modules/moser_saas_admin` as an `@app` module.

The dashboard provides:
- platform seller-tenant count and tenant management;
- cross-tenant staff-user count through the existing super-admin users endpoint;
- current-scope CRM customer count;
- current-scope portal-account count;
- current-scope tester and scout counts when those customer-role slugs exist;
- direct management entry points for tenants, organizations, staff users, CRM people, portal users, portal roles and audit logs;
- explicit scope labels so operators cannot mistake tenant-scoped counts for global counts.

ACL:
- `moser_saas_admin.view`;
- `moser_saas_admin.manage`.
Only the built-in `superadmin` role receives `moser_saas_admin.*` by default.
## Architecture

```text
Moser Commerce / Seller Manager
        |
        | commerce/project authority
        v
Moser SaaS Super Admin (Open Mercato @app module)
        |
        +--> Directory tenants + organizations
        +--> Auth staff users + RBAC
        +--> Customers CRM people/companies
        +--> Customer Accounts users + roles
        +--> Audit Logs
```

The module is a composition plane, not a replacement service.
It uses published Open Mercato HTTP/API and page contracts.
It does not add direct ORM relationships to other modules.

Seller mapping: one SaaS seller boundary is represented by an Open Mercato tenant and its organizations.
Customer/tester/scout mapping: portal people are CRM/customer-account records within the selected tenant and organization;
persona classification is represented by customer role slugs such as `tester` and `scout`.

## Data Models

No new database entity in phase 1.
No migration is required.
No cross-tenant actor cache is introduced.
## API Contracts

No new public write API is introduced in phase 1.

Read dependencies:
- `GET /api/directory/tenants?page=1&pageSize=1` for seller-tenant total;
- `GET /api/auth/users?page=1&pageSize=1` for staff-user total (super-admin response may include multiple tenants);
- `GET /api/customers/people?page=1&pageSize=1` for current-scope CRM people;
- `GET /api/customer_accounts/admin/users?page=1&pageSize=1` for current-scope portal accounts;
- `GET /api/customer_accounts/admin/roles?page=1&pageSize=100` to resolve tester/scout role IDs;
- role-filtered customer-account reads for current-scope tester/scout totals.

All write operations remain on the existing guarded module pages/APIs.
The super-admin dashboard never performs a mutation itself in phase 1.

## Security and Scope

The page requires authentication and `moser_saas_admin.view`.
Default setup grants the feature only to `superadmin`.
Existing endpoint authorization remains authoritative.
No request drops tenant/organization predicates from customer or portal account APIs.
## Risks & Impact Review

| Risk | Severity | Affected area | Mitigation | Residual risk |
| --- | --- | --- | --- | --- |
| Operator reads current-scope count as global | High | Customer/tester/scout operations | Every scoped KPI is labeled CURRENT SCOPE | Low |
| Cross-tenant customer leakage | Critical | CRM / portal | Reuse existing scoped endpoints; no global customer query | Low |
| Duplicate identity authority | High | Moser/Open Mercato integration | Compose existing modules; no actor table in phase 1 | Low |
| Tester/scout roles absent | Medium | Persona management | Show role as not configured and link role manager | Low |
| Upstream Open Mercato changes | Medium | Fork maintenance | Keep upstream remote and dedicated fork branch | Medium |
| Super-admin page exposed to tenant admin | Critical | Authorization | Dedicated feature granted only to superadmin | Low |

## Validation

Required for this branch:
- `yarn generate`;
- `yarn mercato configs cache structural --all-tenants` when runtime configuration is available;
- module-focused DS lint for `moser_saas_admin`;
- `yarn typecheck` or the nearest app/core typecheck target;
- production build if local dependencies/runtime permit it;
- verify generated registry recognizes `moser_saas_admin`.

No database migration is executed by this change.

## Final Compliance Report

Design preserves Open Mercato tenant and organization isolation.
No generated file is hand-edited.
No direct cross-module ORM relationship is introduced.
No new write path bypasses mutation guards because phase 1 adds no write API.
The dedicated module is app-owned and therefore remains isolated from upstream core business modules.

## Changelog

- 2026-10-01: Initial Moser SaaS Super Admin spec and dedicated fork branch.
- 2026-10-01: Phase 1 scope fixed to composition dashboard with no new database schema.
