#!/usr/bin/env python3
"""
Direct REST API inserter for Carrots & Sticks policies.
Uses the already-validated logic from import-carrotsandsticks.py but inserts
via the Supabase REST API (anon key, which allows upserts in this project).

Usage:
    python3 scripts/insert-carrotsandsticks.py
"""

import json
import re
import sys
import uuid
from pathlib import Path
from urllib.parse import urlparse

import pandas as pd
import requests

# ── Config ────────────────────────────────────────────────────────────────────

EXCEL_PATH = Path('/Users/lucas/Claude_Code/esg-advisor/international_policies/all_policies.xlsx')
SHEET_NAME = 'Policies'
BATCH_SIZE = 50  # records per REST API call

SUPABASE_URL = 'https://twjaqynuamghrobhdasf.supabase.co'
SUPABASE_ANON_KEY = (
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.'
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amFxeW51YW1naHJvYmhkYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc2NTcsImV4cCI6MjA5MDUyMzY1N30.'
    'zLhPdZE1jo1svRpK07c0iLrMA1_ObKz6M3yYeDS65Rw'
)

CS_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')

# ── Country map (same as import script) ───────────────────────────────────────
COUNTRY_MAP: dict[str, str] = {
    'Albania': 'Albania', 'Algeria': 'Algeria', 'Andorra': 'Andorra',
    'Argentina': 'Argentina', 'Armenia': 'Armenia', 'Australia': 'Australia',
    'Austria': 'Austria', 'Azerbaijan': 'Azerbaijan', 'Bahrain': 'Bahrain',
    'Bangladesh': 'Bangladesh', 'Barbados': 'Barbados', 'Belgium': 'Belgium',
    'Bhutan': 'Bhutan', 'Bolivia': 'Bolivia',
    'Bosnia and Herzegovina': 'Bosnia and Herzegovina', 'Botswana': 'Botswana',
    'Brazil': 'Brazil', 'Bulgaria': 'Bulgaria', 'Cambodia': 'Cambodia',
    'Cameroon': 'Cameroon', 'Canada': 'Canada', 'Chad': 'Chad',
    'Chile': 'Chile', 'China': 'China', 'Colombia': 'Colombia',
    'Costa Rica': 'Costa Rica', 'Croatia': 'Croatia', 'Cyprus': 'Cyprus',
    'Czech Republic': 'Czech Republic', 'Denmark': 'Denmark',
    'Dominican Republic': 'Dominican Republic', 'Ecuador': 'Ecuador',
    'Egypt': 'Egypt', 'El Salvador': 'El Salvador', 'Estonia': 'Estonia',
    'Eswatini': 'Eswatini', 'Ethiopia': 'Ethiopia',
    'European Union': 'EU', 'EU': 'EU', 'Fiji': 'Fiji', 'Finland': 'Finland',
    'France': 'France', 'Georgia': 'Georgia', 'Germany': 'Germany',
    'Ghana': 'Ghana', 'Greece': 'Greece', 'Guatemala': 'Guatemala',
    'Guernsey': 'Guernsey', 'Honduras': 'Honduras', 'Hong Kong': 'Hong Kong',
    'Hungary': 'Hungary', 'Iceland': 'Iceland', 'India': 'India',
    'Indonesia': 'Indonesia', 'Iran': 'Iran', 'Iraq': 'Iraq',
    'Ireland': 'Ireland', 'Isle of Man': 'Isle of Man', 'Israel': 'Israel',
    'Italy': 'Italy', 'Ivory Coast': 'Ivory Coast', 'Jamaica': 'Jamaica',
    'Japan': 'Japan', 'Jordan': 'Jordan', 'Kazakhstan': 'Kazakhstan',
    'Kenya': 'Kenya', 'Kosovo': 'Kosovo', 'Kuwait': 'Kuwait',
    'Kyrgyzstan': 'Kyrgyzstan', 'Laos': 'Laos', 'Latvia': 'Latvia',
    'Lebanon': 'Lebanon', 'Liechtenstein': 'Liechtenstein',
    'Lithuania': 'Lithuania', 'Luxembourg': 'Luxembourg',
    'Macedonia': 'Macedonia', 'Malawi': 'Malawi', 'Malaysia': 'Malaysia',
    'Malta': 'Malta', 'Mauritius': 'Mauritius', 'Mexico': 'Mexico',
    'Moldova': 'Moldova', 'Monaco': 'Monaco', 'Mongolia': 'Mongolia',
    'Montenegro': 'Montenegro', 'Morocco': 'Morocco',
    'Mozambique': 'Mozambique', 'Myanmar': 'Myanmar', 'Namibia': 'Namibia',
    'Nepal': 'Nepal', 'Netherlands': 'Netherlands',
    'New Zealand': 'New Zealand', 'Nigeria': 'Nigeria', 'Norway': 'Norway',
    'Oman': 'Oman', 'Pakistan': 'Pakistan', 'Panama': 'Panama',
    'Peru': 'Peru', 'Philippines': 'Philippines', 'Poland': 'Poland',
    'Portugal': 'Portugal', 'Qatar': 'Qatar', 'Romania': 'Romania',
    'Russia': 'Russia', 'Rwanda': 'Rwanda', 'San Marino': 'San Marino',
    'Saudi Arabia': 'Saudi Arabia', 'Serbia': 'Serbia',
    'Sierra Leone': 'Sierra Leone', 'Singapore': 'Singapore',
    'Slovakia': 'Slovakia', 'Slovenia': 'Slovenia',
    'South Africa': 'South Africa', 'South Korea': 'South Korea',
    'Spain': 'Spain', 'Sri Lanka': 'Sri Lanka', 'Suriname': 'Suriname',
    'Sweden': 'Sweden', 'Switzerland': 'Switzerland', 'Taiwan': 'Taiwan',
    'Tanzania': 'Tanzania', 'Thailand': 'Thailand', 'Togo': 'Togo',
    'Trinidad and Tobago': 'Trinidad and Tobago', 'Tunisia': 'Tunisia',
    'Turkey': 'Turkey', 'Türkiye': 'Turkey', 'Uganda': 'Uganda',
    'Ukraine': 'Ukraine', 'United Arab Emirates': 'UAE', 'UAE': 'UAE',
    'United Kingdom': 'UK', 'UK': 'UK', 'United States': 'USA', 'USA': 'USA',
    'Uruguay': 'Uruguay', 'Venezuela': 'Venezuela', 'Vietnam': 'Vietnam',
    'Zambia': 'Zambia', 'Zimbabwe': 'Zimbabwe',
    'ASEAN': 'ASEAN', 'Association of Southeast Asian Nations (ASEAN)': 'ASEAN',
    'Mercosur': 'Mercosur', 'OECD': 'OECD',
    'Organisation for Economic Co-operation and Development (OECD)': 'OECD',
    'United Nations': 'UN', 'UN': 'UN',
    'CDP': 'CDP', 'Carbon Disclosure Project (CDP)': 'CDP',
    'GRI': 'GRI', 'Global Reporting Initiative (GRI)': 'GRI',
    'IFRS Foundation': 'IFRS', 'IFRS': 'IFRS',
    'International Financial Reporting Standards Foundation (IFRS)': 'IFRS',
    'IIRC': 'IIRC', 'International Integrated Reporting Council (IIRC)': 'IIRC',
    'International <IR> Framework': 'IIRC',
    'ILO': 'ILO', 'International Labour Organization (ILO)': 'ILO',
    'IFC': 'IFC', 'International Finance Corporation (IFC)': 'IFC',
    'ICMM': 'ICMM', 'International Council on Mining and Metals (ICMM)': 'ICMM',
    'SASB': 'SASB', 'Sustainability Accounting Standards Board (SASB)': 'SASB',
    'SBTi': 'SBTi', 'Science Based Targets (SBTi)': 'SBTi',
    'TCFD': 'TCFD', 'Task Force on Climate-Related Financial Disclosures (TCFD)': 'TCFD',
    'TNFD': 'TNFD', 'Taskforce on Nature-related Financial Disclosures (TNFD)': 'TNFD',
    'SSE': 'SSE', 'Sustainable Stock Exchanges (SSE) initiative': 'SSE',
    'SRP': 'SRP', 'Sustainable Rice Platform': 'SRP',
    'CDSB': 'CDSB', 'Climate Disclosure Standards Board': 'CDSB',
    'International': 'Global', 'Global': 'Global',
}


def deterministic_uuid(excel_id: str) -> str:
    return str(uuid.uuid5(CS_NAMESPACE, f'carrotsandsticks.org/policy/{excel_id}'))


def clean(val) -> str:
    if val is None:
        return ''
    s = str(val).strip()
    return '' if s.lower() in ('nan', 'none', 'n/a', 'na') else s


def pick_source_url(source_url: str, policy_page: str) -> str:
    cleaned_source_url = clean(source_url)
    if cleaned_source_url:
        return cleaned_source_url

    cleaned_policy_page = clean(policy_page)
    if cleaned_policy_page and 'carrotsandsticks.org' not in cleaned_policy_page.lower():
        return cleaned_policy_page

    return ''


def looks_like_pdf_url(url: str) -> bool:
    cleaned_url = clean(url).lower()
    return (
        cleaned_url.endswith('.pdf')
        or '/api/download-pdf' in cleaned_url
        or '/pdf' in cleaned_url
        or 'format=pdf' in cleaned_url
    )


def pick_policy_page_url(source_url: str, policy_page: str) -> str:
    for candidate in (source_url, policy_page):
        cleaned_candidate = clean(candidate)
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
    cleaned_policy_page_url = clean(policy_page_url)
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


def map_status(raw: str) -> str:
    r = raw.strip().lower()
    if r in ('in force', 'in_force', '', 'nan'):
        return 'in_force'
    if r == 'draft':
        return 'draft'
    if r == 'adopted':
        return 'adopted'
    if r == 'amended':
        return 'amended'
    if r == 'repealed':
        return 'repealed'
    return 'in_force'


def infer_category(row) -> str:
    def has(*cols, val='') -> bool:
        for c in cols:
            cell = clean(row.get(c, ''))
            if val:
                if val.lower() in cell.lower():
                    return True
            else:
                if cell:
                    return True
        return False

    sdgs = clean(row.get('SDGs Targeted', '')).lower()
    pol_type = clean(row.get('Type', '')).lower()
    industry = clean(row.get('Industry', '')).lower()
    doc_cat = clean(row.get('Document Category', '')).lower()

    if 'sdg13' in sdgs or 'sdg 13' in sdgs or 'sdg7' in sdgs or 'sdg 7' in sdgs \
            or 'trading' in pol_type \
            or any(k in industry for k in ('energy', 'transport', 'utilities', 'oil', 'gas', 'mining')):
        return 'climate'
    if 'sdg14' in sdgs or 'sdg 14' in sdgs or 'sdg15' in sdgs or 'sdg 15' in sdgs \
            or any(k in industry for k in ('agriculture', 'forestry', 'fishing', 'biodiversity')):
        return 'nature'
    if 'disclosure' in pol_type and 'financial' in industry:
        return 'governance'
    if 'sdg12' in sdgs or 'sdg 12' in sdgs \
            or any(k in industry for k in ('waste', 'packaging', 'recycling', 'circular')):
        return 'circularity'
    if 'sdg5' in sdgs or 'sdg 5' in sdgs or 'sdg8' in sdgs or 'sdg 8' in sdgs \
            or 'sdg10' in sdgs or 'sdg 10' in sdgs \
            or any(k in industry for k in ('healthcare', 'labour', 'labor', 'human rights', 'social')):
        return 'social'
    return 'governance'


def infer_regulation_type(row) -> str:
    doc_cat = clean(row.get('Document Category', '')).lower()
    vol_man = clean(row.get('Voluntary / Mandatory', '')).lower()
    if 'legislative' in doc_cat or 'regulatory' in doc_cat:
        return 'regulations'
    if 'voluntary framework' in doc_cat or 'voluntary' in doc_cat:
        return 'voluntary_frameworks'
    if 'guidance' in doc_cat or 'guide' in doc_cat:
        return 'guidance_frameworks'
    if vol_man == 'mandatory':
        return 'regulations'
    if vol_man == 'voluntary':
        return 'voluntary_frameworks'
    return 'regulations'


def map_regulation_type(raw: str) -> str:
    return {
        'regulations': 'law_or_regulation',
        'voluntary_frameworks': 'framework',
        'guidance_frameworks': 'guidance',
        'market_rules': 'market_rule',
        'ratings_rankings': 'rating_or_benchmark',
    }.get(raw, 'law_or_regulation')


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


def map_lifecycle_status(raw: str) -> str:
    mapped = map_status(raw)
    return {
        'in_force': 'effective',
        'adopted': 'adopted_not_yet_effective',
        'amended': 'amended_effective',
    }.get(mapped, mapped)


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


def make_short_title(formal_title: str, country: str, year=None) -> str:
    title = formal_title.strip()
    if re.match(r'^(?:Ley|Loi|Gesetz|Lege)\s+[\d]', title, re.I):
        dash_m = re.search(r'[-–—]\s*(.+)', title)
        if dash_m and len(dash_m.group(1).split()) >= 3:
            title = dash_m.group(1).strip()
    if re.match(r'^(?:Law|Decree|Act|Ordinance|Resolution|Regulation)\s+[\d]', title, re.I):
        dash_m = re.search(r'[-–—]\s*(.+)', title)
        if dash_m and len(dash_m.group(1).split()) >= 3:
            title = dash_m.group(1).strip()
    title = re.sub(
        r'^On\s+the\s+(?:Approval|Adoption|Establishment|Introduction|Implementation|Amendment|Endorsement)\s+of\s+(?:the\s+)?',
        '', title, flags=re.I
    ).strip()
    title = re.sub(r'\s*\(\s*(?:No\.?|#)\s*[\w/.-]+\s*\)', '', title).strip()
    title = re.sub(r',?\s+(?:No\.?|#)\s*[\w/.-]+$', '', title, flags=re.I).strip()
    title = re.sub(r',?\s+\d{4}(?:\s+(?:amendment|revision|update))?$', '', title, flags=re.I).strip()
    title = re.sub(r'\s*\([^)]{40,}\)', '', title).strip()
    title = re.sub(r'\s+', ' ', title).strip()
    if year and str(year) not in title and re.search(r'\b(?:Act|Law|Code|Regulation|Directive|Ordinance|Decree)\b', title, re.I):
        title = f'{title} {year}'
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
    words = title.split()
    if len(words) > 9:
        title = ' '.join(words[:9])
    return title.strip().strip(',.-:;').strip()


def fetch_existing_uuids() -> set[str]:
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
    }
    existing: set[str] = set()
    offset = 0
    while True:
        resp = requests.get(
            f'{SUPABASE_URL}/rest/v1/regulations',
            headers=headers,
            params={'select': 'id', 'offset': offset, 'limit': 1000},
            timeout=30,
        )
        resp.raise_for_status()
        rows = resp.json()
        for row in rows:
            existing.add(str(row['id']))
        if len(rows) < 1000:
            break
        offset += 1000
    return existing


def insert_batch(records: list[dict]) -> tuple[int, str | None]:
    headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': f'Bearer {SUPABASE_ANON_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'resolution=ignore-duplicates,return=minimal',
    }
    resp = requests.post(
        f'{SUPABASE_URL}/rest/v1/regulations',
        headers=headers,
        json=records,
        timeout=60,
    )
    if resp.status_code in (200, 201):
        return len(records), None
    return 0, f'HTTP {resp.status_code}: {resp.text[:200]}'


def main():
    print(f'Reading Excel: {EXCEL_PATH}')
    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, dtype={'Year': 'Int64', 'ID': str})
    print(f'  → {len(df)} rows loaded')

    print('Fetching existing UUIDs from Supabase...')
    existing_uuids = fetch_existing_uuids()
    print(f'  → {len(existing_uuids)} already in DB')

    staged = []
    skipped = 0

    for _, row in df.iterrows():
        excel_id = clean(str(row.get('ID', '') or ''))
        formal_title = clean(str(row.get('Formal Title', '') or ''))
        if not excel_id or not formal_title:
            skipped += 1
            continue

        rec_uuid = deterministic_uuid(excel_id)
        if rec_uuid in existing_uuids:
            skipped += 1
            continue

        country_raw = clean(str(row.get('Country / Organization', '') or ''))
        region = COUNTRY_MAP.get(country_raw, country_raw or 'Global')

        year_val = row.get('Year')
        effective_date = None
        year_int = None
        if pd.notna(year_val) and str(year_val).isdigit():
            year_int = int(year_val)
            effective_date = f'{year_int}-01-01'

        summary = clean(row.get('Summary', ''))
        status_raw = clean(row.get('Status', ''))
        source_publisher = clean(row.get('Source Publisher', ''))
        source_url_val = row.get('Source URL', '')
        policy_page = row.get('Policy Page', '')

        category = infer_category(row)
        reg_type = infer_regulation_type(row)

        tags: list[str] = []
        if region and region != 'Global':
            tags.append(region.lower())
        tags.append(reg_type)
        vol_man_tag = clean(row.get('Voluntary / Mandatory', '')).lower()
        if vol_man_tag:
            tags.append(vol_man_tag)
        sdgs_raw = clean(row.get('SDGs Targeted', ''))
        if sdgs_raw:
            for sdg in re.findall(r'\bSDG\s*\d+\b', sdgs_raw, re.IGNORECASE):
                tags.append(sdg.lower().replace(' ', ''))
        pol_type_tag = clean(row.get('Type', '')).lower()
        if pol_type_tag:
            tags.append(pol_type_tag)
        tags = [t for t in set(tags) if t]

        title = make_short_title(formal_title, region, year_int)
        desc = summary or formal_title

        selected_source_url = pick_source_url(source_url_val, policy_page)
        policy_page_url = pick_policy_page_url(source_url_val, policy_page)
        official_source_url = derive_official_website_url(policy_page_url)
        source_link_kind = infer_source_link_kind(official_source_url)

        record = {
            'id': rec_uuid,
            'title': title,
            'formal_title': formal_title,
            'summary': desc,
            'description': desc,
            'full_description': desc,
            'region': region,
            'jurisdiction_type': infer_jurisdiction_type(region),
            'jurisdiction_value': region,
            'category': category,
            'status': map_lifecycle_status(status_raw),
            'effective_date': effective_date,
            'published_date': None,
            'adopted_date': None,
            'date_precision': 'year' if effective_date else None,
            'regulation_type': map_regulation_type(reg_type),
            'source_name': source_publisher or (country_raw if country_raw.lower() not in ('nan', 'none', '') else '') or 'Carrots & Sticks',
            'source_url': selected_source_url,
            'official_source_url': official_source_url,
            'policy_page_url': policy_page_url,
            'source_link_kind': source_link_kind,
            'topics': infer_topics(category, title, desc, tags),
            'link_status': infer_link_status_from_url(selected_source_url),
            'source_health': 'healthy' if selected_source_url else 'missing',
            'tags': tags,
        }
        staged.append(record)

    print(f'  → {len(staged)} to insert | {skipped} skipped (existing or empty)')

    if not staged:
        print('Nothing to insert.')
        return

    # Insert in batches
    total_inserted = 0
    errors = []
    for i in range(0, len(staged), BATCH_SIZE):
        batch = staged[i:i + BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (len(staged) + BATCH_SIZE - 1) // BATCH_SIZE
        count, err = insert_batch(batch)
        if err:
            errors.append(f'Batch {batch_num}: {err}')
            print(f'  ✗ Batch {batch_num}/{total_batches} FAILED: {err}')
        else:
            total_inserted += count
            print(f'  ✓ Batch {batch_num}/{total_batches} ({count} records)')

    print(f'\nDone. Inserted {total_inserted} records.')
    if errors:
        print(f'{len(errors)} batches failed:')
        for e in errors:
            print(f'  {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()
