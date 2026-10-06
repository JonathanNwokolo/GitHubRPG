import type { Metadata } from "next";
import { Press_Start_2P, Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { DocumentLanguage } from "@/components/layout/DocumentLanguage";
import { resolveDataSourceKind } from "@/data/datasource";
import { buildRootMetadata } from "@/lib/seo";

const pixelFont = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-pixel",
  display: "swap",
});

const sansFont = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/** The data source is chosen by a runtime env var, so the layout cannot be prerendered at build time. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isDemo = resolveDataSourceKind() === "mock";

  return (
    <html lang="pt-BR" className={`${pixelFont.variable} ${sansFont.variable} dark`}>
      <body className="flex flex-col min-h-screen bg-rpg-void text-rpg-parchment font-sans antialiased overflow-x-hidden">
        <DocumentLanguage />
        <Navbar isDemo={isDemo} />
        <main className="flex-1 flex flex-col w-full">{children}</main>
        <Footer isDemo={isDemo} />
      </body>
    </html>
  );
}
