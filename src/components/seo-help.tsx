"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpItem {
  term: string;
  short: string;
  long: string;
  example?: string;
}

const helpContent: HelpItem[] = [
  {
    term: "SEO Score",
    short: "Gesamtbewertung der Website von 0-100",
    long: "Der SEO Score ist eine Gesamtbewertung deiner Website von 0 bis 100. Er setzt sich aus vielen Faktoren zusammen: technische Aspekte, Inhaltsqualität und Link-Struktur. Ein Score über 70 gilt als gut, über 90 als exzellent.",
  },
  {
    term: "Technical SEO",
    short: "Technische Grundlagen für Suchmaschinen",
    long: "Technische SEO umfasst alle technischen Aspekte, die Google dabei helfen, deine Seite zu finden und zu verstehen. Dazu gehören: Title-Tags, Meta-Descriptions, Überschriftenstruktur (H1-H6), Status-Codes, canonical Tags und Open Graph Tags. Wenn diese nicht stimmen, kann Google deine Seite nicht richtig indexieren.",
    example: "Eine fehlende Meta-Description ist ein technisches SEO-Problem.",
  },
  {
    term: "Crawling",
    short: "Google entdeckt und liest deine Seiten",
    long: "Crawling ist der Prozess, bei dem Google (und andere Suchmaschinen) automatisch deine Website durchsuchen. Sie folgen Links von einer Seite zur nächsten und sammeln dabei alle Inhalte. Wenn Seiten nicht verlinkt sind (Orphan Pages) oder durch robots.txt blockiert werden, kann Google sie nicht finden.",
  },
  {
    term: "Indexierung",
    short: "Google speichert deine Seiten in seiner Datenbank",
    long: "Nach dem Crawling entscheidet Google, welche Seiten in den Suchindex aufgenommen werden. Nur indexierte Seiten erscheinen in den Suchergebnissen. Manchmal crawlt Google eine Seite, nimmt sie aber nicht in den Index auf - das siehst du am Index Tier.",
  },
  {
    term: "Index Tier",
    short: "Vorhersage welche Seiten Google indexiert",
    long: "Basierend auf dem Google Leak 2024 sagt dieses Tool vorher, welche Seiten wahrscheinlich im Index landen. Google verwendet ein Tier-System: Tier 1 sind Seiten mit höchster Qualität (wahrscheinlich indexiert), während Tier 4-5 oft nicht indexiert werden. Faktoren: Backlinks, Content-Qualität, Date-Konsistenz.",
    example: "Eine Startseite mit vielen Links und gutem Content = wahrscheinlich Tier 1.",
  },
  {
    term: "Date Consistency",
    short: "Konsistente Datumsangaben zeigen Qualität",
    long: "Google verwendet Datumsangaben als Qualitätssignal. Wenn das Datum im Title, der Meta-Description, den Überschriften und im Content übereinstimmen, signalisiert das Google Qualität. Große Inkonsistenzen (z.B. 2023 im Title, aber 2019 im Content) können sich negativ auf Rankings auswirken.",
  },
  {
    term: "NavBoost",
    short: "Simuliert Googles User-Engagement-Signal",
    long: "NavBoost ist ein Algorithmus aus dem Google Leak 2024, der User-Engagement misst. Er bewertet: Click-Through-Rate (CTR), Verweildauer, Absprungrate (Pogo-Sticking) und ob Nutzer zu ihrer Suchanfrage zurückkehren. Hohe NavBoost-Werte bedeuten, dass Nutzer deine Seite wahrscheinlich gut finden.",
    example: "Ein Titel wie '7 bewährte SEO Tipps 2024' hat bessere CTR als nur 'SEO Tipps'.",
  },
  {
    term: "Link Tier",
    short: "Bewertet interne Verlinkungsstruktur",
    long: "Interne Links sind wie das Nervensystem deiner Website. Link Tier analysiert, wie Seiten miteinander verlinkt sind. Tier 1 Seiten haben viele eingehende Links (wichtig), während Tier 4-5 Seiten schwer zu finden sind. Gute interne Verlinkung hilft Google, alle Seiten zu finden und gewichtet sie richtig.",
  },
  {
    term: "Backlinks",
    short: "Links von anderen Websites",
    long: "Backlinks sind Links von anderen Websites zu deiner Seite. Sie sind eines der wichtigsten Ranking-Signale. Google sieht einen Backlink als 'Vertrauensvotum'. Aber nicht alle Links sind gleich: Links von relevanten, autoritären Seiten sind wertvoller als Links von Spam-Seiten.",
  },
  {
    term: "Internal Links",
    short: "Links innerhalb deiner eigenen Website",
    long: "Interne Links verbinden Seiten innerhalb deiner Website. Sie helfen Google, alle Seiten zu finden und zu verstehen, welche Seiten am wichtigsten sind. Seiten mit vielen eingehenden internen Links gelten als wichtiger.",
  },
  {
    term: "Orphan Pages",
    short: "Isolierte Seiten ohne jegliche Verlinkung",
    long: "Orphan Pages (Waisen-Seiten) sind Seiten, die von keiner anderen Seite verlinkt werden. Google kann sie nur finden, wenn sie in der Sitemap stehen. Sie haben keinen Link-Juice und werden oft übersehen.",
  },
  {
    term: "Dead Ends",
    short: "Seiten ohne ausgehende Links",
    long: "Dead Ends sind Seiten, die keine Links zu anderen Seiten haben. Nutzer bleiben dort 'stecken' und Google kann nicht weitercrawlen. Jede wichtige Seite sollte mindestens einen Link zu anderen relevanten Seiten haben.",
  },
  {
    term: "Thin Content",
    short: "Inhaltsarme Seiten mit wenig Text",
    long: "Thin Content (dünner Inhalt) sind Seiten mit sehr wenig Text (unter 300 Wörter). Google bevorzugt umfangreiche, tiefe Inhalte. Seiten mit dünnem Content werden selten gut ranken, es sei denn, sie haben sehr starke Backlinks.",
  },
  {
    term: "Title Tag",
    short: "Der Seitentitel in Suchergebnissen",
    long: "Der Title Tag ist der klickbare Titel in Google-Suchergebnissen. Er sollte 50-60 Zeichen lang sein, das Hauptkeyword enthalten und zum Klicken einladen. Er ist extrem wichtig für CTR und SEO.",
    example: "<title>SEO Agentur Berlin | Professionelle Suchmaschinenoptimierung</title>",
  },
  {
    term: "Meta Description",
    short: "Die Beschreibung unter dem Titel in Suchergebnissen",
    long: "Die Meta Description ist der Text unter dem Titel in Suchergebnissen. Sie sollte 140-160 Zeichen sein und die Seite prägnant zusammenfassen. Sie beeinflusst direkt die Klickrate (CTR).",
    example: "Ihre SEO Agentur in Berlin ✓ Mehr Traffic ✓ Höhere Rankings ✓ Kostenlose Analyse. Jetzt anfragen!",
  },
  {
    term: "H1 Überschrift",
    short: "Die Hauptüberschrift einer Seite",
    long: "Die H1 ist die Hauptüberschrift einer Seite und sollte das Hauptthema klar kommunizieren. Jede Seite sollte genau eine H1 haben, die mit dem Title Tag übereinstimmt oder ähnlich ist.",
  },
  {
    term: "Dwell Time",
    short: "Wie lange Nutzer auf deiner Seite bleiben",
    long: "Dwell Time (Verweildauer) misst, wie lange ein Nutzer auf deiner Seite bleibt, bevor er zurück zu den Suchergebnissen geht. Längere Verweildauer signalisiert Google, dass der Content hilfreich ist.",
  },
  {
    term: "Pogo-Sticking",
    short: "Nutzer springen schnell zurück zu Suchergebnissen",
    long: "Pogo-Sticking passiert, wenn ein Nutzer auf ein Suchergebnis klickt, aber sofort zurück zur Suchseite springt. Das signalisiert Google, dass die Seite nicht hilfreich war. Hohe Pogo-Sticking-Raten können Rankings verschlechtern.",
  },
  {
    term: "CTR (Click-Through-Rate)",
    short: "Wie oft klicken Nutzer auf dein Suchergebnis",
    long: "CTR misst, wie oft Nutzer auf dein Suchergebnis klicken, wenn sie es sehen. Eine hohe CTR zeigt Google, dass dein Ergebnis relevant ist. Title und Meta Description beeinflussen die CTR stark.",
  },
  {
    term: "Sitemap",
    short: "Liste aller Seiten für Google",
    long: "Eine Sitemap ist eine XML-Datei, die alle wichtigen Seiten deiner Website auflistet. Sie hilft Google, alle Seiten zu finden, besonders solche, die tief in der Navigation versteckt sind.",
  },
  {
    term: "robots.txt",
    short: "Anleitung für Suchmaschinen-Crawler",
    long: "Die robots.txt Datei sagt Google, welche Seiten es crawlen darf und welche nicht. Sie kann auch auf die Sitemap verweisen.",
    example: "User-agent: * Disallow: /admin/ Sitemap: https://example.com/sitemap.xml",
  },
  {
    term: "KI & RankForge",
    short: "Wie RankForge KI für Analysen nutzt",
    long: "RankForge verwendet Firecrawl mit Gemini (Google's KI) für die Empfehlungen. Die KI analysiert alle Audit-Daten und erstellt: ein Executive Summary, priorisierte Maßnahmen (P0/P1/P2) und einen 3-Phasen-Plan. Die Algorithmen für Index Tier, Date Consistency, NavBoost und Link Tier basieren auf dem Google Algorithm Leak 2024.",
  },
];

export function SEOHelpDialog() {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setOpen(!open)}
      >
        <HelpCircle className="h-4 w-4" />
        SEO Begriffe erklärt
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-[600px] max-h-[70vh] overflow-y-auto bg-background border rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">SEO Begriffe einfach erklärt</h3>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              ✕
            </Button>
          </div>
          <div className="space-y-3">
            {helpContent.map((item) => (
              <HelpAccordionItem key={item.term} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpAccordionItem({ item }: { item: HelpItem }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border rounded-md">
      <button
        className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-medium">{item.term}</span>
        <span className="text-sm text-muted-foreground">{item.short}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-0">
          <p className="text-sm text-muted-foreground">{item.long}</p>
          {item.example && (
            <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
              {item.example}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SEOTooltip({ term }: { term: string }) {
  const item = helpContent.find(
    (h) => h.term.toLowerCase() === term.toLowerCase()
  );

  if (!item) return null;

  return (
    <span
      className="inline-flex items-center gap-1 cursor-help text-primary underline decoration-dotted"
      title={item.long}
    >
      {term}
    </span>
  );
}
