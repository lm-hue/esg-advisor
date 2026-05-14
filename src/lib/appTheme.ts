import { format } from 'date-fns'
import type {
  DatePrecision,
  LinkStatus,
  Regulation,
  RegulationLifecycleStatus,
  RegulationTopic,
  RegulationType,
  SourceHealth,
} from '../types'
import { getGeographyOption, REGION_EMOJIS } from './geography'

export const JURISDICTION_TYPE_OPTIONS = [
  {
    value: 'country',
    label: 'Country',
    definition: 'A national jurisdiction, such as Germany, Japan, or Canada.',
  },
  {
    value: 'supranational_region',
    label: 'Supranational region',
    definition: 'A rulemaking area above a single country, such as the European Union.',
  },
  {
    value: 'global',
    label: 'Global',
    definition: 'A globally applicable instrument or reference point that is not limited to one jurisdiction.',
  },
  {
    value: 'standards_body',
    label: 'Standards body',
    definition: 'An international body or initiative that publishes standards, frameworks, or guidance rather than country law.',
  },
  {
    value: 'exchange_or_regulator',
    label: 'Exchange / regulator',
    definition: 'A market operator or regulator that issues listing, disclosure, or supervisory rules.',
  },
] as const

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

export const STATUS_OPTIONS: RegulationLifecycleStatus[] = [
  'proposal',
  'consultation',
  'draft',
  'adopted_not_yet_effective',
  'effective',
  'amended_effective',
  'repealed',
  'superseded',
  'archived',
]

export const STATUS_DEFINITIONS: Record<RegulationLifecycleStatus, string> = {
  proposal: 'An early-stage legislative or policy proposal that has not yet become formal draft text or adopted law.',
  consultation: 'A text or proposal open for public or stakeholder input before finalization.',
  draft: 'A draft measure, standard, or rule that is published but not yet adopted or effective.',
  adopted_not_yet_effective: 'A measure that has been formally adopted but whose operative date has not yet started.',
  effective: 'A measure currently in force and expected to apply now.',
  amended_effective: 'A measure currently in force that has been amended, with the amended version treated as the operative one.',
  repealed: 'A measure that has been formally revoked and is no longer operative.',
  superseded: 'A measure replaced in practice by a newer instrument or version.',
  archived: 'A historical or reference item kept for context, not for current operational reliance.',
}

export const STATUS_BADGES: Record<string, string> = {
  proposal: 'bg-fuchsia-100 text-fuchsia-700',
  consultation: 'bg-violet-100 text-violet-700',
  draft: 'bg-amber-100 text-amber-700',
  adopted_not_yet_effective: 'bg-orange-100 text-orange-700',
  effective: 'bg-red-100 text-red-700',
  amended_effective: 'bg-blue-100 text-blue-700',
  repealed: 'bg-slate-100 text-slate-500',
  superseded: 'bg-slate-200 text-slate-600',
  archived: 'bg-stone-100 text-stone-600',
  in_force: 'bg-red-100 text-red-700',
  adopted: 'bg-orange-100 text-orange-700',
  amended: 'bg-blue-100 text-blue-700',
}

const STATUS_LABELS: Record<string, string> = {
  proposal: 'Proposal',
  consultation: 'Consultation',
  draft: 'Draft',
  adopted_not_yet_effective: 'Adopted',
  effective: 'In force',
  amended_effective: 'Amended in force',
  repealed: 'Repealed',
  superseded: 'Superseded',
  archived: 'Archived',
  in_force: 'In force',
  adopted: 'Adopted',
  amended: 'Amended',
}

export const REGION_FLAGS = REGION_EMOJIS

export function formatJurisdictionTypeLabel(type?: string | null) {
  return JURISDICTION_TYPE_OPTIONS.find((option) => option.value === type)?.label || type || 'Unknown'
}

export function getJurisdictionTypeDefinition(type?: string | null) {
  return JURISDICTION_TYPE_OPTIONS.find((option) => option.value === type)?.definition || ''
}

export function normalizeStatus(status?: string | null): RegulationLifecycleStatus {
  switch ((status || '').trim().toLowerCase()) {
    case 'proposal':
      return 'proposal'
    case 'consultation':
      return 'consultation'
    case 'draft':
      return 'draft'
    case 'adopted_not_yet_effective':
      return 'adopted_not_yet_effective'
    case 'adopted':
      return 'adopted_not_yet_effective'
    case 'effective':
    case 'in_force':
      return 'effective'
    case 'amended_effective':
    case 'amended':
      return 'amended_effective'
    case 'repealed':
      return 'repealed'
    case 'superseded':
      return 'superseded'
    case 'archived':
      return 'archived'
    default:
      return 'effective'
  }
}

export function formatStatusLabel(status?: string | null) {
  return STATUS_LABELS[normalizeStatus(status)] || status?.replace(/_/g, ' ') || 'Unknown'
}

export function getStatusDefinition(status?: string | null) {
  return STATUS_DEFINITIONS[normalizeStatus(status)]
}

export function isRegulationCurrentlyEffective(status?: string | null) {
  const normalized = normalizeStatus(status)
  return normalized === 'effective' || normalized === 'amended_effective'
}

export function isRegulationNotYetEffective(status?: string | null) {
  const normalized = normalizeStatus(status)
  return normalized === 'proposal' || normalized === 'consultation' || normalized === 'draft' || normalized === 'adopted_not_yet_effective'
}

export function getStatusWeight(status?: string | null) {
  switch (normalizeStatus(status)) {
    case 'effective':
      return 5
    case 'amended_effective':
      return 4
    case 'adopted_not_yet_effective':
      return 3
    case 'draft':
      return 2
    case 'consultation':
      return 1
    case 'proposal':
      return 0
    case 'superseded':
      return -1
    case 'repealed':
      return -2
    case 'archived':
      return -3
    default:
      return 0
  }
}

export const REGULATION_TYPE_OPTIONS: Array<{ value: RegulationType; label: string }> = [
  { value: 'law_or_regulation', label: 'Law / regulation' },
  { value: 'proposal_or_draft', label: 'Proposal / draft' },
  { value: 'guidance', label: 'Guidance' },
  { value: 'standard', label: 'Standard' },
  { value: 'framework', label: 'Framework' },
  { value: 'market_rule', label: 'Market / exchange rule' },
  { value: 'rating_or_benchmark', label: 'Rating / benchmark' },
  { value: 'policy_plan', label: 'Policy / plan' },
]

export const REGULATION_TYPE_DEFINITIONS: Record<RegulationType, string> = {
  law_or_regulation: 'A binding law, regulation, directive, act, ordinance, or equivalent legal instrument.',
  proposal_or_draft: 'A proposed, draft, consultation, or exposure document that is not yet fully in force.',
  guidance: 'Non-binding guidance, interpretive materials, manuals, FAQs, or implementation support.',
  standard: 'A formal standard with structured requirements, topics, metrics, or reporting criteria.',
  framework: 'A framework, protocol, or principles-based reference used to structure disclosure or ESG practice.',
  market_rule: 'A rule or requirement issued by an exchange, securities authority, or market supervisor.',
  rating_or_benchmark: 'A rating, benchmark, scoring, or ranking framework used to assess or compare entities.',
  policy_plan: 'A roadmap, action plan, strategy, or programmatic policy document rather than a binding rule.',
}

export const REGULATION_TYPE_BADGES: Record<string, string> = {
  law_or_regulation: 'bg-stone-100 text-stone-700',
  proposal_or_draft: 'bg-amber-100 text-amber-700',
  guidance: 'bg-slate-100 text-slate-700',
  standard: 'bg-emerald-100 text-emerald-700',
  framework: 'bg-cyan-100 text-cyan-700',
  market_rule: 'bg-sky-100 text-sky-700',
  rating_or_benchmark: 'bg-rose-100 text-rose-700',
  policy_plan: 'bg-violet-100 text-violet-700',
  regulations: 'bg-stone-100 text-stone-700',
  mandatory_regulations: 'bg-stone-100 text-stone-700',
  market_rules: 'bg-sky-100 text-sky-700',
  voluntary_frameworks: 'bg-cyan-100 text-cyan-700',
  ratings_rankings: 'bg-rose-100 text-rose-700',
  guidance_frameworks: 'bg-slate-100 text-slate-700',
}

const VOLUNTARY_FRAMEWORK_MATCHERS = [
  'ghg protocol',
  'wbcsd',
  'wri',
  'unep fi',
  'tnfd',
  'gri',
  'sasb',
  'sbti',
  'science based targets',
  'transition plan taskforce',
  'issb',
  'ifrs foundation',
  'ssbj',
  'integrated reporting',
  'equator principles',
  'un global compact',
  'principles for responsible investment',
  'principles for responsible banking',
  'principles for sustainable insurance',
]

const STANDARD_MATCHERS = [
  'standard',
  'standards',
  'iso ',
  'isrs',
  'esrs',
  'ifrs s1',
  'ifrs s2',
  'sasb',
  'gri',
]

const MARKET_RULE_MATCHERS = [
  'stock exchange',
  'listing requirement',
  'listing rule',
  'exchange rule',
  'hkex',
  'sgx',
  'jse',
  'sebi',
  'sec',
  'fca',
]

const GUIDANCE_MATCHERS = ['guidance', 'guide', 'playbook', 'faq', 'manual']
const RATING_MATCHERS = ['rating', 'ratings', 'ranking', 'rankings', 'benchmark', 'score', 'cdp', 'ecovadis', 'msci']
const POLICY_PLAN_MATCHERS = ['roadmap', 'policy plan', 'action plan', 'strategy', 'programme', 'program']
const PROPOSAL_MATCHERS = ['proposal', 'proposed', 'draft', 'consultation', 'exposure draft', 'bill']

export function normalizeRegulationTypeKey(type?: string | null): RegulationType | null {
  switch ((type || '').trim().toLowerCase()) {
    case 'law_or_regulation':
    case 'regulations':
    case 'mandatory_regulations':
      return 'law_or_regulation'
    case 'proposal_or_draft':
      return 'proposal_or_draft'
    case 'guidance':
    case 'guidance_frameworks':
      return 'guidance'
    case 'standard':
      return 'standard'
    case 'framework':
    case 'voluntary_frameworks':
      return 'framework'
    case 'market_rule':
    case 'market_rules':
      return 'market_rule'
    case 'rating_or_benchmark':
    case 'ratings_rankings':
      return 'rating_or_benchmark'
    case 'policy_plan':
      return 'policy_plan'
    default:
      return null
  }
}

function inferRegulationTypeFromText(regulation: Pick<Regulation, 'title' | 'source_name' | 'status'>) {
  const text = `${regulation.title || ''} ${regulation.source_name || ''}`.toLowerCase()
  const status = normalizeStatus(regulation.status)

  if (status === 'proposal' || status === 'consultation' || status === 'draft' || PROPOSAL_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'proposal_or_draft'
  }
  if (RATING_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'rating_or_benchmark'
  }
  if (MARKET_RULE_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'market_rule'
  }
  if (STANDARD_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'standard'
  }
  if (GUIDANCE_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'guidance'
  }
  if (POLICY_PLAN_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'policy_plan'
  }
  if (VOLUNTARY_FRAMEWORK_MATCHERS.some((matcher) => text.includes(matcher))) {
    return 'framework'
  }
  return 'law_or_regulation'
}

export function getRegulationTypeKey(regulation: Pick<Regulation, 'title' | 'source_name' | 'status' | 'regulation_type'>) {
  return normalizeRegulationTypeKey(regulation.regulation_type) || inferRegulationTypeFromText(regulation)
}

export function formatRegulationTypeLabel(type?: string | null) {
  const normalized = normalizeRegulationTypeKey(type)
  return REGULATION_TYPE_OPTIONS.find((option) => option.value === normalized)?.label || type || 'Unknown'
}

export function getRegulationTypeDefinition(type?: string | null) {
  const normalized = normalizeRegulationTypeKey(type)
  return normalized ? REGULATION_TYPE_DEFINITIONS[normalized] : ''
}

export const TOPIC_OPTIONS: Array<{ value: RegulationTopic; label: string }> = [
  { value: 'reporting', label: 'Reporting' },
  { value: 'taxonomy', label: 'Taxonomy' },
  { value: 'governance', label: 'Governance' },
  { value: 'human_rights', label: 'Human rights' },
  { value: 'supply_chain', label: 'Supply chain' },
  { value: 'biodiversity', label: 'Biodiversity' },
  { value: 'water', label: 'Water' },
  { value: 'pollution', label: 'Pollution' },
  { value: 'waste', label: 'Waste' },
  { value: 'energy', label: 'Energy' },
  { value: 'climate', label: 'Climate' },
  { value: 'finance', label: 'Finance' },
]

export const TOPIC_DEFINITIONS: Record<RegulationTopic, string> = {
  reporting: 'Disclosure, reporting, assurance, materiality, and sustainability statement requirements.',
  taxonomy: 'Classification systems that define what counts as sustainable or aligned activity.',
  governance: 'Board oversight, business conduct, ethics, anti-corruption, and governance controls.',
  human_rights: 'Labour, workforce, equality, safety, harassment, and business and human rights topics.',
  supply_chain: 'Due diligence, procurement, traceability, supplier oversight, and value-chain obligations.',
  biodiversity: 'Nature, forests, ecosystems, land use, deforestation, and biodiversity impacts.',
  water: 'Water use, wastewater, marine impacts, and related aquatic resource issues.',
  pollution: 'Air emissions, chemicals, contaminants, plastics, and pollution control obligations.',
  waste: 'Waste management, recycling, circularity, batteries, packaging, and end-of-life stewardship.',
  energy: 'Energy use, efficiency, renewable energy, fuels, and energy transition topics.',
  climate: 'Climate risk, greenhouse gases, carbon, transition planning, and climate mitigation or adaptation.',
  finance: 'Sustainable finance, investor disclosure, funds, banks, securities, and financial-market rules.',
}

export const DATE_PRECISION_OPTIONS: Array<{ value: DatePrecision; label: string; definition: string }> = [
  { value: 'year', label: 'Year', definition: 'Only the year is reliable, so the displayed date should be treated as a year-level placeholder.' },
  { value: 'month', label: 'Month', definition: 'The month and year are reliable, but a specific day is not confirmed.' },
  { value: 'day', label: 'Day', definition: 'A full calendar date is available and can be shown precisely.' },
]

export const TOPIC_BADGES: Record<string, string> = {
  reporting: 'bg-slate-100 text-slate-700',
  taxonomy: 'bg-fuchsia-100 text-fuchsia-700',
  governance: 'bg-purple-100 text-purple-700',
  human_rights: 'bg-blue-100 text-blue-700',
  supply_chain: 'bg-orange-100 text-orange-700',
  biodiversity: 'bg-emerald-100 text-emerald-700',
  water: 'bg-cyan-100 text-cyan-700',
  pollution: 'bg-red-100 text-red-700',
  waste: 'bg-lime-100 text-lime-700',
  energy: 'bg-amber-100 text-amber-700',
  climate: 'bg-teal-100 text-teal-700',
  finance: 'bg-indigo-100 text-indigo-700',
}

export function normalizeRegulationTopics(topics?: string[] | null) {
  if (!topics || topics.length === 0) return []
  const allowed = new Set(TOPIC_OPTIONS.map((option) => option.value))
  return Array.from(
    new Set(
      topics
        .map((topic) => topic.trim().toLowerCase() as RegulationTopic)
        .filter((topic) => allowed.has(topic))
    )
  )
}

export function inferRegulationTopics(regulation: Pick<Regulation, 'title' | 'description' | 'full_description' | 'tags' | 'category' | 'regulation_type'>) {
  const text = `${regulation.title || ''} ${regulation.description || ''} ${regulation.full_description || ''} ${(regulation.tags || []).join(' ')}`.toLowerCase()
  const topics = new Set<RegulationTopic>()

  if (text.match(/\breport(ing)?\b|disclosure|disclosures|assurance|materiality|esrs|issb|ifrs|gri|sustainability report/)) topics.add('reporting')
  if (text.includes('taxonomy')) topics.add('taxonomy')
  if (text.match(/governance|board|anti-corruption|bribery|ethics|conduct/)) topics.add('governance')
  if (text.match(/human rights|labou?r|worker|forced labour|indigenous|harassment|diversity|equality/)) topics.add('human_rights')
  if (text.match(/supply chain|due diligence|supplier|mineral|procurement|traceability/)) topics.add('supply_chain')
  if (text.match(/biodiversity|deforestation|ecosystem|forest|nature-related/)) topics.add('biodiversity')
  if (text.match(/\bwater\b|wastewater|marine|ocean/)) topics.add('water')
  if (text.match(/pollution|emission|air quality|chemical|contaminant|plastic/)) topics.add('pollution')
  if (text.match(/\bwaste\b|recycling|circular|battery stewardship|packaging/)) topics.add('waste')
  if (text.match(/energy|electricity|renewable|efficiency|fuel/)) topics.add('energy')
  if (text.match(/climate|greenhouse gas|ghg|net zero|carbon|tcfd|transition plan/)) topics.add('climate')
  if (text.match(/finance|financial|investor|bank|fund|taxonomy|securities|listing/)) topics.add('finance')

  if (topics.size === 0) {
    switch (normalizeCategoryKey(regulation.category)) {
      case 'Climate':
        topics.add('climate')
        break
      case 'Circularity':
        topics.add('waste')
        break
      case 'Nature':
        topics.add('biodiversity')
        break
      case 'Social':
        topics.add('human_rights')
        break
      case 'Governance':
        topics.add('governance')
        break
      default:
        break
    }
  }

  if (getRegulationTypeKey(regulation as Pick<Regulation, 'title' | 'source_name' | 'status' | 'regulation_type'>) === 'standard') {
    topics.add('reporting')
  }

  return Array.from(topics)
}

export function formatTopicLabel(topic?: string | null) {
  return TOPIC_OPTIONS.find((option) => option.value === topic)?.label || topic || 'Unknown'
}

export function getTopicDefinition(topic?: string | null) {
  return topic ? TOPIC_DEFINITIONS[topic as RegulationTopic] || '' : ''
}

export function inferDatePrecision(regulation: Pick<Regulation, 'effective_date' | 'date_precision' | 'source_url'>): DatePrecision | null {
  if (regulation.date_precision) return regulation.date_precision
  if (!regulation.effective_date) return null

  const [_, month, day] = regulation.effective_date.split('-')
  if (regulation.source_url?.toLowerCase().includes('carrotsandsticks.org') && month === '01' && day === '01') {
    return 'year'
  }

  return 'day'
}

export function formatDateWithPrecision(date?: string | null, precision?: DatePrecision | null) {
  if (!date) return 'Unknown'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  const resolvedPrecision = precision || 'day'

  if (resolvedPrecision === 'year') return format(parsed, 'yyyy')
  if (resolvedPrecision === 'month') return format(parsed, 'MMMM yyyy')
  return format(parsed, 'MMMM d, yyyy')
}

export function inferJurisdictionType(region?: string | null) {
  const option = region ? getGeographyOption(region) : undefined
  if (!option) return 'global' as const

  if (option.kind === 'country') return 'country' as const
  if (option.kind === 'region') return 'supranational_region' as const
  if (option.kind === 'global') return 'global' as const

  if (option.value === 'SSE') return 'exchange_or_regulator' as const
  return 'standards_body' as const
}

export function inferLinkStatus(regulation: Pick<Regulation, 'source_url' | 'link_status' | 'source_link_kind'>): LinkStatus {
  if (regulation.link_status) return regulation.link_status
  switch (regulation.source_link_kind) {
    case 'archived_pdf':
      return 'archived_pdf'
    case 'reference_pdf':
      return 'working_pdf'
    case 'official':
    case 'reference_page':
      break
    default:
      break
  }
  const url = regulation.source_url?.trim().toLowerCase()
  if (!url) return 'missing'
  if (url.includes('/regulation-source-archives/')) return 'archived_pdf'
  if (url.endsWith('.pdf')) return 'working_pdf'
  if (url.includes('carrotsandsticks.org')) return 'broken'
  if (url.startsWith('http')) return 'working_website'
  return 'unknown'
}

export function formatLinkStatusLabel(status?: string | null) {
  switch ((status || '').trim().toLowerCase()) {
    case 'working_website':
      return 'Working website'
    case 'working_pdf':
      return 'Working PDF'
    case 'archived_pdf':
      return 'Archived PDF'
    case 'broken':
      return 'Broken link'
    case 'missing':
      return 'No source link'
    default:
      return 'Unknown'
  }
}

export const LINK_STATUS_DEFINITIONS: Record<LinkStatus, string> = {
  working_website: 'The source URL resolves to a live website page rather than a downloadable PDF file.',
  working_pdf: 'The source URL resolves directly to a PDF document that appears usable as a source file.',
  archived_pdf: 'The original source was replaced with a locally archived PDF copy to preserve access.',
  broken: 'The recorded source URL is known to fail, redirect incorrectly, or no longer provide the expected source.',
  missing: 'No source URL is currently stored for the regulation.',
  unknown: 'The source URL exists but has not yet been confidently classified.',
}

export function getLinkStatusDefinition(status?: string | null) {
  const normalized = (status || '').trim().toLowerCase() as LinkStatus
  return LINK_STATUS_DEFINITIONS[normalized] || ''
}

export function getDatePrecisionDefinition(precision?: DatePrecision | null) {
  return DATE_PRECISION_OPTIONS.find((option) => option.value === precision)?.definition || ''
}

export function formatDatePrecisionLabel(precision?: DatePrecision | null) {
  return DATE_PRECISION_OPTIONS.find((option) => option.value === precision)?.label || precision || 'Unknown'
}

export function inferSourceHealth(linkStatus?: string | null): SourceHealth {
  switch ((linkStatus || '').trim().toLowerCase()) {
    case 'working_website':
    case 'working_pdf':
      return 'healthy'
    case 'archived_pdf':
      return 'archived'
    case 'broken':
      return 'broken'
    case 'missing':
      return 'missing'
    default:
      return 'unknown'
  }
}

export const SOURCE_HEALTH_DEFINITIONS: Record<SourceHealth, string> = {
  healthy: 'The source link is currently usable without relying on an internal archive.',
  archived: 'The source is preserved through an archived PDF because the original link was unstable or unavailable.',
  broken: 'The source link is presently broken and should be replaced or restored.',
  missing: 'No source link is available yet.',
  unknown: 'Source health has not yet been confidently assessed.',
}

export function formatSourceHealthLabel(status?: string | null) {
  switch ((status || '').trim().toLowerCase()) {
    case 'healthy':
      return 'Healthy'
    case 'archived':
      return 'Archived'
    case 'broken':
      return 'Broken'
    case 'missing':
      return 'Missing'
    default:
      return 'Unknown'
  }
}

export function getSourceHealthDefinition(status?: string | null) {
  const normalized = (status || '').trim().toLowerCase() as SourceHealth
  return SOURCE_HEALTH_DEFINITIONS[normalized] || ''
}

export const REGULATION_METADATA_GLOSSARY_TERMS = [
  ...JURISDICTION_TYPE_OPTIONS.map((option) => ({ term: option.label, definition: option.definition })),
  ...STATUS_OPTIONS.map((status) => ({ term: formatStatusLabel(status), definition: STATUS_DEFINITIONS[status] })),
  ...REGULATION_TYPE_OPTIONS.map((option) => ({ term: option.label, definition: REGULATION_TYPE_DEFINITIONS[option.value] })),
  ...TOPIC_OPTIONS.map((option) => ({ term: option.label, definition: TOPIC_DEFINITIONS[option.value] })),
  ...DATE_PRECISION_OPTIONS.map((option) => ({ term: `Date precision: ${option.label}`, definition: option.definition })),
  { term: 'Link status', definition: 'The direct state of a regulation source URL, such as working website, working PDF, archived PDF, broken, missing, or unknown.' },
  ...Object.entries(LINK_STATUS_DEFINITIONS).map(([status, definition]) => ({ term: `Link status: ${formatLinkStatusLabel(status)}`, definition })),
  { term: 'Source health', definition: 'A simplified health signal derived from the source link, showing whether a source is healthy, archived, broken, missing, or unknown.' },
  ...Object.entries(SOURCE_HEALTH_DEFINITIONS).map(([status, definition]) => ({ term: `Source health: ${formatSourceHealthLabel(status)}`, definition })),
] as const
