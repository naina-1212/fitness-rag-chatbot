"""Download a small, curated set of official nutrition and activity guidance.

The resulting documents are intended to complement PubMed abstracts in the
local RAG collection. Review the source list before each production rebuild;
these pages are deliberately limited to public-health and professional bodies.

Usage:
    python ingestion/fetch_trusted_guidance.py
    python ingestion/build_vectorstore.py
"""

import json
from pathlib import Path

import requests
from bs4 import BeautifulSoup

OUTPUT_PATH = Path(__file__).parent.parent / "data" / "processed" / "trusted_guidance_docs.json"
HEADERS = {"User-Agent": "PulseFit-Evidence-Collector/1.0 (educational RAG project)"}

CURATED_SOURCES = [
    {
        "title": "Physical activity guidelines for adults",
        "publisher": "Centers for Disease Control and Prevention",
        "url": "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html",
        "topic": "physical activity",
    },
    {
        "title": "Dietary Guidelines for Americans",
        "publisher": "U.S. Department of Health and Human Services",
        "url": "https://www.dietaryguidelines.gov/",
        "topic": "healthy eating",
    },
    {
        "title": "Physical activity",
        "publisher": "World Health Organization",
        "url": "https://www.who.int/news-room/fact-sheets/detail/physical-activity",
        "topic": "physical activity",
    },
    {
        "title": "Nutrition",
        "publisher": "American Heart Association",
        "url": "https://www.heart.org/en/healthy-living/healthy-eating",
        "topic": "nutrition",
    },
    {
        "title": "Dietary Supplements: What You Need to Know",
        "publisher": "NIH Office of Dietary Supplements",
        "url": "https://ods.od.nih.gov/HealthInformation/Dietary_Supplements.aspx",
        "topic": "supplements",
    },
]


def extract_page_text(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    for element in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
        element.decompose()
    content = soup.find("main") or soup.find("article") or soup.body or soup
    lines = [line.strip() for line in content.get_text("\n").splitlines() if line.strip()]
    # Prevent navigation-heavy pages from dominating the vector store.
    return "\n".join(lines[:600])


def main():
    documents = []
    for source in CURATED_SOURCES:
        print(f"Downloading: {source['publisher']} — {source['title']}")
        try:
            response = requests.get(source["url"], headers=HEADERS, timeout=20)
            response.raise_for_status()
            text = extract_page_text(response.text)
        except requests.RequestException as error:
            print(f"  -> skipped: {error}")
            continue

        if len(text) < 200:
            print("  -> skipped: page did not contain enough readable text")
            continue

        documents.append({
            "source_type": "official guidance",
            "publisher": source["publisher"],
            "title": source["title"],
            "year": "Current guidance",
            "text": text,
            "url": source["url"],
            "topic": source["topic"],
        })
        print(f"  -> saved {len(text)} characters")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as file:
        json.dump(documents, file, indent=2, ensure_ascii=False)
    print(f"\nSaved {len(documents)} official guidance documents to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
