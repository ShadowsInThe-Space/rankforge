"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AuditSummary {
  id: string;
  url: string;
  domain: string;
  status: string;
  score: number | null;
  pagesFound: number;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: "Wartend",
  mapping: "URL-Discovery",
  crawling: "Crawling",
  analyzing: "Analyse",
  done: "Fertig",
  error: "Fehler",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-500",
  mapping: "bg-blue-500",
  crawling: "bg-blue-500",
  analyzing: "bg-yellow-500",
  done: "bg-green-500",
  error: "bg-red-500",
};

export default function DashboardPage() {
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/audit")
      .then((res) => res.json())
      .then(setAudits)
      .finally(() => setLoading(false));
  }, []);

  // Polls für laufende Audits
  useEffect(() => {
    const hasRunning = audits.some(
      (a) => !["done", "error"].includes(a.status)
    );
    if (!hasRunning) return;

    const interval = setInterval(() => {
      fetch("/api/audit")
        .then((res) => res.json())
        .then(setAudits);
    }, 3000);

    return () => clearInterval(interval);
  }, [audits]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">SEO Audits</h1>
          <p className="text-muted-foreground mt-1">
            {audits.length} Audit{audits.length !== 1 ? "s" : ""} durchgeführt
          </p>
        </div>
        <a href="/audit/new">
          <Button>Neuer Audit</Button>
        </a>
      </div>

      {audits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground text-lg mb-4">
              Noch keine Audits vorhanden
            </p>
            <a href="/audit/new">
              <Button>Ersten Audit starten</Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {audits.map((audit) => (
            <a key={audit.id} href={`/audit/${audit.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg">{audit.domain}</CardTitle>
                  <div className="flex items-center gap-3">
                    {audit.score !== null && (
                      <span
                        className={`text-2xl font-bold ${
                          audit.score >= 70
                            ? "text-green-500"
                            : audit.score >= 40
                            ? "text-yellow-500"
                            : "text-red-500"
                        }`}
                      >
                        {audit.score}
                      </span>
                    )}
                    <Badge
                      variant="secondary"
                      className={`${statusColors[audit.status]} text-white`}
                    >
                      {statusLabels[audit.status] || audit.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{audit.url}</span>
                    <span>{audit.pagesFound} Seiten</span>
                    <span>
                      {new Date(audit.createdAt).toLocaleDateString("de-DE", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
