import { useEffect, useMemo, useState, type RefObject } from 'react'
import { X } from 'lucide-react'

interface WorkspaceTourStep {
  id: string
  title: string
  description: string
  placement?: 'top' | 'right' | 'bottom'
  targetRef: RefObject<HTMLElement>
}

interface WorkspaceTourProps {
  open: boolean
  steps: WorkspaceTourStep[]
  onClose: () => void
}

const PADDING = 16
const TOOLTIP_WIDTH = 320

export default function WorkspaceTour({ open, steps, onClose }: WorkspaceTourProps) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const step = steps[stepIndex]

  useEffect(() => {
    if (!open) {
      setStepIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!open || !step) return

    const updateRect = () => {
      const element = step.targetRef.current
      if (!element) return
      element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      setTargetRect(element.getBoundingClientRect())
    }

    updateRect()
    window.addEventListener('resize', updateRect)
    window.addEventListener('scroll', updateRect, true)

    return () => {
      window.removeEventListener('resize', updateRect)
      window.removeEventListener('scroll', updateRect, true)
    }
  }, [open, step])

  const tooltipStyle = useMemo(() => {
    if (!targetRect) {
      return {
        left: PADDING,
        top: PADDING,
      }
    }

    const placement = step?.placement || 'right'
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = targetRect.right + 20
    let top = targetRect.top

    if (placement === 'top') {
      left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2
      top = targetRect.top - 188
    }

    if (placement === 'bottom') {
      left = targetRect.left + targetRect.width / 2 - TOOLTIP_WIDTH / 2
      top = targetRect.bottom + 20
    }

    if (placement === 'right' && left + TOOLTIP_WIDTH > viewportWidth - PADDING) {
      left = Math.max(PADDING, targetRect.left - TOOLTIP_WIDTH - 20)
    }

    left = Math.min(Math.max(left, PADDING), viewportWidth - TOOLTIP_WIDTH - PADDING)
    top = Math.min(Math.max(top, PADDING), viewportHeight - 220)

    return { left, top }
  }, [step?.placement, targetRect])

  if (!open || !step) return null

  return (
    <div className="fixed inset-0 z-[90]">
      <div className="absolute inset-0 bg-[rgba(9,19,15,0.62)] backdrop-blur-[2px]" onClick={onClose} />

      {targetRect && (
        <div
          className="pointer-events-none absolute rounded-[28px] border-2 border-[#f7d16a] shadow-[0_0_0_9999px_rgba(9,19,15,0.35)] transition-all duration-200"
          style={{
            left: Math.max(targetRect.left - 8, 8),
            top: Math.max(targetRect.top - 8, 8),
            width: Math.min(targetRect.width + 16, window.innerWidth - 16),
            height: Math.min(targetRect.height + 16, window.innerHeight - 16),
          }}
        />
      )}

      <div
        className="absolute w-[min(320px,calc(100vw-2rem))] rounded-[28px] border border-white/10 bg-[#102119] p-5 text-white shadow-2xl"
        style={tooltipStyle}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f7d16a]">
              Guided tour
            </p>
            <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-white/65 transition hover:bg-white/5 hover:text-white">
            <X size={16} />
          </button>
        </div>

        <p className="mt-3 text-sm leading-6 text-white/78">{step.description}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-white/55">
            Step {stepIndex + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current - 1)}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm font-medium text-white/80 transition hover:bg-white/5"
              >
                Back
              </button>
            )}
            {stepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStepIndex((current) => current + 1)}
                className="rounded-xl bg-[#0f7b5c] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#116d53]"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-[#f7d16a] px-3 py-2 text-sm font-semibold text-[#15251d] transition hover:bg-[#f1c84f]"
              >
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
