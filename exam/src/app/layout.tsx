import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeScript } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Azure Practice Exams",
  description: "Practice Azure certification exams with detailed explanations and progress tracking",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" }
  ],
  viewport: "width=device-width, initial-scale=1",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" />
        <ThemeScript />
      </head>
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
