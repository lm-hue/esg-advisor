import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Bell, Save } from 'lucide-react'
import { ESG_CATEGORIES, REGIONS } from '../types/index'

interface AlertsPageProps { user: any }

export default function AlertsPage({ user }: AlertsPageProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [settings, setSettings] = useState({
    alerts_enabled: true,
    alert_frequency: 'daily' as 'immediate' | 'daily' | 'weekly',
    alert_categories: [] as string[],
    alert_regions: [] as string[],
    alert_keywords: [] as string[],
  })
  const [keywordInput, setKeywordInput] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSettings({
            alerts_enabled: data.alerts_enabled ?? true,
            alert_frequency: data.alert_frequency ?? 'daily',
            alert_categories: data.alert_categories ?? [],
            alert_regions: data.alert_regions ?? [],
            alert_keywords: data.alert_keywords ?? [],
          })
        }
      })
  }, [user])

  const toggleItem = (key: 'alert_categories' | 'alert_regions', value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter((v) => v !== value)
        : [...prev[key], value],
    }))
  }

  const addKeyword = () => {
    const kw = keywordInput.trim()
    if (kw && !settings.alert_keywords.includes(kw)) {
      setSettings((prev) => ({ ...prev, alert_keywords: [...prev.alert_keywords, kw] }))
    }
    setKeywordInput('')
  }

  const removeKeyword = (kw: string) => {
    setSettings((prev) => ({
      ...prev,
      alert_keywords: prev.alert_keywords.filter((k) => k !== kw),
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: existing } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.id)
      .single()

    if (existing) {
      await supabase.from('user_settings').update(settings).eq('user_id', user.id)
    } else {
      await supabase.from('user_settings').insert({ ...settings, user_id: user.id })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-center space-x-3 mb-8">
        <Bell size={28} className="text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notification Alerts</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Get notified when regulations in your focus areas change.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Master toggle */}
        <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center justify-between">
          <div>
            <p className="font-medium text-slate-800">Enable alerts</p>
            <p className="text-sm text-slate-500">Receive notifications for regulation changes</p>
          </div>
          <button
            onClick={() => setSettings((p) => ({ ...p, alerts_enabled: !p.alerts_enabled }))}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors ${
              settings.alerts_enabled ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-1 ${
                settings.alerts_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.alerts_enabled && (
          <>
            {/* Frequency */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="font-medium text-slate-800 mb-3">Alert frequency</p>
              <div className="flex gap-3">
                {(['immediate', 'daily', 'weekly'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setSettings((p) => ({ ...p, alert_frequency: f }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      settings.alert_frequency === f
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="font-medium text-slate-800 mb-3">ESG categories to monitor</p>
              <div className="flex flex-wrap gap-2">
                {ESG_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => toggleItem('alert_categories', cat)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                      settings.alert_categories.includes(cat)
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Regions */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="font-medium text-slate-800 mb-3">Regions to monitor</p>
              <div className="flex flex-wrap gap-2">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => toggleItem('alert_regions', r)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      settings.alert_regions.includes(r)
                        ? 'bg-green-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Keywords */}
            <div className="bg-white rounded-xl border border-slate-100 p-5">
              <p className="font-medium text-slate-800 mb-3">Keywords to watch</p>
              <div className="flex gap-2 mb-3">
                <input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
                  placeholder="e.g. CSRD, scope 3…"
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={addKeyword}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {settings.alert_keywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-sm"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword(kw)}
                      className="text-slate-400 hover:text-red-500 ml-1"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save preferences'}
        </button>
      </div>
    </div>
  )
}
