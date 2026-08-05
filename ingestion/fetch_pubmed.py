"""
Fetches PubMed abstracts for a curated set of fitness/nutrition subtopics
using NCBI's E-utilities API, and saves them as JSON documents for later
chunking + embedding.

Usage:
    python ingestion/fetch_pubmed.py
"""

import json
import time
import requests
from pathlib import Path

EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "processed" / "pubmed_docs.json"

# Keep this list narrow on purpose -- breadth kills week-long projects.
# Each query pulls the most relevant recent papers for that subtopic.
TOPICS = {
    "hypertrophy_training": '"resistance training"[Title/Abstract] AND "muscle hypertrophy"[Title/Abstract]',
    "protein_timing": '"protein timing"[Title/Abstract] AND "muscle protein synthesis"[Title/Abstract]',
    "cardio_zones": '"aerobic exercise"[Title/Abstract] AND ("training intensity"[Title/Abstract] OR "VO2max"[Title/Abstract])',
    "recovery_sleep": '"exercise recovery"[Title/Abstract] OR ("sleep"[Title/Abstract] AND "muscle recovery"[Title/Abstract])',
}

RESULTS_PER_TOPIC = 15


def esearch(query: str, retmax: int) -> list[str]:
    """Get a list of PubMed IDs matching a query."""
    params = {
        "db": "pubmed",
        "term": query,
        "retmax": retmax,
        "retmode": "json",
        "sort": "relevance",
    }
    r = requests.get(f"{EUTILS_BASE}/esearch.fcgi", params=params, timeout=30)
    r.raise_for_status()
    return r.json()["esearchresult"].get("idlist", [])


def efetch_abstracts(pmids: list[str]) -> list[dict]:
    """Fetch title + abstract text for a batch of PubMed IDs."""
    if not pmids:
        return []
    params = {
        "db": "pubmed",
        "id": ",".join(pmids),
        "retmode": "xml",
        "rettype": "abstract",
    }
    r = requests.get(f"{EUTILS_BASE}/efetch.fcgi", params=params, timeout=30)
    r.raise_for_status()

    # Lightweight XML parsing without extra deps
    import xml.etree.ElementTree as ET

    root = ET.fromstring(r.content)
    docs = []
    for article in root.findall(".//PubmedArticle"):
        pmid_el = article.find(".//PMID")
        title_el = article.find(".//ArticleTitle")
        abstract_parts = article.findall(".//AbstractText")
        year_el = article.find(".//PubDate/Year")

        if pmid_el is None or not abstract_parts:
            continue  # skip entries with no abstract text

        pmid = pmid_el.text
        title = (title_el.text or "").strip() if title_el is not None else ""
        abstract = " ".join((p.text or "") for p in abstract_parts).strip()
        year = year_el.text if year_el is not None else "n.d."

        if not abstract:
            continue

        docs.append(
            {
                "source_type": "pubmed",
                "pmid": pmid,
                "title": title,
                "year": year,
                "text": f"{title}\n\n{abstract}",
                "url": f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/",
            }
        )
    return docs


def main():
    all_docs = []
    for topic_key, query in TOPICS.items():
        print(f"Fetching: {topic_key} ...")
        pmids = esearch(query, RESULTS_PER_TOPIC)
        time.sleep(0.4)  # be polite to NCBI's rate limit (3 req/sec without an API key)
        docs = efetch_abstracts(pmids)
        for d in docs:
            d["topic"] = topic_key
        all_docs.extend(docs)
        print(f"  -> got {len(docs)} abstracts")
        time.sleep(0.4)

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(all_docs, f, indent=2)

    print(f"\nSaved {len(all_docs)} total abstracts to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
