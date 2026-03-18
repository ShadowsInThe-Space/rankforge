"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Search } from "lucide-react";

interface Audit {
  id: string;
  domain: string;
  url: string;
  status: string;
  score: number | null;
  grade: string | null;
  pagesFound: number;
  createdAt: string;
  user: { email: string; name: string | null } | null;
}

export default function AdminAuditsPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [domain, setDomain] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(domain ? { domain } : {}),
      ...(status ? { status } : {}),
    });
    fetch(`/api/admin/audits?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setAudits(d.audits || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, domain, status]);

  async function deleteAudit(id: string) {
    if (!confirm("Audit wirklich löschen?")) return;
    const res = await fetch(`/api/admin/audits?id=${id}`, { method: "DELETE" });
    if (res.ok) setAudits((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Audits</h1>
        <p className="text-muted-foreground">
          {total} Audits insgesamt
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Input
          placeholder="Domain filtern..."
          value={domain}
          onChange={(e) => { setDomain(e.target.value); setPage(1); }}
          className="max-w-xs"
        />
        <select
          className="border rounded-md px-3 py-2 text-sm bg-background"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          <option value="">Alle Status</option>
          <option value="done">Done</option>
          <option value="error">Error</option>
          <option value="crawling">Crawling</option>
          <option value="mapping">Mapping</option>
        </select>
        <div className="text-sm text-muted-foreground ml-auto">
          Seite {page} · {total} Audits
        </div>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>←</Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>→</Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">Domain</th>
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Score</th>
                  <th className="text-left p-3 font-medium">Seiten</th>
                  <th className="text-left p-3 font-medium">Datum</th>
                  <th className="text-right p-3 font-medium">Aktion</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((audit) => (
                  <tr key={audit.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{audit.domain}</p>
                      <p className="text-muted-foreground text-xs truncate max-w-xs">{audit.url}</p>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {audit.user?.email || "—"}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          audit.status === "done"
                            ? "default"
                            : audit.status === "error"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {audit.status}
                      </Badge>
                    </td>
                    <td className="p-3 font-bold">
                      {audit.score ?? "—"}
                    </td>
                    <td className="p-3">{audit.pagesFound}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(audit.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAudit(audit.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {audits.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Keine Audits gefunden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
