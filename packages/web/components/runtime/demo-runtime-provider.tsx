"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";

export function DemoRuntimeProvider({ children }: { children: React.ReactNode }) {
  const cloud = useMemo(() => {
    const baseUrl = process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;
    if (!baseUrl) return undefined;
    return new AssistantCloud({
      baseUrl,
      anonymous: true,
    });
  }, []);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    cloud,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
