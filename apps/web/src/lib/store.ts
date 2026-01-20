import { create } from "zustand";
import type {
  Finding,
  ScanSummary,
  WSEvent,
} from "@vibe/shared/types";
import type { ScanStatus } from "@vibe/shared/constants";

interface ScanProgress {
  phase: "cloning" | "scanning" | "finalizing";
  progress: number;
  message: string;
}

interface ScanError {
  code: string;
  message: string;
}

interface ScanState {
  status: ScanStatus | "connecting" | "connected";
  progress: ScanProgress | null;
  findings: Finding[];
  summary: ScanSummary | null;
  error: ScanError | null;

  // Scanner-specific progress
  scannerProgress: {
    trivy: { status: string; progress: number; findings: number };
    gitleaks: { status: string; progress: number; findings: number };
    semgrep: { status: string; progress: number; findings: number };
  };

  // Actions
  setStatus: (status: ScanStatus | "connecting" | "connected") => void;
  setProgress: (progress: ScanProgress) => void;
  addFinding: (finding: Finding) => void;
  setSummary: (summary: ScanSummary) => void;
  setError: (error: ScanError) => void;
  updateScannerProgress: (scanner: string, status: string, progress: number, findings: number) => void;
  handleEvent: (event: WSEvent) => void;
  reset: () => void;
}

const initialScannerProgress = {
  trivy: { status: "pending", progress: 0, findings: 0 },
  gitleaks: { status: "pending", progress: 0, findings: 0 },
  semgrep: { status: "pending", progress: 0, findings: 0 },
};

export const useScanStore = create<ScanState>((set, get) => ({
  status: "connecting",
  progress: null,
  findings: [],
  summary: null,
  error: null,
  scannerProgress: { ...initialScannerProgress },

  setStatus: (status) => set({ status }),

  setProgress: (progress) => set({ progress }),

  addFinding: (finding) =>
    set((state) => ({
      findings: [...state.findings, finding],
    })),

  setSummary: (summary) => set({ summary }),

  setError: (error) => set({ error, status: "failed" }),

  updateScannerProgress: (scanner, status, progress, findings) =>
    set((state) => ({
      scannerProgress: {
        ...state.scannerProgress,
        [scanner]: { status, progress, findings },
      },
    })),

  handleEvent: (event) => {
    const state = get();

    switch (event.type) {
      case "connected":
        state.setStatus("connected");
        break;

      case "scan:started":
        state.setStatus("scanning");
        break;

      case "scan:progress":
        state.setProgress(event.data);
        break;

      case "scanner:started":
        state.updateScannerProgress(event.data.scanner, "running", 0, 0);
        break;

      case "scanner:progress":
        state.updateScannerProgress(
          event.data.scanner,
          "running",
          event.data.progress,
          state.scannerProgress[event.data.scanner as keyof typeof state.scannerProgress]?.findings ?? 0
        );
        break;

      case "scanner:finding":
        state.addFinding(event.data.finding);
        const scanner = event.data.scanner as keyof typeof state.scannerProgress;
        const current = state.scannerProgress[scanner];
        if (current) {
          state.updateScannerProgress(
            event.data.scanner,
            current.status,
            current.progress,
            current.findings + 1
          );
        }
        break;

      case "scanner:completed":
        state.updateScannerProgress(
          event.data.scanner,
          "completed",
          100,
          event.data.findingsCount
        );
        break;

      case "scan:completed":
        state.setSummary(event.data.summary);
        state.setStatus("completed");
        break;

      case "scan:failed":
        state.setError(event.data.error);
        break;

      case "error":
        state.setError(event.data);
        break;
    }
  },

  reset: () =>
    set({
      status: "connecting",
      progress: null,
      findings: [],
      summary: null,
      error: null,
      scannerProgress: { ...initialScannerProgress },
    }),
}));
