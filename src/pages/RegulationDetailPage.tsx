import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Regulation } from '../types'
import { ArrowLeft, ExternalLink } from 'lucide-react'

interface RegulationDetailPageProps {
  user: any
}

const statusColors: Record<string, string> = {
  in_force: 'bg-green-100 text-green-800',
  draft: 'bg-slate-100 text-slate-800',
  adopted: 'bg-yellow-100 text-yellow-800',
  amended: 'bg-blue-100 text-blue-800',
  repealed: 'bg-red-100 text-red-800',
}

const categoryColors: Record<string, string> = {
  Climate: 'bg-blue-100 text-blue-800 border-blue-300',
  Circularity: 'bg-green-100 text-green-800 border-green-300',
  Nature: 'bg-teal-100 text-teal-800 border-teal-300',
  Social: 'bg-orange-100 text-orange-800 border-orange-300',
  Governance: 'bg-purple-100 text-purple-800 border-purple-300',
}

const impactDots: Record<string, string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
}

export default function RegulationDetailPage({ user }: RegulationDetailPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [regulation, setRegulation] = useState<Regulation | null>(null)
  const [loading, setLoading] = useState(true)
  const [isWatched, setIsWatched] = useState(false)

  useEffect(() => {
    fetchRegulation()
    checkWatchlist()
  }, [id, user])

  const fetchRegulation = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('regulations')
        .select('*')
        .eq('id', id)
        .single()
      setRegulation(data)
    } catch (error) {
      console.error('Error fetching regulation:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkWatchlist = async () => {
    if (!id) return
    try {
      const { data } = await supabase
        .from('user_settings')
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()
      setIsWatched(data?.watched_regulation_ids?.includes(id) || false)
    } catch (error) {
      console.error('Error checking watchlist:', error)
    }
  }

  const toggleWatch = async () => {
    if (!id) return
    try {
      const { data: current } = await supabase
        .from('user_settings')
        .select('watched_regulation_ids')
        .eq('user_id', user.id)
        .single()

      const currentWatchlist = current?.watched_regulation_ids || []
      const newWatchlist = isWatched
        ? currentWatchlist.filter((rid: string) => rid !== id)
        : [...currentWatchlist, id]

      await supabase
        .from('user_settings')
        .update({ watched_regulation_ids: newWatchlist })
        .eq('user_id', user.id)

      setIsWatched(!isWatched)
    } catch (error) {
      console.error('Error updating watchlist:', error)
    }
  }

  const addToCompliance = async () => {
    if (!id) return
    try {
      await supabase
        .from('compliance_records')
        .insert({
          user_id: user.id,
          regulation_id: id,
          status: 'not_started',
          target_date: new Date().toISOString().split('T')[0],
          notes: '',
        })

      navigate('/tracker')
    } catch (error) {
      console.error('Error adding to compliance:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!regulation) {
    return (
      <div className="p-6">
        <button
          onClick={() => navigate('/regulations')}
          className="flex items-center text-blue-600 hover:text-blue-700 mb-4"
        >
          <ArrowLeft size={20} className="mr-2" />
          Back to Regulations
        </button>
        <div className="text-center py-12">
          <p className="text-slate-600">Regulation not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/regulations')}
        className="flex items-center text-blue-600 hover:text-blue-700 mb-6"
      >
        <ArrowLeft size={20} className="mr-2" />
        Back to Regulations
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-4xl font-bold text-slate-900 flex-1">{regulation.title}</h1>
          <button
            onClick={toggleWatch}
            className="text-3xl ml-4 transition-all hover:scale-110"
          >
            {isWatched ? '⭐' : '☆'}
          </button>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-3 mb-8">
          <span className={`px-4 py-2 rounded-full text-sm font-semibold border ${categoryColors[regulation.category] || 'bg-gray-100'}`}>
            {regulation.category}
          </span>
          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${statusColors[regulation.status] || 'bg-gray-100'}`}>
            {regulation.status.replace('_', ' ')}
          </span>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100">
            {regulation.region}
          </span>
          <span className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100 flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${impactDots[regulation.impact_level]}`}></span>
            {regulation.impact_level.charAt(0).toUpperCase() + regulation.impact_level.slice(1)} Impact
          </span>
        </div>

        {/* Key Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-8 border-b border-slate-200">
          <div>
            <p className="text-sm text-slate-600 mb-2">Effective Date</p>
            <p className="text-lg font-semibold text-slate-900">
              {new Date(regulation.effective_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Source</p>
            <p className="text-lg font-semibold text-slate-900">{regulation.source_name}</p>
          </div>
          <div>
            <p className="text-sm text-slate-600 mb-2">Category</p>
            <p className="text-lg font-semibold text-slate-900">{regulation.category}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Overview</h2>
          <p className="text-slate-700 leading-relaxed mb-6">
            {regulation.full_description}
          </p>
        </div>

        {/* Tags */}
        {regulation.tags && regulation.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {regulation.tags.map((tag) => (
                <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Source Link */}
        {regulation.source_url && (
          <div className="mb-8">
            <a
              href={regulation.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-6 py-3 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
            >
              <ExternalLink size={18} className="mr-2" />
              View Official Source
            </a>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={addToCompliance}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            Add to Compliance Tracker
          </button>
          <button
            onClick={toggleWatch}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            {isWatched ? 'Remove from Watchlist' : 'Add to Watchlist'}
          </button>
        </div>
      </div>
    </div>
  )
}
