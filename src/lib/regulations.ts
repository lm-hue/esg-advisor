import { Regulation, RegulationSourceChunk, RegulationSourceDocument } from '../types'
import {
  getRegulationTypeKey,
  inferDatePrecision,
  inferJurisdictionType,
  inferLinkStatus,
  inferRegulationTopics,
  inferSourceHealth,
  normalizeRegulationTopics,
  normalizeStatus,
} from './appTheme'
import {
  applyHumanVerifiedOverride,
  applyHumanVerifiedOverrides,
} from './regulationVerification'
import { supabase } from './supabase'

export interface RegulationRecord extends Regulation {
  summary?: string
}

function isCarrotsSourceUrl(url?: string | null) {
  return (url || '').trim().toLowerCase().includes('carrotsandsticks.org')
}

function sanitizeFrontEndSourceUrl(url?: string | null) {
  const normalized = (url || '').trim()
  if (!normalized) return null
  if (isCarrotsSourceUrl(normalized)) return null
  return normalized
}

function sanitizeFrontEndSourceName(name?: string | null) {
  const normalized = (name || '').trim()
  if (!normalized) return ''
  if (/carrots?\s*&\s*sticks/i.test(normalized) || /carrotsandsticks/i.test(normalized)) {
    return 'Archived source'
  }
  return normalized
}

const SUPPLEMENTAL_REGULATIONS: RegulationRecord[] = [
  {
    id: 'framework-eu-vsme-standard',
    title: 'VSME Standard for Non-Listed SMEs',
    description:
      'A voluntary sustainability reporting standard recommended by the European Commission for non-listed micro, small, and medium-sized enterprises.',
    full_description:
      'The Voluntary Sustainability Reporting Standard for non-listed SMEs (VSME) was developed by EFRAG and adopted by the European Commission in the form of a Recommendation on 30 July 2025. It provides a proportionate, modular reporting framework for undertakings with fewer than 250 employees, helping them respond to sustainability information requests from lenders, investors, and large value-chain partners without applying the full ESRS regime for large companies.',
    summary:
      'An EU-recommended voluntary sustainability reporting framework for non-listed SMEs.',
    category: 'Governance',
    region: 'EU',
    status: 'in_force',
    effective_date: '2025-07-30',
    source_name: 'European Commission / EUR-Lex',
    source_url:
      'https://eur-lex.europa.eu/eli/reco/2025/1710/oj/eng',
    tags: ['vsme', 'sme reporting', 'voluntary disclosure', 'efrag', 'sustainability reporting', 'eu'],
    created_at: '2025-07-30T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'guidance-oecd-due-diligence-rbc',
    title: 'OECD Due Diligence Guidance for Responsible Business Conduct',
    description:
      'Cross-sector OECD guidance that helps businesses identify, prevent, mitigate, and account for adverse environmental, social, and governance impacts.',
    full_description:
      'The OECD Due Diligence Guidance for Responsible Business Conduct provides practical support for enterprises implementing risk-based due diligence under the OECD Guidelines for Multinational Enterprises. It explains how companies can identify and address actual or potential adverse impacts connected with workers, human rights, the environment, bribery, consumers, and corporate governance across operations, supply chains, and business relationships.',
    summary:
      'A cross-sector OECD framework for risk-based due diligence on environmental, social, and governance impacts.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-02-01',
    source_name: 'OECD',
    source_url:
      'https://www.oecd.org/en/publications/oecd-due-diligence-guidance-for-responsible-business-conduct_15f5f4b3-en.html',
    tags: ['oecd', 'due diligence', 'responsible business conduct', 'supply chains', 'human rights', 'governance'],
    created_at: '2018-02-01T00:00:00.000Z',
    updated_at: '2018-02-01T00:00:00.000Z',
    umbrella_id: 'framework-oecd-guidelines-rbc',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'framework-oecd-guidelines-rbc',
    title: 'OECD Guidelines for Multinational Enterprises on Responsible Business Conduct',
    description:
      'Government-backed OECD recommendations that set a leading global standard for responsible business conduct across environmental, social, governance, and due diligence topics.',
    full_description:
      'The OECD Guidelines for Multinational Enterprises on Responsible Business Conduct are recommendations jointly addressed by governments to multinational enterprises. The 2023 update strengthened the standard across climate change, biodiversity, technology, business integrity, disclosure, and supply chain due diligence, and they apply across sectors, sizes, and ownership structures. They are implemented in adherent countries through National Contact Points for Responsible Business Conduct.',
    summary:
      'A leading international responsible business conduct standard updated by the OECD in 2023.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2023-06-08',
    source_name: 'OECD',
    source_url:
      'https://www.oecd.org/en/publications/2023/06/oecd-guidelines-for-multinational-enterprises-on-responsible-business-conduct_a0b49990.html',
    tags: ['oecd', 'responsible business conduct', 'guidelines', 'due diligence', 'human rights', 'biodiversity', 'climate'],
    created_at: '2023-06-08T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'guidance-oecd-minerals-due-diligence',
    title:
      'OECD Due Diligence Guidance for Responsible Supply Chains of Minerals from Conflict-Affected and High-Risk Areas',
    description:
      'OECD guidance that helps companies build responsible mineral and metal supply chains that avoid contributing to conflict and serious human rights abuses.',
    full_description:
      'The OECD Due Diligence Guidance for Responsible Supply Chains of Minerals from Conflict-Affected and High-Risk Areas was published by the OECD on 6 April 2016 in its third edition. OECD describes it as step-by-step management recommendations endorsed by governments for global responsible supply chains of all minerals, intended to help companies respect human rights and avoid contributing to conflict through their mineral or metal purchasing decisions and practices. It can be used by any company potentially sourcing minerals or metals from conflict-affected and high-risk areas and remains a core official reference for mineral supply-chain due diligence.',
    summary:
      'The core OECD framework for mineral supply-chain due diligence in conflict-affected and high-risk areas.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2016-04-06',
    source_name: 'OECD',
    source_url:
      'https://www.oecd.org/en/publications/oecd-due-diligence-guidance-for-responsible-supply-chains-of-minerals-from-conflict-affected-and-high-risk-areas_9789264252479-en.html',
    tags: ['oecd', 'minerals', 'due diligence', 'conflict-affected and high-risk areas', 'human rights', 'supply chains'],
    created_at: '2016-04-06T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'framework-oecd-guidelines-rbc',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'policy-oecd-recommendation-role-of-government-rbc',
    title: 'OECD Recommendation on the Role of Government in Promoting Responsible Business Conduct',
    description:
      'An OECD policy instrument that guides governments on embedding responsible business conduct across policy areas, procurement, trade, investment, and state-business relationships.',
    full_description:
      'The OECD Recommendation on the Role of Government in Promoting Responsible Business Conduct sets expectations for how governments should enable, support, and exemplify responsible business conduct. Adopted by the OECD Council in 2022, it calls on governments to promote policy coherence, lead by example in their own commercial activities, and integrate responsible business conduct considerations into areas such as public procurement, export credit, development co-operation, trade, and investment promotion.',
    summary:
      'An OECD policy recommendation for how governments should promote responsible business conduct across public policy tools.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-12-08',
    source_name: 'OECD',
    source_url:
      'https://www.oecd.org/en/publications/oecd-recommendation-on-the-role-of-government-in-promoting-responsible-business-conduct_91e18021-en.html',
    tags: ['oecd', 'policy', 'responsible business conduct', 'government', 'public procurement', 'investment'],
    created_at: '2022-12-08T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'framework-oecd-guidelines-rbc',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'standard-iso-14001-environmental-management-systems',
    title: 'ISO 14001 Environmental Management Systems',
    description:
      'The leading ISO standard for environmental management systems, setting requirements for organizations to manage environmental responsibilities systematically.',
    full_description:
      'ISO 14001:2015 specifies requirements for an environmental management system that organizations can use to improve environmental performance, fulfil compliance obligations, and achieve environmental objectives. ISO describes it as the internationally recognized framework for designing and implementing an environmental management system and for driving continual improvement across issues such as resource use, waste, environmental performance monitoring, and stakeholder engagement.',
    summary:
      'The core ISO standard for establishing and improving an environmental management system.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2015-09-15',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/60857.html',
    tags: ['iso 14001', 'environmental management system', 'ems', 'environmental performance', 'compliance'],
    created_at: '2015-09-15T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'standard-iso-14064-1-ghg-inventories',
    title: 'ISO 14064-1 Greenhouse Gas Inventories',
    description:
      'An ISO standard that sets organization-level requirements and guidance for quantifying and reporting greenhouse gas emissions and removals.',
    full_description:
      'ISO 14064-1:2018 specifies principles and requirements at the organization level for the quantification and reporting of greenhouse gas emissions and removals. ISO states that it covers the design, development, management, reporting, and verification of an organization’s greenhouse gas inventory, and the current published 2018 edition remains in force while a revision project is under development. The standard is widely relevant for organizations building more rigorous GHG accounting systems beyond basic disclosure.',
    summary:
      'An ISO standard for building and reporting organization-level greenhouse gas inventories.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-12-19',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/66453.html',
    tags: ['iso 14064-1', 'ghg inventory', 'greenhouse gases', 'emissions accounting', 'removals', 'climate'],
    created_at: '2018-12-19T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14064-1',
  },
  {
    id: 'standard-iso-14067-carbon-footprint-products',
    title: 'ISO 14067 Carbon Footprint of Products',
    description:
      'An ISO standard that sets requirements and guidelines for quantifying and reporting the carbon footprint of products using life-cycle assessment principles.',
    full_description:
      'ISO 14067:2018 specifies principles, requirements, and guidelines for the quantification and reporting of the carbon footprint of a product in a manner consistent with ISO 14040 and ISO 14044 life-cycle assessment standards. ISO states that the standard also covers partial product carbon footprints, addresses only the climate-change impact category, and excludes carbon offsetting and communication claims from its scope. The current edition was published on 20 August 2018, confirmed in 2024, and remains the published baseline while a revision project is under development.',
    summary:
      'The ISO standard for quantifying and reporting product-level carbon footprints.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-08-20',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/71206.html',
    tags: ['iso 14067', 'carbon footprint of products', 'cfp', 'life-cycle assessment', 'product emissions', 'climate'],
    created_at: '2018-08-20T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14067',
  },
  {
    id: 'guidance-iso-26000-social-responsibility',
    title: 'ISO 26000 Guidance on Social Responsibility',
    description:
      'An ISO guidance standard that helps organizations translate social responsibility principles into policies, practices, stakeholder engagement, and reporting.',
    full_description:
      'ISO 26000:2010 provides guidance on social responsibility for organizations of all types rather than certifiable management system requirements. ISO positions it as a reference standard for integrating socially responsible behaviour into organizational values, governance, labour practices, human rights, the environment, fair operating practices, consumer issues, and community involvement and development.',
    summary:
      'An ISO guidance standard for embedding social responsibility across governance, labour, human rights, and community practices.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2010-11-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/42546.html',
    tags: ['iso 26000', 'social responsibility', 'human rights', 'labour practices', 'stakeholder engagement'],
    created_at: '2010-11-01T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'guidance-ifrs-sustainability-disclosure-taxonomy',
    title: 'IFRS Sustainability Disclosure Taxonomy',
    description:
      'IFRS Foundation taxonomy for digitally tagging sustainability-related financial disclosures prepared under IFRS Sustainability Disclosure Standards.',
    full_description:
      'The IFRS Sustainability Disclosure Taxonomy reflects the disclosure requirements in IFRS S1 and IFRS S2 and allows entities to tag sustainability-related financial information in a structured digital format. The taxonomy is intended to improve the digital consumption, comparison, and analysis of sustainability disclosures by investors, regulators, and other users of general purpose financial reports.',
    summary:
      'A digital tagging taxonomy for sustainability disclosures prepared under IFRS S1 and IFRS S2.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-04-30',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/issued-standards/ifrs-sustainability-taxonomy/ifrs-sustainability-disclosure-taxonomy-2024/',
    tags: ['ifrs', 'issb', 'taxonomy', 'digital reporting', 'xbrl', 'ifrs s1', 'ifrs s2'],
    created_at: '2024-04-30T00:00:00.000Z',
    updated_at: '2024-04-30T00:00:00.000Z',
  },
  {
    id: 'guidance-sasb-standards-taxonomy',
    title: 'SASB Standards Taxonomy',
    description:
      'IFRS Foundation taxonomy for digitally tagging sustainability-related financial information prepared in accordance with the SASB Standards.',
    full_description:
      'The SASB Standards Taxonomy includes elements for tagging sustainability-related financial information prepared in accordance with the SASB Standards so that investors and other users can extract, compare, and analyse it more efficiently in digital form. The IFRS Foundation states that the taxonomy is designed both for preparers applying the SASB Standards independently and for preparers applying them alongside the IFRS Sustainability Disclosure Taxonomy. The ISSB issued the 2024 update to the SASB Standards Taxonomy on 28 October 2024 to reflect the June 2023 and December 2023 amendments to the SASB Standards and to improve consistency with other IFRS digital taxonomies.',
    summary:
      'A digital taxonomy for tagging SASB-based sustainability disclosures in a structured format.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-10-28',
    source_name: 'IFRS Foundation / SASB',
    source_url:
      'https://sasb.ifrs.org/sasb-standards-taxonomy/',
    tags: ['sasb', 'taxonomy', 'ifrs', 'digital reporting', 'xbrl', 'industry-based disclosure'],
    created_at: '2024-10-28T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'guidance-ifrs-sustainability-disclosure-taxonomy',
    umbrella_relation: 'component' as const,
    version_label: 'SASB Standards Taxonomy',
  },
  {
    id: 'standard-issa-5000-sustainability-assurance',
    title: 'ISSA 5000 General Requirements for Sustainability Assurance Engagements',
    description:
      'The IAASB global baseline assurance standard for sustainability assurance engagements across any sustainability topic, reporting framework, and reporting format.',
    full_description:
      'International Standard on Sustainability Assurance 5000 (ISSA 5000) was approved by the International Auditing and Assurance Standards Board in 2024 and published by IFAC on 28 February 2025. The standard establishes general requirements for both limited and reasonable assurance engagements covering sustainability information prepared under any suitable criteria. The IAASB completed-projects register lists ISSA 5000 with an effective date of 15 December 2026, making it a key global reference point for assurance over sustainability reporting as adoption expands across jurisdictions.',
    summary:
      'The core IAASB standard for limited and reasonable assurance over sustainability information.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2026-12-15',
    source_name: 'IAASB / IFAC',
    source_url:
      'https://www.iaasb.org/publications/international-standard-sustainability-assurance-5000-general-requirements-sustainability-assurance-0',
    tags: ['issa 5000', 'iaasb', 'sustainability assurance', 'limited assurance', 'reasonable assurance', 'ifac'],
    created_at: '2025-02-28T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'standard-iessa-sustainability-assurance-ethics',
    title: 'International Ethics Standards for Sustainability Assurance (IESSA)',
    description:
      'The IESBA ethics and independence standard for sustainability assurance engagements, designed to work alongside ISSA 5000.',
    full_description:
      'The International Ethics Standards for Sustainability Assurance (including International Independence Standards), known as IESSA, form part of the IESBA global ethics sustainability standards. The framework was certified by the Public Interest Oversight Board and publicly supported by IOSCO in January 2025. IESSA sets ethical and independence requirements for sustainability assurance practitioners and is designed to support consistent, credible assurance practice alongside ISSA 5000. The IESBA sustainability project page states that, except for certain value-chain component independence provisions that phase in later, IESSA is effective for sustainability assurance engagements for periods beginning on or after 15 December 2026, or as at a specific date on or after 15 December 2026.',
    summary:
      'The global ethics and independence standard supporting sustainability assurance engagements.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2026-12-15',
    source_name: 'IESBA / IFAC',
    source_url:
      'https://www.ethicsboard.org/consultations-projects/sustainability',
    tags: ['iessa', 'iesba', 'ethics', 'independence', 'sustainability assurance', 'ifac'],
    created_at: '2025-01-17T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-gri-standards',
    title: 'GRI Standards',
    description:
      'A global sustainability reporting standards system that helps organizations report their impacts on the economy, environment, and people.',
    full_description:
      'The GRI Standards are a modular set of sustainability reporting standards maintained by the Global Reporting Initiative. They are designed for organizations of any size or sector to report material impacts on the economy, environment, and people in a comparable and credible way. The revised Universal Standards were published in October 2021 and came into effect for reporting on 1 January 2023, and the standards system has continued to expand through Sector Standards and updated Topic Standards, including GRI 102: Climate Change 2025 and GRI 103: Energy 2025 released on 26 June 2025.',
    summary:
      'A widely used global reporting framework for sustainability impacts and due diligence-related disclosures.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2023-01-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/',
    tags: ['gri', 'sustainability reporting', 'standards', 'impacts', 'disclosure', 'global'],
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2025-06-26T00:00:00.000Z',
  },
  {
    id: 'standard-gri-102-climate-change-2025',
    title: 'GRI 102: Climate Change 2025',
    description:
      'A GRI Topic Standard that sets climate change disclosures for organizations reporting material climate impacts.',
    full_description:
      'GRI 102: Climate Change 2025 is a GRI Topic Standard issued by the Global Sustainability Standards Board and published by GRI on 26 June 2025. It is effective for reports or other materials published on or after 1 January 2027, with earlier adoption encouraged. The standard sets disclosures on climate adaptation and transition, greenhouse gas emissions, targets, action plans, and the impacts of climate action on workers, communities, Indigenous Peoples, and biodiversity.',
    summary:
      'The 2025 GRI climate reporting standard for climate impacts, emissions, targets, and transition actions.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2027-01-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://globalreporting.org/pdf.ashx?id=29514',
    tags: ['gri', 'gri 102', 'climate change', 'topic standard', 'ghg emissions', 'transition'],
    created_at: '2025-06-26T00:00:00.000Z',
    updated_at: '2025-06-26T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-103-energy-2025',
    title: 'GRI 103: Energy 2025',
    description:
      'A GRI Topic Standard that sets energy disclosures for organizations with material energy-related impacts.',
    full_description:
      'GRI 103: Energy 2025 is a GRI Topic Standard published by GRI on 26 June 2025 and effective for reports or other materials published on or after 1 January 2027, with earlier adoption encouraged. The standard updates energy reporting expectations across energy consumption, reductions, renewable and non-renewable energy use, and energy impacts in the value chain, replacing GRI 302: Energy 2016 when it takes effect.',
    summary:
      'The 2025 GRI energy reporting standard for energy use, reductions, and value-chain energy impacts.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2027-01-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/standards-development/project-for-climate-change-standards/',
    tags: ['gri', 'gri 103', 'energy', 'topic standard', 'energy reduction', 'renewable energy'],
    created_at: '2025-06-26T00:00:00.000Z',
    updated_at: '2025-06-26T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-101-biodiversity-2024',
    title: 'GRI 101: Biodiversity 2024',
    description:
      'A GRI Topic Standard that sets biodiversity disclosures for organizations reporting material biodiversity-related impacts.',
    full_description:
      'GRI 101: Biodiversity 2024 is a GRI Topic Standard issued by the Global Sustainability Standards Board and published by GRI in 2025. It is effective for reports or other materials published on or after 1 January 2026. The standard contains disclosures on policies to halt and reverse biodiversity loss, management of biodiversity impacts, access and benefit-sharing, identification of biodiversity impacts, locations with biodiversity impacts, direct drivers of biodiversity loss, changes to the state of biodiversity, and ecosystem services.',
    summary:
      'The current GRI biodiversity reporting standard for material biodiversity-related impacts and their management.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2026-01-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/pdf.ashx?id=24534',
    tags: ['gri', 'gri 101', 'biodiversity', 'topic standard', 'ecosystem services', 'nature reporting'],
    created_at: '2025-01-01T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'framework-integrated-reporting-framework',
    title: 'Integrated Reporting Framework',
    description:
      'A global voluntary corporate reporting framework that helps organizations explain how they create, preserve, or erode value over time.',
    full_description:
      'The Integrated Reporting Framework, now hosted by the IFRS Foundation, supports integrated reporting by helping organizations explain how strategy, governance, performance, and prospects interact with the external environment to create value over the short, medium, and long term. Revisions to the original 2013 framework were published in January 2021. The framework is built around integrated thinking and a multi-capital view of value creation, covering financial, manufactured, intellectual, human, social and relationship, and natural capital.',
    summary:
      'A global framework for integrated reporting built around value creation and a multi-capital view of business.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-01-19',
    source_name: 'IFRS Foundation',
    source_url: 'https://www.ifrs.org/content/ifrs/home/issued-standards/integrated-reporting/framework.html',
    tags: ['integrated reporting', 'ifrs', 'value creation', 'integrated thinking', 'capitals', 'corporate reporting'],
    created_at: '2021-01-19T00:00:00.000Z',
    updated_at: '2021-01-19T00:00:00.000Z',
  },
  {
    id: 'guidance-unctad-core-indicators-sdg-reporting',
    title:
      'UNCTAD Guidance on Core Indicators for Entity Reporting on Contribution towards Implementation of the Sustainable Development Goals',
    description:
      'UNCTAD guidance that helps organizations report a comparable baseline set of sustainability and SDG-related indicators for entity reporting.',
    full_description:
      'UNCTAD published its Guidance on Core Indicators for Entity Reporting on Contribution towards Implementation of the Sustainable Development Goals on 31 May 2019. UNCTAD describes it as a practical tool to help entities provide consistent and comparable baseline data on sustainability issues and to help governments assess private-sector contributions to the Sustainable Development Goals, including SDG indicator 12.6.1 on sustainability reporting. The guidance organizes core indicators across economic, environmental, social, and institutional areas and is intended to support convergence and comparability across sustainability reporting practices.',
    summary:
      'A UNCTAD guidance framework for baseline sustainability and SDG-related entity reporting using core indicators.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-05-31',
    source_name: 'UN Trade and Development (UNCTAD)',
    source_url:
      'https://unctad.org/publication/core-sdg-indicators-entity-reporting-training-manual',
    tags: ['unctad', 'sdg reporting', 'core indicators', 'sustainability reporting', 'sdg 12.6.1', 'isar'],
    created_at: '2019-05-31T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'consortium-un-global-compact',
    title: 'UN Global Compact',
    description:
      'A United Nations-backed corporate sustainability initiative built around ten principles covering human rights, labour, environment, and anti-corruption.',
    full_description:
      'Launched in 2000, the UN Global Compact is a voluntary initiative that asks participating companies to align strategies and operations with Ten Principles in the areas of human rights, labour, environment, and anti-corruption. It functions as a global corporate sustainability platform and network, supporting participating businesses through guidance, local networks, and annual Communication on Progress reporting expectations.',
    summary:
      'A UN-backed global corporate sustainability initiative centered on the Ten Principles.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2000-07-26',
    source_name: 'UN Global Compact',
    source_url: 'https://unglobalcompact.org/what-is-gc/mission/principles',
    tags: ['un global compact', 'ten principles', 'consortium', 'voluntary initiative', 'human rights', 'anti-corruption'],
    created_at: '2000-07-26T00:00:00.000Z',
    updated_at: '2000-07-26T00:00:00.000Z',
  },
  {
    id: 'guidance-un-guiding-principles-business-human-rights',
    title: 'UN Guiding Principles on Business and Human Rights',
    description:
      'UN-endorsed guidance framework that sets the global baseline for the state duty to protect, the corporate responsibility to respect, and access to remedy in business and human rights.',
    full_description:
      'The UN Guiding Principles on Business and Human Rights were endorsed by the UN Human Rights Council on 16 June 2011 as the authoritative global framework for preventing and addressing adverse human rights impacts linked to business activity. They are structured around three pillars: the state duty to protect human rights, the corporate responsibility to respect human rights, and access to effective remedy for affected people. They are widely used as the reference point for corporate human rights due diligence, grievance mechanisms, and responsible business conduct expectations across supply chains and operations.',
    summary:
      'The leading global framework for business and human rights due diligence and remedy.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2011-06-16',
    source_name: 'United Nations / OHCHR',
    source_url:
      'https://digitallibrary.un.org/record/720245',
    tags: ['ungp', 'business and human rights', 'human rights due diligence', 'remedy', 'responsible business conduct'],
    created_at: '2011-06-16T00:00:00.000Z',
    updated_at: '2011-06-16T00:00:00.000Z',
  },
  {
    id: 'guidance-ilo-mne-declaration',
    title: 'ILO MNE Declaration',
    description:
      'The ILO’s tripartite guidance instrument for enterprises on social policy, decent work, and responsible business conduct.',
    full_description:
      'The Tripartite Declaration of Principles concerning Multinational Enterprises and Social Policy, commonly known as the ILO MNE Declaration, is the only ILO instrument that provides direct guidance to enterprises on social policy and inclusive, responsible, and sustainable workplace practices. It is addressed to multinational and national enterprises, governments, and employers’ and workers’ organizations. The declaration covers employment, training, conditions of work and life, industrial relations, and broader policy issues, and it was most recently amended in 2022.',
    summary:
      'The ILO’s global guidance instrument for business conduct, labour standards, and decent work.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-11-30',
    source_name: 'International Labour Organization',
    source_url:
      'https://www.ilo.org/publications/tripartite-declaration-principles-concerning-multinational-enterprises-and-3',
    tags: ['ilo', 'mne declaration', 'decent work', 'labour standards', 'responsible business conduct', 'social policy'],
    created_at: '2022-11-30T00:00:00.000Z',
    updated_at: '2022-11-30T00:00:00.000Z',
  },
  {
    id: 'consortium-principles-for-responsible-investment',
    title: 'Principles for Responsible Investment (PRI)',
    description:
      'A global investor-backed responsible investment framework and signatory network organized around six principles for incorporating ESG factors into investment practice.',
    full_description:
      'The Principles for Responsible Investment were launched in April 2006 following a UN-supported investor process. The six principles provide a voluntary framework for investors to incorporate environmental, social, and governance issues into investment analysis, ownership practices, disclosure expectations, industry collaboration, and reporting. PRI also operates a large global signatory network and reporting system, making it both a framework and a consortium for responsible investment practice.',
    summary:
      'A global responsible investment framework and investor network built around six ESG principles.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2006-04-27',
    source_name: 'PRI',
    source_url: 'https://www.unpri.org/about-us',
    tags: ['pri', 'responsible investment', 'investors', 'signatories', 'active ownership', 'esg integration'],
    created_at: '2006-04-27T00:00:00.000Z',
    updated_at: '2006-04-27T00:00:00.000Z',
  },
  {
    id: 'policy-unep-fi-statement-of-commitment',
    title: 'UNEP FI Statement of Commitment by Financial Institutions on Sustainable Development',
    description:
      'A voluntary UNEP FI commitment statement under which financial institutions recognize their role in sustainable development and commit to integrating environmental and social considerations into their operations.',
    full_description:
      'The UNEP FI Statement of Commitment by Financial Institutions on Sustainable Development is the foundational commitment instrument behind UNEP FI. UNEP FI states that the original backbone of the initiative was created in the wake of the Rio Earth Summit in 1992, with the banking statement launched in May 1992 and later consolidated into a single statement finalized in 2011. By signing the statement, financial institutions acknowledge the role of the financial sector in supporting sustainable development and commit to embedding environmental and social considerations across strategy, operations, and decision-making.',
    summary:
      'The founding UNEP FI commitment statement for integrating sustainability into financial-sector practice.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2011-01-01',
    source_name: 'UNEP FI',
    source_url: 'https://www.unepfi.org/about/unep-fi-statement/history-of-the-statement/',
    tags: ['unep fi', 'statement of commitment', 'sustainable development', 'financial institutions', 'governance', 'voluntary commitment'],
    created_at: '2011-01-01T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'consortium-principles-for-responsible-banking',
    title: 'Principles for Responsible Banking (PRB)',
    description:
      'A UNEP FI framework and signatory initiative that helps banks align strategy and practice with society’s goals and the Sustainable Development Goals.',
    full_description:
      'The Principles for Responsible Banking were launched by the United Nations Environment Programme Finance Initiative on 22 September 2019. They provide a voluntary framework for banks to align their business strategy with the goals of society, including the Paris Agreement and the Sustainable Development Goals, and they are structured around six principles covering alignment, impact and target setting, clients and customers, stakeholders, governance and culture, and transparency and accountability.',
    summary:
      'A UNEP FI banking framework and signatory network built around six principles for sustainable finance alignment.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-09-22',
    source_name: 'UNEP FI',
    source_url: 'https://www.unepfi.org/banking/bankingprinciples/',
    tags: ['prb', 'unep fi', 'banking', 'sustainable finance', 'signatories', 'responsible banking'],
    created_at: '2019-09-22T00:00:00.000Z',
    updated_at: '2019-09-22T00:00:00.000Z',
    umbrella_id: 'policy-unep-fi-statement-of-commitment',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'consortium-net-zero-banking-alliance',
    title: 'Net-Zero Banking Alliance (NZBA)',
    description:
      'A UNEP FI-convened global alliance of banks committed to aligning lending, investment, and capital markets activities with net-zero greenhouse gas emissions by 2050.',
    full_description:
      'The Net-Zero Banking Alliance was launched on 21 April 2021 as a bank-led, UN-convened alliance under the umbrella of the Glasgow Financial Alliance for Net Zero. Convened by UNEP FI, it brings together banks that commit to aligning operational and attributable greenhouse gas emissions from their portfolios with pathways to net zero by 2050 or sooner, while setting intermediate targets and reporting progress. The alliance functions as both a signatory consortium and an implementation platform for portfolio transition planning, target setting, and sectoral decarbonization guidance.',
    summary:
      'A UNEP FI-convened banking alliance for portfolio alignment with net zero by 2050.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-04-21',
    source_name: 'UNEP FI',
    source_url: 'https://www.unepfi.org/net-zero-banking/',
    tags: ['nzba', 'unep fi', 'banks', 'net zero', 'portfolio alignment', 'gfanz'],
    created_at: '2021-04-21T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'policy-unep-fi-statement-of-commitment',
    umbrella_relation: 'component' as const,
  },
  {
    id: 'consortium-net-zero-asset-owner-alliance',
    title: 'Net-Zero Asset Owner Alliance (NZAOA)',
    description:
      'A UN-convened alliance of asset owners committed to transitioning investment portfolios to net-zero greenhouse gas emissions by 2050.',
    full_description:
      'The Net-Zero Asset Owner Alliance was launched at the UN Secretary-General’s Climate Action Summit on 23 September 2019 as a signatory-led group of institutional investors committed to transitioning their portfolios to net-zero greenhouse gas emissions by 2050, consistent with a 1.5C pathway. Convened by UNEP FI and PRI, the alliance combines a public commitment, signatory governance, and practical implementation resources for target setting, stewardship, policy engagement, and climate-solutions investment.',
    summary:
      'A UN-convened asset-owner alliance focused on portfolio alignment with net zero by 2050.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-09-23',
    source_name: 'UNEP FI / PRI',
    source_url: 'https://www.unepfi.org/net-zero-alliance/',
    tags: ['nzaoa', 'asset owners', 'net zero', 'unep fi', 'pri', 'portfolio alignment'],
    created_at: '2019-09-23T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'policy-unep-fi-statement-of-commitment',
    umbrella_relation: 'component' as const,
  },
  {
    id: 'guidance-nzaoa-target-setting-protocol',
    title: 'NZAOA Target-Setting Protocol',
    description:
      'The Net-Zero Asset Owner Alliance’s methodology for how signatories set intermediate climate targets and related stewardship expectations.',
    full_description:
      'The NZAOA Target-Setting Protocol is the Net-Zero Asset Owner Alliance’s core implementation guidance for setting and updating intermediate climate targets on the path to net zero. UNEP FI states that the fifth edition, released on 6 March 2026, adds regional flexibility, strengthens incentives for asset-manager engagement, updates key performance indicators, and introduces a transition-target category alongside expanded treatment of private assets and climate-solutions investment. It functions as a practical methodology for voluntary target setting rather than a regulation.',
    summary:
      'A current NZAOA methodology for setting intermediate climate targets and stewardship expectations.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2026-03-06',
    source_name: 'UNEP FI / NZAOA',
    source_url: 'https://www.unepfi.org/industries/nzaoa-target-setting-protocol-fifth-edition/',
    tags: ['nzaoa', 'target-setting protocol', 'asset owners', 'net zero', 'stewardship', 'climate targets'],
    created_at: '2026-03-06T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'consortium-net-zero-asset-owner-alliance',
    umbrella_relation: 'part_of' as const,
    version_label: '5th Edition (2026)',
  },
  {
    id: 'consortium-principles-for-sustainable-insurance',
    title: 'Principles for Sustainable Insurance (PSI)',
    description:
      'A UNEP FI global framework and signatory initiative for integrating environmental, social, and governance issues into insurance business decisions.',
    full_description:
      'The Principles for Sustainable Insurance were launched by the United Nations Environment Programme Finance Initiative on 19 June 2012 at the UN Conference on Sustainable Development. They provide a global framework for the insurance industry to address environmental, social, and governance risks and opportunities in strategy, underwriting, risk management, investment, and stakeholder engagement, and they are supported by a signatory network across insurance and reinsurance markets.',
    summary:
      'A UNEP FI insurance framework and signatory network for integrating ESG issues into insurance decisions.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2012-06-19',
    source_name: 'UNEP FI',
    source_url: 'https://www.unepfi.org/insurance/insurance/the-principles/',
    tags: ['psi', 'unep fi', 'insurance', 'reinsurance', 'esg integration', 'signatories'],
    created_at: '2012-06-19T00:00:00.000Z',
    updated_at: '2012-06-19T00:00:00.000Z',
    umbrella_id: 'policy-unep-fi-statement-of-commitment',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'standard-ghg-protocol-corporate-accounting-reporting-standard',
    title: 'GHG Protocol Corporate Standard',
    description:
      'The foundational global standard for measuring and reporting corporate greenhouse gas emissions, covering scope 1 and scope 2 emissions.',
    full_description:
      'The GHG Protocol Corporate Accounting and Reporting Standard, first published in 2001 and revised in 2004, is the most widely used international accounting framework for corporate greenhouse gas inventories. It establishes accounting and reporting principles, defines the three scopes of emissions, and provides methodological guidance for measuring scope 1 (direct) and scope 2 (indirect energy-related) emissions. The standard underpins the GHG Protocol suite of standards and is referenced in national and international regulatory frameworks, voluntary reporting schemes, and rating methodologies worldwide.',
    summary:
      'The most widely used greenhouse gas accounting and reporting standard for companies globally.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2004-01-01',
    source_name: 'GHG Protocol',
    source_url: 'https://ghgprotocol.org/corporate-standard',
    tags: ['ghg protocol', 'corporate standard', 'scope 1', 'scope 2', 'ghg inventory', 'climate accounting'],
    created_at: '2004-01-01T00:00:00.000Z',
    updated_at: '2004-01-01T00:00:00.000Z',
  },
  {
    id: 'standard-ghg-protocol-scope-3-standard',
    title: 'GHG Protocol Corporate Value Chain (Scope 3) Standard',
    description:
      'The global standard for accounting and reporting greenhouse gas emissions across a company’s upstream and downstream value chain.',
    full_description:
      'The GHG Protocol Corporate Value Chain (Scope 3) Standard was released in October 2011 to help companies account for indirect greenhouse gas emissions across their full value chain. It provides a harmonized methodology covering 15 upstream and downstream scope 3 categories and is designed to be used alongside the GHG Protocol Corporate Standard. It is widely used by companies seeking more complete climate inventories, supplier engagement, and value-chain decarbonization planning.',
    summary:
      'The leading standard for measuring and reporting value-chain greenhouse gas emissions.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2011-10-04',
    source_name: 'GHG Protocol',
    source_url: 'https://ghgprotocol.org/standards/scope-3-standard',
    tags: ['ghg protocol', 'scope 3', 'value chain emissions', 'supplier engagement', 'climate accounting'],
    created_at: '2011-10-04T00:00:00.000Z',
    updated_at: '2011-10-04T00:00:00.000Z',
    umbrella_id: 'standard-ghg-protocol-corporate-accounting-reporting-standard',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'standard-ghg-protocol-land-sector-removals-standard',
    title: 'GHG Protocol Land Sector and Removals Standard',
    description:
      'A global voluntary standard for accounting and reporting land-sector emissions, CO2 removals, and related metrics in corporate GHG inventories.',
    full_description:
      'The GHG Protocol Land Sector and Removals Standard is the first GHG Protocol standard focused specifically on land-sector emissions and removals. Published on 30 January 2026 and effective from 1 January 2027, it provides accounting requirements and guidance for companies to quantify, report, and track land emissions, CO2 removals, and certain carbon capture and storage activities in a more consistent way across operations and value chains. It is particularly relevant for companies with significant agricultural or land-based activities and for organizations that want more credible treatment of removals within climate accounting.',
    summary:
      'A new GHG Protocol standard for corporate accounting of land-sector emissions and CO2 removals.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2027-01-01',
    source_name: 'GHG Protocol',
    source_url:
      'https://ghgprotocol.org/land-sector-and-removals-standard',
    tags: ['ghg protocol', 'standard', 'land sector', 'co2 removals', 'agriculture', 'climate accounting'],
    created_at: '2026-01-30T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'standard-ghg-protocol-corporate-accounting-reporting-standard',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'standard-pcaf-global-ghg-accounting-reporting-standard-financial-industry',
    title: 'PCAF Global GHG Accounting and Reporting Standard for the Financial Industry',
    description:
      'A global voluntary standard that helps financial institutions measure and disclose greenhouse gas emissions associated with their financial activities.',
    full_description:
      'The PCAF Global GHG Accounting and Reporting Standard for the Financial Industry is a sector-specific greenhouse gas accounting standard for financial institutions. As of the 2 December 2025 update, the standard is structured around Part A for financed emissions, Part B for facilitated emissions, and Part C for insurance-associated emissions, with supplemental guidance on financed avoided emissions and forward-looking metrics. It is designed to support more transparent, harmonized climate accounting and disclosure across lending, investment, capital markets, and insurance activities.',
    summary:
      'A PCAF standard for measuring and reporting emissions linked to lending, investment, facilitation, and insurance activities.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-12-02',
    source_name: 'PCAF',
    source_url: 'https://carbonaccountingfinancials.com/standard',
    tags: ['pcaf', 'financed emissions', 'facilitated emissions', 'insurance-associated emissions', 'financial industry', 'ghg accounting'],
    created_at: '2025-12-02T00:00:00.000Z',
    updated_at: '2025-12-02T00:00:00.000Z',
  },
  {
    id: 'standard-sbti-corporate-net-zero-standard',
    title: 'SBTi Corporate Net-Zero Standard',
    description:
      'The Science Based Targets initiative standard for setting corporate net-zero targets aligned with climate science, covering all scopes of emissions.',
    full_description:
      'The SBTi Corporate Net-Zero Standard, published in October 2021, is the first science-based standard for corporate net-zero target setting. It requires companies to set near-term science-based targets and long-term net-zero targets, cover all material greenhouse gas emissions across scopes 1, 2, and 3, and commit to deep value-chain emissions reductions before relying on carbon removal. The standard includes sector-specific guidance (such as FLAG for forest, land, and agriculture) and has been adopted by thousands of companies globally as a credible framework for climate commitments.',
    summary:
      'The leading standard for companies to set credible, science-based net-zero targets.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-10-28',
    source_name: 'Science Based Targets initiative',
    source_url: 'https://sciencebasedtargets.org/net-zero',
    tags: ['sbti', 'net zero', 'science-based targets', 'scope 3', 'corporate targets', 'climate accounting'],
    created_at: '2021-10-28T00:00:00.000Z',
    updated_at: '2021-10-28T00:00:00.000Z',
  },
  {
    id: 'standard-sbti-financial-institutions-net-zero-standard',
    title: 'SBTi Financial Institutions Net-Zero Standard',
    description:
      'A Science Based Targets initiative standard that guides banks, asset owners, asset managers, private equity firms, and insurers in setting science-based net-zero targets.',
    full_description:
      'The SBTi Financial Institutions Net-Zero Standard was launched on 22 July 2025 as the first science-based net-zero target-setting standard tailored to financial institutions. SBTi positions it as a framework for setting, assessing, and validating net-zero targets across the main financial sector business models, covering lending, investment, insurance, and capital markets-related activities. It is intended to give financial institutions a more decision-useful and sector-specific route to climate target setting than adapting corporate methodologies designed primarily for non-financial companies.',
    summary:
      'The first SBTi net-zero target-setting standard designed specifically for financial institutions.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-07-22',
    source_name: 'Science Based Targets initiative',
    source_url: 'https://sciencebasedtargets.org/net-zero-for-financial-institutions',
    tags: ['sbti', 'financial institutions', 'net zero', 'climate targets', 'banks', 'asset managers'],
    created_at: '2025-07-22T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'standard-sbti-corporate-net-zero-standard',
    umbrella_relation: 'part_of' as const,
    version_label: 'Financial Institutions Standard',
  },
  {
    id: 'guidance-ifrs-s2-transition-plan-disclosures',
    title: 'IFRS Guidance on Climate-Related Transition Plan Disclosures',
    description:
      'IFRS Foundation guidance to help entities disclose climate-related transition information, including transition plans, when applying IFRS S2.',
    full_description:
      'This IFRS Foundation guidance document supports companies applying IFRS S2 Climate-related Disclosures by explaining how to disclose information about an entity’s climate-related transition, including any transition plan it has. The guidance builds on disclosure-specific materials from the Transition Plan Taskforce and is intended to improve the quality, consistency, and comparability of transition-related disclosures without adding new mandatory requirements to IFRS S2.',
    summary:
      'Implementation guidance for disclosing climate-related transition plans under IFRS S2.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-06-23',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/news-and-events/news/2025/06/ifrs-publishes-guidance-disclosures-transition-plans/',
    tags: ['ifrs s2', 'guidance', 'transition plan', 'climate disclosure', 'issb'],
    created_at: '2025-06-23T00:00:00.000Z',
    updated_at: '2025-06-23T00:00:00.000Z',
  },
  {
    id: 'framework-tcfd-recommendations',
    title: 'TCFD Recommendations',
    description:
      'A global voluntary disclosure framework for climate-related financial risks and opportunities structured around governance, strategy, risk management, and metrics and targets.',
    full_description:
      'The Task Force on Climate-related Financial Disclosures (TCFD) published its final recommendations on 29 June 2017 to help companies provide consistent, comparable, reliable, and clear climate-related financial disclosures for investors, lenders, and insurance underwriters. The recommendations apply across sectors and jurisdictions and are organized around four thematic areas: governance, strategy, risk management, and metrics and targets. The Financial Stability Board stated on 12 October 2023 that the TCFD had completed its work following publication of its final status report, and monitoring of progress on company disclosures transferred to the IFRS Foundation in 2024. The recommendations nevertheless remain a foundational reference point for climate disclosure practice and informed later standards such as IFRS S2.',
    summary:
      'The foundational voluntary climate-disclosure framework built around governance, strategy, risk management, and metrics and targets.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2017-06-29',
    source_name: 'Financial Stability Board / TCFD',
    source_url:
      'https://www.fsb.org/sources/tcfd/',
    tags: ['tcfd', 'climate disclosure', 'financial risk', 'governance', 'strategy', 'metrics and targets'],
    created_at: '2017-06-29T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-natural-capital-protocol',
    title: 'Natural Capital Protocol',
    description:
      'A global decision-making framework that helps organizations identify, measure, and value their impacts and dependencies on natural capital.',
    full_description:
      'The Natural Capital Protocol is a Capitals Coalition framework designed to help organizations identify, measure, and value their direct and indirect impacts and dependencies on natural capital. Capitals Coalition materials identify the protocol as the coalition’s 2016 publication and present it as a globally applicable decision-making framework for organizations of all sizes and sectors, structured around four stages: Frame, Scope, Measure and Value, and Apply. It is intended to support better decisions on risks, opportunities, sourcing, supply chains, product design, and wider business strategy where natural capital is material.',
    summary:
      'A global framework for integrating natural capital impacts and dependencies into business decisions.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2016-07-13',
    source_name: 'Capitals Coalition',
    source_url: 'https://capitalscoalition.org/capitals-approach/natural-capital-protocol/?fwp_filter_tabs=guide_supplement',
    tags: ['natural capital', 'capitals coalition', 'framework', 'measurement', 'valuation', 'nature'],
    created_at: '2016-07-13T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'framework-capitals-protocol',
    umbrella_relation: 'version' as const,
    version_label: 'Natural Capital Protocol (2016)',
  },
  {
    id: 'framework-social-human-capital-protocol',
    title: 'Social & Human Capital Protocol',
    description:
      'A global decision-making framework that helps organizations identify, measure, and value their impacts and dependencies on social and human capital.',
    full_description:
      'The Social & Human Capital Protocol is a Capitals Coalition framework that enables organizations to identify, measure, and value their direct and indirect impacts and dependencies on social capital and human capital. The current publication page presents it as a universal framework for integrating social risks, opportunities, and dependencies into corporate strategy and decision-making. Like the Natural Capital Protocol, it is structured around four stages and is intended for use across projects, products, operations, and whole organizations.',
    summary:
      'A global framework for integrating social and human capital into business decision-making.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-01-14',
    source_name: 'Capitals Coalition',
    source_url: 'https://capitalscoalition.org/capitals-approach/social-human-capital-protocol/',
    tags: ['social capital', 'human capital', 'capitals coalition', 'framework', 'measurement', 'valuation'],
    created_at: '2021-01-14T00:00:00.000Z',
    updated_at: '2021-01-14T00:00:00.000Z',
    umbrella_id: 'framework-capitals-protocol',
    umbrella_relation: 'version' as const,
    version_label: 'Social & Human Capital Protocol (2021)',
  },
  {
    id: 'framework-capitals-protocol',
    title: 'Capitals Protocol',
    description:
      'A Capitals Coalition framework that helps organizations integrate impacts, dependencies, risks, and opportunities across natural, social, human, and produced capital into decision-making.',
    full_description:
      'The Capitals Protocol was published by the Capitals Coalition on 21 July 2025 as an integrated decision-making framework that builds on and updates the earlier Natural Capital Protocol and Social & Human Capital Protocol. It is designed to help organizations take a more connected approach to assessing and valuing multiple forms of capital, including produced capital, so that strategy, investment, procurement, and operational decisions better reflect material sustainability-related impacts and dependencies. The protocol is intended as a practical umbrella framework rather than a regulation, making it a strong fit for companies seeking structured ESG decision support beyond single-topic reporting requirements.',
    summary:
      'A Capitals Coalition umbrella framework for integrated sustainability-related decision-making across multiple capitals.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-07-21',
    source_name: 'Capitals Coalition',
    source_url: 'https://capitalscoalition.org/guide_supplement/capitals-protocol/',
    tags: ['capitals coalition', 'capitals protocol', 'natural capital', 'social capital', 'human capital', 'decision-making'],
    created_at: '2025-07-21T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'framework-equator-principles',
    title: 'Equator Principles',
    description:
      'A global financial industry framework for identifying, assessing, and managing environmental and social risks in project-related finance.',
    full_description:
      'The Equator Principles are a common baseline and risk management framework used by Equator Principles Financial Institutions to identify, assess, and manage environmental and social risks in project finance advisory services, project finance, certain project-related corporate loans, bridge loans, and specified refinance or acquisition finance transactions. EP4, the latest iteration, came into effect on 1 October 2020 and expanded the framework’s scope while adding climate change risk assessment and human rights assessment expectations.',
    summary:
      'A global project-finance risk framework used by financial institutions to manage environmental and social risks.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2020-10-01',
    source_name: 'Equator Principles',
    source_url: 'https://equator-principles.com/about-the-equator-principles/',
    tags: ['equator principles', 'project finance', 'financial institutions', 'environmental and social risk', 'ep4'],
    created_at: '2020-10-01T00:00:00.000Z',
    updated_at: '2020-10-01T00:00:00.000Z',
  },
  {
    id: 'framework-icma-green-bond-principles',
    title: 'ICMA Green Bond Principles',
    description:
      'Voluntary ICMA process guidelines that promote integrity and transparency in the global green bond market.',
    full_description:
      'The Green Bond Principles are voluntary process guidelines administered by the International Capital Market Association (ICMA). ICMA describes them as promoting integrity in the green bond market through guidelines that recommend transparency, disclosure, and reporting, and they are organized around use of proceeds, process for project evaluation and selection, management of proceeds, and reporting. The current official page presents them as updated as of June 2025 and positions them as the leading global reference point for bonds financing eligible green projects.',
    summary:
      'The main ICMA framework for transparent issuance and reporting of green bonds.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-06-01',
    source_name: 'ICMA',
    source_url:
      'https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/green-bond-principles-gbp/',
    tags: ['icma', 'green bonds', 'bond principles', 'use of proceeds', 'reporting', 'sustainable finance'],
    created_at: '2025-06-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-icma-social-bond-principles',
    title: 'ICMA Social Bond Principles',
    description:
      'Voluntary ICMA process guidelines that promote transparency and disclosure in the global social bond market.',
    full_description:
      'The Social Bond Principles are voluntary process guidelines administered by ICMA. ICMA states that they promote integrity in the social bond market through guidelines that recommend transparency, disclosure, and reporting, and they are likewise structured around use of proceeds, process for project evaluation and selection, management of proceeds, and reporting. The official ICMA page presents the principles as updated as of June 2025 and positions them as the core market framework for bonds whose proceeds finance eligible social projects.',
    summary:
      'The main ICMA framework for issuance and reporting of social bonds tied to eligible social projects.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-06-01',
    source_name: 'ICMA',
    source_url:
      'https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/social-bond-principles-sbp/',
    tags: ['icma', 'social bonds', 'bond principles', 'social projects', 'use of proceeds', 'sustainable finance'],
    created_at: '2025-06-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'framework-icma-green-bond-principles',
    umbrella_relation: 'component' as const,
    version_label: 'Social Bond Principles',
  },
  {
    id: 'framework-icma-sustainability-bond-guidelines',
    title: 'ICMA Sustainability Bond Guidelines',
    description:
      'ICMA voluntary guidelines for bonds financing a combination of green and social projects under a single sustainability bond framework.',
    full_description:
      'The Sustainability Bond Guidelines are ICMA-administered voluntary process guidelines for issuers whose bond proceeds finance a combination of green and social projects. ICMA states that they recommend transparency and disclosure and clarify that issuers should communicate how the Green Bond Principles and Social Bond Principles are applied together within a sustainability bond framework. The official page presents the guidelines as updated as of June 2025.',
    summary:
      'ICMA guidelines for bonds that combine eligible green and social use-of-proceeds financing.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-06-01',
    source_name: 'ICMA',
    source_url:
      'https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/sustainability-bond-guidelines-sbg/',
    tags: ['icma', 'sustainability bonds', 'bond guidelines', 'green projects', 'social projects', 'sustainable finance'],
    created_at: '2025-06-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'framework-icma-green-bond-principles',
    umbrella_relation: 'component' as const,
    version_label: 'Sustainability Bond Guidelines',
  },
  {
    id: 'framework-icma-sustainability-linked-bond-principles',
    title: 'ICMA Sustainability-Linked Bond Principles',
    description:
      'ICMA voluntary guidelines for bonds whose financial or structural characteristics vary depending on predefined sustainability performance outcomes.',
    full_description:
      'The Sustainability-Linked Bond Principles are voluntary process guidelines administered by ICMA for instruments that combine sustainability objectives with bond characteristics linked to the issuer’s sustainability performance. ICMA explains that the principles are intended for bonds where the financial and or structural characteristics can vary depending on whether predefined sustainability or ESG objectives are achieved, and that they are built around selection of key performance indicators, calibration of sustainability performance targets, bond characteristics, reporting, and verification. The official page presents the principles as updated as of June 2024.',
    summary:
      'ICMA guidance for bonds linked to KPI and sustainability performance target outcomes.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-06-01',
    source_name: 'ICMA',
    source_url:
      'https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/sustainability-linked-bond-principles-slbp/',
    tags: ['icma', 'sustainability-linked bonds', 'kpi', 'spt', 'bond principles', 'sustainable finance'],
    created_at: '2024-06-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'framework-icma-green-bond-principles',
    umbrella_relation: 'component' as const,
    version_label: 'Sustainability-Linked Bond Principles',
  },
  {
    id: 'guidance-icma-climate-transition-finance-handbook',
    title: 'ICMA Climate Transition Finance Handbook',
    description:
      'ICMA guidance for issuers using sustainable debt instruments to communicate credible climate transition practices, actions, and disclosures.',
    full_description:
      'The Climate Transition Finance Handbook is ICMA guidance for capital markets participants raising funds in debt markets for climate transition-related purposes. ICMA states that the handbook was initially published in December 2020, updated in 2023, and that the 2025 version adds references to the Climate Transition Bond Guidelines plus a new annex on transition plan frameworks, tools, and methodologies. It acts as additional entity-level guidance for issuers using green bonds, sustainability bonds, sustainability-linked bonds, or climate transition bonds in support of a climate transition strategy.',
    summary:
      'ICMA guidance for entity-level climate transition disclosures in sustainable bond financing.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-11-01',
    source_name: 'ICMA',
    source_url:
      'https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/climate-transition-finance-handbook/',
    tags: ['icma', 'climate transition', 'transition finance', 'ctfh', 'sustainable bonds', 'transition plan'],
    created_at: '2025-11-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'framework-icma-green-bond-principles',
    umbrella_relation: 'component' as const,
    version_label: 'Climate Transition Finance Handbook',
  },
  {
    id: 'framework-icma-climate-transition-bond-guidelines',
    title: 'ICMA Climate Transition Bond Guidelines',
    description:
      'ICMA voluntary issuance-level guidance for climate transition bonds and transition-themed sustainability-linked bonds from high-emission issuers.',
    full_description:
      'The Climate Transition Bond Guidelines were published by ICMA in November 2025. ICMA states that they introduce a standalone Climate Transition Bond label designed to help refinance or finance critical projects aligned with the goals of the Paris Agreement, especially for high-emitting sectors or activities. The guidelines supplement the Climate Transition Finance Handbook by providing issuance-level guidance, a definition and safeguards for climate transition projects, a preliminary list of project categories, and recommendations for climate transition-themed sustainability-linked bonds issued by high-emission issuers.',
    summary:
      'ICMA guidance for labelled climate transition bonds and related transition financing structures.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-11-01',
    source_name: 'ICMA',
    source_url:
      'https://www.icmagroup.org/sustainable-finance/the-principles-guidelines-and-handbooks/climate-transition-finance-handbook/',
    tags: ['icma', 'climate transition bond', 'ctbg', 'ctb', 'transition finance', 'sustainable bonds'],
    created_at: '2025-11-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'framework-icma-green-bond-principles',
    umbrella_relation: 'component' as const,
    version_label: 'Climate Transition Bond Guidelines',
  },
  {
    id: 'consortium-sustainable-stock-exchanges-initiative',
    title: 'Sustainable Stock Exchanges Initiative (SSE)',
    description:
      'A UN-supported initiative and exchange network that promotes ESG transparency, guidance, and sustainable investment practices across capital markets.',
    full_description:
      'The Sustainable Stock Exchanges Initiative was launched at United Nations Headquarters in New York on 2 November 2009 to explore how exchanges can work with investors, regulators, and companies to improve ESG transparency and performance and encourage responsible long-term investment. The initiative describes itself as a peer-to-peer learning platform for stock exchanges and operates with support from UN partners and market institutions through guidance, databases, training, and exchange engagement on sustainability topics.',
    summary:
      'A UN-supported stock-exchange initiative for advancing ESG disclosure and sustainable capital markets.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2009-11-02',
    source_name: 'Sustainable Stock Exchanges Initiative',
    source_url: 'https://sseinitiative.org/sse-event/united-nations-launches-sustainable-stock-exchanges-initiative',
    tags: ['sse', 'stock exchanges', 'capital markets', 'esg disclosure', 'sustainable investment', 'un-supported'],
    created_at: '2009-11-02T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'standard-ifc-performance-standards-environmental-social-sustainability',
    title: "IFC Performance Standards on Environmental and Social Sustainability",
    description:
      'A global benchmark standard within the IFC Sustainability Framework for identifying, avoiding, mitigating, and managing environmental and social risks in project-related activities.',
    full_description:
      'The IFC Performance Standards on Environmental and Social Sustainability are part of IFC’s Sustainability Framework and set out client responsibilities for managing environmental and social risks and impacts in project-level activities. The current 2012 Performance Standards are supported by guidance notes and cover issues including risk management, labor and working conditions, resource efficiency and pollution prevention, community health and safety, land acquisition and resettlement, biodiversity, Indigenous Peoples, and cultural heritage. They have become a widely used market reference for project finance and environmental and social due diligence globally.',
    summary:
      'A widely used environmental and social risk-management standard for project finance and due diligence.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2012-01-01',
    source_name: 'International Finance Corporation',
    source_url:
      'https://www.ifc.org/en/insights-reports/2012/ifc-performance-standards',
    tags: ['ifc', 'performance standards', 'environmental and social risk', 'project finance', 'due diligence', 'biodiversity'],
    created_at: '2012-01-01T00:00:00.000Z',
    updated_at: '2021-06-14T00:00:00.000Z',
  },
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
    id: 'guidance-ghg-protocol-scope-2-guidance',
    title: 'GHG Protocol Scope 2 Guidance',
    description:
      'Guidance for accounting and reporting emissions from purchased or acquired electricity, steam, heat, and cooling under the GHG Protocol Corporate Standard.',
    full_description:
      'The GHG Protocol Scope 2 Guidance took effect on 20 January 2015 as the most significant amendment to the Corporate Accounting and Reporting Standard since its inception. It standardizes how organizations measure scope 2 emissions and adds requirements for accounting for energy contracts and instruments, introduces the market-based method and its quality criteria, and strengthens disclosure expectations around energy purchases. It remains a core reference for corporate electricity emissions accounting, even as the guidance is under review following a public consultation completed on 31 January 2026.',
    summary:
      'The core GHG Protocol guidance for electricity-related scope 2 accounting and disclosure.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2015-01-20',
    source_name: 'GHG Protocol',
    source_url:
      'https://ghgprotocol.org/scope-2-guidance',
    tags: ['ghg protocol', 'scope 2', 'electricity', 'market-based method', 'location-based method', 'energy procurement'],
    created_at: '2015-01-20T00:00:00.000Z',
    updated_at: '2026-01-31T00:00:00.000Z',
    umbrella_id: 'standard-ghg-protocol-corporate-accounting-reporting-standard',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'standard-ghg-protocol-product-life-cycle-accounting-reporting-standard',
    title: 'GHG Protocol Product Life Cycle Accounting and Reporting Standard',
    description:
      'A global standard for measuring and reporting greenhouse gas emissions across the full life cycle of products.',
    full_description:
      'The GHG Protocol Product Life Cycle Accounting and Reporting Standard was released internationally in October 2011 to help companies understand full life cycle emissions associated with products. It provides a globally applicable method for quantifying emissions from raw materials, manufacturing, transport, storage, product use, and end-of-life treatment. The standard supports product design improvements, risk reduction, customer-facing environmental information, and more consistent product-level climate accounting.',
    summary:
      'A global standard for product-level life-cycle greenhouse gas accounting and reporting.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2011-10-01',
    source_name: 'GHG Protocol',
    source_url:
      'https://ghgprotocol.org/product-standard',
    tags: ['ghg protocol', 'product standard', 'life cycle', 'product carbon footprint', 'climate accounting'],
    created_at: '2011-10-01T00:00:00.000Z',
    updated_at: '2011-10-01T00:00:00.000Z',
    umbrella_id: 'standard-ghg-protocol-corporate-accounting-reporting-standard',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'consortium-climate-action-100-plus',
    title: 'Climate Action 100+',
    description:
      'A global investor-led engagement initiative focused on the world’s largest corporate greenhouse gas emitters and systemically important companies in the net-zero transition.',
    full_description:
      'Climate Action 100+ was launched on 12 December 2017 as a collaborative investor initiative to ensure the world’s largest corporate greenhouse gas emitters and other systemically important companies take necessary action on climate change. The initiative asks focus companies to strengthen governance, cut emissions across the value chain, and improve climate-related financial disclosure in line with leading frameworks. It functions as a global stewardship consortium rather than a regulation, but it is highly influential in climate engagement practice across capital markets.',
    summary:
      'A major global investor engagement consortium focused on corporate climate action and disclosure.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2017-12-12',
    source_name: 'Climate Action 100+',
    source_url: 'https://www.climateaction100.org/about-us/',
    tags: ['climate action 100+', 'investors', 'engagement', 'net zero', 'stewardship', 'climate disclosure'],
    created_at: '2017-12-12T00:00:00.000Z',
    updated_at: '2017-12-12T00:00:00.000Z',
  },
  {
    id: 'framework-icvcm-core-carbon-principles',
    title: 'ICVCM Core Carbon Principles and Assessment Framework',
    description:
      'A global voluntary benchmark and assessment framework for identifying high-integrity carbon credits in the voluntary carbon market.',
    full_description:
      'The Integrity Council for the Voluntary Carbon Market launched the Core Carbon Principles and Program-level Assessment Framework on 29 March 2023. Together they establish a science-based benchmark for high-integrity carbon credits and the criteria used to assess whether carbon-crediting programs and credit categories meet requirements on governance, transparency, additionality, permanence, quantification, safeguards, and no double counting. The framework is intended to improve trust and comparability in the voluntary carbon market.',
    summary:
      'A global benchmark and assessment framework for high-integrity voluntary carbon credits.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2023-03-29',
    source_name: 'ICVCM',
    source_url: 'https://icvcm.org/integrity-council-launches-global-benchmark-for-high-integrity-carbon-credits/',
    tags: ['icvcm', 'core carbon principles', 'carbon credits', 'voluntary carbon market', 'integrity', 'assessment framework'],
    created_at: '2023-03-29T00:00:00.000Z',
    updated_at: '2023-03-29T00:00:00.000Z',
  },
  {
    id: 'guidance-vcmi-claims-code-of-practice',
    title: 'VCMI Claims Code of Practice',
    description:
      'A voluntary corporate claims code that sets the conditions under which companies can make credible carbon-credit use claims alongside science-aligned decarbonization.',
    full_description:
      'The VCMI Claims Code of Practice is the Voluntary Carbon Markets Integrity Initiative framework for companies seeking to use carbon credits credibly as part of net-zero pathways. VCMI states that the code is ready for use and that it provides requirements, recommendations, and supporting guidance for organizations making Carbon Integrity Claims while continuing science-aligned emissions reductions. VCMI’s official archive lists the current Claims Code version 3.1 dated 18 August 2025, reflecting ongoing refinement since the original November 2023 release.',
    summary:
      'The VCMI framework for credible company claims involving carbon credits and climate leadership.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-08-18',
    source_name: 'VCMI',
    source_url: 'https://vcmintegrity.org/vcmi-claims-code-of-practice/',
    tags: ['vcmi', 'claims code', 'carbon integrity claims', 'carbon credits', 'net zero', 'climate claims'],
    created_at: '2023-11-01T00:00:00.000Z',
    updated_at: '2025-08-18T00:00:00.000Z',
  },
  {
    id: 'guidance-vcmi-scope-3-action-code-of-practice',
    title: 'VCMI Scope 3 Action Code of Practice',
    description:
      'A voluntary best-practice code that guides companies on using high-integrity carbon credits to sustain climate action when scope 3 decarbonization faces barriers.',
    full_description:
      'The VCMI Scope 3 Action Code of Practice was launched on 30 April 2025 as a best-practice framework for companies whose scope 3 emissions reductions face practical barriers but that still need to take annual climate action. VCMI positions the code as a way to close the scope 3 emissions gap by helping companies use high-integrity carbon credits without substituting for value-chain decarbonization. It complements the VCMI Claims Code of Practice by focusing specifically on scope 3 obstacles, progress, and credible communication of supplementary action.',
    summary:
      'A VCMI best-practice code for credible supplementary action on hard-to-abate scope 3 emissions.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-04-30',
    source_name: 'VCMI',
    source_url: 'https://vcmintegrity.org/scope-3-action/',
    tags: ['vcmi', 'scope 3', 'carbon credits', 'value chain emissions', 'climate claims', 'supplementary action'],
    created_at: '2025-04-30T00:00:00.000Z',
    updated_at: '2025-04-30T00:00:00.000Z',
    umbrella_id: 'guidance-vcmi-claims-code-of-practice',
    umbrella_relation: 'part_of' as const,
    version_label: 'Scope 3 Action Code',
  },
  {
    id: 'framework-global-circularity-protocol',
    title: 'Global Circularity Protocol for Business (GCP)',
    description: 'A voluntary global framework that helps organizations measure, manage, target, and communicate circularity performance in a more consistent and comparable way.',
    full_description:
      'The Global Circularity Protocol for Business (GCP) is a voluntary framework developed by the World Business Council for Sustainable Development (WBCSD) in collaboration with the One Planet Network, hosted by UNEP. It is designed to give companies a practical structure for measuring, managing, reporting, and communicating circularity performance across operations and value chains. The framework aims to improve consistency and comparability in how businesses assess material flows, resource efficiency, circular impacts, and progress toward circular business models. It is particularly relevant for companies working on product redesign, waste reduction, reuse and recycling strategies, resource productivity, and circularity target-setting or disclosure.',
    summary:
      'A WBCSD-led voluntary framework for measuring, managing, and communicating business circularity performance.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-11-11',
    source_name: 'WBCSD / One Planet Network',
    source_url: 'https://www.wbcsd.org/resources/a-global-framework-to-measure-manage-and-communicate-business-circularity/',
    tags: ['circularity', 'framework', 'resource efficiency', 'measurement', 'target-setting', 'disclosure'],
    created_at: '2025-11-11T00:00:00.000Z',
    updated_at: '2025-11-11T00:00:00.000Z',
  },
  {
    id: 'guidance-iso-59004-circular-economy-terminology-principles-guidance',
    title: 'ISO 59004 Circular Economy Terminology, Principles and Guidance',
    description:
      'An ISO guidance standard that establishes core circular-economy terminology, principles, and implementation guidance for organizations and value networks.',
    full_description:
      'ISO 59004:2024 provides the conceptual foundation for ISO’s circular economy standards family. ISO states that it defines vocabulary, establishes circular economy principles, and gives guidance for implementation by organizations and interrelated actors in value networks. It is relevant as a baseline reference for companies developing circularity strategies, governance, metrics, procurement approaches, and business-model changes that need a common terminology and principles base.',
    summary:
      'The foundational ISO guidance standard for circular-economy terminology, principles, and implementation.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-05-22',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/80648.html',
    tags: ['iso 59004', 'circular economy', 'terminology', 'principles', 'guidance', 'value networks'],
    created_at: '2024-05-22T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-iso-59010-circular-business-models-value-networks',
    title: 'ISO 59010 Circular Business Models and Value Networks Guidance',
    description:
      'An ISO guidance standard for transitioning business models and collaboration across value networks in support of a circular economy.',
    full_description:
      'ISO 59010:2024 gives organizations guidance on the transition of business models and value networks from linear to circular configurations. ISO positions it as practical guidance for using circular business-model strategies and value-network collaboration to improve resource circulation, retain value for longer, and support circular-economy implementation at organizational and inter-organizational levels.',
    summary:
      'ISO guidance for designing circular business models and organizing collaboration across value networks.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-05-22',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/80649.html',
    tags: ['iso 59010', 'circular economy', 'business models', 'value networks', 'guidance', 'resource circulation'],
    umbrella_id: 'guidance-iso-59004-circular-economy-terminology-principles-guidance',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 59010',
    created_at: '2024-05-22T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'standard-iso-59020-circularity-measurement-assessment',
    title: 'ISO 59020 Measuring and Assessing Circularity Performance',
    description:
      'An ISO standard that sets a framework and requirements for measuring and assessing circularity performance.',
    full_description:
      'ISO 59020:2024 specifies a measurement and assessment framework for circularity performance. ISO states that it includes guidance and requirements for using circularity indicators at the organizational, product, and value-network levels so entities can monitor circular-economy progress more consistently and support target setting, performance management, and disclosure. ISO also shows that a revision project for the standard was registered on 4 March 2026, while the 2024 edition remains the current published standard.',
    summary:
      'The current ISO standard for measuring and assessing circularity performance using circularity indicators.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-05-22',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/80650.html',
    tags: ['iso 59020', 'circularity performance', 'circularity indicators', 'measurement', 'assessment', 'circular economy'],
    umbrella_id: 'guidance-iso-59004-circular-economy-terminology-principles-guidance',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 59020',
    created_at: '2024-05-22T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'standard-iso-59014-secondary-materials-recovery-traceability',
    title: 'ISO 59014 Sustainability and Traceability of the Recovery of Secondary Materials',
    description:
      'An ISO standard that sets principles, requirements, and guidance for sustainable and traceable recovery of secondary materials.',
    full_description:
      'ISO 59014:2024 was published in October 2024 and provides principles, requirements, and guidance for organizations seeking to improve the sustainability and traceability of secondary-material recovery processes. ISO positions the standard within environmental management and circular economy practice, helping organizations manage recovered material flows more consistently while supporting traceability, safe working conditions, and continual improvement across recovery activities.',
    summary:
      'The ISO standard for sustainable, traceable recovery of secondary materials.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-10-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/80694.html',
    tags: ['iso 59014', 'secondary materials', 'traceability', 'recovery', 'circular economy', 'resource recovery'],
    umbrella_id: 'guidance-iso-59004-circular-economy-terminology-principles-guidance',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 59014',
    created_at: '2024-10-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-ifrs-inaugural-jurisdictional-guide',
    title: 'IFRS Inaugural Jurisdictional Guide for the Adoption or Other Use of ISSB Standards',
    description:
      'IFRS Foundation guidance that helps jurisdictions design adoption or other-use approaches for ISSB sustainability disclosure standards.',
    full_description:
      'The IFRS Foundation published the Inaugural Jurisdictional Guide in May 2024 as part of its Regulatory Implementation Programme for ISSB Standards. The guide explains the range of approaches jurisdictions may take when adopting or otherwise using ISSB Standards, identifies the features used to describe those approaches, and is intended to support globally comparable sustainability-related financial disclosures while reducing regulatory fragmentation. It also provides the reference architecture that later IFRS jurisdictional tools and profiles build on.',
    summary:
      'The foundational IFRS Foundation guide for how jurisdictions can adopt or otherwise use ISSB Standards.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-05-01',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/content/dam/ifrs/supporting-implementation/adoption-guide/inaugural-jurisdictional-guide.pdf',
    tags: ['ifrs', 'issb', 'jurisdictional guide', 'adoption', 'implementation', 'sustainability disclosure'],
    created_at: '2024-05-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-ifrs-jurisdictional-roadmap-development-tool',
    title: 'IFRS Jurisdictional Roadmap Development Tool',
    description:
      'IFRS Foundation guidance tool that helps jurisdictions design adoption roadmaps for ISSB sustainability disclosure standards.',
    full_description:
      'The IFRS Foundation launched the Jurisdictional Roadmap Development Tool on 26 March 2025 as part of its Regulatory Implementation Programme for ISSB Standards. The tool translates the concepts in the Inaugural Jurisdictional Guide into a practical application for regulators and implementation partners, helping them make decisions on regulatory process, reporting entities, disclosure requirements, and readiness timelines when adopting or otherwise using IFRS Sustainability Disclosure Standards.',
    summary:
      'An IFRS Foundation tool for planning jurisdictional adoption roadmaps for ISSB Standards.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-03-26',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/news-and-events/news/2025/03/roadmap-development-tool-launched-issb-standards/',
    tags: ['ifrs', 'issb', 'jurisdictional adoption', 'roadmap', 'implementation', 'sustainability disclosure'],
    created_at: '2025-03-26T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'guidance-ifrs-inaugural-jurisdictional-guide',
    umbrella_relation: 'component' as const,
    version_label: 'Roadmap Development Tool',
  },
  {
    id: 'guidance-ifrs-jurisdictional-profiles',
    title: 'IFRS Jurisdictional Profiles',
    description:
      'IFRS Foundation reference profiles describing how jurisdictions have adopted or otherwise use ISSB sustainability disclosure standards.',
    full_description:
      'The IFRS Foundation published its initial set of jurisdictional profiles on 12 June 2025 to provide transparency to capital markets on how jurisdictions approach adoption or other use of ISSB Standards. IFRS states that the profiles describe a jurisdiction’s stated target for alignment with ISSB Standards and the current status of its sustainability-related disclosure requirements, and that they are intended to serve as an official source of reference for investors, preparers, assurance providers, and other stakeholders.',
    summary:
      'An IFRS Foundation reference set showing each jurisdiction’s ISSB adoption approach and status.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-06-12',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/news-and-events/news/2025/06/ifrs-foundation-publishes-jurisdictional-profiles-issb-standards/',
    tags: ['ifrs', 'issb', 'jurisdictional profiles', 'adoption', 'transparency', 'sustainability disclosure'],
    created_at: '2025-06-12T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'guidance-ifrs-inaugural-jurisdictional-guide',
    umbrella_relation: 'component' as const,
    version_label: 'Jurisdictional Profiles',
  },
  {
    id: 'guidance-ifrs-jurisdictional-rationale-guide',
    title: 'IFRS Jurisdictional Rationale Guide and Tool',
    description:
      'IFRS Foundation guidance materials that help jurisdictions assess and articulate the policy rationale for adopting or otherwise using ISSB standards.',
    full_description:
      'The IFRS Foundation published the Jurisdictional Rationale Guide and accompanying tool in October 2025 as part of its ISSB adoption toolkit. The materials are designed to help regulators and other relevant authorities evaluate and communicate why a jurisdiction may choose to adopt or otherwise use ISSB Standards, especially in the context of capital-market development, access to finance, and reducing fragmentation in sustainability-related disclosure requirements.',
    summary:
      'An IFRS Foundation guide and tool for assessing the policy case for jurisdictional use of ISSB Standards.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-10-01',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/ifrs-sustainability-disclosure-standards-around-the-world/jurisdictional-rationale-guide-and-tool/',
    tags: ['ifrs', 'issb', 'jurisdictional rationale', 'adoption', 'implementation', 'capital markets'],
    created_at: '2025-10-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'guidance-ifrs-inaugural-jurisdictional-guide',
    umbrella_relation: 'component' as const,
    version_label: 'Rationale Guide and Tool',
  },
  {
    id: 'guidance-ifrs-jurisdictional-readiness-assessment-guide',
    title: 'IFRS Jurisdictional Readiness Assessment Guide and Tool',
    description:
      'IFRS Foundation guidance materials that help jurisdictions assess market readiness for adopting or otherwise using ISSB sustainability disclosure standards.',
    full_description:
      'The IFRS Foundation added the Jurisdictional Readiness Assessment Guide and associated tool to its ISSB adoption toolkit on 24 February 2026. The materials provide a structured, evidence-based method for assessing ecosystem readiness, entity readiness, and broader support-system readiness so jurisdictions can decide on the pace, scope, and sequencing of sustainability disclosure requirements and identify capacity-building priorities.',
    summary:
      'An IFRS Foundation readiness-assessment guide for jurisdictions preparing to use ISSB Standards.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2026-02-24',
    source_name: 'IFRS Foundation',
    source_url:
      'https://www.ifrs.org/news-and-events/news/2026/02/jurisdictional-readiness-assessment-guide-and-tool/',
    tags: ['ifrs', 'issb', 'readiness assessment', 'jurisdictional adoption', 'implementation', 'capacity building'],
    created_at: '2026-02-24T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'guidance-ifrs-inaugural-jurisdictional-guide',
    umbrella_relation: 'component' as const,
    version_label: 'Readiness Assessment Guide and Tool',
  },
  {
    id: 'framework-undp-sdg-impact-standards-private-equity-funds',
    title: 'UNDP SDG Impact Standards for Private Equity Funds',
    description:
      'A UNDP voluntary framework that helps private equity funds embed impact management and SDG alignment into strategy, operations, reporting, and governance.',
    full_description:
      'The SDG Impact Standards - Private Equity Funds were published by UNDP on 24 April 2024. They set out a voluntary management framework across strategy, management approach, transparency, and governance to help funds define SDG impact intentions, embed impact measurement and management in investment practice, report consistently, and strengthen accountability for impacts on people and planet.',
    summary:
      'A UNDP framework for integrating SDG-aligned impact management into private equity fund practice.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-04-24',
    source_name: 'UNDP Sustainable Finance Hub',
    source_url:
      'https://sdgfinance.undp.org/resource-library/sdg-impact-standards-private-equity-funds',
    tags: ['undp', 'sdg impact standards', 'private equity', 'impact management', 'sdgs', 'governance'],
    created_at: '2024-04-24T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'framework-undp-sdg-impact-standards-bond-issuers',
    title: 'UNDP SDG Impact Standards for Bond Issuers',
    description:
      'A UNDP voluntary framework that helps bond issuers align bond programs, governance, and reporting with SDG-focused impact management.',
    full_description:
      'The SDG Impact Standards for Bond Issuers are UNDP voluntary standards designed to help issuers embed impact management and SDG alignment across bond strategy, management approach, transparency, and governance. UNDP describes them as a framework for building SDG-aligned bond programs that improve discipline around intended impacts, decision-making, and disclosure while reducing the risk of impact-washing. They fit the current app structure as an issuer-focused voluntary framework rather than a regulation.',
    summary:
      'A UNDP framework for SDG-aligned impact management and disclosure by bond issuers.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-01-03',
    source_name: 'UNDP Sustainable Finance Hub',
    source_url:
      'https://sdgfinance.undp.org/resource-library/sdg-impact-standards-bond-issuers',
    tags: ['undp', 'sdg impact standards', 'bond issuers', 'impact management', 'sdgs', 'governance'],
    created_at: '2021-01-03T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-undp-sdg-impact-standards-enterprises',
    title: 'UNDP SDG Impact Standards for Enterprises',
    description:
      'A UNDP voluntary framework that helps enterprises integrate SDG-aligned impact management into strategy, operations, transparency, and governance.',
    full_description:
      'The SDG Impact Standards for Enterprises are UNDP voluntary standards intended to help businesses embed impact considerations in enterprise strategy, management approach, transparency, and governance. UNDP positions the standards as a management framework for enterprises that want to align business decisions with positive contributions to the Sustainable Development Goals while improving impact discipline and accountability. They fit the current app structure as an enterprise-focused voluntary framework rather than a legal requirement.',
    summary:
      'A UNDP framework for enterprise-level SDG impact management and accountability.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-04-14',
    source_name: 'UNDP Sustainable Finance Hub',
    source_url:
      'https://www.undp.org/policy-centre/seoul/news-events/sdg-impact-standards-enterprises-now-available-japanese',
    tags: ['undp', 'sdg impact standards', 'enterprises', 'impact management', 'sdgs', 'governance'],
    created_at: '2021-04-14T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-oecd-undp-impact-standards-financing-sustainable-development',
    title: 'OECD-UNDP Impact Standards for Financing Sustainable Development',
    description:
      'A best-practice framework and self-assessment tool for donors, development finance institutions, and private-sector partners managing development impact.',
    full_description:
      'The OECD-UNDP Impact Standards for Financing Sustainable Development (IS-FSD) were published by the OECD on 21 May 2021 after approval by the OECD Development Assistance Committee in March 2021. OECD describes them as a best practice guide and self-assessment tool that helps donors, development finance institutions, and private-sector partners make financial decisions and manage projects in ways that generate positive sustainable-development impact. The standards are built around four areas: strategy, management approach, transparency, and governance, making them a strong fit for the current app structure as an official voluntary framework rather than a regulation.',
    summary:
      'An OECD-UNDP framework for embedding impact strategy, management, transparency, and governance in sustainable-development finance.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-05-21',
    source_name: 'OECD / UNDP',
    source_url:
      'https://www.oecd.org/en/publications/oecd-undp-impact-standards-for-financing-sustainable-development_744f982e-en.html',
    tags: ['oecd', 'undp', 'is-fsd', 'impact management', 'development finance', 'sdgs'],
    created_at: '2021-05-21T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-giin-iris-plus',
    title: 'IRIS+',
    description:
      'A GIIN impact measurement and management framework that translates impact intentions into measurable results through metrics, guidance, and thematic structures.',
    full_description:
      'IRIS+ was introduced by the Global Impact Investing Network on 16 May 2019 as a free public-good system for impact investors to measure, manage, and optimize impact. Official GIIN materials describe IRIS+ as a set of tools and guidance that translates impact intentions into measurable results, combining a thematic taxonomy, core metric sets, a metrics catalog, and mappings to the Sustainable Development Goals and other major standards. It fits the current app structure as a voluntary global framework for impact measurement and management rather than a regulation.',
    summary:
      'A GIIN framework for standardized impact measurement and management.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-05-16',
    source_name: 'Global Impact Investing Network',
    source_url: 'https://iris.thegiin.org/about/',
    tags: ['giin', 'iris+', 'impact measurement', 'impact management', 'metrics', 'sdgs'],
    created_at: '2019-05-16T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-iso-iwa-48-esg-implementation-principles',
    title: 'ISO IWA 48 ESG Implementation Principles',
    description:
      'An ISO guidance document that gives organizations a high-level structure and principles for implementing and embedding environmental, social, and governance practices.',
    full_description:
      'IWA 48:2024, Environment, social and governance (ESG) Implementation principles, was published by ISO on 14 November 2024 as an International Workshop Agreement. ISO describes it as a high-level structure and set of principles designed to guide organizations in implementing and embedding ESG practices within organizational culture. The document is intended to support ESG performance management and improve the consistency, comparability, and reliability of measurement and reporting under existing frameworks, while remaining complementary to disclosure standards such as IFRS S1, IFRS S2, and ESRS.',
    summary:
      'An ISO ESG implementation guide that helps organizations embed ESG practices and align with existing reporting frameworks.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-11-14',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/89240.html',
    tags: ['iwa 48', 'iso', 'esg implementation', 'esg principles', 'governance', 'reporting interoperability'],
    created_at: '2024-11-14T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'standard-iso-50001-energy-management-systems',
    title: 'ISO 50001 Energy Management Systems',
    description:
      'The ISO standard for establishing, implementing, maintaining, and improving an energy management system to improve energy performance.',
    full_description:
      'ISO 50001:2018 specifies requirements for an energy management system that organizations can use to improve energy performance, including energy efficiency, energy use, and energy consumption. ISO positions the standard as a framework for integrating energy management into business processes through continual improvement, objective setting, data-driven performance review, and operational controls. It is widely used by organizations seeking more structured energy governance, reduced emissions intensity, and stronger energy-related compliance and performance management.',
    summary:
      'The core ISO standard for building and improving an organizational energy management system.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-08-20',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/69426.html',
    tags: ['iso 50001', 'energy management system', 'enms', 'energy efficiency', 'energy performance', 'climate'],
    created_at: '2018-08-20T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'standard-iso-14090-climate-change-adaptation',
    title: 'ISO 14090 Adaptation to Climate Change',
    description:
      'An ISO standard that sets principles, requirements, and guidelines for integrating climate change adaptation into organizations and decision-making.',
    full_description:
      'ISO 14090:2019 specifies principles, requirements, and guidelines for adaptation to climate change. ISO states that it covers integrating adaptation within or across organizations, understanding impacts and uncertainties, and using that information to inform decisions. The standard is applicable to organizations of any size and was published on 24 June 2019; ISO also notes that it was reviewed and confirmed in 2024, so the current edition remains in force.',
    summary:
      'The core ISO standard for embedding climate change adaptation into organizational governance and decision-making.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-06-24',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/68507.html',
    tags: ['iso 14090', 'climate adaptation', 'resilience', 'climate risk', 'governance', 'adaptation planning'],
    created_at: '2019-06-24T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14090',
  },
  {
    id: 'standard-iso-14091-climate-risk-assessment',
    title: 'ISO 14091 Climate Risk Assessment',
    description:
      'An ISO standard that provides guidance on vulnerability, impacts, and risk assessment in the context of climate change adaptation.',
    full_description:
      'ISO 14091:2021 gives guidelines for assessing risks related to the potential impacts of climate change. ISO states that it explains how to understand vulnerability and how to develop and implement sound climate risk assessments for both present and future climate risks, providing a basis for adaptation planning, implementation, monitoring, and evaluation for organizations of any size. The standard was published on 16 February 2021 and remains published while under systematic review.',
    summary:
      'The ISO guidance standard for assessing vulnerability, impacts, and climate-related risks as a basis for adaptation.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-02-16',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/68508.html',
    tags: ['iso 14091', 'climate adaptation', 'vulnerability assessment', 'risk assessment', 'climate impacts', 'resilience'],
    created_at: '2021-02-16T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14091',
  },
  {
    id: 'standard-iso-14097-climate-finance-assessment-reporting',
    title: 'ISO 14097 Climate Finance Assessment and Reporting',
    description:
      'An ISO standard that provides a framework for assessing and reporting investments and financing activities related to climate change.',
    full_description:
      'ISO 14097:2021 specifies a framework, including principles, requirements, and guidance, for assessing, measuring, monitoring, and reporting investments and financing activities in relation to climate change and the transition to a low-carbon economy. ISO states that the framework covers alignment with low-carbon transition pathways, adaptation pathways, and climate goals, the real-economy impact of financing decisions, and climate-related risks to financial asset owners. It was published on 4 May 2021 and applies to financiers such as investors and lenders.',
    summary:
      'The ISO framework for assessing and reporting climate-related investment and financing activity.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-05-04',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/72433.html',
    tags: ['iso 14097', 'climate finance', 'sustainable finance', 'investments', 'financing activities', 'reporting'],
    created_at: '2021-05-04T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14097',
  },
  {
    id: 'guidance-iso-32210-sustainability-principles-financial-sector',
    title: 'ISO 32210 Sustainability Principles for Organizations in the Financial Sector',
    description:
      'An ISO sustainable finance guidance standard for applying overarching sustainability principles, practices, and terminology across financial-sector activities.',
    full_description:
      'ISO 32210:2022 gives guidance on applying overarching sustainability principles, practices, and terminology to financing activities. ISO states that it addresses what is material from the perspective of both the organization and its stakeholders and is applicable to organizations active in the financial sector, including lenders, investors, asset managers, and service providers. The standard was published on 18 October 2022 and is relevant for financial institutions seeking a more structured sustainability governance baseline across sustainable finance activities.',
    summary:
      'An ISO sustainable finance guidance standard for applying sustainability principles across financial-sector organizations.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-10-18',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/77776.html',
    tags: ['iso 32210', 'sustainable finance', 'financial sector', 'governance', 'materiality', 'investors'],
    created_at: '2022-10-18T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-iso-37000-governance-of-organizations',
    title: 'ISO 37000 Governance of Organizations',
    description:
      'An ISO governance guidance standard that sets principles and key practices for governing bodies and governing groups.',
    full_description:
      'ISO 37000:2021 gives guidance on the governance of organizations. ISO states that it provides principles and key aspects of practices to guide governing bodies and governing groups on how to meet their responsibilities so that the organizations they govern can fulfil their purpose, and that it is applicable to all organizations regardless of type, size, location, structure, or purpose. Published in September 2021, it serves as a broad governance reference point for accountability, oversight, decision-making, and stakeholder-oriented organizational direction.',
    summary:
      'The ISO guidance standard for governance principles and practices across all types of organizations.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-09-10',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/65036.html',
    tags: ['iso 37000', 'governance', 'governing body', 'accountability', 'oversight', 'organizational governance'],
    created_at: '2021-09-10T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'standard-iso-37001-anti-bribery-management-systems',
    title: 'ISO 37001 Anti-bribery Management Systems',
    description:
      'An ISO standard that sets requirements and guidance for establishing, implementing, maintaining, and improving an anti-bribery management system.',
    full_description:
      'ISO 37001:2025 specifies requirements and guidance for establishing, implementing, maintaining, reviewing, and improving an anti-bribery management system. ISO states that it is designed to help organizations prevent, detect, and respond to bribery and to comply with anti-bribery laws and voluntary commitments applicable to their activities, covering direct and indirect bribery in public, private, and not-for-profit sectors. The second edition was published on 28 February 2025 and provides a structured governance and control framework for anti-bribery policy, due diligence, controls, reporting, investigation, and continual improvement.',
    summary:
      'The ISO anti-bribery management system standard for prevention, detection, response, and governance controls.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-02-28',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/85816.html',
    tags: ['iso 37001', 'anti-bribery', 'abms', 'compliance', 'ethics', 'governance'],
    created_at: '2025-02-28T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'guidance-iso-37000-governance-of-organizations',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 37001',
  },
  {
    id: 'standard-iso-37301-compliance-management-systems',
    title: 'ISO 37301 Compliance Management Systems',
    description:
      'An ISO standard that sets requirements and guidance for building, evaluating, maintaining, and improving a compliance management system.',
    full_description:
      'ISO 37301:2021 is an international standard for compliance management systems. ISO states that it provides requirements and guidance for establishing, developing, implementing, evaluating, maintaining, and improving an effective and responsive compliance management system within organizations. Published in April 2021, it is relevant for organizations seeking more structured governance of legal, regulatory, and ethical compliance obligations and for embedding a stronger culture of integrity and accountability.',
    summary:
      'The ISO standard for establishing and improving an organizational compliance management system.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-04-13',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/75080.html',
    tags: ['iso 37301', 'compliance management system', 'cms', 'governance', 'ethics', 'regulatory compliance'],
    created_at: '2021-04-13T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
    umbrella_id: 'guidance-iso-37000-governance-of-organizations',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 37301',
  },
  {
    id: 'standard-iso-14068-1-carbon-neutrality',
    title: 'ISO 14068-1 Carbon Neutrality',
    description:
      'An ISO standard that sets principles, requirements, and guidance for achieving and demonstrating carbon neutrality as part of the transition to net zero.',
    full_description:
      'ISO 14068-1:2023 is the first part of ISO 14068 on climate change management and transition to net zero. ISO states that it provides principles, requirements, and guidance for achieving and demonstrating carbon neutrality, with a hierarchy that prioritizes direct and indirect greenhouse gas emission reductions and removal enhancements within the value chain ahead of offsetting. The standard is relevant for organizations that want more rigorous and credible carbon-neutrality claims and governance.',
    summary:
      'The ISO standard for achieving and demonstrating carbon neutrality within a net-zero transition context.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2023-11-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/43279.html',
    tags: ['iso 14068-1', 'carbon neutrality', 'net zero', 'climate change management', 'offsetting', 'ghg'],
    created_at: '2023-11-01T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14068-1',
  },
  {
    id: 'standard-iso-14083-transport-chain-ghg-emissions',
    title: 'ISO 14083 Transport Chain GHG Emissions',
    description:
      'An ISO standard that establishes a common methodology for quantifying and reporting greenhouse gas emissions from passenger and freight transport chains.',
    full_description:
      'ISO 14083:2023 establishes a common methodology for the quantification and reporting of greenhouse gas emissions arising from transport chain operations for passengers and freight. ISO states that it provides requirements and guidance for quantification, assignment, allocation, and reporting across land, water, and air transport, including emissions from transport hubs across the transport chain. It is particularly relevant for logistics, procurement, and value-chain emissions reporting.',
    summary:
      'The ISO methodology for quantifying and reporting greenhouse gas emissions across transport chains.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2023-03-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/78864.html',
    tags: ['iso 14083', 'transport chain', 'ghg emissions', 'logistics', 'freight', 'scope 3'],
    created_at: '2023-03-01T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14083',
  },
  {
    id: 'guidance-iso-20400-sustainable-procurement',
    title: 'ISO 20400 Sustainable Procurement Guidance',
    description:
      'ISO guidance that helps organizations integrate sustainability considerations into procurement policy, process, and supplier relationships.',
    full_description:
      'ISO 20400:2017 provides guidance on sustainable procurement for organizations of all sizes and sectors. ISO describes it as a practical framework for embedding environmental, social, and economic considerations into procurement governance, strategy, sourcing, supplier engagement, and performance review. It is particularly relevant for organizations that want to strengthen responsible purchasing, supply-chain due diligence, lifecycle thinking, and alignment between procurement decisions and broader sustainability objectives.',
    summary:
      'An ISO guidance standard for embedding sustainability into procurement decisions and supplier management.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2017-04-19',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/63026.html',
    tags: ['iso 20400', 'sustainable procurement', 'supplier management', 'due diligence', 'governance', 'supply chain'],
    created_at: '2017-04-19T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'guidance-world-bank-group-ehs-guidelines',
    title: 'World Bank Group Environmental, Health, and Safety Guidelines',
    description:
      'World Bank Group technical reference guidelines that set good international industry practice for environmental, occupational health and safety, and community health and safety performance.',
    full_description:
      'The World Bank Group Environmental, Health, and Safety (EHS) Guidelines are technical reference documents with general and industry-specific examples of Good International Industry Practice. The General EHS Guidelines are dated 30 April 2007 and are meant to be used together with the relevant Industry-Sector EHS Guidelines. IFC states that they specify performance levels and measures generally considered achievable in new facilities using existing technology at reasonable costs, and that they are applied in projects involving World Bank Group institutions as required by the relevant policies and standards. Official World Bank Group materials also note that the EHS Guidelines are currently being updated to reflect more current GIIP.',
    summary:
      'World Bank Group technical ESG guidelines that operationalize Good International Industry Practice across sectors.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2007-04-30',
    source_name: 'International Finance Corporation / World Bank Group',
    source_url: 'https://www.ifc.org/en/insights-reports/general-environmental-health-and-safety-guidelines',
    tags: ['world bank group', 'ifc', 'ehs guidelines', 'giip', 'occupational health and safety', 'community health and safety'],
    created_at: '2007-04-30T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'framework-ifc-performance-standards-environmental-social-sustainability',
    title: 'IFC Sustainability Framework',
    description:
      'The overarching IFC sustainability framework that combines the Sustainability Policy, Performance Standards, and Access to Information Policy.',
    full_description:
      'The IFC Sustainability Framework articulates IFC’s strategic commitment to sustainable development and serves as a core part of its approach to environmental and social risk management. Effective from 1 January 2012, the framework comprises the Policy on Environmental and Social Sustainability, the Performance Standards on Environmental and Social Sustainability, and the Access to Information Policy. IFC has also opened an update process for the framework to reflect evolving environmental and social issues and market practices, but the 2012 framework remains the current baseline.',
    summary:
      'The umbrella IFC framework for sustainability policy, performance standards, and information access.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2012-01-01',
    source_name: 'International Finance Corporation',
    source_url: 'https://www.ifc.org/en/insights-reports/2012/publications-handbook-sustainabilityframework',
    tags: ['ifc', 'sustainability framework', 'performance standards', 'sustainability policy', 'access to information', 'development finance'],
    created_at: '2012-01-01T00:00:00.000Z',
    updated_at: '2026-04-03T00:00:00.000Z',
  },
  {
    id: 'standard-cfa-global-esg-disclosure-standards-investment-products',
    title: 'CFA Institute Global ESG Disclosure Standards for Investment Products',
    description:
      'A global voluntary standard for disclosing how investment products incorporate ESG objectives, investment processes, and stewardship.',
    full_description:
      'CFA Institute released the first edition of the Global ESG Disclosure Standards for Investment Products on 1 November 2021. CFA Institute describes them as the first global voluntary standards for disclosing how investment products consider ESG issues in objectives, investment strategy, and stewardship. The standards are designed to help investors, consultants, advisers, and distributors compare ESG investment products using more complete, reliable, consistent, clear, and accessible disclosures and to reduce greenwashing risk in investment-product marketing.',
    summary:
      'A CFA Institute voluntary disclosure standard for clearer and more comparable ESG investment-product disclosures.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-11-01',
    source_name: 'CFA Institute',
    source_url:
      'https://www.cfainstitute.org/about/press-room/2021/cfa-institute-releases-global-esg-disclosure-standards-for-investment-products',
    tags: ['cfa institute', 'esg disclosure standards', 'investment products', 'greenwashing', 'stewardship', 'voluntary disclosure'],
    created_at: '2021-11-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-ceo-water-mandate-corporate-water-disclosure-guidelines',
    title: 'CEO Water Mandate Corporate Water Disclosure Guidelines',
    description:
      'A water stewardship guidance framework for reporting corporate water management, risks, impacts, and responses in a more harmonized way.',
    full_description:
      'The CEO Water Mandate Corporate Water Disclosure Guidelines were published in 2014 to advance a common approach to business reporting on water-related issues. The CEO Water Mandate describes the guidelines as offering metrics, approaches, and a disclosure framework that help companies communicate water management practices meaningfully to stakeholders while improving convergence and harmonization in corporate water reporting. The guidance is especially relevant for companies seeking more structured reporting on water risks, opportunities, impacts, governance, and basin-level responses.',
    summary:
      'A CEO Water Mandate framework for more consistent corporate water disclosure and water stewardship reporting.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2014-01-01',
    source_name: 'CEO Water Mandate',
    source_url: 'https://ceowatermandate.org/disclosure/',
    tags: ['ceo water mandate', 'water stewardship', 'water disclosure', 'corporate water disclosure', 'water risks', 'nature'],
    created_at: '2014-01-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'guidance-esma-esg-fund-names-guidelines',
    title: 'ESMA Guidelines on Funds\' Names Using ESG or Sustainability-Related Terms',
    description:
      'EU supervisory guidelines requiring funds using ESG or sustainability terms in their names to meet minimum investment thresholds and, for sustainability or impact funds, specific exclusion criteria.',
    full_description:
      'The European Securities and Markets Authority (ESMA) published guidelines on funds\' names using ESG or sustainability-related terms on 14 May 2024 (ESMA34-1592494965-657). The guidelines apply to UCITS, AIFs, EuVECA, EuSEF, ELTIF, money market funds, and their managers. They were applicable to new funds from 21 November 2024 and to all existing funds from 21 May 2025. Key requirements: funds using any ESG or sustainability-related terms in their names must maintain at least 80% of assets in investments aligned with environmental or social characteristics or sustainable investment objectives. Funds using the term "sustainable" or "impact" must additionally apply exclusions consistent with Paris-Aligned Benchmarks (PAB) or Climate Transition Benchmarks (CTB). The guidelines resulted in significant market changes: an estimated 64% of ESG-labelled EU funds changed their names before the May 2025 compliance deadline, with 61% of those removing all ESG terms entirely. ESMA published a review of the guidelines\' market impact in December 2025, noting a substantial industry response.',
    summary:
      'ESMA guidelines requiring EU funds using ESG or sustainability terms in their names to meet 80% alignment thresholds and, for sustainability or impact funds, benchmark exclusion criteria.',
    category: 'Governance',
    region: 'EU',
    status: 'in_force',
    effective_date: '2025-05-21',
    source_name: 'European Securities and Markets Authority (ESMA)',
    source_url: 'https://www.esma.europa.eu/sites/default/files/2024-08/ESMA34-1592494965-657_Guidelines_on_funds_names_using_ESG_or_sustainability_related_terms.pdf',
    tags: ['esma', 'eu', 'fund names', 'esg labels', 'greenwashing', 'ucits', 'aif', 'sustainable finance', 'investment funds'],
    created_at: '2024-11-21T00:00:00.000Z',
    updated_at: '2026-04-05T00:00:00.000Z',
  },
  {
    id: 'ranking-world-benchmarking-alliance-nature-benchmark',
    title: 'World Benchmarking Alliance Nature Benchmark',
    description:
      'A corporate benchmark that assesses how influential companies manage nature-related impacts, dependencies, and transition efforts.',
    full_description:
      'The World Benchmarking Alliance Nature Benchmark assesses 750 companies across high-impact industries on how they protect biodiversity, restore ecosystems, and operate within planetary boundaries. The benchmark evaluates companies across governance, planet, people, and core social indicator dimensions, and World Benchmarking Alliance states that it is intended to track whether large businesses are advancing a nature-positive future in line with broader biodiversity goals. The current benchmark materials published for the 2026 cycle show how companies disclose and act on nature-related impacts, dependencies, risks, opportunities, and transition planning.',
    summary:
      'A WBA benchmark for comparing large-company performance on nature-related governance, impacts, and transition action.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2026-01-01',
    source_name: 'World Benchmarking Alliance',
    source_url: 'https://www.worldbenchmarkingalliance.org/benchmark/nature-benchmark',
    tags: ['world benchmarking alliance', 'nature benchmark', 'biodiversity', 'nature-positive', 'benchmark', 'rankings'],
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-04-04T00:00:00.000Z',
  },
  {
    id: 'consortium-gfanz-glasgow-financial-alliance-net-zero',
    title: 'Glasgow Financial Alliance for Net Zero (GFANZ)',
    description:
      'A global umbrella consortium of sector-specific financial institution net-zero alliances committed to accelerating the decarbonization of the global economy through finance.',
    full_description:
      'The Glasgow Financial Alliance for Net Zero (GFANZ) was launched at COP26 in Glasgow in November 2021, co-chaired by Mark Carney, UN Special Envoy on Climate Action and Finance, and Michael Bloomberg, UN Special Envoy on Climate Ambition and Solutions. GFANZ provides the overarching coordination framework for multiple sector-specific net-zero financial alliances, including the Net-Zero Banking Alliance (NZBA), the Net-Zero Asset Owner Alliance (NZAOA), the Net Zero Asset Managers initiative (NZAM), and others. GFANZ members commit to align their lending, investment, and underwriting portfolios with net-zero greenhouse gas emissions by 2050, with science-aligned interim targets, and to report annually on progress. GFANZ publishes voluntary guidance on transition finance practices, financial institution net-zero transition plan frameworks, and annual progress reports. By 2025, GFANZ encompasses hundreds of financial institutions across banking, insurance, and asset management globally, collectively representing trillions of dollars in assets under management.',
    summary:
      'The global umbrella consortium launched at COP26 for financial institution net-zero alliances, covering banking, insurance, and investment.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-11-03',
    source_name: 'GFANZ',
    source_url: 'https://www.gfanzero.com/',
    tags: ['gfanz', 'net zero', 'financial institutions', 'banking', 'insurance', 'asset management', 'cop26', 'consortium', 'transition finance'],
    created_at: '2021-11-03T00:00:00.000Z',
    updated_at: '2026-04-05T00:00:00.000Z',
  },
  {
    id: 'guidance-sbti-flag-forest-land-agriculture',
    title: 'SBTi Forest, Land, and Agriculture (FLAG) Science-Based Target Setting Guidance',
    description:
      'SBTi sector guidance requiring companies with significant land-based emissions to set separate science-based targets for forest, land, and agriculture activities.',
    full_description:
      'The Science Based Targets initiative Forest, Land, and Agriculture (FLAG) Guidance was published on 14 September 2022. It provides a science-based methodology for companies with significant land-based value chain activities to set emissions reduction and land-related targets separately from their energy and industry targets. FLAG emissions cover Scope 1 and Scope 3 emissions from activities such as crop cultivation, livestock production, land-use change, and deforestation within agricultural supply chains. Under the SBTi Corporate Net-Zero Standard, companies for which FLAG emissions represent 20% or more of their combined FLAG and fossil fuel emissions are required to set a FLAG target in addition to their standard near-term and long-term corporate climate targets. The FLAG guidance aligns with the goal of halting and reversing deforestation and land degradation by 2030, consistent with the Glasgow Leaders\' Declaration on Forests and Land Use and the targets of the Kunming-Montreal Global Biodiversity Framework adopted at COP15 in December 2022.',
    summary:
      'SBTi mandatory sector guidance for companies with significant agricultural or land-use emissions to set science-based targets separately for forests, land, and agriculture.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-09-14',
    source_name: 'Science Based Targets initiative',
    source_url: 'https://sciencebasedtargets.org/sectors/forest-land-and-agriculture',
    tags: ['sbti', 'flag', 'forest', 'land', 'agriculture', 'nature', 'science-based targets', 'deforestation', 'land use', 'biodiversity'],
    created_at: '2022-09-14T00:00:00.000Z',
    updated_at: '2026-04-05T00:00:00.000Z',
    umbrella_id: 'standard-sbti-corporate-net-zero-standard',
    umbrella_relation: 'part_of' as const,
    version_label: 'FLAG Sector Guidance',
  },
  {
    id: 'regulation-eu-european-green-bond-standard',
    title: 'EU European Green Bond Standard (EuGBS)',
    description:
      'An EU voluntary labelling standard for European Green Bonds (EuGB) that requires proceeds to be fully aligned with the EU Taxonomy and subject to verification by an ESMA-registered external reviewer.',
    full_description:
      'Regulation (EU) 2023/2631 on European Green Bonds and optional disclosures for bonds marketed as environmentally sustainable and for sustainability-linked bonds was published in the Official Journal on 30 November 2023 and entered into force on 20 December 2023. It applies from 21 December 2024. The regulation creates a voluntary European Green Bond (EuGB) label available to any issuer who chooses to use it, conditional on full allocation of net proceeds to economic activities aligned with the EU Taxonomy, publication of a pre-issuance factsheet, annual allocation reports, and a post-full-allocation impact report. Verification of the EuGB factsheet and allocation report must be carried out by an external reviewer registered with the European Securities and Markets Authority (ESMA). The regulation also establishes optional disclosure templates for issuers who market bonds in the EU as environmentally sustainable or as sustainability-linked without using the EuGB label, bringing greater transparency to the broader European green and sustainable bond market.',
    summary:
      'The EU regulatory framework for the voluntary European Green Bond label, requiring full EU Taxonomy alignment and ESMA-registered external review.',
    category: 'Climate',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-12-21',
    source_name: 'European Commission / EUR-Lex',
    source_url:
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2631',
    tags: ['eugbs', 'european green bond', 'green bonds', 'eu taxonomy', 'esma', 'sustainable finance', 'external reviewer'],
    created_at: '2024-12-21T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
  },
  {
    id: 'regulation-india-sebi-brsr-framework',
    title: 'India SEBI Business Responsibility and Sustainability Reporting (BRSR) Framework',
    description:
      'A mandatory SEBI framework requiring large listed companies in India to report sustainability disclosures across environmental, social, and governance topics aligned with national responsible business guidelines.',
    full_description:
      'The Securities and Exchange Board of India (SEBI) introduced the Business Responsibility and Sustainability Reporting (BRSR) framework through Circular SEBI/HO/CFD/CMD-2/P/CIR/2021/562 on 10 May 2021, replacing the earlier Business Responsibility Report that was introduced under the National Voluntary Guidelines. BRSR became mandatory for the top 1,000 listed companies by market capitalization from FY2022-23 as part of the annual report. The framework is structured around nine principles of India\'s National Guidelines on Responsible Business Conduct (NGRBC) and requires detailed quantitative and qualitative disclosures on environmental, social, and governance performance, including Scope 1 and Scope 2 greenhouse gas emissions, energy consumption, water usage, waste management, employee well-being, and supply chain disclosures. SEBI introduced BRSR Core in 2023, creating a focused set of key performance indicators subject to mandatory third-party assurance — applicable to the top 150 companies from FY2023-24, expanding to the top 250 from FY2024-25 and the top 500 from FY2025-26. BRSR Core metrics include GHG emissions intensity, energy intensity, water intensity, waste recovery, gender pay gaps, and plant-level disclosures, making India\'s BRSR regime one of the more granular mandatory ESG reporting frameworks globally for listed companies.',
    summary:
      'India\'s mandatory SEBI sustainability reporting framework for listed companies, including BRSR Core with third-party assurance requirements.',
    category: 'Governance',
    region: 'India',
    status: 'in_force',
    effective_date: '2023-04-01',
    source_name: 'SEBI',
    source_url:
      'https://www.sebi.gov.in/legal/circulars/may-2021/business-responsibility-and-sustainability-report_50096.html',
    tags: ['brsr', 'sebi', 'india', 'sustainability reporting', 'ngrbc', 'mandatory disclosure', 'listed companies', 'brsr core'],
    created_at: '2021-05-10T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
  },
  {
    id: 'standard-gri-11-oil-gas-2021',
    title: 'GRI 11: Oil and Gas 2021',
    description:
      'A GRI Sector Standard that identifies the sustainability topics most likely to be material for organizations in the oil and gas sector.',
    full_description:
      'GRI 11: Oil and Gas 2021 is the first GRI Sector Standard published by the Global Sustainability Standards Board. Published in August 2021 and effective for reports or other materials published on or after 1 January 2023, it identifies 24 sector-specific topics most likely to be material for organizations across the upstream, midstream, and downstream oil and gas sector. These topics include greenhouse gas emissions, asset integrity and critical incident management, climate adaptation and energy transition, biodiversity, water and effluents, local communities, labor rights, occupational health and safety, and corruption. Organizations in the oil and gas sector that apply GRI Standards and claim to report in accordance with them must apply GRI 11 when it is effective. The standard references the relevant GRI Universal and Topic Standards for each material topic and includes additional sector-specific disclosure requirements that go beyond the generic GRI requirements.',
    summary:
      'The GRI Sector Standard for the oil and gas industry, identifying 24 material sustainability topics effective from 1 January 2023.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2023-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/standards-development/sector-standard-for-oil-and-gas/',
    tags: ['gri', 'gri 11', 'oil and gas', 'sector standard', 'material topics', 'climate transition', 'asset integrity'],
    created_at: '2021-08-01T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Sector Standard',
  },
  {
    id: 'standard-gri-12-coal-2022',
    title: 'GRI 12: Coal 2022',
    description:
      'A GRI Sector Standard that identifies the sustainability topics most likely to be material for organizations in the coal sector.',
    full_description:
      'GRI 12: Coal 2022 is a GRI Sector Standard published by the Global Sustainability Standards Board in January 2022 and effective for reports or other materials published on or after 1 January 2024. It identifies sector-specific topics most likely to be material for organizations across the thermal and metallurgical coal value chain, including greenhouse gas emissions, climate adaptation and energy transition, mine rehabilitation and closure, local communities, forced and child labor, occupational health and safety, and water and effluents. Organizations in the coal sector that apply GRI Standards and report in accordance with them must apply GRI 12 when it is effective. The standard reflects increasing investor and regulatory scrutiny of coal-related climate and transition risks and incorporates additional sector-specific disclosure requirements beyond those in the GRI Universal and Topic Standards.',
    summary:
      'The GRI Sector Standard for the coal industry, identifying material sustainability topics effective from 1 January 2024.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/standards-development/sector-standard-for-coal/',
    tags: ['gri', 'gri 12', 'coal', 'sector standard', 'material topics', 'climate transition', 'mine closure'],
    created_at: '2022-01-01T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Sector Standard',
  },
  {
    id: 'standard-gri-13-agriculture-aquaculture-fishing-2022',
    title: 'GRI 13: Agriculture, Aquaculture and Fishing 2022',
    description:
      'A GRI Sector Standard that identifies sustainability topics most likely to be material for organizations in the agriculture, aquaculture, and fishing sector.',
    full_description:
      'GRI 13: Agriculture, Aquaculture and Fishing 2022 is a GRI Sector Standard published by the Global Sustainability Standards Board in April 2022 and effective for reports or other materials published on or after 1 January 2024. It identifies sector-specific topics most likely to be material for organizations across food production, including biodiversity, land use, water and effluents, food security, forced and child labor, occupational health and safety, local communities, greenhouse gas emissions, and climate adaptation. Organizations in the agriculture, aquaculture, and fishing sector that apply GRI Standards and report in accordance with them must apply GRI 13 when it is effective. The standard connects with other GRI Topic Standards including GRI 101: Biodiversity 2024 and GRI 103: Energy 2025, and recognizes the broad environmental and social footprint of the global food production sector.',
    summary:
      'The GRI Sector Standard for agriculture, aquaculture, and fishing, identifying material sustainability topics effective from 1 January 2024.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2024-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/standards-development/sector-standard-for-agriculture-aquaculture-and-fishing/',
    tags: ['gri', 'gri 13', 'agriculture', 'aquaculture', 'fishing', 'sector standard', 'biodiversity', 'food security'],
    created_at: '2022-04-01T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Sector Standard',
  },
  {
    id: 'guidance-iosco-sustainability-climate-disclosure-recommendations',
    title: 'IOSCO Recommendations on Sustainability and Climate-Related Disclosures',
    description:
      'IOSCO policy recommendations for securities regulators and standard setters to establish a comprehensive global baseline for sustainability and climate-related issuer disclosures.',
    full_description:
      'The International Organization of Securities Commissions (IOSCO) Board published its report and recommendations on sustainability and climate-related disclosures on 2 November 2021. The Board found that the quality, consistency, and comparability of sustainability information was insufficient for investor and capital market needs and issued five recommendations to address this. IOSCO recommended that sustainability standards developed around the Task Force on Climate-related Financial Disclosures recommendations should form the global disclosure baseline, covering governance, strategy, risk management, and metrics and targets. The report endorsed the IFRS Foundation as the appropriate body to develop and maintain such standards and was a direct catalyst for the establishment of the International Sustainability Standards Board in November 2021. IOSCO subsequently endorsed IFRS S1 and IFRS S2 in July 2023, calling on its member jurisdictions to consider how they might adopt, apply, or otherwise be informed by the standards.',
    summary:
      'The IOSCO recommendations that catalysed the creation of the ISSB and called for a global sustainability disclosure baseline built on TCFD.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-11-02',
    source_name: 'IOSCO',
    source_url:
      'https://www.iosco.org/library/pubdocs/pdf/IOSCOPD690.pdf',
    tags: ['iosco', 'sustainability disclosure', 'climate disclosure', 'issb', 'tcfd', 'global baseline', 'capital markets', 'securities regulation'],
    created_at: '2021-11-02T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
  },
  {
    id: 'guidance-bcbs-climate-risk-management-supervisory-principles',
    title: 'Basel Committee Principles for the Effective Management and Supervision of Climate-Related Financial Risks',
    description:
      'Basel Committee principles for banks and supervisors on identifying, measuring, monitoring, and managing physical and transition climate risks within existing risk and governance frameworks.',
    full_description:
      'The Basel Committee on Banking Supervision (BCBS) published its Principles for the Effective Management and Supervision of Climate-Related Financial Risks on 15 June 2022. The document sets out 18 principles for banks and 4 additional principles for supervisors. The bank principles cover: governance (board and management responsibilities), internal control, capital and liquidity adequacy, credit risk, market risk, liquidity risk, operational risk, and climate scenario analysis and stress testing. The supervisory principles cover: supervisory review and evaluation, supervisory expectations, cross-border coordination, and climate disclosure. The principles are non-binding guidance rather than binding minimum capital standards and are intended to promote a consistent baseline of supervisory expectations and risk-management practices across the global banking system. The BCBS noted that climate-related financial risks have unique characteristics, including long time horizons, high uncertainty, and non-linearity, that make them challenging to integrate into existing frameworks, and the principles provide conceptual guidance for how banks and supervisors should approach these challenges.',
    summary:
      'The Basel Committee\'s 18+4 principles for integrating climate-related financial risk into bank governance, risk management, and supervisory frameworks.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-06-15',
    source_name: 'Basel Committee on Banking Supervision',
    source_url:
      'https://www.bis.org/bcbs/publ/d532.htm',
    tags: ['bcbs', 'basel committee', 'climate risk', 'banks', 'financial risk', 'governance', 'risk management', 'supervisory principles'],
    created_at: '2022-06-15T00:00:00.000Z',
    updated_at: '2026-04-06T00:00:00.000Z',
  },
  {
    id: 'regulation-eu-forced-labour',
    title: 'EU Forced Labour Regulation',
    description:
      'EU regulation prohibiting the placing or making available on the EU market, and the export from the EU, of products made using forced labour in any part of their supply chain.',
    full_description:
      'Regulation (EU) 2024/3015 of the European Parliament and of the Council of 27 November 2024 on prohibiting products made with forced labour on the Union market was published on 12 December 2024 and entered into force on 17 December 2024. It applies from 14 December 2027, giving economic operators three years to comply. The regulation establishes a prohibition on placing, making available, or exporting from the EU any products — whether made in the EU or imported — where forced labour was used in their production, manufacturing, harvesting, or extraction, including products made using child labour qualifying as forced labour under ILO Conventions. The European Commission will maintain a single database of forced-labour risks by geographic area and sector to guide investigations. Enforcement is risk-based: national competent authorities investigate suspected violations, may order withdrawal and disposal of prohibited products, and impose dissuasive penalties. The regulation is complementary to and does not replace the CSDDD due diligence framework. Unlike CSDDD, it targets product flows rather than corporate conduct, enabling action against any operator regardless of size.',
    summary:
      'EU regulation banning products made with forced labour from the EU market, applying from December 2027.',
    category: 'Social',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-12-17',
    source_name: 'European Commission / EUR-Lex',
    source_url:
      'https://eur-lex.europa.eu/eli/reg/2024/3015/oj',
    tags: ['eu', 'forced labour', 'supply chain', 'human rights', 'due diligence', 'social', 'product ban', 'ilo'],
    created_at: '2024-12-17T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'standard-canada-cssb-csds1-general-requirements',
    title: 'Canadian Sustainability Disclosure Standard 1 — General Requirements (CSDS 1)',
    description:
      'The Canadian equivalent of IFRS S1, setting general requirements for disclosing sustainability-related risks and opportunities that could reasonably be expected to affect a Canadian entity\'s prospects.',
    full_description:
      'CSDS 1 — General Requirements for Disclosure of Sustainability-related Financial Information was issued by the Canadian Sustainability Standards Board (CSSB) in October 2024. The standard is substantively based on IFRS S1 with targeted Canadian modifications, including a phased implementation pathway and clarifications for entities in the Canadian reporting environment. CSDS 1 requires entities to disclose material information about sustainability-related risks and opportunities across governance, strategy, risk management, and metrics and targets in the same reporting package as their financial statements. It establishes connectivity and comparability principles and allows entities to use ISSB standards, SASB Standards, and the TCFD framework as sources of guidance to identify material sustainability-related topics. Mandatory adoption by publicly accountable enterprises is being progressed by the Canadian Securities Administrators (CSA) and by OSFI for federally regulated financial institutions, following a phased timeline coordinated with the CSA consultation process.',
    summary:
      'The Canadian ISSB-aligned general sustainability disclosure standard, published by CSSB in October 2024.',
    category: 'Governance',
    region: 'Canada',
    status: 'in_force',
    effective_date: '2024-10-01',
    source_name: 'Canadian Sustainability Standards Board (CSSB) / FRAS Canada',
    source_url:
      'https://www.frascanada.ca/en/cssb/standards',
    tags: ['cssb', 'csds 1', 'canada', 'sustainability disclosure', 'issb', 'general requirements', 'ifrs s1'],
    created_at: '2024-10-01T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'standard-canada-cssb-csds2-climate-disclosures',
    title: 'Canadian Sustainability Disclosure Standard 2 — Climate-related Disclosures (CSDS 2)',
    description:
      'The Canadian equivalent of IFRS S2, requiring disclosure of climate-related risks, opportunities, and Scope 1, 2, and 3 greenhouse gas emissions for Canadian reporting entities.',
    full_description:
      'CSDS 2 — Climate-related Disclosures was issued by the Canadian Sustainability Standards Board (CSSB) in October 2024. The standard is substantively based on IFRS S2 with targeted Canadian modifications, including a phased approach to Scope 3 disclosures and clarifications on cross-industry metric categories. CSDS 2 requires entities to disclose climate-related governance, strategy (including climate scenario analysis and climate resilience assessment), risk management integration, and metrics including absolute gross Scope 1, Scope 2, and Scope 3 GHG emissions. The standard retains the IFRS S2 cross-industry metric categories covering GHG emissions, climate-related transition risks, climate-related physical risks, capital deployment toward climate risks and opportunities, and internal carbon prices. Transition reliefs allow eligible entities additional time for Scope 3 disclosure and comparative information. CSSB coordinated closely with ISSB to maintain interoperability, so entities reporting under CSDS 2 simultaneously satisfy IFRS S2 requirements.',
    summary:
      'The Canadian ISSB-aligned climate disclosure standard, published by CSSB in October 2024, covering Scope 1–3 emissions and climate scenario analysis.',
    category: 'Climate',
    region: 'Canada',
    status: 'in_force',
    effective_date: '2024-10-01',
    source_name: 'Canadian Sustainability Standards Board (CSSB) / FRAS Canada',
    source_url:
      'https://www.frascanada.ca/en/cssb/standards',
    tags: ['cssb', 'csds 2', 'canada', 'climate disclosure', 'issb', 'ghg emissions', 'scope 3', 'ifrs s2', 'scenario analysis'],
    created_at: '2024-10-01T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
    umbrella_id: 'standard-canada-cssb-csds1-general-requirements',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'regulation-eu-nature-restoration-law',
    title: 'EU Nature Restoration Law',
    description:
      'The first EU regulation setting legally binding nature restoration targets, requiring member states to restore at least 20% of land and sea areas by 2030, rising to 90% of degraded ecosystems by 2050.',
    full_description:
      'Regulation (EU) 2024/1991 on nature restoration was published in the Official Journal on 29 July 2024 and entered into force on 18 August 2024. It sets legally binding national restoration targets across a broad range of terrestrial, freshwater, coastal, and marine ecosystems. Core obligations include restoring at least 20% of EU land and 20% of EU sea areas in need of restoration by 2030, at least 30% by 2039, and at least 90% by 2050 for all degraded ecosystems. The regulation also establishes specific targets for urban greening, reversal of pollinator decline, restoration of drained peatlands, and improved connectivity of rivers. Member states must adopt national restoration plans and report progress to the European Commission. The regulation is directly relevant to companies subject to ESRS E4 biodiversity disclosures under CSRD and to TNFD disclosures on nature-related impacts.',
    summary:
      'The first EU legally binding regulation on nature restoration, setting 30% by 2039 and 90% by 2050 ecosystem restoration targets.',
    category: 'Nature',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-08-18',
    source_name: 'European Commission / EUR-Lex',
    source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1991/oj',
    tags: ['nature restoration', 'nrl', 'eu', 'biodiversity', 'ecosystem restoration', '30x30', 'habitats', 'esrs e4'],
    created_at: '2024-08-18T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'regulation-eu-ecodesign-sustainable-products',
    title: 'EU Ecodesign for Sustainable Products Regulation (ESPR)',
    description:
      'An EU regulation extending ecodesign requirements to nearly all physical products and introducing the Digital Product Passport to improve product sustainability across the full lifecycle.',
    full_description:
      'Regulation (EU) 2024/1781 (Ecodesign for Sustainable Products Regulation, ESPR) was published in the Official Journal on 28 June 2024 and entered into force on 18 July 2024. It replaces Directive 2009/125/EC (Ecodesign Directive) and dramatically expands the scope from energy-related products to almost all physical goods placed on the EU market. The ESPR enables the European Commission to set mandatory ecodesign performance and information requirements for products covering durability, reliability, reusability, upgradability, repairability, maintenance, remanufacturing and recycling, recycled content, carbon footprint, and environmental footprint. A central feature is the Digital Product Passport (DPP), which will allow supply chain actors and consumers to access standardised product sustainability information. Delegated acts specifying requirements for priority product groups (textiles, furniture, iron, steel, aluminium, chemicals, tyres, detergents, paints, lubricants, and electronics) are being developed. The regulation is linked to the EU Circular Economy Action Plan and informs ESRS E5 circularity disclosures.',
    summary:
      'The core EU regulation for product sustainability design and the Digital Product Passport, covering nearly all physical goods.',
    category: 'Circularity',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-07-18',
    source_name: 'European Commission / EUR-Lex',
    source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1781/oj',
    tags: ['espr', 'ecodesign', 'digital product passport', 'dpp', 'circularity', 'eu', 'sustainable products', 'product lifecycle'],
    created_at: '2024-07-18T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'regulation-eu-batteries-regulation',
    title: 'EU Batteries Regulation',
    description:
      'An EU regulation covering the full lifecycle of batteries, including carbon footprint declarations, supply chain due diligence, recycled content targets, and the Battery Passport.',
    full_description:
      'Regulation (EU) 2023/1542 was published in the Official Journal on 28 July 2023 and entered into force on 17 August 2023. It applies to all battery types placed on the EU market and covers the entire lifecycle from design and production to collection, recycling, and end-of-life management. Key ESG obligations include: mandatory carbon footprint declarations and performance classes for electric vehicle (EV) batteries, light means of transport (LMT) batteries, and industrial batteries (phased in from 2025–2027 per battery type); minimum recycled content targets for lithium, cobalt, lead, and nickel (phased in from 2030–2035); supply chain due diligence covering lithium, cobalt, nickel, natural graphite, and copper in batteries with active mass above 2kWh (effective from 2025); and the Battery Passport for EV and industrial batteries (required from 2027), providing a digital record of performance, composition, provenance, and end-of-life data. The regulation supports ESRS E5 circularity disclosures and CSDDD due diligence requirements for raw material supply chains.',
    summary:
      'The lifecycle EU regulatory framework for batteries, covering carbon footprint, due diligence, recycled content, and the Battery Passport.',
    category: 'Circularity',
    region: 'EU',
    status: 'in_force',
    effective_date: '2023-08-17',
    source_name: 'European Commission / EUR-Lex',
    source_url: 'https://eur-lex.europa.eu/eli/reg/2023/1542/oj',
    tags: ['eu batteries', 'battery passport', 'carbon footprint', 'supply chain due diligence', 'recycled content', 'circularity', 'eu', 'ev batteries'],
    created_at: '2023-08-17T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'regulation-eu-critical-raw-materials-act',
    title: 'EU Critical Raw Materials Act (CRMA)',
    description:
      'An EU regulation to ensure access to a secure and sustainable supply of critical and strategic raw materials through diversification targets, strategic projects, and circularity measures.',
    full_description:
      'Regulation (EU) 2024/1252 (Critical Raw Materials Act, CRMA) was published in the Official Journal on 3 May 2024 and entered into force on 23 May 2024. It establishes a list of Strategic Raw Materials (SRM, 17 materials essential to the clean energy transition and defence) and Critical Raw Materials (CRM, 34 materials with high supply-risk). The CRMA sets binding supply-chain diversification targets for 2030: the EU must extract at least 10%, process at least 40%, and recycle at least 15% of its annual consumption of each strategic raw material within the EU. No single third country should supply more than 65% of the EU\'s annual consumption of any strategic raw material. A pipeline of Strategic Projects to secure supply chains will receive streamlined permitting and financial support. Member states must submit national programmes for sustainable exploration and develop circular economy measures. The CRMA is linked to CSDDD due diligence obligations, the EU Batteries Regulation, and ESPR.',
    summary:
      'The EU regulation securing strategic and critical raw material supply chains through capacity targets, strategic projects, and diversification rules.',
    category: 'Governance',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-05-23',
    source_name: 'European Commission / EUR-Lex',
    source_url: 'https://eur-lex.europa.eu/eli/reg/2024/1252/oj',
    tags: ['crma', 'critical raw materials', 'strategic raw materials', 'supply chain', 'eu', 'circularity', 'mining', 'decarbonisation'],
    created_at: '2024-05-23T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'policy-kunming-montreal-global-biodiversity-framework',
    title: 'Kunming-Montreal Global Biodiversity Framework (GBF)',
    description:
      'A landmark international biodiversity policy framework adopted at COP15 under the Convention on Biological Diversity, setting 23 targets for 2030 including the 30x30 target and mandatory business biodiversity disclosure.',
    full_description:
      'The Kunming-Montreal Global Biodiversity Framework was adopted on 19 December 2022 at the resumed COP15 session in Montreal under the Convention on Biological Diversity (CBD). It contains four long-term goals for 2050 (halt and reverse biodiversity loss, sustainable use of nature, equitable benefit-sharing, and adequate implementation means) and 23 action targets for 2030. Target 3 (30x30) requires effective conservation and management of at least 30% of land, inland waters, coastal areas, and oceans by 2030. Target 2 requires restoration of at least 30% of degraded terrestrial, inland water, coastal, and marine ecosystems. Target 15 requires businesses and financial institutions to regularly assess, monitor, and disclose their biodiversity-related risks, dependencies, and impacts, and reduce negative impacts across value chains. The GBF directly informs the TNFD disclosure framework, SBTN science-based targets for nature, ESRS E4 biodiversity disclosures under CSRD, and emerging nature-related regulatory expectations globally. The 2022 Kunming-Montreal GBF succeeds the 2010 Aichi Biodiversity Targets.',
    summary:
      'The landmark 2022 global biodiversity policy framework with 30x30 and restoration targets and mandatory business nature disclosure (Target 15).',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-12-19',
    source_name: 'Convention on Biological Diversity (CBD)',
    source_url: 'https://www.cbd.int/gbf',
    tags: ['kunming-montreal', 'gbf', 'global biodiversity framework', 'cop15', 'cbd', '30x30', 'nature', 'target 15', 'business disclosure'],
    created_at: '2022-12-19T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'standard-iso-14064-3-ghg-validation-verification',
    title: 'ISO 14064-3 Greenhouse Gas Validation and Verification',
    description:
      'An ISO standard specifying principles and requirements for verifying and validating greenhouse gas assertions at organizational, project, and product level.',
    full_description:
      'ISO 14064-3:2019 specifies principles, requirements, and guidance for verifying and validating greenhouse gas (GHG) assertions. Published on 25 November 2019, it is the third part of the ISO 14064 GHG standards series, covering assurance processes for organizational GHG inventories (ISO 14064-1), GHG project quantification (ISO 14064-2), and product carbon footprints (ISO 14067). The standard addresses the qualifications of the verification and validation body, process requirements, selection of a materiality threshold, the nature of the engagement and evidence gathering, and the content of the verification or validation statement. It supports an expanding range of mandatory and voluntary GHG disclosure regimes requiring third-party assurance, including CSRD, ISSA 5000, and the EU Batteries Regulation carbon footprint verification requirements.',
    summary:
      'The ISO standard for verifying and validating GHG assertions at organization, project, and product level.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-11-25',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/66455.html',
    tags: ['iso 14064-3', 'ghg verification', 'ghg validation', 'greenhouse gases', 'assurance', 'climate', 'third-party verification'],
    created_at: '2019-11-25T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
    umbrella_id: 'standard-iso-14064-1-ghg-inventories',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14064-3',
  },
  {
    id: 'standard-iso-14065-ghg-validation-verification-bodies',
    title: 'ISO 14065 Requirements for GHG Validation and Verification Bodies',
    description:
      'An ISO standard setting general principles and requirements for competence, impartiality, and operation of bodies that validate and verify environmental information including greenhouse gas assertions.',
    full_description:
      'ISO 14065:2020 specifies general principles and requirements for bodies that validate and verify environmental information including GHG assertions under the ISO 14060 series. Published in February 2020, it defines requirements on organizational structure, independence and impartiality, competence of personnel, and management system for validation and verification bodies. It provides the framework against which national accreditation bodies assess organizations seeking to offer GHG verification and validation services. ISO 14065:2020 is a companion standard to ISO 14064-3 and supports the consistent, credible operation of the third-party assurance market for sustainability disclosures, including assurance mandated by CSRD, the EU Batteries Regulation, and voluntary schemes such as CDP.',
    summary:
      'The ISO accreditation standard for bodies performing GHG validation and verification under the ISO 14060 series.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2020-02-21',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/72987.html',
    tags: ['iso 14065', 'ghg verification bodies', 'accreditation', 'validation', 'verification', 'environmental information', 'assurance'],
    created_at: '2020-02-21T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'regulation-eu-empowering-consumers-green-transition',
    title: "EU Directive on Empowering Consumers for the Green Transition",
    description:
      'An EU directive amending consumer protection rules to prohibit unsubstantiated environmental claims, misleading sustainability labels, and practices that contribute to premature product obsolescence.',
    full_description:
      'Directive (EU) 2024/825 of the European Parliament and of the Council on empowering consumers for the green transition was published in the Official Journal on 6 March 2024 and entered into force on 26 March 2024. Member states must transpose it into national law by 27 March 2026. The directive amends the Consumer Rights Directive (2011/83/EU) and the Unfair Commercial Practices Directive (2005/29/EC) to add new prohibited business practices. These include: making unsubstantiated generic environmental claims (e.g. "eco-friendly", "natural", "biodegradable") without verified evidence; claiming climate neutrality based on offsetting schemes rather than actual emissions reductions; making environmental claims about the overall company when only one product is concerned; and displaying sustainability labels not based on approved or government-established certification schemes. The directive also requires pre-purchase disclosure of product durability and the availability of software updates, and prohibits designed-in premature obsolescence. The directive complements the proposed EU Green Claims Directive (which is still in legislative process and sets verification rules for substantiated specific green claims) and the EU taxonomy alignment requirements for green finance.',
    summary:
      'The EU consumer protection directive prohibiting unsubstantiated green claims, misleading sustainability labels, and planned obsolescence practices.',
    category: 'Governance',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-03-26',
    source_name: 'European Commission / EUR-Lex',
    source_url: 'https://eur-lex.europa.eu/eli/dir/2024/825/oj',
    tags: ['greenwashing', 'green claims', 'consumers', 'sustainability labels', 'eu', 'consumer protection', 'planned obsolescence', 'unfair commercial practices'],
    created_at: '2024-03-26T00:00:00.000Z',
    updated_at: '2026-04-07T00:00:00.000Z',
  },
  {
    id: 'standard-gri-14-mining-2023',
    title: 'GRI 14: Mining Sector 2023',
    description:
      'A GRI Sector Standard that identifies the sustainability topics most likely to be material for organizations in the mining sector.',
    full_description:
      'GRI 14: Mining Sector 2023 is a GRI Sector Standard published by the Global Sustainability Standards Board on 13 October 2023 and effective for reports or other materials published on or after 1 January 2025. It identifies 22 sector-specific material topics for organizations across the mining sector, including mines and local communities, land rights, biodiversity, mine closure, artisanal and small-scale mining, occupational health and safety, forced and child labor, greenhouse gas emissions, water and effluents, and business integrity. Organizations in the mining sector that apply GRI Standards and report in accordance with them must apply GRI 14 when it is effective. The standard reflects the sector\'s particular impacts on local communities, biodiversity in high-value areas, water resources, and the rights of Indigenous Peoples, and incorporates additional sector-specific disclosure requirements that go beyond the generic GRI Universal and Topic Standards. GRI 14 builds on the predecessor GRI G4 Mining and Metals Sector Disclosures and is relevant to companies reporting under ESRS, ISSB, or CDP frameworks as many mining-specific topics map directly to those frameworks\' disclosure requirements.',
    summary:
      'The GRI Sector Standard for the mining industry, identifying 22 material sustainability topics effective from 1 January 2025.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2025-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/standards-development/sector-standard-for-mining/',
    tags: ['gri', 'gri 14', 'mining', 'sector standard', 'material topics', 'local communities', 'land rights', 'mine closure', 'artisanal mining', 'indigenous peoples'],
    created_at: '2023-10-13T00:00:00.000Z',
    updated_at: '2026-04-08T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Sector Standard',
  },
  {
    id: 'regulation-uk-climate-related-financial-disclosures-si-2022',
    title: 'UK Climate-related Financial Disclosure Regulations (SI 2022/31)',
    description:
      'UK statutory regulations requiring large companies and LLPs to include TCFD-aligned climate-related financial disclosures in their strategic reports.',
    full_description:
      'The Companies (Strategic Report) (Climate-related Financial Disclosure) Regulations 2022 (SI 2022/31) came into force on 6 January 2022 and amended the Companies Act 2006 to require climate-related financial disclosures in strategic reports. They apply to financial years starting on or after 6 April 2022. In-scope companies include: UK-incorporated public interest entities with more than 500 employees; UK-registered banks and insurers with more than 500 employees; and other large UK companies with more than 500 employees and either a turnover exceeding £500 million or a balance sheet total exceeding £500 million. Parallel regulations (The Limited Liability Partnerships (Climate-related Financial Disclosure) Regulations 2022, SI 2022/46) impose equivalent requirements on large UK LLPs. Disclosures must cover four themes aligned with the TCFD framework: governance, strategy, risk management, and metrics and targets, including greenhouse gas emissions. The regulations built on the FCA\'s premium listing TCFD rule effective January 2021 and pre-dated the FCA\'s broader Sustainability Disclosure Requirements (SDR) regime introduced in 2024. Smaller companies may include a limited explanation if any element of TCFD disclosure is omitted.',
    summary:
      'The UK statutory instruments making TCFD-aligned climate disclosures mandatory for large UK companies and LLPs from FY2022.',
    category: 'Climate',
    region: 'UK',
    status: 'in_force',
    effective_date: '2022-01-06',
    source_name: 'UK Government / legislation.gov.uk',
    source_url:
      'https://www.legislation.gov.uk/uksi/2022/31/contents/made',
    tags: ['uk', 'tcfd', 'climate disclosure', 'mandatory reporting', 'strategic report', 'companies act', 'large companies', 'climate-related financial risks', 'si 2022/31'],
    created_at: '2022-01-06T00:00:00.000Z',
    updated_at: '2026-04-08T00:00:00.000Z',
  },
  {
    id: 'regulation-eu-esg-ratings-regulation',
    title: 'EU ESG Ratings Regulation',
    description:
      'An EU regulation establishing an authorisation and transparency framework for ESG rating providers operating in the EU to improve the reliability and comparability of ESG ratings.',
    full_description:
      'Regulation (EU) 2024/3005 on the transparency and integrity of environmental, social and governance (ESG) rating activities was published in the Official Journal on 27 November 2024 and entered into force on 17 December 2024. It will apply from 2 July 2026 (18 months after entry into force). ESG rating providers issuing ratings to EU-based clients must apply for authorisation from the European Securities and Markets Authority (ESMA), subject to size thresholds and transitional arrangements. Key requirements include: methodological transparency (public disclosure of methodologies, models, key assumptions, and data sources); organisational requirements (separation of ESG rating activities from other commercial services including consulting, audit, credit ratings, and investment); conflict of interest management; and ongoing supervisory reporting to ESMA. Third-country providers may access EU clients through equivalence, endorsement, or recognition pathways. The regulation responds to concerns identified by IOSCO and ESMA about the opacity, inconsistency, and potential conflicts of interest in the ESG ratings market, which has seen rapid growth alongside the expansion of ESG-linked investment products. It complements the EU Taxonomy Regulation, SFDR, and CSRD by addressing the third-party data layer underpinning sustainable finance decision-making.',
    summary:
      'The EU regulation requiring ESMA authorisation for ESG rating providers and mandating methodological transparency, applicable from July 2026.',
    category: 'Governance',
    region: 'EU',
    status: 'in_force',
    effective_date: '2024-12-17',
    source_name: 'European Commission / EUR-Lex',
    source_url:
      'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R3005',
    tags: ['esg ratings', 'esma', 'rating providers', 'transparency', 'conflicts of interest', 'eu', 'sustainable finance', 'authorisation', 'esg data'],
    created_at: '2024-12-17T00:00:00.000Z',
    updated_at: '2026-04-08T00:00:00.000Z',
  },
  {
    id: 'standard-iso-46001-water-efficiency-management-systems',
    title: 'ISO 46001 Water Efficiency Management Systems',
    description:
      'An ISO standard that sets requirements and guidance for organizations to establish, implement, and continually improve a water efficiency management system.',
    full_description:
      'ISO 46001:2019 Water efficiency management systems — Requirements with guidance for use was published by ISO on 29 July 2019. ISO states that it applies to organizations of all types and sizes that use water and supports a reduce, replace, or reuse approach to organizational water use. The standard covers monitoring, measurement, documentation, reporting, design, procurement, and training practices that contribute to water efficiency management. ISO also shows that Amendment 1:2024 has been issued and that the standard is now under revision, but the published baseline remains ISO 46001:2019.',
    summary:
      'The ISO standard for establishing and improving an organizational water efficiency management system.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-07-29',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/68286.html',
    tags: ['iso 46001', 'water efficiency', 'management system', 'water use', 'water stewardship', 'nature'],
    created_at: '2019-07-29T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 46001',
  },
  {
    id: 'guidance-iso-tr-14073-water-footprint-examples',
    title: 'ISO/TR 14073 Water Footprint Illustrative Examples',
    description:
      'An ISO technical report that provides illustrative examples showing how to apply ISO 14046 water footprint assessments to products, processes, and organizations.',
    full_description:
      'ISO/TR 14073:2017 Environmental management — Water footprint — Illustrative examples on how to apply ISO 14046 was published by ISO on 1 June 2017. ISO describes it as a technical report that provides illustrative examples of how to apply ISO 14046 in order to assess the water footprint of products, processes, and organizations based on life cycle assessment. The report is intended to demonstrate particular aspects of ISO 14046 application rather than provide a complete water footprint study report, making it a practical implementation companion to the core ISO 14046 standard.',
    summary:
      'An ISO technical report with practical examples for applying ISO 14046 water footprint assessments.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2017-06-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/72264.html',
    tags: ['iso tr 14073', 'iso 14046', 'water footprint', 'life cycle assessment', 'technical report', 'nature'],
    created_at: '2017-06-01T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
    umbrella_id: 'standard-iso-14046-water-footprint',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO/TR 14073:2017',
  },
  {
    id: 'standard-iso-14046-water-footprint',
    title: 'ISO 14046 Water Footprint of Products and Organizations',
    description:
      'An ISO standard providing principles, requirements, and guidelines for assessing and reporting the water footprint of products, processes, and organizations.',
    full_description:
      'ISO 14046:2014 Environmental management — Water footprint — Principles, requirements and guidelines was published by ISO on 24 July 2014 and confirmed in 2020. It specifies principles, requirements, and guidelines related to water footprint assessment of products, processes, and organizations based on life cycle assessment (LCA), including stand-alone water footprint assessments and water-related components of broader environmental assessments. ISO 14046 is referenced by the GHG Protocol, the TNFD LEAP approach for freshwater assessments, the CDP water security questionnaire, and ESRS E3 (Water and Marine Resources) disclosures under CSRD. It supports organizations in identifying water-related operational and supply-chain risks, setting reduction targets, and communicating water performance to investors and regulators. ISO/TR 14073:2017 provides illustrative examples of how to apply ISO 14046 in practice.',
    summary:
      'The global ISO standard for assessing and reporting water footprints using life cycle assessment, referenced by TNFD, CDP, and ESRS E3.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2014-07-24',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/43263.html',
    tags: ['iso 14046', 'water footprint', 'water accounting', 'water risk', 'lca', 'nature', 'supply chain', 'esrs e3', 'tnfd', 'cdp'],
    created_at: '2014-07-24T00:00:00.000Z',
    updated_at: '2026-04-09T00:00:00.000Z',
  },
  {
    id: 'standard-iso-14064-2-ghg-project-quantification',
    title: 'ISO 14064-2 Greenhouse Gas Project Quantification, Monitoring and Reporting',
    description:
      'An ISO standard specifying requirements and guidance for quantifying, monitoring, and reporting greenhouse gas emission reductions or removal enhancements from project-based activities.',
    full_description:
      'ISO 14064-2:2019 specifies principles and requirements at the project level for quantification, monitoring, and reporting of activities intended to cause greenhouse gas emission reductions or removal enhancements. ISO states that the standard covers planning a GHG project, identifying and selecting GHG sources, sinks, and reservoirs relevant to the project and baseline scenario, monitoring, quantifying, documenting, and reporting GHG project performance, and managing data quality. ISO 14064-2 forms part of the ISO 14064 series alongside ISO 14064-1 (organization-level GHG inventories) and ISO 14064-3 (validation and verification). It is widely used as a technical basis for project-based emissions reduction accounting — including avoided-emissions projects and carbon removal project design — and supports the consistent quantification of GHG reductions that are required under voluntary carbon market methodologies, national scheme rules, and supply-chain decarbonization programmes.',
    summary:
      'The ISO standard for quantifying, monitoring, and reporting project-level greenhouse gas emission reductions and removal enhancements.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2019-04-15',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/66454.html',
    tags: ['iso 14064-2', 'ghg project', 'project quantification', 'emission reductions', 'removals', 'monitoring reporting verification', 'climate', 'carbon market'],
    created_at: '2019-04-15T00:00:00.000Z',
    updated_at: '2019-04-15T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14064-2',
  },
  {
    id: 'consortium-finance-for-biodiversity-pledge',
    title: 'Finance for Biodiversity Pledge',
    description:
      'A voluntary leadership initiative through which financial institutions commit to protecting and restoring biodiversity through their financing activities, setting targets and reporting publicly.',
    full_description:
      'The Finance for Biodiversity Pledge was launched on 24 September 2020 as a voluntary financial-sector leadership initiative co-founded by ASN Bank and Triodos Bank. Signatory financial institutions commit to five actions: collaborate and engage with companies on biodiversity; assess their biodiversity impact within two years of signing; set measurable, science-based biodiversity targets within three years; prioritize biodiversity in their financing, investment, and insurance decisions; and report publicly within four years. The Finance for Biodiversity Foundation was established in 2021 to coordinate and support pledge implementation. By 2024, over 190 financial institutions representing more than €24 trillion in assets under management had signed the Pledge, making it a major voluntary financial-sector commitment on nature loss and biodiversity risk. It is closely associated with TNFD, SBTN, and the targets of the Kunming-Montreal Global Biodiversity Framework (Target 15) and is considered a leading practitioner community for nature-related disclosure in the financial sector.',
    summary:
      'A voluntary pledge by 190+ financial institutions committing to assess, target, and report on biodiversity impacts across their portfolios.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2020-09-24',
    source_name: 'Finance for Biodiversity Foundation',
    source_url: 'https://www.financeforbiodiversity.org/',
    tags: ['finance for biodiversity', 'ffb', 'biodiversity', 'pledge', 'financial institutions', 'nature', 'voluntary commitment', 'targets', 'tnfd', 'sbtn'],
    created_at: '2020-09-24T00:00:00.000Z',
    updated_at: '2020-09-24T00:00:00.000Z',
  },
  {
    id: 'guidance-ilo-convention-c190-violence-harassment',
    title: 'ILO Violence and Harassment Convention, 2019 (C190)',
    description:
      'The first international treaty exclusively addressing violence and harassment in the world of work, establishing the right for everyone to a workplace free from violence and harassment.',
    full_description:
      'ILO Convention 190 (C190) on Violence and Harassment was adopted at the 108th Session of the International Labour Conference on 21 June 2019 and entered into force on 25 June 2021. It is the first international treaty to exclusively address violence and harassment in the world of work, including gender-based violence and harassment. C190 establishes that everyone has the right to a world of work free from violence and harassment and requires ratifying member states to adopt laws, policies, enforcement mechanisms, and access to remedies to prevent and address these risks. Its scope extends to all workers regardless of contractual status, sector, or geography, and covers home-based work and the informal economy. C190 is accompanied by ILO Recommendation 206 (R206), which provides supplementary guidance on implementation. The Convention is increasingly referenced in corporate human rights due diligence under the UN Guiding Principles, CSDDD risk assessments, ESRS S1 (Own Workforce), and workplace health and safety supply chain auditing, and is recognized as a core international labour standard for psychological safety, dignity at work, and gender equality in the workplace.',
    summary:
      'The foundational ILO convention establishing a universal right to a workplace free from violence and harassment, in force from June 2021.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-06-25',
    source_name: 'International Labour Organization',
    source_url: 'https://www.ilo.org/dyn/normlex/en/f?p=NORMLEXPUB:12100:0::NO::P12100_ILO_CODE:C190',
    tags: ['ilo', 'ilo c190', 'violence and harassment', 'gender-based violence', 'workplace safety', 'human rights', 'labour standards', 'social', 'decent work'],
    created_at: '2021-06-25T00:00:00.000Z',
    updated_at: '2021-06-25T00:00:00.000Z',
  },
  {
    id: 'policy-oecd-anti-bribery-convention',
    title: 'OECD Anti-Bribery Convention',
    description:
      'The only multilateral treaty dedicated to the supply side of international bribery, requiring parties to criminalize bribery of foreign public officials in international business transactions.',
    full_description:
      'The Convention on Combating Bribery of Foreign Public Officials in International Business Transactions was adopted by OECD members and six non-members on 21 November 1997 and entered into force on 15 February 1999. As of 2024, 44 countries are parties — all 38 OECD members plus Argentina, Brazil, Bulgaria, Peru, and South Africa. The convention requires each party to make it a criminal offence under its domestic law for any person to offer, promise, or give a bribe to a foreign public official in order to obtain or retain business or other improper advantage in international business. It uniquely focuses on the supply side of bribery: the company or individual paying the bribe rather than the official receiving it. Implementation and enforcement are monitored by the OECD Working Group on Bribery (WGB) through a rigorous peer-review process covering each party\'s legislation, enforcement record, and corporate liability rules. The convention underpins corporate anti-bribery compliance frameworks including ISO 37001 (Anti-Bribery Management Systems) and ISO 37301 (Compliance Management Systems), the anti-corruption chapter of the OECD Guidelines for Multinational Enterprises on Responsible Business Conduct, and the business conduct disclosures required by ESRS G1 under the EU CSRD.',
    summary:
      'The multilateral treaty requiring signatories to criminalize bribery of foreign public officials, monitored by the OECD Working Group on Bribery.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '1999-02-15',
    source_name: 'OECD',
    source_url:
      'https://www.oecd.org/en/topics/anti-bribery/anti-bribery-convention.html',
    tags: ['oecd', 'anti-bribery', 'bribery', 'corruption', 'governance', 'foreign public officials', 'wgb', 'supply side', 'criminal law'],
    created_at: '1999-02-15T00:00:00.000Z',
    updated_at: '2026-04-17T00:00:00.000Z',
    umbrella_id: 'framework-oecd-guidelines-rbc',
    umbrella_relation: 'part_of' as const,
  },
  {
    id: 'standard-iso-45001-ohs-management-systems',
    title: 'ISO 45001 Occupational Health and Safety Management Systems',
    description:
      'The leading international standard for occupational health and safety management systems, providing a framework to prevent work-related injury and ill health.',
    full_description:
      'ISO 45001:2018 specifies requirements for an occupational health and safety (OH&S) management system, with guidance for its use. Published on 12 March 2018, it replaced OHSAS 18001:2007 and integrated elements of the ILO-OSH:2001 Guidelines, with a three-year transition period ending March 2021. The standard is intended to enable organizations to provide safe and healthy workplaces by preventing work-related injury and ill health, as well as by proactively improving OH&S performance. It uses the same high-level structure as ISO 14001 (Environment) and ISO 9001 (Quality), facilitating integration across management systems. Requirements cover leadership and worker participation, hazard identification and risk assessment, legal and other compliance obligations, incident investigation, emergency preparedness, and continual improvement. ISO 45001 is internationally recognized as the primary reference for OH&S management and is relevant to companies reporting under ESRS S1 (Own Workforce) on occupational health and safety, GRI 403 (Occupational Health and Safety), and the ILO Tripartite Declaration. It also informs due diligence expectations under the CSDDD for value-chain partners.',
    summary:
      'The international standard for occupational health and safety management systems, replacing OHSAS 18001, effective from March 2018.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-03-12',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/63787.html',
    tags: ['iso 45001', 'occupational health and safety', 'ohs', 'ohsms', 'workers', 'workplace safety', 'injury prevention', 'social'],
    created_at: '2018-03-12T00:00:00.000Z',
    updated_at: '2026-04-17T00:00:00.000Z',
  },
  {
    id: 'regulation-new-zealand-xrb-nzcs1-climate-disclosures',
    title: 'Aotearoa New Zealand Climate Standards (NZ CS 1, 2, 3)',
    description:
      'New Zealand\'s mandatory climate-related disclosure framework issued by the External Reporting Board, applying TCFD principles to large financial sector and listed entities.',
    full_description:
      'Aotearoa New Zealand Climate Standards 1, 2, and 3 (NZ CS 1, 2, 3) were issued by the External Reporting Board (XRB) in November 2022 under powers granted by the Financial Sector (Climate-related Disclosures and Other Matters) Amendment Act 2021. NZ CS 1 sets out the mandatory disclosure requirements structured around four TCFD pillars: governance, strategy, risk management, and metrics and targets. NZ CS 2 provides guidance on scenario analysis and NZ CS 3 on targets and transition plans. Reporting is mandatory from the first financial year on or after 1 January 2023 for climate reporting entities defined in the Financial Markets Conduct Act 2013, including large NZX-listed issuers, large registered banks, large licensed insurers, and large managers of registered investment schemes — where \'large\' is measured by total assets exceeding NZD 1 billion (or gross written premium for insurers). New Zealand was among the first countries in the world to mandate TCFD-aligned climate disclosures by legislation. The XRB has monitored IFRS S1 and IFRS S2 developments and is evaluating alignment pathways for future revisions, with stakeholder consultation on convergence undertaken in 2024–2025.',
    summary:
      'New Zealand\'s mandatory TCFD-based climate disclosure standards for large financial and listed entities, effective from January 2023.',
    category: 'Climate',
    region: 'New Zealand',
    status: 'in_force',
    effective_date: '2023-01-01',
    source_name: 'External Reporting Board (XRB)',
    source_url: 'https://www.xrb.govt.nz/standards/climate-related-disclosures/',
    tags: ['new zealand', 'xrb', 'nz cs 1', 'tcfd', 'climate disclosures', 'mandatory', 'listed issuers', 'financial sector', 'fmc act'],
    created_at: '2022-11-01T00:00:00.000Z',
    updated_at: '2026-04-17T00:00:00.000Z',
  },
  {
    id: 'regulation-switzerland-climate-reporting-ordinance',
    title: 'Switzerland Climate Reporting Ordinance (Klimaberichterstattungsverordnung)',
    description:
      'Swiss statutory requirement for large public-interest companies to publish annual TCFD-aligned climate reports under the Swiss Code of Obligations.',
    full_description:
      'The Swiss Ordinance on Climate Reporting (Klimaberichterstattungsverordnung, KBV / Ordonnance sur le rapport climatique, OCRlimat) entered into force on 1 January 2024, implementing the climate disclosure obligation established in Article 964b of the Swiss Code of Obligations (OR/CO). The broader non-financial reporting framework (Art. 964a–964f OR) took effect for financial years starting 1 January 2023. The climate ordinance applies to Swiss companies subject to non-financial reporting that also exceed a large-company threshold: stock exchange-listed entities, banks, and insurance companies with more than 500 full-time-equivalent employees and either total assets exceeding CHF 1 billion or revenue exceeding CHF 900 million. These entities must prepare and publish a TCFD-aligned climate report covering governance, strategy, climate risk management, and metrics and targets — including Scope 1 and 2 greenhouse gas emissions. The first mandatory reports covered financial year 2023 (published in 2024). Switzerland based its mandatory framework on the TCFD before IFRS S2 was finalized; the Federal Council has indicated that alignment with IFRS S2 will be evaluated in future revisions.',
    summary:
      'The Swiss mandatory TCFD-aligned climate reporting ordinance for large listed companies, banks, and insurers, applying from FY2023.',
    category: 'Climate',
    region: 'Switzerland',
    status: 'in_force',
    effective_date: '2024-01-01',
    source_name: 'Swiss Federal Council / SECO',
    source_url:
      'https://www.sif.admin.ch/sif/de/home/finanzmarktpolitik/nachhaltige-finanzen/klimaberichterstattung.html',
    tags: ['switzerland', 'climate reporting', 'tcfd', 'non-financial reporting', 'swiss code of obligations', 'kbv', 'mandatory disclosure', 'banks', 'insurers'],
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2026-04-17T00:00:00.000Z',
  },
  {
    id: 'policy-un-convention-against-corruption-uncac',
    title: 'UN Convention against Corruption (UNCAC)',
    description:
      'The only universal legally binding anti-corruption instrument, requiring states to criminalise corruption and adopt preventive measures across the public and private sectors.',
    full_description:
      'The United Nations Convention against Corruption (UNCAC) was adopted by the UN General Assembly in Resolution 58/4 on 31 October 2003, opened for signature at the Merida High-Level Political Conference in December 2003, and entered into force on 14 December 2005. With 191 states parties as of 2024, it is the first and only universal legally binding anti-corruption instrument. UNCAC is structured around five core chapters: preventive measures (public and private sector integrity, procurement transparency, financial management); criminalization and law enforcement (mandatory and optional offences covering bribery, embezzlement, money laundering, obstruction of justice, private sector corruption); international cooperation; asset recovery (an innovative chapter requiring states to return assets stolen by corrupt officials to their countries of origin); and technical assistance. For companies, UNCAC establishes the multilateral framework within which domestic anti-corruption laws — and corporate compliance requirements such as ISO 37001 (Anti-Bribery Management Systems) and ISO 37301 (Compliance Management Systems) — operate. It underpins the anti-corruption provisions of the OECD Guidelines for MNEs, the UN Global Compact Principle 10, and the ESRS G1 business conduct disclosures under CSRD.',
    summary:
      'The leading global multilateral treaty on anti-corruption, covering prevention, criminalization, international cooperation, and asset recovery across public and private sectors.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2005-12-14',
    source_name: 'United Nations Office on Drugs and Crime (UNODC)',
    source_url: 'https://www.unodc.org/unodc/en/corruption/uncac.html',
    tags: ['uncac', 'anti-corruption', 'bribery', 'governance', 'public sector', 'private sector', 'asset recovery', 'un', 'compliance'],
    created_at: '2005-12-14T00:00:00.000Z',
    updated_at: '2005-12-14T00:00:00.000Z',
  },
  {
    id: 'regulation-usa-california-ab1305-vcm-disclosures',
    title: 'California Voluntary Carbon Market Disclosures Act (AB 1305)',
    description:
      'A California state law requiring companies that sell voluntary carbon offsets or make marketing claims based on offsets to publish detailed annual website disclosures.',
    full_description:
      'California Assembly Bill 1305, the Voluntary Carbon Market Disclosures Act, was signed by Governor Gavin Newsom on 7 October 2023 and took effect on 1 January 2024. It requires businesses marketing voluntary carbon offsets in California, and businesses that purchase offsets and make claims about achieving net zero emissions, carbon neutrality, net negativity, or climate neutrality, to publish specified disclosures on their publicly accessible website by 1 July each year. Offset sellers must disclose for each offset project the project name, quantity, type, registry, unique project identification number, vintage year, protocol used, and whether independent third-party validation or verification was performed and by whom. Purchasers and companies making environmental claims based on offsets must disclose the projects funded, total quantities, methodologies used, and verifier details. Enforcement is by the California Attorney General with civil penalties of up to USD 2,500 per day per violation, capped at USD 500,000 per year. AB 1305 targets voluntary carbon market integrity and the substantiation of climate claims, complementing California SB 253 (scope 1–3 GHG inventory reporting) and SB 261 (climate financial risk reporting) without duplicating their requirements.',
    summary:
      'A California law mandating annual website disclosures by offset sellers and companies making net-zero or carbon-neutrality claims based on voluntary carbon offsets.',
    category: 'Climate',
    region: 'USA',
    status: 'in_force',
    effective_date: '2024-01-01',
    source_name: 'California Legislature / California Office of Legislative Counsel',
    source_url:
      'https://leginfo.legislature.ca.gov/faces/billNavClient.xhtml?bill_id=202320240AB1305',
    tags: ['california', 'ab 1305', 'voluntary carbon market', 'carbon offsets', 'net zero claims', 'carbon neutrality claims', 'vcm disclosures', 'usa'],
    created_at: '2023-10-07T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'standard-iso-14040-lca-principles-framework',
    title: 'ISO 14040 Life Cycle Assessment — Principles and Framework',
    description:
      'An ISO standard that sets the general framework, principles, and requirements for conducting and communicating life cycle assessment studies.',
    full_description:
      'ISO 14040:2006 (including AMD1:2020) specifies the general framework for life cycle assessment (LCA): its principles, four-phase structure, and requirements for how LCA studies are conducted and results reported. The four phases are goal and scope definition, life cycle inventory analysis (LCI), life cycle impact assessment (LCIA), and life cycle interpretation. ISO 14040 provides the conceptual and procedural foundation for LCA that ISO 14044 elaborates in detail through specific requirements and guidelines. Together, the two standards form the methodological basis for ISO 14067 (carbon footprint of products), ISO 14046 (water footprint), and the GHG Protocol Product Life Cycle Accounting and Reporting Standard. LCA methodology is referenced in ESRS E1 (climate), ESRS E3 (water and marine resources), ESRS E5 (circular economy and resource use), and the TNFD LEAP approach for evaluating nature-related impacts.',
    summary:
      'The foundational ISO standard setting the LCA methodology framework, principles, and four-phase structure.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2006-07-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/37456.html',
    tags: ['iso 14040', 'life cycle assessment', 'lca', 'lci', 'lcia', 'environmental assessment', 'product impacts'],
    created_at: '2006-07-01T00:00:00.000Z',
    updated_at: '2020-01-01T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14040',
  },
  {
    id: 'standard-iso-14044-lca-requirements-guidelines',
    title: 'ISO 14044 Life Cycle Assessment — Requirements and Guidelines',
    description:
      'An ISO standard that specifies detailed requirements and guidelines for each phase of life cycle assessment, from goal and scope definition through to interpretation, critical review, and reporting.',
    full_description:
      'ISO 14044:2006 (including AMD1:2017 and AMD2:2020) specifies requirements and guidelines for conducting life cycle assessment studies: goal and scope definition, life cycle inventory analysis (LCI), life cycle impact assessment (LCIA), life cycle interpretation, critical review, reporting, and limitations on the use of value choices and optional elements. It is the companion standard to ISO 14040, which provides the general LCA framework and principles, with ISO 14044 providing the detailed requirements practitioners must follow. ISO 14044 is the methodological foundation for product-level environmental assessment standards including ISO 14067 (carbon footprint of products) and ISO 14046 (water footprint), and for the GHG Protocol Product Life Cycle Accounting and Reporting Standard. It is referenced in ESRS E1 (climate change), ESRS E3 (water and marine resources), and ESRS E5 (resource use and circular economy), making it a practically important standard for companies substantiating product-level environmental claims.',
    summary:
      'The core ISO standard specifying requirements and guidelines for each phase of a life cycle assessment study.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2006-07-01',
    source_name: 'ISO',
    source_url: 'https://www.iso.org/standard/38498.html',
    tags: ['iso 14044', 'life cycle assessment', 'lca', 'requirements', 'guidelines', 'lci', 'lcia', 'environmental assessment'],
    created_at: '2006-07-01T00:00:00.000Z',
    updated_at: '2020-01-01T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14044',
  },
  {
    id: 'standard-gri-207-tax-2019',
    title: 'GRI 207: Tax 2019',
    description:
      'A GRI Topic Standard requiring organizations to report on their approach to tax governance, tax risk management, stakeholder engagement on tax, and country-by-country public tax data.',
    full_description:
      'GRI 207: Tax 2019 was published by the Global Reporting Initiative on 5 December 2019 and became effective for reports or other materials published on or after 1 January 2021. It is the first global sustainability standard addressing tax governance and transparency as a dedicated sustainability topic. The standard contains four disclosures: GRI 207-1 covers the organization\'s approach to tax including strategy, governance, risk appetite, and stakeholder engagement policy; GRI 207-2 covers tax governance, control, and risk management processes; GRI 207-3 covers stakeholder engagement and management of tax concerns including whistleblowing mechanisms; and GRI 207-4 covers country-by-country public reporting of revenues, profit or loss before income tax, income tax paid, and employee headcount by jurisdiction. GRI 207 is used alongside the OECD BEPS Action 13 country-by-country reporting framework and is referenced by ESRS G1, which requires CSRD-in-scope companies to disclose their approach to tax governance and anti-tax evasion practices. The standard reflects growing investor, civil society, and regulatory interest in whether large companies pay tax in the countries where economic activity and value creation occur.',
    summary:
      'The GRI Topic Standard for reporting tax governance, tax risk management, and public country-by-country tax data.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 207', 'tax', 'tax governance', 'country-by-country reporting', 'tax transparency', 'beps', 'topic standard'],
    created_at: '2019-12-05T00:00:00.000Z',
    updated_at: '2019-12-05T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-305-emissions-2016',
    title: 'GRI 305: Emissions 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose their Scope 1, Scope 2, and Scope 3 GHG emissions, GHG intensity and reductions, emissions of ozone-depleting substances, and other significant air emissions.',
    full_description:
      'GRI 305: Emissions 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016 and effective for all reporters from 1 July 2018. It contains seven disclosure requirements: GRI 305-1 (direct Scope 1 GHG emissions from owned or controlled sources); GRI 305-2 (indirect Scope 2 GHG emissions from purchased energy, using market-based and location-based methods); GRI 305-3 (other indirect Scope 3 GHG emissions across 15 upstream and downstream categories, measured at least biennially); GRI 305-4 (GHG emissions intensity ratio); GRI 305-5 (reductions of GHG emissions and their source); GRI 305-6 (emissions of ozone-depleting substances); and GRI 305-7 (nitrogen oxides, sulfur oxides, and other significant air pollutants). Organizations must use the GHG Protocol Corporate Accounting and Reporting Standard or other recognised methodologies. GRI 305 is referenced in ESRS E1 (Climate Change) and ESRS E2 (Pollution) under CSRD, aligns with IFRS S2 climate metrics and TCFD scenario analysis disclosures, and maps to CDP climate questionnaire modules. GRI 305 remains the operative emissions topic standard until the successor project, GRI 102: Climate Change 2025 and GRI 103: Energy 2025, takes full effect.',
    summary:
      'The GRI Topic Standard on Scope 1, 2, and 3 GHG emissions, ODS, and other significant air emissions, referencing GHG Protocol methodology.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 305', 'emissions', 'scope 1', 'scope 2', 'scope 3', 'ghg', 'ods', 'air pollutants', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-303-water-effluents-2018',
    title: 'GRI 303: Water and Effluents 2018',
    description:
      'A GRI Topic Standard requiring organizations to disclose their approach to water as a shared resource and to report water withdrawal, discharge, and consumption, with breakdowns for water-stressed areas.',
    full_description:
      'GRI 303: Water and Effluents 2018 is a topic standard published by the Global Sustainability Standards Board (GSSB) in July 2018, replacing GRI 303: Water 2016, and effective for reports published on or after 1 January 2021. It significantly expanded the prior water standard by recognizing water as a shared resource, introducing mandatory contextual disclosures on how the organization interacts with water as a shared resource and its related impacts (GRI 303-1), and requiring disclosure of how significant discharge-related impacts are managed (GRI 303-2). The quantitative disclosures require water withdrawal by source and from water-stressed areas (GRI 303-3), water discharge by destination and quality (GRI 303-4), and water consumption with breakdowns for water-stressed areas (GRI 303-5). GRI 303:2018 aligns with the ISO 14046 water footprint standard used in product-level assessments, the CDP Water Security questionnaire, ESRS E3 (Water and Marine Resources), and the TNFD LEAP approach for freshwater ecosystem dependencies. GRI 13: Agriculture, Aquaculture and Fishing 2022 and GRI 11: Oil and Gas 2021 reference GRI 303 among their sector-specific required disclosures.',
    summary:
      'The GRI Topic Standard on water as a shared resource: water withdrawal, discharge, and consumption with breakdowns for water-stressed areas.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 303', 'water', 'water withdrawal', 'water discharge', 'water consumption', 'water-stressed areas', 'effluents', 'topic standard'],
    created_at: '2018-07-01T00:00:00.000Z',
    updated_at: '2018-07-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-403-ohs-2018',
    title: 'GRI 403: Occupational Health and Safety 2018',
    description:
      'A GRI Topic Standard requiring organizations to disclose their OHS management system, hazard identification and risk management processes, worker injury and ill-health data, and OHS approaches across business relationships.',
    full_description:
      'GRI 403: Occupational Health and Safety 2018 is a topic standard published by the Global Sustainability Standards Board (GSSB) in August 2018, replacing GRI 403: Occupational Health and Safety 2016, and effective for reports published on or after 1 January 2021. It is significantly more comprehensive than its predecessor, expanding from five to ten disclosures organized into management approach disclosures (GRI 403-1 through 403-7) and topic-specific disclosures (GRI 403-8 through 403-10). The management approach section covers: the OHS management system and whether it is certified (403-1); hazard identification, risk assessment, and incident investigation processes (403-2); occupational health services (403-3); worker participation, consultation, and communication on OHS (403-4); worker training on OHS (403-5); promotion of worker health (403-6); and prevention and mitigation of OHS impacts directly linked by business relationships (403-7). The topic-specific disclosures cover: workers covered by OHS management systems (403-8); work-related injuries including rates per 200,000 hours for employees and contractors (403-9); and work-related ill health (403-10). GRI 403:2018 aligns closely with ISO 45001:2018 and references ILO conventions and guidelines. It is referenced in ESRS S1 (Own Workforce) under CSRD, is a required disclosure in GRI 11 (Oil and Gas), GRI 12 (Coal), and GRI 13 (Agriculture), and relates to CSDDD value-chain human rights due diligence.',
    summary:
      'The GRI Topic Standard on OHS: management systems, hazard identification, worker health and health promotion, and injury and ill-health metrics.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2021-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 403', 'occupational health and safety', 'ohs', 'worker safety', 'work-related injuries', 'hazard identification', 'iso 45001', 'topic standard'],
    created_at: '2018-08-01T00:00:00.000Z',
    updated_at: '2018-08-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-306-waste-2020',
    title: 'GRI 306: Waste 2020',
    description:
      'A GRI Topic Standard requiring organizations to disclose their approach to waste management and to quantify waste generated, waste diverted from disposal, and waste directed to disposal.',
    full_description:
      'GRI 306: Waste 2020 is a topic standard published by the Global Sustainability Standards Board (GSSB) in November 2020, replacing GRI 306: Effluents and Waste 2016, and effective for reports published on or after 1 January 2022. The 2020 revision substantially redesigned the earlier standard: effluent disclosures were absorbed into GRI 303: Water and Effluents 2018, while waste was expanded into a dedicated standard with a more comprehensive management approach and new quantitative disclosure categories. GRI 306 contains five disclosures: GRI 306-1 (waste generation and significant waste-related impacts, including characterization by composition and hazardousness); GRI 306-2 (management of significant waste-related impacts, covering reduction, reuse, recycling, recovery, and disposal approaches); GRI 306-3 (total waste generated in metric tons, broken down by material and by hazardous and non-hazardous); GRI 306-4 (waste diverted from disposal by preparation-for-reuse, recycling, and other recovery routes); and GRI 306-5 (waste directed to disposal by incineration, landfilling, and other disposal methods). GRI 306:2020 maps to ESRS E5 (Resource Use and Circular Economy) under CSRD, which requires disclosure of waste generation, waste diversion rates, and alignment with waste-hierarchy principles. The standard also relates to the Basel Convention on hazardous wastes and the EU Waste Framework Directive.',
    summary:
      'The GRI Topic Standard on waste management: waste generation and impacts, waste diverted from disposal, and waste directed to disposal by method.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2022-01-01',
    source_name: 'Global Reporting Initiative',
    source_url:
      'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 306', 'waste', 'waste management', 'hazardous waste', 'waste diversion', 'circular economy', 'recycling', 'topic standard'],
    created_at: '2020-11-01T00:00:00.000Z',
    updated_at: '2020-11-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-401-employment-2016',
    title: 'GRI 401: Employment 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose new employee hires and turnover rates, benefits provided by employment type, and parental leave data broken down by gender.',
    full_description:
      'GRI 401: Employment 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains three topic-specific disclosures. GRI 401-1 covers new employee hires and employee turnover, including total numbers and rates broken down by age group (under 30, 30\u201350, over 50), gender, and region. GRI 401-2 covers benefits provided to full-time employees that are not provided to temporary or part-time employees, including health care, disability and invalidity coverage, parental leave, retirement provision, stock ownership, life insurance, and other benefits. GRI 401-3 covers parental leave, requiring disclosure of the total number of employees entitled to parental leave, employees who took parental leave, employees who returned to work after parental leave ended, and employees who returned and were still employed twelve months later, broken down by gender along with retention rates. GRI 401 aligns with ESRS S1 (Own Workforce) employment conditions and work-life balance disclosure requirements, the ILO Tripartite Declaration of Principles concerning Multinational Enterprises and Social Policy, and relevant ILO Conventions. It is referenced among the sector-specific required disclosures in GRI 11 (Oil and Gas 2021) and GRI 13 (Agriculture, Aquaculture and Fishing 2022).',
    summary:
      'The GRI Topic Standard on employment: new hire and turnover rates by age and gender, employee benefits by contract type, and parental leave return and retention rates.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 401', 'employment', 'employee turnover', 'parental leave', 'employee benefits', 'workforce', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-404-training-education-2016',
    title: 'GRI 404: Training and Education 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose average training hours per employee, skills development and transition programs, and the proportion of employees receiving regular performance and career development reviews.',
    full_description:
      'GRI 404: Training and Education 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains three topic-specific disclosures. GRI 404-1 covers average hours of training per year per employee, broken down by gender and employee category. GRI 404-2 covers programs for upgrading employee skills and transition assistance programs, describing the nature and scope of programs that support continuing employability, skills enhancement, and the management of career transitions and endings due to retirement or termination. GRI 404-3 covers the percentage of employees receiving regular performance and career development reviews during the reporting period, broken down by gender and employee category. GRI 404 aligns with ESRS S1 (Own Workforce) disclosure requirements on training and skill development, and with ILO Convention C142 on Vocational Guidance and Vocational Training in the Development of Human Resources. It reflects the human capital dimensions addressed by the Capitals Coalition Social and Human Capital Protocol and informs human capital disclosures relevant to IFRS S1 enterprise value reporting.',
    summary:
      'The GRI Topic Standard on training and education: average training hours per employee, skills upgrading and transition programs, and performance and career development review coverage.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 404', 'training', 'education', 'skills development', 'employee development', 'human capital', 'performance review', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-405-diversity-equal-opportunity-2016',
    title: 'GRI 405: Diversity and Equal Opportunity 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the diversity composition of governance bodies and employees by age and gender, and the ratio of women\'s to men\'s basic salary and remuneration.',
    full_description:
      'GRI 405: Diversity and Equal Opportunity 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures. GRI 405-1 covers diversity of governance bodies and employees, requiring percentage breakdowns by gender, age group (under 30, 30\u201350, over 50), and other diversity indicators (such as membership of minority groups or persons with disabilities) for governance body members and for employees broken down by employee category. GRI 405-2 covers the ratio of basic salary and remuneration of women to men, reported by employee category and by significant locations of operation, with a description of the ratio and any known pay gaps. GRI 405 aligns with ESRS S1 (Own Workforce) diversity and equal treatment of workers disclosure requirements under the CSRD, the EU Pay Transparency Directive (2023/970) gender pay gap reporting obligations, ILO Equal Remuneration Convention C100, and ILO Discrimination (Employment and Occupation) Convention C111. It is frequently reported in conjunction with GRI 401 (Employment) and GRI 403 (Occupational Health and Safety) as part of comprehensive workforce social disclosures.',
    summary:
      'The GRI Topic Standard on diversity and equal opportunity: governance body and employee diversity by gender and age, and the ratio of women\'s to men\'s remuneration.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 405', 'diversity', 'equal opportunity', 'gender pay gap', 'board diversity', 'inclusion', 'gender equality', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-406-non-discrimination-2016',
    title: 'GRI 406: Non-Discrimination 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose incidents of discrimination and the corrective actions taken to address them.',
    full_description:
      'GRI 406: Non-Discrimination 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains a single topic-specific disclosure. GRI 406-1 requires organizations to report the total number of incidents of discrimination during the reporting period and the status of incidents at the end of the reporting period — whether the incident is being reviewed by the organization, whether a remediation plan is being implemented, whether the remediation plan has been implemented with outcomes reviewed using standard procedures, and whether the incident is no longer subject to action — along with any corrective actions taken. GRI 406 aligns with ESRS S1 (Own Workforce) equal treatment and opportunity disclosures under the CSRD, ILO Discrimination (Employment and Occupation) Convention C111, and the ILO Declaration on Fundamental Principles and Rights at Work. It is also relevant to the human rights due diligence required under the EU Corporate Sustainability Due Diligence Directive (CSDDD). The standard is frequently reported alongside GRI 405 (Diversity and Equal Opportunity) as part of comprehensive non-discrimination and inclusion disclosures.',
    summary:
      'The GRI Topic Standard on non-discrimination: the number and status of discrimination incidents and corrective actions taken.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 406', 'non-discrimination', 'discrimination', 'equal treatment', 'human rights', 'workplace', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-407-freedom-association-collective-bargaining-2016',
    title: 'GRI 407: Freedom of Association and Collective Bargaining 2016',
    description:
      'A GRI Topic Standard requiring organizations to identify operations and suppliers where freedom of association and collective bargaining rights may be at risk and to disclose the measures taken to support these rights.',
    full_description:
      'GRI 407: Freedom of Association and Collective Bargaining 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains a single topic-specific disclosure. GRI 407-1 requires organizations to report operations and suppliers in which workers\' rights to exercise freedom of association or collective bargaining may be violated or are at significant risk — identified by type of operation, supplier, or country or geographic area — and the measures taken by the organization in the reporting period to support these rights. GRI 407 aligns with ILO Freedom of Association and Protection of the Right to Organise Convention C87, ILO Right to Organise and Collective Bargaining Convention C98, and the ILO Declaration on Fundamental Principles and Rights at Work, which identifies freedom of association and collective bargaining as one of its four fundamental labour principles. The standard is relevant to the human rights and supply-chain due diligence requirements of the EU Corporate Sustainability Due Diligence Directive (CSDDD), ESRS S2 (Workers in the Value Chain), and the UN Guiding Principles on Business and Human Rights (UNGPs). Required in GRI 11 (Oil and Gas), GRI 12 (Coal), and GRI 13 (Agriculture, Aquaculture and Fishing) sector standards.',
    summary:
      'The GRI Topic Standard on freedom of association and collective bargaining: identifying operations and suppliers where these rights are at risk and the measures taken to support workers.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 407', 'freedom of association', 'collective bargaining', 'labour rights', 'human rights', 'supply chain', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-408-child-labour-2016',
    title: 'GRI 408: Child Labour 2016',
    description:
      'A GRI Topic Standard requiring organizations to identify operations and suppliers at significant risk of child labour and to disclose measures taken to contribute to its abolition.',
    full_description:
      'GRI 408: Child Labour 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains a single topic-specific disclosure. GRI 408-1 requires organizations to report operations and suppliers considered to have significant risk for incidents of child labour — including young workers exposed to hazardous work — by type of operation, supplier, or country or geographic area with significant risk, and the measures taken by the organization in the reporting period intended to contribute to the effective abolition of child labour. GRI 408 aligns with ILO Minimum Age Convention C138, ILO Worst Forms of Child Labour Convention C182, and the ILO Declaration on Fundamental Principles and Rights at Work, which identifies the effective abolition of child labour as one of its four fundamental labour principles. It is directly relevant to the human rights due diligence required under the EU Corporate Sustainability Due Diligence Directive (CSDDD), ESRS S2 (Workers in the Value Chain), ESRS S3 (Affected Communities), and the UN Guiding Principles on Business and Human Rights. Required in GRI 11 (Oil and Gas), GRI 12 (Coal), and GRI 13 (Agriculture, Aquaculture and Fishing) sector standards.',
    summary:
      'The GRI Topic Standard on child labour: identifying operations and suppliers at significant risk and the measures taken to contribute to abolishing child labour.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 408', 'child labour', 'child labor', 'human rights', 'supply chain', 'labour rights', 'due diligence', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-409-forced-compulsory-labour-2016',
    title: 'GRI 409: Forced or Compulsory Labour 2016',
    description:
      'A GRI Topic Standard requiring organizations to identify operations and suppliers at significant risk of forced or compulsory labour and to disclose measures taken to contribute to its elimination.',
    full_description:
      'GRI 409: Forced or Compulsory Labour 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains a single topic-specific disclosure. GRI 409-1 requires organizations to report operations and suppliers considered to have significant risk for incidents of forced or compulsory labour — by type of operation, supplier, country, or geographic area — and the measures taken by the organization in the reporting period intended to contribute to the elimination of all forms of forced or compulsory labour. Forced or compulsory labour encompasses practices such as debt bondage, human trafficking, deceptive recruitment, and the retention of identity documents, as defined by ILO Forced Labour Convention C29. GRI 409 aligns with ILO Forced Labour Convention C29, ILO Abolition of Forced Labour Convention C105, and the ILO Declaration on Fundamental Principles and Rights at Work, which identifies the elimination of forced and compulsory labour as one of its four fundamental labour principles. The standard is directly relevant to the EU Corporate Sustainability Due Diligence Directive (CSDDD), the EU Forced Labour Regulation (EU 2024/3015), ESRS S2 (Workers in the Value Chain), the UK Modern Slavery Act 2015, and the Australian Modern Slavery Act 2018. Required in GRI 11 (Oil and Gas), GRI 12 (Coal), and GRI 13 (Agriculture, Aquaculture and Fishing) sector standards.',
    summary:
      'The GRI Topic Standard on forced or compulsory labour: identifying operations and suppliers at significant risk and the measures taken to contribute to eliminating forced labour.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 409', 'forced labour', 'forced labor', 'compulsory labour', 'modern slavery', 'human rights', 'supply chain', 'due diligence', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-iso-14031-environmental-performance-evaluation',
    title: 'ISO 14031 Environmental Performance Evaluation',
    description:
      'An ISO guidance standard that helps organizations design and use environmental performance evaluation, including selecting and applying environmental performance indicators across management, operational, and environmental condition categories.',
    full_description:
      'ISO 14031: Environmental Management — Environmental Performance Evaluation — Guidelines provides a structured approach for organizations to evaluate and communicate how they are managing their environmental performance. Originally published in 1999 and revised as ISO 14031:2013, the standard defines environmental performance evaluation (EPE) as a process that uses indicators and data to provide information and support decisions about an organization\'s environmental performance. ISO 14031 organizes environmental performance indicators (EPIs) into three categories: Management Performance Indicators (MPIs) measure the efforts and capabilities of management to influence environmental performance, including training programs, environmental audit results, procurement decisions, and compliance records; Operational Performance Indicators (OPIs) measure the environmental performance of the organization\'s operations, such as energy consumption, water withdrawal, GHG emissions, and waste generated; and Environmental Condition Indicators (ECIs) provide information about the state of the local, regional, or global environment relevant to the organization. The standard follows a Select, Collect, Analyze, Report and Improve (SCARI) evaluation cycle. ISO 14031 is a companion to ISO 14001 (Environmental Management Systems) and directly supports the performance evaluation requirements of Clause 9 of ISO 14001:2015. It provides the indicator framework that informs environmental KPI selection for GRI Topic Standards such as GRI 303, GRI 305, and GRI 306, and the ESRS environmental standards (E1\u2013E5) under the CSRD.',
    summary:
      'The ISO guidance standard for environmental performance evaluation using a SCARI cycle and a three-category indicator framework: Management, Operational, and Environmental Condition Indicators.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2013-07-01',
    source_name: 'International Organization for Standardization',
    source_url: 'https://www.iso.org/standard/52297.html',
    tags: ['iso', 'iso 14031', 'environmental performance', 'environmental performance indicators', 'epi', 'mpi', 'opi', 'eci', 'environmental management', 'iso 14001'],
    created_at: '2013-07-01T00:00:00.000Z',
    updated_at: '2013-07-01T00:00:00.000Z',
    umbrella_id: 'standard-iso-14001-environmental-management-systems',
    umbrella_relation: 'part_of' as const,
    version_label: 'ISO 14031:2013',
  },
  {
    id: 'standard-gri-410-security-practices-2016',
    title: 'GRI 410: Security Practices 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the percentage of security personnel who have received training in the organization\'s human rights policies and procedures.',
    full_description:
      'GRI 410: Security Practices 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains a single topic-specific disclosure. GRI 410-1 requires organizations to report the percentage of security personnel — both employees and contracted personnel — who have received formal training in the organization\'s human rights policies or specific procedures and their application to security, broken down by internal security personnel and security personnel from third-party organizations. The disclosure is relevant where organizations employ or contract security services for the protection of people, assets, and property, and is particularly significant in contexts involving conflict-affected or high-risk areas, extractive operations, or large infrastructure projects where security personnel interact with local communities. GRI 410 aligns with the Voluntary Principles on Security and Human Rights (VPSHR), ILO Indigenous and Tribal Peoples Convention C169, the UN Guiding Principles on Business and Human Rights (UNGPs), ESRS S2 (Workers in the Value Chain), and ESRS S3 (Affected Communities) under the CSRD. The standard is required for reporting organizations in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on security practices: the percentage of security personnel trained in human rights policies and procedures, broken down by employee and contracted personnel.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 410', 'security practices', 'human rights training', 'security personnel', 'voluntary principles', 'conflict-affected areas', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-411-indigenous-peoples-rights-2016',
    title: 'GRI 411: Rights of Indigenous Peoples 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the number and status of incidents of violations involving the rights of indigenous peoples during the reporting period.',
    full_description:
      'GRI 411: Rights of Indigenous Peoples 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains a single topic-specific disclosure. GRI 411-1 requires organizations to report the total number of identified incidents of violations involving the rights of indigenous peoples during the reporting period and the status of incidents at the end of the reporting period — whether the incident is being reviewed by the organization, whether a remediation plan is being implemented, whether the remediation plan has been implemented with outcomes reviewed, and whether the incident is no longer subject to action. GRI 411 aligns with the United Nations Declaration on the Rights of Indigenous Peoples (UNDRIP), adopted by the UN General Assembly in September 2007, and ILO Indigenous and Tribal Peoples Convention C169. It is relevant to the rights of free, prior, and informed consent (FPIC), land and resource rights, cultural heritage protection, and self-determination. The standard aligns with ESRS S3 (Affected Communities) and ESRS E4 (Biodiversity and Ecosystems) under the CSRD, the UN Guiding Principles on Business and Human Rights (UNGPs), and the OECD Guidelines for Multinational Enterprises. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on indigenous peoples\' rights: the number and status of incidents of violations involving the rights of indigenous peoples.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 411', 'indigenous peoples', 'human rights', 'fpic', 'undrip', 'land rights', 'cultural heritage', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-412-human-rights-assessment-2016',
    title: 'GRI 412: Human Rights Assessment 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the scope of human rights due diligence through operations subject to human rights reviews, employee training, and investment agreements screened for human rights.',
    full_description:
      'GRI 412: Human Rights Assessment 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains three topic-specific disclosures addressing different dimensions of human rights due diligence. GRI 412-1 requires the total number and percentage of significant operations that have been subject to human rights reviews or human rights impact assessments, covering operational sites selected on the basis of country, business unit, or other relevant criteria. GRI 412-2 requires the total hours of employee training on human rights policies or procedures covering aspects of human rights relevant to operations, and the percentage of employees trained. GRI 412-3 requires the total number and percentage of significant investment agreements and contracts that include human rights clauses or that underwent human rights screening, demonstrating the integration of human rights considerations into business relationships and capital allocation. GRI 412 aligns with the UN Guiding Principles on Business and Human Rights (UNGPs), which require businesses to carry out human rights due diligence across operations and value chains. It is directly relevant to the human rights due diligence required by the EU Corporate Sustainability Due Diligence Directive (CSDDD), ESRS S1 (Own Workforce), ESRS S2 (Workers in the Value Chain), and ESRS S3 (Affected Communities). Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on human rights assessment: operations subject to human rights review, employee training on human rights, and investment agreements that included human rights screening.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 412', 'human rights assessment', 'human rights due diligence', 'human rights impact assessment', 'human rights training', 'investment screening', 'ungps', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-413-local-communities-2016',
    title: 'GRI 413: Local Communities 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose operations with community engagement programs and those with significant actual or potential negative impacts on local communities.',
    full_description:
      'GRI 413: Local Communities 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures. GRI 413-1 requires the percentage of operations with implemented local community engagement, impact assessments, and/or development programs, including the use of social impact assessments, stakeholder engagement plans based on local decision-making processes, broad community development programs based on communities\' needs, grievance mechanisms, independent monitoring, local community representation in the reporting organization\'s governance, and work or revenue sharing agreements with local communities. GRI 413-2 requires the identification of operations with significant actual and potential negative impacts on local communities, specified by location, nature of impact, and whether impacts were assessed. Local communities are groups of people who live near or are otherwise directly affected by operations, and may include indigenous peoples, workers and their families, and communities dependent on natural resources. GRI 413 aligns with IFC Performance Standards 1 (Assessment and Management of Environmental and Social Risks and Impacts) and 5 (Land Acquisition and Involuntary Resettlement), ESRS S3 (Affected Communities) under the CSRD, the UN Guiding Principles on Business and Human Rights (UNGPs), and the CSDDD due diligence requirements. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on local communities: the percentage of operations with community engagement programs in place and operations with significant actual or potential negative impacts on local communities.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 413', 'local communities', 'community engagement', 'social impact assessment', 'grievance mechanism', 'stakeholder engagement', 'affected communities', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-414-supplier-social-assessment-2016',
    title: 'GRI 414: Supplier Social Assessment 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the percentage of new suppliers screened using social criteria and the identification of significant negative social impacts in the supply chain with actions taken.',
    full_description:
      'GRI 414: Supplier Social Assessment 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures addressing the integration of social criteria into supplier management and supply chain due diligence. GRI 414-1 requires the percentage of new suppliers that were screened using social criteria — such as labor practices, human rights, and community impact — covering the total number of new suppliers identified and the percentage screened using social criteria. GRI 414-2 requires the identification of significant actual and potential negative social impacts in the supply chain and actions taken, including: the number of suppliers assessed for social impacts; the number identified as having significant actual and potential negative social impacts; the significant impacts identified; the percentage of suppliers with identified significant negative impacts with which improvements were agreed; and the percentage with which relationships were terminated as a result of assessment. GRI 414 is directly linked to supply chain human rights due diligence requirements under the EU Corporate Sustainability Due Diligence Directive (CSDDD), ESRS S2 (Workers in the Value Chain), the UN Guiding Principles on Business and Human Rights (UNGPs), the ILO Tripartite Declaration of Principles concerning Multinational Enterprises and Social Policy (MNE Declaration), and the OECD Due Diligence Guidance for Responsible Business Conduct. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on supplier social assessment: the percentage of new suppliers screened using social criteria and identification of significant negative social impacts in the supply chain with actions taken.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 414', 'supplier social assessment', 'supply chain', 'social criteria', 'due diligence', 'human rights', 'value chain', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-415-public-policy-2016',
    title: 'GRI 415: Public Policy 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the total monetary value of financial and in-kind political contributions made directly and indirectly, by country and recipient.',
    full_description:
      'GRI 415: Public Policy 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure. GRI 415-1 requires the total monetary value of financial and in-kind political contributions made directly and indirectly by the organization, including: the total monetary value of financial and in-kind contributions made to political parties, politicians, and related institutions by country and by recipient or beneficiary; a confirmation of whether the organization\'s anti-corruption policies and procedures have been communicated to those who are potential recipients of the contributions; and whether the disclosure covers the consolidated group or only the reporting organization. This disclosure promotes transparency in corporate political engagement, which is material to governance integrity. GRI 415 aligns with the UN Convention against Corruption (UNCAC), the OECD Anti-Bribery Convention, ISO 37001 (Anti-bribery Management Systems), ESRS G1 (Business Conduct) under the CSRD, and the UN Global Compact Principle 10 on Anti-Corruption. Organizations with a policy of not making political contributions may state this explicitly.',
    summary:
      'The GRI Topic Standard on public policy: the total monetary value of financial and in-kind political contributions made directly and indirectly by the organization, by country and recipient.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 415', 'public policy', 'political contributions', 'lobbying', 'anti-corruption', 'governance', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-416-customer-health-safety-2016',
    title: 'GRI 416: Customer Health and Safety 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the assessment of health and safety impacts of product and service categories and incidents of non-compliance with health and safety regulations.',
    full_description:
      'GRI 416: Customer Health and Safety 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures addressing the health and safety of products and services throughout their life cycle. GRI 416-1 requires the percentage of significant product and service categories for which health and safety impacts are assessed for improvement, identifying the total number of significant product and service categories and the percentage for which health and safety impacts have been assessed. GRI 416-2 requires the total number of incidents of non-compliance with regulations and/or voluntary codes concerning the health and safety impacts of products and services within the reporting period, broken down by: incidents of non-compliance with regulations resulting in a fine or penalty; incidents of non-compliance with regulations resulting in a warning; and incidents of non-compliance with voluntary codes. Organizations report that no incidents of non-compliance occurred if this is the case. GRI 416 aligns with ISO 9001 (Quality Management Systems), ESRS S4 (Consumers and End-users) under the CSRD, and is relevant to the EU General Product Safety Regulation (Regulation (EU) 2023/988), which entered into force in June 2023 and applied from 13 December 2024.',
    summary:
      'The GRI Topic Standard on customer health and safety: the percentage of product and service categories assessed for health and safety impacts, and incidents of non-compliance with health and safety regulations and voluntary codes.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 416', 'customer health and safety', 'product safety', 'product assessment', 'consumer protection', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-417-marketing-labeling-2016',
    title: 'GRI 417: Marketing and Labeling 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose product information and labeling requirements, and incidents of non-compliance with product labeling and marketing communications regulations.',
    full_description:
      'GRI 417: Marketing and Labeling 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains three topic-specific disclosures concerning the accuracy of product and service information and the conduct of marketing communications. GRI 417-1 requires information about product and service information and labeling requirements, and the percentage of significant product or service categories covered by and assessed for compliance with procedures for product and service information and labeling — including sourcing of components, safe use of products, disposal information, and environmental or social certification information. GRI 417-2 requires the total number of incidents of non-compliance with regulations and/or voluntary codes concerning product and service information and labeling, broken down by type (fine or penalty, warning, or voluntary code violation). GRI 417-3 requires the total number of incidents of non-compliance with regulations and/or voluntary codes concerning marketing communications, including advertising, promotion, and sponsorship, broken down by type of incident. GRI 417 aligns with ESRS S4 (Consumers and End-users) under the CSRD, and is related to anti-greenwashing frameworks including the UK FCA Anti-Greenwashing Rule (PS24/2), the ESMA Guidelines on fund names using ESG or sustainability-related terms, and the proposed EU Green Claims Directive. Organizations report that no incidents of non-compliance occurred if this is the case.',
    summary:
      'The GRI Topic Standard on marketing and labeling: product information requirements and compliance assessment, and incidents of non-compliance with product labeling and marketing communications regulations.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 417', 'marketing', 'labeling', 'product information', 'marketing communications', 'greenwashing', 'consumer protection', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-418-customer-privacy-2016',
    title: 'GRI 418: Customer Privacy 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose substantiated complaints concerning breaches of customer privacy and losses of customer data.',
    full_description:
      'GRI 418: Customer Privacy 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure. GRI 418-1 requires the total number of substantiated complaints received concerning breaches of customer privacy and losses of customer data, including: the total number of substantiated complaints received from outside parties and substantiated by the organization; the total number of substantiated complaints from regulatory bodies; the total number of identified leaks, thefts, or losses of customer data; and whether these figures are from identified violations or estimates. Organizations report that no complaints or data losses were received if this is the case. GRI 418 aligns with the EU General Data Protection Regulation (GDPR, Regulation (EU) 2016/679), which requires notification of personal data breaches to supervisory authorities within 72 hours and to affected individuals without undue delay. It also aligns with ISO/IEC 27001 (Information Security Management Systems) and ESRS S4 (Consumers and End-users) under the CSRD. Note: the GSSB has initiated a project to develop a new GRI Privacy Standard intended to replace GRI 418; organizations should monitor GRI communications for updates on the timeline and scope of the successor standard.',
    summary:
      'The GRI Topic Standard on customer privacy: the total number of substantiated complaints received concerning breaches of customer privacy and losses of customer data, including complaints from regulatory bodies.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 418', 'customer privacy', 'data protection', 'data breach', 'gdpr', 'privacy', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-419-socioeconomic-compliance-2016',
    title: 'GRI 419: Socioeconomic Compliance 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose significant fines and non-monetary sanctions for non-compliance with laws and regulations in social and economic areas.',
    full_description:
      'GRI 419: Socioeconomic Compliance 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure. GRI 419-1 requires the total monetary value of significant fines and total number of non-monetary sanctions for non-compliance with laws and/or regulations in the social and economic areas during the reporting period, including: the total monetary value of significant fines; the total number of non-monetary sanctions; any cases brought through dispute resolution mechanisms; and the breakdown of whether fines and sanctions relate to provisions enacted and in effect during the reporting period or to events from prior periods. GRI 419 serves as a catch-all governance disclosure covering legal and regulatory compliance in social and economic areas not captured by other GRI topic standards. Topics typically covered include tax law, employment law, consumer protection, product safety, anti-trust, and socioeconomic regulations. It aligns with ESRS G1 (Business Conduct) under the CSRD, the OECD Guidelines for Multinational Enterprises, and the UN Global Compact. Organizations report that no fines or sanctions were incurred if this is the case. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on socioeconomic compliance: significant fines and non-monetary sanctions for non-compliance with laws and regulations in social and economic areas.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 419', 'socioeconomic compliance', 'regulatory compliance', 'fines', 'sanctions', 'governance', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-402-labor-management-relations-2016',
    title: 'GRI 402: Labor/Management Relations 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose minimum notice periods for significant operational changes and whether these are specified in collective agreements.',
    full_description:
      'GRI 402: Labor/Management Relations 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure. GRI 402-1 requires the minimum number of weeks\' notice typically provided to employees and their elected representatives before the implementation of significant operational changes that could substantially affect them, and whether this notice period is specified in collective agreements. Significant operational changes include restructuring, closures, significant ownership changes, and material changes to production processes that substantially affect employment. The standard reflects the principle that workers and their representatives should receive advance notice of major changes to enable meaningful consultation, participation in transition planning, and protection of employment rights. GRI 402 aligns with ILO Convention C135 (Workers\' Representatives Convention, 1971), the ILO Tripartite Declaration of Principles concerning Multinational Enterprises and Social Policy (MNE Declaration), ESRS S1 (Own Workforce) under the CSRD, and the UN Guiding Principles on Business and Human Rights. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on labor/management relations: minimum notice periods for significant operational changes and whether those periods are specified in collective agreements.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 402', 'labor management relations', 'notice periods', 'collective agreements', 'worker rights', 'restructuring', 'social', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-201-economic-performance-2016',
    title: 'GRI 201: Economic Performance 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose direct economic value generated and distributed, financial implications from climate change, benefit plan obligations, and government financial assistance.',
    full_description:
      'GRI 201: Economic Performance 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains four topic-specific disclosures addressing the economic value an organization generates and how it distributes that value to stakeholders. GRI 201-1 requires the direct economic value generated and distributed (EVG&D): revenues; economic value distributed to operating costs, employee wages and benefits, payments to providers of capital, payments to government, and community investments; and economic value retained. GRI 201-2 requires financial implications and other risks and opportunities for the organization\'s activities due to climate change, covering physical and transition risks and opportunities, the methods and assumptions used to calculate financial implications, and how these factors are integrated into business and governance processes. This disclosure complements ESRS E1 (Climate Change) and IFRS S2 (Climate-related Disclosures). GRI 201-3 requires defined benefit plan obligations and other retirement plans, including whether the plan is funded or unfunded, the estimated value of associated assets, and the basis for calculating obligations. GRI 201-4 requires financial assistance received from government, including tax relief and credits, research and development grants, subsidies, investment grants, royalty holidays, export credits, and other material government assistance. GRI 201 provides the direct economic foundation for sustainability reporting and is referenced in the ESRS G1 (Business Conduct) context for economic governance. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on economic performance: direct economic value generated and distributed, financial implications of climate change, benefit plan obligations, and government financial assistance.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 201', 'economic performance', 'economic value generated', 'evgd', 'climate financial implications', 'government assistance', 'governance', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-205-anti-corruption-2016',
    title: 'GRI 205: Anti-Corruption 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose operations assessed for corruption risks, anti-corruption training and communication to employees and business partners, and confirmed incidents of corruption.',
    full_description:
      'GRI 205: Anti-Corruption 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains three topic-specific disclosures covering an organization\'s approach to managing corruption risk. GRI 205-1 requires the total number and percentage of operations assessed for risks related to corruption, and the significant risks identified through such assessments. GRI 205-2 requires total number and percentage of governance body members, employees, and business partners receiving the organization\'s anti-corruption policies and procedures by category, including: governance body members who received training on anti-corruption; employees who received training by employee category; and business partners to whom the organization communicated anti-corruption policies and procedures, broken down by type. GRI 205-3 requires confirmed incidents of corruption and actions taken, including: the total number and nature of confirmed incidents; the number of incidents in which employees were dismissed or disciplined for corruption; the number of incidents where contracts with business partners were terminated or not renewed due to violations related to corruption; and public legal cases regarding corruption and the outcomes or status of those cases. GRI 205 aligns with the UN Convention against Corruption (UNCAC), the OECD Anti-Bribery Convention, ISO 37001 (Anti-bribery Management Systems), ESRS G1 (Business Conduct) under the CSRD, the UN Global Compact Principle 10 on Anti-Corruption, and the OECD Guidelines for Multinational Enterprises. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on anti-corruption: operations assessed for corruption risks, anti-corruption training and communication, and confirmed incidents of corruption with actions taken.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 205', 'anti-corruption', 'bribery', 'corruption risk', 'anti-corruption training', 'governance', 'iso 37001', 'uncac', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-202-market-presence-2016',
    title: 'GRI 202: Market Presence 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose ratios of entry-level wages by gender compared to local minimum wages, and the proportion of senior management hired from the local community at significant locations of operation.',
    full_description:
      'GRI 202: Market Presence 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures addressing an organization\'s economic contribution to the communities in which it operates. GRI 202-1 requires the ratio of the standard entry-level wage by gender at significant locations of operation to the minimum wage, broken down by gender. Where a significant proportion of the workforce is compensated based on wages subject to minimum wage rules, this disclosure reveals the extent to which the organization\'s wages exceed local statutory minimums and whether entry-level wages differ by gender. GRI 202-2 requires the proportion of senior management at significant locations of operation that are hired from the local community, covering both permanent and non-permanent positions. This disclosure reflects the degree to which the organization contributes to local economic development by integrating local talent into leadership positions. GRI 202 aligns with the ILO Tripartite Declaration of Principles concerning Multinational Enterprises and Social Policy (MNE Declaration), ESRS S1 (Own Workforce) under the CSRD, ILO Convention C100 (Equal Remuneration), and the UN Global Compact Principles 3 and 6. It is referenced in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards and relates to the SDG 8 target on decent work and economic growth and SDG 5 on gender equality.',
    summary:
      'The GRI Topic Standard on market presence: entry-level wage ratios by gender compared to local minimum wages, and proportion of senior management hired from the local community at significant locations of operation.',
    category: 'Social',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 202', 'market presence', 'local employment', 'living wage', 'minimum wage', 'gender pay', 'senior management', 'local community', 'social', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-203-indirect-economic-impacts-2016',
    title: 'GRI 203: Indirect Economic Impacts 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose infrastructure investments and services supported, and significant indirect economic impacts including positive and negative effects on surrounding economies and communities.',
    full_description:
      'GRI 203: Indirect Economic Impacts 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures addressing the broader economic footprint an organization creates beyond its direct financial transactions. GRI 203-1 requires organizations to report examples of infrastructure investments and services supported, including the nature of the investment (commercial, in-kind, pro bono), the current and expected future effects on economies and communities, and whether investments are made for commercial reasons or as broader social commitments. Infrastructure examples include roads, utilities, hospitals, housing, schools, and digital connectivity. GRI 203-2 requires organizations to report significant indirect economic impacts and the extent of those impacts, both positive and negative. This includes impacts in supply and distribution chains, induced impacts from employee and supplier spending, leveraged private investment, changes in productivity of organizations, sectors, or economies, and socioeconomic impacts of improved or decreased access to goods and services. Organizations are expected to report the geographical scope and the significance of the impacts. GRI 203 aligns with the IFC Performance Standards 1 and 8 (Community Development), the UN SDG 9 (Industry, Innovation, Infrastructure), SDG 8 (Decent Work and Economic Growth), SDG 11 (Sustainable Cities and Communities), and ESRS G1 (Business Conduct). Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on indirect economic impacts: infrastructure investments and services supported, and significant positive or negative indirect economic impacts on surrounding communities and economies.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 203', 'indirect economic impacts', 'infrastructure investment', 'community development', 'induced impacts', 'local economy', 'sdg 9', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-204-procurement-practices-2016',
    title: 'GRI 204: Procurement Practices 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose the proportion of spending on local suppliers at significant locations of operation.',
    full_description:
      'GRI 204: Procurement Practices 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure. GRI 204-1 requires the percentage of the procurement budget used for significant locations of operation that is spent on suppliers local to that operation. A local supplier is one where the headquarters of the supplier, or the contracting part of the organization, is based in the same geographical market as the significant location of operation. Organizations should also describe their definition of what is considered local and the geographical boundary used. This disclosure reveals the extent to which the organization contributes to the economic development of the communities in which it operates through its purchasing decisions. Local procurement supports local employment, builds local supplier capacity, reduces transportation-related environmental impacts, and strengthens supply-chain resilience. GRI 204 aligns with the OECD Guidelines for Multinational Enterprises, the ILO MNE Declaration, ESRS G1 (Business Conduct) and ESRS S3 (Affected Communities) under the CSRD, IFC Performance Standard 1, and the UN SDG 8 (Decent Work and Economic Growth) and SDG 12 (Responsible Consumption and Production). Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on procurement practices: proportion of spending on local suppliers at significant locations of operation, supporting local economic development and supply-chain resilience.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 204', 'procurement practices', 'local suppliers', 'supply chain', 'local economic development', 'responsible sourcing', 'sdg 8', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-206-anti-competitive-behavior-2016',
    title: 'GRI 206: Anti-competitive Behavior 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose legal actions pending or completed during the reporting period regarding anti-competitive behavior, anti-trust, and monopoly violations and their outcomes.',
    full_description:
      'GRI 206: Anti-competitive Behavior 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure. GRI 206-1 requires the total number of legal actions pending or completed during the reporting period regarding anti-competitive behavior and violations of anti-trust and monopoly legislation, and the outcomes of such actions (including adjudication, settlement, or ongoing proceedings). Anti-competitive behavior includes price-fixing, bid-rigging, market allocation agreements, predatory pricing, abuse of dominant market position, and exclusive dealing arrangements that foreclose competition. This disclosure covers actions brought by public authorities (competition authorities, regulators) and private parties (companies, individuals). Organizations are expected to describe the nature of the actions, the relevant markets or jurisdictions, and any settlements, fines, or remedies ordered. GRI 206 aligns with ESRS G1 (Business Conduct) under the CSRD, the OECD Guidelines for Multinational Enterprises (Chapter X on Competition), the UN Global Compact Principle 10 on Anti-Corruption, and national competition law frameworks including EU Regulation 1/2003 and the US Sherman and Clayton Acts. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on anti-competitive behavior: number of legal actions pending or completed for anti-competitive behavior, anti-trust, and monopoly violations, and their outcomes.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 206', 'anti-competitive behavior', 'antitrust', 'monopoly', 'competition law', 'price-fixing', 'market abuse', 'governance', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-301-materials-2016',
    title: 'GRI 301: Materials 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose materials used by weight or volume, the proportion of recycled input materials, and the percentage of reclaimed products and packaging materials.',
    full_description:
      'GRI 301: Materials 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains three topic-specific disclosures covering the organization\'s use of materials and progress toward circular economy goals. GRI 301-1 requires the total weight or volume of materials used to produce and package the organization\'s products and services during the reporting period, split between non-renewable materials (fossil fuels, metals, minerals) and renewable materials (plant-based or animal-sourced inputs). GRI 301-2 requires the percentage of recycled input materials used to manufacture the organization\'s primary products and services, helping to quantify the incorporation of secondary raw materials. GRI 301-3 requires the percentage of reclaimed products and their packaging materials for each product category, supporting disclosure on product take-back schemes, refurbishment, and end-of-life recovery programs. GRI 301 supports circular economy reporting under ESRS E5 (Resource Use and Circular Economy) and aligns with the EU Eco-design for Sustainable Products Regulation (ESPR) and the Digital Product Passport (DPP) concept. It also informs life cycle assessment (LCA) and industrial ecology practices governed by ISO 14040 and ISO 14044. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on materials: total materials used by weight or volume (renewable and non-renewable), percentage of recycled input materials, and percentage of reclaimed products and packaging.',
    category: 'Circularity',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 301', 'materials', 'recycled materials', 'circular economy', 'resource use', 'product take-back', 'LCA', 'environment', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-302-energy-2016',
    title: 'GRI 302: Energy 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose energy consumption within and outside the organization, energy intensity, reductions in energy consumption, and reductions in energy requirements of products and services.',
    full_description:
      'GRI 302: Energy 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains five topic-specific disclosures on the organization\'s energy consumption and efficiency performance. GRI 302-1 requires total fuel consumption from non-renewable sources (coal, natural gas, petroleum products) and renewable sources (biofuels, solar, wind, geothermal), plus purchased electricity, heat, steam, and cooling, all reported in joules or multiples. GRI 302-2 requires energy consumption outside of the organization related to upstream and downstream activities in the value chain, aligned with GHG Protocol Scope 3 categories. GRI 302-3 requires energy intensity expressed as a ratio per unit of output (revenue, product unit, area, or other suitable denominator), enabling year-on-year comparability of energy efficiency. GRI 302-4 requires the amount of reduction in energy consumption achieved in the reporting period as a direct result of conservation and efficiency initiatives, with methodological detail. GRI 302-5 requires the reduction in energy requirements of sold products and services compared to a base year, supporting assessment of product energy performance improvements. GRI 302 aligns with ESRS E1 (Climate Change) under the CSRD for energy-related metrics, ISO 50001:2018 (Energy Management Systems), the CDP Climate Change questionnaire, and IFRS S2 (Climate-related Disclosures). Note: GRI 103: Energy 2025 was published by GSSB in 2025 as the successor standard to GRI 302; organizations applying GRI 302 for reporting periods before the effective date of GRI 103 continue to use this standard. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on energy: energy consumption within and outside the organization, energy intensity ratio, reductions in energy consumption, and reductions in energy requirements of products and services.',
    category: 'Climate',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 302', 'energy', 'energy consumption', 'energy intensity', 'renewable energy', 'energy efficiency', 'iso 50001', 'environment', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-304-biodiversity-2016',
    title: 'GRI 304: Biodiversity 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose operational sites in or near protected areas, significant impacts on biodiversity, habitats protected or restored, and IUCN Red List species affected by operations.',
    full_description:
      'GRI 304: Biodiversity 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains four topic-specific disclosures addressing the organization\'s impacts on biodiversity and ecosystems. GRI 304-1 requires a list of all operational sites owned, leased, or managed in or adjacent to protected areas and areas of high biodiversity value outside protected areas, including location, size (in hectares), habitat type, and applicable protection status. GRI 304-2 requires a description of significant direct and indirect impacts of the organization\'s activities, products, and services on biodiversity, covering impacts on ecosystems, habitats, and species — whether positive or negative — and including construction, pollution, invasive species introduction, and resource extraction. GRI 304-3 requires the total number and size of protected or restored habitats, their partnership arrangements, success monitoring methods, and whether restoration was independently verified by external professionals. GRI 304-4 requires the total number of IUCN Red List species and national conservation list species with habitats in areas affected by operations, by level of extinction risk (Critically Endangered, Endangered, Vulnerable, Near Threatened, Least Concern). GRI 304 aligns with ESRS E4 (Biodiversity and Ecosystems) under the CSRD, the TNFD LEAP (Locate, Evaluate, Assess, Prepare) approach, SBTN (Science Based Targets for Nature) methodology, and the Kunming-Montreal Global Biodiversity Framework (KM-GBF) Target 15 on business biodiversity disclosure. Note: GRI 101: Biodiversity 2024 was published by GSSB in 2024 as the successor standard to GRI 304; organizations applying GRI 304 for reporting periods before the effective date of GRI 101 continue to use this standard. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on biodiversity: operational sites in protected areas, significant biodiversity impacts, habitats protected or restored, and IUCN Red List species affected by operations.',
    category: 'Nature',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 304', 'biodiversity', 'ecosystems', 'protected areas', 'IUCN Red List', 'habitat restoration', 'nature', 'TNFD', 'SBTN', 'environment', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-307-environmental-compliance-2016',
    title: 'GRI 307: Environmental Compliance 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose significant non-compliance with environmental laws and regulations, including fines, non-monetary sanctions, and dispute resolution cases.',
    full_description:
      'GRI 307: Environmental Compliance 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains one topic-specific disclosure: GRI 307-1 requires the total monetary value of significant fines and the total number of non-monetary sanctions for non-compliance with environmental laws and regulations during the reporting period, as well as cases brought through dispute resolution mechanisms. The organization must identify whether the significant instance of non-compliance resulted in a fine or penalty, a warning, or involvement in a voluntary code. The standard distinguishes between non-compliance with international declarations and conventions, national, regional, and local regulations, and voluntary codes. GRI 307 aligns with the ESRS framework, particularly ESRS G1 (Business Conduct) provisions on compliance, and supports disclosure expectations under ESRS E1 through E5 regarding legal compliance with environmental laws on climate, pollution, water, biodiversity, and resource use. GRI 307 is a counterpart to GRI 419 (Socioeconomic Compliance 2016), which covers non-compliance in social and economic areas. Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on environmental compliance: significant fines, non-monetary sanctions, and dispute resolution cases for non-compliance with environmental laws and regulations.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 307', 'environmental compliance', 'fines', 'sanctions', 'environmental law', 'regulatory compliance', 'governance', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
  {
    id: 'standard-gri-308-supplier-environmental-assessment-2016',
    title: 'GRI 308: Supplier Environmental Assessment 2016',
    description:
      'A GRI Topic Standard requiring organizations to disclose new suppliers screened using environmental criteria and significant negative environmental impacts identified in the supply chain.',
    full_description:
      'GRI 308: Supplier Environmental Assessment 2016 is a topic standard published by the Global Sustainability Standards Board (GSSB) in October 2016, effective for reports published on or after 1 July 2018. It contains two topic-specific disclosures addressing environmental due diligence across the supply chain. GRI 308-1 requires the percentage of new suppliers that were screened using environmental criteria as part of supplier selection and engagement processes. GRI 308-2 requires the number of suppliers assessed for environmental impacts, the number of suppliers identified as having significant actual and potential negative environmental impacts, the percentage of suppliers identified as having significant impacts with which improvements were agreed upon as a result of assessment, and the percentage of suppliers identified as having significant impacts with which relationships were terminated as a result, and why. GRI 308 aligns with ISO 14001:2015 (Environmental Management Systems) supplier requirements, the OECD Due Diligence Guidance for Responsible Business Conduct, ESRS E1 through E5 value-chain provisions under the CSRD, and the CSDDD (EU Corporate Sustainability Due Diligence Directive) supply chain due diligence obligations. GRI 308 is the environmental counterpart to GRI 414 (Supplier Social Assessment 2016). Required in GRI 11 (Oil and Gas 2021), GRI 12 (Coal 2022), and GRI 13 (Agriculture, Aquaculture and Fishing 2022) sector standards.',
    summary:
      'The GRI Topic Standard on supplier environmental assessment: new suppliers screened using environmental criteria and significant negative environmental impacts in the supply chain.',
    category: 'Governance',
    region: 'Global',
    status: 'in_force',
    effective_date: '2018-07-01',
    source_name: 'Global Reporting Initiative',
    source_url: 'https://www.globalreporting.org/standards/gri-standards-download-center/',
    tags: ['gri', 'gri 308', 'supplier assessment', 'supply chain', 'environmental criteria', 'due diligence', 'ISO 14001', 'CSDDD', 'environment', 'topic standard'],
    created_at: '2016-10-01T00:00:00.000Z',
    updated_at: '2016-10-01T00:00:00.000Z',
    umbrella_id: 'framework-gri-standards',
    umbrella_relation: 'part_of' as const,
    version_label: 'Topic Standard',
  },
]

function getRegulationDateValue(regulation: Partial<RegulationRecord>) {
  return regulation.effective_date || regulation.updated_at || regulation.created_at || ''
}

function normalizeRegulationRecord(record: RegulationRecord): RegulationRecord {
  const status = normalizeStatus(record.status)
  const regulation_type = getRegulationTypeKey(record)
  const topics = normalizeRegulationTopics(record.topics) 
  const resolvedTopics = topics.length > 0 ? topics : inferRegulationTopics(record)
  const date_precision = inferDatePrecision(record)
  const sanitizedSourceUrl = sanitizeFrontEndSourceUrl(record.source_url)
  const sanitizedOfficialSourceUrl = sanitizeFrontEndSourceUrl(record.official_source_url)
  const sanitizedPolicyPageUrl = sanitizeFrontEndSourceUrl(record.policy_page_url)
  const persistedSourceLinkKind = record.source_link_kind ?? null
  const link_status = inferLinkStatus({
    source_url: sanitizedOfficialSourceUrl || sanitizedSourceUrl || '',
    link_status: record.link_status,
    source_link_kind: persistedSourceLinkKind,
  })

  return {
    ...record,
    source_name: sanitizeFrontEndSourceName(record.source_name),
    source_url: sanitizedSourceUrl || '',
    human_verified: record.human_verified ?? false,
    status,
    jurisdiction_type: record.jurisdiction_type || inferJurisdictionType(record.jurisdiction_value || record.region),
    jurisdiction_value: record.jurisdiction_value || record.region,
    published_date: record.published_date ?? null,
    adopted_date: record.adopted_date ?? null,
    date_precision,
    regulation_type,
    topics: resolvedTopics,
    link_status,
    official_source_url: sanitizedOfficialSourceUrl,
    policy_page_url: sanitizedPolicyPageUrl,
    source_link_kind: persistedSourceLinkKind,
    source_health: record.source_health || inferSourceHealth(link_status),
  }
}

function normalizeSourceDocumentRecord(document: RegulationSourceDocument): RegulationSourceDocument {
  return {
    ...document,
    source_name: sanitizeFrontEndSourceName(document.source_name),
    source_url: sanitizeFrontEndSourceUrl(document.source_url) || '',
    official_source_url: sanitizeFrontEndSourceUrl(document.official_source_url) || null,
    policy_page_url: sanitizeFrontEndSourceUrl(document.policy_page_url) || null,
    document_url: sanitizeFrontEndSourceUrl(document.document_url) || null,
    archived_public_url: sanitizeFrontEndSourceUrl(document.archived_public_url) || null,
  }
}

function sortByDateDesc(a: RegulationRecord, b: RegulationRecord) {
  return new Date(getRegulationDateValue(b)).getTime() - new Date(getRegulationDateValue(a)).getTime()
}

function buildRegulationIdentityKey(value?: string | null) {
  return (value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function collectRegulationIdentityKeys(regulation: Pick<RegulationRecord, 'title' | 'formal_title'>) {
  return [buildRegulationIdentityKey(regulation.title), buildRegulationIdentityKey(regulation.formal_title)].filter(Boolean)
}

async function findCanonicalDatabaseRegulationMatch(supplemental: RegulationRecord) {
  const exactCandidates = [
    ['title', supplemental.title],
    ['formal_title', supplemental.title],
    ['title', supplemental.formal_title],
    ['formal_title', supplemental.formal_title],
  ] as const

  for (const [field, value] of exactCandidates) {
    if (!value) continue
    const { data, error } = await supabase.from('regulations').select('*').eq(field, value).limit(1).maybeSingle()
    if (error) {
      console.error('Error resolving canonical regulation match:', error)
      continue
    }
    if (data) return applyHumanVerifiedOverride(normalizeRegulationRecord(data as RegulationRecord))
  }

  return null
}

export function getSupplementalRegulations() {
  return applyHumanVerifiedOverrides([...SUPPLEMENTAL_REGULATIONS].map(normalizeRegulationRecord)).sort(sortByDateDesc)
}

export async function fetchAllRegulations() {
  const PAGE_SIZE = 1000
  const all: RegulationRecord[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('regulations')
      .select('*')
      .order('effective_date', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error('Error fetching regulations:', error)
      return all.length > 0 ? all.sort(sortByDateDesc) : getSupplementalRegulations()
    }

    const rows = ((data || []) as RegulationRecord[]).map(normalizeRegulationRecord)
    all.push(...rows)

    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  // Merge supplemental records (slug-based IDs, never collide with DB UUIDs)
  const dbIds = new Set(all.map((r) => r.id))
  const dbIdentityKeys = new Set(all.flatMap((regulation) => collectRegulationIdentityKeys(regulation)))
  const supplemental = getSupplementalRegulations().filter((regulation) => {
    if (dbIds.has(regulation.id)) return false
    return !collectRegulationIdentityKeys(regulation).some((key) => dbIdentityKeys.has(key))
  })
  return applyHumanVerifiedOverrides([...all, ...supplemental]).sort(sortByDateDesc)
}

export async function fetchRegulationById(id: string) {
  const { data, error } = await supabase.from('regulations').select('*').eq('id', id).maybeSingle()
  if (error) {
    console.error('Error fetching regulation:', error)
    return getSupplementalRegulations().find((regulation) => regulation.id === id) || null
  }

  if (data) return applyHumanVerifiedOverride(normalizeRegulationRecord(data as RegulationRecord))

  const supplemental = getSupplementalRegulations().find((regulation) => regulation.id === id) || null
  if (!supplemental) return null

  const canonicalMatch = await findCanonicalDatabaseRegulationMatch(supplemental)
  return applyHumanVerifiedOverride(canonicalMatch || supplemental)
}

export async function fetchRegulationSourceDocuments(regulationId: string) {
  const { data, error } = await supabase
    .from('regulation_source_documents')
    .select('*')
    .eq('regulation_id', regulationId)
    .order('version_label', { ascending: false })
    .order('document_type', { ascending: false })

  if (error) {
    console.error('Error fetching regulation source documents:', error)
    return []
  }

  return ((data || []) as RegulationSourceDocument[]).map(normalizeSourceDocumentRecord).filter((document) => {
    const candidateUrl = `${document.document_url || ''} ${document.archived_public_url || ''}`.toLowerCase()

    if (document.document_type === 'html' || document.document_type === 'pdf') return true
    if (candidateUrl.includes('.pdf')) return true
    if (document.document_url) return true
    return false
  })
}

export async function fetchRegulationSourceDocumentsByIds(regulationIds: string[]) {
  const uniqueIds = [...new Set(regulationIds.filter(Boolean))]
  if (uniqueIds.length === 0) return new Map<string, RegulationSourceDocument[]>()

  const { data, error } = await supabase
    .from('regulation_source_documents')
    .select('*')
    .in('regulation_id', uniqueIds)
    .order('version_label', { ascending: false })
    .order('document_type', { ascending: false })

  if (error) {
    console.error('Error fetching regulation source documents by ids:', error)
    return new Map<string, RegulationSourceDocument[]>()
  }

  const documentsByRegulationId = new Map<string, RegulationSourceDocument[]>()
  for (const document of ((data || []) as RegulationSourceDocument[]).map(normalizeSourceDocumentRecord)) {
    const candidateUrl = `${document.document_url || ''} ${document.archived_public_url || ''}`.toLowerCase()

    const keep =
      document.document_type === 'html' ||
      document.document_type === 'pdf' ||
      candidateUrl.includes('.pdf') ||
      !!document.document_url

    if (!keep) continue

    const list = documentsByRegulationId.get(document.regulation_id) || []
    list.push(document)
    documentsByRegulationId.set(document.regulation_id, list)
  }

  return documentsByRegulationId
}

export async function fetchRegulationSourceDocumentById(documentId: string) {
  const { data, error } = await supabase
    .from('regulation_source_documents')
    .select('*')
    .eq('id', documentId)
    .maybeSingle()

  if (error) {
    console.error('Error fetching regulation source document:', error)
    return null
  }

  return data ? normalizeSourceDocumentRecord(data as RegulationSourceDocument) : null
}

export async function fetchRegulationSourceChunks(documentId: string) {
  const { data, error } = await supabase
    .from('regulation_source_chunks')
    .select('*')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })

  if (error) {
    console.error('Error fetching regulation source chunks:', error)
    return []
  }

  return (data || []) as RegulationSourceChunk[]
}

export async function fetchRelatedRegulations(umbrellaId: string): Promise<RegulationRecord[]> {
  const { data, error } = await supabase
    .from('regulations')
    .select('*')
    .eq('umbrella_id', umbrellaId)
    .order('effective_date', { ascending: true })

  const dbResults = error ? [] : ((data || []) as RegulationRecord[]).map(normalizeRegulationRecord)
  if (error) console.error('Error fetching related regulations:', error)

  // Always merge supplemental children (handles slug-based umbrella_id families)
  const dbIds = new Set(dbResults.map((r) => r.id))
  const dbIdentityKeys = new Set(dbResults.flatMap((regulation) => collectRegulationIdentityKeys(regulation)))
  const supplementalChildren = getSupplementalRegulations().filter(
    (r) =>
      r.umbrella_id === umbrellaId &&
      !dbIds.has(r.id) &&
      !collectRegulationIdentityKeys(r).some((key) => dbIdentityKeys.has(key))
  )

  return [...dbResults, ...supplementalChildren].sort((a, b) =>
    new Date(getRegulationDateValue(a)).getTime() - new Date(getRegulationDateValue(b)).getTime()
  )
}

export async function fetchRegulationSourceChunk(documentId: string, chunkIndex: number) {
  const { data, error } = await supabase
    .from('regulation_source_chunks')
    .select('*')
    .eq('document_id', documentId)
    .eq('chunk_index', chunkIndex)
    .maybeSingle()

  if (error) {
    console.error('Error fetching regulation source chunk:', error)
    return null
  }

  return (data as RegulationSourceChunk | null) || null
}
