import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AlgoArena — Competitive Coding Platform",
  description:
    "Master algorithms and ace coding interviews with real-time code execution, AI-powered hints, and a VS Code–inspired editor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to set theme before first paint to avoid flash */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('algoarena-theme') || 'one-dark';
                  document.documentElement.setAttribute('data-theme', t);
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
