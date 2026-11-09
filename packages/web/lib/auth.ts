import { betterAuth } from "better-auth";
import { createClient } from "@libsql/client/web";
import { LibsqlDialect } from "@libsql/kysely-libsql";
import { sendEmail, generatePasswordResetEmail } from "./email";

const FALLBACK_TURSO_URL = "libsql://vextral-vextralai.aws-eu-central-1.turso.io";
const FALLBACK_TURSO_TOKEN =
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQyNDQ0NTYsImlkIjoiMDFhMTliZTktNDMwMS03NWViLTllYzYtYjAxMjQzNzVlYjZiIiwia2lkIjoiVS1RZ1FtM3VVVzN0OTVTOVp3X29XaHp0Z1l2blIwM0pPdXhfTlhzZHEzRSIsInJpZCI6IjA1MTU4NjZjLTFmY2EtNGZkNi1hZmEyLTExMzI1ZDEyMDUwNCJ9.UFpHVPFzJg0BFnf4ym1TtNn70QZ0s1zMpMTrzfE-Zt8w4O5P9O1kxSchHW5Y9pRrKRldv1aepwoNBEUM1atPCg";

function cleanString(val: string | undefined): string | undefined {
  if (!val) return undefined;
  let s = val.trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

function resolveTursoUrl(): string {
  const raw = cleanString(process.env.TURSO_DATABASE_URL);
  if (!raw || raw.includes("<") || raw.includes(">")) {
    return FALLBACK_TURSO_URL;
  }
  return raw;
}

function resolveTursoToken(): string {
  const raw = cleanString(process.env.TURSO_AUTH_TOKEN);
  if (!raw || raw.length < 100 || raw.includes("...")) {
    return FALLBACK_TURSO_TOKEN;
  }
  const match = raw.match(/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/);
  return match ? match[0] : raw;
}

export const tursoUrl = resolveTursoUrl();
export const tursoToken = resolveTursoToken();

const client = createClient({
  url: tursoUrl,
  authToken: tursoToken,
});

function resolveBaseURL(): string {
  let url = cleanString(process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL);

  if (url && (url.includes("<") || url.includes(">"))) {
    url = undefined;
  }

  if (!url) {
    if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
      url = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
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

const baseURL = resolveBaseURL();
process.env.BETTER_AUTH_URL = baseURL;

export const auth = betterAuth({
  baseURL,
  secret:
    cleanString(process.env.BETTER_AUTH_SECRET) ||
    "7d85fa9f142a6fe79a007602d60c97368312362e81e8a0cfba5240503e1fbe27",
  database: {
    dialect: new LibsqlDialect({
      client: client as any,
    }),
    type: "sqlite",
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword(data) {
      console.log(`[AUTH] Password reset requested for ${data.user.email}. Reset URL: ${data.url}`);
      try {
        const { html, text, subject } = generatePasswordResetEmail({
          resetUrl: data.url,
          userEmail: data.user.email,
        });
        const result = await sendEmail({
          to: data.user.email,
          subject,
          html,
          text,
        });
        if (!result.success) {
          console.warn(`[AUTH] Resend email delivery notice for ${data.user.email}: ${result.error}`);
        } else {
          console.log(`[AUTH] Password reset email delivered successfully via Resend to ${data.user.email}`);
        }
      } catch (err: any) {
        console.error(`[AUTH] Error sending password reset email:`, err?.message || err);
      }
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    baseURL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "",
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "",
  ].filter(Boolean),
});
