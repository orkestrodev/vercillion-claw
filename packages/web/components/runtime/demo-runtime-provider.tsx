"use client";

import { useMemo } from "react";
import {
  AssistantRuntimeProvider,
  AssistantCloud,
  AuiConfig,
  Tools,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { useSession } from "@/lib/auth-client";
import { assistantToolkit } from "@/lib/toolkit";

const DEFAULT_ASSISTANT_CLOUD_URL = "https://proj-0w01b4eitgke.assistant-api.com";

export function DemoRuntimeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  const cloud = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL || DEFAULT_ASSISTANT_CLOUD_URL;
    return new AssistantCloud({
      baseUrl,
      anonymous: true,
    });
  }, []);

  const config = useMemo(() => {
    return AuiConfig({
      tools: Tools({ toolkit: assistantToolkit }),
    });
  }, []);

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    cloud,
    scopeId: session?.user?.id || "default",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      {children}
    </AssistantRuntimeProvider>
  );
}
