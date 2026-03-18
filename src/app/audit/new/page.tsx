"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NewAuditPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function startAudit() {
    if (!url.trim()) {
      setError("Bitte eine URL eingeben");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          keywords: keywords
            .split(",")
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        let errorMsg = "Fehler beim Starten";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      router.push(`/audit/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Neuer SEO Audit</h1>

      <Card>
        <CardHeader>
          <CardTitle>Website analysieren</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Website URL
            </label>
            <Input
              type="text"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && startAudit()}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Die gesamte Domain wird gecrawlt (max. 100 Seiten)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Target Keywords (optional)
            </label>
            <Input
              type="text"
              placeholder="SEO Agentur, Webdesign Berlin, ..."
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              disabled={loading}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Kommagetrennt - für Content-Benchmark gegen Top-5 Ergebnisse
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-md">
              {error}
            </div>
          )}

          <Button
            onClick={startAudit}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Audit wird gestartet...
              </span>
            ) : (
              "Audit starten"
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="py-6">
          <h3 className="font-medium mb-3">Was wird analysiert?</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium text-primary">Technical SEO</p>
              <p className="text-muted-foreground">
                Title, Meta, Headings, Status Codes, Canonical, OG Tags
              </p>
            </div>
            <div>
              <p className="font-medium text-primary">Link-Struktur</p>
              <p className="text-muted-foreground">
                Orphan Pages, Dead Ends, Crawl-Tiefe, Link-Graph
              </p>
            </div>
            <div>
              <p className="font-medium text-primary">Content Intelligence</p>
              <p className="text-muted-foreground">
                Word Count, Heading-Qualität, Content-Benchmark, Thin Content
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
