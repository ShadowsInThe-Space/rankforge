"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Share2, 
  Copy, 
  Check, 
  Link2, 
  Download, 
  Mail,
  Twitter,
  Facebook,
  Loader2,
  ExternalLink,
  QrCode,
  Calendar,
  Eye,
  Lock
} from "lucide-react";

interface AuditData {
  id: string;
  url: string;
  domain: string;
  score: number | null;
  grade: string | null;
  pagesFound: number;
  createdAt: string;
  isPublic: boolean;
  shareToken: string | null;
}

interface ExportReportProps {
  audit: AuditData;
}

export function ExportReport({ audit }: ExportReportProps) {
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(audit.isPublic);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [expiryDays, setExpiryDays] = useState<"7" | "30" | "90" | "forever">("30");
  const [fullAuditData, setFullAuditData] = useState<Record<string, unknown> | null>(null);

  // Generate share URL
  useEffect(() => {
    if (audit.shareToken) {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${baseUrl}/share/${audit.shareToken}`);
    }
  }, [audit.shareToken]);

  // Fetch full audit data for export
  useEffect(() => {
    async function fetchFullAudit() {
      try {
        const res = await fetch(`/rankforge/api/audit/${audit.id}`);
        if (res.ok) {
          const data = await res.json();
          setFullAuditData(data);
        }
      } catch (err) {
        console.error("Failed to fetch audit data for export:", err);
      }
    }
    fetchFullAudit();
  }, [audit.id]);

  const handleDownloadJSON = () => {
    if (!fullAuditData) return;
    const blob = new Blob([JSON.stringify(fullAuditData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${audit.domain}-audit-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!fullAuditData) return;
    
    // Flatten key data into CSV
    const rows = [
      ["Metric", "Value"],
      ["Domain", audit.domain],
      ["URL", audit.url],
      ["Score", audit.score?.toString() ?? ""],
      ["Grade", audit.grade ?? ""],
      ["Pages Found", audit.pagesFound.toString()],
      ["Created At", audit.createdAt],
    ];
    
    // Add technical issues if available
    if (fullAuditData.technical && typeof fullAuditData.technical === "object") {
      const tech = fullAuditData.technical as Record<string, unknown>;
      if (Array.isArray(tech.issues)) {
        (tech.issues as Array<Record<string, unknown>>).forEach((issue, idx) => {
          rows.push([`Issue ${idx + 1}`, `${issue.type}: ${issue.message}`]);
        });
      }
    }
    
    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${audit.domain}-audit-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = shareUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTogglePublic = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/rankforge/api/audit/${audit.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      
      if (res.ok) {
        setIsPublic(!isPublic);
        
        // Generate token if making public for first time
        if (!isPublic && !audit.shareToken) {
          const data = await res.json();
          if (data.shareToken) {
            const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
            setShareUrl(`${baseUrl}/share/${data.shareToken}`);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update visibility:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateToken = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/rankforge/api/audit/${audit.id}/share`, {
        method: "POST",
      });
      
      if (res.ok) {
        const data = await res.json();
        const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
        setShareUrl(`${baseUrl}/share/${data.token}`);
      }
    } catch (err) {
      console.error("Failed to generate share link:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!email || !shareUrl) return;
    
    setLoading(true);
    try {
      // In real implementation, this would call an API to send email
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setEmailSent(true);
      setTimeout(() => {
        setEmailSent(false);
        setEmail("");
      }, 3000);
    } catch (err) {
      console.error("Failed to send email:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialShare = (platform: "twitter" | "facebook") => {
    const text = `Check out this SEO audit for ${audit.domain}: Score ${audit.score}/100`;
    const url = shareUrl;
    
    if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    } else {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // QR Code (simple SVG representation)
  const QRCodeSVG = ({ value }: { value: string }) => {
    // Simple placeholder - in production use a proper QR library
    return (
      <div className="w-32 h-32 bg-white border-2 border-black p-1">
        <div className="w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:4px_4px]" />
        <p className="text-xs text-center mt-1">Scan to view</p>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Export & Share Report
            <Badge variant="outline" className="ml-2 text-xs">USP Feature</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Report Summary */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Report Summary</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Domain</p>
              <p className="font-medium">{audit.domain}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Score</p>
              <p className="font-medium">{audit.score ?? "N/A"}/100 ({audit.grade ?? "-"})</p>
            </div>
            <div>
              <p className="text-muted-foreground">Pages Analyzed</p>
              <p className="font-medium">{audit.pagesFound}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Created</p>
              <p className="font-medium">{formatDate(audit.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* Share Link Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              Shareable Link
            </h4>
            <Button 
              variant={isPublic ? "default" : "outline"} 
              size="sm"
              onClick={handleTogglePublic}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isPublic ? (
                <>
                  <Eye className="w-4 h-4 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 mr-1" />
                  Private
                </>
              )}
            </Button>
          </div>
          
          {isPublic && shareUrl ? (
            <>
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={handleCopyLink}
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setShowQR(!showQR)}
                >
                  <QrCode className="w-4 h-4" />
                </Button>
              </div>
              
              {showQR && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <QRCodeSVG value={shareUrl} />
                </div>
              )}

              {/* Expiry Settings */}
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Link expires:</span>
                <select 
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value as typeof expiryDays)}
                  className="bg-muted border rounded px-2 py-1"
                >
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                  <option value="forever">Never</option>
                </select>
              </div>
            </>
          ) : (
            <div className="text-center py-4 bg-muted/20 rounded-lg">
              <p className="text-muted-foreground mb-3">
                {isPublic ? "Generating link..." : "Make public to generate share link"}
              </p>
              {!isPublic && (
                <Button onClick={handleGenerateToken} disabled={loading}>
                  <Link2 className="w-4 h-4 mr-2" />
                  Generate Link
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Share Options */}
        {shareUrl && (
          <div className="space-y-3">
            <h4 className="font-medium">Share Options</h4>
            
            {/* Email */}
            <div className="flex gap-2">
              <Input 
                type="email"
                placeholder="Send to email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button 
                onClick={handleSendEmail}
                disabled={!email || loading || emailSent}
              >
                {emailSent ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            {/* Social Buttons */}
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleSocialShare("twitter")}
              >
                <Twitter className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => handleSocialShare("facebook")}
              >
                <Facebook className="w-4 h-4 mr-2" />
                Facebook
              </Button>
            </div>
          </div>
        )}

        {/* Download Options */}
        <div className="space-y-3 pt-4 border-t">
          <h4 className="font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Download Report
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="w-full" onClick={handleDownloadJSON} disabled={!fullAuditData}>
              <Download className="w-4 h-4 mr-2" />
              JSON Export
            </Button>
            <Button variant="outline" className="w-full" onClick={handleDownloadCSV} disabled={!fullAuditData}>
              <Download className="w-4 h-4 mr-2" />
              CSV Data
            </Button>
            <Button variant="outline" className="w-full col-span-2" disabled>
              <Download className="w-4 h-4 mr-2" />
              PDF Report (Coming Soon)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ExportReport;
