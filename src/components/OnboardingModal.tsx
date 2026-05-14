import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { ESG_CATEGORIES } from '../types'
import { GEOGRAPHY_OPTIONS } from '../lib/geography'
import { ChevronRight, ChevronLeft, Sparkles } from 'lucide-react'

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="surface-card max-w-2xl w-full p-8 shadow-2xl">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-3">
            <div className="page-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold text-[hsl(var(--foreground))]">Set up your workspace</h2>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">We’ll tailor the app to your industry, regions, and ESG priorities.</p>
            </div>
          </div>

          <div className="mb-3 flex justify-between">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full mx-1 transition-all ${
                  s <= step ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">Step {step} of 3</p>
        </div>

        {step === 1 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">What's your industry?</h2>
            <p className="mb-6 text-[hsl(var(--muted-foreground))]">Help us tailor recommendations for your sector.</p>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g., Finance, Energy, Technology..."
              className="ui-input"
            />
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Which regions do you operate in?</h2>
            <p className="mb-6 text-[hsl(var(--muted-foreground))]">Select all that apply.</p>
            <div className="grid max-h-[22rem] grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
              {GEOGRAPHY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleRegion(option.value)}
                  className={`rounded-xl border px-4 py-3 text-left font-medium transition-all ${
                    regions.includes(option.value)
                      ? 'border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/0.2)]'
                  }`}
                >
                  <span className="block text-sm text-[hsl(var(--foreground))]">
                    {option.emoji} {option.name}
                  </span>
                  <span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">
                    {option.kind === 'global' ? 'Global' : `${option.region} · ${option.continent}`}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="mb-4 text-2xl font-semibold text-[hsl(var(--foreground))]">Focus ESG categories</h2>
            <p className="mb-6 text-[hsl(var(--muted-foreground))]">Choose areas most relevant to your business.</p>
            <div className="space-y-3">
              {ESG_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => toggleCategory(cat)}
                  className={`w-full rounded-xl border px-4 py-3 text-left font-medium transition-all ${
                    categories.includes(cat)
                      ? 'border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                      : 'border-[hsl(var(--border))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.2)]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="ui-button-ghost disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft size={20} className="mr-2" />
            Previous
          </button>

          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed}
              className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
              <ChevronRight size={20} className="ml-2" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed || loading}
              className="ui-button-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Completing...' : 'Complete'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
