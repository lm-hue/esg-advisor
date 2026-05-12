#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
from collections import defaultdict
from pathlib import Path
from typing import Any
from urllib.parse import quote


SUPABASE_URL = "https://twjaqynuamghrobhdasf.supabase.co"
ANON_KEY = (
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
    "eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3amFxeW51YW1naHJvYmhkYXNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5NDc2NTcsImV4cCI6MjA5MDUyMzY1N30."
    "zLhPdZE1jo1svRpK07c0iLrMA1_ObKz6M3yYeDS65Rw"
)

ARCHIVED_SOURCE_PREFIX = "https://twjaqynuamghrobhdasf.supabase.co/storage/v1/object/public/regulation-source-archives/"


def fetch_json_pages(table: str, select: str) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    offset = 0
    page_size = 1000

    while True:
        url = (
            f"{SUPABASE_URL}/rest/v1/{table}"
            f"?select={quote(select)}&order=id.asc&limit={page_size}&offset={offset}"
        )
        response = subprocess.check_output(
            [
                "curl",
                "-L",
                "-s",
                "--fail",
                url,
                "-H",
                f"apikey: {ANON_KEY}",
                "-H",
                f"Authorization: Bearer {ANON_KEY}",
            ],
            text=True,
        )
        page_rows = json.loads(response)
        rows.extend(page_rows)
        if len(page_rows) < page_size:
            break
        offset += page_size

    return rows


def sanitize_url(url: str | None) -> str:
    normalized = (url or "").strip()
    if not normalized:
        return ""
    if "carrotsandsticks.org" in normalized.lower():
        return ""
    return normalized


def main() -> None:
    regulations = fetch_json_pages("regulations", "id,title")
    documents = fetch_json_pages(
        "regulation_source_documents",
        "id,regulation_id,document_type,document_url,archived_public_url,official_source_url,policy_page_url",
    )

    docs_by_regulation: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for document in documents:
        docs_by_regulation[str(document.get("regulation_id") or "")].append(document)

    with_pdf_doc = []
    missing_button = []
    for regulation in regulations:
        rid = str(regulation["id"])
        source_docs = docs_by_regulation.get(rid, [])
        pdf_docs = [
            d for d in source_docs
            if (d.get("document_type") or "").lower() == "pdf"
            and sanitize_url(d.get("archived_public_url"))
        ]
        if not pdf_docs:
            continue
        with_pdf_doc.append(rid)
        visible_docs = []
        for document in source_docs:
            candidate_url = f"{document.get('document_url') or ''} {document.get('archived_public_url') or ''}".lower()
            if (document.get("document_type") or "") in ("html", "pdf") or ".pdf" in candidate_url or sanitize_url(document.get("document_url")):
                visible_docs.append(document)
        has_pdf_button = False
        for document in visible_docs:
            display_href = sanitize_url(document.get("archived_public_url")) if (document.get("document_type") or "") == "pdf" else sanitize_url(document.get("document_url") or document.get("official_source_url"))
            if display_href and (document.get("document_type") or "") == "pdf":
                has_pdf_button = True
                break
        if not has_pdf_button:
            missing_button.append(
                {
                    "id": rid,
                    "title": regulation.get("title") or "",
                    "source_document_count": len(source_docs),
                    "pdf_doc_count": len(pdf_docs),
                }
            )

    print(json.dumps({
        "regulations_with_archived_pdf": len(with_pdf_doc),
        "regulations_missing_pdf_button_under_current_logic": len(missing_button),
        "examples": missing_button[:20],
    }, indent=2))


if __name__ == "__main__":
    main()
