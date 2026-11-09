import { openai } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
} from "ai";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agentBaseUrl = process.env.AGENT_BASE_URL;

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
            const defaultTextId = `txt-${crypto.randomUUID()}`;
            let hasStarted = false;
            let hasFinished = false;

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
                      writer.write({ type: "text-end", id: defaultTextId });
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
                        writer.write({ type: "text-start", id: defaultTextId });
                        hasStarted = true;
                      }
                    } else if (
                      parsed.type === "text-delta" &&
                      parsed.payload?.text
                    ) {
                      if (!hasStarted) {
                        writer.write({
                          type: "start",
                          messageId: defaultMsgId,
                        });
                        writer.write({ type: "start-step" });
                        writer.write({ type: "text-start", id: defaultTextId });
                        hasStarted = true;
                      }
                      writer.write({
                        type: "text-delta",
                        id: defaultTextId,
                        delta: parsed.payload.text,
                      });
                    }
                  } catch {}
                }
              }
            } finally {
              if (hasStarted && !hasFinished) {
                writer.write({ type: "text-end", id: defaultTextId });
                writer.write({ type: "finish-step" });
                writer.write({ type: "finish" });
              } else if (!hasStarted) {
                writer.write({ type: "start", messageId: defaultMsgId });
                writer.write({ type: "start-step" });
                writer.write({ type: "text-start", id: defaultTextId });
                writer.write({
                  type: "text-delta",
                  id: defaultTextId,
                  delta: "Connected to Claw agent on Cloud Run.",
                });
                writer.write({ type: "text-end", id: defaultTextId });
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

  // Fallback to direct model streaming if AGENT_BASE_URL is not configured or fails
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
            "This starter is running without AGENT_BASE_URL or OPENAI_API_KEY. Configure AGENT_BASE_URL to connect your live Cloud Run assistant.",
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
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
