import features from '../acl'
import setup from '../setup'
import { metadata as pageMetadata } from '../backend/moser-saas/page.meta'

describe('moser_saas_admin contract', () => {
  it('declares view and manage features with manage depending on view', () => {
    expect(features).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'moser_saas_admin.view' }),
      expect.objectContaining({
        id: 'moser_saas_admin.manage',
        dependsOn: ['moser_saas_admin.view'],
      }),
    ]))
  })

  it('grants SaaS super-admin access only to the platform superadmin default role', () => {
    expect(setup.defaultRoleFeatures?.superadmin).toContain('moser_saas_admin.*')
    expect(setup.defaultRoleFeatures?.admin).toBeUndefined()
    expect(setup.defaultRoleFeatures?.employee).toBeUndefined()
  })

  it('protects the dashboard with the dedicated view feature', () => {
    expect(pageMetadata.requireAuth).toBe(true)
    expect(pageMetadata.requireFeatures).toEqual(['moser_saas_admin.view'])
  })
})
