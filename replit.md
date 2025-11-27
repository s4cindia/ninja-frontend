# Ninja Platform Web Application

## Overview
This is a React + Vite + TypeScript frontend web application for the Ninja Platform. The project was initialized as a skeleton structure and has been fully configured to run on Replit.

**Current State:** Fully functional development environment with Vite dev server running on port 5000.

## Recent Changes (November 27, 2025)
- Initialized complete Vite + React + TypeScript project structure
- Created package.json with all necessary dependencies
- Configured Vite to allow all hosts (required for Replit proxy)
- Set up frontend development server on 0.0.0.0:5000
- Created basic React application with App.tsx and styling
- Configured deployment for static site hosting
- Set up workflow for "Start application" with npm run dev

## Project Architecture

### Technology Stack
- **Frontend Framework:** React 18.2
- **Build Tool:** Vite 5.0
- **Language:** TypeScript 5.2
- **Dev Server:** Vite dev server on port 5000

### Directory Structure
```
/
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   │   ├── features/ # Feature-specific components
│   │   ├── layout/   # Layout components
│   │   └── ui/       # Reusable UI components
│   ├── hooks/        # Custom React hooks
│   ├── pages/        # Page components
│   ├── services/     # API services and external integrations
│   ├── stores/       # State management
│   ├── styles/       # CSS and styling files
│   ├── types/        # TypeScript type definitions
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main application component
│   └── main.tsx      # Application entry point
├── index.html        # HTML entry point
├── vite.config.ts    # Vite configuration
├── tsconfig.json     # TypeScript configuration
└── package.json      # Dependencies and scripts
```

### Key Configuration
- **Vite Config:** Configured with `allowedHosts: true` to accept requests from Replit's proxy, bound to 0.0.0.0:5000 with HMR on port 443
- **TypeScript:** Strict mode enabled with modern ES2020 target
- **Port:** Frontend runs on port 5000 (required for Replit webview)

## Development

### Running the Application
The application starts automatically via the "Start application" workflow. To manually start:
```bash
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server on port 5000
- `npm run build` - Build for production (outputs to dist/)
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Deployment
The project is configured for static site deployment:
- Build command: `npm run build`
- Output directory: `dist/`
- Deployment type: Static

## Dependencies

### Production Dependencies
- react: ^18.2.0
- react-dom: ^18.2.0

### Development Dependencies
- @vitejs/plugin-react: ^4.2.1
- typescript: ^5.2.2
- vite: ^5.0.8
- eslint and related plugins
- TypeScript type definitions

## Notes
- The Vite dev server must bind to 0.0.0.0 (not localhost) for Replit's proxy to work
- Port 5000 is the only port automatically exposed for web previews in Replit
- HMR (Hot Module Replacement) is configured to work through Replit's proxy on port 443
