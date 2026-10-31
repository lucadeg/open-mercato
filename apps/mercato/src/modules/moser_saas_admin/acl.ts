export const features = [
  { id: 'moser_saas_admin.view', title: 'View Moser SaaS Super Admin', module: 'moser_saas_admin' },
  {
    id: 'moser_saas_admin.manage',
    title: 'Manage Moser SaaS platform',
    module: 'moser_saas_admin',
    dependsOn: ['moser_saas_admin.view'],
  },
]

export default features
