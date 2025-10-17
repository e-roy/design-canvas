# Design Canvas

A collaborative design canvas application built with Next.js 15, featuring real-time multiplayer functionality and comprehensive UI components.

**Focus**: The focus is on collaborative infrastructure.

**Philosophy**: The MVP isn't about features — it's about proving your foundation is solid. A simple canvas with bulletproof multiplayer is worth more than a feature-rich canvas with broken sync.

## Features

- **Real-time Collaboration**: Multiple users can draw and edit simultaneously
- **Live Cursor Tracking**: See other users' cursors in real-time
- **User Presence**: Visual indicators showing who's online
- **Shape Creation**: Draw rectangles, circles, lines, and text
- **Real-time Synchronization**: All changes sync instantly across all users
- **Authentication**: Secure login with Firebase Auth (email/password + Google OAuth)
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives
- **Authentication**: Firebase Auth
- **Real-time**: Firebase Realtime Database
- **Database**: Cloud Firestore
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Canvas Rendering**: Konva.js

## Getting Started

### Prerequisites

- Node.js 22+
- pnpm (recommended) or npm
- Firebase account and project

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd design-canvas
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up Firebase**

   Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)

   Enable the following services:

   - Authentication (Email/Password + Google)
   - Cloud Firestore Database
   - Realtime Database
   - Hosting (for deployment)

4. **Configure environment variables**

   ```bash
   cp env.example .env.local
   ```

   Update `.env.local` with your Firebase configuration:

   ```bash
   # Get these from Firebase Console > Project Settings > General
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

   # For server-side operations (get from Service Account)
   FIREBASE_API_KEY=your_api_key
   FIREBASE_PROJECT_ID=your_project_id
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

   # Generate a secure cookie secret
   COOKIE_SECRET=your-super-secret-cookie-key-at-least-32-chars-long
   ```

5. **Run the development server**

   ```bash
   pnpm dev
   ```

6. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

### Development with Firebase Emulators (Optional)

For local development without affecting production Firebase:

```bash
# Start Firebase emulators
pnpm emulators

# In another terminal, start the app with emulators
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true pnpm dev
```

## Architecture

This application follows a layered architecture with clear separation of concerns:

- **UI Layer**: React components with Radix UI primitives
- **State Management**: Zustand stores for global state
- **Service Layer**: Firebase integration and business logic
- **Real-time Layer**: Firebase Realtime Database for live collaboration
- **Authentication**: Firebase Auth with Next.js middleware

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── canvas/            # Canvas page
│   ├── login/             # Authentication page
│   └── layout.tsx         # Root layout
├── components/
│   ├── canvas/            # Canvas-specific components
│   │   ├── shapes/        # Shape components (rectangle, circle, line, text)
│   │   ├── canvas.tsx     # Main canvas component
│   │   ├── cursor.tsx     # Real-time cursor tracking
│   │   └── toolbar.tsx    # Drawing tools
│   └── ui/                # Reusable UI components (40+ components)
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
│   ├── firebase/          # Firebase setup and auth
│   └── canvas-service.ts  # Canvas operations
├── store/                 # Zustand state management
├── types/                 # TypeScript definitions
└── services/              # Business logic services
```

## Dependencies

### Core Framework

- **Next.js 15.5.5** - React framework with App Router
- **React 19.1.0** - UI library
- **TypeScript 5** - Type safety

### UI & Styling

- **Tailwind CSS v4** - Utility-first CSS framework
- **Radix UI** - Accessible UI primitives (40+ components)
- **Lucide React** - Icon library
- **Konva.js** - 2D canvas library for graphics rendering
- **React Konva** - React bindings for Konva

### State Management & Forms

- **Zustand** - Lightweight state management
- **React Hook Form** - Form handling
- **Zod** - Schema validation

### Firebase Integration

- **Firebase 12.4.0** - Backend services
- **next-firebase-auth-edge** - Firebase auth for Next.js Edge Runtime

### Development Tools

- **ESLint** - Code linting
- **pnpm** - Package manager
- **Concurrently** - Run multiple commands

### Additional Libraries

- **class-variance-authority** - CSS class variant management
- **clsx** - Conditional className utility
- **tailwind-merge** - Tailwind CSS class merging
- **sonner** - Toast notifications
- **date-fns** - Date utilities

## Deployment

### Vercel (Recommended)

This project is deployed on Vercel. To deploy your own instance:

1. **Fork this repository**

   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/design-canvas.git
   cd design-canvas
   ```

2. **Connect to Vercel**

   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your forked repository
   - Vercel will automatically detect Next.js

3. **Configure environment variables in Vercel**

   In your Vercel project settings, add these environment variables:

   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`
   - `FIREBASE_API_KEY`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
   - `COOKIE_SECRET`

4. **Deploy**
   - Vercel will automatically deploy on every push to main branch
   - Your app will be available at `https://your-project.vercel.app`

### Alternative: Firebase Hosting

You can also deploy using Firebase Hosting:

1. **Build the application**

   ```bash
   pnpm build
   ```

2. **Deploy to Firebase Hosting**

   ```bash
   # Install Firebase CLI if not already installed
   npm install -g firebase-tools

   # Login to Firebase
   firebase login

   # Initialize Firebase Hosting (if not already done)
   firebase init hosting

   # Deploy
   firebase deploy
   ```

3. **Configure Firebase services**

   Make sure your Firebase project has the following enabled:

   - Authentication (Email/Password + Google)
   - Cloud Firestore Database
   - Realtime Database
   - Hosting

### Environment Variables Setup

#### Getting Firebase Configuration

1. **Client Configuration (Public)**

   Go to Firebase Console → Project Settings → General → Your apps

   Copy these values from your web app configuration:

   ```bash
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

2. **Service Account Keys (Private)**

   For server-side operations, you need a service account:

   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file
   - Extract these values:

   ```bash
   FIREBASE_API_KEY=your_api_key                    # Same as NEXT_PUBLIC_FIREBASE_API_KEY
   FIREBASE_PROJECT_ID=your_project_id              # Same as NEXT_PUBLIC_FIREBASE_PROJECT_ID
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"
   ```

3. **Generate Cookie Secret**

   Generate a secure random string for cookie encryption:

   ```bash
   # Using Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

   # Using OpenSSL
   openssl rand -hex 32

   # Or use an online generator (less secure)
   # https://generate-secret.vercel.app/32
   ```

   Set the result as:

   ```bash
   COOKIE_SECRET=your-generated-64-character-hex-string
   ```

#### Complete Environment Variables

```bash
# Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Service Account (Private)
FIREBASE_API_KEY=your_api_key
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Security
COOKIE_SECRET=your-generated-64-character-hex-string
```

## Development

### Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm emulators` - Start Firebase emulators
- `pnpm dev:emulators` - Start both emulators and dev server

### Development Tools

- **ESLint** - Code linting and formatting
- **TypeScript** - Type safety and IntelliSense
- **Tailwind CSS** - Utility-first styling
- **pnpm** - Fast, disk-efficient package manager
- **Firebase Emulators** - Local development without affecting production

### Code Organization

- Keep files under 350 lines for optimal readability
- Use kebab-case for folder names, PascalCase for component files
- Store page-specific components in `src/components/[page-name]/`
- Use `src/components/ui/` for reusable components
- Extract business logic into services in `src/services/`

## Contributing

This is an open source project! We welcome contributions:

1. **Fork the repository**

   ```bash
   # Click "Fork" on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/design-canvas.git
   cd design-canvas
   ```

2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**

   - Follow the code organization guidelines
   - Keep files under 350 lines
   - Add tests if applicable

4. **Commit your changes**

   ```bash
   git commit -m 'Add some amazing feature'
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**
   - Go to your fork on GitHub
   - Click "New Pull Request"
   - Describe your changes clearly

## Support

For questions or issues:

1. Check the [architecture documentation](docs/architecture.md)
2. Review the [project tasks](docs/tasks.md)
3. Open an issue on GitHub
