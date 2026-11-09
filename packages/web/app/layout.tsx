import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vercillion Claw",
  description: "Autonomous personal assistant operated by Vercillion Claw.",
  icons: {
    icon: "/favicon/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
