import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const CAT_COLORS = ['#3b82f6','#22c55e','#14b8a6','#f97316','#a855f7']
const STATUS_COLORS: Record<string, string> = {
  in_force: '#22c55e', adopted: '#f59e0b', draft: '#94a3b8', amended: '#3b82f6', repealed: '#ef4444'
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState({
    totalRegs: 0, totalUsers: 0, totalCompliance: 0, totalPosts: 0,
    byCategory: [] as any[], byStatus: [] as any[],
    complianceByStatus: [] as any[], missingDesc: 0,
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

      const catCount: Record<string, number> = {}
      const statusCount: Record<string, number> = {}
      regulations.forEach(r => {
        catCount[r.category] = (catCount[r.category] || 0) + 1
        statusCount[r.status] = (statusCount[r.status] || 0) + 1
      })

      const csCount: Record<string, number> = {}
      compRecords.forEach(r => { csCount[r.compliance_status] = (csCount[r.compliance_status] || 0) + 1 })

      setStats({
        totalRegs: regulations.length,
        totalUsers: 0,
        totalCompliance: compRecords.length,
        totalPosts: communityPosts.length,
        byCategory: Object.entries(catCount).map(([name, value]) => ({ name, value })),
        byStatus: Object.entries(statusCount).map(([name, value]) => ({ name, value })),
        complianceByStatus: Object.entries(csCount).map(([name, value]) => ({ name, value })),
        missingDesc: regulations.filter(r => !r.full_description).length,
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex items-center justify-center h-full text-slate-400">Loading analytics…</div>

  const statCards = [
    { label: 'Regulations', value: stats.totalRegs, color: 'bg-blue-50 text-blue-700' },
    { label: 'Compliance Records', value: stats.totalCompliance, color: 'bg-green-50 text-green-700' },
    { label: 'Community Posts', value: stats.totalPosts, color: 'bg-purple-50 text-purple-700' },
    { label: 'Missing Descriptions', value: stats.missingDesc, color: 'bg-red-50 text-red-700' },
  ]

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Analytics</h1>
      <p className="text-slate-500 text-sm mb-8">Admin overview of app content and activity</p>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {statCards.map(s => (
          <div key={s.label} className={`rounded-xl p-5 ${s.color}`}>
            <p className="text-3xl font-bold">{s.value}</p>
            <p className="text-sm font-medium mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Regulations by Category</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stats.byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                {stats.byCategory.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl border border-slate-100 p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Regulations by Status</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={stats.byStatus} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {stats.byStatus.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Compliance breakdown */}
        {stats.complianceByStatus.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-100 p-6 md:col-span-2">
            <h2 className="font-semibold text-slate-800 mb-4">Compliance Record Status</h2>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stats.complianceByStatus} layout="vertical" margin={{ top: 0, right: 20, left: 60, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
