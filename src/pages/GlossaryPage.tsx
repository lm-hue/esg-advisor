import { useState } from 'react'
import { Search } from 'lucide-react'
import { GLOSSARY_TERMS } from '../types/index'

const CATEGORY_COLORS: Record<string, string> = {
  standard: 'bg-blue-100 text-blue-700',
  framework: 'bg-purple-100 text-purple-700',
  regulation: 'bg-green-100 text-green-700',
  concept: 'bg-orange-100 text-orange-700',
}

export default function GlossaryPage() {
  const [search, setSearch] = useState('')

  const filtered = GLOSSARY_TERMS.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.definition.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">ESG Glossary</h1>
        <p className="text-slate-500 mt-2">
          Plain-language definitions for key ESG terms, regulations, and frameworks.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search terms…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>

      {/* Term count */}
      <p className="text-sm text-slate-400 mb-4">
        Showing {filtered.length} of {GLOSSARY_TERMS.length} terms
      </p>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((item) => (
          <div
            key={item.term}
            className="bg-white rounded-xl border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow"
          >
            <span className="inline-block text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded mb-2">
              {item.term}
            </span>
            <p className="text-sm text-slate-600 leading-relaxed">{item.definition}</p>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-lg font-medium">No terms found</p>
          <p className="text-sm mt-1">Try a different search</p>
        </div>
      )}
    </div>
  )
}
