"use client";

import { useState } from "react";
import { Github, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanFormProps {
  onSubmit: (repoUrl: string) => void;
  isLoading: boolean;
  error: string | null;
}

export function ScanForm({ onSubmit, isLoading, error }: ScanFormProps) {
  const [url, setUrl] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const validateUrl = (input: string): boolean => {
    const githubPattern = /^https:\/\/github\.com\/[\w-]+\/[\w.-]+\/?$/;
    return githubPattern.test(input);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setValidationError("Please enter a GitHub repository URL");
      return;
    }

    if (!validateUrl(trimmedUrl)) {
      setValidationError(
        "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)"
      );
      return;
    }

    onSubmit(trimmedUrl);
  };

  const displayError = validationError || error;

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
            <Github className="h-5 w-5" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setValidationError(null);
            }}
            placeholder="https://github.com/owner/repository"
            disabled={isLoading}
            className={cn(
              "w-full pl-12 pr-4 py-4 text-lg rounded-lg border bg-background",
              "focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              displayError && "border-destructive focus:ring-destructive"
            )}
          />
        </div>

        {displayError && (
          <p className="text-sm text-destructive px-1">{displayError}</p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className={cn(
            "flex items-center justify-center gap-2 w-full py-4 px-6",
            "bg-primary text-primary-foreground rounded-lg font-medium text-lg",
            "hover:bg-primary/90 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Starting scan...
            </>
          ) : (
            <>
              Scan Repository
              <ArrowRight className="h-5 w-5" />
            </>
          )}
        </button>
      </div>

      <p className="text-center text-sm text-muted-foreground mt-4">
        Only public repositories can be scanned. Results are not stored.
      </p>
    </form>
  );
}
