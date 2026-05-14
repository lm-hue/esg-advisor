import { CheckCircle2 } from 'lucide-react'

interface VerifiedBadgeProps {
  size?: 'sm' | 'md'
  className?: string
}

const SIZE_STYLES = {
  sm: {
    wrapper: 'h-5 w-5 rounded-full',
    icon: 12,
  },
  md: {
    wrapper: 'h-6 w-6 rounded-full',
    icon: 14,
  },
} as const

export default function VerifiedBadge({ size = 'sm', className = '' }: VerifiedBadgeProps) {
  const selectedSize = SIZE_STYLES[size]

  return (
    <span
      title="Verified"
      aria-label="Verified"
      className={`inline-flex items-center justify-center border border-emerald-200 bg-emerald-100 text-emerald-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] ${selectedSize.wrapper} ${className}`.trim()}
    >
      <CheckCircle2 size={selectedSize.icon} strokeWidth={2.3} />
    </span>
  )
}
