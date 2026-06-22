const SEARXNG_URL = process.env.SEARXNG_URL || "http://localhost:8888";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<SearchResult[]> {
  const res = await fetch(
    `${SEARXNG_URL}/search?q=${encodeURIComponent(query)}&format=json&categories=general`
  );
  if (!res.ok) throw new Error(`SearXNG returned ${res.status}`);
  const data: any = await res.json();
  return (data.results || []).slice(0, 5).map((r: any) => ({
    title: r.title,
    url: r.url,
    snippet: r.content || "",
  }));
}
