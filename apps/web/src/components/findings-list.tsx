"use client";

import { useState } from "react";
import type { Finding } from "@vibe/shared/types";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Key,
  Code,
  ExternalLink,
  FileCode,
} from "lucide-react";

interface FindingsListProps {
  findings: Finding[];
}

export function FindingsList({ findings }: FindingsListProps) {
  const [filter, setFilter] = useState<string>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const filteredFindings = findings.filter((f) => {
    if (filter === "all") return true;
    if (filter === "critical") return f.severity === "critical";
    if (filter === "high") return f.severity === "high";
    return f.type === filter;
  });

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["all", "critical", "high", "vulnerability", "secret", "sast"].map(
          (f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-full border transition-colors",
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "hover:bg-muted"
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          )
        )}
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {filteredFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isExpanded={expandedIds.has(finding.id)}
            onToggle={() => toggleExpanded(finding.id)}
          />
        ))}

        {filteredFindings.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No findings match the selected filter.
          </p>
        )}
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  isExpanded,
  onToggle,
}: {
  finding: Finding;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const Icon = finding.type === "vulnerability"
    ? AlertTriangle
    : finding.type === "secret"
      ? Key
      : Code;

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className={cn("p-1.5 rounded", getSeverityBgColor(finding.severity))}>
          <Icon className={cn("h-4 w-4", getSeverityTextColor(finding.severity))} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <SeverityBadge severity={finding.severity} />
            <span className="font-medium truncate">{getTitle(finding)}</span>
          </div>
          <p className="text-sm text-muted-foreground truncate">
            {getLocation(finding)}
          </p>
        </div>
      </button>

      {/* Details */}
      {isExpanded && (
        <div className="border-t p-4 bg-muted/30 space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium mb-1">Description</h4>
            <p className="text-sm text-muted-foreground">
              {getDescription(finding)}
            </p>
          </div>

          {/* Location */}
          <div>
            <h4 className="text-sm font-medium mb-1">Location</h4>
            <div className="flex items-center gap-2 text-sm">
              <FileCode className="h-4 w-4 text-muted-foreground" />
              <code className="px-2 py-1 rounded bg-muted font-mono">
                {getLocation(finding)}
              </code>
            </div>
          </div>

          {/* Code snippet for SAST findings */}
          {finding.type === "sast" && finding.code && (
            <div>
              <h4 className="text-sm font-medium mb-1">Code</h4>
              <pre className="p-3 rounded bg-muted overflow-x-auto text-sm font-mono">
                {finding.code}
              </pre>
            </div>
          )}

          {/* Fix suggestion */}
          {finding.type === "sast" && finding.fix && (
            <div>
              <h4 className="text-sm font-medium mb-1">Suggested Fix</h4>
              <pre className="p-3 rounded bg-green-50 border border-green-200 overflow-x-auto text-sm font-mono text-green-800">
                {finding.fix}
              </pre>
            </div>
          )}

          {/* References */}
          {getReferences(finding).length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-1">References</h4>
              <ul className="space-y-1">
                {getReferences(finding).slice(0, 3).map((ref, i) => (
                  <li key={i}>
                    <a
                      href={ref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1"
                    >
                      {ref}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className={cn(
        "px-2 py-0.5 text-xs font-medium rounded-full uppercase",
        getSeverityBgColor(severity),
        getSeverityTextColor(severity)
      )}
    >
      {severity}
    </span>
  );
}

function getSeverityBgColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "bg-red-100";
    case "high":
      return "bg-orange-100";
    case "medium":
      return "bg-yellow-100";
    case "low":
      return "bg-blue-100";
    default:
      return "bg-gray-100";
  }
}

function getSeverityTextColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-red-700";
    case "high":
      return "text-orange-700";
    case "medium":
      return "text-yellow-700";
    case "low":
      return "text-blue-700";
    default:
      return "text-gray-700";
  }
}

function getTitle(finding: Finding): string {
  if (finding.type === "vulnerability") {
    return finding.title || finding.cveId;
  }
  if (finding.type === "secret") {
    return finding.description;
  }
  return finding.title;
}

function getDescription(finding: Finding): string {
  if (finding.type === "vulnerability") {
    return finding.description;
  }
  if (finding.type === "secret") {
    return `Detected ${finding.secretType} in ${finding.file}`;
  }
  return finding.message;
}

function getLocation(finding: Finding): string {
  if (finding.type === "vulnerability") {
    return `${finding.package.name}@${finding.package.version}`;
  }
  if (finding.type === "secret") {
    return `${finding.file}:${finding.line}`;
  }
  return `${finding.file}:${finding.startLine}`;
}

function getReferences(finding: Finding): string[] {
  if (finding.type === "vulnerability") {
    return finding.references;
  }
  if (finding.type === "sast") {
    return finding.references;
  }
  return [];
}
