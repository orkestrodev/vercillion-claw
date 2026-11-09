import { auth, tursoUrl, tursoToken } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handlers = toNextJsHandler(auth);

export async function GET(request: Request) {
  try {
    return await handlers.GET(request);
  } catch (error: any) {
    console.error("[AUTH_API_GET_ERROR]", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Internal Server Error",
        url: tursoUrl,
        tokenLength: tursoToken?.length,
        tokenPrefix: tursoToken?.slice(0, 12),
        tokenSuffix: tursoToken?.slice(-8),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    return await handlers.POST(request);
  } catch (error: any) {
    console.error("[AUTH_API_POST_ERROR]", error);
    return new Response(
      JSON.stringify({
        error: error?.message || "Internal Server Error",
        url: tursoUrl,
        tokenLength: tursoToken?.length,
        tokenPrefix: tursoToken?.slice(0, 12),
        tokenSuffix: tursoToken?.slice(-8),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
