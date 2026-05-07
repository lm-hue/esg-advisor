#!/usr/bin/env python3
"""
Import Carrots & Sticks policies into the ESG Advisor Supabase DB.

Usage:
    python3 scripts/import-carrotsandsticks.py [--excel PATH] [--out PATH] [--batch-size N]

Outputs multiple SQL migration files (500 records each) in supabase/migrations/.
"""

import argparse
import json
import os
import re
import sys
import textwrap
import uuid
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

import anthropic
import pandas as pd
import requests

# ── Config ────────────────────────────────────────────────────────────────────

EXCEL_PATH = Path('/Users/lucas/Claude_Code/esg-advisor/international_policies/all_policies.xlsx')
OUTPUT_DIR = Path(__file__).parent.parent / 'supabase' / 'migrations'
SHEET_NAME = 'Policies'

SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
SUPABASE_ANON_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amFxeW51YW1naHJvYmhkYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc2NTcsImV4cCI6MjA5MDUyMzY1N30.'
    'zLhPdZE1jo1svRpK07c0iLrMA1_ObKz6M3yYeDS65Rw'
)

CS_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')  # DNS namespace

BATCH_SIZE = 100   # Claude API title-generation batch
SQL_CHUNK  = 50    # records per SQL migration file

# ── Country / Org → geography value ──────────────────────────────────────────

COUNTRY_MAP: dict[str, str] = {
    'Albania': 'Albania',
    'Algeria': 'Algeria',
    'Andorra': 'Andorra',
    'Argentina': 'Argentina',
    'Armenia': 'Armenia',
    'Association of Southeast Asian Nations (ASEAN)': 'ASEAN',
    'Australia': 'Australia',
    'Austria': 'Austria',
    'Azerbaijan': 'Azerbaijan',
    'Bahrain': 'Bahrain',
    'Bangladesh': 'Bangladesh',
    'Barbados': 'Barbados',
    'Belgium': 'Belgium',
    'Bhutan': 'Bhutan',
    'Bolivia': 'Bolivia',
    'Bosnia and Herzegovina': 'Bosnia and Herzegovina',
    'Botswana': 'Botswana',
    'Brazil': 'Brazil',
    'Bulgaria': 'Bulgaria',
    'Cambodia': 'Cambodia',
    'Cameroon': 'Cameroon',
    'Canada': 'Canada',
    'Carbon Disclosure Project (CDP)': 'CDP',
    'Chad': 'Chad',
    'Chile': 'Chile',
    'China': 'China',
    'Climate Disclosure Standards Board': 'IFRS',
    'Colombia': 'Colombia',
    'Costa Rica': 'Costa Rica',
    'Croatia': 'Croatia',
    'Cyprus': 'Cyprus',
    'Czech Republic': 'Czechia',
    'Czechia': 'Czechia',
    'Denmark': 'Denmark',
    'Dominican Republic': 'Dominican Republic',
    'Ecuador': 'Ecuador',
    'Egypt': 'Egypt',
    'El Salvador': 'El Salvador',
    'Estonia': 'Estonia',
    'Eswatini': 'Eswatini',
    'Ethiopia': 'Ethiopia',
    'European Union': 'EU',
    'European Union (EU)': 'EU',
    'Fiji': 'Fiji',
    'Finland': 'Finland',
    'France': 'France',
    'Georgia': 'Georgia',
    'Germany': 'Germany',
    'Ghana': 'Ghana',
    'Global Reporting Initiative (GRI)': 'GRI',
    'Greece': 'Greece',
    'Guatemala': 'Guatemala',
    'Guernsey': 'Guernsey',
    'Honduras': 'Honduras',
    'Hong Kong': 'Hong Kong',
    'Hungary': 'Hungary',
    'Iceland': 'Iceland',
    'India': 'India',
    'Indonesia': 'Indonesia',
    'International <IR> Framework': 'IIRC',
    'International Council on Mining and Metals (ICMM)': 'ICMM',
    'International Finance Corporation (IFC)': 'IFC',
    'International Financial Reporting Standards Foundation (IFRS)': 'IFRS',
    'International Integrated Reporting Council (IIRC)': 'IIRC',
    'International Labour Organization (ILO)': 'ILO',
    'Iran': 'Iran',
    'Iraq': 'Iraq',
    'Ireland': 'Ireland',
    'Isle of Man': 'Isle of Man',
    'Israel': 'Israel',
    'Italy': 'Italy',
    'Ivory Coast': 'Ivory Coast',
    'Jamaica': 'Jamaica',
    'Japan': 'Japan',
    'Jersey': 'Jersey',
    'Jordan': 'Jordan',
    'Kazakhstan': 'Kazakhstan',
    'Kenya': 'Kenya',
    'Kosovo': 'Kosovo',
    'Kuwait': 'Kuwait',
    'Kyrgyzstan': 'Kyrgyzstan',
    'Laos': 'Laos',
    'Latvia': 'Latvia',
    'Lebanon': 'Lebanon',
    'Liechtenstein': 'Liechtenstein',
    'Lithuania': 'Lithuania',
    'Luxembourg': 'Luxembourg',
    'Macedonia': 'Macedonia',
    'Malawi': 'Malawi',
    'Malaysia': 'Malaysia',
    'Malta': 'Malta',
    'Mauritius': 'Mauritius',
    'Mercosur': 'Mercosur',
    'Mexico': 'Mexico',
    'Moldova': 'Moldova',
    'Monaco': 'Monaco',
    'Mongolia': 'Mongolia',
    'Montenegro': 'Montenegro',
    'Morocco': 'Morocco',
    'Mozambique': 'Mozambique',
    'Myanmar': 'Myanmar',
    'Namibia': 'Namibia',
    'Nepal': 'Nepal',
    'Netherlands': 'Netherlands',
    'New Zealand': 'New Zealand',
    'Nigeria': 'Nigeria',
    'Norway': 'Norway',
    'Oman': 'Oman',
    'Organisation for Economic Co-operation and Development (OECD)': 'OECD',
    'Pakistan': 'Pakistan',
    'Panama': 'Panama',
    'Peru': 'Peru',
    'Philippines': 'Philippines',
    'Poland': 'Poland',
    'Portugal': 'Portugal',
    'Qatar': 'Qatar',
    'Romania': 'Romania',
    'Russia': 'Russia',
    'Rwanda': 'Rwanda',
    'San Marino': 'San Marino',
    'Saudi Arabia': 'Saudi Arabia',
    'Science Based Targets (SBTi)': 'SBTi',
    'Serbia': 'Serbia',
    'Sierra Leone': 'Sierra Leone',
    'Singapore': 'Singapore',
    'Slovakia': 'Slovakia',
    'Slovenia': 'Slovenia',
    'South Africa': 'South Africa',
    'South Korea': 'South Korea',
    'Spain': 'Spain',
    'Sri Lanka': 'Sri Lanka',
    'Suriname': 'Suriname',
    'Sustainability Accounting Standards Board (SASB)': 'SASB',
    'Sustainable Rice Platform': 'SRP',
    'Sustainable Stock Exchanges (SSE) initiative': 'SSE',
    'Sweden': 'Sweden',
    'Switzerland': 'Switzerland',
    'Taiwan': 'Taiwan',
    'Tanzania': 'Tanzania',
    'Task Force on Climate-Related Financial Disclosures (TCFD)': 'TCFD',
    'Taskforce on Nature-related Financial Disclosures (TNFD)': 'TNFD',
    'Thailand': 'Thailand',
    'Togo': 'Togo',
    'Trinidad and Tobago': 'Trinidad and Tobago',
    'Tunisia': 'Tunisia',
    'Turkey': 'Turkey',
    'Uganda': 'Uganda',
    'Ukraine': 'Ukraine',
    'United Arab Emirates': 'UAE',
    'United Arab Emirates (UAE)': 'UAE',
    'United Kingdom': 'UK',
    'United Nations General Assembly (UNGA)': 'UN',
    'United Nations Human Rights Council (UNHR)': 'UN',
    'United States': 'USA',
    'Uruguay': 'Uruguay',
    'Venezuela': 'Venezuela',
    'Vietnam': 'Vietnam',
    'Zambia': 'Zambia',
    'Zimbabwe': 'Zimbabwe',
}

# ── Category inference ────────────────────────────────────────────────────────

def infer_category(row: pd.Series) -> str:
    pol_type = str(row.get('Type', '') or '').lower()
    sdgs = str(row.get('SDGs Targeted', '') or '').lower()
    industries = str(row.get('Main Industries Targeted', '') or '').lower()

    # Climate
    if ('trading' in pol_type or 'sdg 13' in sdgs or 'sdg13' in sdgs
            or 'sdg 7' in sdgs or 'sdg7' in sdgs
            or any(k in industries for k in ['energy', 'transport', 'oil', 'gas', 'mining'])):
        return 'climate'

    # Nature
    if ('sdg 14' in sdgs or 'sdg14' in sdgs
            or 'sdg 15' in sdgs or 'sdg15' in sdgs
            or any(k in industries for k in ['agriculture', 'forestry', 'fishing', 'land', 'water', 'biodiversity'])):
        return 'nature'

    # Social
    if ('sdg 5' in sdgs or 'sdg5' in sdgs
            or 'sdg 8' in sdgs or 'sdg8' in sdgs
            or 'sdg 10' in sdgs or 'sdg10' in sdgs
            or any(k in industries for k in ['healthcare', 'labour', 'labor', 'human rights', 'social', 'gender'])):
        return 'social'

    # Circularity
    if ('sdg 12' in sdgs or 'sdg12' in sdgs
            or any(k in industries for k in ['waste', 'packaging', 'recycling', 'circular', 'plastics'])):
        return 'circularity'

    # Governance default
    return 'governance'


def pick_source_url(source_url: str, policy_page: str) -> str:
    def normalize(value) -> str:
        if value is None:
            return ''
        text = str(value).strip()
        return '' if text.lower() in ('nan', 'none', 'n/a', 'na') else text

    cleaned_source_url = normalize(source_url)
    if cleaned_source_url:
        return cleaned_source_url

    cleaned_policy_page = normalize(policy_page)
    if cleaned_policy_page and 'carrotsandsticks.org' not in cleaned_policy_page.lower():
        return cleaned_policy_page

    return ''


def looks_like_pdf_url(url: str) -> bool:
    cleaned_url = str(url or '').strip().lower()
    return (
        cleaned_url.endswith('.pdf')
        or '/api/download-pdf' in cleaned_url
        or '/pdf' in cleaned_url
        or 'format=pdf' in cleaned_url
    )


def pick_policy_page_url(source_url: str, policy_page: str) -> str:
    def normalize(value) -> str:
        if value is None:
            return ''
        text = str(value).strip()
        return '' if text.lower() in ('nan', 'none', 'n/a', 'na') else text

    for candidate in (source_url, policy_page):
        cleaned_candidate = normalize(candidate)
        if not cleaned_candidate:
            continue
        if 'carrotsandsticks.org' in cleaned_candidate.lower():
            continue
        if looks_like_pdf_url(cleaned_candidate):
            continue

        parsed = urlparse(cleaned_candidate)
        if parsed.scheme in ('http', 'https') and parsed.netloc and parsed.path not in ('', '/'):
            return cleaned_candidate

    return ''


def derive_official_website_url(policy_page_url: str) -> str:
    cleaned_policy_page_url = str(policy_page_url or '').strip()
    if not cleaned_policy_page_url:
        return ''

    parsed = urlparse(cleaned_policy_page_url)
    if parsed.scheme not in ('http', 'https') or not parsed.netloc:
        return ''

    return f'{parsed.scheme}://{parsed.netloc}'


def infer_source_link_kind(url: str) -> str | None:
    cleaned_url = clean(url)
    if not cleaned_url:
        return None
    return 'official'


def infer_link_status_from_url(url: str) -> str:
    cleaned_url = clean(url).lower()
    if not cleaned_url:
        return 'missing'
    if cleaned_url.endswith('.pdf'):
        return 'working_pdf'
    return 'working_website'


# ── Regulation type inference ─────────────────────────────────────────────────

def infer_regulation_type(row: pd.Series) -> str:
    doc_cat = str(row.get('Document Category', '') or '').lower()
    vol_man = str(row.get('Voluntary / Mandatory', '') or '').lower()

    if 'legislative' in doc_cat or 'regulatory' in doc_cat:
        return 'regulations'
    if 'voluntary framework' in doc_cat:
        return 'voluntary_frameworks'
    if 'guidance' in doc_cat or 'guide' in doc_cat:
        return 'guidance_frameworks'
    if 'voluntary' in vol_man:
        return 'voluntary_frameworks'
    if 'mandatory' in vol_man:
        return 'mandatory_regulations'
    return 'regulations'


def map_regulation_type(raw: str) -> str:
    return {
        'regulations': 'law_or_regulation',
        'mandatory_regulations': 'law_or_regulation',
        'voluntary_frameworks': 'framework',
        'guidance_frameworks': 'guidance',
        'market_rules': 'market_rule',
        'ratings_rankings': 'rating_or_benchmark',
    }.get(raw, 'law_or_regulation')


# ── Status mapping ────────────────────────────────────────────────────────────

STATUS_MAP = {
    'in force': 'in_force',
    'draft': 'draft',
    'adopted': 'adopted',
    'amended': 'amended',
    'repealed': 'repealed',
}

def map_status(raw: str) -> str:
    normalized = str(raw or '').strip().lower()
    return STATUS_MAP.get(normalized, 'in_force')


def map_lifecycle_status(raw: str) -> str:
    mapped = map_status(raw)
    return {
        'in_force': 'effective',
        'adopted': 'adopted_not_yet_effective',
        'amended': 'amended_effective',
    }.get(mapped, mapped)


def infer_jurisdiction_type(region: str) -> str:
    if region == 'Global':
        return 'global'
    if region == 'EU':
        return 'supranational_region'
    if region == 'SSE':
        return 'exchange_or_regulator'
    if region in {'ASEAN', 'Mercosur', 'OECD', 'UN', 'CDP', 'GRI', 'IFRS', 'IIRC', 'ILO', 'IFC', 'ICMM', 'SASB', 'SBTi', 'TCFD', 'TNFD', 'SRP', 'CDSB'}:
        return 'standards_body'
    return 'country'


def infer_topics(category: str, title: str, summary: str, tags: list[str]) -> list[str]:
    text = f'{title} {summary} {" ".join(tags)}'.lower()
    topics = set()
    if re.search(r'report|disclosure|materiality|assurance|esrs|issb|ifrs|gri', text):
        topics.add('reporting')
    if 'taxonomy' in text:
        topics.add('taxonomy')
    if re.search(r'governance|board|anti-corruption|bribery|ethics|conduct', text):
        topics.add('governance')
    if re.search(r'human rights|labou?r|worker|forced labour|indigenous|harassment|diversity|equality', text):
        topics.add('human_rights')
    if re.search(r'supply chain|due diligence|supplier|mineral|procurement|traceability', text):
        topics.add('supply_chain')
    if re.search(r'biodiversity|deforestation|ecosystem|forest|nature-related', text):
        topics.add('biodiversity')
    if re.search(r'\bwater\b|wastewater|marine|ocean', text):
        topics.add('water')
    if re.search(r'pollution|emission|air quality|chemical|contaminant|plastic', text):
        topics.add('pollution')
    if re.search(r'\bwaste\b|recycling|circular|battery stewardship|packaging', text):
        topics.add('waste')
    if re.search(r'energy|electricity|renewable|efficiency|fuel', text):
        topics.add('energy')
    if re.search(r'climate|greenhouse gas|ghg|net zero|carbon|tcfd|transition plan', text):
        topics.add('climate')
    if re.search(r'finance|financial|investor|bank|fund|securities|listing', text):
        topics.add('finance')
    if not topics:
        fallback = {
            'climate': 'climate',
            'circularity': 'waste',
            'nature': 'biodiversity',
            'social': 'human_rights',
            'governance': 'governance',
        }.get(category, 'governance')
        topics.add(fallback)
    return sorted(topics)


# ── SQL helpers ───────────────────────────────────────────────────────────────

def sql_str(value) -> str:
    """Escape a string value for SQL."""
    if value is None:
        return 'NULL'
    escaped = str(value).replace("'", "''")
    return f"'{escaped}'"

def sql_array(values: list[str]) -> str:
    """Format a list of strings as a Postgres array literal."""
    if not values:
        return "'{}'"
    escaped = [v.replace("'", "''") for v in values]
    inner = ', '.join(f"'{v}'" for v in escaped)
    return f"ARRAY[{inner}]::text[]"

def deterministic_uuid(excel_id: str) -> str:
    return str(uuid.uuid5(CS_NAMESPACE, f'carrotsandsticks.org/policy/{excel_id}'))


# ── Fetch existing regulations from Supabase ──────────────────────────────────

def fetch_existing_titles() -> set[str]:
    """Fetch all existing regulation IDs and titles from Supabase."""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    }
    existing: set[str] = set()
    offset = 0
    page_size = 1000
    while True:
        params = {
            'select': 'id,title,formal_title',
            'offset': offset,
            'limit': page_size,
        }
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/regulations',
            headers=headers,
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json()
        for row in rows:
            if row.get('title'):
                existing.add(row['title'].strip().lower())
            if row.get('formal_title'):
                existing.add(row['formal_title'].strip().lower())
        if len(rows) < page_size:
            break
        offset += page_size
    return existing


def fetch_existing_uuids() -> set[str]:
    """Fetch all existing regulation UUIDs."""
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    }
    existing: set[str] = set()
    offset = 0
    page_size = 1000
    while True:
        params = {
            'select': 'id',
            'offset': offset,
            'limit': page_size,
        }
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/regulations',
            headers=headers,
            params=params,
            timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json()
        for row in rows:
            existing.add(str(row['id']))
        if len(rows) < page_size:
            break
        offset += page_size
    return existing


# ── Claude title generation ───────────────────────────────────────────────────

TITLE_EXAMPLES = """
Examples of good short titles (4–8 words):
- "EU Corporate Sustainability Reporting Directive (CSRD)"
- "Germany Supply Chain Due Diligence Act"
- "Singapore SGX Mandatory Climate Reporting"
- "Ghana Environmental Assessment Regulations"
- "Norway Transparency Act"
- "Australia Modern Slavery Act"
- "GRI Universal Standards 2021"
- "TCFD Climate Disclosure Framework"
- "South Africa JSE Sustainability Disclosure"
- "Bangladesh Green Financing Policy"
"""

def make_short_title(formal_title: str, country: str, year=None) -> str:
    """Rule-based short title generator (4-9 words)."""
    title = formal_title.strip()

    # Remove "Ley/Loi/Lege/Gesetz NNN - Real Title" → keep after dash
    if re.match(r'^(?:Ley|Loi|Gesetz|Lege)\s+[\d]', title, re.I):
        dash_m = re.search(r'[-–—]\s*(.+)', title)
        if dash_m and len(dash_m.group(1).split()) >= 3:
            title = dash_m.group(1).strip()

    # "Law/Act/Decree NNN - Real Title" → keep after dash
    if re.match(r'^(?:Law|Decree|Act|Ordinance|Resolution|Regulation)\s+[\d]', title, re.I):
        dash_m = re.search(r'[-–—]\s*(.+)', title)
        if dash_m and len(dash_m.group(1).split()) >= 3:
            title = dash_m.group(1).strip()

    # Strip awkward "On the Approval/Adoption/Establishment of" prefix
    title = re.sub(
        r'^On\s+the\s+(?:Approval|Adoption|Establishment|Introduction|Implementation|Amendment|Endorsement)\s+of\s+(?:the\s+)?',
        '', title, flags=re.I
    )

    # Extract topic from "Type [No. N] on/for/about/governing TOPIC"
    topic_m = re.match(
        r'^(?:Law|Decree|Act|Ordinance|Resolution|Regulation|Directive|Order|Guidelines?|Rules?|Code|'
        r'Standards?|Policy|Strategy|Framework|Plan|Programs?|Programmes?|Guidance|Notification|Circular)\s*'
        r'(?:No\.?\s*[\d/\-]+\s*(?:,\s*of\s+[A-Za-z]+\s*\d{0,4},?)?\s*)?'
        r'(?:on|for|concerning|relating to|regarding|about|governing|establishing)\s+(?:the\s+)?(.+)',
        title, re.I
    )
    if topic_m:
        title = topic_m.group(1)

    # Remove EU directive / national law reference numbers
    title = re.sub(r'\bNo\.?\s+\d+[\d/\-]*', '', title, flags=re.I)
    title = re.sub(r'\b\d{4}/\d+/[A-Z]+\b', '', title)
    title = re.sub(r'\b\d+/\d{4}\b', '', title)
    title = re.sub(r'\b\d+/\d{2}\b', '', title)

    # Remove trailing years / edition markers
    title = re.sub(r',?\s*\(?(?:19|20)\d{2}(?:[-–]\d{2,4})?\)?,?\s*$', '', title)
    title = re.sub(r',?\s*\d+(?:st|nd|rd|th)\s+[Ee]dition\s*$', '', title)

    # Remove long parenthetical explanations (keep short acronyms)
    title = re.sub(r'\s*\((?:approved|established|adopted|amended|enacted|pursuant|see also)[^)]{0,80}\)', '', title, flags=re.I)

    # Remove "the Republic of / the Kingdom of / the State of X"
    if country and country not in ('Global',):
        title = re.sub(r'\bof\s+the\s+(?:Republic|Kingdom|State|Government|People\'s Republic)\s+of\s+' + re.escape(country), '', title, flags=re.I)
        title = re.sub(r'\bthe\s+(?:Republic|Kingdom|State|Government)\s+of\s+' + re.escape(country), '', title, flags=re.I)

    # Clean up
    title = re.sub(r'\s+', ' ', title).strip().strip(',.-:;').strip()
    # Remove leading article "The " or "A "
    title = re.sub(r'^(?:The|An?)\s+', '', title, flags=re.I)

    # Truncate at natural break (7-9 words)
    words = title.split()
    if len(words) > 9:
        for cut in range(7, 9):
            if cut < len(words) and words[cut].lower() in (
                'on', 'for', 'of', 'and', 'to', 'in', 'by', 'with',
                'relating', 'concerning', 'regarding', 'at', 'from',
            ):
                words = words[:cut]
                break
        else:
            words = words[:8]
        title = ' '.join(words).strip().strip(',.-:;').strip()

    # Add country prefix if absent
    if country and country not in ('Global',):
        ALIASES: dict[str, list[str]] = {
            'EU': ['european', 'eu ', 'eu)', 'eu-', 'eu,', 'esrs', 'sfdr', 'csrd', 'cbam'],
            'USA': ['united states', 'u.s.', 'american', 'federal', 'sec ', 'nasdaq', 'california', 'new york'],
            'UK': ['united kingdom', 'british', 'england', 'wales', 'scotland', 'uk ', 'ftse'],
            'GRI': ['gri ', 'gri:'],
            'SASB': ['sasb'],
            'TCFD': ['tcfd'],
            'TNFD': ['tnfd'],
            'IFRS': ['ifrs', 'issb', 'iasb'],
            'IIRC': ['iirc', '<ir>'],
            'CDP': ['cdp '],
            'SBTi': ['sbti', 'science based'],
        }
        aliases = ALIASES.get(country, [country.lower()])
        found = any(a in title.lower() for a in aliases)
        if not found:
            title = f'{country} {title}'

    # Final cap at 9 words
    words = title.split()
    if len(words) > 9:
        title = ' '.join(words[:9])

    return title.strip().strip(',.-:;').strip()


def generate_titles(records: list[dict], client: anthropic.Anthropic) -> list[str]:
    """Try Claude API first; fall back to rule-based generation."""
    items = []
    for i, rec in enumerate(records):
        items.append(
            f'{i+1}. Country/Org: {rec["region"]} | Year: {rec["year"]} | '
            f'Formal Title: {rec["formal_title"]}'
        )
    items_text = '\n'.join(items)

    prompt = f"""You are generating concise, descriptive titles for ESG/sustainability regulations.

{TITLE_EXAMPLES}

Rules:
- 4–9 words maximum
- Include the country/issuer name if it's a national regulation
- Include the key topic (e.g., Climate Disclosure, Modern Slavery, Green Bonds)
- Omit leading "The" or "A"
- Do NOT use the full legal name — make it human-readable
- If it's a voluntary/international framework, include the issuer acronym
- Respond with ONLY a JSON array of strings — one title per item, in order
- No numbering, no explanation, just the JSON array

Generate short titles for these {len(records)} policies:
{items_text}

Respond with ONLY a JSON array like: ["Title one", "Title two", ...]"""

    try:
        message = client.messages.create(
            model='claude-haiku-4-5',
            max_tokens=2048,
            messages=[{'role': 'user', 'content': prompt}],
        )
        raw = message.content[0].text.strip()
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            raise ValueError(f'Could not parse titles from response: {raw[:200]}')
        titles = json.loads(match.group())
        if len(titles) != len(records):
            raise ValueError(f'Expected {len(records)} titles, got {len(titles)}')
        return titles
    except Exception as e:
        print(f'[API unavailable, using rule-based: {e}]', end=' ', flush=True)
        return [make_short_title(rec['formal_title'], rec['region'], rec['year']) for rec in records]


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Import Carrots & Sticks policies')
    parser.add_argument('--excel', default=str(EXCEL_PATH))
    parser.add_argument('--out', default=str(OUTPUT_DIR))
    parser.add_argument('--batch-size', type=int, default=BATCH_SIZE)
    args = parser.parse_args()

    excel_path = Path(args.excel)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'Reading Excel: {excel_path}')
    df = pd.read_excel(excel_path, sheet_name=SHEET_NAME, dtype={'Year': 'Int64', 'ID': str})
    print(f'  → {len(df)} rows loaded')

    print('Fetching existing regulations from Supabase...')
    existing_titles = fetch_existing_titles()
    existing_uuids = fetch_existing_uuids()
    print(f'  → {len(existing_uuids)} existing regulations, {len(existing_titles)} known titles/formal_titles')

    # ── Stage records ──────────────────────────────────────────────────────────
    staged = []
    skipped_uuid = 0
    skipped_title = 0
    skipped_empty = 0

    for _, row in df.iterrows():
        excel_id = str(row['ID']).strip() if pd.notna(row['ID']) else ''
        formal_title = str(row.get('Formal Title', '') or '').strip()
        if formal_title.lower() in ('nan', 'none', 'n/a', 'na'):
            formal_title = ''

        if not excel_id or not formal_title:
            skipped_empty += 1
            continue

        # Deterministic UUID from CS ID
        rec_uuid = deterministic_uuid(excel_id)

        # Skip if UUID already in DB (re-run safety)
        if rec_uuid in existing_uuids:
            skipped_uuid += 1
            continue

        # Skip if formal_title or a close match already in DB
        if formal_title.strip().lower() in existing_titles:
            skipped_title += 1
            continue

        # Field mapping
        country_raw = str(row.get('Country / Organization', '') or '').strip()
        region = COUNTRY_MAP.get(country_raw, country_raw or 'Global')

        year_val = row.get('Year')
        if pd.notna(year_val) and str(year_val).isdigit():
            effective_date = f'{int(year_val)}-01-01'
        else:
            effective_date = None

        def clean(val) -> str:
            if val is None:
                return ''
            s = str(val).strip()
            return '' if s.lower() in ('nan', 'none', 'n/a', 'na') else s

        summary = clean(row.get('Summary', ''))
        status_raw = clean(row.get('Status', ''))
        source_publisher = clean(row.get('Source Publisher', ''))
        source_url = row.get('Source URL', '')
        policy_page = row.get('Policy Page', '')

        category = infer_category(row)
        reg_type = infer_regulation_type(row)

        # Tags: country + regulation type + sdgs + voluntary/mandatory
        def clean_tag(val) -> str:
            s = clean(val)
            return s.lower() if s and s.lower() not in ('nan', 'none', 'n/a', 'na', '') else ''

        tags: list[str] = []
        if region and region != 'Global':
            tags.append(region.lower())
        tags.append(reg_type)
        vol_man_tag = clean_tag(row.get('Voluntary / Mandatory', ''))
        if vol_man_tag:
            tags.append(vol_man_tag)
        sdgs_raw = clean(row.get('SDGs Targeted', ''))
        if sdgs_raw:
            for sdg in re.findall(r'\bSDG\s*\d+\b', sdgs_raw, re.IGNORECASE):
                tags.append(sdg.lower().replace(' ', ''))
        pol_type_tag = clean_tag(row.get('Type', ''))
        if pol_type_tag:
            tags.append(pol_type_tag)
        tags = [t for t in set(tags) if t]

        selected_source_url = pick_source_url(source_url, policy_page)
        policy_page_url = pick_policy_page_url(source_url, policy_page)
        official_source_url = derive_official_website_url(policy_page_url)
        source_link_kind = infer_source_link_kind(official_source_url)

        staged.append({
            'id': rec_uuid,
            'excel_id': excel_id,
            'formal_title': formal_title,
            'region': region,
            'jurisdiction_type': infer_jurisdiction_type(region),
            'jurisdiction_value': region,
            'year': int(year_val) if pd.notna(year_val) and str(year_val).isdigit() else '',
            'description': summary,
            'effective_date': effective_date,
            'status': map_lifecycle_status(status_raw),
            'source_name': source_publisher or (country_raw if country_raw.lower() not in ('nan','none','') else '') or 'Carrots & Sticks',
            'source_url': selected_source_url,
            'official_source_url': official_source_url,
            'policy_page_url': policy_page_url,
            'source_link_kind': source_link_kind,
            'category': category,
            'date_precision': 'year' if effective_date else None,
            'regulation_type': map_regulation_type(reg_type),
            'tags': list(set(tags)),
        })

    print(f'  → {len(staged)} to import | {skipped_uuid} already in DB (UUID) | {skipped_title} duplicate titles | {skipped_empty} empty rows')

    if not staged:
        print('Nothing to import. Exiting.')
        return

    # ── Generate titles via Claude API ────────────────────────────────────────
    print(f'Generating short titles via Claude API in batches of {args.batch_size}...')
    client = anthropic.Anthropic()

    for start in range(0, len(staged), args.batch_size):
        batch = staged[start:start + args.batch_size]
        batch_num = start // args.batch_size + 1
        total_batches = (len(staged) + args.batch_size - 1) // args.batch_size
        print(f'  Batch {batch_num}/{total_batches} ({len(batch)} records)...', end=' ', flush=True)
        try:
            titles = generate_titles(batch, client)
            for rec, title in zip(batch, titles):
                rec['title'] = title.strip()
            print('✓')
        except Exception as e:
            print(f'FAILED: {e}')
            # Fallback: use truncated formal title
            for rec in batch:
                words = rec['formal_title'].split()[:8]
                rec['title'] = ' '.join(words)

    # ── Write SQL files ───────────────────────────────────────────────────────
    now_ts = datetime.now().strftime('%Y%m%d%H%M%S')
    chunk_num = 0
    total_written = 0

    for chunk_start in range(0, len(staged), SQL_CHUNK):
        chunk = staged[chunk_start:chunk_start + SQL_CHUNK]
        chunk_num += 1
        fname = out_dir / f'{datetime.now().strftime("%Y%m%d")}_import_carrotsandsticks_{chunk_num:02d}.sql'

        lines = [
            f'-- Carrots & Sticks import chunk {chunk_num}: records {chunk_start+1}–{chunk_start+len(chunk)} of {len(staged)}',
            '',
        ]

        for rec in chunk:
            tags_sql = sql_array(rec['tags'])
            topics_sql = sql_array(infer_topics(rec['category'], rec['title'], rec['description'] or rec['formal_title'], rec['tags']))
            eff_date = f"'{rec['effective_date']}'::date" if rec['effective_date'] else 'NULL'
            desc = sql_str(rec['description'] or rec['formal_title'])

            lines.append(
                f"INSERT INTO regulations "
                f"(id, title, formal_title, summary, description, full_description, region, jurisdiction_type, jurisdiction_value, category, status, "
                f"effective_date, date_precision, regulation_type, source_name, source_url, official_source_url, policy_page_url, source_link_kind, topics, link_status, source_health, tags) VALUES ("
                f"{sql_str(rec['id'])}, "
                f"{sql_str(rec['title'])}, "
                f"{sql_str(rec['formal_title'])}, "
                f"{desc}, "  # summary (NOT NULL)
                f"{desc}, "  # description
                f"{desc}, "  # full_description
                f"{sql_str(rec['region'])}, "
                f"{sql_str(rec['jurisdiction_type'])}, "
                f"{sql_str(rec['jurisdiction_value'])}, "
                f"{sql_str(rec['category'])}, "
                f"{sql_str(rec['status'])}, "
                f"{eff_date}, "
                f"{sql_str(rec['date_precision'])}, "
                f"{sql_str(rec['regulation_type'])}, "
                f"{sql_str(rec['source_name'])}, "
                f"{sql_str(rec['source_url'])}, "
                f"{sql_str(rec['official_source_url'])}, "
                f"{sql_str(rec['policy_page_url'])}, "
                f"{sql_str(rec['source_link_kind'])}, "
                f"{topics_sql}, "
                f"{sql_str(infer_link_status_from_url(rec['source_url']))}, "
                f"{sql_str('healthy' if rec['source_url'] else 'missing')}, "
                f"{tags_sql}"
                f") ON CONFLICT (id) DO NOTHING;"
            )

        lines += ['']
        fname.write_text('\n'.join(lines))
        total_written += len(chunk)
        print(f'Wrote {fname.name} ({len(chunk)} records)')

    print(f'\n✅ Done. {total_written} records across {chunk_num} SQL file(s) in {out_dir}/')
    print(f'   Next step: apply each file via Supabase MCP apply_migration')


if __name__ == '__main__':
    main()
