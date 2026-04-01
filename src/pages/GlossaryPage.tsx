import { useState } from 'react'
import { Search } from 'lucide-react'
import { GLOSSARY_TERMS } from '../types/index'

export default function GlossaryPage() {
  const [search, setSearch] = useState('')

  const filtered = GLOSSARY_TERMS.filter(
    (item) =>
      item.term.toLowerCase().includes(search.toLowerCase()) ||
      item.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="page-shell">
      <div className="surface-card mb-6 p-5 md:p-6">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            placeholder="Search terms..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="ui-input pl-11"
          />
        </div>
        <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
          Showing {filtered.length} of {GLOSSARY_TERMS.length} terms
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card px-6 py-16 text-center">
          <p className="text-sm font-medium text-[hsl(var(--foreground))]">No terms found</p>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Try a different search phrase.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <div key={item.term} className="surface-card p-5 transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/0.28)]">
              <span className="mb-3 inline-flex rounded-full bg-[hsl(var(--primary)/0.1)] px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]">
                {item.term}
              </span>
              <p className="text-sm leading-7 text-[hsl(var(--muted-foreground))]">{item.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
