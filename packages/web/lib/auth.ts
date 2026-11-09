import { betterAuth } from "better-auth";
import { createClient } from "@libsql/client/web";
import { LibsqlDialect } from "@libsql/kysely-libsql";

const TURSO_URL =
  process.env.TURSO_DATABASE_URL ||
  "libsql://vextral-vextralai.aws-eu-central-1.turso.io";

const TURSO_TOKEN =
  process.env.TURSO_AUTH_TOKEN ||
  "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTQyNDQ0NTYsImlkIjoiMDFhMTliZTktNDMwMS03NWViLTllYzYtYjAxMjQzNzVlYjZiIiwia2lkIjoiVS1RZ1FtM3VVVzN0OTVTOVp3X29XaHp0Z1l2blIwM0pPdXhfTlhzZHEzRSIsInJpZCI6IjA1MTU4NjZjLTFmY2EtNGZkNi1hZmEyLTExMzI1ZDEyMDUwNCJ9.UFpHVPFzJg0BFnf4ym1TtNn70QZ0s1zMpMTrzfE-Zt8w4O5P9O1kxSchHW5Y9pRrKRldv1aepwoNBEUM1atPCg";

const client = createClient({
  url: TURSO_URL,
  authToken: TURSO_TOKEN,
});

function resolveBaseURL(): string {
  let url = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

  // Sanitize placeholder values (e.g. angle brackets like <your-project>)
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
    process.env.BETTER_AUTH_SECRET ||
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
