export type ESGCategory = 'Climate' | 'Circularity' | 'Nature' | 'Social' | 'Governance'
export type RegulationStatus = 'in_force' | 'draft' | 'adopted' | 'amended' | 'repealed'
export type ImpactLevel = 'high' | 'medium' | 'low'
export type ComplianceStatus = 'not_started' | 'in_progress' | 'compliant' | 'exempt' | 'monitoring'

export interface Regulation {
  id: string
  title: string
  description: string
  full_description: string
  category: ESGCategory
  region: string
  status: RegulationStatus
  effective_date: string
  impact_level: ImpactLevel
  source_name: string
  source_url: string
  tags: string[]
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  email: string
  full_name?: string
  is_admin: boolean
  created_at: string
  updated_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  industry: string
  regions: string[]
  esg_categories: ESGCategory[]
  watched_regulation_ids: string[]
  onboarding_completed: boolean
  alerts_enabled: boolean
  alert_categories: ESGCategory[]
  alert_regions: string[]
  alert_keywords: string[]
  alert_frequency: 'daily' | 'weekly' | 'monthly'
  created_at: string
  updated_at: string
}

export interface ComplianceRecord {
  id: string
  user_id: string
  regulation_id: string
  status: ComplianceStatus
  target_date: string
  assigned_to?: string
  notes: string
  regulation?: Regulation
  created_at: string
  updated_at: string
}

export interface CommunityPost {
  id: string
  user_id: string
  content: string
  category: ESGCategory
  regulation_id?: string
  upvotes: number
  reply_count: number
  author_name: string
  author_role?: string
  created_at: string
  updated_at: string
}

export interface CommunityReply {
  id: string
  post_id: string
  user_id: string
  content: string
  author_name: string
  author_role?: string
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export const REGIONS = [
  'EU',
  'USA',
  'UK',
  'Australia',
  'Global',
  'Canada',
  'Japan',
  'Brazil',
  'Singapore',
  'South Africa',
  'Hong Kong',
]

export const ESG_CATEGORIES: ESGCategory[] = [
  'Climate',
  'Circularity',
  'Nature',
  'Social',
  'Governance',
]

export const GLOSSARY_TERMS = [
  {
    term: 'CSRD',
    definition: 'Corporate Sustainability Reporting Directive - EU regulation requiring large companies to report on sustainability matters.'
  },
  {
    term: 'ESRS',
    definition: 'European Sustainability Reporting Standards - technical standards for sustainability reporting under CSRD.'
  },
  {
    term: 'SFDR',
    definition: 'Sustainable Finance Disclosure Regulation - EU regulation on sustainability-related disclosures in the financial services sector.'
  },
  {
    term: 'TCFD',
    definition: 'Task Force on Climate-related Financial Disclosures - framework for climate-related financial risk disclosure.'
  },
  {
    term: 'ISSB',
    definition: 'International Sustainability Standards Board - sets global sustainability disclosure standards.'
  },
  {
    term: 'IFRS S1',
    definition: 'IFRS Sustainability Disclosure Standard 1 - covers general requirements for sustainability-related financial disclosures.'
  },
  {
    term: 'IFRS S2',
    definition: 'IFRS Sustainability Disclosure Standard 2 - addresses climate-related disclosures.'
  },
  {
    term: 'GHG Protocol',
    definition: 'Greenhouse Gas Protocol - international accounting and reporting standard for greenhouse gas emissions.'
  },
  {
    term: 'Scope 1',
    definition: 'Direct greenhouse gas emissions from owned or controlled sources in supply chain.'
  },
  {
    term: 'Scope 2',
    definition: 'Indirect emissions from purchased electricity, steam, heat, and cooling.'
  },
  {
    term: 'Scope 3',
    definition: 'All other indirect emissions from activities that are not owned or controlled but are in the value chain.'
  },
  {
    term: 'TNFD',
    definition: 'Taskforce on Nature-related Financial Disclosures - framework for identifying and managing nature-related risks.'
  },
  {
    term: 'SBTN',
    definition: 'Science-Based Targets Network - initiative for setting science-based targets for nature.'
  },
  {
    term: 'EU Taxonomy',
    definition: 'Classification system for sustainable economic activities to direct sustainable investment.'
  },
  {
    term: 'Double Materiality',
    definition: 'Assessment of how sustainability issues impact the company and how the company impacts the environment and society.'
  },
  {
    term: 'Due Diligence',
    definition: 'Process for identifying, assessing, and mitigating adverse impacts in operations and supply chains.'
  },
  {
    term: 'UNGP',
    definition: 'UN Guiding Principles on Business and Human Rights - framework for corporate human rights responsibility.'
  },
  {
    term: 'SA8000',
    definition: 'Social Accountability standard certifying working conditions in global supply chains.'
  },
  {
    term: 'GRI',
    definition: 'Global Reporting Initiative - sustainability reporting standards used worldwide.'
  },
  {
    term: 'Modern Slavery',
    definition: 'Illegal exploitation including forced labor, servitude, and human trafficking in supply chains.'
  },
  {
    term: 'Net Zero',
    definition: 'Reducing emissions to near zero and offsetting remaining emissions by 2050 or earlier.'
  },
  {
    term: 'Carbon Neutrality',
    definition: 'Balancing carbon emissions with equivalent carbon offsets or removals.'
  },
  {
    term: 'CBAM',
    definition: 'Carbon Border Adjustment Mechanism - EU policy to prevent carbon leakage through tariffs on imports.'
  },
  {
    term: 'EUDR',
    definition: 'EU Deforestation Regulation - restricts import of products linked to deforestation.'
  },
  {
    term: 'SBTi',
    definition: 'Science Based Targets initiative - validates corporate climate targets aligned with climate science.'
  },
  {
    term: 'BRSR',
    definition: 'Business Responsibility and Sustainability Reporting - Indian regulation for corporate sustainability reporting.'
  },
  {
    term: 'Greenwashing',
    definition: 'Making false or misleading claims about environmental benefits of products or practices.'
  },
  {
    term: 'Paris Agreement',
    definition: 'International treaty to limit global warming to 1.5-2°C above pre-industrial levels.'
  },
  {
    term: 'Just Transition',
    definition: 'Ensuring fair and inclusive transition to sustainable economy with worker protection.'
  },
  {
    term: 'COP',
    definition: 'Conference of the Parties - annual UN climate negotiation summit.'
  },
  {
    term: 'Impact Materiality',
    definition: 'Assessment of how company operations impact the environment and society.'
  },
]
