/**
 * Severity levels for security findings
 */
export const Severity = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  INFO: "info",
} as const;

export type Severity = (typeof Severity)[keyof typeof Severity];

/**
 * Severity level ordering (higher = more severe)
 */
export const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

/**
 * Severity colors for UI
 */
export const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#dc2626", // red-600
  high: "#ea580c", // orange-600
  medium: "#ca8a04", // yellow-600
  low: "#2563eb", // blue-600
  info: "#6b7280", // gray-500
};

/**
 * Severity labels for display
 */
export const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};
