# Sentinel - Setup Guide

This guide walks you through setting up the Sentinel web dashboard for local development and production deployment.

## Prerequisites

- **Node.js** 18.17 or later
- **pnpm** 8.0+ (recommended) or npm/yarn
- **Sentinel Selfbot** backend running and accessible

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/sonixaep/sentinel-web.git
cd sentinel-web
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment

Create a `.env.local` file in the project root:

```env
# Sentinel API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001

# Optional: API authentication key
NEXT_PUBLIC_API_KEY=your-api-key-here
```

### 4. Start Development Server

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Base URL of the Sentinel Selfbot API |
| `NEXT_PUBLIC_API_KEY` | No | - | API key for authenticated requests |

## Backend Requirements

Ensure the Sentinel Selfbot backend is running and configured to accept connections from the web dashboard.

### Required Backend Endpoints

The web dashboard expects the following API endpoints to be available:

```
GET  /api/targets                    # List tracked targets
GET  /api/targets/:userId            # Get target details
POST /api/targets                    # Add new target
DELETE /api/targets/:userId          # Remove target

GET  /api/targets/:userId/events     # Target event history
GET  /api/targets/:userId/timeline   # Presence timeline
GET  /api/targets/:userId/messages   # Message logs
GET  /api/targets/:userId/analytics  # Analytics data
GET  /api/targets/:userId/insights   # Behavioral insights
GET  /api/targets/:userId/profiles   # Profile history

GET  /api/alerts                     # List alerts
POST /api/alerts                     # Create alert
PUT  /api/alerts/:id                 # Update alert
DELETE /api/alerts/:id               # Delete alert

GET  /api/events/stream              # SSE event stream
GET  /api/health                     # Health check
```

### CORS Configuration

Configure the backend to allow requests from the web dashboard origin:

```javascript
// Example Express.js CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://your-domain.com'],
  credentials: true,
}));
```

## Development

### Project Scripts

```bash
# Start development server with hot reload
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Type check
pnpm type-check
```

### Code Structure

```
lib/
├── api.ts        # API client - modify endpoints here
├── types.ts      # TypeScript types - update for API changes
├── context.tsx   # React context - global state management
├── hooks.ts      # Custom hooks - data fetching logic
└── utils.ts      # Utility functions

components/
├── ui/           # Reusable UI primitives
├── charts/       # Data visualization components
├── dashboard/    # Dashboard-specific components
└── layout/       # Layout components (sidebar, header)

app/
├── page.tsx              # Dashboard home
├── targets/[userId]/     # Target detail pages
├── alerts/               # Alert management
└── settings/             # Application settings
```

### Adding New Features

1. **New API endpoint**: Add the method to `lib/api.ts`
2. **New data type**: Add TypeScript interface to `lib/types.ts`
3. **New page**: Create under `app/` directory following Next.js App Router conventions
4. **New component**: Add to appropriate folder under `components/`

## Production Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Self-Hosted

```bash
# Build the application
pnpm build

# Start production server
pnpm start
```

For production, use a process manager like PM2:

```bash
pm2 start npm --name "sentinel" -- start
```

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
```

Build and run:

```bash
docker build -t sentinel-web .
docker run -p 3000:3000 -e NEXT_PUBLIC_API_URL=http://api:3001 sentinel-web
```

## Troubleshooting

### Connection Issues

**Problem**: Dashboard shows "Disconnected" or "Connection Failed"

**Solutions**:
1. Verify `NEXT_PUBLIC_API_URL` is correct
2. Check if the backend is running
3. Verify CORS is configured on the backend
4. Check browser console for specific error messages

### SSE Not Working

**Problem**: Live feed not updating in real-time

**Solutions**:
1. Ensure `/api/events/stream` endpoint returns proper SSE headers
2. Check if firewalls/proxies are blocking long-lived connections
3. Verify the backend is emitting events correctly

### Build Errors

**Problem**: TypeScript or build errors

**Solutions**:
1. Run `pnpm type-check` to identify type issues
2. Ensure all dependencies are installed: `pnpm install`
3. Clear `.next` cache: `rm -rf .next && pnpm build`

## Support

For issues and feature requests, please open an issue on the GitHub repository.
