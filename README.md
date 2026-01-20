# Vibe Security Scanner

A free, open-source web application that scans public GitHub repositories for security vulnerabilities. Perfect for indie developers and "vibe-coded" projects.

## Features

- **Dependency Scanning** (Trivy) - Detects vulnerable packages in your dependencies
- **Secret Detection** (Trivy + Gitleaks) - Finds exposed API keys, passwords, and tokens
- **Static Analysis** (Semgrep) - Identifies code security issues using OWASP rules
- **Real-time Results** - WebSocket streaming shows findings as they're discovered
- **Privacy First** - No data stored, ephemeral results only

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 19, Tailwind CSS, Zustand |
| Backend | Fastify 5, BullMQ, Redis |
| Scanners | Trivy, Gitleaks, Semgrep |
| Monorepo | Turborepo, pnpm |

## Architecture

```
┌──────────────────┐         ┌──────────────────┐
│    FRONTEND      │         │   API SERVER     │
│   (Next.js)      │ ──────► │   (Fastify)      │
│                  │         │                  │
│ • Scan form      │         │ • BullMQ jobs    │
│ • Real-time UI   │◄─WSS────│ • Redis pub/sub  │
│ • Results view   │         │ • Scanner exec   │
└──────────────────┘         └──────────────────┘
```

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm 9+
- Redis (local or Upstash)
- Docker (for running scanners)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/vibe-security-scanner.git
cd vibe-security-scanner

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start Redis (using Docker)
docker compose -f docker/docker-compose.dev.yml up redis -d

# Start development servers
pnpm dev
```

The frontend will be available at `http://localhost:3000` and the API at `http://localhost:5000`.

### Environment Variables

```bash
# API (.env in apps/api)
PORT=5000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:3000
SCAN_TIMEOUT_MS=300000
MAX_REPO_SIZE_MB=500

# Frontend (.env.local in apps/web)
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=ws://localhost:5000
```

## Project Structure

```
vibe-security-scanner/
├── apps/
│   ├── api/                # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/     # API endpoints
│   │   │   ├── services/   # Business logic
│   │   │   ├── scanners/   # Scanner implementations
│   │   │   └── workers/    # BullMQ workers
│   │   └── Dockerfile
│   └── web/                # Next.js frontend
│       ├── src/
│       │   ├── app/        # App Router pages
│       │   ├── components/ # React components
│       │   ├── hooks/      # Custom hooks
│       │   └── lib/        # Utilities
│       └── vercel.json
├── packages/
│   └── shared/             # Shared types & schemas
├── docker/
│   └── docker-compose.dev.yml
└── turbo.json
```

## Scripts

```bash
# Development
pnpm dev          # Start all apps in development mode
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm type-check   # Type check all packages

# Individual apps
pnpm --filter @vibe/api dev    # Start API only
pnpm --filter @vibe/web dev    # Start frontend only
```

## Deployment

### Frontend (Vercel)

1. Connect your repository to Vercel
2. Set the root directory to `apps/web`
3. Configure environment variables:
   - `NEXT_PUBLIC_API_URL` - Your API URL
   - `NEXT_PUBLIC_WS_URL` - Your WebSocket URL

### Backend (Railway)

1. Create a new Railway project
2. Add a Redis service
3. Deploy from the Dockerfile at `apps/api/Dockerfile`
4. Configure environment variables:
   - `REDIS_URL` - Railway Redis URL
   - `ALLOWED_ORIGINS` - Your frontend URL

## Security

- All scans run in isolated Docker containers
- Containers have no network access during scanning
- Memory and CPU limits enforced
- Temporary directories cleaned after each scan
- Rate limiting: 5 scans per hour per IP

## Supported Languages

Semgrep rules cover 10+ languages including:
- JavaScript / TypeScript
- Python
- Java
- Go
- Ruby
- PHP
- C / C++
- Rust
- Kotlin
- Swift

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
