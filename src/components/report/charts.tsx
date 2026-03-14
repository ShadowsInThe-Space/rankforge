"use client";

import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#22c55e", "#eab308", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"];

// ─────────────────────────────────────────────────────────────
// Radar Chart - Category Comparison
// ─────────────────────────────────────────────────────────────

interface RadarDataPoint {
  category: string;
  score: number;
  fullMark: number;
}

interface CategoryRadarProps {
  data: RadarDataPoint[];
  title?: string;
}

export function CategoryRadar({ data, title = "SEO Category Analysis" }: CategoryRadarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={data}>
            <PolarGrid stroke="#374151" />
            <PolarAngleAxis 
              dataKey="category" 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: "#9ca3af", fontSize: 10 }}
            />
            <Radar
              name="Score"
              dataKey="score"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Bar Chart - Score Comparison
// ─────────────────────────────────────────────────────────────

interface BarDataPoint {
  name: string;
  score: number;
}

interface ScoreBarChartProps {
  data: BarDataPoint[];
  title?: string;
  color?: string;
}

export function ScoreBarChart({ 
  data, 
  title = "Scores",
  color = "#3b82f6"
}: ScoreBarChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              type="number" 
              domain={[0, 100]} 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis 
              type="category" 
              dataKey="name" 
              width={100}
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#1f2937", 
                border: "none", 
                borderRadius: 8,
                color: "#fff"
              }}
            />
            <Bar dataKey="score" fill={color} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Pie Chart - Issue Distribution
// ─────────────────────────────────────────────────────────────

interface PieDataPoint {
  name: string;
  value: number;
}

interface IssuePieChartProps {
  data: PieDataPoint[];
  title?: string;
  colors?: string[];
}

export function IssuePieChart({ 
  data, 
  title = "Issue Distribution",
  colors = COLORS
}: IssuePieChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={{ stroke: "#9ca3af" }}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#1f2937", 
                border: "none", 
                borderRadius: 8,
                color: "#fff"
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Area Chart - Score Trend
// ─────────────────────────────────────────────────────────────

interface TrendDataPoint {
  date: string;
  score: number;
}

interface ScoreTrendChartProps {
  data: TrendDataPoint[];
  title?: string;
}

export function ScoreTrendChart({ 
  data, 
  title = "Score Over Time"
}: ScoreTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis 
              domain={[0, 100]} 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#1f2937", 
                border: "none", 
                borderRadius: 8,
                color: "#fff"
              }}
            />
            <Area 
              type="monotone" 
              dataKey="score" 
              stroke="#3b82f6" 
              fillOpacity={1} 
              fill="url(#scoreGradient)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Issue Severity Breakdown
// ─────────────────────────────────────────────────────────────

interface SeverityData {
  name: string;
  value: number;
  color: string;
}

interface SeverityChartProps {
  data: SeverityData[];
  title?: string;
}

export function SeverityChart({ 
  data, 
  title = "Issues by Severity"
}: SeverityChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#1f2937", 
                border: "none", 
                borderRadius: 8,
                color: "#fff"
              }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Page Score Distribution
// ─────────────────────────────────────────────────────────────

interface PageScoreData {
  range: string;
  count: number;
}

interface PageScoreDistributionProps {
  data: PageScoreData[];
  title?: string;
}

export function PageScoreDistribution({ 
  data, 
  title = "Page Score Distribution"
}: PageScoreDistributionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="range" 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <YAxis 
              tick={{ fill: "#9ca3af", fontSize: 12 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: "#1f2937", 
                border: "none", 
                borderRadius: 8,
                color: "#fff"
              }}
            />
            <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
