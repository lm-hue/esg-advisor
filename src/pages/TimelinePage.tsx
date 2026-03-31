import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Regulation, REGIONS } from '../types'
import { formatDistanceToNow } from 'date-fns'

interface TimelinePageProps {
  user: any
}

const categoryColors: Record<string, string> = {
  Climate: 'border-blue-500 bg-blue-50',
  Circularity: 'border-green-500 bg-green-50',
  Nature: 'border-teal-500 bg-teal-50',
  Social: 'border-orange-500 bg-orange-50',
  Governance: 'border-purple-500 bg-purple-50',
}

export default function TimelinePage({ user }: TimelinePageProps) {
  const navigate = useNavigate()
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [filtered, setFiltered] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [industry, setIndustry] = useState('')
  const [selectedRegions, setSelectedRegions] = useState<string[]>([])
  const [userSettings, setUserSettings] = useState<any>(null)

  useEffect(() => {
    fetchRegulations()
    fetchUserSettings()
  }, [user])

  useEffect(() => {
    filterAndSort()
  }, [regulations, industry, selectedRegions])

  const fetchRegulations = async () => {
    try {
      const { data } = await supabase.from('regulations').select('*')
      setRegulations(data || [])
    } catch (error) {
      console.error('Error fetching regulations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserSettings = async () => {
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setUserSettings(data)
        setIndustry(data.industry || '')
        setSelectedRegions(data.regions || [])
      }
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const filterAndSort = () => {
    let result = regulations

    if (industry.trim()) {
      // Simple filter by matching keywords
      const keyword = industry.toLowerCase()
      result = result.filter(r =>
        r.title.toLowerCase().includes(keyword) ||
        r.description.toLowerCase().includes(keyword)
      )
    }

    if (selectedRegions.length > 0) {
      result = result.filter(r => selectedRegions.includes(r.region))
    }

    // Sort by effective date
    result.sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
    setFiltered(result)
  }

  const getTimelineColor = (effectiveDate: string) => {
    const now = new Date()
    const effective = new Date(effectiveDate)
    const diffTime = effective.getTime() - now.getTime()
    const diffMonths = diffTime / (1000 * 60 * 60 * 24 * 30)

    if (diffMonths < 0) return 'bg-slate-300' // Past
    if (diffMonths < 6) return 'bg-red-500' // Within 6 months
    if (diffMonths < 18) return 'bg-yellow-500' // 6-18 months
    return 'bg-green-500' // 18+ months
  }

  const toggleRegion = (region: string) => {
    const newRegions = selectedRegions.includes(region)
      ? selectedRegions.filter(r => r !== region)
      : [...selectedRegions, region]
    setSelectedRegions(newRegions)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading timeline...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">Regulatory Timeline</h1>
        <p className="text-slate-600">Track important dates for regulatory changes</p>
      </div>

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-8 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-3">Timeline Color Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-slate-700">Within 6 months</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-sm text-slate-700">6-18 months</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-slate-700">18+ months</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-slate-300"></div>
            <span className="text-sm text-slate-700">Past</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8 border border-slate-200">
        <h3 className="font-semibold text-slate-900 mb-4">Filters</h3>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-2">Industry Keyword</label>
          <input
            type="text"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., Technology, Finance..."
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-3">Regions</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {REGIONS.map((region) => (
              <button
                key={region}
                onClick={() => toggleRegion(region)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedRegions.includes(region)
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {region}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        <div className="relative">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-600 mb-4">No regulations found</p>
              <button
                onClick={() => {
                  setIndustry('')
                  setSelectedRegions([])
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            filtered.map((regulation, idx) => {
              const timelineColor = getTimelineColor(regulation.effective_date)
              const isPast = new Date(regulation.effective_date) < new Date()

              return (
                <div key={regulation.id} className="flex gap-6">
                  {/* Timeline Node */}
                  <div className="flex flex-col items-center">
                    <div className={`w-6 h-6 rounded-full ${timelineColor} border-4 border-white shadow-md z-10`}></div>
                    {idx < filtered.length - 1 && (
                      <div className="w-1 bg-slate-300 flex-1 my-2"></div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-6 cursor-pointer">
                    <div
                      onClick={() => navigate(`/regulations/${regulation.id}`)}
                      className={`bg-white rounded-lg shadow-sm border-l-4 p-6 transition-all hover:shadow-md ${categoryColors[regulation.category] || 'border-slate-300 bg-white'}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-slate-900">
                          {regulation.title}
                        </h3>
                        {isPast && (
                          <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-1 rounded">
                            PAST
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="text-xs font-semibold bg-white bg-opacity-70 text-slate-700 px-2 py-1 rounded">
                          {regulation.region}
                        </span>
                        <span className="text-xs font-semibold bg-white bg-opacity-70 text-slate-700 px-2 py-1 rounded">
                          {regulation.category}
                        </span>
                      </div>

                      <p className="text-sm text-slate-600 mb-3">
                        {regulation.description}
                      </p>

                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-900">
                          {new Date(regulation.effective_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span className="text-slate-500">
                          {isPast ? 'Effective' : formatDistanceToNow(new Date(regulation.effective_date), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
