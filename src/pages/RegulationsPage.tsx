import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Regulation, ESG_CATEGORIES, REGIONS } from '../types'
import { Star, Check } from 'lucide-react'

interface RegulationsPageProps {
  user: any
}

const categoryColors: Record<string, string> = {
  Climate: 'bg-blue-100 text-blue-800 border-blue-300',
  Circularity: 'bg-green-100 text-green-800 border-green-300',
  Nature: 'bg-teal-100 text-teal-800 border-teal-300',
  Social: 'bg-orange-100 text-orange-800 border-orange-300',
  Governance: 'bg-purple-100 text-purple-800 border-purple-300',
}

const statusColors: Record<string, string> = {
  in_force: 'bg-green-100 text-green-800',
  draft: 'bg-slate-100 text-slate-800',
  adopted: 'bg-yellow-100 text-yellow-800',
  amended: 'bg-blue-100 text-blue-800',
  repealed: 'bg-red-100 text-red-800',
}

const impactDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

export default function RegulationsPage({ user }: RegulationsPageProps) {
  const navigate = useNavigate()
  const [regulations, setRegulations] = useState<Regulation[]>([])
  const [filtered, setFiltered] = useState<Regulation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedRegion, setSelectedRegion] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedImpact, setSelectedImpact] = useState('')
  const [watchlist, setWatchlist] = useState<string[]>([])
  const [compareMode, setCompareMode] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false)

  useEffect(() => {
    fetchRegulations()
    fetchUserSettings()
  }, [user])

  useEffect(() => {
    filterRegulations()
  }, [regulations, selectedCategory, selectedRegion, selectedStatus, selectedImpact, showWatchlistOnly, watchlist])

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
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()
      setWatchlist(data?.watched_regulation_ids || [])
    } catch (error) {
      console.error('Error fetching user settings:', error)
    }
  }

  const filterRegulations = () => {
    let result = regulations

    if (showWatchlistOnly) {
      result = result.filter(r => watchlist.includes(r.id))
    }

    if (selectedCategory !== 'All') {
      result = result.filter(r => r.category === selectedCategory)
    }

    if (selectedRegion) {
      result = result.filter(r => r.region === selectedRegion)
    }

    if (selectedStatus) {
      result = result.filter(r => r.status === selectedStatus)
    }

    if (selectedImpact) {
      result = result.filter(r => r.impact_level === selectedImpact)
    }

    setFiltered(result)
  }

  const toggleWatch = async (regulationId: string) => {
    const newWatchlist = watchlist.includes(regulationId)
      ? watchlist.filter(id => id !== regulationId)
      : [...watchlist, regulationId]

    setWatchlist(newWatchlist)

    try {
      await supabase
        .from('user_settings')
        .update({ watched_regulation_ids: newWatchlist })
        .eq('user_id', user.id)
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = selected.includes(id)
      ? selected.filter(s => s !== id)
      : [...selected, id]

    if (newSelected.length > 2) return
    setSelected(newSelected)
  }

  const handleCompare = () => {
    if (selected.length === 2) {
      navigate(`/regulations?compare=${selected.join(',')}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading regulations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">ESG Regulations</h1>
        <p className="text-slate-600">Browse and compare sustainability regulations</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          {['All', ...ESG_CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-blue-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filter Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Regions</option>
            {REGIONS.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            {['in_force', 'draft', 'adopted', 'amended', 'repealed'].map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>

          <select
            value={selectedImpact}
            onChange={(e) => setSelectedImpact(e.target.value)}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Impact Levels</option>
            {['high', 'medium', 'low'].map(impact => (
              <option key={impact} value={impact}>{impact}</option>
            ))}
          </select>

          <button
            onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              showWatchlistOnly
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-200'
            }`}
          >
            {showWatchlistOnly ? '⭐ My Watchlist' : '☆ All Regulations'}
          </button>
        </div>
      </div>

      {/* Regulations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((regulation) => (
          <div
            key={regulation.id}
            className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-200 overflow-hidden"
          >
            {compareMode && (
              <div className="absolute top-4 right-4 z-10">
                <input
                  type="checkbox"
                  checked={selected.includes(regulation.id)}
                  onChange={() => toggleSelect(regulation.id)}
                  disabled={selected.length === 2 && !selected.includes(regulation.id)}
                  className="w-5 h-5 cursor-pointer"
                />
              </div>
            )}

            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <h3
                  onClick={() => navigate(`/regulations/${regulation.id}`)}
                  className="text-lg font-bold text-slate-900 cursor-pointer hover:text-blue-600 flex-1"
                >
                  {regulation.title}
                </h3>
                <button
                  onClick={() => toggleWatch(regulation.id)}
                  className="ml-2 text-xl transition-all"
                >
                  {watchlist.includes(regulation.id) ? '⭐' : '☆'}
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${categoryColors[regulation.category] || 'bg-gray-100'}`}>
                  {regulation.category}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[regulation.status] || 'bg-gray-100'}`}>
                  {regulation.status.replace('_', ' ')}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100">
                  {regulation.region}
                </span>
              </div>

              <p className="text-sm text-slate-600 mb-4 line-clamp-2">
                {regulation.description}
              </p>

              <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
                <span>Effective: {new Date(regulation.effective_date).toLocaleDateString()}</span>
                <span className={`w-3 h-3 rounded-full ${impactDots[regulation.impact_level]}`}></span>
              </div>

              <button
                onClick={() => navigate(`/regulations/${regulation.id}`)}
                className="w-full px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-600 mb-4">No regulations found matching your filters</p>
          <button
            onClick={() => {
              setSelectedCategory('All')
              setSelectedRegion('')
              setSelectedStatus('')
              setSelectedImpact('')
              setShowWatchlistOnly(false)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Floating Compare Bar */}
      {selected.length === 2 && (
        <div className="fixed bottom-6 left-6 right-6 bg-white rounded-lg shadow-lg border border-blue-200 p-4 flex items-center justify-between">
          <span className="text-slate-700 font-medium">
            {selected.length} regulation{selected.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {compareMode ? 'Cancel' : 'Compare'}
          </button>
        </div>
      )}
    </div>
  )
}
