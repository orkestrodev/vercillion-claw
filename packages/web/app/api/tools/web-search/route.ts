import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    // Attempt DuckDuckGo HTML search for real-time live web results
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Search upstream returned status " + res.status },
        { status: 502 }
      );
    }

    const html = await res.text();
    const results: Array<{ title: string; url: string; snippet: string }> = [];

    // Parse DDG HTML results
    const bodyRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
    let match;
    while ((match = bodyRegex.exec(html)) && results.length < 5) {
      const block = match[1];
      const linkMatch = block.match(/<a class="result__url[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/) ||
        block.match(/href="([^"]+)"/);
      const titleMatch = block.match(/<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/) ||
        block.match(/<h2[^>]*>([\s\S]*?)<\/h2>/);
      const snippetMatch = block.match(/class="result__snippet[^>]*>([\s\S]*?)<\/a>/);

      let rawUrl = linkMatch ? linkMatch[1] : "";
      if (rawUrl.includes("uddg=")) {
        const uddg = rawUrl.match(/uddg=([^&]+)/);
        if (uddg) rawUrl = decodeURIComponent(uddg[1]);
      } else if (rawUrl.startsWith("//")) {
        rawUrl = "https:" + rawUrl;
      }

      const cleanTitle = (titleMatch ? titleMatch[1] : "Result")
        .replace(/<[^>]+>/g, "")
        .trim();
      const cleanSnippet = (snippetMatch ? snippetMatch[1] : "")
        .replace(/<[^>]+>/g, "")
        .trim();

      if (rawUrl && (cleanSnippet || cleanTitle)) {
        results.push({
          title: cleanTitle || query,
          url: rawUrl,
          snippet: cleanSnippet || "Search result for " + query,
        });
      }
    }

    return NextResponse.json({
      query,
      results,
    });
  } catch (error: any) {
    console.error("Web search tool route error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal search error" },
      { status: 500 }
    );
  }
}
