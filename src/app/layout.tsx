import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://rankforge.shadowsinthe.space/#organization",
      name: "RankForge",
      url: "https://rankforge.shadowsinthe.space",
      logo: {
        "@type": "ImageObject",
        url: "https://rankforge.shadowsinthe.space/icon.svg",
      },
      sameAs: [
        "https://twitter.com/shadowsinthespace",
        "https://github.com/shadowsinthespace",
      ],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@shadowsinthe.space",
        contactType: "customer service",
        availableLanguage: ["German", "English"],
      },
    },
    {
      "@type": "WebSite",
      "@id": "https://rankforge.shadowsinthe.space/#website",
      url: "https://rankforge.shadowsinthe.space",
      name: "RankForge",
      publisher: { "@id": "https://rankforge.shadowsinthe.space/#organization" },
      potentialAction: {
        "@type": "SearchAction",
        target: "https://rankforge.shadowsinthe.space/audit/new?url={search_term_string}",
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "WebPage",
      "@id": "https://rankforge.shadowsinthe.space/#webpage",
      url: "https://rankforge.shadowsinthe.space",
      name: "RankForge - AI SEO Analyse",
      isPartOf: { "@id": "https://rankforge.shadowsinthe.space/#website" },
      description: "Self-hosted SEO-Analyse-Tool mit GEO-Optimierung. Unbegrenzte Audits ohne API-Kosten.",
      breadcrumb: { "@id": "https://rankforge.shadowsinthe.space/#breadcrumb" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://rankforge.shadowsinthe.space/#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://rankforge.shadowsinthe.space",
        },
      ],
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://rankforge.shadowsinthe.space/#software",
      name: "RankForge",
      url: "https://rankforge.shadowsinthe.space",
      description: "Self-hosted AI-powered SEO audit tool with GEO optimization capabilities.",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web Browser",
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Pro",
          price: "29",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
        {
          "@type": "Offer",
          name: "Agency",
          price: "99",
          priceCurrency: "EUR",
          availability: "https://schema.org/InStock",
        },
      ],
    },
  ],
};

export const metadata: Metadata = {
  title: "RankForge - AI SEO Analyse",
  description: "Self-hosted SEO-Analyse-Tool mit GEO-Optimierung. Unbegrenzte Audits ohne API-Kosten. Firecrawl + Gemini 2.0 powered.",
  keywords: ["SEO audit tool", "AI SEO analyzer", "GEO optimization", "self-hosted SEO", "technical SEO analyzer"],
  authors: [{ name: "Shadows in the Space" }],
  creator: "Shadows in the Space",
  publisher: "Shadows in the Space",
  openGraph: {
    title: "RankForge - AI SEO Analyse",
    description: "Self-hosted SEO-Analyse-Tool mit GEO-Optimierung. Unbegrenzte Audits ohne API-Kosten.",
    url: "https://rankforge.shadowsinthe.space",
    siteName: "RankForge",
    locale: "de_DE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RankForge - AI SEO Analyse",
    description: "Self-hosted SEO-Analyse-Tool mit GEO-Optimierung.",
    creator: "@shadowsinthespace",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background`}
      >
        <header className="border-b">
          <div className="container mx-auto flex items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              Rank<span className="text-primary">Forge</span>
            </Link>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">Dashboard</Link>
              <Link href="/audit/new" className="hover:text-foreground transition-colors">Neuer Audit</Link>
              <Link href="/upgrade" className="hover:text-foreground transition-colors">Upgrade</Link>
              <Link href="/profile" className="hover:text-foreground transition-colors">Profile</Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
