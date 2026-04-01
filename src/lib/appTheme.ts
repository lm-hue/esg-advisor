import type { Regulation } from '../types'

export function normalizeCategoryKey(category?: string | null) {
  const normalized = (category || '').trim().toLowerCase()

  switch (normalized) {
    case 'environment':
    case 'environmental':
      return 'Environmental'
    case 'climate':
      return 'Climate'
    case 'circularity':
      return 'Circularity'
    case 'nature':
      return 'Nature'
    case 'social':
      return 'Social'
    case 'governance':
      return 'Governance'
    default:
      return category?.trim() || ''
  }
}

export function formatCategoryLabel(category?: string | null) {
  return normalizeCategoryKey(category)
}

export const CATEGORY_BADGES: Record<string, string> = {
  Climate: 'bg-amber-100 text-amber-800',
  Environmental: 'bg-emerald-100 text-emerald-800',
  Circularity: 'bg-cyan-100 text-cyan-700',
  Nature: 'bg-teal-100 text-teal-700',
  Social: 'bg-blue-100 text-blue-700',
  Governance: 'bg-purple-100 text-purple-700',
}

export const CATEGORY_DOTS: Record<string, string> = {
  Climate: 'bg-amber-500',
  Environmental: 'bg-emerald-500',
  Circularity: 'bg-cyan-500',
  Nature: 'bg-teal-500',
  Social: 'bg-blue-500',
  Governance: 'bg-purple-500',
}

export const STATUS_BADGES: Record<string, string> = {
  in_force: 'bg-red-100 text-red-700',
  adopted: 'bg-orange-100 text-orange-700',
  draft: 'bg-amber-100 text-amber-700',
  amended: 'bg-blue-100 text-blue-700',
  repealed: 'bg-slate-100 text-slate-500',
}

export const REGION_FLAGS: Record<string, string> = {
  EU: '🇪🇺',
  USA: '🇺🇸',
  UK: '🇬🇧',
  Australia: '🇦🇺',
  Global: '🌍',
  Canada: '🇨🇦',
  Japan: '🇯🇵',
  Brazil: '🇧🇷',
  Singapore: '🇸🇬',
  'South Africa': '🇿🇦',
  'Hong Kong': '🇭🇰',
}

export function formatStatusLabel(status: string) {
  return status.replace(/_/g, ' ')
}

export const REGULATION_TYPE_OPTIONS = [
  { value: 'regulations', label: 'Regulations' },
  { value: 'mandatory_regulations', label: 'Mandatory regulations' },
  { value: 'market_rules', label: 'Market / stock exchange rules' },
  { value: 'voluntary_frameworks', label: 'Voluntary frameworks and standards' },
  { value: 'ratings_rankings', label: 'Ratings and rankings' },
  { value: 'guidance_frameworks', label: 'Guidance and roadmaps' },
]

export const REGULATION_TYPE_BADGES: Record<string, string> = {
  regulations: 'bg-stone-100 text-stone-700',
  mandatory_regulations: 'bg-rose-100 text-rose-700',
  market_rules: 'bg-sky-100 text-sky-700',
  voluntary_frameworks: 'bg-emerald-100 text-emerald-700',
  ratings_rankings: 'bg-amber-100 text-amber-700',
  guidance_frameworks: 'bg-slate-100 text-slate-700',
}

const VOLUNTARY_FRAMEWORK_MATCHERS = [
  'ghg protocol',
  'global circularity protocol',
  'wbcsd',
  'wri',
  'tnfd',
  'gri',
  'sasb',
  'sbti',
  'science based targets',
  'transition plan taskforce',
  'issb',
  'ifrs foundation',
  'ssbj',
]

const MARKET_RULE_MATCHERS = [
  'sgx',
  'hkex',
  'jse',
  'fca',
  'sebi',
  'cvm',
  'csrc',
  'capital market authority',
  'cma (capital market authority)',
  'sec nigeria',
  'securities and commodities authority',
  'sca',
  'cnbv',
  'ojk',
  'listed companies',
  'securities administrators',
  'securities regulatory commission',
  'sec climate disclosure rule',
]

const GUIDANCE_MATCHERS = ['guidance', 'guide', 'roadmap', 'framework']
const RATINGS_MATCHERS = [
  'cdp',
  'rating',
  'ratings',
  'ranking',
  'rankings',
  'score',
  'benchmark',
  'ecovadis',
  'morningstar',
  'sustainalytics',
  'msci',
  'corporate knights',
  'ftse russell',
  'iss esg',
]
const MANDATORY_MATCHERS = [
  'mandatory',
  'disclosure',
  'disclosures',
  'reporting',
  'transparency',
  'ordinance',
  'reporting standards',
  'financial disclosures',
]

export function getRegulationTypeKey(regulation: Pick<Regulation, 'title' | 'source_name'>) {
  const text = `${regulation.title || ''} ${regulation.source_name || ''}`.toLowerCase()

  if (RATINGS_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'ratings_rankings'
  }

  if (VOLUNTARY_FRAMEWORK_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'voluntary_frameworks'
  }

  if (MARKET_RULE_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'market_rules'
  }

  if (GUIDANCE_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'guidance_frameworks'
  }

  if (MANDATORY_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'mandatory_regulations'
  }

  return 'regulations'
}

export function formatRegulationTypeLabel(type: string) {
  return REGULATION_TYPE_OPTIONS.find((option) => option.value === type)?.label || type
}
