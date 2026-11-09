"use client";

import { createAuthClient } from "better-auth/react";

function getClientBaseURL(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  let url = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL;
  if (url && (url.includes("<") || url.includes(">"))) {
    url = undefined;
  }
  if (!url) {
    if (process.env.NEXT_PUBLIC_VERCEL_URL) {
      url = `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
    } else if (process.env.VERCEL_URL) {
      url = `https://${process.env.VERCEL_URL}`;
    } else {
      url = "http://localhost:3000";
    }
  }
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  return url.replace(/\/$/, "");
}

export const authClient = createAuthClient({
  baseURL: getClientBaseURL(),
});

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  requestPasswordReset,
  resetPassword,
  sendVerificationEmail,
} = authClient;


