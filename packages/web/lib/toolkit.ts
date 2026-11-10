import { defineToolkit } from "@assistant-ui/react";
import { z } from "zod";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface DocumentSearchResult {
  path: string;
  title: string;
  snippet: string;
  score: number;
}

export interface AppStateResult {
  url: string;
  title: string;
  theme: "dark" | "light";
  timestamp: string;
  agentStatus: string;
  user?: {
    name?: string;
    email?: string;
    id?: string;
  };
}

export const assistantToolkit = defineToolkit({
  web_search: {
    type: "frontend",
    description:
      "Search the web for current information and return relevant results with source links.",
    parameters: z.object({
      query: z
        .string()
        .describe("Search query to find current information and sources"),
    }),
    execute: async ({ query }): Promise<{ results: WebSearchResult[] }> => {
      try {
        const res = await fetch("/api/tools/web-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) {
          return { results: [] };
        }
        const data = await res.json();
        return { results: data.results || [] };
      } catch (err) {
        console.error("Web search execution error:", err);
        return { results: [] };
      }
    },
    render: () => null,
  },

  read_app_state: {
    type: "frontend",
    description:
      "Read the current application state so the assistant can answer questions about what the user is viewing.",
    parameters: z.object({}),
    execute: async (): Promise<AppStateResult> => {
      if (typeof window === "undefined") {
        return {
          url: "/",
          title: "Vercillion Claw",
          theme: "dark",
          timestamp: new Date().toISOString(),
          agentStatus: "Cloud Run Live",
        };
      }

      const isDark = document.documentElement.classList.contains("dark");
      return {
        url: window.location.href,
        title: document.title || "Vercillion Claw",
        theme: isDark ? "dark" : "light",
        timestamp: new Date().toISOString(),
        agentStatus: "Cloud Run Live (Autonomous Assistant)",
      };
    },
    render: () => null,
  },

  search_documents: {
    type: "frontend",
    description:
      "Search the project's connected documents and return relevant passages with source references.",
    parameters: z.object({
      query: z
        .string()
        .describe("Query to search project documents, skills, and personas"),
    }),
    execute: async ({
      query,
    }): Promise<{ results: DocumentSearchResult[] }> => {
      try {
        const res = await fetch("/api/documents/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query }),
        });
        if (!res.ok) {
          return { results: [] };
        }
        const data = await res.json();
        return { results: data.results || [] };
      } catch (err) {
        console.error("Document search execution error:", err);
        return { results: [] };
      }
    },
    render: () => null,
  },
});

export default assistantToolkit;
