import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { REGIONS, ESG_CATEGORIES } from '../types'
import { ChevronRight, ChevronLeft } from 'lucide-react'

interface OnboardingModalProps {
  userSettings: any
  userId: string
  onComplete: () => void
}

export default function OnboardingModal({ userSettings, userId, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [industry, setIndustry] = useState(userSettings?.industry || '')
  const [regions, setRegions] = useState<string[]>(userSettings?.regions || [])
  const [categories, setCategories] = useState<string[]>(userSettings?.esg_categories || [])
  const [loading, setLoading] = useState(false)

  const toggleRegion = (region: string) => {
    setRegions(regions.includes(region) ? regions.filter(r => r !== region) : [...regions, region])
  }

  const toggleCategory = (category: string) => {
    setCategories(categories.includes(category) ? categories.filter(c => c !== category) : [...categories, category])
  }

  const handleComplete = async () => {
    setLoading(true)
    try {
      await supabase
        .from('user_settings')
        .update({
          industry,
          regions,
          esg_categories: categories,
          onboarding_completed: true,
        })
        .eq('user_id', userId)

      onComplete()
    } catch (error) {
      console.error('Error completing onboarding:', error)
    } finally {
      setLoading(false)
    }
  }

  const canProceed = step === 1 ? industry.trim() !== '' : step === 2 ? regions.length > 0 : categories.length > 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-8">
        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full mx-1 transition-all ${
                  s <= step ? 'bg-blue-500' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-slate-600">Step {step} of 3</p>
        </div>

        {/* Step 1: Industry */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">What's your industry?</h2>
            <p className="text-slate-600 mb-6">Help us tailor recommendations for your sector.</p>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Finance, Energy, Technology..."
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Step 2: Regions */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Which regions do you operate in?</h2>
            <p className="text-slate-600 mb-6">Select all that apply.</p>
            <div className="grid grid-cols-2 gap-3">
              {REGIONS.map((region) => (
                <button
                  key={region}
                  onClick={() => toggleRegion(region)}
                  className={`px-4 py-3 rounded-lg font-medium transition-all ${
                    regions.includes(region)
                      ? 'bg-blue-100 border-2 border-blue-500 text-blue-700'
                      : 'bg-slate-100 border-2 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: ESG Categories */}
        {step === 3 && (
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Focus ESG categories</h2>
            <p className="text-slate-600 mb-6">Choose areas most relevant to your business.</p>
            <div className="space-y-3">
              {ESG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`w-full px-4 py-3 rounded-lg font-medium text-left transition-all border-2 ${
                    categories.includes(cat)
                      ? 'bg-blue-100 border-blue-500 text-blue-700'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="flex items-center px-6 py-2 text-slate-700 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} className="mr-2" />
            Previous
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed || loading}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
