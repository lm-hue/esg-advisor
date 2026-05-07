from __future__ import annotations

import uuid
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = Path('/Users/lucas/Claude_Code/esg-advisor/international_policies/all_policies.xlsx')
TS_OUTPUT = ROOT / 'src' / 'lib' / 'carrotsSourceLinkFallbacks.ts'
SQL_OUTPUT = ROOT / 'supabase' / 'migrations' / '20260426113000_backfill_carrots_source_link_fallbacks.sql'
SHEET_NAME = 'Policies'
CARROTS_NAMESPACE = uuid.UUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')


def clean(value: object) -> str:
    if value is None:
        return ''
    text = str(value).strip()
    return '' if text.lower() in {'nan', 'none', 'n/a', 'na'} else text


def build_regulation_id(policy_id: str) -> str:
    return str(uuid.uuid5(CARROTS_NAMESPACE, f'carrotsandsticks.org/policy/{policy_id}'))


def sql_str(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def js_str(value: str) -> str:
    return "'" + value.replace('\\', '\\\\').replace("'", "\\'") + "'"


def load_rows(workbook_path: Path) -> list[tuple[str, str]]:
    workbook = load_workbook(workbook_path, read_only=True, data_only=True)
    sheet = workbook[SHEET_NAME]
    rows = sheet.iter_rows(values_only=True)
    headers = [clean(cell) for cell in next(rows)]
    index = {header: i for i, header in enumerate(headers)}

    results: list[tuple[str, str]] = []
    seen_ids: set[str] = set()

    for row in rows:
        policy_id = clean(row[index['ID']])
        fallback_url = clean(row[index['Carrots & Sticks PDF link']]) or clean(row[index['Policy Page']])
        if not policy_id or not fallback_url:
            continue

        regulation_id = build_regulation_id(policy_id)
        if regulation_id in seen_ids:
            continue

        seen_ids.add(regulation_id)
        results.append((regulation_id, fallback_url))

    return sorted(results, key=lambda item: item[0])


def write_ts(rows: list[tuple[str, str]]) -> None:
    lines = [
        '// Generated from Carrots & Sticks source data.',
        '// Maps imported Carrots regulation IDs to a working reference PDF URL when no official source URL is available.',
        '',
        'export const CARROTS_SOURCE_LINK_FALLBACKS: Record<string, string> = {',
    ]
    lines.extend(f"  {js_str(regulation_id)}: {js_str(url)}," for regulation_id, url in rows)
    lines.extend(['}', ''])
    TS_OUTPUT.write_text('\n'.join(lines))


def write_sql(rows: list[tuple[str, str]]) -> None:
    value_lines = ',\n'.join(
        f"    ({sql_str(regulation_id)}, {sql_str(url)})" for regulation_id, url in rows
    )

    sql = f"""-- Backfill working reference PDF links from the Carrots & Sticks master source sheet.
-- These are used only when no verified official source URL or archived local source is available.

with mapped(regulation_id, fallback_url) as (
  values
{value_lines}
)
update public.regulations as regulations
set official_source_url = mapped.fallback_url,
    source_link_kind = 'reference_pdf'
from mapped
where regulations.id = mapped.regulation_id
  and coalesce(regulations.official_source_url, '') = '';

with mapped(regulation_id, fallback_url) as (
  values
{value_lines}
)
update public.regulation_source_documents as documents
set official_source_url = mapped.fallback_url,
    source_link_kind = 'reference_pdf'
from mapped
where documents.regulation_id = mapped.regulation_id
  and coalesce(documents.official_source_url, '') = '';
"""

    SQL_OUTPUT.write_text(sql)


def main() -> None:
    rows = load_rows(DEFAULT_WORKBOOK)
    write_ts(rows)
    write_sql(rows)
    print(f'Generated {len(rows)} Carrots fallback links.')
    print(f'TS: {TS_OUTPUT}')
    print(f'SQL: {SQL_OUTPUT}')


if __name__ == '__main__':
    main()
