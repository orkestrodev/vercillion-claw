import { DemoRuntimeProvider } from "@/components/runtime/demo-runtime-provider";
import { ChatGPT } from "@/components/examples/chatgpt";

export default function Page() {
  return (
    <main className="h-dvh overflow-hidden">
      <DemoRuntimeProvider>
        <ChatGPT />
      </DemoRuntimeProvider>
    </main>
  );
}
