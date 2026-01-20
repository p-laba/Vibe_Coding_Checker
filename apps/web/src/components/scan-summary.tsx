"use client";

import type { ScanSummary as ScanSummaryType } from "@vibe/shared/types";
import { formatDuration, cn } from "@/lib/utils";
import { AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react";

interface ScanSummaryProps {
  summary: ScanSummaryType;
}

export function ScanSummary({ summary }: ScanSummaryProps) {
  const severityItems = [
    {
      key: "critical",
      label: "Critical",
      count: summary.bySeverity.critical,
      color: "text-red-600 bg-red-50",
      icon: AlertTriangle,
    },
    {
      key: "high",
      label: "High",
      count: summary.bySeverity.high,
      color: "text-orange-600 bg-orange-50",
      icon: AlertTriangle,
    },
    {
      key: "medium",
      label: "Medium",
      count: summary.bySeverity.medium,
      color: "text-yellow-600 bg-yellow-50",
      icon: AlertCircle,
    },
    {
      key: "low",
      label: "Low",
      count: summary.bySeverity.low,
      color: "text-blue-600 bg-blue-50",
      icon: Info,
    },
  ];

  const typeItems = [
    {
      key: "vulnerability",
      label: "Dependency Vulnerabilities",
      count: summary.byType.vulnerability,
    },
    {
      key: "secret",
      label: "Exposed Secrets",
      count: summary.byType.secret,
    },
    {
      key: "sast",
      label: "Code Issues",
      count: summary.byType.sast,
    },
  ];

  const hasCriticalOrHigh =
    summary.bySeverity.critical > 0 || summary.bySeverity.high > 0;

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div
        className={cn(
          "p-6 rounded-lg border",
          hasCriticalOrHigh
            ? "border-red-200 bg-red-50"
            : summary.totalFindings > 0
              ? "border-yellow-200 bg-yellow-50"
              : "border-green-200 bg-green-50"
        )}
      >
        <div className="flex items-center gap-4">
          {hasCriticalOrHigh ? (
            <AlertTriangle className="h-8 w-8 text-red-600" />
          ) : summary.totalFindings > 0 ? (
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          ) : (
            <CheckCircle className="h-8 w-8 text-green-600" />
          )}
          <div>
            <h2 className="text-xl font-semibold">
              {hasCriticalOrHigh
                ? "Critical Issues Found"
                : summary.totalFindings > 0
                  ? "Issues Found"
                  : "No Issues Found"}
            </h2>
            <p className="text-muted-foreground">
              {summary.totalFindings} total findings in{" "}
              {formatDuration(summary.duration)}
            </p>
          </div>
        </div>
      </div>

      {/* Severity Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {severityItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className={cn("p-4 rounded-lg", item.color)}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{item.label}</span>
              </div>
              <p className="text-2xl font-bold">{item.count}</p>
            </div>
          );
        })}
      </div>

      {/* Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {typeItems.map((item) => (
          <div
            key={item.key}
            className="p-4 rounded-lg border bg-card"
          >
            <p className="text-sm text-muted-foreground mb-1">{item.label}</p>
            <p className="text-xl font-bold">{item.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
