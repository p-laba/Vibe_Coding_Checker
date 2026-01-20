"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Shield, AlertTriangle, RefreshCw } from "lucide-react";
import { useScanStore } from "@/lib/store";
import { useWebSocket } from "@/hooks/use-websocket";
import { ScanProgress } from "@/components/scan-progress";
import { FindingsList } from "@/components/findings-list";
import { ScanSummary } from "@/components/scan-summary";
import { cn } from "@/lib/utils";

export default function ScanPage() {
  const params = useParams();
  const scanId = params.scanId as string;

  const { status, findings, summary, error, reset } = useScanStore();
  const { connect, disconnect, isConnected } = useWebSocket(scanId);

  useEffect(() => {
    reset();
    connect();

    return () => {
      disconnect();
    };
  }, [scanId, connect, disconnect, reset]);

  const isCompleted = status === "completed";
  const isFailed = status === "failed";
  const isScanning = !isCompleted && !isFailed;

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          New Scan
        </Link>

        <div className="flex items-center gap-3 mt-4">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Security Scan</h1>
            <p className="text-sm text-muted-foreground font-mono">{scanId}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Error State */}
        {isFailed && error && (
          <div className="mb-8 p-6 rounded-lg border border-destructive bg-destructive/10">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-destructive mb-2">
                  Scan Failed
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                  {error.message}
                </p>
                <Link
                  href="/"
                  className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-md",
                    "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {isScanning && (
          <div className="mb-8">
            <ScanProgress />
          </div>
        )}

        {/* Summary */}
        {isCompleted && summary && (
          <div className="mb-8">
            <ScanSummary summary={summary} />
          </div>
        )}

        {/* Findings */}
        {findings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">
              Findings ({findings.length})
            </h2>
            <FindingsList findings={findings} />
          </div>
        )}

        {/* No Findings */}
        {isCompleted && findings.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No Issues Found</h2>
            <p className="text-muted-foreground">
              Great news! No security vulnerabilities were detected in this repository.
            </p>
          </div>
        )}

        {/* Connection Status */}
        <div className="fixed bottom-4 right-4">
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
              isConnected
                ? "bg-green-100 text-green-700"
                : "bg-yellow-100 text-yellow-700"
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
              )}
            />
            {isConnected ? "Connected" : "Connecting..."}
          </div>
        </div>
      </div>
    </div>
  );
}
