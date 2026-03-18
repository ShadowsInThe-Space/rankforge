"use client";
import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Zap, Building2, RefreshCw } from "lucide-react";
import Link from "next/link";

interface CreditsInfo {
  credits: number;
  creditsPerMonth: number;
  subscriptionTier: string;
  isUnlimited: boolean;
}

interface User {
  id: string;
  email: string;
  name: string | null;
  subscriptionStatus: string | null;
  subscriptionTier: string;
}

function ProfilePageInner() {
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const searchParams = useSearchParams();
  const success = searchParams.get("upgrade") === "success";

  useEffect(() => {
    // Load user info from localStorage (set on login)
    const stored = localStorage.getItem("rf_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch { /* ignore */ }
    }

    fetch("/api/billing/credits")
      .then((r) => r.json())
      .then((d) => { setCredits(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Portal nicht verfügbar.");
      }
    } catch {
      alert("Fehler beim Öffnen des Billing Portals.");
    } finally {
      setPortalLoading(false);
    }
  }

  function tierIcon(tier: string) {
    switch (tier) {
      case "PRO":
        return <Zap className="w-5 h-5 text-blue-500" />;
      case "ENTERPRISE":
        return <Building2 className="w-5 h-5 text-purple-500" />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/audit" className="text-xl font-bold">
            Rank<span className="text-primary">Forge</span>
          </Link>
          <Link href="/audit">
            <Button variant="outline" size="sm">← Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-10 max-w-2xl space-y-6">
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-center">
            ✅ Upgrade erfolgreich! Viel Spaß mit deinen neuen Credits.
          </div>
        )}

        <h1 className="text-3xl font-bold">Profile & Billing</h1>

        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{user?.email || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{user?.name || "—"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {tierIcon(credits?.subscriptionTier || "FREE")}
              {credits?.subscriptionTier === "FREE"
                ? "Free Plan"
                : credits?.subscriptionTier === "PRO"
                ? "Pro Plan"
                : credits?.subscriptionTier === "ENTERPRISE"
                ? "Enterprise Plan"
                : "Subscription"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Credits */}
            {!loading && credits ? (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Credits diesen Monat</span>
                  <span className={credits.credits <= 0 ? "text-red-500 font-bold" : ""}>
                    {credits.isUnlimited ? "∞ Unbegrenzt" : `${credits.credits} von ${credits.creditsPerMonth}`}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      credits.credits <= 0
                        ? "bg-red-500"
                        : credits.credits <= credits.creditsPerMonth * 0.3
                        ? "bg-yellow-500"
                        : "bg-primary"
                    }`}
                    style={{
                      width: credits.isUnlimited
                        ? "100%"
                        : `${Math.max(0, (credits.credits / credits.creditsPerMonth) * 100)}%`,
                    }}
                  />
                </div>
                {credits.credits <= 0 && (
                  <p className="text-sm text-red-500 mt-2">
                    Keine Credits mehr.{" "}
                    <Link href="/upgrade" className="underline">
                      Jetzt upgraden →
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <div className="h-3 bg-muted rounded-full animate-pulse" />
            )}

            {/* Subscription Status */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge
                variant={
                  credits?.subscriptionTier === "FREE"
                    ? "secondary"
                    : user?.subscriptionStatus === "active"
                    ? "default"
                    : "destructive"
                }
              >
                {credits?.subscriptionTier === "FREE"
                  ? "Free"
                  : user?.subscriptionStatus === "active"
                  ? "Aktiv"
                  : user?.subscriptionStatus === "past_due"
                  ? "Zahlung ausstehend"
                  : user?.subscriptionStatus === "canceled"
                  ? "Gekündigt"
                  : "—"}
              </Badge>
            </div>

            {/* Billing Portal */}
            {credits?.subscriptionTier !== "FREE" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4 mr-2" />
                )}
                {portalLoading ? "Öffne Portal..." : "Abo verwalten / kündigen"}
              </Button>
            )}

            {/* Upgrade CTA */}
            {credits?.subscriptionTier === "FREE" && (
              <Link href="/upgrade">
                <Button className="w-full">
                  <Zap className="w-4 h-4 mr-2" />
                  Upgrade auf Pro
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
      <ProfilePageInner />
    </Suspense>
  );
}
