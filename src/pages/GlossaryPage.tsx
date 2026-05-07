import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Search, X } from 'lucide-react'
import { GLOSSARY_TERMS } from '../types/index'
import { REGULATION_METADATA_GLOSSARY_TERMS } from '../lib/appTheme'

export default function GlossaryPage() {
  const [search, setSearch] = useState('')
  const [showScrollTop, setShowScrollTop] = useState(false)
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const stickyHeaderRef = useRef<HTMLDivElement | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const scroller = document.getElementById('main-scroll')
    if (!scroller) return
    const onScroll = () => setShowScrollTop(scroller.scrollTop > 400)
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    document.getElementById('main-scroll')?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const sorted = useMemo(
    () => {
      const byTerm = new Map<string, { term: string; definition: string }>()
      ;[...GLOSSARY_TERMS, ...REGULATION_METADATA_GLOSSARY_TERMS].forEach((item) => {
        if (!byTerm.has(item.term)) byTerm.set(item.term, item)
      })
      return [...byTerm.values()].sort((a, b) => a.term.localeCompare(b.term))
    },
    []
  )

  const filtered = useMemo(
    () =>
      sorted.filter(
        (item) =>
          item.term.toLowerCase().includes(search.toLowerCase()) ||
          item.definition.toLowerCase().includes(search.toLowerCase())
      ),
    [sorted, search]
  )

  // Group by first letter
  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {}
    for (const item of filtered) {
      const letter = item.term[0].toUpperCase()
      if (!map[letter]) map[letter] = []
      map[letter].push(item)
    }
    return map
  }, [filtered])

  const letters = Object.keys(grouped).sort()
  const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

  const scrollTo = (letter: string) => {
    const el = letterRefs.current[letter]
    const scroller = document.getElementById('main-scroll')
    if (!el || !scroller) return
    const headerHeight = stickyHeaderRef.current?.offsetHeight ?? 0
    const elTop = el.getBoundingClientRect().top
    const scrollerTop = scroller.getBoundingClientRect().top
    const offset = elTop - scrollerTop - headerHeight - 16 // 16px breathing room
    scroller.scrollBy({ top: offset, behavior: 'smooth' })
  }

  return (
    <div className="page-shell" ref={topRef}>
      {/* Sticky header: search + letter index */}
      <div ref={stickyHeaderRef} className="sticky top-0 z-20 mb-6 overflow-hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-sm">
        {/* Search bar */}
        <div className="p-4 md:p-5">
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search terms..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ui-input pl-11 pr-11"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted)/0.6)] hover:text-[hsl(var(--foreground))]"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            Showing {filtered.length} of {sorted.length} terms
          </p>
        </div>

        {/* Letter index — hidden while searching */}
        {!search && (
          <div className="flex flex-wrap gap-0.5 border-t border-[hsl(var(--border))] px-3 py-2">
            {allLetters.map((letter) => {
              const active = letters.includes(letter)
              return (
                <button
                  key={letter}
                  onClick={() => active && scrollTo(letter)}
                  disabled={!active}
                  className={`flex h-6 w-6 items-center justify-center rounded text-[10px] font-semibold transition-colors ${
                    active
                      ? 'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary)/0.2)]'
                      : 'text-[hsl(var(--muted-foreground)/0.35)] cursor-default'
                  }`}
                >
                  {letter}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No terms found</p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try a different search phrase.</p>
        </div>
      ) : (
        <>

          {/* Terms grouped by letter */}
          <div className="space-y-8">
            {letters.map((letter) => (
              <div
                key={letter}
                ref={(el) => { letterRefs.current[letter] = el }}
              >
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-sm font-bold text-white">
                    {letter}
                  </span>
                  <div className="h-px flex-1 bg-[hsl(var(--border))]" />
                </div>
                <div className="space-y-3">
                  {grouped[letter].map((item) => (
                    <div key={item.term} className="surface-card p-5 transition-all hover:border-[hsl(var(--primary)/0.28)]">
                      <div className="mb-3">
                        <span className="inline-flex rounded-full bg-[hsl(var(--primary)/0.1)] px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]">
                          {item.term}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-[hsl(var(--foreground))/0.82]">{item.definition}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Scroll-to-top FAB */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-white shadow-lg transition-all duration-200 hover:bg-[hsl(var(--primary)/0.85)] ${
          showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <ArrowUp size={18} />
      </button>
    </div>
  )
}
