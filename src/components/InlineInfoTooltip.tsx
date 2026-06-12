import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'

interface InlineInfoTooltipProps {
  text: string
}

export default function InlineInfoTooltip({ text }: InlineInfoTooltipProps) {
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  if (!text) return null

  const handleMouseEnter = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setCoords({
        top: rect.top + rect.height / 2,
        left: rect.right + 8,
      })
    }
    setVisible(true)
  }

  return (
    <span className="relative inline-flex items-center">
      <span
        ref={ref}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setVisible(false)}
        className="inline-flex h-3 w-3 cursor-default items-center justify-center rounded-full border border-current text-[8px] font-semibold not-italic leading-none text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
        aria-label={text}
      >
        i
      </span>

      {visible && createPortal(
        <span
          className="pointer-events-none fixed z-[9999] w-56 rounded-xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-[11px] font-medium leading-5 text-[hsl(var(--foreground))] shadow-lg"
          style={{ top: coords.top, left: coords.left, transform: 'translateY(-50%)' }}
        >
          {text}
        </span>,
        document.body
      )}
    </span>
  )
}
