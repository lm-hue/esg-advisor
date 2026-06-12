export type ESGCategory = 'Climate' | 'Circularity' | 'Nature' | 'Social' | 'Governance'
export type LegacyRegulationStatus = 'in_force' | 'draft' | 'adopted' | 'amended' | 'repealed'
export type RegulationLifecycleStatus =
  | 'proposal'
  | 'consultation'
  | 'draft'
  | 'adopted_not_yet_effective'
  | 'effective'
  | 'amended_effective'
  | 'repealed'
  | 'superseded'
  | 'archived'
export type RegulationStatus = RegulationLifecycleStatus | LegacyRegulationStatus
export type JurisdictionType =
  | 'country'
  | 'supranational_region'
  | 'global'
  | 'standards_body'
  | 'exchange_or_regulator'
export type DatePrecision = 'year' | 'month' | 'day'
export type RegulationType =
  | 'law_or_regulation'
  | 'proposal_or_draft'
  | 'guidance'
  | 'standard'
  | 'framework'
  | 'market_rule'
  | 'rating_or_benchmark'
  | 'policy_plan'
export type RegulationTopic =
  | 'reporting'
  | 'taxonomy'
  | 'governance'
  | 'human_rights'
  | 'supply_chain'
  | 'biodiversity'
  | 'water'
  | 'pollution'
  | 'waste'
  | 'energy'
  | 'climate'
  | 'finance'
export type LinkStatus =
  | 'working_website'
  | 'working_pdf'
  | 'archived_pdf'
  | 'broken'
  | 'missing'
  | 'unknown'
export type SourceHealth = 'healthy' | 'archived' | 'broken' | 'missing' | 'unknown'
export type SourceLinkKind = 'official' | 'archived_pdf' | 'reference_pdf' | 'reference_page'
export type ComplianceStatus = 'not_started' | 'in_progress' | 'compliant' | 'exempt' | 'monitoring'

export type UmbrellaRelation = 'part_of' | 'version' | 'amendment' | 'component'

export interface Regulation {
  id: string
  title: string
  description: string
  full_description: string
  category: ESGCategory
  region: string
  status: RegulationStatus
  effective_date: string
  source_name: string
  source_url: string
  official_source_url?: string | null
  policy_page_url?: string | null
  source_link_kind?: SourceLinkKind | null
  human_verified?: boolean
  tags: string[]
  created_at: string
  updated_at: string
  jurisdiction_type?: JurisdictionType
  jurisdiction_value?: string
  published_date?: string | null
  adopted_date?: string | null
  date_precision?: DatePrecision | null
  regulation_type?: RegulationType | null
  topics?: RegulationTopic[]
  link_status?: LinkStatus | null
  source_health?: SourceHealth | null
  // Verbatim official/legal name (e.g. from Carrots & Sticks)
  formal_title?: string
  // Family / umbrella relationships (optional — all legacy entries omit these)
  umbrella_id?: string
  umbrella_relation?: UmbrellaRelation
  version_label?: string
}

export type RegulationSourceDocumentType = 'html' | 'pdf' | 'other'

export interface RegulationSourceDocument {
  id: string
  regulation_id: string
  title: string
  source_name: string
  source_url: string
  official_source_url?: string | null
  policy_page_url?: string | null
  source_link_kind?: SourceLinkKind | null
  document_url?: string | null
  document_type: RegulationSourceDocumentType
  version_label: string
  archived_storage_path?: string | null
  archived_public_url?: string | null
  archived_mime_type?: string | null
  content_sha256?: string | null
  fetch_status: 'pending' | 'indexed' | 'failed'
  error_message?: string | null
  extracted_text?: string | null
  last_indexed_at?: string | null
  created_at: string
  updated_at: string
}

export interface RegulationSourceChunk {
  document_id: string
  regulation_id: string
  chunk_index: number
  content: string
  created_at: string
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

export { SELECTABLE_GEOGRAPHY_VALUES as REGIONS } from '../lib/geography'

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
    term: 'ISSA 5000',
    definition: 'International Standard on Sustainability Assurance 5000 - the IAASB standard setting general requirements for limited and reasonable assurance engagements over sustainability information.'
  },
  {
    term: 'IESSA',
    definition: 'International Ethics Standards for Sustainability Assurance - the IESBA ethics and independence standards for sustainability assurance practitioners and engagements.'
  },
  {
    term: 'SASB Standards',
    definition: 'Industry-based sustainability disclosure standards maintained by the IFRS Foundation that identify financially material sustainability topics and metrics for specific industries.'
  },
  {
    term: 'SICS',
    definition: 'Sustainable Industry Classification System - the SASB classification system that groups companies based on shared sustainability-related risks and opportunities to help identify the most relevant industry standard.'
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
    definition: 'Direct greenhouse gas emissions from operations or sources owned or controlled by the reporting company.'
  },
  {
    term: 'Scope 2',
    definition: 'Indirect emissions from the generation of purchased or acquired electricity, steam, heating, or cooling consumed by the reporting company.'
  },
  {
    term: 'Scope 3',
    definition: 'All other indirect emissions, not included in Scope 2, that occur in the value chain of the reporting company, including upstream and downstream emissions.'
  },
  {
    term: 'Limited Assurance',
    definition: 'An assurance conclusion expressed in a form that conveys whether anything has come to the practitioner’s attention that causes them to believe the sustainability information is materially misstated.'
  },
  {
    term: 'Reasonable Assurance',
    definition: 'A high, but not absolute, level of assurance in which the practitioner obtains sufficient appropriate evidence to express a positive conclusion on whether the sustainability information is free from material misstatement.'
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
    term: 'GRI Standards',
    definition: 'The modular sustainability reporting standards published by the Global Reporting Initiative for reporting an organization’s material impacts on the economy, environment, and people.'
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
    definition: 'In ISO 14068-1, a state achieved when an entity has reduced its carbon footprint and then addresses remaining emissions and carbon removals using a defined hierarchy and credible criteria.'
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
    definition: 'Business Responsibility and Sustainability Reporting — the SEBI-mandated sustainability reporting framework for the top 1,000 listed companies in India from FY2022-23, structured around nine NGRBC principles across environmental, social, and governance topics, with BRSR Core requiring third-party assurance for the largest companies.'
  },
  {
    term: 'Greenwashing',
    definition: 'Making false or misleading claims about environmental benefits of products or practices.'
  },
  {
    term: 'IWA 48',
    definition: 'ISO IWA 48:2024, Environment, social and governance (ESG) Implementation principles - an ISO International Workshop Agreement that gives organizations a high-level structure and principles for embedding ESG practices.'
  },
  {
    term: 'International Workshop Agreement (IWA)',
    definition: 'An ISO deliverable developed through a workshop process to provide internationally agreed guidance quickly in emerging areas; IWA 48 is the ESG implementation principles document.'
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
  {
    term: 'LEAP',
    definition: 'TNFD assessment approach for nature-related issues: Locate, Evaluate, Assess, and Prepare.'
  },
  {
    term: 'Transition Plan',
    definition: 'A strategy, targets, actions, and resource deployment an entity uses to respond to climate-related risks and opportunities in its transition to a lower-carbon or climate-resilient economy.'
  },
  {
    term: 'CO2 Removals',
    definition: 'Activities that remove carbon dioxide from the atmosphere and store it in land-based or geologic carbon pools, subject to accounting rules and safeguards.'
  },
  {
    term: 'Land-Sector Activities',
    definition: 'Operational or value-chain activities linked to agricultural land use, land management, land use change, and related emissions or removals covered by the GHG Protocol Land Sector and Removals Standard.'
  },
  {
    term: 'VSME',
    definition: 'Voluntary Sustainability Reporting Standard for non-listed Micro-, Small-, and Medium-sized Enterprises recommended by the European Commission to streamline sustainability disclosures for smaller companies.'
  },
  {
    term: 'Basic Module',
    definition: 'The entry-level VSME reporting module intended for all SMEs and especially micro-undertakings, focused on core sustainability disclosures most commonly requested by value-chain partners.'
  },
  {
    term: 'Comprehensive Module',
    definition: 'The additional VSME reporting module that builds on the Basic Module with further disclosures often requested by banks, investors, and value-chain partners.'
  },
  {
    term: 'Responsible Business Conduct',
    definition: 'A risk-based business approach promoted by the OECD under which companies avoid and address adverse impacts on workers, human rights, the environment, consumers, and governance across operations and business relationships.'
  },
  {
    term: 'RBC',
    definition: 'Responsible Business Conduct, the OECD concept covering how companies should avoid and address adverse impacts linked to their operations, supply chains, and business relationships.'
  },
  {
    term: 'UN Global Compact',
    definition: 'A United Nations-backed voluntary corporate sustainability initiative that asks participating companies to align strategies and operations with Ten Principles covering human rights, labour, environment, and anti-corruption.'
  },
  {
    term: 'Environmental Management System (EMS)',
    definition: 'A structured system, such as one built under ISO 14001, that helps an organization manage environmental responsibilities, compliance obligations, objectives, and continual improvement.'
  },
  {
    term: 'Ten Principles',
    definition: 'The UN Global Compact’s ten foundational corporate sustainability principles spanning human rights, labour, environment, and anti-corruption.'
  },
  {
    term: 'Communication on Progress (CoP)',
    definition: 'The UN Global Compact’s annual disclosure through which participating companies report on progress in implementing the Ten Principles and contributing to the Sustainable Development Goals.'
  },
  {
    term: 'OECD Guidelines for MNEs on RBC',
    definition: 'The OECD Guidelines for Multinational Enterprises on Responsible Business Conduct are government-backed recommendations setting expectations for responsible business conduct across areas including human rights, environment, disclosure, and supply chain due diligence.'
  },
  {
    term: 'NCP',
    definition: 'National Contact Point for Responsible Business Conduct - a national mechanism established by countries adhering to the OECD Guidelines to promote the Guidelines and handle non-judicial grievance cases known as specific instances.'
  },
  {
    term: 'IFRS Sustainability Disclosure Taxonomy',
    definition: 'The IFRS Foundation taxonomy that provides tagging elements for sustainability-related financial disclosures prepared under IFRS Sustainability Disclosure Standards, making them digitally searchable and comparable.'
  },
  {
    term: 'SASB Standards Taxonomy',
    definition: 'The IFRS Foundation taxonomy that provides tagging elements for sustainability-related financial information prepared in accordance with the SASB Standards, enabling more consistent digital extraction, comparison, and analysis.'
  },
  {
    term: 'Sustainability-related Risks and Opportunities',
    definition: 'In IFRS S1, sustainability-related risks and opportunities are risks and opportunities that could reasonably be expected to affect an entity’s cash flows, access to finance, or cost of capital over the short, medium, or long term.'
  },
  {
    term: 'Value Chain',
    definition: 'In IFRS S1, the full range of interactions, resources, and relationships related to an entity’s business model and external environment, including its operations, supply, marketing, distribution, and the financing, geographical, geopolitical, and regulatory environments in which it operates.'
  },
  {
    term: 'Connected Information',
    definition: 'In IFRS S1, sustainability-related financial information provided in a way that helps users understand the connections between the items to which the information relates and between disclosures across the entity’s general purpose financial reports.'
  },
  {
    term: 'General Purpose Financial Reports',
    definition: 'Reports designed to meet the common information needs of existing and potential investors, lenders, and other creditors when making decisions about providing resources to the entity.'
  },
  {
    term: 'Climate-related Physical Risks',
    definition: 'Under IFRS S2, climate-related physical risks arise from the physical effects of climate change, including acute events and longer-term chronic shifts in climate patterns.'
  },
  {
    term: 'Climate-related Transition Risks',
    definition: 'Under IFRS S2, climate-related transition risks arise from efforts to move to a lower-carbon economy, including policy, legal, technology, market, and reputation changes.'
  },
  {
    term: 'XBRL',
    definition: 'eXtensible Business Reporting Language - a structured digital reporting language used to tag disclosures so they can be machine-readable, extracted, compared, and analyzed more efficiently.'
  },
  {
    term: 'CDP Score',
    definition: 'The score CDP assigns based on an organization’s questionnaire response to evaluate the level and quality of environmental disclosure and action.'
  },
  {
    term: 'TPT',
    definition: 'Transition Plan Taskforce - the initiative that developed a disclosure framework and implementation guidance to help organizations prepare and disclose credible climate transition plans.'
  },
  {
    term: 'Net-Zero Standard',
    definition: 'The SBTi standard that gives companies the guidance, criteria, and recommendations needed to set science-based net-zero targets.'
  },
  {
    term: 'Residual Emissions',
    definition: 'In the SBTi Corporate Net-Zero Standard, residual emissions are the greenhouse gas emissions that remain after a company has achieved its long-term science-based target through deep decarbonization.'
  },
  {
    term: 'Neutralization',
    definition: 'In the SBTi Corporate Net-Zero Standard, neutralization means taking actions that permanently remove carbon from the atmosphere to counterbalance residual emissions after deep emissions reductions.'
  },
  {
    term: 'BVCM',
    definition: 'Beyond Value Chain Mitigation, an SBTi concept for climate mitigation actions a company takes outside its value chain in addition to cutting its own emissions.'
  },
  {
    term: 'CFP',
    definition: 'Carbon Footprint of a Product. In ISO 14067, the quantified greenhouse gas emissions and removals associated with the life cycle of a product, expressed for the climate-change impact category.'
  },
  {
    term: 'UNGPs',
    definition: 'UN Guiding Principles on Business and Human Rights - the UN-endorsed global framework built around the state duty to protect, the corporate responsibility to respect, and access to remedy.'
  },
  {
    term: 'Protect, Respect and Remedy Framework',
    definition: 'The three-pillar architecture underlying the UN Guiding Principles on Business and Human Rights: states protect human rights, businesses respect human rights, and affected people should have access to remedy.'
  },
  {
    term: 'Human Rights Due Diligence',
    definition: 'An ongoing risk-based process under the UN Guiding Principles through which businesses identify, prevent, mitigate, and account for how they address adverse human rights impacts.'
  },
  {
    term: 'CAHRA',
    definition: 'Conflict-Affected and High-Risk Areas. In the OECD minerals due diligence guidance, areas identified by the presence of armed conflict, widespread violence, or other risks of harm to people.'
  },
  {
    term: 'OECD Minerals Guidance',
    definition: 'The OECD Due Diligence Guidance for Responsible Supply Chains of Minerals from Conflict-Affected and High-Risk Areas, which provides government-endorsed step-by-step recommendations for responsible mineral sourcing.'
  },
  {
    term: 'PRI',
    definition: 'Principles for Responsible Investment - a global investor-backed framework and signatory network built around six principles for incorporating ESG factors into investment practice.'
  },
  {
    term: 'UNEP FI',
    definition: 'United Nations Environment Programme Finance Initiative - a UN-backed partnership with banks, insurers, and investors that develops sustainable finance frameworks and industry principles.'
  },
  {
    term: 'PRB',
    definition: 'Principles for Responsible Banking - the UNEP FI framework and signatory initiative that guides banks to align strategy, targets, governance, and disclosures with societal goals, including the Paris Agreement and the Sustainable Development Goals.'
  },
  {
    term: 'PSI',
    definition: 'Principles for Sustainable Insurance - the UNEP FI framework and signatory initiative that helps insurers integrate environmental, social, and governance issues into decision-making, underwriting, risk management, investment, and stakeholder engagement.'
  },
  {
    term: 'Signatory',
    definition: 'An organization that formally commits to a voluntary framework or initiative and is expected to implement its principles and any related accountability or reporting commitments.'
  },
  {
    term: 'Responsible Investment',
    definition: 'An investment approach that incorporates environmental, social, and governance issues into investment analysis, decision-making, ownership, and reporting practices.'
  },
  {
    term: 'Active Ownership',
    definition: 'An investment stewardship approach referenced by the PRI in which investors use ownership rights and engagement practices to influence investee companies on ESG matters.'
  },
  {
    term: 'Corporate GHG Inventory',
    definition: 'A company-level accounting of greenhouse gas emissions prepared under the GHG Protocol Corporate Standard using defined organizational and operational boundaries.'
  },
  {
    term: 'GHG Protocol Corporate Standard',
    definition: 'The GHG Protocol Corporate Accounting and Reporting Standard, Revised Edition, which sets the core principles and boundary-setting requirements for organization-level greenhouse gas inventories.'
  },
  {
    term: 'ISO 14001',
    definition: 'The ISO standard that specifies requirements for an environmental management system organizations use to improve environmental performance and manage compliance obligations.'
  },
  {
    term: 'ISO 14064-1',
    definition: 'The ISO standard for organization-level quantification and reporting of greenhouse gas emissions and removals, including the design and management of a greenhouse gas inventory.'
  },
  {
    term: 'ISO 14090',
    definition: 'The ISO standard on adaptation to climate change that sets principles, requirements, and guidelines for integrating adaptation into organizations and decision-making.'
  },
  {
    term: 'ISO 14091',
    definition: 'The ISO standard that gives guidance on vulnerability, impacts, and risk assessment related to climate change as a basis for adaptation planning and implementation.'
  },
  {
    term: 'Climate Change Adaptation',
    definition: 'In the ISO 14090 and ISO 14091 context, the process of preparing for and responding to actual or expected climate impacts by integrating resilience considerations into planning, decisions, and operations.'
  },
  {
    term: 'Vulnerability Assessment',
    definition: 'In ISO 14091, the assessment of how exposed and susceptible an organization, asset, system, or community is to potential climate change impacts.'
  },
  {
    term: 'ISO 14097',
    definition: 'The ISO standard that provides a framework for assessing, measuring, monitoring, and reporting investments and financing activities in relation to climate change.'
  },
  {
    term: 'Climate Finance',
    definition: 'In ISO 14097, investments and financing activities assessed in relation to climate change, including alignment with low-carbon transition pathways, adaptation pathways, and climate goals.'
  },
  {
    term: 'ISO 50001',
    definition: 'The ISO standard that specifies requirements for an energy management system organizations use to improve energy performance, including energy efficiency, energy use, and energy consumption.'
  },
  {
    term: 'ISO 14068-1',
    definition: 'The ISO standard on climate change management that sets principles, requirements, and guidance for achieving and demonstrating carbon neutrality as part of the transition to net zero.'
  },
  {
    term: 'ISO 14083',
    definition: 'The ISO standard that establishes a common methodology for quantifying and reporting greenhouse gas emissions from passenger and freight transport chain operations.'
  },
  {
    term: 'ISO 26000',
    definition: 'The ISO guidance standard on social responsibility that helps organizations integrate responsible behaviour into governance, human rights, labour, environment, fair operating practices, consumer issues, and community involvement.'
  },
  {
    term: 'Energy Management System (EnMS)',
    definition: 'A structured management system, such as one built under ISO 50001, that helps an organization set objectives, use energy data, improve energy performance, and embed continual improvement in energy use.'
  },
  {
    term: 'Sustainable Procurement',
    definition: 'An approach to procurement that integrates environmental, social, and economic considerations into purchasing decisions, supplier relationships, and lifecycle value assessment, as described in ISO 20400.'
  },
  {
    term: 'ISO 20400',
    definition: 'The ISO guidance standard on sustainable procurement that helps organizations integrate sustainability into procurement policy, sourcing, supplier engagement, and performance review.'
  },
  {
    term: 'ISO 32210',
    definition: 'The ISO sustainable finance guidance standard that helps financial-sector organizations apply overarching sustainability principles, practices, and terminology to financing activities.'
  },
  {
    term: 'Sustainable Finance',
    definition: 'In ISO 32210, financing activities informed by overarching sustainability principles, practices, terminology, and materiality considerations from the perspective of both the organization and its stakeholders.'
  },
  {
    term: 'Scope 3 Standard',
    definition: 'The GHG Protocol Corporate Value Chain (Scope 3) Standard, which provides the globally used method for accounting for indirect greenhouse gas emissions across upstream and downstream value-chain activities.'
  },
  {
    term: 'Science-Based Targets for Nature',
    definition: 'Within the SBTN framework, targets grounded in science that help companies assess nature impacts and set action-oriented targets across freshwater, land, and ocean, with biodiversity integrated across the methodology.'
  },
  {
    term: 'Transport Chain Emissions',
    definition: 'In ISO 14083, greenhouse gas emissions arising from the operation of passenger and freight transport chains, including relevant transport legs and hubs.'
  },
  {
    term: 'Jurisdictional Readiness Assessment',
    definition: 'An IFRS Foundation approach for evaluating how prepared a jurisdiction’s ecosystem, preparers, and support systems are to adopt or otherwise use ISSB Standards.'
  },
  {
    term: 'Jurisdictional Roadmap Development Tool',
    definition: 'The IFRS Foundation tool launched in March 2025 to help jurisdictions plan regulatory process, scope, content, and timing when adopting or otherwise using ISSB Standards.'
  },
  {
    term: 'Jurisdictional Guide',
    definition: 'The IFRS Foundation’s Inaugural Jurisdictional Guide, which explains the main approaches and features jurisdictions may use when adopting or otherwise using ISSB Standards.'
  },
  {
    term: 'Jurisdictional Rationale Guide',
    definition: 'The IFRS Foundation guide that helps regulators and other authorities assess and explain the policy rationale for adopting or otherwise using ISSB Standards.'
  },
  {
    term: 'Jurisdictional Profile',
    definition: 'The IFRS Foundation’s official reference profile describing a jurisdiction’s stated target for alignment with ISSB Standards and the current status of its sustainability-related disclosure requirements.'
  },
  {
    term: 'Functionally Aligned Outcomes',
    definition: 'In IFRS Foundation jurisdictional materials, disclosure requirements designed to deliver outcomes aligned with those resulting from the application of ISSB Standards, even if the jurisdiction does not reproduce the standards word for word.'
  },
  {
    term: 'PCAF',
    definition: 'Partnership for Carbon Accounting Financials - the industry-led initiative that develops greenhouse gas accounting standards for the financial sector.'
  },
  {
    term: 'Financed Emissions',
    definition: 'Greenhouse gas emissions associated with loans, investments, and other financial services that a financial institution provides, as covered by Part A of the PCAF Standard.'
  },
  {
    term: 'Facilitated Emissions',
    definition: 'Emissions associated with capital markets and similar financial activities that a financial institution facilitates rather than holds on balance sheet, as covered by Part B of the PCAF Standard.'
  },
  {
    term: 'Insurance-Associated Emissions',
    definition: 'Greenhouse gas emissions associated with insurance and reinsurance underwriting activities, as covered by Part C of the PCAF Standard.'
  },
  {
    term: 'Natural Capital Protocol',
    definition: 'The Capitals Coalition framework that helps organizations identify, measure, and value their impacts and dependencies on natural capital to improve decision-making.'
  },
  {
    term: 'Social & Human Capital Protocol',
    definition: 'The Capitals Coalition framework that helps organizations identify, measure, and value their impacts and dependencies on social capital and human capital.'
  },
  {
    term: 'Natural Capital',
    definition: 'The stock of renewable and non-renewable natural resources that combine to yield a flow of benefits to people, as described by the Capitals Coalition.'
  },
  {
    term: 'Social Capital',
    definition: 'The networks together with shared norms, values, and understanding that facilitate cooperation within and among groups, as described by the Capitals Coalition.'
  },
  {
    term: 'Human Capital',
    definition: 'The knowledge, skills, competencies, and attributes embodied in individuals that contribute to improved performance and wellbeing, as described by the Capitals Coalition.'
  },
  {
    term: 'Capitals Approach',
    definition: 'An approach that helps organizations understand how their success is underpinned by natural, social, and human capital so they can make decisions that create greater overall value.'
  },
  {
    term: 'Integrated Reporting',
    definition: 'A reporting approach that explains how an organization’s strategy, governance, performance, and prospects create, preserve, or erode value over time.'
  },
  {
    term: 'Integrated Thinking',
    definition: 'The active consideration of relationships between an organization’s operating and functional units and the capitals it uses or affects to support better decisions and long-term value creation.'
  },
  {
    term: 'Six Capitals',
    definition: 'The capitals referenced in the Integrated Reporting Framework: financial, manufactured, intellectual, human, social and relationship, and natural capital.'
  },
  {
    term: 'MNE Declaration',
    definition: 'The ILO Tripartite Declaration of Principles concerning Multinational Enterprises and Social Policy, which gives enterprises direct guidance on social policy, labour standards, and responsible business conduct.'
  },
  {
    term: 'Decent Work',
    definition: 'The ILO concept covering productive work delivered in conditions of freedom, equity, security, and human dignity.'
  },
  {
    term: 'Equator Principles',
    definition: 'A financial industry benchmark and risk management framework used by financial institutions to identify, assess, and manage environmental and social risks in project-related finance.'
  },
  {
    term: 'EPFI',
    definition: 'Equator Principles Financial Institution, meaning a financial institution that has adopted and implements the Equator Principles.'
  },
  {
    term: 'TCFD Recommendations',
    definition: 'The Task Force on Climate-related Financial Disclosures recommendations, which structure climate-related disclosures around governance, strategy, risk management, and metrics and targets.'
  },
  {
    term: 'Scenario Analysis',
    definition: 'A TCFD-referenced process for assessing how an organization could perform under different plausible climate-related futures, including transition and physical risk pathways.'
  },
  {
    term: 'IFC Performance Standards',
    definition: 'The International Finance Corporation’s environmental and social standards used to identify, avoid, mitigate, and manage environmental and social risks and impacts in project activities.'
  },
  {
    term: 'IFC Sustainability Framework',
    definition: 'The broader IFC framework that includes the Policy and Performance Standards on Environmental and Social Sustainability together with the Access to Information Policy.'
  },
  {
    term: 'Good International Industry Practice (GIIP)',
    definition: 'Under IFC guidance, the exercise of professional skill, diligence, prudence, and foresight that would reasonably be expected from skilled and experienced professionals engaged in the same type of undertaking under similar circumstances.'
  },
  {
    term: 'Social Responsibility',
    definition: 'In ISO 26000, an organization’s responsibility for the impacts of its decisions and activities on society and the environment, carried out through transparent and ethical behavior.'
  },
  {
    term: 'Scope 2 Guidance',
    definition: 'The GHG Protocol guidance that standardizes accounting and reporting for emissions from purchased or acquired electricity, steam, heat, and cooling.'
  },
  {
    term: 'Location-based Method',
    definition: 'A Scope 2 accounting method that reflects the average emissions intensity of the grids where energy consumption occurs.'
  },
  {
    term: 'Market-based Method',
    definition: 'A Scope 2 accounting method that reflects emissions from electricity a company has purposefully chosen through contractual instruments such as supplier-specific products or energy attribute certificates.'
  },
  {
    term: 'Scope 2 Quality Criteria',
    definition: 'The GHG Protocol Scope 2 criteria used to assess whether contractual instruments credibly convey the greenhouse gas emission attributes of purchased electricity in market-based accounting.'
  },
  {
    term: 'NZBA',
    definition: 'Net-Zero Banking Alliance - the UNEP FI-convened, bank-led alliance whose members commit to align financing activities with net-zero greenhouse gas emissions by 2050 or sooner.'
  },
  {
    term: 'NZAOA',
    definition: 'Net-Zero Asset Owner Alliance - the UNEP FI- and PRI-convened alliance of institutional investors committed to transitioning portfolios to net-zero greenhouse gas emissions by 2050.'
  },
  {
    term: 'Portfolio Alignment',
    definition: 'The process of aligning lending, investment, underwriting, or other financed activities with a defined climate goal or transition pathway, such as net zero by 2050.'
  },
  {
    term: 'Target-Setting Protocol',
    definition: 'Within the NZAOA context, the methodology that governs how signatories set intermediate climate targets, define coverage, and update stewardship and implementation expectations over time.'
  },
  {
    term: 'UNEP FI Statement of Commitment',
    definition: 'The UNEP FI commitment statement under which financial institutions recognize the role of finance in sustainable development and commit to integrating environmental and social considerations into all aspects of their operations.'
  },
  {
    term: 'SSE',
    definition: 'Sustainable Stock Exchanges Initiative - the UN-supported peer-to-peer learning platform that helps exchanges, investors, regulators, and companies improve ESG transparency and encourage sustainable investment.'
  },
  {
    term: 'Capitals Protocol',
    definition: 'The Capitals Coalition framework published in 2025 to help organizations integrate natural, social, human, and produced capital into business decision-making.'
  },
  {
    term: 'Produced Capital',
    definition: 'In the Capitals Protocol, the stock of human-made objects and infrastructure, such as buildings, equipment, and technology, that support production and service delivery.'
  },
  {
    term: 'GRI 101',
    definition: 'GRI 101: Biodiversity 2024, the GRI Topic Standard for reporting biodiversity-related impacts, related management actions, direct drivers of biodiversity loss, changes in the state of biodiversity, and ecosystem services.'
  },
  {
    term: 'GRI 102',
    definition: 'GRI 102: Climate Change 2025, the GRI Topic Standard for reporting climate-related impacts, greenhouse gas emissions, targets, transition actions, and related effects on people and nature.'
  },
  {
    term: 'GRI 103',
    definition: 'GRI 103: Energy 2025, the GRI Topic Standard for reporting energy consumption, reductions, renewable and non-renewable energy use, and value-chain energy impacts.'
  },
  {
    term: 'Biodiversity',
    definition: 'In GRI 101: Biodiversity 2024, biodiversity encompasses the variability of organisms living in terrestrial, marine, and aquatic ecosystems, as well as the ecological complexes they form, including diversity within species, between species, and across ecosystems.'
  },
  {
    term: 'Mitigation Hierarchy',
    definition: 'In GRI 101: Biodiversity 2024, the mitigation hierarchy is the sequence used to manage negative impacts on biodiversity and ecosystem services by prioritizing avoidance, then minimization, then restoration and rehabilitation, and finally offsetting residual impacts.'
  },
  {
    term: 'Energy Reduction',
    definition: 'In GRI 103: Energy 2025, a decrease in energy consumption or energy intensity resulting from conservation, efficiency, process improvement, or other energy performance actions.'
  },
  {
    term: 'CDP SME Questionnaire',
    definition: 'The CDP questionnaire designed for small and medium-sized enterprises within the CDP disclosure cycle, separate from the full corporate questionnaire.'
  },
  {
    term: 'SDG Impact Standards',
    definition: 'UNDP voluntary management standards that guide enterprises and investors in embedding impact management and aligning decisions, governance, and reporting with the Sustainable Development Goals.'
  },
  {
    term: 'SDG Impact Standards for Bond Issuers',
    definition: 'The UNDP standards that help bond issuers embed SDG-aligned impact management across bond strategy, management approach, transparency, and governance.'
  },
  {
    term: 'SDG Impact Standards for Enterprises',
    definition: 'The UNDP standards that help enterprises integrate SDG-aligned impact management into strategy, management approach, transparency, and governance.'
  },
  {
    term: 'IS-FSD',
    definition: 'The OECD-UNDP Impact Standards for Financing Sustainable Development, a best-practice framework and self-assessment tool for embedding impact strategy, management approach, transparency, and governance in development finance.'
  },
  {
    term: 'Impact Management',
    definition: 'In UNDP SDG Impact materials, the ongoing practice of measuring, monitoring, evaluating, and improving impact so negative effects can be reduced and positive effects increased.'
  },
  {
    term: 'Impact Strategy',
    definition: 'In the OECD-UNDP Impact Standards for Financing Sustainable Development, the part of an organization’s approach that defines intended development impact, alignment with the SDGs, and how impact considerations shape financial decisions.'
  },
  {
    term: 'Impact Management Approach',
    definition: 'In the OECD-UNDP Impact Standards for Financing Sustainable Development, the systems, processes, and decision practices used to identify, manage, monitor, and improve development impact over time.'
  },
  {
    term: 'Impact Integrity',
    definition: 'In the UNDP SDG Impact Standards context, providing a whole, sound, and uncorrupted picture of material impacts on people and the planet to increase positive impacts and reduce or avoid negative ones.'
  },
  {
    term: 'Transparency and Accountability',
    definition: 'In the OECD-UNDP Impact Standards for Financing Sustainable Development, the expectation that organizations disclose how they manage and measure impact and remain accountable to donors, beneficiaries, and other stakeholders.'
  },
  {
    term: 'IRIS+',
    definition: 'The GIIN’s set of tools and guidance that translates impact intentions into measurable results and supports impact measurement and management.'
  },
  {
    term: 'Thematic Taxonomy',
    definition: 'In IRIS+, the classification system used to help impact investors systematically describe and pursue positive outcomes for people and the planet.'
  },
  {
    term: 'Core Metric Sets',
    definition: 'In IRIS+, standardized short lists of metrics and curated indicators designed to help investors understand, pursue, and measure specific impact outcomes.'
  },
  {
    term: 'Five Dimensions of Impact',
    definition: 'A shared impact-management structure used with IRIS+ to understand impact performance through the dimensions of what, who, how much, contribution, and risk.'
  },
  {
    term: 'Product Life Cycle Standard',
    definition: 'The GHG Protocol standard for quantifying greenhouse gas emissions associated with a product across raw materials, production, transport, use, and end-of-life stages.'
  },
  {
    term: 'Climate Action 100+',
    definition: 'A collaborative investor engagement initiative focused on the world’s largest corporate greenhouse gas emitters and other systemically important companies in the net-zero transition.'
  },
  {
    term: 'Core Carbon Principles (CCPs)',
    definition: 'The science-based principles issued by the Integrity Council for the Voluntary Carbon Market that set a global benchmark for high-integrity carbon credits.'
  },
  {
    term: 'CCP-Eligible',
    definition: 'An ICVCM status showing that a carbon-crediting program has passed the relevant program-level assessment requirements under the Core Carbon Principles framework.'
  },
  {
    term: 'CCP-Approved',
    definition: 'An ICVCM status showing that a category of carbon credits has passed the relevant assessment requirements and can use the CCP label through a CCP-Eligible program.'
  },
  {
    term: 'Green Bond Principles (GBP)',
    definition: 'ICMA voluntary process guidelines for green bonds built around use of proceeds, project evaluation and selection, management of proceeds, and reporting.'
  },
  {
    term: 'Social Bond Principles (SBP)',
    definition: 'ICMA voluntary process guidelines for social bonds that recommend transparency, disclosure, and reporting for eligible social projects.'
  },
  {
    term: 'Sustainability Bond Guidelines (SBG)',
    definition: 'ICMA guidelines for bonds financing a combination of eligible green and social projects under one sustainability bond framework.'
  },
  {
    term: 'Sustainability-Linked Bond Principles (SLBP)',
    definition: 'ICMA voluntary guidelines for bonds whose financial or structural characteristics vary depending on whether predefined sustainability performance outcomes are achieved.'
  },
  {
    term: 'Use of Proceeds',
    definition: 'In the ICMA bond principles, the way bond proceeds are allocated to clearly described eligible green, social, or mixed sustainability projects.'
  },
  {
    term: 'CTFH',
    definition: 'Climate Transition Finance Handbook - ICMA guidance that sets entity-level expectations on practices, actions, and disclosures for issuers raising debt for climate transition-related purposes.'
  },
  {
    term: 'CTBG',
    definition: 'Climate Transition Bond Guidelines - ICMA issuance-level guidance for climate transition bonds and climate transition-themed sustainability-linked bonds.'
  },
  {
    term: 'Climate Transition Bond',
    definition: 'In ICMA guidance, a standalone bond label intended to finance or refinance critical projects aligned with a credible issuer transition strategy and the goals of the Paris Agreement.'
  },
  {
    term: 'KPI',
    definition: 'Key Performance Indicator. In the ICMA Sustainability-Linked Bond Principles, a measurable indicator used to assess the issuer’s sustainability performance.'
  },
  {
    term: 'SPT',
    definition: 'Sustainability Performance Target. In the ICMA Sustainability-Linked Bond Principles, the predefined performance outcome against which KPI progress is assessed.'
  },
  {
    term: 'IFC Performance Standards',
    definition: 'The eight IFC Performance Standards that set environmental and social requirements for clients across risk management, labor, resource efficiency, community health and safety, land resettlement, biodiversity, Indigenous Peoples, and cultural heritage.'
  },
  {
    term: 'ESMS',
    definition: 'Environmental and Social Management System - under IFC Performance Standard 1, the management system companies use to identify, manage, monitor, and improve environmental and social risks and impacts throughout a project.'
  },
  {
    term: 'EHS Guidelines',
    definition: 'The World Bank Group Environmental, Health, and Safety Guidelines, which are technical reference documents setting general and industry-specific examples of Good International Industry Practice.'
  },
  {
    term: 'Governing Body',
    definition: 'In ISO 37000, the person or group of people with ultimate accountability and authority for an organization.'
  },
  {
    term: 'Organizational Governance',
    definition: 'In ISO 37000, the system of rules, practices, and relationships by which an organization is directed, overseen, and held accountable so it can fulfill its purpose.'
  },
  {
    term: 'ABMS',
    definition: 'Anti-bribery Management System - the management system defined by ISO 37001 for preventing, detecting, responding to, and improving controls over bribery risk.'
  },
  {
    term: 'Bribery Risk',
    definition: 'Under ISO 37001, the possibility that bribery could occur and affect an organization, its activities, or related persons, requiring due diligence and controls.'
  },
  {
    term: 'CMS',
    definition: 'Compliance Management System - the structured management system covered by ISO 37301 for meeting compliance obligations and strengthening integrity and accountability.'
  },
  {
    term: 'Compliance Obligation',
    definition: 'In ISO 37301, a requirement an organization has to comply with, including mandatory legal requirements and voluntary commitments it chooses to follow.'
  },
  {
    term: 'Circular Economy',
    definition: 'In the ISO 59000 family, an economic system that uses a systemic approach to maintain a circular flow of resources by recovering, retaining, or adding to their value while contributing to sustainable development.'
  },
  {
    term: 'Circularity Performance',
    definition: 'In ISO 59020, the performance of a system in relation to circularity, assessed through circularity indicators at organizational, product, or value-network level.'
  },
  {
    term: 'Value Network',
    definition: 'In ISO 59010, the set of relationships among organizations and other actors that create, deliver, recover, and retain value across a system moving from linear to circular models.'
  },
  {
    term: 'Circularity Indicator',
    definition: 'A metric used under ISO 59020 to measure and assess progress toward circularity performance in products, organizations, or value networks.'
  },
  {
    term: 'Secondary Materials',
    definition: 'In ISO 59014, materials recovered from other products or material streams for further use, with sustainability and traceability managed through the recovery process.'
  },
  {
    term: 'ISAR',
    definition: 'Intergovernmental Working Group of Experts on International Standards of Accounting and Reporting, the UNCTAD forum that develops and advances guidance on corporate reporting and sustainability reporting topics.'
  },
  {
    term: 'Core SDG Indicators',
    definition: 'The UNCTAD baseline set of economic, environmental, social, and institutional indicators intended to make entity sustainability and SDG-related reporting more consistent and comparable.'
  },
  {
    term: 'SDG Indicator 12.6.1',
    definition: 'The UN Sustainable Development Goal indicator on the number of companies publishing sustainability reports, referenced by UNCTAD as a policy use case for its core indicators guidance.'
  },
  {
    term: 'VCMI',
    definition: 'Voluntary Carbon Markets Integrity Initiative - the initiative that develops guidance for credible corporate use of carbon credits and climate claims.'
  },
  {
    term: 'Carbon Integrity Claim',
    definition: 'A VCMI-recognized claim that a company is using high-quality carbon credits in addition to, not instead of, science-aligned emissions cuts.'
  },
  {
    term: 'MRA Framework',
    definition: 'The VCMI Monitoring, Reporting & Assurance Framework that sets the reporting and assurance criteria companies must meet to make VCMI Claims.'
  },
  {
    term: 'Scope 3 Emissions Gap',
    definition: 'In VCMI scope 3 guidance, the shortfall between a company’s scope 3 emissions reduction targets and the emissions reductions it is actually achieving.'
  },
  {
    term: 'ESG Disclosure Statement',
    definition: 'In the CFA Institute Global ESG Disclosure Standards for Investment Products, the disclosure document used to explain how an investment product considers ESG issues in its objectives, investment process, and stewardship.'
  },
  {
    term: 'Water Stewardship',
    definition: 'In CEO Water Mandate guidance, the corporate practice of managing water-related risks, opportunities, impacts, and stakeholder engagement in ways that support sustainable and equitable water resource management.'
  },
  {
    term: 'Corporate Water Disclosure',
    definition: 'The reporting of information on a company’s water management, water-related risks and impacts, and strategic responses to stakeholders, as defined in the CEO Water Mandate Corporate Water Disclosure Guidelines.'
  },
  {
    term: 'Core Social Indicators',
    definition: 'In the World Benchmarking Alliance Nature Benchmark, the cross-cutting social indicator set used alongside nature-specific indicators to assess corporate performance on people-related and foundational social expectations.'
  },
  {
    term: 'Nature-positive',
    definition: 'In World Benchmarking Alliance nature benchmarking materials, the direction of travel in which companies reduce damage to nature, help restore ecosystems, and operate within planetary boundaries.'
  },
  {
    term: 'CSRD',
    definition: 'Corporate Sustainability Reporting Directive (EU) 2022/2464 — the EU directive that replaced the NFRD and requires large companies and listed SMEs to report on sustainability matters in accordance with European Sustainability Reporting Standards (ESRS).'
  },
  {
    term: 'ESRS',
    definition: 'European Sustainability Reporting Standards — the sector-agnostic reporting standards established by Commission Delegated Regulation (EU) 2023/2772 for companies in scope of the CSRD, covering climate, pollution, water, biodiversity, circular economy, workforce, communities, consumers, and business conduct topics.'
  },
  {
    term: 'ESRS E1',
    definition: 'The European Sustainability Reporting Standard on Climate Change, which requires companies to disclose climate-related impacts, risks, opportunities, governance, transition plans, and greenhouse gas emissions under the CSRD.'
  },
  {
    term: 'ESRS E4',
    definition: 'The European Sustainability Reporting Standard on Biodiversity and Ecosystems, which requires companies to disclose impacts, dependencies, risks, and opportunities related to biodiversity and ecosystems under the CSRD.'
  },
  {
    term: 'ESRS G1',
    definition: 'The European Sustainability Reporting Standard on Business Conduct, which requires companies to disclose policies and practices on business conduct topics including corruption, bribery, lobbying, and protection of whistleblowers under the CSRD.'
  },
  {
    term: 'EU Taxonomy',
    definition: 'A classification system established by Regulation (EU) 2020/852 that defines criteria for determining whether an economic activity qualifies as environmentally sustainable for investment and disclosure purposes.'
  },
  {
    term: 'Technical Screening Criteria (TSC)',
    definition: 'In the EU Taxonomy Regulation, the quantitative and qualitative thresholds an economic activity must meet to be considered as substantially contributing to one of the six environmental objectives.'
  },
  {
    term: 'Do No Significant Harm (DNSH)',
    definition: 'A condition in the EU Taxonomy Regulation requiring that an economic activity making a substantial contribution to one environmental objective must not significantly harm any of the other five environmental objectives.'
  },
  {
    term: 'Taxonomy-aligned Activity',
    definition: 'An economic activity that meets the EU Taxonomy Regulation criteria for substantial contribution to an environmental objective, does not significantly harm other objectives, and complies with minimum social safeguards.'
  },
  {
    term: 'Minimum Social Safeguards',
    definition: 'In the EU Taxonomy Regulation, the procedural requirements that economic activities must comply with regardless of their environmental performance, based on the OECD Guidelines for MNEs and the UN Guiding Principles on Business and Human Rights.'
  },
  {
    term: 'SFDR',
    definition: 'Sustainable Finance Disclosure Regulation (EU) 2019/2088 — the EU regulation requiring financial market participants and financial advisers to disclose how they integrate sustainability risks and how their financial products address sustainability matters.'
  },
  {
    term: 'Principal Adverse Impacts (PAI)',
    definition: 'In SFDR, the most significant negative effects on sustainability factors that investment decisions or financial products cause, contribute to, or are directly linked to.'
  },
  {
    term: 'Article 8 Product',
    definition: 'A market term for financial products under SFDR that promote environmental or social characteristics, among other characteristics, provided that the companies in which investments are made follow good governance practices.'
  },
  {
    term: 'Article 9 Product',
    definition: 'A market term for financial products under SFDR that have sustainable investment as their objective.'
  },
  {
    term: 'CSDDD',
    definition: 'Corporate Sustainability Due Diligence Directive (EU) 2024/1760 — the EU directive requiring large companies to conduct ongoing due diligence on actual and potential adverse human rights and environmental impacts across their operations and value chains.'
  },
  {
    term: 'CS3D',
    definition: 'Alternative abbreviation for the Corporate Sustainability Due Diligence Directive (EU) 2024/1760, also referred to as CSDDD.'
  },
  {
    term: 'EUDR',
    definition: 'EU Deforestation Regulation (EU) 2023/1115 — the EU regulation requiring operators and traders to ensure that covered commodities and products placed on the EU market are not sourced from deforested or forest-degraded land after 31 December 2020.'
  },
  {
    term: 'CBAM',
    definition: 'Carbon Border Adjustment Mechanism — the EU mechanism under Regulation (EU) 2023/956 that requires importers of certain carbon-intensive goods to surrender certificates reflecting the carbon price that would have been paid under the EU Emissions Trading System.'
  },
  {
    term: 'EU ETS',
    definition: 'EU Emissions Trading System — the EU carbon pricing mechanism that sets a cap on total greenhouse gas emissions from covered sectors and requires operators to hold allowances for each tonne of CO2 they emit.'
  },
  {
    term: 'Carbon Leakage',
    definition: 'The risk that companies move carbon-intensive production outside the EU to avoid the cost of the EU ETS, thereby reducing emissions within the EU but increasing them elsewhere, which CBAM is designed to address.'
  },
  {
    term: 'NFRD',
    definition: 'Non-Financial Reporting Directive (EU) 2014/95 — the predecessor to the CSRD that required large public-interest entities with more than 500 employees to disclose non-financial and diversity information. It was replaced by the CSRD from financial year 2024.'
  },
  {
    term: 'Omnibus Simplification Package',
    definition: 'An EU legislative package proposed by the European Commission in February 2025 to simplify sustainability obligations under CSRD, CSDDD, EU Taxonomy, and CBAM, with proposals to raise reporting thresholds and reduce compliance burdens.'
  },
  {
    term: 'Stop-the-Clock Directive',
    definition: 'An EU directive that postponed the application of CSRD reporting requirements for wave-two and wave-three companies (those with fewer than 500 employees), buying additional time for omnibus simplification negotiations.'
  },
  {
    term: 'UK SDR',
    definition: 'UK Sustainability Disclosure Requirements — the FCA regime under PS23/16 that introduced an anti-greenwashing rule, four sustainable investment labels (Focus, Improvers, Impact, Mixed Goals), and naming and marketing rules for UK asset managers.'
  },
  {
    term: 'Sustainable Investment Label',
    definition: 'One of four investment product labels introduced by the UK FCA under the SDR regime to help retail investors identify products that genuinely pursue sustainability goals: Sustainability Focus, Sustainability Improvers, Sustainability Impact, and Sustainability Mixed Goals.'
  },
  {
    term: 'Anti-Greenwashing Rule',
    definition: 'The FCA rule under the UK SDR regime requiring all FCA-authorised firms to ensure any sustainability-related claims they make are fair, clear, and not misleading, effective from 31 May 2024.'
  },
  {
    term: 'SSBJ',
    definition: 'Sustainability Standards Board of Japan — the independent standard-setter that issued Japan\'s three ISSB-aligned sustainability disclosure standards in March 2025 (Application Standard, General Disclosures, and Climate-related Disclosures), which become mandatory for TSE Prime Market listed companies in phases from 2027 to 2029.'
  },
  {
    term: 'AASB S2',
    definition: 'Australian Accounting Standard S2 — Climate-related Disclosures, the mandatory ISSB-aligned Australian climate reporting standard for large entities under the Corporations Act, phased in from financial years beginning 1 January 2025 (Group 1) through 1 July 2027 (Group 3).'
  },
  {
    term: 'ASRS',
    definition: 'Australian Sustainability Reporting Standards — the two standards issued by the Australian Accounting Standards Board: AASB S1 (General Requirements, voluntary) and AASB S2 (Climate-related Disclosures, mandatory), embedded into the Corporations Act by the Treasury Laws Amendment Act 2024.'
  },
  {
    term: 'SGX Climate Reporting',
    definition: 'Singapore\'s mandatory ISSB S2-aligned climate reporting framework for SGX-listed companies, jointly governed by SGX RegCo and ACRA. All listed companies must disclose Scope 1 and 2 emissions from FY2025; full ISSB disclosures apply from FY2025 (STI constituents), FY2028 (market cap ≥S$1B), or FY2030 (others).'
  },
  {
    term: 'Omnibus I Directive',
    definition: 'Directive (EU) 2026/470, in force 18 March 2026, which amended both CSRD and CSDDD to narrow scope, cut ESRS data points by approximately 70%, simplify value-chain requirements, and defer CSDDD first application to July 2029 — part of the EU\'s competitiveness and regulatory simplification agenda.'
  },
  {
    term: 'ESMA Fund Names Guidelines',
    definition: 'ESMA guidelines (ESMA34-1592494965-657), in force from 21 May 2025 for all funds, requiring EU funds using ESG or sustainability terms in their names to hold at least 80% of assets aligned with those terms, and requiring funds using "sustainable" or "impact" to also apply Paris-Aligned Benchmark exclusion criteria.'
  },
  {
    term: 'NDPF',
    definition: 'Nature Data Public Facility — a blueprint proposed by TNFD in October 2025 for a global public infrastructure to provide standardized, freely accessible state-of-nature data to support corporate nature disclosures and assessment.'
  },
  {
    term: 'BEES',
    definition: 'Biodiversity, Ecosystems and Ecosystem Services — the ISSB project name for the forthcoming nature-related sustainability disclosure standard. The ISSB moved the project from research to standard-setting in late 2025, with an Exposure Draft targeted at COP17 biodiversity conference in October 2026.'
  },
  {
    term: 'GFANZ',
    definition: 'Glasgow Financial Alliance for Net Zero — the global umbrella consortium launched at COP26 in November 2021 that coordinates sector-specific financial institution net-zero alliances including NZBA, NZAOA, NZAM, and others, with members committing to align portfolios with net-zero by 2050.'
  },
  {
    term: 'NZAM',
    definition: 'Net Zero Asset Managers initiative — a GFANZ member initiative through which signatory asset managers commit to supporting the goal of net-zero greenhouse gas emissions by 2050, aligning their portfolios and engaging with investee companies on climate transition.'
  },
  {
    term: 'FLAG',
    definition: 'Forest, Land, and Agriculture — the SBTi sector category covering Scope 1 and Scope 3 emissions from agricultural land use, deforestation, livestock, and related land-use change activities. Companies with FLAG emissions ≥20% of combined FLAG and fossil fuel emissions must set a separate FLAG science-based target.'
  },
  {
    term: 'California SB 253',
    definition: 'Climate Corporate Data Accountability Act — a California state law signed October 2023 requiring companies with annual revenues over $1 billion doing business in California to annually disclose Scope 1 and 2 GHG emissions from 2026, and Scope 3 from 2027, with third-party assurance on Scope 1/2 disclosures.'
  },
  {
    term: 'California SB 261',
    definition: 'Climate-Related Financial Risk Act — a California state law signed October 2023 requiring companies with annual revenues over $500 million doing business in California to publish biennial TCFD-aligned climate-related financial risk reports, with first reports due by January 2026.'
  },
  {
    term: 'CARB',
    definition: 'California Air Resources Board — the California state agency responsible for implementing and enforcing California\'s climate-related regulations, including acting as the designated implementing authority for the Climate Corporate Data Accountability Act (SB 253) and the Climate-Related Financial Risk Act (SB 261).'
  },
  {
    term: 'HKEX',
    definition: 'Hong Kong Exchanges and Clearing Limited — the operator of the Hong Kong Stock Exchange (SEHK) and the regulatory authority for its Listing Rules. HKEX updated its ESG Reporting Rules (Appendix C2) in April 2024 to mandate ISSB S2-aligned climate disclosures for all Main Board listed issuers from financial years beginning January 2025.'
  },
  {
    term: 'HSCI',
    definition: 'Hang Seng Composite Index — the broad-based Hong Kong stock market index whose constituents are subject to earlier mandatory Scope 3 disclosure requirements (from FY2026) and third-party assurance deadlines (from FY2027) under the HKEX ESG Reporting Rules.'
  },
  {
    term: 'EuGBS',
    definition: 'European Green Bond Standard — the voluntary EU labelling framework under Regulation (EU) 2023/2631 that allows issuers to market bonds as European Green Bonds (EuGB), requiring full EU Taxonomy alignment of proceeds, pre-issuance and allocation reporting, and verification by an ESMA-registered external reviewer. Effective from 21 December 2024.'
  },
  {
    term: 'External Reviewer',
    definition: 'Under the EU European Green Bond Standard (EuGBS), a legal entity registered with ESMA that provides independent pre-issuance and allocation verification services to confirm that a European Green Bond and its proceeds allocation comply with the requirements of Regulation (EU) 2023/2631.'
  },
  {
    term: 'SEBI',
    definition: 'Securities and Exchange Board of India — the statutory body that regulates India\'s securities markets and has issued mandatory sustainability disclosure requirements for listed companies, including the Business Responsibility and Sustainability Reporting (BRSR) framework and BRSR Core with third-party assurance.'
  },
  {
    term: 'NGRBC',
    definition: 'National Guidelines on Responsible Business Conduct — India\'s government-issued framework of nine principles for businesses to operate in a responsible manner, published by the Ministry of Corporate Affairs in 2019. The NGRBC principles form the structural foundation of SEBI\'s BRSR mandatory reporting framework.'
  },
  {
    term: 'BRSR Core',
    definition: 'A subset of India\'s BRSR disclosures introduced by SEBI in 2023 that requires mandatory third-party assurance. BRSR Core covers key ESG performance indicators including GHG intensity, energy intensity, water intensity, waste recovery, and gender pay gaps. It applies to the top 150 listed companies from FY2023-24, expanding to the top 250 from FY2024-25 and the top 500 from FY2025-26.'
  },
  {
    term: 'GRI Sector Standards',
    definition: 'Sector-specific GRI standards issued by the Global Sustainability Standards Board that identify the sustainability topics most likely to be material for organizations in specific industries. Sector Standards supplement the GRI Universal Standards and Topic Standards. Published sector standards include GRI 11 (Oil and Gas, 2021), GRI 12 (Coal, 2022), GRI 13 (Agriculture, Aquaculture and Fishing, 2022), and GRI 14 (Mining Sector, 2023).'
  },
  {
    term: 'IOSCO',
    definition: 'International Organization of Securities Commissions — the global standard-setting body for securities regulation. IOSCO\'s November 2021 report recommended that sustainability disclosure standards built on TCFD be established as a global baseline and endorsed the IFRS Foundation to develop them, directly catalysing the creation of the ISSB. IOSCO subsequently endorsed IFRS S1 and IFRS S2 in July 2023.'
  },
  {
    term: 'BCBS',
    definition: 'Basel Committee on Banking Supervision — the primary global standard setter for prudential bank regulation, hosted at the Bank for International Settlements (BIS). The BCBS published 18+4 Principles for the Effective Management and Supervision of Climate-Related Financial Risks in June 2022, providing guidance for banks and supervisors on integrating climate risk into governance and risk management frameworks.'
  },
  {
    term: 'CSSB',
    definition: 'Canadian Sustainability Standards Board — the independent standard-setting body established under FRAS Canada in 2023 to develop sustainability disclosure standards for entities in Canada. CSSB published CSDS 1 and CSDS 2 in October 2024, based substantively on IFRS S1 and IFRS S2 with Canadian modifications, coordinating with the Canadian Securities Administrators (CSA) and OSFI for mandatory adoption timelines.'
  },
  {
    term: 'CSDS',
    definition: 'Canadian Sustainability Disclosure Standards — the two inaugural standards published by the Canadian Sustainability Standards Board (CSSB) in October 2024: CSDS 1 (General Requirements for Disclosure of Sustainability-related Financial Information, aligned with IFRS S1) and CSDS 2 (Climate-related Disclosures, aligned with IFRS S2). Mandatory adoption for publicly accountable enterprises is being progressed by the Canadian Securities Administrators and OSFI.'
  },
  {
    term: 'EU Forced Labour Regulation',
    definition: 'Regulation (EU) 2024/3015 — entered into force 17 December 2024, applies from 14 December 2027. Prohibits placing on the EU market, making available in the EU, or exporting from the EU any products made with forced labour (including child labour constituting forced labour under ILO Conventions). Enforced through risk-based investigations by the European Commission and national authorities, with powers to detain, withdraw, and order disposal of non-compliant products. Complementary to but distinct from the CSDDD due diligence framework — it targets product flows rather than corporate conduct.'
  },
  {
    term: 'Pay Transparency Directive',
    definition: 'Directive (EU) 2023/970 — entered into force 7 June 2023, transposition by 7 June 2026. Requires EU employers to disclose salary information to job applicants, give employees the right to request average pay data by sex for comparable roles, and publish gender pay gap reports (annually for 250+ employees, every three years for 100–249 employees). Where a gap of 5% or more cannot be justified by objective criteria, a joint pay assessment is mandatory. Reverses the burden of proof in equal pay claims.'
  },
  {
    term: 'Gender Pay Gap Reporting',
    definition: 'Under the EU Pay Transparency Directive (2023/970), the obligation for employers with 100 or more employees to report on the pay gap between female and male employees in comparable work. Employers with 250+ employees must report annually from 2027; those with 100–249 employees every three years. Reports must be submitted to a designated national authority and made available to employees and their representatives. Where a gap of 5% or more cannot be justified, a joint pay assessment with employee representatives is required.'
  },
  {
    term: 'NRL',
    definition: 'EU Nature Restoration Law — Regulation (EU) 2024/1991, in force 18 August 2024. The first EU law setting legally binding nature restoration targets: member states must restore at least 20% of land and sea areas by 2030, 30% by 2039, and 90% of all degraded ecosystems by 2050. Also sets specific targets for urban greening, pollinator recovery, peatland restoration, and river connectivity. Relevant to TNFD nature disclosures and ESRS E4 biodiversity reporting.'
  },
  {
    term: 'ESPR',
    definition: 'Ecodesign for Sustainable Products Regulation — Regulation (EU) 2024/1781, in force 18 July 2024. EU regulation replacing the Ecodesign Directive that extends mandatory product sustainability requirements (durability, repairability, recyclability, recycled content, carbon and environmental footprint) to almost all physical goods on the EU market. Introduces the Digital Product Passport (DPP) for sharing product sustainability data across the supply chain and to consumers.'
  },
  {
    term: 'Digital Product Passport (DPP)',
    definition: 'A data carrier and linked dataset required by the EU Ecodesign for Sustainable Products Regulation (ESPR) that must accompany physical products placed on the EU market. The DPP gives supply chain actors, consumers, repair businesses, and recyclers standardised access to information on a product\'s materials composition, sustainability performance, origin, maintenance requirements, and end-of-life instructions. Requirements are specified per product category by EU Delegated Acts under ESPR.'
  },
  {
    term: 'Battery Passport',
    definition: 'A digital record mandated by the EU Batteries Regulation (EU) 2023/1542 for electric vehicle (EV) batteries and industrial batteries with active mass above 2 kWh. Required from 2027, the Battery Passport provides a unique identifier and accessible data on the battery\'s composition (including responsible mineral sourcing), state of health, carbon footprint, recycled content, and end-of-life instructions, enabling informed reuse, repurposing, and recycling decisions across the value chain.'
  },
  {
    term: 'EU Batteries Regulation',
    definition: 'Regulation (EU) 2023/1542, in force 17 August 2023. EU regulation covering the full lifecycle of all battery types placed on the EU market, including mandatory carbon footprint declarations (phased 2025–2027 by battery type), supply chain due diligence for critical minerals (lithium, cobalt, nickel, natural graphite, copper), recycled content targets (phased 2030–2035), and the Battery Passport for EV and industrial batteries (from 2027).'
  },
  {
    term: 'CRMA',
    definition: 'Critical Raw Materials Act — Regulation (EU) 2024/1252, in force 23 May 2024. EU regulation identifying 17 Strategic Raw Materials and 34 Critical Raw Materials essential to the clean energy and digital transition. Sets binding 2030 targets: ≥10% EU domestic extraction, ≥40% processing, and ≥15% recycling of annual consumption for each SRM. Limits dependence on any single third-country supplier to ≤65% for any SRM. Establishes a pipeline of EU Strategic Projects with fast-track permitting and financing.'
  },
  {
    term: 'Strategic Raw Materials',
    definition: 'In the EU Critical Raw Materials Act (CRMA), the 17 raw materials considered most critical for strategic sectors such as clean energy, digital technologies, defence, and aerospace. Strategic Raw Materials are subject to the binding 2030 benchmarks on EU domestic extraction, processing, and recycling capacity, and are the focus of Strategic Projects and supply-chain diversification rules.'
  },
  {
    term: 'GBF',
    definition: 'Global Biodiversity Framework — the Kunming-Montreal Global Biodiversity Framework adopted at COP15 in December 2022 under the Convention on Biological Diversity. Contains 23 action targets for 2030, including the 30x30 conservation target (Target 3), a 30% restoration target (Target 2), and Target 15 requiring businesses to assess, monitor, and disclose biodiversity risks and impacts. Informs TNFD, SBTN, and ESRS E4 biodiversity frameworks.'
  },
  {
    term: '30x30 Target',
    definition: 'In the Kunming-Montreal Global Biodiversity Framework (Target 3), the commitment to ensure the effective conservation and management of at least 30% of global land areas, inland waters, coastal areas, and oceans by 2030. The 30x30 target is also a key objective of the EU Nature Restoration Law and has been adopted in national biodiversity strategies by many jurisdictions.'
  },
  {
    term: 'ISO 14064-3',
    definition: 'ISO 14064-3:2019 — the third part of the ISO 14064 GHG series, specifying principles, requirements, and guidance for verifying and validating GHG assertions. It applies to organizational GHG inventories under ISO 14064-1, project-level GHG quantification under ISO 14064-2, and product carbon footprints under ISO 14067. Used as a technical basis for mandatory GHG verification under CSRD and the EU Batteries Regulation carbon footprint verification requirements.'
  },
  {
    term: 'ISO 14065',
    definition: 'ISO 14065:2020 — the ISO standard specifying general principles and requirements for the competence, impartiality, and operation of bodies that validate and verify environmental information, including GHG assertions under the ISO 14060 series. It provides the framework for national accreditation bodies to assess GHG verification organizations and supports the consistent operation of third-party sustainability assurance markets.'
  },
  {
    term: 'GHG Verification',
    definition: 'A third-party assurance process in which an independent body assesses the accuracy, completeness, and reliability of an organization\'s GHG emissions data against the requirements of a specified reporting standard (e.g. ISO 14064-1, GHG Protocol Corporate Standard). GHG verification can be limited or reasonable in scope (as defined in ISSA 5000) and is increasingly required by regulations including CSRD and the EU Batteries Regulation carbon footprint regime.'
  },
  {
    term: 'Green Transition Directive',
    definition: 'Directive (EU) 2024/825 on Empowering Consumers for the Green Transition, in force 26 March 2024 (transposition by 27 March 2026). Amends the Consumer Rights Directive and Unfair Commercial Practices Directive to prohibit unsubstantiated generic environmental claims (e.g. "eco-friendly", "natural"), climate neutrality claims based on carbon offsetting rather than actual reductions, misleading sustainability labels, and designed-in premature obsolescence. Complements the proposed EU Green Claims Directive which sets substantiation and verification requirements for specific environmental claims.'
  },
  {
    term: 'GRI 14',
    definition: 'GRI 14: Mining Sector 2023 — the GRI Sector Standard identifying 22 material sustainability topics for the mining sector, published by the GSSB on 13 October 2023 and effective for reports published on or after 1 January 2025. Topics include mines and local communities, land rights, biodiversity, mine closure, artisanal and small-scale mining, occupational health and safety, forced and child labor, greenhouse gas emissions, water and effluents, and business integrity.'
  },
  {
    term: 'UK Climate-related Financial Disclosure Regulations',
    definition: 'The Companies (Strategic Report) (Climate-related Financial Disclosure) Regulations 2022 (SI 2022/31) and companion LLP regulations (SI 2022/46) — UK statutory instruments in force from 6 January 2022 that require large UK companies and LLPs (more than 500 employees plus turnover exceeding £500M or balance sheet exceeding £500M) to include TCFD-aligned climate-related financial disclosures in their strategic reports for financial years starting on or after 6 April 2022.'
  },
  {
    term: 'ESG Rating Provider',
    definition: 'Under EU Regulation (EU) 2024/3005 on ESG rating activities, an entity that issues ESG ratings on a professional basis. From 2 July 2026, providers issuing ESG ratings to EU-based clients must be authorised by ESMA or use an equivalence, endorsement, or recognition pathway, and must publicly disclose their methodologies, data sources, key assumptions, and conflicts of interest management arrangements.'
  },
  {
    term: 'Water Footprint',
    definition: 'In ISO 14046:2014, the total volume and type of freshwater consumed and degraded by a product, process, or organization, quantified using a life cycle assessment approach. Water footprint assessment covers both volumetric and quality aspects of water use across operations and supply chains, and can be weighted by local water scarcity to reflect the relative environmental significance of water use in different locations.'
  },
  {
    term: 'ISO 14046',
    definition: 'ISO 14046:2014 Environmental management — Water footprint — Principles, requirements, and guidelines. The international standard specifying how to calculate and report water footprints of products, processes, and organizations using a life cycle assessment approach. Referenced by ESRS E3 (Water and Marine Resources), the TNFD LEAP approach for freshwater, and the CDP water security questionnaire.'
  },
  {
    term: 'ISO/TR 14073',
    definition: 'ISO/TR 14073:2017 Environmental management — Water footprint — Illustrative examples on how to apply ISO 14046. An ISO technical report that provides practical examples showing how ISO 14046 water footprint assessments can be applied to products, processes, and organizations.'
  },
  {
    term: 'ISO 46001',
    definition: 'ISO 46001:2019 Water efficiency management systems — Requirements with guidance for use. The ISO standard for establishing and continually improving a water efficiency management system, focused on reducing, replacing, or reusing water and supported by monitoring, reporting, design, procurement, and training practices.'
  },
  {
    term: 'Water Efficiency Management System',
    definition: 'In ISO 46001, a management system an organization uses to establish policy, objectives, processes, and controls for improving water efficiency across its operations through a reduce, replace, or reuse approach.'
  },
  {
    term: 'ISO 14064-2',
    definition: 'ISO 14064-2:2019 — the second part of the ISO 14064 GHG series, specifying principles and requirements for quantifying, monitoring, and reporting greenhouse gas emission reductions or removal enhancements from project-based activities. Used as a technical basis for project-based emissions reduction accounting in voluntary carbon markets and supply-chain decarbonization programmes.'
  },
  {
    term: 'GHG Project',
    definition: 'In ISO 14064-2, an activity or set of activities that explicitly reduces GHG emissions or enhances GHG removals relative to a baseline scenario, with performance quantified, monitored, and reported according to a defined methodology.'
  },
  {
    term: 'Finance for Biodiversity Pledge',
    definition: 'A voluntary commitment launched 24 September 2020 under which signatory financial institutions commit to assess their biodiversity impact, set science-based biodiversity targets, prioritize biodiversity in financing decisions, and report publicly. By 2024, over 190 financial institutions representing more than €24 trillion in AUM had signed, making it the leading voluntary financial-sector commitment on nature loss. Coordinated by the Finance for Biodiversity Foundation.'
  },
  {
    term: 'ILO C190',
    definition: 'ILO Convention 190 on Violence and Harassment (2019) — the first international treaty exclusively addressing violence and harassment in the world of work, including gender-based violence and harassment. Adopted June 2019, in force June 2021. Applies to all workers regardless of employment status or sector and is increasingly referenced in corporate human rights due diligence, CSDDD risk assessments, and workplace safety supply-chain auditing.'
  },
  {
    term: 'Violence and Harassment Convention',
    definition: 'Alternative name for ILO Convention C190 (2019), the first ILO instrument exclusively covering violence and harassment in the world of work, including gender-based violence. Its companion Recommendation 206 (R206) provides supplementary implementation guidance.'
  },
  {
    term: 'UNCAC',
    definition: 'UN Convention against Corruption — the only universal legally binding anti-corruption treaty, adopted by the UN General Assembly in October 2003 and in force since December 2005, with 191 states parties. Covers prevention, criminalization of bribery and related offences, international cooperation, and asset recovery. Underpins the anti-corruption dimensions of ISO 37001, ISO 37301, the OECD Guidelines for MNEs, UN Global Compact Principle 10, and ESRS G1 business conduct disclosures.'
  },
  {
    term: 'TISFD',
    definition: 'Taskforce on Inequality and Social-related Financial Disclosures — a global initiative launched in 2023 to develop a voluntary framework for financial institutions and companies to measure, manage, and disclose their impacts on inequality and social factors. TISFD aims to do for social and inequality-related risks what the TCFD did for climate-related risks, with working groups developing consultation drafts across governance, strategy, risk management, and metrics pillars.'
  },
  {
    term: 'OECD Anti-Bribery Convention',
    definition: 'The Convention on Combating Bribery of Foreign Public Officials in International Business Transactions, adopted 21 November 1997 and in force since 15 February 1999. The only multilateral treaty focusing on the supply side of international bribery — the bribe-payer rather than the official receiving the bribe. Requires all 44 parties to criminalize bribery of foreign public officials and apply effective sanctions. Monitored through peer review by the OECD Working Group on Bribery. Underpins ISO 37001, the OECD Guidelines for MNEs, UN Global Compact Principle 10, and ESRS G1 business conduct disclosures.'
  },
  {
    term: 'Working Group on Bribery (WGB)',
    definition: 'The OECD body responsible for monitoring implementation and enforcement of the OECD Anti-Bribery Convention through a systematic peer-review process. WGB reviews assess each party\'s anti-bribery legislation, corporate liability rules, enforcement record, and sanctions applied, producing country reports with recommendations that are publicly disclosed.'
  },
  {
    term: 'ISO 45001',
    definition: 'ISO 45001:2018 Occupational health and safety management systems — Requirements with guidance for use. The leading international standard specifying requirements for an OH&S management system to prevent work-related injury and ill health. Published March 2018, replacing OHSAS 18001. Relevant to ESRS S1 (Own Workforce) OHS disclosures, GRI 403 (Occupational Health and Safety), and CSDDD value-chain due diligence on worker safety.'
  },
  {
    term: 'Occupational Health and Safety (OHS)',
    definition: 'In ISO 45001, the set of conditions and factors affecting or potentially affecting the health and safety of workers and other persons in the workplace. ISO 45001 provides the international management system framework for controlling OH&S risks and continually improving OH&S performance.'
  },
  {
    term: 'OHSAS 18001',
    definition: 'Occupational Health and Safety Assessment Series 18001 — the predecessor management system specification to ISO 45001, developed by British Standards Institution and widely adopted before being superseded by ISO 45001 in 2018. All OHSAS 18001 certifications transitioned to ISO 45001 by March 2021.'
  },
  {
    term: 'Life Cycle Assessment (LCA)',
    definition: 'A systematic methodology for evaluating environmental impacts associated with all stages of a product\'s or process\'s life, from raw material extraction through production, use, and end-of-life. LCA is the methodological basis for ISO 14067 (product carbon footprint) and ISO 14046 (water footprint), and is specified in ISO 14040 (principles and framework) and ISO 14044 (requirements and guidelines).'
  },
  {
    term: 'XRB',
    definition: 'External Reporting Board — the New Zealand independent Crown entity responsible for issuing accounting and sustainability reporting standards, including the Aotearoa New Zealand Climate Standards (NZ CS 1, 2, 3) mandated under the Financial Sector (Climate-related Disclosures and Other Matters) Amendment Act 2021.'
  },
  {
    term: 'NZ CS',
    definition: 'Aotearoa New Zealand Climate Standards — the three standards (NZ CS 1, NZ CS 2, NZ CS 3) issued by the External Reporting Board (XRB) in November 2022. NZ CS 1 sets out mandatory TCFD-aligned disclosure requirements for large listed issuers, banks, insurers, and investment scheme managers from FY2023. NZ CS 2 provides guidance on scenario analysis and NZ CS 3 on targets and transition plans.'
  },
  {
    term: 'KBV',
    definition: 'Klimaberichterstattungsverordnung — the Swiss Federal Ordinance on Climate Reporting (in force 1 January 2024) that implements the TCFD-aligned climate disclosure obligation for large Swiss listed companies, banks, and insurers under Art. 964b of the Swiss Code of Obligations. Companies must report on governance, strategy, risk management, and metrics and targets including GHG emissions. Also known by the French abbreviation OCRlimat.'
  },
  {
    term: 'California AB 1305',
    definition: 'Voluntary Carbon Market Disclosures Act — a California state law (effective 1 January 2024) requiring companies that sell voluntary carbon offsets in California, or that make net-zero, carbon-neutral, net-negative, or climate-neutral marketing claims based on offsets, to publish annual website disclosures covering offset project details, quantities, vintage years, protocols, and independent verification information. Enforced by the California Attorney General with civil penalties up to USD 2,500 per day per violation, capped at USD 500,000 per year. Complements SB 253 and SB 261 by targeting voluntary carbon market integrity and claim substantiation rather than mandatory GHG inventory reporting.'
  },
  {
    term: 'ISO 14040',
    definition: 'ISO 14040:2006 Environmental management — Life cycle assessment — Principles and framework. The ISO standard setting the general LCA framework: its principles, four-phase structure (goal and scope definition, life cycle inventory analysis, life cycle impact assessment, and interpretation), and requirements for conducting and communicating LCA studies. Forms the foundational pair with ISO 14044 and is referenced by ISO 14067, ISO 14046, and the GHG Protocol Product Life Cycle Standard.'
  },
  {
    term: 'ISO 14044',
    definition: 'ISO 14044:2006 Environmental management — Life cycle assessment — Requirements and guidelines. The companion standard to ISO 14040 that provides detailed requirements and guidelines for each LCA phase, including goal and scope definition, inventory analysis, impact assessment, interpretation, critical review, and reporting. The methodological basis directly referenced by ISO 14067 (product carbon footprint), ISO 14046 (water footprint), and ESRS E1, E3, and E5.'
  },
  {
    term: 'GRI 207',
    definition: 'GRI 207: Tax 2019 — the GRI Topic Standard on tax, effective from 1 January 2021. Requires organizations to disclose their approach to tax strategy and governance (GRI 207-1), tax risk management and controls (GRI 207-2), stakeholder engagement on tax (GRI 207-3), and public country-by-country data on revenues, profit before tax, taxes paid, and employee headcount by jurisdiction (GRI 207-4). Referenced by ESRS G1 for business conduct disclosures.'
  },
  {
    term: 'Country-by-Country Reporting (CbCR)',
    definition: 'The disclosure of key financial and tax data — revenues, profit or loss before income tax, income taxes paid, and employee headcount — on a jurisdiction-by-jurisdiction basis. Public CbCR under GRI 207-4 is a voluntary sustainability disclosure to stakeholders; regulatory CbCR under OECD BEPS Action 13 goes to tax authorities. The two instruments are complementary: regulatory CbCR covers transfer pricing compliance while public CbCR targets broader stakeholder accountability.'
  },
  {
    term: 'BEPS',
    definition: 'Base Erosion and Profit Shifting — the OECD/G20 initiative addressing tax avoidance strategies that exploit gaps and mismatches in international tax rules to shift profits to low- or no-tax jurisdictions. BEPS Action 13 introduced mandatory country-by-country reporting for large multinationals (consolidated group revenues ≥€750M) filed with tax authorities. Public country-by-country disclosure for stakeholders is addressed by GRI 207: Tax 2019, while ESG governance frameworks including ESRS G1 address corporate tax transparency commitments.'
  },
  {
    term: 'Functional Unit',
    definition: 'In ISO 14040 and ISO 14044, the quantified performance of a product system used as the reference unit for a life cycle assessment study. The functional unit defines what is being studied and provides the reference basis to which all LCI input and output data are normalized, enabling meaningful comparisons between different products or systems serving the same function.'
  },
  {
    term: 'GRI 305',
    definition: 'GRI 305: Emissions 2016 — the GRI Topic Standard on greenhouse gas emissions, effective from 1 July 2018. Requires disclosure of Scope 1 (direct), Scope 2 (energy indirect), and Scope 3 (other indirect) GHG emissions; GHG intensity and reductions; and emissions of ozone-depleting substances and other significant air pollutants. Methodologies must align with the GHG Protocol Corporate Standard or equivalent. Referenced in ESRS E1 (Climate Change) and ESRS E2 (Pollution), and mapped to CDP climate and IFRS S2 disclosures.'
  },
  {
    term: 'GRI 303',
    definition: 'GRI 303: Water and Effluents 2018 — the GRI Topic Standard on water as a shared resource, effective from 1 January 2021. Requires contextual disclosures on how the organization interacts with water and manages discharge impacts, plus quantitative disclosures on water withdrawal by source (303-3), water discharge by destination and quality (303-4), and water consumption (303-5), all with breakdowns for water-stressed areas. Aligns with ISO 14046, CDP Water Security questionnaire, and ESRS E3.'
  },
  {
    term: 'GRI 403',
    definition: 'GRI 403: Occupational Health and Safety 2018 — the GRI Topic Standard on OHS, effective from 1 January 2021. Contains ten disclosures covering OHS management systems (403-1), hazard identification and incident investigation (403-2), occupational health services (403-3), worker participation on OHS (403-4), worker training (403-5), health promotion (403-6), supply-chain OHS (403-7), workers covered by OHS management systems (403-8), work-related injury rates (403-9), and work-related ill health (403-10). Aligns with ISO 45001 and ILO OHS conventions; referenced in ESRS S1.'
  },
  {
    term: 'GRI 306',
    definition: 'GRI 306: Waste 2020 — the GRI Topic Standard on waste management, effective from 1 January 2022. Requires disclosure of waste generation and significant impacts (306-1 and 306-2), total waste generated in metric tons by hazardous/non-hazardous category (306-3), waste diverted from disposal by recovery route (306-4), and waste directed to disposal by method (306-5). Supports circular economy disclosures under ESRS E5 and aligns with the EU Waste Framework Directive and Basel Convention on hazardous wastes.'
  },
  {
    term: 'Water-Stressed Area',
    definition: 'A geographic area where water availability is limited relative to demand, posing risks of water scarcity, water stress, or water depletion. GRI 303: Water and Effluents 2018 requires separate disclosure of water withdrawal and consumption specifically in water-stressed areas, using recognised identification tools such as WRI Aqueduct, WWF Water Risk Filter, or other spatially explicit water risk frameworks. ESRS E3 (Water and Marine Resources) similarly requires location-specific disclosures for operations in areas of high water stress, and the TNFD LEAP approach assesses freshwater ecosystem dependencies in water-stressed locations.'
  },
  {
    term: 'GRI 401',
    definition: 'GRI 401: Employment 2016 \u2014 the GRI Topic Standard on employment, effective from 1 July 2018. Requires disclosure of new employee hires and employee turnover by age group, gender, and region (401-1); benefits provided to full-time employees not provided to temporary or part-time employees, including health care, disability coverage, parental leave, and retirement provision (401-2); and parental leave statistics including the number of employees who took parental leave, returned to work, and were retained twelve months later, broken down by gender (401-3). Referenced in ESRS S1 (Own Workforce) and by GRI 11 (Oil and Gas) and GRI 13 (Agriculture) sector standards.'
  },
  {
    term: 'GRI 404',
    definition: 'GRI 404: Training and Education 2016 \u2014 the GRI Topic Standard on training and education, effective from 1 July 2018. Requires disclosure of average hours of training per year per employee by gender and employee category (404-1); programs for upgrading employee skills and transition assistance programs for career endings (404-2); and the percentage of employees receiving regular performance and career development reviews by gender and employee category (404-3). Aligns with ESRS S1 (Own Workforce) training and skills development disclosures and ILO Convention C142 on human resources development.'
  },
  {
    term: 'GRI 405',
    definition: 'GRI 405: Diversity and Equal Opportunity 2016 \u2014 the GRI Topic Standard on diversity and equal opportunity, effective from 1 July 2018. Requires disclosure of the diversity of governance bodies and employees by gender, age group, and other diversity indicators such as minority group membership (405-1); and the ratio of basic salary and remuneration of women to men by employee category and significant locations of operation (405-2). Aligns with ESRS S1 workforce diversity disclosures, the EU Pay Transparency Directive (2023/970), and ILO Conventions C100 (Equal Remuneration) and C111 (Discrimination).'
  },
  {
    term: 'ISO 14031',
    definition: 'ISO 14031:2013 Environmental management \u2014 Environmental performance evaluation \u2014 Guidelines. The ISO standard providing a SCARI (Select, Collect, Analyze, Report, Improve) cycle approach to evaluating an organization\'s environmental performance using three categories of environmental performance indicator (EPI): Management Performance Indicators (MPIs), Operational Performance Indicators (OPIs), and Environmental Condition Indicators (ECIs). A companion to ISO 14001, it directly supports Clause 9 (Performance Evaluation) of ISO 14001:2015 and informs environmental KPI selection for GRI Topic Standards and ESRS environmental disclosures.'
  },
  {
    term: 'Management Performance Indicator (MPI)',
    definition: 'In ISO 14031, a category of environmental performance indicator (EPI) that measures the efforts and capabilities of an organization\'s management to influence environmental performance. MPIs include indicators relating to environmental training programs, audit outcomes, procurement decisions, compliance targets, and management system implementation, providing insight into how effectively management supports environmental performance improvement.'
  },
  {
    term: 'Operational Performance Indicator (OPI)',
    definition: 'In ISO 14031, a category of environmental performance indicator (EPI) that measures the environmental performance of an organization\'s operations, including energy consumption, water withdrawal, greenhouse gas emissions, waste generation, and land use. OPIs correspond directly to the quantitative metrics required by GRI environmental Topic Standards such as GRI 303, GRI 305, and GRI 306, and ESRS environmental standards under the CSRD.'
  },
  {
    term: 'Environmental Performance Indicator (EPI)',
    definition: 'In ISO 14031, a quantitative or qualitative measure of an organization\'s environmental performance. EPIs are organized into three categories: Management Performance Indicators (MPIs) covering management efforts and capability, Operational Performance Indicators (OPIs) covering operational environmental impacts, and Environmental Condition Indicators (ECIs) covering the state of the surrounding environment. EPIs are selected to reflect the organization\'s most significant environmental aspects and form the basis of environmental performance evaluation (EPE).'
  },
  {
    term: 'GRI 406',
    definition: 'GRI 406: Non-Discrimination 2016 \u2014 the GRI Topic Standard on non-discrimination, effective from 1 July 2018. Requires disclosure of the total number of incidents of discrimination during the reporting period and their status at year-end (under review, remediation plan implemented, plan implemented with outcomes reviewed, no longer subject to action), along with corrective actions taken (406-1). Aligns with ILO Discrimination (Employment and Occupation) Convention C111, the ILO Declaration on Fundamental Principles and Rights at Work, and ESRS S1 equal treatment and opportunity disclosures under the CSRD. Frequently reported alongside GRI 405 (Diversity and Equal Opportunity).'
  },
  {
    term: 'GRI 407',
    definition: 'GRI 407: Freedom of Association and Collective Bargaining 2016 \u2014 the GRI Topic Standard on freedom of association, effective from 1 July 2018. Requires identification of operations and suppliers where freedom of association and collective bargaining rights are at significant risk and disclosure of measures taken to support these rights (407-1). Aligns with ILO Conventions C87 (Freedom of Association) and C98 (Right to Organise), the ILO Declaration on Fundamental Principles and Rights at Work, ESRS S2 (Workers in the Value Chain), and the human rights due diligence requirements of the CSDDD and UN Guiding Principles.'
  },
  {
    term: 'GRI 408',
    definition: 'GRI 408: Child Labour 2016 \u2014 the GRI Topic Standard on child labour, effective from 1 July 2018. Requires identification of operations and suppliers at significant risk of child labour \u2014 including young workers in hazardous work \u2014 and disclosure of measures taken to contribute to the effective abolition of child labour (408-1). Aligns with ILO Conventions C138 (Minimum Age) and C182 (Worst Forms of Child Labour), the ILO Declaration on Fundamental Principles and Rights at Work, ESRS S2, and the CSDDD due diligence requirements. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 409',
    definition: 'GRI 409: Forced or Compulsory Labour 2016 \u2014 the GRI Topic Standard on forced or compulsory labour, effective from 1 July 2018. Requires identification of operations and suppliers at significant risk of forced or compulsory labour \u2014 including debt bondage, human trafficking, and deceptive recruitment \u2014 and disclosure of measures taken to contribute to its elimination (409-1). Aligns with ILO Conventions C29 (Forced Labour) and C105 (Abolition of Forced Labour), ESRS S2, the EU Forced Labour Regulation (EU 2024/3015), the UK Modern Slavery Act 2015, and the Australian Modern Slavery Act 2018. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 410',
    definition: 'GRI 410: Security Practices 2016 \u2014 the GRI Topic Standard on security practices, effective from 1 July 2018. Requires disclosure of the percentage of security personnel \u2014 both employees and contracted \u2014 who have received formal training in the organization\'s human rights policies or specific procedures and their application to security, broken down by internal and third-party security personnel (410-1). Aligns with the Voluntary Principles on Security and Human Rights (VPSHR), ILO C169, ESRS S2 (Workers in the Value Chain), and ESRS S3 (Affected Communities). Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 411',
    definition: 'GRI 411: Rights of Indigenous Peoples 2016 \u2014 the GRI Topic Standard on indigenous peoples\' rights, effective from 1 July 2018. Requires disclosure of the total number of identified incidents of violations involving the rights of indigenous peoples and their status at year-end \u2014 under review, remediation plan implemented, plan implemented with outcomes reviewed, or no longer subject to action (411-1). Aligns with the UN Declaration on the Rights of Indigenous Peoples (UNDRIP), ILO C169, ESRS S3 (Affected Communities), and ESRS E4 (Biodiversity and Ecosystems). Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 412',
    definition: 'GRI 412: Human Rights Assessment 2016 \u2014 the GRI Topic Standard on human rights assessment, effective from 1 July 2018. Contains three disclosures: the total number and percentage of significant operations subject to human rights reviews or impact assessments (412-1); total hours and percentage of employees trained on human rights policies or procedures (412-2); and total number and percentage of significant investment agreements that include human rights clauses or underwent human rights screening (412-3). Aligns with the UNGPs, CSDDD, and ESRS S1/S2/S3. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 413',
    definition: 'GRI 413: Local Communities 2016 \u2014 the GRI Topic Standard on local communities, effective from 1 July 2018. Contains two disclosures: the percentage of operations with implemented local community engagement, impact assessments, and/or development programs including grievance mechanisms (413-1); and operations with significant actual and potential negative impacts on local communities by location and nature of impact (413-2). Aligns with IFC Performance Standards 1 and 5, ESRS S3 (Affected Communities), UNGPs, and CSDDD. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'FPIC',
    definition: 'Free, Prior and Informed Consent \u2014 the right of indigenous peoples to be consulted and to give or withhold consent before states or companies implement projects that may affect their territories, resources, or cultures. FPIC is enshrined in the UN Declaration on the Rights of Indigenous Peoples (UNDRIP) and ILO Convention C169, and is referenced in IFC Performance Standard 7 (Indigenous Peoples), ESRS S3 (Affected Communities), and the OECD Guidelines for Multinational Enterprises.'
  },
  {
    term: 'VPSHR',
    definition: 'Voluntary Principles on Security and Human Rights \u2014 a multi-stakeholder initiative providing guidance to extractive companies (oil, gas, and mining) on maintaining the safety and security of their operations in a manner consistent with respect for human rights. The VPSHR address risk assessment, engagement with public security forces, and engagement with private security providers. Referenced in GRI 410: Security Practices 2016 and relevant to ESRS S3 (Affected Communities) disclosures.'
  },
  {
    term: 'UNDRIP',
    definition: 'United Nations Declaration on the Rights of Indigenous Peoples \u2014 adopted by the UN General Assembly on 13 September 2007. The UNDRIP sets the global minimum standards for the rights of indigenous peoples, covering rights to land, resources, self-determination, culture, identity, and free, prior and informed consent (FPIC). Referenced in GRI 411 (Rights of Indigenous Peoples), ILO C169, IFC Performance Standard 7, ESRS S3 (Affected Communities), and ESRS E4 (Biodiversity and Ecosystems).'
  },
  {
    term: 'GRI 414',
    definition: 'GRI 414: Supplier Social Assessment 2016 \u2014 the GRI Topic Standard on supplier social assessment, effective from 1 July 2018. Contains two disclosures: the percentage of new suppliers screened using social criteria such as labor practices and human rights (414-1); and the number and identification of suppliers with significant actual or potential negative social impacts in the supply chain and actions taken, including improvements agreed upon and relationships terminated as a result of assessment (414-2). Aligns with CSDDD value-chain due diligence requirements, ESRS S2 (Workers in the Value Chain), UNGPs, ILO MNE Declaration, and OECD Due Diligence Guidance for Responsible Business Conduct. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 415',
    definition: 'GRI 415: Public Policy 2016 \u2014 the GRI Topic Standard on public policy, effective from 1 July 2018. Contains one disclosure: the total monetary value of financial and in-kind political contributions made directly and indirectly by the organization, broken down by country and by recipient or beneficiary (415-1). Promotes transparency in corporate political engagement and lobbying activities. Aligns with UNCAC, OECD Anti-Bribery Convention, ISO 37001 (Anti-bribery Management Systems), ESRS G1 (Business Conduct), and UN Global Compact Principle 10 on Anti-Corruption.'
  },
  {
    term: 'GRI 416',
    definition: 'GRI 416: Customer Health and Safety 2016 \u2014 the GRI Topic Standard on customer health and safety, effective from 1 July 2018. Contains two disclosures: the percentage of significant product and service categories for which health and safety impacts are assessed for improvement (416-1); and total incidents of non-compliance with regulations and voluntary codes concerning health and safety impacts of products and services, broken down by type (fines or penalties, warnings, voluntary code violations) (416-2). Aligns with ESRS S4 (Consumers and End-users), ISO 9001 (Quality Management Systems), and the EU General Product Safety Regulation (EU) 2023/988.'
  },
  {
    term: 'GRI 417',
    definition: 'GRI 417: Marketing and Labeling 2016 \u2014 the GRI Topic Standard on marketing and labeling, effective from 1 July 2018. Contains three disclosures: product and service information requirements and percentage of significant categories assessed for compliance with labeling procedures, including sourcing, safe use, and environmental or social certifications (417-1); incidents of non-compliance with regulations and voluntary codes concerning product and service information and labeling (417-2); and incidents of non-compliance with regulations and voluntary codes concerning marketing communications including advertising, promotion, and sponsorship (417-3). Aligns with ESRS S4 (Consumers and End-users) and is related to anti-greenwashing frameworks including the UK FCA Anti-Greenwashing Rule and ESMA fund name guidelines.'
  },
  {
    term: 'GRI 418',
    definition: 'GRI 418: Customer Privacy 2016 \u2014 the GRI Topic Standard on customer privacy, effective from 1 July 2018. Contains one disclosure: the total number of substantiated complaints received concerning breaches of customer privacy and losses of customer data, including complaints from outside parties, complaints from regulatory bodies, and identified leaks, thefts, or losses of customer data (418-1). Aligns with the EU General Data Protection Regulation (GDPR, EU 2016/679), ISO/IEC 27001 (Information Security Management Systems), and ESRS S4 (Consumers and End-users). Note: the GSSB has initiated a project to develop a successor GRI Privacy Standard to replace GRI 418.'
  },
  {
    term: 'GDPR',
    definition: 'General Data Protection Regulation \u2014 Regulation (EU) 2016/679, the EU\'s primary data protection law, in force since 25 May 2018. The GDPR establishes rules for the collection, processing, storage, and transfer of personal data of EU residents, including rights of data subjects (access, rectification, erasure, portability), obligations on data controllers and processors (lawful basis, privacy-by-design, data breach notification within 72 hours), and supervisory authority oversight by national Data Protection Authorities. Maximum fines of up to EUR 20 million or 4% of global annual turnover. Referenced in GRI 418 (Customer Privacy) and relevant to ESRS S4 (Consumers and End-users) disclosures on data protection. The GDPR served as the model for similar privacy laws worldwide, including the UK GDPR and Brazil\'s LGPD.'
  },
  {
    term: 'Product Stewardship',
    definition: 'A management approach under which manufacturers and other supply chain actors take responsibility for the health, safety, environmental, and social impacts of their products throughout the entire product life cycle \u2014 from design and manufacturing through distribution, use, repair, and end-of-life disposal, recycling, or reuse. Product stewardship encompasses extended producer responsibility (EPR), eco-design, take-back schemes, and safe-use labeling. Referenced in GRI 416 (Customer Health and Safety) and GRI 417 (Marketing and Labeling), and relevant to the EU Ecodesign for Sustainable Products Regulation (ESPR), the EU Digital Product Passport (DPP), and circular economy principles under ESRS E5 (Resource Use and Circular Economy).'
  },
  {
    term: 'GRI 419',
    definition: 'GRI 419: Socioeconomic Compliance 2016 \u2014 the GRI Topic Standard on socioeconomic compliance, effective from 1 July 2018. Contains one disclosure: the total monetary value of significant fines and total number of non-monetary sanctions for non-compliance with laws and/or regulations in social and economic areas (419-1), covering fines, non-monetary sanctions, and dispute resolution cases. Acts as a catch-all governance disclosure for regulatory compliance not captured by other GRI topic standards. Aligns with ESRS G1 (Business Conduct) under the CSRD, the OECD Guidelines for Multinational Enterprises, and the UN Global Compact. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 402',
    definition: 'GRI 402: Labor/Management Relations 2016 \u2014 the GRI Topic Standard on labor/management relations, effective from 1 July 2018. Contains one disclosure: the minimum number of weeks\' notice typically provided to employees and their representatives before implementing significant operational changes (such as restructuring, closures, or major ownership changes) that could substantially affect them, and whether this notice period is specified in collective agreements (402-1). Aligns with ILO Convention C135 (Workers\' Representatives Convention), ILO MNE Declaration, and ESRS S1 (Own Workforce). Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 201',
    definition: 'GRI 201: Economic Performance 2016 \u2014 the GRI Topic Standard on economic performance, effective from 1 July 2018. Contains four disclosures: direct economic value generated and distributed (EVG&D) including revenues, operating costs, employee wages, payments to providers of capital and government, and community investments (201-1); financial implications and other risks and opportunities due to climate change (201-2); defined benefit plan obligations and other retirement plans (201-3); and financial assistance received from government including tax relief, grants, and subsidies (201-4). GRI 201-2 on climate financial implications complements ESRS E1 and IFRS S2. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 205',
    definition: 'GRI 205: Anti-Corruption 2016 \u2014 the GRI Topic Standard on anti-corruption, effective from 1 July 2018. Contains three disclosures: total number and percentage of operations assessed for corruption risks and significant risks identified (205-1); total number and percentage of governance body members, employees, and business partners receiving anti-corruption policies and training, by category (205-2); and confirmed incidents of corruption and actions taken, including employee dismissals, contract terminations, and public legal cases (205-3). Aligns with UNCAC, the OECD Anti-Bribery Convention, ISO 37001 (Anti-bribery Management Systems), ESRS G1 (Business Conduct), and UN Global Compact Principle 10. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 202',
    definition: 'GRI 202: Market Presence 2016 \u2014 the GRI Topic Standard on market presence, effective from 1 July 2018. Contains two disclosures: ratios of the standard entry-level wage by gender at significant locations of operation compared to the local minimum wage (202-1); and proportion of senior management at significant locations of operation hired from the local community (202-2). Reflects the degree to which the organization contributes to local economic development through wage levels and local talent integration. Aligns with ILO C100 (Equal Remuneration), ILO MNE Declaration, ESRS S1 (Own Workforce), and SDGs 5 and 8. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 203',
    definition: 'GRI 203: Indirect Economic Impacts 2016 \u2014 the GRI Topic Standard on indirect economic impacts, effective from 1 July 2018. Contains two disclosures: examples of infrastructure investments and services supported and their current or expected future effects on communities and economies (203-1); and significant indirect economic impacts \u2014 positive and negative \u2014 including supply-chain effects, induced impacts from employee and supplier spending, leveraged private investment, and changes in productivity or access to goods and services (203-2). Aligns with IFC Performance Standards 1 and 8, SDG 9 (Industry, Innovation, Infrastructure), SDG 8 (Decent Work), and ESRS G1. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 204',
    definition: 'GRI 204: Procurement Practices 2016 \u2014 the GRI Topic Standard on procurement practices, effective from 1 July 2018. Contains one disclosure: the percentage of the procurement budget at significant locations of operation spent on suppliers local to that operation (204-1). Local suppliers are those headquartered in the same geographical market as the significant location. Supports local economic development, supply-chain resilience, and reduced transportation impacts. Aligns with the OECD Guidelines for Multinational Enterprises, ILO MNE Declaration, ESRS G1, ESRS S3 (Affected Communities), IFC Performance Standard 1, and SDGs 8 and 12. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 206',
    definition: 'GRI 206: Anti-competitive Behavior 2016 \u2014 the GRI Topic Standard on anti-competitive behavior, effective from 1 July 2018. Contains one disclosure: the total number of legal actions pending or completed during the reporting period regarding anti-competitive behavior and violations of anti-trust and monopoly legislation, and their outcomes (206-1). Covers price-fixing, bid-rigging, market allocation, abuse of dominant position, and exclusive dealing. Aligns with ESRS G1 (Business Conduct), the OECD Guidelines for Multinational Enterprises (Chapter X on Competition), the UN Global Compact Principle 10, EU Regulation 1/2003, and US Sherman and Clayton Acts. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 301',
    definition: 'GRI 301: Materials 2016 \u2014 the GRI Topic Standard on materials use, effective from 1 July 2018. Contains three disclosures: total weight or volume of materials used (renewable and non-renewable) to produce and package the organization\'s primary products and services (301-1); percentage of recycled input materials used (301-2); and percentage of reclaimed products and their packaging materials by product category (301-3). Supports circular economy reporting under ESRS E5 (Resource Use and Circular Economy) and aligns with ISO 14040/14044 life cycle assessment methodology, the EU Eco-design for Sustainable Products Regulation (ESPR), and the Digital Product Passport (DPP) concept. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 302',
    definition: 'GRI 302: Energy 2016 \u2014 the GRI Topic Standard on energy, effective from 1 July 2018. Contains five disclosures: total energy consumption within the organization from non-renewable and renewable sources (302-1); energy consumption outside the organization related to value-chain activities (302-2); energy intensity ratio per unit of output (302-3); reductions in energy consumption achieved through conservation and efficiency initiatives (302-4); and reductions in energy requirements of sold products and services (302-5). Aligns with ESRS E1 (Climate Change), ISO 50001:2018 (Energy Management Systems), the CDP Climate Change questionnaire, and IFRS S2. Note: GRI 103: Energy 2025 is the published successor standard; GRI 302 remains applicable for reporting periods before GRI 103\'s effective date. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 304',
    definition: 'GRI 304: Biodiversity 2016 \u2014 the GRI Topic Standard on biodiversity, effective from 1 July 2018. Contains four disclosures: list of operational sites in or adjacent to protected areas and areas of high biodiversity value (304-1); description of significant direct and indirect impacts on biodiversity from activities, products, and services (304-2); total number and size of habitats protected or restored and their restoration success monitoring (304-3); and total number of IUCN Red List species and national conservation list species with habitats in areas affected by operations, by extinction risk category (304-4). Aligns with ESRS E4 (Biodiversity and Ecosystems), the TNFD LEAP approach, SBTN methodology, and the Kunming-Montreal Global Biodiversity Framework (KM-GBF) Target 15. Note: GRI 101: Biodiversity 2024 is the published successor standard; GRI 304 remains applicable for reporting periods before GRI 101\'s effective date. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 307',
    definition: 'GRI 307: Environmental Compliance 2016 \u2014 the GRI Topic Standard on environmental compliance, effective from 1 July 2018. Contains one disclosure: the total monetary value of significant fines and the total number of non-monetary sanctions for non-compliance with environmental laws and regulations, and cases brought through dispute resolution mechanisms (307-1). The standard distinguishes between non-compliance with international declarations, national laws, and voluntary codes. It is the environmental counterpart to GRI 419 (Socioeconomic Compliance 2016), which covers social and economic non-compliance. Aligns with ESRS G1 (Business Conduct) compliance provisions and supports disclosure under ESRS E1\u2013E5. Required in GRI 11, 12, and 13 sector standards.'
  },
  {
    term: 'GRI 308',
    definition: 'GRI 308: Supplier Environmental Assessment 2016 \u2014 the GRI Topic Standard on supplier environmental assessment, effective from 1 July 2018. Contains two disclosures: the percentage of new suppliers screened using environmental criteria (308-1); and the number of suppliers assessed for environmental impacts, the number identified as having significant actual or potential negative environmental impacts, the percentage with which improvements were agreed, and the percentage with which relationships were terminated as a result (308-2). It is the environmental counterpart to GRI 414 (Supplier Social Assessment 2016). Aligns with ISO 14001:2015 supply chain requirements, the OECD Due Diligence Guidance for Responsible Business Conduct, ESRS E1\u2013E5 value-chain provisions, and CSDDD supply chain due diligence obligations. Required in GRI 11, 12, and 13 sector standards.'
  },
]
