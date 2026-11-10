import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

interface DocumentMatch {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 2);

    // Look for workspace docs in monorepo root or local fallback
    const possibleDirs = [
      path.resolve(process.cwd(), "../../workspace"),
      path.resolve(process.cwd(), "../workspace"),
      path.resolve(process.cwd(), "workspace"),
      path.resolve(process.cwd(), "../../"),
      process.cwd(),
    ];

    const foundDocs: Array<{ relativePath: string; content: string }> = [];

    function scanDir(dir: string, baseDir: string, depth = 0) {
      if (depth > 4 || !fs.existsSync(dir)) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            if (
              entry.name !== "node_modules" &&
              entry.name !== ".git" &&
              entry.name !== ".next"
            ) {
              scanDir(fullPath, baseDir, depth + 1);
            }
          } else if (
            entry.isFile() &&
            (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
          ) {
            try {
              const content = fs.readFileSync(fullPath, "utf-8");
              foundDocs.push({
                relativePath: path.relative(baseDir, fullPath),
                content,
              });
            } catch {}
          }
        }
      } catch {}
    }

    for (const dir of possibleDirs) {
      if (fs.existsSync(dir)) {
        scanDir(dir, dir);
      }
    }

    const matches: DocumentMatch[] = [];

    for (const doc of foundDocs) {
      const lower = doc.content.toLowerCase();
      let matchCount = 0;
      let firstMatchIndex = -1;

      for (const term of searchTerms) {
        let idx = lower.indexOf(term);
        while (idx !== -1) {
          matchCount++;
          if (firstMatchIndex === -1 || idx < firstMatchIndex) {
            firstMatchIndex = idx;
          }
          idx = lower.indexOf(term, idx + term.length);
        }
      }

      if (matchCount > 0 || searchTerms.length === 0) {
        const start = Math.max(0, firstMatchIndex - 80);
        const end = Math.min(doc.content.length, firstMatchIndex + 250);
        const snippet =
          (start > 0 ? "..." : "") +
          doc.content.slice(start, end).replace(/\n+/g, " ").trim() +
          (end < doc.content.length ? "..." : "");

        const title = doc.relativePath.split("/").pop() || doc.relativePath;

        matches.push({
          path: doc.relativePath,
          title,
          snippet,
          score: matchCount,
        });
      }
    }

    matches.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      query,
      results: matches.slice(0, 5),
    });
  } catch (error: any) {
    console.error("Document search error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal document search error" },
      { status: 500 }
    );
  }
}
