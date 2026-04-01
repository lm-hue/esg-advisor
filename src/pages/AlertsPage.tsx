import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Save } from 'lucide-react'
import { ESG_CATEGORIES, REGIONS } from '../types/index'
import { CATEGORY_DOTS } from '../lib/appTheme'

interface AlertsPageProps {
  user: any
}

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
        ? prev[key].filter((item) => item !== value)
        : [...prev[key], value],
    }))
  }

  const addKeyword = () => {
    const nextKeyword = keywordInput.trim()
    if (nextKeyword && !settings.alert_keywords.includes(nextKeyword)) {
      setSettings((prev) => ({ ...prev, alert_keywords: [...prev.alert_keywords, nextKeyword] }))
    }
    setKeywordInput('')
  }

  const removeKeyword = (keyword: string) => {
    setSettings((prev) => ({
      ...prev,
      alert_keywords: prev.alert_keywords.filter((item) => item !== keyword),
    }))
  }

  const handleSave = async () => {
    if (!user) return

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
    <div className="page-shell-narrow">
      <div className="surface-card mb-6 p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="ui-section-title">Enable alerts</p>
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              Receive notifications when regulations in your focus areas change.
            </p>
          </div>

          <button
            onClick={() => setSettings((prev) => ({ ...prev, alerts_enabled: !prev.alerts_enabled }))}
            className={`relative inline-flex h-7 w-12 rounded-full transition-colors ${
              settings.alerts_enabled ? 'bg-[hsl(var(--primary))]' : 'bg-slate-300'
            }`}
            aria-label="Toggle alerts"
          >
            <span
              className={`mt-1 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
                settings.alerts_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {settings.alerts_enabled && (
        <>
          <div className="surface-card mb-6 p-6">
            <p className="ui-section-title mb-4">Alert frequency</p>
            <div className="flex flex-wrap gap-2">
              {(['immediate', 'daily', 'weekly'] as const).map((frequency) => (
                <button
                  key={frequency}
                  onClick={() => setSettings((prev) => ({ ...prev, alert_frequency: frequency }))}
                  className={`rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-all ${
                    settings.alert_frequency === frequency
                      ? 'border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary))] text-white shadow-sm'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.25)] hover:text-[hsl(var(--foreground))]'
                  }`}
                >
                  <div className="capitalize">{frequency}</div>
                  <div className={`mt-0.5 text-[11px] ${settings.alert_frequency === frequency ? 'text-white/75' : 'text-[hsl(var(--muted-foreground))]'}`}>
                    {frequency === 'immediate' ? 'As it happens' : frequency === 'daily' ? 'Once per day' : 'Once per week'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card mb-6 p-6">
            <p className="ui-section-title mb-4">ESG categories to monitor</p>
            <div className="flex flex-wrap gap-2">
              {ESG_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleItem('alert_categories', category)}
                  className={`ui-filter-pill ${settings.alert_categories.includes(category) ? 'ui-filter-pill-active' : ''}`}
                >
                  <span className={`h-2 w-2 rounded-full ${CATEGORY_DOTS[category]}`} />
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card mb-6 p-6">
            <p className="ui-section-title mb-4">Regions to monitor</p>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  onClick={() => toggleItem('alert_regions', region)}
                  className={`ui-filter-pill ${settings.alert_regions.includes(region) ? 'ui-filter-pill-active' : ''}`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>

          <div className="surface-card mb-6 p-6">
            <p className="ui-section-title mb-4">Keywords to watch</p>
            <div className="mb-3 flex gap-2">
              <input
                value={keywordInput}
                onChange={(event) => setKeywordInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addKeyword()}
                placeholder="e.g. CSRD, scope 3, taxonomy"
                className="ui-input"
              />
              <button onClick={addKeyword} className="ui-button-secondary">
                Add
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {settings.alert_keywords.length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))]">No keywords added yet.</p>
              ) : (
                settings.alert_keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-sm text-[hsl(var(--foreground))]"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="text-[hsl(var(--muted-foreground))] transition-colors hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <button onClick={handleSave} disabled={saving || !user} className="ui-button-primary w-full">
        <Save size={16} />
        {saving ? 'Saving...' : saved ? 'Saved' : 'Save Preferences'}
      </button>
    </div>
  )
}
