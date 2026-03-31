import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, CheckCircle, Clock, AlertCircle, XCircle, Eye } from 'lucide-react'
import type { ComplianceRecord, Regulation } from '../types/index'

const STATUS_CONFIG = {
  not_started: { label: 'Not Started', color: 'bg-red-100 text-red-700', icon: XCircle },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  compliant: { label: 'Compliant', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  exempt: { label: 'Exempt', color: 'bg-slate-100 text-slate-600', icon: Eye },
  monitoring: { label: 'Monitoring', color: 'bg-blue-100 text-blue-700', icon: Eye },
}

interface ComplianceTrackerPageProps { user: any }

export default function ComplianceTrackerPage({ user }: ComplianceTrackerPageProps) {
  const [records, setRecords] = useState<any[]>([])
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [showAdd, setShowAdd] = useState(false)
  const [selectedRegId, setSelectedRegId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchRecords()
    supabase.from('regulations').select('id,title,category,region').then(({ data }) => {
      setRegulations(data || [])
    })
  }, [user])

  const fetchRecords = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('compliance_records')
      .select('*, regulations(title,category,region)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }

  const addRecord = async () => {
    if (!selectedRegId) return
    const reg = regulations.find((r) => r.id === selectedRegId)
    if (!reg) return
    await supabase.from('compliance_records').insert({
      user_id: user.id,
      regulation_id: selectedRegId,
      regulation_title: reg.title,
      regulation_category: reg.category,
      regulation_region: reg.region,
      compliance_status: 'not_started',
    })
    setShowAdd(false)
    setSelectedRegId('')
    fetchRecords()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('compliance_records').update({ compliance_status: status }).eq('id', id)
    fetchRecords()
  }

  const statusCounts = {
    compliant: records.filter((r) => r.compliance_status === 'compliant').length,
    in_progress: records.filter((r) => r.compliance_status === 'in_progress').length,
    not_started: records.filter((r) => r.compliance_status === 'not_started').length,
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance Tracker</h1>
          <p className="text-slate-500 text-sm mt-1">Track your compliance status across regulations</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus size={16} /> Add Regulation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Compliant', count: statusCounts.compliant, color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'In Progress', count: statusCounts.in_progress, color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
          { label: 'Not Started', count: statusCounts.not_started, color: 'bg-red-50 border-red-200 text-red-700' },
        ].map((s) => (
          <div key={s.label} className={`border rounded-xl p-4 ${s.color}`}>
            <p className="text-2xl font-bold">{s.count}</p>
            <p className="text-sm font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Track a Regulation</h2>
            <select
              value={selectedRegId}
              onChange={(e) => setSelectedRegId(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a regulation…</option>
              {regulations.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title} ({r.region})
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm">Cancel</button>
              <button onClick={addRecord} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Records */}
      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading…</div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <CheckCircle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="font-medium text-slate-600">No regulations tracked yet</p>
          <p className="text-sm text-slate-400 mt-1">Click "Add Regulation" to start tracking</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const sc = STATUS_CONFIG[record.compliance_status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.not_started
            const Icon = sc.icon
            return (
              <div key={record.id} className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{record.regulation_title}</p>
                  <p className="text-sm text-slate-400 mt-0.5">
                    {record.regulation_category} · {record.regulation_region}
                    {record.target_date && ` · Due ${new Date(record.target_date).toLocaleDateString()}`}
                  </p>
                </div>
                <select
                  value={record.compliance_status}
                  onChange={(e) => updateStatus(record.id, e.target.value)}
                  className={`ml-4 px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer ${sc.color}`}
                >
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
