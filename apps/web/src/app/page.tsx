"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Github, Zap, Lock, Search } from "lucide-react";
import { ScanForm } from "@/components/scan-form";

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScan = async (repoUrl: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ repoUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to start scan");
      }

      const data = await response.json();
      router.push(`/scan/${data.scanId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="h-12 w-12 text-primary" />
          <h1 className="text-4xl font-bold">Vibe Security Scanner</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Scan your GitHub repositories for security vulnerabilities, exposed secrets, and code issues.
          Free and open-source.
        </p>
      </div>

      {/* Scan Form */}
      <div className="w-full max-w-2xl mb-12">
        <ScanForm onSubmit={handleScan} isLoading={isLoading} error={error} />
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <FeatureCard
          icon={<Search className="h-6 w-6" />}
          title="Dependency Scanning"
          description="Find known CVEs in your npm, pip, go, and other package dependencies"
        />
        <FeatureCard
          icon={<Lock className="h-6 w-6" />}
          title="Secret Detection"
          description="Discover exposed API keys, passwords, and tokens in your codebase"
        />
        <FeatureCard
          icon={<Zap className="h-6 w-6" />}
          title="Code Analysis"
          description="Identify SQL injection, XSS, and other OWASP Top 10 vulnerabilities"
        />
      </div>

      {/* Footer */}
      <footer className="mt-16 text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center gap-2">
          <Github className="h-4 w-4" />
          Open source and privacy-first. No data is stored.
        </p>
        <p className="mt-2">
          Powered by Trivy, Gitleaks, and Semgrep
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center p-6 rounded-lg border bg-card">
      <div className="p-3 rounded-full bg-primary/10 text-primary mb-4">
        {icon}
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
