#!/usr/bin/env python3
"""
Regulation URL Enrichment Script
---------------------------------
Fetches regulations from Supabase that lack a proper official_source_url/source_url
and uses the Anthropic API (with web_search tool) to propose better URLs.

Usage:
    # Dry run — propose URLs for priority regions, save to CSV:
    python scripts/enrich-regulation-urls.py

    # Limit to specific region:
    python scripts/enrich-regulation-urls.py --region UK

    # Apply accepted proposals from CSV to Supabase:
    python scripts/enrich-regulation-urls.py --apply proposals.csv

    # Resume from checkpoint (skips already-processed IDs):
    python scripts/enrich-regulation-urls.py --checkpoint proposals.csv

Environment variables required:
    ANTHROPIC_API_KEY          Claude API key (for URL research)
    SUPABASE_URL               e.g. https://xxxx.supabase.co
    SUPABASE_ANON_KEY          For read access
    SUPABASE_SERVICE_ROLE_KEY  For write access (--apply mode only)
"""

import os
import sys
import json
import csv
import time
import argparse
import urllib.request
import urllib.parse
import ssl
from datetime import datetime
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://twjaqynuamghrobhdasf.supabase.co")
SUPABASE_ANON_KEY = os.environ.get(
    "SUPABASE_ANON_KEY",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amFxeW51YW1naHJvYmhkYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc2NTcsImV4cCI6MjA5MDUyMzY1N30.zLhPdZE1jo1svRpK07c0iLrMA1_ObKz6M3yYeDS65Rw"
)
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

PRIORITY_REGIONS = ["EU", "UK", "USA", "Germany", "France", "Australia", "Canada", "Japan",
                    "Brazil", "India", "China", "Spain", "Italy", "Netherlands", "Switzerland",
                    "Sweden", "Norway", "Denmark", "Belgium", "Ireland", "South Africa",
                    "Singapore", "Hong Kong", "South Korea", "Mexico", "Argentina",
                    "New Zealand", "Global"]

POOR_URL_PATTERNS = ["carrotsandsticks.org", "supabase.co/storage"]

BATCH_SIZE = 10           # Regulations processed per API call
API_DELAY_SECS = 1.0      # Delay between API calls
MAX_REGS = None           # Set to an int to limit total processed (None = all)

# ── HTTP helpers ──────────────────────────────────────────────────────────────
def _ssl_ctx():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def supabase_get(path: str, key: str) -> list | dict:
    url = f"{SUPABASE_URL}{path}"
    req = urllib.request.Request(url, headers={
        "apikey": key,
        "Authorization": f"Bearer {key}",
    })
    with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=30) as resp:
        return json.loads(resp.read())


def supabase_patch(path: str, payload: dict, key: str) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{SUPABASE_URL}{path}",
        data=data,
        method="PATCH",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }
    )
    with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=30) as resp:
        return {"status": resp.status}


def anthropic_post(payload: dict) -> dict:
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=data,
        headers={
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "anthropic-beta": "web-search-2025-03-05",
            "Content-Type": "application/json",
        }
    )
    with urllib.request.urlopen(req, context=_ssl_ctx(), timeout=120) as resp:
        return json.loads(resp.read())


# ── URL quality helpers ───────────────────────────────────────────────────────
def is_poor_url(url: str | None) -> bool:
    if not url:
        return True
    return any(p in url.lower() for p in POOR_URL_PATTERNS)


def needs_enrichment(reg: dict) -> bool:
    official = reg.get("official_source_url") or ""
    source = reg.get("source_url") or ""
    good_official = bool(official) and not is_poor_url(official)
    good_source = bool(source) and not is_poor_url(source)
    return not (good_official or good_source)


# ── Supabase fetch ────────────────────────────────────────────────────────────
def fetch_regulations(region: str | None = None) -> list[dict]:
    all_regs: list[dict] = []
    offset = 0
    page = 1000

    while True:
        path = (
            f"/rest/v1/regulations"
            f"?select=id,title,formal_title,region,status,effective_date,source_name,official_source_url,source_url,policy_page_url"
            f"&limit={page}&offset={offset}&order=effective_date.desc"
        )
        if region:
            path += f"&region=eq.{urllib.parse.quote(region)}"

        chunk = supabase_get(path, SUPABASE_ANON_KEY)
        if isinstance(chunk, dict) and "code" in chunk:
            print(f"  Supabase error: {chunk}", file=sys.stderr)
            break

        all_regs.extend(chunk)
        print(f"  Fetched {len(all_regs)} regulations...")
        if len(chunk) < page:
            break
        offset += page

    return all_regs


# ── Claude URL researcher ─────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are an ESG regulation research assistant.
For each regulation provided, find the BEST official URLs:
  1. official_source_url — Homepage of the issuing body (e.g. https://eur-lex.europa.eu)
  2. source_url          — Direct link to the regulation document/page on the official site
  3. pdf_url             — Direct PDF download URL (if a stable official PDF exists; otherwise null)

Rules:
- Use web_search to verify URLs are real and currently accessible.
- Do NOT use carrotsandsticks.org, supabase storage, or Wikipedia.
- For EU regulations: use eur-lex.europa.eu with the CELEX code or OJ reference if known.
- For UK legislation: use legislation.gov.uk; for UK governance codes: frc.org.uk.
- For Australia: legislation.gov.au for Acts; regulator sites for guidance.
- Prefer the most specific URL (deepest permalink) for source_url.
- If you cannot find a confident URL, use null rather than guessing.
- Output ONLY valid JSON in the exact format shown — no markdown, no explanation.

Output format (array, one entry per input regulation):
[
  {
    "id": "uuid-here",
    "official_source_url": "https://example.gov",
    "source_url": "https://example.gov/specific/regulation/page",
    "pdf_url": null,
    "confidence": "high|medium|low",
    "notes": "brief note"
  }
]"""


def research_urls_batch(batch: list[dict]) -> list[dict]:
    """Call Claude API with web_search for a batch of regulations."""
    reg_list = []
    for r in batch:
        reg_list.append({
            "id": r["id"],
            "title": r["title"],
            "formal_title": r.get("formal_title", ""),
            "region": r.get("region", ""),
            "effective_date": r.get("effective_date", ""),
            "source_name": r.get("source_name", ""),
        })

    user_msg = f"""Research official URLs for these {len(batch)} ESG regulations:

{json.dumps(reg_list, indent=2, ensure_ascii=False)}

For each regulation, search the web to find:
- The issuing body's official website (official_source_url)
- The direct page/document URL for this specific regulation (source_url)
- A direct PDF URL if one exists (pdf_url)

Return ONLY the JSON array as specified in your instructions."""

    payload = {
        "model": "claude-haiku-4-5",
        "max_tokens": 4096,
        "tools": [{
            "type": "web_search_20250305",
            "name": "web_search",
            "max_uses": len(batch) * 2,
        }],
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": user_msg}],
    }

    try:
        response = anthropic_post(payload)
    except Exception as e:
        print(f"  API error: {e}", file=sys.stderr)
        return []

    # Extract text from response content blocks
    full_text = ""
    for block in response.get("content", []):
        if block.get("type") == "text":
            full_text += block["text"]

    # Parse JSON array from the response
    try:
        start = full_text.find("[")
        end = full_text.rfind("]") + 1
        if start >= 0 and end > start:
            return json.loads(full_text[start:end])
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}\n  Raw: {full_text[:500]}", file=sys.stderr)

    return []


# ── CSV helpers ───────────────────────────────────────────────────────────────
CSV_FIELDS = [
    "id", "title", "region", "effective_date",
    "current_official", "current_source",
    "proposed_official", "proposed_source", "proposed_pdf",
    "confidence", "notes", "accept",
]


def load_checkpoint(path: str) -> set[str]:
    """Return set of IDs already processed in an existing CSV."""
    processed = set()
    if not Path(path).exists():
        return processed
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            processed.add(row["id"])
    return processed


def append_proposals_to_csv(proposals: list[dict], regs_by_id: dict, path: str):
    new_file = not Path(path).exists()
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        if new_file:
            writer.writeheader()
        for p in proposals:
            reg = regs_by_id.get(p["id"], {})
            writer.writerow({
                "id": p["id"],
                "title": reg.get("title", ""),
                "region": reg.get("region", ""),
                "effective_date": reg.get("effective_date", ""),
                "current_official": reg.get("official_source_url", ""),
                "current_source": reg.get("source_url", ""),
                "proposed_official": p.get("official_source_url") or "",
                "proposed_source": p.get("source_url") or "",
                "proposed_pdf": p.get("pdf_url") or "",
                "confidence": p.get("confidence", ""),
                "notes": p.get("notes", ""),
                "accept": "yes" if p.get("confidence") == "high" else "",
            })


# ── Apply mode ────────────────────────────────────────────────────────────────
def apply_proposals(csv_path: str):
    if not SUPABASE_SERVICE_ROLE_KEY:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY not set. Cannot apply changes.", file=sys.stderr)
        sys.exit(1)

    applied = 0
    skipped = 0

    with open(csv_path, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    accepted = [r for r in rows if r.get("accept", "").strip().lower() in ("yes", "y", "true", "1")]
    print(f"Applying {len(accepted)} accepted proposals (of {len(rows)} total)...")

    for row in accepted:
        reg_id = row["id"]
        patch: dict = {}

        new_official = row.get("proposed_official", "").strip()
        new_source = row.get("proposed_source", "").strip()

        if new_official:
            patch["official_source_url"] = new_official
        if new_source:
            patch["source_url"] = new_source

        if not patch:
            skipped += 1
            continue

        try:
            result = supabase_patch(
                f"/rest/v1/regulations?id=eq.{urllib.parse.quote(reg_id)}",
                patch,
                SUPABASE_SERVICE_ROLE_KEY,
            )
            print(f"  ✓ {reg_id[:8]}... {row.get('title','')[:50]} → {result}")
            applied += 1
        except Exception as e:
            print(f"  ✗ {reg_id[:8]}... ERROR: {e}", file=sys.stderr)
            skipped += 1

        time.sleep(0.05)

    print(f"\nDone. Applied: {applied}  Skipped: {skipped}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Enrich regulation URLs via Claude API")
    parser.add_argument("--region", help="Only process this region (e.g. UK)")
    parser.add_argument("--apply", metavar="CSV", help="Apply accepted proposals from CSV to Supabase")
    parser.add_argument("--checkpoint", metavar="CSV", default="proposals.csv",
                        help="CSV file for output / resuming (default: proposals.csv)")
    parser.add_argument("--limit", type=int, default=None, help="Max regulations to process")
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = parser.parse_args()

    if args.apply:
        apply_proposals(args.apply)
        return

    if not ANTHROPIC_API_KEY:
        print("ERROR: ANTHROPIC_API_KEY not set.", file=sys.stderr)
        sys.exit(1)

    out_csv = args.checkpoint

    # Fetch all regulations
    print(f"Fetching regulations from Supabase...")
    all_regs = fetch_regulations(args.region)

    # Filter to only those needing enrichment
    to_enrich = [r for r in all_regs if needs_enrichment(r)]

    # Filter to priority regions unless a specific region was requested
    if not args.region:
        to_enrich = [r for r in to_enrich if r.get("region", "") in PRIORITY_REGIONS]

    # Skip already-processed
    processed_ids = load_checkpoint(out_csv)
    to_enrich = [r for r in to_enrich if r["id"] not in processed_ids]

    if args.limit:
        to_enrich = to_enrich[: args.limit]

    print(f"\nRegulations to enrich: {len(to_enrich)}")
    if not to_enrich:
        print("Nothing to do.")
        return

    regs_by_id = {r["id"]: r for r in to_enrich}

    # Process in batches
    batch_size = args.batch_size
    total_batches = (len(to_enrich) + batch_size - 1) // batch_size

    for i in range(0, len(to_enrich), batch_size):
        batch = to_enrich[i : i + batch_size]
        batch_num = i // batch_size + 1
        print(f"\n[Batch {batch_num}/{total_batches}] Processing {len(batch)} regulations...")
        for r in batch:
            print(f"  · {r.get('region','?'):12s} {r['title'][:60]}")

        proposals = research_urls_batch(batch)
        if proposals:
            append_proposals_to_csv(proposals, regs_by_id, out_csv)
            print(f"  → {len(proposals)} proposals written to {out_csv}")
        else:
            print(f"  → No proposals returned for this batch.", file=sys.stderr)

        if i + batch_size < len(to_enrich):
            time.sleep(API_DELAY_SECS)

    print(f"\n{'='*60}")
    print(f"Done! Proposals saved to: {out_csv}")
    print(f"Review the CSV, mark 'accept' column as 'yes' for rows you want applied,")
    print(f"then run: python scripts/enrich-regulation-urls.py --apply {out_csv}")


if __name__ == "__main__":
    main()
