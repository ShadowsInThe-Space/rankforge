"use client";

import { Suspense } from "react";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Building2, CreditCard } from "lucide-react";
import Link from "next/link";

interface CreditsInfo {
  credits: number;
  creditsPerMonth: number;
  subscriptionTier: string;
  isUnlimited: boolean;
}

const tiers = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    credits: 3,
    description: "Perfect to get started",
    features: [
      "3 SEO Audits / Monat",
      "Basic Technical SEO",
      "PDF Export",
      "Email Support",
    ],
    highlight: false,
    stripeTier: null,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 29,
    credits: 30,
    description: "For agencies and growing businesses",
    features: [
      "30 SEO Audits / Monat",
      "Full SEO Analysis + AI Recommendations",
      "Audit Comparison (Before/After)",
      "Priority Processing",
      "Email Support",
    ],
    highlight: true,
    stripeTier: "PRO",
  },
  {
    id: "ENTERPRISE",
    name: "Enterprise",
    price: 99,
    credits: -1,
    description: "Unlimited power for large teams",
    features: [
      "Unlimited SEO Audits",
      "Everything in Pro",
      "API Access",
      "Bulk Audits",
      "Dedicated Support",
      "Custom Integrations",
    ],
    highlight: false,
    stripeTier: "ENTERPRISE",
  },
];

function UpgradePageInner() {
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutTier, setCheckoutTier] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const success = searchParams.get("upgrade") === "success";
  const canceled = searchParams.get("canceled") === "true";

  useEffect(() => {
    fetch("/api/billing/credits")
      .then((r) => r.json())
      .then((d) => { setCredits(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCheckout(tier: string) {
    if (tier === "FREE") return;
    setCheckoutTier(tier);
    try {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout fehlgeschlagen. Bitte einloggen.");
      }
    } catch {
      alert("Fehler beim Starten des Checkouts.");
    } finally {
      setCheckoutTier(null);
    }
  }

  const currentTier = credits?.subscriptionTier || "FREE";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/audit" className="text-xl font-bold">
            Rank<span className="text-primary">Forge</span>
          </Link>
          <div className="flex items-center gap-4">
            {!loading && credits && (
              <span className="text-sm text-muted-foreground">
                {credits.isUnlimited
                  ? "∞ Credits"
                  : `${credits.credits} / ${credits.creditsPerMonth} Credits`}
              </span>
            )}
            <Link href="/profile">
              <Button variant="outline" size="sm">Profile</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-5xl">
        {/* Success / Canceled banners */}
        {success && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-500 text-center">
            ✅ Upgrade erfolgreich! Deine Credits wurden aktualisiert.
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-muted rounded-lg text-center text-muted-foreground">
            Checkout abgebrochen. Keine Sorge, du kannst es jederzeit nochmal versuchen.
          </div>
        )}

        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold mb-3">Wähle deinen Plan</h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Starte kostenlos und upgraden wenn du mehr brauchst. Keine versteckten Kosten.
          </p>
          {!loading && currentTier !== "FREE" && (
            <Badge className="mt-3 bg-primary">
              Dein aktueller Plan: {currentTier}
            </Badge>
          )}
        </div>

        {/* Current Usage */}
        {!loading && credits && (
          <div className="mb-10 max-w-md mx-auto">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Credits diesen Monat</span>
              <span className={credits.credits <= 0 ? "text-red-500 font-bold" : ""}>
                {credits.isUnlimited ? "∞" : `${credits.credits} von ${credits.creditsPerMonth}`}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
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
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => {
            const isCurrent = tier.id === currentTier;
            const isUpgrade = tier.price > (tiers.find((t) => t.id === currentTier)?.price || 0);

            return (
              <Card
                key={tier.id}
                className={`relative ${tier.highlight ? "border-primary shadow-lg" : ""}`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary">Beliebt</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    {tier.id === "PRO" && <Zap className="w-5 h-5 text-primary" />}
                    {tier.id === "ENTERPRISE" && <Building2 className="w-5 h-5 text-purple-500" />}
                    {tier.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-4xl font-bold">{tier.price}€</span>
                    <span className="text-muted-foreground">/Monat</span>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {tier.credits === -1
                      ? "Unlimited Audits"
                      : `${tier.credits} Audits / Monat`}
                  </p>

                  <ul className="space-y-2">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <Button variant="secondary" className="w-full" disabled>
                      Aktueller Plan
                    </Button>
                  ) : tier.id === "FREE" ? (
                    <Button variant="outline" className="w-full" disabled>
                      Free Plan
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      variant={tier.highlight ? "default" : "outline"}
                      onClick={() => handleCheckout(tier.id)}
                      disabled={checkoutTier !== null}
                    >
                      {checkoutTier === tier.id ? (
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          {isUpgrade ? "Upgraden" : "Downgraden"}
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div>
            <h3 className="font-semibold mb-2">Was sind Credits?</h3>
            <p className="text-sm text-muted-foreground">
              Jeder SEO Audit kostet 1 Credit. Credits werden monatlich zurückgesetzt.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Kann ich jederzeit kündigen?</h3>
            <p className="text-sm text-muted-foreground">
              Ja. Du kannst über den Stripe Customer Portal kündigen oder downgraden — jederzeit und ohne Risiko.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Was passiert mit meinen Audits wenn ich downgrade?</h3>
            <p className="text-sm text-muted-foreground">
              Alle deine Audits bleiben erhalten. Du hast nur keine neuen Credits mehr bis du upgradest.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Welche Zahlungsmethoden werden akzeptiert?</h3>
            <p className="text-sm text-muted-foreground">
              Alle gängigen Kreditkarten (Visa, Mastercard, AMEX) werden über Stripe akzeptiert.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>}>
      <UpgradePageInner />
    </Suspense>
  );
}
