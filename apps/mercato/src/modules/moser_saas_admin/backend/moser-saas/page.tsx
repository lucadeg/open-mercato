"use client"

import * as React from 'react'
import Link from 'next/link'
import { Page, PageHeader, PageBody } from '@open-mercato/ui/backend/Page'
import { Badge } from '@open-mercato/ui/primitives/badge'
import { Button } from '@open-mercato/ui/primitives/button'
import { apiCall } from '@open-mercato/ui/backend/utils/apiCall'
import { useOrganizationScopeVersion } from '@open-mercato/shared/lib/frontend/useOrganizationScope'

type TotalResponse = { total?: number }
type RoleRow = { id: string; name: string; slug: string }
type RolesResponse = { items?: RoleRow[]; total?: number }

type Overview = {
  sellerTenants: number | null
  staffUsers: number | null
  customers: number | null
  portalUsers: number | null
  testers: number | null
  scouts: number | null
  testerRoleReady: boolean
  scoutRoleReady: boolean
  errors: string[]
}

const EMPTY: Overview = {
  sellerTenants: null,
  staffUsers: null,
  customers: null,
  portalUsers: null,
  testers: null,
  scouts: null,
  testerRoleReady: false,
  scoutRoleReady: false,
  errors: [],
}
async function readTotal(url: string): Promise<number> {
  const call = await apiCall<TotalResponse>(url)
  if (!call.ok) throw new Error(`GET ${url} failed (${call.response.status})`)
  return typeof call.result?.total === 'number' ? call.result.total : 0
}

async function readRoles(): Promise<RoleRow[]> {
  const call = await apiCall<RolesResponse>('/api/customer_accounts/admin/roles?page=1&pageSize=100')
  if (!call.ok) throw new Error(`GET customer roles failed (${call.response.status})`)
  return Array.isArray(call.result?.items) ? call.result.items : []
}

async function readRoleCount(roleId: string): Promise<number> {
  return readTotal(
    `/api/customer_accounts/admin/users?page=1&pageSize=1&roleId=${encodeURIComponent(roleId)}`,
  )
}

function metric(value: number | null): string {
  return value == null ? 'N/D' : value.toLocaleString()
}

function KpiCard(props: {
  title: string
  value: number | null
  scope: 'platform' | 'current-scope'
  detail: string
  href: string
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{props.title}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{metric(props.value)}</p>
        </div>
        <Badge variant={props.scope === 'platform' ? 'brand' : 'neutral'}>
          {props.scope === 'platform' ? 'Platform' : 'Current scope'}
        </Badge>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{props.detail}</p>
      <Button asChild variant="outline" className="mt-4">
        <Link href={props.href}>Manage</Link>
      </Button>
    </div>
  )
}
function ResourceCard(props: {
  title: string
  description: string
  href: string
  status?: string
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-medium">{props.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{props.description}</p>
        </div>
        {props.status ? <Badge variant="neutral">{props.status}</Badge> : null}
      </div>
      <Button asChild variant="outline" className="mt-4">
        <Link href={props.href}>Open</Link>
      </Button>
    </div>
  )
}

export default function MoserSaasSuperAdminPage() {
  const scopeVersion = useOrganizationScopeVersion()
  const [overview, setOverview] = React.useState<Overview>(EMPTY)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let cancelled = false

    async function loadOverview() {
      setLoading(true)
      const next: Overview = { ...EMPTY, errors: [] }

      const platformReads = await Promise.allSettled([
        readTotal('/api/directory/tenants?page=1&pageSize=1'),
        readTotal('/api/auth/users?page=1&pageSize=1'),
      ])

      if (platformReads[0].status === 'fulfilled') next.sellerTenants = platformReads[0].value
      else next.errors.push('Seller tenants unavailable')

      if (platformReads[1].status === 'fulfilled') next.staffUsers = platformReads[1].value
      else next.errors.push('Staff users unavailable')

      const scopedReads = await Promise.allSettled([
        readTotal('/api/customers/people?page=1&pageSize=1'),
        readTotal('/api/customer_accounts/admin/users?page=1&pageSize=1'),
        readRoles(),
      ])
      if (scopedReads[0].status === 'fulfilled') next.customers = scopedReads[0].value
      else next.errors.push('CRM customers unavailable in current scope')

      if (scopedReads[1].status === 'fulfilled') next.portalUsers = scopedReads[1].value
      else next.errors.push('Portal users unavailable in current scope')

      if (scopedReads[2].status === 'fulfilled') {
        const roles = scopedReads[2].value
        const testerRole = roles.find((role) => role.slug.toLowerCase() === 'tester')
        const scoutRole = roles.find((role) => role.slug.toLowerCase() === 'scout')
        next.testerRoleReady = Boolean(testerRole)
        next.scoutRoleReady = Boolean(scoutRole)

        const personaReads = await Promise.allSettled([
          testerRole ? readRoleCount(testerRole.id) : Promise.resolve(null),
          scoutRole ? readRoleCount(scoutRole.id) : Promise.resolve(null),
        ])
        next.testers = personaReads[0].status === 'fulfilled'
          ? personaReads[0].value
          : null
        next.scouts = personaReads[1].status === 'fulfilled'
          ? personaReads[1].value
          : null
      } else {
        next.errors.push('Customer roles unavailable in current scope')
      }

      if (!cancelled) {
        setOverview(next)
        setLoading(false)
      }
    }

    void loadOverview()
    return () => { cancelled = true }
  }, [scopeVersion])

  return (
    <Page>
      <PageHeader
        title="Moser SaaS Super Admin"
        description="Platform control plane for seller tenants, staff, customers, testers, scouts and access governance."
      />
      <PageBody className="space-y-6">
        <div className="rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="brand">SUPER ADMIN</Badge>
            <Badge variant="neutral">Tenant-safe</Badge>
            <Badge variant="neutral">Open Mercato fork</Badge>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Seller and staff totals are platform-level. Customer, tester, scout and portal totals are intentionally
            limited to the currently selected tenant and organization. Change scope before operating on another seller.
          </p>
        </div>
        {loading ? (
          <div className="rounded-lg border p-4" role="status" aria-live="polite">
            <p className="text-sm text-muted-foreground">Loading SaaS control-plane metrics…</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <KpiCard
                title="Seller tenants"
                value={overview.sellerTenants}
                scope="platform"
                detail="Open Mercato tenant boundaries used for SaaS seller isolation."
                href="/backend/directory/tenants"
              />
              <KpiCard
                title="Staff users"
                value={overview.staffUsers}
                scope="platform"
                detail="Back-office users visible to the platform super-admin."
                href="/backend/users"
              />
              <KpiCard
                title="CRM customers"
                value={overview.customers}
                scope="current-scope"
                detail="CRM people in the selected seller tenant and organization."
                href="/backend/customers/people"
              />
              <KpiCard
                title="Portal accounts"
                value={overview.portalUsers}
                scope="current-scope"
                detail="Customer-facing accounts in the selected seller scope."
                href="/backend/customer_accounts/users"
              />
              <KpiCard
                title="Testers"
                value={overview.testers}
                scope="current-scope"
                detail={overview.testerRoleReady ? 'Accounts assigned to the tester customer role.' : 'Tester role is not configured in this scope.'}
                href="/backend/customer_accounts/roles"
              />
              <KpiCard
                title="Scouts"
                value={overview.scouts}
                scope="current-scope"
                detail={overview.scoutRoleReady ? 'Accounts assigned to the scout customer role.' : 'Scout role is not configured in this scope.'}
                href="/backend/customer_accounts/roles"
              />
            </div>

            {overview.errors.length ? (
              <div className="rounded-lg border p-4">
                <h2 className="font-medium">Partial telemetry</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {overview.errors.map((error) => <li key={error}>{error}</li>)}
                </ul>
              </div>
            ) : null}
          </>
        )}
        <section>
          <h2 className="text-lg font-semibold">Management planes</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Existing Open Mercato authorities remain the write surfaces; this module composes them into one SaaS console.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <ResourceCard
              title="Seller tenants"
              description="Create, activate, edit and archive seller tenant boundaries."
              href="/backend/directory/tenants"
              status="Platform"
            />
            <ResourceCard
              title="Organizations"
              description="Manage organizations inside the selected seller tenant."
              href="/backend/directory/organizations"
              status="Scoped"
            />
            <ResourceCard
              title="Staff & seller operators"
              description="Manage staff users, role assignments and organization membership."
              href="/backend/users"
              status="Platform"
            />
            <ResourceCard
              title="Customers"
              description="Manage CRM people and customer lifecycle data for the selected seller."
              href="/backend/customers/people"
              status="Scoped"
            />
            <ResourceCard
              title="Portal users"
              description="Manage customer-facing identities, invitations and account state."
              href="/backend/customer_accounts/users"
              status="Scoped"
            />
            <ResourceCard
              title="Tester / Scout roles"
              description="Create and maintain persona roles such as tester and scout, then assign portal users."
              href="/backend/customer_accounts/roles"
              status="Scoped"
            />
            <ResourceCard
              title="Staff roles & RBAC"
              description="Manage back-office role features and access boundaries."
              href="/backend/roles"
              status="Platform"
            />
            <ResourceCard
              title="Audit ledger"
              description="Review administrative changes and operational audit records."
              href="/backend/audit-logs"
              status="Governance"
            />
          </div>
        </section>
      </PageBody>
    </Page>
  )
}
