import { DemoRuntimeProvider } from "@/components/runtime/demo-runtime-provider";
import { ChatGPT } from "@/components/examples/chatgpt";
import { AuthGate } from "@/components/auth/auth-gate";

export default function Page() {
  return (
    <main className="h-dvh overflow-hidden">
      <AuthGate>
        <DemoRuntimeProvider>
          <ChatGPT />
        </DemoRuntimeProvider>
      </AuthGate>
    </main>
  );
}
