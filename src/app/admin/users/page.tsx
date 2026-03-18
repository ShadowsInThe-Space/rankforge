"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Shield, User } from "lucide-react";

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  credits: number;
  creditsPerMonth: number;
  subscriptionTier: string;
  subscriptionStatus: string | null;
  auditCount: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      ...(search ? { search } : {}),
    });
    fetch(`/api/admin/users?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setUsers(d.users || []);
        setTotal(d.total || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search]);

  async function deleteUser(id: string) {
    if (!confirm("User wirklich löschen? Alle Audits werden gelöscht.")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) setUsers((u) => u.filter((x) => x.id !== id));
  }

  async function changeRole(id: string, role: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, role } : x)));
  }

  async function resetCredits(id: string) {
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits: 3 }),
    });
    setUsers((u) => u.map((x) => (x.id === id ? { ...x, credits: 3 } : x)));
  }

  function tierBadge(tier: string) {
    switch (tier) {
      case "PRO":
        return <Badge className="bg-blue-500">Pro</Badge>;
      case "ENTERPRISE":
        return <Badge className="bg-purple-500">Enterprise</Badge>;
      default:
        return <Badge variant="secondary">Free</Badge>;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          {total} User registriert
        </p>
      </div>

      {/* Search + Pagination */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Email durchsuchen..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-sm"
        />
        <div className="text-sm text-muted-foreground ml-auto">
          Seite {page} von {Math.ceil(total / 20)}
        </div>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          ←
        </Button>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={page * 20 >= total}>
          →
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium">User</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Tier</th>
                  <th className="text-left p-3 font-medium">Credits</th>
                  <th className="text-left p-3 font-medium">Audits</th>
                  <th className="text-left p-3 font-medium">Erstellt</th>
                  <th className="text-right p-3 font-medium">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30">
                    <td className="p-3">
                      <p className="font-medium">{user.email}</p>
                      {user.name && <p className="text-muted-foreground text-xs">{user.name}</p>}
                    </td>
                    <td className="p-3">
                      <select
                        className="border rounded-md px-2 py-1 text-sm bg-background"
                        value={user.role}
                        onChange={(e) => changeRole(user.id, e.target.value)}
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="p-3">{tierBadge(user.subscriptionTier)}</td>
                    <td className="p-3">
                      <span className={user.credits <= 0 ? "text-red-500 font-bold" : ""}>
                        {user.credits === -1 ? "∞" : user.credits}
                      </span>
                      <span className="text-muted-foreground text-xs"> / {user.creditsPerMonth}</span>
                    </td>
                    <td className="p-3">{user.auditCount}</td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString("de-DE")}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetCredits(user.id)}
                          title="Credits zurücksetzen"
                          className="text-xs"
                        >
                          Reset
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Keine User gefunden.
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
