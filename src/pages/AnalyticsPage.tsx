import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const CATEGORY_COLORS = ['#0f766e', '#0f7b5c', '#d97706', '#2563eb', '#7c3aed']
const STATUS_COLORS: Record<string, string> = {
  in_force: '#dc2626',
  adopted: '#ea580c',
  draft: '#d97706',
  amended: '#2563eb',
  repealed: '#94a3b8',
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalRegs: 0,
    totalUsers: 0,
    totalCompliance: 0,
    totalPosts: 0,
    byCategory: [] as any[],
    byStatus: [] as any[],
    complianceByStatus: [] as any[],
    missingDesc: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [regs, compliance, posts] = await Promise.all([
        supabase.from('regulations').select('category, status, full_description'),
        supabase.from('compliance_records').select('compliance_status'),
        supabase.from('community_posts').select('category_tag'),
      ])

      const regulations = regs.data || []
      const compRecords = compliance.data || []
      const communityPosts = posts.data || []

      const categoryCount: Record<string, number> = {}
      const statusCount: Record<string, number> = {}

      regulations.forEach((regulation) => {
        categoryCount[regulation.category] = (categoryCount[regulation.category] || 0) + 1
        statusCount[regulation.status] = (statusCount[regulation.status] || 0) + 1
      })

      const complianceCount: Record<string, number> = {}
      compRecords.forEach((record) => {
        complianceCount[record.compliance_status] = (complianceCount[record.compliance_status] || 0) + 1
      })

      setStats({
        totalRegs: regulations.length,
        totalUsers: 0,
        totalCompliance: compRecords.length,
        totalPosts: communityPosts.length,
        byCategory: Object.entries(categoryCount).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
        complianceByStatus: Object.entries(complianceCount).map(([name, value]) => ({ name, value })),
        missingDesc: regulations.filter((regulation) => !regulation.full_description).length,
      })
      setLoading(false)
    }

    load()
  }, [])

  if (loading) {
    return (
      <div className="page-shell">
        <div className="surface-card flex h-64 items-center justify-center text-sm text-[hsl(var(--muted-foreground))]">
          Loading analytics...
        </div>
      </div>
    )
  }

  const statCards = [
    { label: 'Regulations', value: stats.totalRegs },
    { label: 'Compliance Records', value: stats.totalCompliance },
    { label: 'Community Posts', value: stats.totalPosts },
    { label: 'Missing Descriptions', value: stats.missingDesc },
  ]

  return (
    <div className="page-shell">
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="surface-card p-5">
            <p className="ui-caption mb-1">{card.label}</p>
            <p className="text-3xl font-semibold text-[hsl(var(--primary))]">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Regulations by Category</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.byCategory}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={84}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {stats.byCategory.map((_, index) => (
                  <Cell key={index} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="surface-card p-6">
          <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Regulations by Status</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byStatus} margin={{ top: 0, right: 10, left: -24, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {stats.byStatus.map((entry, index) => (
                  <Cell key={index} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {stats.complianceByStatus.length > 0 && (
          <div className="surface-card p-6 md:col-span-2">
            <h2 className="mb-4 text-base font-semibold text-[hsl(var(--foreground))]">Compliance Record Status</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.complianceByStatus} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f7b5c" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
