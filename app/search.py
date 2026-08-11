import requests
import urllib.parse
from bs4 import BeautifulSoup

# The web agent deliberately limits its evidence to recognised public-health,
# professional, and scholarly publishers.  This keeps search results from
# being influenced by affiliate sites, social media, or unqualified blogs.
TRUSTED_SOURCES = {
    "pubmed.ncbi.nlm.nih.gov": "PubMed",
    "ncbi.nlm.nih.gov": "National Center for Biotechnology Information",
    "nih.gov": "National Institutes of Health",
    "ods.od.nih.gov": "NIH Office of Dietary Supplements",
    "who.int": "World Health Organization",
    "cdc.gov": "Centers for Disease Control and Prevention",
    "health.gov": "U.S. Department of Health and Human Services",
    "dietaryguidelines.gov": "Dietary Guidelines for Americans",
    "acsm.org": "American College of Sports Medicine",
    "nsca.com": "National Strength and Conditioning Association",
    "eatright.org": "Academy of Nutrition and Dietetics",
    "heart.org": "American Heart Association",
}

TRUSTED_SEARCH_SITES = " OR ".join(f"site:{domain}" for domain in TRUSTED_SOURCES)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

def _trusted_publisher(url: str) -> str | None:
    """Return a recognised publisher name when the URL is in the allowlist."""
    hostname = urllib.parse.urlparse(url).hostname or ""
    hostname = hostname.lower().removeprefix("www.")
    for domain, publisher in TRUSTED_SOURCES.items():
        if hostname == domain or hostname.endswith(f".{domain}"):
            return publisher
    return None


def search_ddg(query: str, max_results: int = 5, trusted_only: bool = False) -> list[dict]:
    """
    Search DuckDuckGo Lite and parse results.
    Returns source metadata with title, URL, publisher, snippet, and source type.
    """
    url = "https://lite.duckduckgo.com/lite/"
    search_query = f"{query} ({TRUSTED_SEARCH_SITES})" if trusted_only else query
    data = {"q": search_query}
    try:
        r = requests.post(url, data=data, headers=HEADERS, timeout=10)
        r.raise_for_status()
        
        soup = BeautifulSoup(r.text, "html.parser")
        tables = soup.find_all("table")
        if not tables or len(tables) < 3:
            return []
            
        # Find the table that contains the search results by checking for anchors with class "result-link"
        results_table = None
        for table in tables:
            if table.find("a", class_="result-link"):
                results_table = table
                break
                
        if not results_table:
            return []
            
        results = []
        links = results_table.find_all("a", class_="result-link")
        
        for link in links:
            title = link.text.strip()
            href = link.get("href", "")
            
            # Extract actual URL from DDG redirect parameters (uddg)
            if "uddg=" in href:
                try:
                    href = href.split("uddg=")[1].split("&")[0]
                    href = urllib.parse.unquote(href)
                except Exception:
                    pass
            
            # Find the sibling row that contains the snippet
            snippet = ""
            parent_tr = link.find_parent("tr")
            if parent_tr:
                next_tr = parent_tr.find_next_sibling("tr")
                if next_tr:
                    snippet_td = next_tr.find("td", class_="result-snippet")
                    if snippet_td:
                        snippet = snippet_td.text.strip()
            
            publisher = _trusted_publisher(href)
            if trusted_only and not publisher:
                continue

            results.append({
                "title": title,
                "url": href,
                "snippet": snippet,
                "source_type": "trusted guidance" if publisher else "web",
                "publisher": publisher or "Web",
                "year": "Web",
            })
            
            if len(results) >= max_results:
                break
                
        return results
    except Exception as e:
        print("Error performing DuckDuckGo search:", e)
        return []


def search_trusted_sources(query: str, max_results: int = 5) -> list[dict]:
    """Return a diverse set of authoritative health and research sources.

    A broad search is filtered against the allowlist first because it tends to
    find a better mix of public-health bodies than a long ``site:`` query. A
    restricted search then fills any remaining slots. Results are ordered to
    show different publishers before multiple pages from the same publisher.
    """
    candidates = [
        result for result in search_ddg(query, max_results=20)
        if result.get("publisher") != "Web"
    ]
    if len(candidates) < max_results:
        candidates.extend(search_ddg(query, max_results=20, trusted_only=True))

    unique = []
    seen_urls = set()
    seen_publishers = set()
    for result in candidates:
        if result["url"] in seen_urls or result["publisher"] in seen_publishers:
            continue
        unique.append(result)
        seen_urls.add(result["url"])
        seen_publishers.add(result["publisher"])
        if len(unique) == max_results:
            return unique

    # If the query only has strong results from one publisher, include those
    # rather than returning fewer links, while still never admitting a
    # non-allowlisted source.
    for result in candidates:
        if result["url"] not in seen_urls:
            unique.append(result)
            seen_urls.add(result["url"])
        if len(unique) == max_results:
            break
    return unique
