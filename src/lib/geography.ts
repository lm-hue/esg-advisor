export type GeographyKind = 'country' | 'region' | 'global' | 'org'
export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'Oceania' | 'South America' | 'Global'

export interface GeographyOption {
  value: string
  name: string
  kind: GeographyKind
  region: string
  continent: Continent
  emoji: string
  countryCode?: string
  worldAtlasId?: string
}

const EU_MEMBER_STATES: GeographyOption[] = [
  { value: 'Austria', name: 'Austria', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇦🇹', countryCode: 'AT', worldAtlasId: '040' },
  { value: 'Belgium', name: 'Belgium', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇧🇪', countryCode: 'BE', worldAtlasId: '056' },
  { value: 'Bulgaria', name: 'Bulgaria', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇧🇬', countryCode: 'BG', worldAtlasId: '100' },
  { value: 'Croatia', name: 'Croatia', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇭🇷', countryCode: 'HR', worldAtlasId: '191' },
  { value: 'Cyprus', name: 'Cyprus', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇨🇾', countryCode: 'CY', worldAtlasId: '196' },
  { value: 'Czechia', name: 'Czechia', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇨🇿', countryCode: 'CZ', worldAtlasId: '203' },
  { value: 'Denmark', name: 'Denmark', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇩🇰', countryCode: 'DK', worldAtlasId: '208' },
  { value: 'Estonia', name: 'Estonia', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇪🇪', countryCode: 'EE', worldAtlasId: '233' },
  { value: 'Finland', name: 'Finland', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇫🇮', countryCode: 'FI', worldAtlasId: '246' },
  { value: 'France', name: 'France', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇫🇷', countryCode: 'FR', worldAtlasId: '250' },
  { value: 'Germany', name: 'Germany', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇩🇪', countryCode: 'DE', worldAtlasId: '276' },
  { value: 'Greece', name: 'Greece', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇬🇷', countryCode: 'GR', worldAtlasId: '300' },
  { value: 'Hungary', name: 'Hungary', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇭🇺', countryCode: 'HU', worldAtlasId: '348' },
  { value: 'Ireland', name: 'Ireland', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇮🇪', countryCode: 'IE', worldAtlasId: '372' },
  { value: 'Italy', name: 'Italy', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇮🇹', countryCode: 'IT', worldAtlasId: '380' },
  { value: 'Latvia', name: 'Latvia', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇱🇻', countryCode: 'LV', worldAtlasId: '428' },
  { value: 'Lithuania', name: 'Lithuania', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇱🇹', countryCode: 'LT', worldAtlasId: '440' },
  { value: 'Luxembourg', name: 'Luxembourg', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇱🇺', countryCode: 'LU', worldAtlasId: '442' },
  { value: 'Malta', name: 'Malta', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇲🇹', countryCode: 'MT', worldAtlasId: '470' },
  { value: 'Netherlands', name: 'Netherlands', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇳🇱', countryCode: 'NL', worldAtlasId: '528' },
  { value: 'Poland', name: 'Poland', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇵🇱', countryCode: 'PL', worldAtlasId: '616' },
  { value: 'Portugal', name: 'Portugal', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇵🇹', countryCode: 'PT', worldAtlasId: '620' },
  { value: 'Romania', name: 'Romania', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇷🇴', countryCode: 'RO', worldAtlasId: '642' },
  { value: 'Slovakia', name: 'Slovakia', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇸🇰', countryCode: 'SK', worldAtlasId: '703' },
  { value: 'Slovenia', name: 'Slovenia', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇸🇮', countryCode: 'SI', worldAtlasId: '705' },
  { value: 'Spain', name: 'Spain', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇪🇸', countryCode: 'ES', worldAtlasId: '724' },
  { value: 'Sweden', name: 'Sweden', kind: 'country', region: 'EU', continent: 'Europe', emoji: '🇸🇪', countryCode: 'SE', worldAtlasId: '752' },
]

export const GEOGRAPHY_OPTIONS: GeographyOption[] = [
  // ── Global & Supranational ─────────────────────────────────────────────
  { value: 'Global', name: 'Global', kind: 'global', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'EU', name: 'European Union', kind: 'region', region: 'EU', continent: 'Europe', emoji: '🇪🇺' },
  { value: 'ASEAN', name: 'ASEAN', kind: 'org', region: 'Global', continent: 'Asia', emoji: '🌏' },
  { value: 'Mercosur', name: 'Mercosur', kind: 'org', region: 'Global', continent: 'South America', emoji: '🌎' },
  { value: 'OECD', name: 'OECD', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'UN', name: 'United Nations', kind: 'org', region: 'Global', continent: 'Global', emoji: '🇺🇳' },

  // ── International standards bodies ────────────────────────────────────
  { value: 'CDP', name: 'Carbon Disclosure Project (CDP)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'GRI', name: 'Global Reporting Initiative (GRI)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'IFRS', name: 'IFRS Foundation', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'IIRC', name: 'International Integrated Reporting Council (IIRC)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'ILO', name: 'International Labour Organization (ILO)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'IFC', name: 'International Finance Corporation (IFC)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'ICMM', name: 'International Council on Mining and Metals (ICMM)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'SASB', name: 'Sustainability Accounting Standards Board (SASB)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'SBTi', name: 'Science Based Targets initiative (SBTi)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'TCFD', name: 'Task Force on Climate-Related Financial Disclosures (TCFD)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'TNFD', name: 'Taskforce on Nature-related Financial Disclosures (TNFD)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'SSE', name: 'Sustainable Stock Exchanges (SSE) initiative', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'SRP', name: 'Sustainable Rice Platform', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },
  { value: 'CDSB', name: 'Climate Disclosure Standards Board (CDSB)', kind: 'org', region: 'Global', continent: 'Global', emoji: '🌍' },

  // ── EU member states ───────────────────────────────────────────────────
  ...EU_MEMBER_STATES,

  // ── Rest of Europe ─────────────────────────────────────────────────────
  { value: 'UK', name: 'United Kingdom', kind: 'country', region: 'UK', continent: 'Europe', emoji: '🇬🇧', countryCode: 'GB', worldAtlasId: '826' },
  { value: 'Norway', name: 'Norway', kind: 'country', region: 'Norway', continent: 'Europe', emoji: '🇳🇴', countryCode: 'NO', worldAtlasId: '578' },
  { value: 'Switzerland', name: 'Switzerland', kind: 'country', region: 'Switzerland', continent: 'Europe', emoji: '🇨🇭', countryCode: 'CH', worldAtlasId: '756' },
  { value: 'Turkey', name: 'Turkey', kind: 'country', region: 'Turkey', continent: 'Europe', emoji: '🇹🇷', countryCode: 'TR', worldAtlasId: '792' },
  { value: 'Albania', name: 'Albania', kind: 'country', region: 'Albania', continent: 'Europe', emoji: '🇦🇱', countryCode: 'AL', worldAtlasId: '008' },
  { value: 'Andorra', name: 'Andorra', kind: 'country', region: 'Andorra', continent: 'Europe', emoji: '🇦🇩', countryCode: 'AD', worldAtlasId: '020' },
  { value: 'Armenia', name: 'Armenia', kind: 'country', region: 'Armenia', continent: 'Europe', emoji: '🇦🇲', countryCode: 'AM', worldAtlasId: '051' },
  { value: 'Azerbaijan', name: 'Azerbaijan', kind: 'country', region: 'Azerbaijan', continent: 'Europe', emoji: '🇦🇿', countryCode: 'AZ', worldAtlasId: '031' },
  { value: 'Bosnia and Herzegovina', name: 'Bosnia and Herzegovina', kind: 'country', region: 'Bosnia and Herzegovina', continent: 'Europe', emoji: '🇧🇦', countryCode: 'BA', worldAtlasId: '070' },
  { value: 'Georgia', name: 'Georgia', kind: 'country', region: 'Georgia', continent: 'Europe', emoji: '🇬🇪', countryCode: 'GE', worldAtlasId: '268' },
  { value: 'Guernsey', name: 'Guernsey', kind: 'country', region: 'Guernsey', continent: 'Europe', emoji: '🇬🇬', countryCode: 'GG' },
  { value: 'Iceland', name: 'Iceland', kind: 'country', region: 'Iceland', continent: 'Europe', emoji: '🇮🇸', countryCode: 'IS', worldAtlasId: '352' },
  { value: 'Isle of Man', name: 'Isle of Man', kind: 'country', region: 'Isle of Man', continent: 'Europe', emoji: '🇮🇲', countryCode: 'IM' },
  { value: 'Jersey', name: 'Jersey', kind: 'country', region: 'Jersey', continent: 'Europe', emoji: '🇯🇪', countryCode: 'JE' },
  { value: 'Kosovo', name: 'Kosovo', kind: 'country', region: 'Kosovo', continent: 'Europe', emoji: '🇽🇰', countryCode: 'XK' },
  { value: 'Liechtenstein', name: 'Liechtenstein', kind: 'country', region: 'Liechtenstein', continent: 'Europe', emoji: '🇱🇮', countryCode: 'LI', worldAtlasId: '438' },
  { value: 'Macedonia', name: 'North Macedonia', kind: 'country', region: 'Macedonia', continent: 'Europe', emoji: '🇲🇰', countryCode: 'MK', worldAtlasId: '807' },
  { value: 'Moldova', name: 'Moldova', kind: 'country', region: 'Moldova', continent: 'Europe', emoji: '🇲🇩', countryCode: 'MD', worldAtlasId: '498' },
  { value: 'Monaco', name: 'Monaco', kind: 'country', region: 'Monaco', continent: 'Europe', emoji: '🇲🇨', countryCode: 'MC', worldAtlasId: '492' },
  { value: 'Montenegro', name: 'Montenegro', kind: 'country', region: 'Montenegro', continent: 'Europe', emoji: '🇲🇪', countryCode: 'ME', worldAtlasId: '499' },
  { value: 'Russia', name: 'Russia', kind: 'country', region: 'Russia', continent: 'Europe', emoji: '🇷🇺', countryCode: 'RU', worldAtlasId: '643' },
  { value: 'San Marino', name: 'San Marino', kind: 'country', region: 'San Marino', continent: 'Europe', emoji: '🇸🇲', countryCode: 'SM', worldAtlasId: '674' },
  { value: 'Serbia', name: 'Serbia', kind: 'country', region: 'Serbia', continent: 'Europe', emoji: '🇷🇸', countryCode: 'RS', worldAtlasId: '688' },
  { value: 'Ukraine', name: 'Ukraine', kind: 'country', region: 'Ukraine', continent: 'Europe', emoji: '🇺🇦', countryCode: 'UA', worldAtlasId: '804' },

  // ── North America ──────────────────────────────────────────────────────
  { value: 'USA', name: 'United States', kind: 'country', region: 'USA', continent: 'North America', emoji: '🇺🇸', countryCode: 'US', worldAtlasId: '840' },
  { value: 'Canada', name: 'Canada', kind: 'country', region: 'Canada', continent: 'North America', emoji: '🇨🇦', countryCode: 'CA', worldAtlasId: '124' },
  { value: 'Mexico', name: 'Mexico', kind: 'country', region: 'Mexico', continent: 'North America', emoji: '🇲🇽', countryCode: 'MX', worldAtlasId: '484' },
  { value: 'Barbados', name: 'Barbados', kind: 'country', region: 'Barbados', continent: 'North America', emoji: '🇧🇧', countryCode: 'BB', worldAtlasId: '052' },
  { value: 'Costa Rica', name: 'Costa Rica', kind: 'country', region: 'Costa Rica', continent: 'North America', emoji: '🇨🇷', countryCode: 'CR', worldAtlasId: '188' },
  { value: 'Dominican Republic', name: 'Dominican Republic', kind: 'country', region: 'Dominican Republic', continent: 'North America', emoji: '🇩🇴', countryCode: 'DO', worldAtlasId: '214' },
  { value: 'El Salvador', name: 'El Salvador', kind: 'country', region: 'El Salvador', continent: 'North America', emoji: '🇸🇻', countryCode: 'SV', worldAtlasId: '222' },
  { value: 'Guatemala', name: 'Guatemala', kind: 'country', region: 'Guatemala', continent: 'North America', emoji: '🇬🇹', countryCode: 'GT', worldAtlasId: '320' },
  { value: 'Honduras', name: 'Honduras', kind: 'country', region: 'Honduras', continent: 'North America', emoji: '🇭🇳', countryCode: 'HN', worldAtlasId: '340' },
  { value: 'Jamaica', name: 'Jamaica', kind: 'country', region: 'Jamaica', continent: 'North America', emoji: '🇯🇲', countryCode: 'JM', worldAtlasId: '388' },
  { value: 'Panama', name: 'Panama', kind: 'country', region: 'Panama', continent: 'North America', emoji: '🇵🇦', countryCode: 'PA', worldAtlasId: '591' },
  { value: 'Trinidad and Tobago', name: 'Trinidad and Tobago', kind: 'country', region: 'Trinidad and Tobago', continent: 'North America', emoji: '🇹🇹', countryCode: 'TT', worldAtlasId: '780' },

  // ── South America ──────────────────────────────────────────────────────
  { value: 'Brazil', name: 'Brazil', kind: 'country', region: 'Brazil', continent: 'South America', emoji: '🇧🇷', countryCode: 'BR', worldAtlasId: '076' },
  { value: 'Argentina', name: 'Argentina', kind: 'country', region: 'Argentina', continent: 'South America', emoji: '🇦🇷', countryCode: 'AR', worldAtlasId: '032' },
  { value: 'Bolivia', name: 'Bolivia', kind: 'country', region: 'Bolivia', continent: 'South America', emoji: '🇧🇴', countryCode: 'BO', worldAtlasId: '068' },
  { value: 'Chile', name: 'Chile', kind: 'country', region: 'Chile', continent: 'South America', emoji: '🇨🇱', countryCode: 'CL', worldAtlasId: '152' },
  { value: 'Colombia', name: 'Colombia', kind: 'country', region: 'Colombia', continent: 'South America', emoji: '🇨🇴', countryCode: 'CO', worldAtlasId: '170' },
  { value: 'Ecuador', name: 'Ecuador', kind: 'country', region: 'Ecuador', continent: 'South America', emoji: '🇪🇨', countryCode: 'EC', worldAtlasId: '218' },
  { value: 'Peru', name: 'Peru', kind: 'country', region: 'Peru', continent: 'South America', emoji: '🇵🇪', countryCode: 'PE', worldAtlasId: '604' },
  { value: 'Suriname', name: 'Suriname', kind: 'country', region: 'Suriname', continent: 'South America', emoji: '🇸🇷', countryCode: 'SR', worldAtlasId: '740' },
  { value: 'Uruguay', name: 'Uruguay', kind: 'country', region: 'Uruguay', continent: 'South America', emoji: '🇺🇾', countryCode: 'UY', worldAtlasId: '858' },
  { value: 'Venezuela', name: 'Venezuela', kind: 'country', region: 'Venezuela', continent: 'South America', emoji: '🇻🇪', countryCode: 'VE', worldAtlasId: '862' },

  // ── Asia ───────────────────────────────────────────────────────────────
  { value: 'China', name: 'China', kind: 'country', region: 'China', continent: 'Asia', emoji: '🇨🇳', countryCode: 'CN', worldAtlasId: '156' },
  { value: 'Hong Kong', name: 'Hong Kong', kind: 'country', region: 'Hong Kong', continent: 'Asia', emoji: '🇭🇰', countryCode: 'HK', worldAtlasId: '344' },
  { value: 'India', name: 'India', kind: 'country', region: 'India', continent: 'Asia', emoji: '🇮🇳', countryCode: 'IN', worldAtlasId: '356' },
  { value: 'Indonesia', name: 'Indonesia', kind: 'country', region: 'Indonesia', continent: 'Asia', emoji: '🇮🇩', countryCode: 'ID', worldAtlasId: '360' },
  { value: 'Japan', name: 'Japan', kind: 'country', region: 'Japan', continent: 'Asia', emoji: '🇯🇵', countryCode: 'JP', worldAtlasId: '392' },
  { value: 'Saudi Arabia', name: 'Saudi Arabia', kind: 'country', region: 'Saudi Arabia', continent: 'Asia', emoji: '🇸🇦', countryCode: 'SA', worldAtlasId: '682' },
  { value: 'Singapore', name: 'Singapore', kind: 'country', region: 'Singapore', continent: 'Asia', emoji: '🇸🇬', countryCode: 'SG', worldAtlasId: '702' },
  { value: 'South Korea', name: 'South Korea', kind: 'country', region: 'South Korea', continent: 'Asia', emoji: '🇰🇷', countryCode: 'KR', worldAtlasId: '410' },
  { value: 'UAE', name: 'United Arab Emirates', kind: 'country', region: 'UAE', continent: 'Asia', emoji: '🇦🇪', countryCode: 'AE', worldAtlasId: '784' },
  { value: 'Bahrain', name: 'Bahrain', kind: 'country', region: 'Bahrain', continent: 'Asia', emoji: '🇧🇭', countryCode: 'BH', worldAtlasId: '048' },
  { value: 'Bangladesh', name: 'Bangladesh', kind: 'country', region: 'Bangladesh', continent: 'Asia', emoji: '🇧🇩', countryCode: 'BD', worldAtlasId: '050' },
  { value: 'Bhutan', name: 'Bhutan', kind: 'country', region: 'Bhutan', continent: 'Asia', emoji: '🇧🇹', countryCode: 'BT', worldAtlasId: '064' },
  { value: 'Cambodia', name: 'Cambodia', kind: 'country', region: 'Cambodia', continent: 'Asia', emoji: '🇰🇭', countryCode: 'KH', worldAtlasId: '116' },
  { value: 'Iran', name: 'Iran', kind: 'country', region: 'Iran', continent: 'Asia', emoji: '🇮🇷', countryCode: 'IR', worldAtlasId: '364' },
  { value: 'Iraq', name: 'Iraq', kind: 'country', region: 'Iraq', continent: 'Asia', emoji: '🇮🇶', countryCode: 'IQ', worldAtlasId: '368' },
  { value: 'Israel', name: 'Israel', kind: 'country', region: 'Israel', continent: 'Asia', emoji: '🇮🇱', countryCode: 'IL', worldAtlasId: '376' },
  { value: 'Jordan', name: 'Jordan', kind: 'country', region: 'Jordan', continent: 'Asia', emoji: '🇯🇴', countryCode: 'JO', worldAtlasId: '400' },
  { value: 'Kazakhstan', name: 'Kazakhstan', kind: 'country', region: 'Kazakhstan', continent: 'Asia', emoji: '🇰🇿', countryCode: 'KZ', worldAtlasId: '398' },
  { value: 'Kuwait', name: 'Kuwait', kind: 'country', region: 'Kuwait', continent: 'Asia', emoji: '🇰🇼', countryCode: 'KW', worldAtlasId: '414' },
  { value: 'Kyrgyzstan', name: 'Kyrgyzstan', kind: 'country', region: 'Kyrgyzstan', continent: 'Asia', emoji: '🇰🇬', countryCode: 'KG', worldAtlasId: '417' },
  { value: 'Laos', name: 'Laos', kind: 'country', region: 'Laos', continent: 'Asia', emoji: '🇱🇦', countryCode: 'LA', worldAtlasId: '418' },
  { value: 'Lebanon', name: 'Lebanon', kind: 'country', region: 'Lebanon', continent: 'Asia', emoji: '🇱🇧', countryCode: 'LB', worldAtlasId: '422' },
  { value: 'Malaysia', name: 'Malaysia', kind: 'country', region: 'Malaysia', continent: 'Asia', emoji: '🇲🇾', countryCode: 'MY', worldAtlasId: '458' },
  { value: 'Mongolia', name: 'Mongolia', kind: 'country', region: 'Mongolia', continent: 'Asia', emoji: '🇲🇳', countryCode: 'MN', worldAtlasId: '496' },
  { value: 'Myanmar', name: 'Myanmar', kind: 'country', region: 'Myanmar', continent: 'Asia', emoji: '🇲🇲', countryCode: 'MM', worldAtlasId: '104' },
  { value: 'Nepal', name: 'Nepal', kind: 'country', region: 'Nepal', continent: 'Asia', emoji: '🇳🇵', countryCode: 'NP', worldAtlasId: '524' },
  { value: 'Oman', name: 'Oman', kind: 'country', region: 'Oman', continent: 'Asia', emoji: '🇴🇲', countryCode: 'OM', worldAtlasId: '512' },
  { value: 'Pakistan', name: 'Pakistan', kind: 'country', region: 'Pakistan', continent: 'Asia', emoji: '🇵🇰', countryCode: 'PK', worldAtlasId: '586' },
  { value: 'Philippines', name: 'Philippines', kind: 'country', region: 'Philippines', continent: 'Asia', emoji: '🇵🇭', countryCode: 'PH', worldAtlasId: '608' },
  { value: 'Qatar', name: 'Qatar', kind: 'country', region: 'Qatar', continent: 'Asia', emoji: '🇶🇦', countryCode: 'QA', worldAtlasId: '634' },
  { value: 'Sri Lanka', name: 'Sri Lanka', kind: 'country', region: 'Sri Lanka', continent: 'Asia', emoji: '🇱🇰', countryCode: 'LK', worldAtlasId: '144' },
  { value: 'Taiwan', name: 'Taiwan', kind: 'country', region: 'Taiwan', continent: 'Asia', emoji: '🇹🇼', countryCode: 'TW', worldAtlasId: '158' },
  { value: 'Thailand', name: 'Thailand', kind: 'country', region: 'Thailand', continent: 'Asia', emoji: '🇹🇭', countryCode: 'TH', worldAtlasId: '764' },
  { value: 'Vietnam', name: 'Vietnam', kind: 'country', region: 'Vietnam', continent: 'Asia', emoji: '🇻🇳', countryCode: 'VN', worldAtlasId: '704' },

  // ── Africa ─────────────────────────────────────────────────────────────
  { value: 'Nigeria', name: 'Nigeria', kind: 'country', region: 'Nigeria', continent: 'Africa', emoji: '🇳🇬', countryCode: 'NG', worldAtlasId: '566' },
  { value: 'South Africa', name: 'South Africa', kind: 'country', region: 'South Africa', continent: 'Africa', emoji: '🇿🇦', countryCode: 'ZA', worldAtlasId: '710' },
  { value: 'Algeria', name: 'Algeria', kind: 'country', region: 'Algeria', continent: 'Africa', emoji: '🇩🇿', countryCode: 'DZ', worldAtlasId: '012' },
  { value: 'Botswana', name: 'Botswana', kind: 'country', region: 'Botswana', continent: 'Africa', emoji: '🇧🇼', countryCode: 'BW', worldAtlasId: '072' },
  { value: 'Cameroon', name: 'Cameroon', kind: 'country', region: 'Cameroon', continent: 'Africa', emoji: '🇨🇲', countryCode: 'CM', worldAtlasId: '120' },
  { value: 'Chad', name: 'Chad', kind: 'country', region: 'Chad', continent: 'Africa', emoji: '🇹🇩', countryCode: 'TD', worldAtlasId: '148' },
  { value: 'Egypt', name: 'Egypt', kind: 'country', region: 'Egypt', continent: 'Africa', emoji: '🇪🇬', countryCode: 'EG', worldAtlasId: '818' },
  { value: 'Eswatini', name: 'Eswatini', kind: 'country', region: 'Eswatini', continent: 'Africa', emoji: '🇸🇿', countryCode: 'SZ', worldAtlasId: '748' },
  { value: 'Ethiopia', name: 'Ethiopia', kind: 'country', region: 'Ethiopia', continent: 'Africa', emoji: '🇪🇹', countryCode: 'ET', worldAtlasId: '231' },
  { value: 'Ghana', name: 'Ghana', kind: 'country', region: 'Ghana', continent: 'Africa', emoji: '🇬🇭', countryCode: 'GH', worldAtlasId: '288' },
  { value: 'Ivory Coast', name: 'Ivory Coast', kind: 'country', region: 'Ivory Coast', continent: 'Africa', emoji: '🇨🇮', countryCode: 'CI', worldAtlasId: '384' },
  { value: 'Kenya', name: 'Kenya', kind: 'country', region: 'Kenya', continent: 'Africa', emoji: '🇰🇪', countryCode: 'KE', worldAtlasId: '404' },
  { value: 'Malawi', name: 'Malawi', kind: 'country', region: 'Malawi', continent: 'Africa', emoji: '🇲🇼', countryCode: 'MW', worldAtlasId: '454' },
  { value: 'Mauritius', name: 'Mauritius', kind: 'country', region: 'Mauritius', continent: 'Africa', emoji: '🇲🇺', countryCode: 'MU', worldAtlasId: '480' },
  { value: 'Morocco', name: 'Morocco', kind: 'country', region: 'Morocco', continent: 'Africa', emoji: '🇲🇦', countryCode: 'MA', worldAtlasId: '504' },
  { value: 'Mozambique', name: 'Mozambique', kind: 'country', region: 'Mozambique', continent: 'Africa', emoji: '🇲🇿', countryCode: 'MZ', worldAtlasId: '508' },
  { value: 'Namibia', name: 'Namibia', kind: 'country', region: 'Namibia', continent: 'Africa', emoji: '🇳🇦', countryCode: 'NA', worldAtlasId: '516' },
  { value: 'Rwanda', name: 'Rwanda', kind: 'country', region: 'Rwanda', continent: 'Africa', emoji: '🇷🇼', countryCode: 'RW', worldAtlasId: '646' },
  { value: 'Sierra Leone', name: 'Sierra Leone', kind: 'country', region: 'Sierra Leone', continent: 'Africa', emoji: '🇸🇱', countryCode: 'SL', worldAtlasId: '694' },
  { value: 'Tanzania', name: 'Tanzania', kind: 'country', region: 'Tanzania', continent: 'Africa', emoji: '🇹🇿', countryCode: 'TZ', worldAtlasId: '834' },
  { value: 'Togo', name: 'Togo', kind: 'country', region: 'Togo', continent: 'Africa', emoji: '🇹🇬', countryCode: 'TG', worldAtlasId: '768' },
  { value: 'Tunisia', name: 'Tunisia', kind: 'country', region: 'Tunisia', continent: 'Africa', emoji: '🇹🇳', countryCode: 'TN', worldAtlasId: '788' },
  { value: 'Uganda', name: 'Uganda', kind: 'country', region: 'Uganda', continent: 'Africa', emoji: '🇺🇬', countryCode: 'UG', worldAtlasId: '800' },
  { value: 'Zambia', name: 'Zambia', kind: 'country', region: 'Zambia', continent: 'Africa', emoji: '🇿🇲', countryCode: 'ZM', worldAtlasId: '894' },
  { value: 'Zimbabwe', name: 'Zimbabwe', kind: 'country', region: 'Zimbabwe', continent: 'Africa', emoji: '🇿🇼', countryCode: 'ZW', worldAtlasId: '716' },

  // ── Middle East (non-Gulf already listed above) ────────────────────────
  // (Israel, Iran, Iraq, Jordan, Kuwait, Lebanon, Oman, Qatar, Saudi Arabia, UAE already listed in Asia)

  // ── Oceania ────────────────────────────────────────────────────────────
  { value: 'Australia', name: 'Australia', kind: 'country', region: 'Australia', continent: 'Oceania', emoji: '🇦🇺', countryCode: 'AU', worldAtlasId: '036' },
  { value: 'New Zealand', name: 'New Zealand', kind: 'country', region: 'New Zealand', continent: 'Oceania', emoji: '🇳🇿', countryCode: 'NZ', worldAtlasId: '554' },
  { value: 'Fiji', name: 'Fiji', kind: 'country', region: 'Fiji', continent: 'Oceania', emoji: '🇫🇯', countryCode: 'FJ', worldAtlasId: '242' },
]

export const GEOGRAPHY_BY_VALUE = new Map(GEOGRAPHY_OPTIONS.map((option) => [option.value, option]))

export const SELECTABLE_GEOGRAPHY_VALUES = GEOGRAPHY_OPTIONS.map((option) => option.value)

export const REGION_EMOJIS = GEOGRAPHY_OPTIONS.reduce<Record<string, string>>((acc, option) => {
  acc[option.value] = option.emoji
  return acc
}, {})

export const REGION_COUNTRY_IDS = GEOGRAPHY_OPTIONS.reduce<Record<string, string[]>>((acc, option) => {
  if (option.worldAtlasId) acc[option.value] = [option.worldAtlasId]
  return acc
}, {
  EU: EU_MEMBER_STATES.map((option) => option.worldAtlasId).filter(Boolean) as string[],
})

export function getGeographyOption(value: string) {
  return GEOGRAPHY_BY_VALUE.get(value)
}

export function formatGeographyLabel(value: string) {
  return getGeographyOption(value)?.name || value
}

export function formatGeographyOptionLabel(value: string) {
  const option = getGeographyOption(value)
  if (!option) return value
  if (option.kind === 'global') return `${option.emoji} ${option.name}`
  if (option.value === option.region) return `${option.emoji} ${option.name} · ${option.continent}`
  return `${option.emoji} ${option.name} · ${option.region}, ${option.continent}`
}
