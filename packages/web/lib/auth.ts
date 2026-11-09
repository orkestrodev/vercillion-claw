import { betterAuth } from "better-auth";
import { LibsqlDialect } from "@libsql/kysely-libsql";

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
// Synchronize environment variable so Better Auth internal resolution uses the valid URL
process.env.BETTER_AUTH_URL = baseURL;

export const auth = betterAuth({
  baseURL,
  database: {
    dialect: new LibsqlDialect({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    }),
    type: "sqlite",
  },
  emailAndPassword: {
    enabled: true,
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
