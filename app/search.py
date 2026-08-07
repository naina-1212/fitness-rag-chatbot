import requests
import urllib.parse
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}

def search_ddg(query: str, max_results: int = 5) -> list[dict]:
    """
    Search DuckDuckGo Lite and parse results.
    Returns a list of dicts: [{'title': str, 'url': str, 'snippet': str, 'source_type': 'web', 'year': 'Web'}]
    """
    url = "https://lite.duckduckgo.com/lite/"
    data = {"q": query}
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
            
            results.append({
                "title": title,
                "url": href,
                "snippet": snippet,
                "source_type": "web",
                "year": "Web",
            })
            
            if len(results) >= max_results:
                break
                
        return results
    except Exception as e:
        print("Error performing DuckDuckGo search:", e)
        return []
