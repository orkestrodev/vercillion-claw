import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";

export const maxDuration = 60;

const DEFAULT_CLOUD_RUN_URL = "https://vercillion-claw-469525028827.us-central1.run.app";

const CLAW_SYSTEM_PROMPT = `You are Vercillion Claw, an autonomous personal assistant that operates a sandboxed workspace (filesystem + shell), a full browser, web search, and reusable skills.

Your capabilities:
1. Workspace filesystem & Sandbox shell: read/write/edit files, run shell commands, git operations, builds.
2. Browser: Playwright browser navigation, snapshots, screenshots, form interactions.
3. Quick factual search: web search.
4. Personas: Optional personas can be loaded from "personas/" if requested by the user.

Always be concise, proactive, and execute tools directly to fulfill user tasks immediately without blocking on persona selection.`;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agentBaseUrl = process.env.AGENT_BASE_URL || DEFAULT_CLOUD_RUN_URL;

  if (agentBaseUrl) {
    try {
      const formattedMessages = messages.map((m: any) => {
        let content = m.content;
        if (Array.isArray(content)) {
          content = content
            .map((part: any) =>
              typeof part === "string" ? part : part?.text || ""
            )
            .join("\n");
        } else if (typeof content !== "string") {
          content = String(content || "");
        }
        return { role: m.role, content };
      });

      const response = await fetch(
        `${agentBaseUrl.replace(/\/$/, "")}/api/agents/claw/stream`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: formattedMessages }),
          signal: req.signal,
        }
      );

      if (response.ok && response.body) {
        const stream = createUIMessageStream({
          originalMessages: messages,
          execute: async ({ writer }) => {
            const reader = response.body!.getReader();
            const decoder = new TextDecoder();
            let buf = "";
            const defaultMsgId = `msg-${crypto.randomUUID()}`;
            let currentTextId = `txt-${crypto.randomUUID()}`;
            let currentReasoningId = `rsn-${crypto.randomUUID()}`;
            let hasStarted = false;
            let hasFinished = false;
            let isTextStreaming = false;
            let isReasoningStreaming = false;

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buf += decoder.decode(value, { stream: true });
                const lines = buf.split("\n");
                buf = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed.startsWith("data: ")) continue;
                  const dataStr = trimmed.slice(6).trim();
                  if (dataStr === "[DONE]") {
                    if (hasStarted && !hasFinished) {
                      if (isTextStreaming) {
                        writer.write({ type: "text-end", id: currentTextId });
                        isTextStreaming = false;
                      }
                      if (isReasoningStreaming) {
                        writer.write({ type: "reasoning-end", id: currentReasoningId });
                        isReasoningStreaming = false;
                      }
                      writer.write({ type: "finish-step" });
                      writer.write({ type: "finish" });
                      hasFinished = true;
                    }
                    continue;
                  }

                  try {
                    const parsed = JSON.parse(dataStr);

                    if (parsed.type === "start") {
                      if (!hasStarted) {
                        writer.write({
                          type: "start",
                          messageId: parsed.payload?.messageId || defaultMsgId,
                        });
                        writer.write({ type: "start-step" });
                        hasStarted = true;
                      }
                    } else if (parsed.type === "reasoning-delta" && parsed.payload?.text) {
                      if (!hasStarted) {
                        writer.write({ type: "start", messageId: defaultMsgId });
                        writer.write({ type: "start-step" });
                        hasStarted = true;
                      }
                      if (!isReasoningStreaming) {
                        currentReasoningId = `rsn-${crypto.randomUUID()}`;
                        writer.write({ type: "reasoning-start", id: currentReasoningId });
                        isReasoningStreaming = true;
                      }
                      writer.write({
                        type: "reasoning-delta",
                        id: currentReasoningId,
                        delta: parsed.payload.text,
                      });
                    } else if (parsed.type === "reasoning-end") {
                      if (isReasoningStreaming) {
                        writer.write({ type: "reasoning-end", id: currentReasoningId });
                        isReasoningStreaming = false;
                      }
                    } else if (parsed.type === "text-delta" && parsed.payload?.text) {
                      if (!hasStarted) {
                        writer.write({
                          type: "start",
                          messageId: defaultMsgId,
                        });
                        writer.write({ type: "start-step" });
                        hasStarted = true;
                      }
                      if (isReasoningStreaming) {
                        writer.write({ type: "reasoning-end", id: currentReasoningId });
                        isReasoningStreaming = false;
                      }
                      if (!isTextStreaming) {
                        currentTextId = `txt-${crypto.randomUUID()}`;
                        writer.write({ type: "text-start", id: currentTextId });
                        isTextStreaming = true;
                      }
                      writer.write({
                        type: "text-delta",
                        id: currentTextId,
                        delta: parsed.payload.text,
                      });
                    } else if (parsed.type === "text-end") {
                      if (isTextStreaming) {
                        writer.write({ type: "text-end", id: currentTextId });
                        isTextStreaming = false;
                      }
                    } else if (parsed.type === "tool-call") {
                      if (isTextStreaming) {
                        writer.write({ type: "text-end", id: currentTextId });
                        isTextStreaming = false;
                      }
                      writer.write({
                        type: "tool-input-available",
                        toolCallId: parsed.payload?.toolCallId || `tc-${crypto.randomUUID()}`,
                        toolName: parsed.payload?.toolName || "tool",
                        input: parsed.payload?.args ?? {},
                      });
                    } else if (parsed.type === "tool-result") {
                      writer.write({
                        type: "tool-output-available",
                        toolCallId: parsed.payload?.toolCallId,
                        output: parsed.payload?.result ?? parsed.payload?.output ?? {},
                      });
                    } else if (parsed.type === "step-finish") {
                      if (isTextStreaming) {
                        writer.write({ type: "text-end", id: currentTextId });
                        isTextStreaming = false;
                      }
                      writer.write({ type: "finish-step" });
                      writer.write({ type: "start-step" });
                    }
                  } catch {}
                }
              }
            } finally {
              if (hasStarted && !hasFinished) {
                if (isTextStreaming) {
                  writer.write({ type: "text-end", id: currentTextId });
                }
                if (isReasoningStreaming) {
                  writer.write({ type: "reasoning-end", id: currentReasoningId });
                }
                writer.write({ type: "finish-step" });
                writer.write({ type: "finish" });
              } else if (!hasStarted) {
                writer.write({ type: "start", messageId: defaultMsgId });
                writer.write({ type: "start-step" });
                const fallbackId = `txt-${crypto.randomUUID()}`;
                writer.write({ type: "text-start", id: fallbackId });
                writer.write({
                  type: "text-delta",
                  id: fallbackId,
                  delta: "Connected to Claw agent on Cloud Run.",
                });
                writer.write({ type: "text-end", id: fallbackId });
                writer.write({ type: "finish-step" });
                writer.write({ type: "finish" });
              }
            }
          },
        });

        return createUIMessageStreamResponse({ stream });
      }
    } catch (e) {
      console.error(
        "Cloud Run agent streaming failed, falling back to direct LLM:",
        e
      );
    }
  }

  // Fallback to direct model streaming with Claw instructions
  if (!process.env.OPENAI_API_KEY) {
    const stream = createUIMessageStream({
      originalMessages: messages,
      execute: async ({ writer }) => {
        const messageId = `msg-${crypto.randomUUID()}`;
        const textId = "fallback-text";

        writer.write({ type: "start", messageId });
        writer.write({ type: "start-step" });
        writer.write({ type: "text-start", id: textId });
        writer.write({
          type: "text-delta",
          id: textId,
          delta:
            "Connecting to Cloud Run assistant...",
        });
        writer.write({ type: "text-end", id: textId });
        writer.write({ type: "finish-step" });
        writer.write({ type: "finish" });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }

  const result = streamText({
    abortSignal: req.signal,
    model: openai("gpt-6-luna"),
    system: CLAW_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
