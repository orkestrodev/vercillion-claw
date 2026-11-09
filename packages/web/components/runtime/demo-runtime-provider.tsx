"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";

const DEFAULT_ASSISTANT_CLOUD_URL = "https://proj-0w01b4eitgke.assistant-api.com";

export function DemoRuntimeProvider({ children }: { children: React.ReactNode }) {
  const cloud = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL || DEFAULT_ASSISTANT_CLOUD_URL;
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
