# Design Canvas

A collaborative design canvas application built with Next.js 15, featuring real-time multiplayer functionality and comprehensive UI components.

## MVP Requirements (24 Hours)

This is a hard gate. To pass the MVP checkpoint, you must have:

- [x] Basic canvas with pan/zoom
- [x] At least one shape type (rectangle, circle, or text)
- [x] Ability to create and move objects
- [ ] Real-time sync between 2+ users
- [ ] Multiplayer cursors with name labels
- [x] Presence awareness (who's online)
- [x] User authentication (users have accounts/names)
- [x] Deployed and publicly accessible

**Focus**: The focus is on collaborative infrastructure.

**Philosophy**: The MVP isn't about features — it's about proving your foundation is solid. A simple canvas with bulletproof multiplayer is worth more than a feature-rich canvas with broken sync.

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **Authentication**: Firebase Auth
- **Real-time**: Firebase Realtime Database
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React

## Getting Started

First, install dependencies:

```bash
pnpm install
```

Set up environment variables:

```bash
cp env.example .env.local
# Add your Firebase configuration to .env.local
```

Run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `src/app/` - Next.js App Router pages and layouts
- `src/components/ui/` - Reusable UI components (40+ components)
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions and configurations

## Development

The project uses:

- **ESLint** for code linting
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **pnpm** for package management

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
