import { Regulation } from '../types'
import { supabase } from './supabase'

export interface RegulationRecord extends Regulation {
  summary?: string
}

const SUPPLEMENTAL_REGULATIONS: RegulationRecord[] = [
  {
    id: 'rating-ecovadis-sustainability-ratings',
    title: 'EcoVadis Sustainability Ratings',
    description: 'Corporate sustainability rating used in procurement and supplier assessment programs across industries.',
    full_description:
      'EcoVadis Sustainability Ratings evaluate companies across environmental, labor and human rights, ethics, and sustainable procurement topics. Many enterprise buyers use EcoVadis scores as part of supplier qualification, monitoring, and contract renewal processes, making it an important benchmark in ESG due diligence even though it is not a government regulation.',
    summary:
      'A widely used corporate sustainability rating for supplier due diligence and procurement programs.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-01-01',
    source_name: 'EcoVadis',
    source_url: 'https://ecovadis.com/',
    tags: ['ratings', 'supplier due diligence', 'procurement', 'benchmark'],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'rating-morningstar-sustainalytics-esg-risk',
    title: 'Morningstar Sustainalytics ESG Risk Ratings',
    description: 'ESG risk ratings used by investors to assess financially material ESG exposure and management quality.',
    full_description:
      'Morningstar Sustainalytics ESG Risk Ratings measure a company’s exposure to material ESG risks and how well those risks are managed. Asset managers, banks, and corporate stakeholders frequently use these ratings to compare issuers, screen portfolios, and support stewardship or engagement decisions.',
    summary:
      'An investor-facing ESG risk rating that compares company exposure to material sustainability risks.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-02-01',
    source_name: 'Morningstar Sustainalytics',
    source_url: 'https://www.sustainalytics.com/esg-ratings',
    tags: ['ratings', 'investors', 'esg risk', 'portfolio screening'],
    created_at: '2024-02-01T00:00:00.000Z',
    updated_at: '2024-02-01T00:00:00.000Z',
  },
  {
    id: 'rating-msci-esg-ratings',
    title: 'MSCI ESG Ratings',
    description: 'A major ESG rating framework used by global investors to compare issuers and portfolios.',
    full_description:
      'MSCI ESG Ratings assess how companies manage financially relevant ESG risks and opportunities relative to peers. They are commonly used in index construction, investment research, stewardship, and ESG fund methodologies, making them a prominent ratings and rankings reference point for listed companies.',
    summary:
      'A global investor benchmark for comparing issuer ESG performance and resilience.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-03-01',
    source_name: 'MSCI',
    source_url: 'https://www.msci.com/our-solutions/esg-investing/esg-ratings',
    tags: ['ratings', 'index providers', 'investors', 'capital markets'],
    created_at: '2024-03-01T00:00:00.000Z',
    updated_at: '2024-03-01T00:00:00.000Z',
  },
  {
    id: 'rating-corporate-knights-global-100',
    title: 'Corporate Knights Global 100 Ranking',
    description: 'Annual ranking of leading sustainable corporations used for benchmarking and market visibility.',
    full_description:
      'The Corporate Knights Global 100 ranks public companies on sustainability-related performance indicators such as clean revenue, resource productivity, diversity, and responsible investment metrics. While not a regulation, it is a visible market benchmark that can influence reputation, investor communications, and peer comparison.',
    summary:
      'A high-visibility sustainability ranking used for corporate benchmarking and investor communications.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-01-24',
    source_name: 'Corporate Knights',
    source_url: 'https://www.corporateknights.com/rankings/global-100-rankings/',
    tags: ['rankings', 'benchmark', 'investors', 'reputation'],
    created_at: '2024-01-24T00:00:00.000Z',
    updated_at: '2024-01-24T00:00:00.000Z',
  },
  {
    id: 'rating-ftse-russell-esg-ratings',
    title: 'FTSE Russell ESG Ratings',
    description: 'Ratings used in index methodology, stewardship, and portfolio construction across listed markets.',
    full_description:
      'FTSE Russell ESG Ratings provide issuer-level ESG assessments used by asset owners and asset managers in index products, portfolio screening, and stewardship programs. These ratings function as a market-facing benchmark rather than a legal obligation, but they often influence capital allocation and issuer engagement.',
    summary:
      'A capital-markets ESG rating used in index products and portfolio construction.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-04-01',
    source_name: 'FTSE Russell',
    source_url: 'https://www.lseg.com/en/ftse-russell/sustainable-investment',
    tags: ['ratings', 'index providers', 'markets', 'investors'],
    created_at: '2024-04-01T00:00:00.000Z',
    updated_at: '2024-04-01T00:00:00.000Z',
  },
  {
    id: 'rating-iss-esg-corporate-rating',
    title: 'ISS ESG Corporate Rating',
    description: 'An ESG assessment used by institutional investors for screening, voting, and engagement.',
    full_description:
      'The ISS ESG Corporate Rating evaluates issuers on sector-specific environmental, social, and governance criteria. Institutional investors may rely on it to support screening, proxy voting, engagement, and investment policy implementation, which makes it relevant as a market benchmark within ESG oversight.',
    summary:
      'An institutional-investor ESG rating used in stewardship, voting, and screening workflows.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-05-01',
    source_name: 'ISS ESG',
    source_url: 'https://www.issgovernance.com/esg/ratings/',
    tags: ['ratings', 'investors', 'proxy voting', 'screening'],
    created_at: '2024-05-01T00:00:00.000Z',
    updated_at: '2024-05-01T00:00:00.000Z',
  },
  {
    id: 'framework-global-circularity-protocol',
    title: 'Global Circularity Protocol',
    description: 'A voluntary circularity framework used to align measurement, target-setting, and disclosure around circular economy performance.',
    full_description:
      'The Global Circularity Protocol is a voluntary framework intended to help organizations measure circularity, define common terminology, and improve comparability in circular economy strategies and disclosures. It is relevant for companies tracking resource use, product design, waste reduction, and circular transition metrics across value chains.',
    summary:
      'A voluntary circularity framework for measuring and disclosing circular economy performance.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-06-01',
    source_name: 'Global Circularity Protocol',
    source_url: 'https://www.globalcircularityprotocol.com/',
    tags: ['circularity', 'framework', 'protocol', 'measurement', 'disclosure'],
    created_at: '2024-06-01T00:00:00.000Z',
    updated_at: '2024-06-01T00:00:00.000Z',
  },
]

function getRegulationDateValue(regulation: Partial<RegulationRecord>) {
  return regulation.effective_date || regulation.updated_at || regulation.created_at || ''
}

function sortByDateDesc(a: RegulationRecord, b: RegulationRecord) {
  return new Date(getRegulationDateValue(b)).getTime() - new Date(getRegulationDateValue(a)).getTime()
}

export function getSupplementalRegulations() {
  return [...SUPPLEMENTAL_REGULATIONS].sort(sortByDateDesc)
}

export function mergeRegulations(regulations: RegulationRecord[] = []) {
  const merged = new Map<string, RegulationRecord>()

  regulations.forEach((regulation) => {
    merged.set(regulation.id, regulation)
  })

  getSupplementalRegulations().forEach((regulation) => {
    if (!merged.has(regulation.id)) {
      merged.set(regulation.id, regulation)
    }
  })

  return [...merged.values()].sort(sortByDateDesc)
}

export async function fetchAllRegulations() {
  const { data, error } = await supabase.from('regulations').select('*').order('effective_date', { ascending: false })

  if (error) {
    console.error('Error fetching regulations:', error)
    return getSupplementalRegulations()
  }

  return mergeRegulations((data || []) as RegulationRecord[])
}

export async function fetchRegulationById(id: string) {
  const localMatch = getSupplementalRegulations().find((regulation) => regulation.id === id)
  if (localMatch) return localMatch

  const { data, error } = await supabase.from('regulations').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('Error fetching regulation:', error)
    return null
  }

  return (data as RegulationRecord | null) || null
}
