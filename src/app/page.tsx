"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useEffect, useState } from "react";

const faqData = [
  {
    question: "Was ist ein SEO-Audit und warum ist es wichtig?",
    answer: "Ein SEO-Audit ist eine vollständige Analyse Ihrer Website in Bezug auf Suchmaschinen-Optimierung. Es identifiziert technische Probleme (z.B. langsame Ladezeiten, fehlende Meta-Tags), Content-Schwächen und Link-Probleme. Ein gutes Audit zeigt genau, welche Seiten Sie zuerst optimieren sollten, um maximale Wirkung zu erzielen.",
  },
  {
    question: "Wie unterscheidet sich RankForge von Ahrefs oder Semrush?",
    answer: "RankForge ist self-hosted – Ihre Daten verlassen nie Ihren Server. Im Gegensatz zu Cloud-Tools fallen keine per-page API-Kosten an. Sie zahlen einmal für die Infrastruktur und können unbegrenzt viele Domains und Seiten auditen. Außerdem nutzt RankForge Gemini 2.0 Flash für fortschrittliche GEO/AI-Search-Optimierung, die in klassischen SEO-Tools fehlt.",
  },
  {
    question: "Was ist GEO-Optimierung (Generative Engine Optimization)?",
    answer: "GEO ist die Optimierung für AI-Suchmaschinen und AI Overviews. Während klassisches SEO auf Google-Rankings abzielt, optimiert GEO Ihre Inhalte für Perplexity, ChatGPT Search und Google AI Overviews. RankForge analysiert dafür FAQ-Strukturen, E-E-A-T-Signale, Content-Frische und semantische Vollständigkeit.",
  },
  {
    question: "Welche Website-Größe wird unterstützt?",
    answer: "Free: bis 100 Seiten pro Audit. Pro: bis 1.000 Seiten. Agency: bis 10.000 Seiten. Die Anzahl der Audits pro Monat ist nach Plan gestaffelt (5 / 50 / unbegrenzt). Jedes Audit kann eine ganze Domain vollständig crawlen.",
  },
  {
    question: "Wie funktioniert das Credit-System?",
    answer: "Jeder Plan hat ein monatliches Credit-Kontingent. Ein Audit kostet 1 Credit, unabhängig von der Seitenanzahl. Credits werden monatlich zurückgesetzt. Ungenutzte Credits verfallen nicht – sie bleiben bestehen, bis Sie sie verbrauchen.",
  },
  {
    question: "Kann ich RankForge auf meinem eigenen Server installieren?",
    answer: "Ja. RankForge läuft als Docker-Container auf jedem Server mit Docker-Unterstützung. Sie brauchen nur eine PostgreSQL-Datenbank (oder nutzen Supabase) und optional Firecrawl für erweiterte Crawling-Funktionen. Die Installation dauert unter 10 Minuten.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqData.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
};

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");

  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(faqJsonLd);
    script.id = "faq-jsonld";
    document.head.appendChild(script);
    return () => {
      const existing = document.getElementById("faq-jsonld");
      if (existing) existing.remove();
    };
  }, []);

  const proPrice = billingPeriod === "yearly" ? 17 : 29;
  const agencyPrice = billingPeriod === "yearly" ? 59 : 99;

  return (
    <div className="min-h-screen bg-background">
      {/* ─── HERO ─── */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />

        <div className="container relative mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            {/* Launch Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 text-amber-400 text-xs font-medium mb-8">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400"></span>
              </span>
              Launch Special — 40% Rabatt für Early Adopter
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Schluss mit{" "}
              <span className="text-primary">€500</span>
              <br />
              <span className="text-zinc-500">für SEO-Tools</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              RankForge ist dein gehostetes SEO-Cockpit.{" "}
              <span className="text-white font-medium">
                Wir kümmern uns um Hosting, Updates und Backups — du analysierst und wächst.
              </span>
            </p>

            {/* USP Bar */}
            <div className="flex flex-wrap justify-center gap-6 text-sm mb-8">
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Hosting inklusive
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Keine Kreditkarte nötig
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                SSL & Updates inklusive
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300 font-bold" asChild>
                <a href="/register">
                  14 Tage kostenlos testen
                  <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <a href="/audit/new">Ersten Audit starten</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── STATS BAR ─── */}
      <section className="border-y border-white/5 bg-[#050507]">
        <div className="container mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">1.200+</div>
              <div className="text-sm text-zinc-500">Aktive Nutzer</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">4.8M+</div>
              <div className="text-sm text-zinc-500">Audited Pages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">€0</div>
              <div className="text-sm text-zinc-500">Zusätzliche Kosten</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">99.9%</div>
              <div className="text-sm text-zinc-500">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="py-24 bg-[#030305]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Du zahlst <span className="text-red-400">€500+</span> pro Monat.
              <br />Für was eigentlich?
            </h2>
            <p className="text-zinc-400 text-lg">Rate Limits. Page Credits. Upsells. Versteckte API-Kosten. Das muss nicht sein.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Competitors */}
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6">
              <div className="text-red-400 text-xs font-semibold uppercase tracking-widest mb-4">Andere SEO-Tools</div>
              <ul className="space-y-3 text-sm text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  €500/Monat für 5.000 Page Credits
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  Crawl Limit erreicht — Zahle extra
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  Daten auf US-Servern Dritter
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  Warteliste für neue Features
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  Audit dauert 24+ Stunden
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">✗</span>
                  Kein GEO-Optimization Score
                </li>
              </ul>
            </div>

            {/* vs */}
            <div className="hidden md:flex col-span-1 items-center justify-center">
              <span className="text-xs uppercase tracking-widest text-zinc-600">vs.</span>
            </div>

            {/* RankForge */}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6">
              <div className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-4">RankForge</div>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                  Ab €29/Monat — Unbegrenzte Audits
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                  Keine Page Credits. Nie.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                  Hosting auf deutschen Servern
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                  Sofort neue Features
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                  Kompletter Crawl in Minuten
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-400 mt-0.5 shrink-0">✓</span>
                  GEO-Score + AI-Optimierung inkl.
                </li>
              </ul>
            </div>
          </div>

          {/* Cost Calculator */}
          <div className="mt-16 max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <h3 className="text-xl font-bold text-white mb-2">Echte Kosten, ehrliche Rechnung</h3>
            <p className="text-zinc-500 text-sm mb-6">Wenn du 20 Domains × 5 Audits/Monat crawlen willst</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-4">
                <div className="text-red-400 text-2xl font-bold">€2.400</div>
                <div className="text-zinc-500 text-xs mt-1">Semrush/Ahrefs</div>
                <div className="text-zinc-600 text-xs mt-1">(nach 12 Monaten)</div>
              </div>
              <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                <div className="text-green-400 text-2xl font-bold">€348</div>
                <div className="text-zinc-500 text-xs mt-1">RankForge Agency</div>
                <div className="text-green-400 text-xs mt-1">83% günstiger</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="py-24 bg-[#08080c]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
              Ein kompletter SEO-Stack.
              <br />
              <span className="text-zinc-500">Wir kümmern uns um den Rest.</span>
            </h2>
            <p className="text-zinc-400 text-lg">Du analysierst — wir hosten. Ohne monatliche Überraschungen.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="bg-[#0c0c12] border-white/5 hover:border-white/10 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <CardTitle className="text-white">Hosting inklusive</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  SSL-Zertifikate, tägliche Backups, Updates — alles in deinem Abo. Keine IT-Abteilung nötig.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c12] border-white/5 hover:border-white/10 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <CardTitle className="text-white">Unbegrenzte Crawls</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Keine Page Credits, keine Rate Limits. Crawle so viele Seiten wie du brauchst — jeden Monat.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c12] border-white/5 hover:border-white/10 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <CardTitle className="text-white">GEO-Score + AI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Gemini 2.0 Flash analysiert deine Content-Qualität für AI-Suchmaschinen wie Perplexity und ChatGPT Search.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c12] border-white/5 hover:border-white/10 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <CardTitle className="text-white">Link Intelligence</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Orphan Pages, Dead Ends, Crawl-Tiefe und interner Link-Graph — alles in einer Übersicht.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c12] border-white/5 hover:border-white/10 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <CardTitle className="text-white">Content Benchmarks</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Vergleiche deine Inhalte mit den Top-5 Google-Ergebnissen für deine Keywords. Weiß genau, wo du stehst.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-[#0c0c12] border-white/5 hover:border-white/10 transition-all">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <CardTitle className="text-white">Deutsche Server</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Hosting auf deutschen Servern. DSGVO-konform. Keine US-Cloud. Keine Datenweitergabe.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── CASE STUDY ─── */}
      <section className="py-24 bg-[#050507]">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium mb-4">
                ✓ Bewiesenes Ergebnis
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                IBZN.de: SEO Score 24 → 75 in einem Audit
              </h2>
            </div>

            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="grid md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-400">+212%</div>
                    <div className="text-sm text-zinc-400 mt-1">SEO Score Verbesserung</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">2 Min</div>
                    <div className="text-sm text-zinc-400 mt-1">Kompletter Audit</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-white">€0</div>
                    <div className="text-sm text-zinc-400 mt-1">Zusätzliche API-Kosten</div>
                  </div>
                </div>
                <p className="text-zinc-400 text-center mb-6">
                  RankForge fand kritische Probleme, die Ahrefs und Semrush übersehen haben — und behob sie in einem Durchgang.
                  Self-hosted bedeutet keine per-page API-Gebühren, keine Rate Limits, keine Überraschungen.
                </p>
                <div className="flex justify-center">
                  <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10" asChild>
                    <a href="/register">Jetzt selbst testen — Kostenlos</a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="py-24 bg-[#030305] border-t border-white/5" id="pricing">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Einfache, ehrliche Preise</h2>
            <p className="text-zinc-400 text-lg">Keine versteckten Kosten. Keine Page Credits. Hosting inklusive.</p>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm ${billingPeriod === "monthly" ? "text-white" : "text-zinc-500"}`}>Monatlich</span>
            <button
              onClick={() => setBillingPeriod(billingPeriod === "monthly" ? "yearly" : "monthly")}
              className={`relative w-12 h-6 rounded-full transition-colors border-0 cursor-pointer ${billingPeriod === "yearly" ? "bg-amber-400" : "bg-zinc-600"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${billingPeriod === "yearly" ? "left-[26px]" : "left-[4px]"}`} />
            </button>
            <span className={`text-sm flex items-center gap-1 ${billingPeriod === "yearly" ? "text-white" : "text-zinc-500"}`}>
              Jährlich
              {billingPeriod === "yearly" && (
                <span className="text-green-400 text-xs bg-green-400/10 px-2 py-0.5 rounded-full">-40%</span>
              )}
            </span>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <Card className="border-white/5 bg-[#0c0c12]">
              <CardHeader>
                <CardTitle className="text-white">Free</CardTitle>
                <CardDescription>Für Einsteiger zum Testen</CardDescription>
                <div className="flex items-end gap-1 mt-4">
                  <div className="text-3xl font-bold text-white">€0</div>
                  <div className="text-zinc-500 text-sm mb-1">Für immer</div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    5 Audits/Monat
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Bis 100 Seiten/Audit
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Basis SEO-Score
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    GEO-Score
                  </li>
                </ul>
                <Button className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold" asChild>
                  <a href="/register">Kostenlos starten</a>
                </Button>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-amber-400/40 bg-amber-400/[0.03] relative">
              <div className="absolute -top-3 left-6 rounded-full bg-amber-400 text-black text-xs font-bold px-3 py-0.5">
                Beliebt
              </div>
              <CardHeader>
                <CardTitle className="text-white">Pro</CardTitle>
                <CardDescription>Für SEO-Profis und Freelancer</CardDescription>
                <div className="flex items-end gap-1 mt-4">
                  <div className="text-3xl font-bold text-white">€{proPrice}</div>
                  <div className="text-zinc-500 text-sm mb-1">/Monat</div>
                </div>
                {billingPeriod === "yearly" && (
                  <div className="text-green-400 text-xs mt-1">Du sparst €144/Jahr</div>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    50 Audits/Monat
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Bis 1.000 Seiten/Audit
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Vollständiger GEO-Score
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Link Intelligence
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Content Benchmarks
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Priority Support
                  </li>
                </ul>
                <Button className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold" asChild>
                  <a href="/register">14 Tage kostenlos</a>
                </Button>
              </CardContent>
            </Card>

            {/* Agency */}
            <Card className="border-white/5 bg-[#0c0c12]">
              <CardHeader>
                <CardTitle className="text-white">Agency</CardTitle>
                <CardDescription>Für Agenturen mit vielen Clients</CardDescription>
                <div className="flex items-end gap-1 mt-4">
                  <div className="text-3xl font-bold text-white">€{agencyPrice}</div>
                  <div className="text-zinc-500 text-sm mb-1">/Monat</div>
                </div>
                {billingPeriod === "yearly" && (
                  <div className="text-green-400 text-xs mt-1">Du sparst €480/Jahr</div>
                )}
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-6 flex-1">
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unbegrenzte Audits
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Bis 50.000 Seiten/Audit
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    White-Label Reports
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Team Collaboration
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    API Access
                  </li>
                  <li className="flex items-start gap-2 text-sm text-zinc-400">
                    <svg className="w-4 h-4 text-green-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Dedicated Support
                  </li>
                </ul>
                <Button className="w-full bg-amber-400 text-black hover:bg-amber-300 font-semibold" variant="outline" asChild>
                  <a href="/register">Kontakt aufnehmen</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="py-24 bg-[#08080c] border-t border-white/5" id="faq">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold text-white text-center mb-12">
              Häufige Fragen
            </h2>
            <div className="space-y-4">
              {faqData.map((faq, i) => (
                <Card key={i} className="bg-[#0c0c12] border-white/5 overflow-hidden">
                  <button
                    className="w-full text-left"
                    onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  >
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-semibold text-white">{faq.question}</CardTitle>
                      <span className="text-zinc-500 text-xl ml-4 shrink-0">
                        {faqOpen === i ? "−" : "+"}
                      </span>
                    </CardHeader>
                  </button>
                  {faqOpen === i && (
                    <CardContent className="pt-0">
                      <p className="text-zinc-400 text-sm leading-relaxed">{faq.answer}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 bg-gradient-to-b from-[#030305] to-[#08080c]">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
            Bereit, dein SEO aufzugeben?
          </h2>
          <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
            Stop paying for API calls. Starte jetzt mit RankForge — 100% hosting inklusive, keine Kreditkarte nötig.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-amber-400 text-black hover:bg-amber-300 font-bold text-lg px-10 py-6 rounded-xl" asChild>
              <a href="/register">
                14 Tage kostenlos testen
                <svg className="ml-2 w-5 h-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-10 py-6 rounded-xl border-white/20" asChild>
              <a href="/audit/new">Ersten Audit starten</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="py-12 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="font-bold text-xl mb-4">
                Rank<span className="text-primary">Forge</span>
              </div>
              <p className="text-zinc-500 text-sm">
                Self-hosted SEO-Analyse mit GEO-Optimierung. Hosting inklusive — keine API-Kosten.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Produkt</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="#pricing" className="hover:text-white transition-colors">Preise</a></li>
                <li><a href="/audit/new" className="hover:text-white transition-colors">Audit starten</a></li>
                <li><a href="/admin" className="hover:text-white transition-colors">Dashboard</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white">Rechtliches</h4>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li><a href="https://shadowsinthe.space/impressum" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Impressum</a></li>
                <li><a href="https://shadowsinthe.space/datenschutz" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Datenschutz</a></li>
                <li><a href="https://shadowsinthe.space" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">shadowsinthe.space</a></li>
              </ul>
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-zinc-600">
            <p>© 2026 RankForge — Ein Produkt von Shadows in the Space</p>
            <div className="flex gap-4">
              <a href="https://twitter.com/shadowsinthespace" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Twitter</a>
              <a href="https://github.com/shadowsinthespace" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
