import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeScript } from "@/contexts/ThemeContext";

export const metadata: Metadata = {
  title: "Azure Practice Exams",
  description: "Practice Azure certification exams with detailed explanations and progress tracking",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1f2937" }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
