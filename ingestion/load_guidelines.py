"""
Loads guideline PDFs (WHO physical activity guidelines, ACSM position
stands, etc.) from data/guidelines/ and extracts their text into the
same document format used by fetch_pubmed.py, so both sources can be
chunked and embedded together.

Drop your PDFs into data/guidelines/ before running this.

Usage:
    python ingestion/load_guidelines.py
"""

import json
from pathlib import Path
from pypdf import PdfReader

GUIDELINES_DIR = Path(__file__).parent.parent / "data" / "guidelines"
OUTPUT_PATH = Path(__file__).parent.parent / "data" / "processed" / "guideline_docs.json"


def extract_pdf_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    pages_text = []
    for page in reader.pages:
        text = page.extract_text() or ""
        if text.strip():
            pages_text.append(text)
    return "\n\n".join(pages_text)


def main():
    if not GUIDELINES_DIR.exists() or not any(GUIDELINES_DIR.glob("*.pdf")):
        print(f"No PDFs found in {GUIDELINES_DIR}.")
        print("Add guideline PDFs there first (e.g. WHO physical activity guidelines,")
        print("ACSM position stands), then re-run this script.")
        return

    docs = []
    for pdf_path in sorted(GUIDELINES_DIR.glob("*.pdf")):
        print(f"Reading: {pdf_path.name}")
        text = extract_pdf_text(pdf_path)
        if not text.strip():
            print(f"  -> WARNING: no extractable text (likely a scanned PDF), skipping")
            continue
        docs.append(
            {
                "source_type": "guideline",
                "title": pdf_path.stem.replace("_", " "),
                "year": "n.d.",
                "text": text,
                "url": "",  # fill in manually if you want a source link in citations
                "topic": "guideline",
            }
        )
        print(f"  -> extracted {len(text)} characters")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(docs, f, indent=2)

    print(f"\nSaved {len(docs)} guideline documents to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
