"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { 
  Document, 
  Page, 
  Text, 
  View, 
  StyleSheet, 
  PDFDownloadLink,
  Font
} from "@react-pdf/renderer";
import { 
  Download, 
  FileText, 
  Loader2, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  ExternalLink
} from "lucide-react";
import type { Recommendation, Priority } from "./grade-components";

// Register a font for PDF
const registerFont = () => {
  try {
    Font.register({
      family: 'Helvetica',
      fonts: [
        { src: 'Helvetica', fontWeight: 'normal' },
        { src: 'Helvetica-Bold', fontWeight: 'bold' }
      ]
    });
  } catch (e) {
    // Font already registered or not available
  }
};

registerFont();

const pdfStyles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff'
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
    paddingBottom: 10
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1f2937'
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15
  },
  scoreBox: {
    width: '23%',
    padding: 10,
    borderRadius: 4,
    alignItems: 'center'
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  scoreLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2
  },
  categoryRow: {
    flexDirection: 'row',
    marginBottom: 8,
    padding: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 4
  },
  categoryName: {
    flex: 1,
    fontSize: 10
  },
  categoryScore: {
    fontSize: 10,
    fontWeight: 'bold',
    width: 40,
    textAlign: 'right'
  },
  recommendation: {
    marginBottom: 10,
    padding: 10,
    borderLeftWidth: 3,
    backgroundColor: '#f9fafb'
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4
  },
  recTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    flex: 1
  },
  priorityBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    color: '#ffffff',
    overflow: 'hidden'
  },
  recDescription: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 4
  },
  recFix: {
    fontSize: 9,
    color: '#1f2937',
    backgroundColor: '#e5e7eb',
    padding: 6,
    borderRadius: 2
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af'
  },
  pageNumber: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    color: '#9ca3af'
  }
});

interface PDFReportData {
  title: string;
  url: string;
  score: number;
  grade: string;
  pagesAnalyzed: number;
  categories: Array<{
    name: string;
    score: number;
    status: string;
  }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: Priority["level"];
    impact: string;
    effort: string;
    category: string;
    fix?: string;
  }>;
  generatedAt: string;
}

interface PDFReportProps {
  data: PDFReportData;
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case "high": return '#ef4444';
    case "medium": return '#eab308';
    case "low": return '#22c55e';
    default: return '#6b7280';
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "good": return '#22c55e';
    case "warning": return '#eab308';
    case "critical": return '#ef4444';
    default: return '#6b7280';
  }
};

const PDFReportDocument = ({ data }: PDFReportProps) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      {/* Header */}
      <View style={pdfStyles.header}>
        <Text style={pdfStyles.title}>{data.title}</Text>
        <Text style={pdfStyles.subtitle}>{data.url}</Text>
        <Text style={pdfStyles.subtitle}>{data.pagesAnalyzed} pages analyzed • Generated {new Date(data.generatedAt).toLocaleDateString()}</Text>
      </View>

      {/* Score Overview */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Score Overview</Text>
        <View style={pdfStyles.scoreRow}>
          <View style={[pdfStyles.scoreBox, { backgroundColor: getStatusColor(data.categories.find(c => c.name === 'Technical')?.status || 'good') + '20' }]}>
            <Text style={[pdfStyles.scoreValue, { color: getStatusColor(data.categories.find(c => c.name === 'Technical')?.status || 'good') }]}>
              {data.categories.find(c => c.name === 'Technical')?.score || 0}
            </Text>
            <Text style={pdfStyles.scoreLabel}>Technical</Text>
          </View>
          <View style={[pdfStyles.scoreBox, { backgroundColor: getStatusColor(data.categories.find(c => c.name === 'Content')?.status || 'good') + '20' }]}>
            <Text style={[pdfStyles.scoreValue, { color: getStatusColor(data.categories.find(c => c.name === 'Content')?.status || 'good') }]}>
              {data.categories.find(c => c.name === 'Content')?.score || 0}
            </Text>
            <Text style={pdfStyles.scoreLabel}>Content</Text>
          </View>
          <View style={[pdfStyles.scoreBox, { backgroundColor: getStatusColor(data.categories.find(c => c.name === 'Links')?.status || 'good') + '20' }]}>
            <Text style={pdfStyles.scoreValue}>
              {data.categories.find(c => c.name === 'Links')?.score || 0}
            </Text>
            <Text style={pdfStyles.scoreLabel}>Links</Text>
          </View>
          <View style={[pdfStyles.scoreBox, { backgroundColor: getStatusColor(data.categories.find(c => c.name === 'Performance')?.status || 'good') + '20' }]}>
            <Text style={[pdfStyles.scoreValue, { color: getStatusColor(data.categories.find(c => c.name === 'Performance')?.status || 'good') }]}>
              {data.categories.find(c => c.name === 'Performance')?.score || 0}
            </Text>
            <Text style={pdfStyles.scoreLabel}>Performance</Text>
          </View>
        </View>
      </View>

      {/* Category Breakdown */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Category Breakdown</Text>
        {data.categories.map((cat, index) => (
          <View key={index} style={pdfStyles.categoryRow}>
            <Text style={pdfStyles.categoryName}>{cat.name}</Text>
            <Text style={[pdfStyles.categoryScore, { color: getStatusColor(cat.status) }]}>{cat.score}/100</Text>
          </View>
        ))}
      </View>

      {/* Top Recommendations */}
      <View style={pdfStyles.section}>
        <Text style={pdfStyles.sectionTitle}>Top Recommendations</Text>
        {data.recommendations.slice(0, 15).map((rec, index) => (
          <View 
            key={index} 
            style={[
              pdfStyles.recommendation, 
              { borderLeftColor: getPriorityColor(rec.priority) }
            ]}
          >
            <View style={pdfStyles.recHeader}>
              <Text style={pdfStyles.recTitle}>{rec.title}</Text>
              <Text style={[pdfStyles.priorityBadge, { backgroundColor: getPriorityColor(rec.priority) }]}>
                {rec.priority.toUpperCase()}
              </Text>
            </View>
            <Text style={pdfStyles.recDescription}>{rec.description}</Text>
            {rec.fix && (
              <Text style={pdfStyles.recFix}>Fix: {rec.fix}</Text>
            )}
            <Text style={{ fontSize: 8, color: '#9ca3af', marginTop: 4 }}>
              Impact: {rec.impact} • Effort: {rec.effort} • Category: {rec.category}
            </Text>
          </View>
        ))}
      </View>

      {/* Footer */}
      <Text style={pdfStyles.footer}>
        Generated by RankForge SEO Tool • {new Date(data.generatedAt).toLocaleString()}
      </Text>
      <Text style={pdfStyles.pageNumber} render={({ pageNumber, totalPages }) => (
        `${pageNumber} / ${totalPages}`
      )} fixed />
    </Page>
  </Document>
);

interface PDFExportButtonProps {
  data: PDFReportData;
  filename?: string;
}

export function PDFExportButton({ data, filename }: PDFExportButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const defaultFilename = `rankforge-report-${data.title.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

  return (
    <PDFDownloadLink
      document={<PDFReportDocument data={data} />}
      fileName={filename || defaultFilename}
      onLoad={() => setIsReady(true)}
    >
      {({ loading }) => (
        <Button disabled={!isReady && loading} variant="outline" size="sm">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  );
}

// Hook for easy PDF data preparation
export function usePDFExport(auditData: {
  domain: string;
  url: string;
  score: number | null;
  pagesFound: number;
  categories: Array<{ name: string; score: number; status: string }>;
  recommendations: Array<{
    title: string;
    description: string;
    priority: Priority["level"];
    impact: string;
    effort: string;
    category: string;
    fix?: string;
  }>;
}) {
  const getGradeFromScore = (score: number): string => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };

  const pdfData: PDFReportData = {
    title: auditData.domain,
    url: auditData.url,
    score: auditData.score || 0,
    grade: getGradeFromScore(auditData.score || 0),
    pagesAnalyzed: auditData.pagesFound,
    categories: auditData.categories,
    recommendations: auditData.recommendations,
    generatedAt: new Date().toISOString(),
  };

  return { pdfData };
}
