import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoArena - Competitive Coding Platform",
  description: "AI-Enhanced Competitive Coding Workspace",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
