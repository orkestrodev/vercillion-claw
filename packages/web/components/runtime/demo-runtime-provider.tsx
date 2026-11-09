"use client";

import { useMemo } from "react";
import { AssistantRuntimeProvider, AssistantCloud } from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { useSession } from "@/lib/auth-client";

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

  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    cloud,
    scopeId: session?.user?.id || "default",
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
