"use client";

import { useScanStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, Circle } from "lucide-react";

export function ScanProgress() {
  const { progress, scannerProgress } = useScanStore();

  const phases = [
    { key: "cloning", label: "Cloning Repository" },
    { key: "scanning", label: "Running Security Scanners" },
    { key: "finalizing", label: "Generating Report" },
  ];

  const scanners = [
    { key: "trivy", label: "Trivy", description: "Dependencies & Secrets" },
    { key: "gitleaks", label: "Gitleaks", description: "Secret Detection" },
    { key: "semgrep", label: "Semgrep", description: "Code Analysis" },
  ];

  const currentPhaseIndex = phases.findIndex(
    (p) => p.key === progress?.phase
  );

  return (
    <div className="space-y-8">
      {/* Phase Progress */}
      <div className="space-y-4">
        <h3 className="font-medium">Progress</h3>
        <div className="flex items-center gap-2">
          {phases.map((phase, index) => {
            const isActive = phase.key === progress?.phase;
            const isComplete = index < currentPhaseIndex;

            return (
              <div key={phase.key} className="flex items-center gap-2 flex-1">
                <div
                  className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full border-2",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isActive && "border-primary text-primary",
                    !isComplete && !isActive && "border-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : isActive ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isActive && "text-primary",
                      !isComplete && !isActive && "text-muted-foreground"
                    )}
                  >
                    {phase.label}
                  </p>
                </div>
                {index < phases.length - 1 && (
                  <div
                    className={cn(
                      "h-0.5 w-8",
                      isComplete ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {progress?.message && (
          <p className="text-sm text-muted-foreground">{progress.message}</p>
        )}
      </div>

      {/* Scanner Progress */}
      {progress?.phase === "scanning" && (
        <div className="space-y-4">
          <h3 className="font-medium">Scanners</h3>
          <div className="grid gap-4">
            {scanners.map((scanner) => {
              const status =
                scannerProgress[scanner.key as keyof typeof scannerProgress];

              return (
                <div
                  key={scanner.key}
                  className="flex items-center gap-4 p-4 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{scanner.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {scanner.description}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all duration-300",
                          status.status === "completed"
                            ? "bg-green-500"
                            : status.status === "running"
                              ? "bg-primary"
                              : "bg-muted-foreground"
                        )}
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <ScannerStatus status={status.status} />
                    {status.findings > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {status.findings} findings
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function ScannerStatus({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <span className="text-sm text-muted-foreground">Waiting</span>;
    case "running":
      return (
        <span className="text-sm text-primary flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Running
        </span>
      );
    case "completed":
      return (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Done
        </span>
      );
    default:
      return null;
  }
}
