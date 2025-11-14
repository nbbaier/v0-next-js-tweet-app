# CLAUDE.md

## Project Overview

This is a Next.js tweet app that automatically syncs with [v0.app](https://v0.app) deployments. The application displays and manages tweets with a modern, responsive UI.

## Tech Stack

-  **Framework**: Next.js 16.0.0 (App Router)
-  **React**: 19.2.0
-  **TypeScript**: 5.x
-  **Styling**: Tailwind CSS 4.x
-  **UI Components**: Radix UI
-  **Code Quality**: Biome (linting & formatting)
-  **Database**: Upstash Redis (for caching)
-  **Deployment**: Vercel

## Project Structure

\`\`\`
/home/user/v0-next-js-tweet-app/
├── app/ # Next.js app directory
│ ├── layout.tsx # Root layout with theme provider
│ └── page.tsx # Home page with tweet feed
├── components/ # React components
│ ├── theme-provider.tsx # Dark/light theme support
│ ├── tweet-feed-header.tsx
│ └── tweet-list.tsx # Main tweet display component
├── lib/ # Utility functions and services
│ ├── utils.ts # Helper functions
│ ├── tweet-cache.ts # Redis caching logic
│ ├── tweet-config.ts # Tweet configuration
│ └── tweet-service.ts # Tweet data service
├── public/ # Static assets
├── styles/ # Global styles
└── .vscode/ # VS Code settings

\`\`\`

## Key Features

-  Server-side rendered tweet feed
-  Dark/light theme support
-  Redis caching for performance
-  Responsive design with Tailwind CSS
-  Type-safe with TypeScript

## Development Commands

\`\`\`bash

# Install dependencies

pnpm install

# Run development server

pnpm dev

# Build for production

pnpm build

# Start production server

pnpm start

# Lint code

pnpm lint
\`\`\`

## Important Notes

### v0.app Sync

-  This repository auto-syncs with v0.app deployments
-  Changes from v0.app are automatically pushed to this repo
-  Continue building at: https://v0.app/chat/g3irQjK6slk

### Environment Variables

-  Check `.gitignore` - `.env` files are excluded
-  Configure environment variables in Vercel or create `.env.local`
-  Likely needed: Upstash Redis credentials for caching

### Code Quality

-  Uses Biome for linting and formatting (see `biome.json`)
-  Run `pnpm lint` before committing

### Styling

-  Uses Tailwind CSS 4.x with PostCSS
-  Theme configuration in `app/layout.tsx`
-  Custom animations via `tailwindcss-animate`

## Working with This Codebase

### Adding New Features

1. Components go in `/components`
2. Utility functions in `/lib`
3. Pages/routes in `/app`
4. Follow existing patterns for consistency

### Tweet Management

-  Tweet service: `lib/tweet-service.ts`
-  Caching: `lib/tweet-cache.ts` (Redis-based)
-  Configuration: `lib/tweet-config.ts`

### Styling Guidelines

-  Use Tailwind utility classes
-  Dark mode support via `next-themes`
-  Radix UI for accessible components

## Deployment

-  Deployed on Vercel: https://vercel.com/nbbaiers-projects/v0-next-js-tweet-app
-  Production branch syncs automatically
-  Environment variables managed in Vercel dashboard
