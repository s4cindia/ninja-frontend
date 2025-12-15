# Ninja Platform Web Application

## Overview
This is a React + Vite + TypeScript frontend web application for the Ninja Platform. The project provides accessibility validation and compliance checking for educational publishers.

**Current State:** Fully functional development environment with Vite dev server running on port 5000.

## Recent Changes (December 15, 2025)
- **Dashboard with Real Data:** Updated Dashboard page with backend API integration
  - Stat cards for total files, processed, pending, failed with loading states
  - Circular compliance score indicator with color-coded thresholds
  - Recent activity feed with time formatting
  - Auto-refresh every 30 seconds via React Query
- **Compliance Pages:** Section 508 and FPC compliance mapping pages
  - src/pages/compliance/Section508Page.tsx - Section 508 criteria mapping
  - src/pages/compliance/FpcPage.tsx - Functional Performance Criteria validation
  - ConformanceBadge component with status icons
- **New Services & Hooks:**
  - src/services/dashboard.service.ts - Dashboard stats and activity API
  - src/services/compliance.service.ts - Section 508 and FPC APIs
  - src/hooks/useDashboard.ts - Dashboard data hooks with auto-refresh
  - src/hooks/useCompliance.ts - Compliance data hooks

## Previous Changes (December 7, 2025)
- **UI Component Library:** Complete reusable component library with Tailwind CSS
  - Button (variants: primary, secondary, outline, ghost, danger; sizes: sm, md, lg; loading state, icons)
  - Input (label, error, helperText, accessible with htmlFor)
  - Card (Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter)
  - Badge (variants: default, success, warning, error, info; sizes: sm, md)
  - Alert (variants: info, success, warning, error; title, closable with aria-label)
  - Spinner (sizes: sm, md, lg; accessible with role="status")
  - EmptyState (icon, title, description, action props)
  - Table (Table, TableHeader, TableBody, TableRow, TableHead, TableCell)
  - Logo (S4Carlisle branding component)
- **Updated Pages:** Login and Register pages now use the new UI components
- **Data Fetching Layer:** Complete TanStack Query setup with Axios API client
- **API Services:** Configured Axios with auth interceptors, token refresh handling
- **Auth Service:** Login, register, logout, getCurrentUser, refreshToken methods
- **Files Service:** CRUD operations for files with upload support
- **Query Hooks:** useLogin, useRegister, useLogout, useCurrentUser, useFiles, useUploadFile, useDeleteFile
- **Routing Setup:** Complete React Router configuration with protected routes
- **Authentication:** Zustand auth store with localStorage persistence
- **Layouts:** MainLayout (sidebar navigation) and AuthLayout (login/register)
- **Pages:** Dashboard, Login, Register, Products, Jobs, Files, NotFound
- **Route Protection:** ProtectedRoute component with role-based access control
- **Branding:** S4Carlisle logo image integrated throughout the application
- Updated package.json with complete dependency set
- Configured Vite with path aliases (@/) and API proxy
- Set up Tailwind CSS with custom primary color palette
- TypeScript configured with path aliases

## Project Architecture

### Technology Stack
- **Frontend Framework:** React 18.2
- **Build Tool:** Vite 5.0
- **Language:** TypeScript 5.3
- **Styling:** Tailwind CSS 3.3
- **Routing:** React Router DOM 6.20
- **Data Fetching:** React Query (@tanstack/react-query) 5.8
- **State Management:** Zustand 4.4
- **HTTP Client:** Axios 1.6
- **Icons:** Lucide React 0.294
- **Dev Server:** Vite dev server on port 5000

### Directory Structure
```
/
├── public/           # Static assets
├── src/
│   ├── components/   # React components
│   │   ├── layout/   # Layout components (MainLayout, AuthLayout)
│   │   │   ├── MainLayout.tsx   # Sidebar navigation for authenticated users
│   │   │   └── AuthLayout.tsx   # Centered card layout for login/register
│   │   ├── ui/       # Base UI components (Button, Input, etc.)
│   │   └── ProtectedRoute.tsx   # Route protection with role-based access
│   ├── hooks/        # Custom React hooks
│   │   ├── useAuth.ts       # Auth mutations: useLogin, useRegister, useLogout, useCurrentUser
│   │   ├── useFiles.ts      # File operations: useFiles, useUploadFile, useDeleteFile
│   │   └── index.ts         # Re-exports all hooks
│   ├── pages/        # Page components
│   │   ├── Dashboard.tsx    # Main dashboard with stats
│   │   ├── Login.tsx        # Login form
│   │   ├── Register.tsx     # Registration form
│   │   ├── Products.tsx     # Products management
│   │   ├── Jobs.tsx         # Jobs list
│   │   ├── Files.tsx        # File uploads
│   │   └── NotFound.tsx     # 404 error page
│   ├── services/     # API services and external integrations
│   │   ├── api.ts           # Axios client with auth interceptors
│   │   ├── auth.service.ts  # Auth API: login, register, logout, getCurrentUser
│   │   └── files.service.ts # Files API: list, upload, delete, getStats
│   ├── stores/       # Zustand state stores
│   │   └── auth.store.ts    # Authentication state with persist
│   ├── styles/       # CSS and Tailwind styles
│   ├── types/        # TypeScript type definitions
│   │   └── auth.types.ts    # User, AuthState, LoginCredentials types
│   ├── utils/        # Utility functions
│   ├── App.tsx       # Main application component with routing
│   ├── main.tsx      # Application entry point
│   └── vite-env.d.ts # Vite type definitions
├── index.html        # HTML entry point (Inter font)
├── vite.config.ts    # Vite configuration with aliases and proxy
├── tsconfig.json     # TypeScript configuration with path aliases
├── tailwind.config.js # Tailwind CSS configuration
├── postcss.config.js  # PostCSS configuration
└── package.json      # Dependencies and scripts
```

### Routing Structure
- `/login` - Login page (AuthLayout)
- `/register` - Registration page (AuthLayout)
- `/dashboard` - Dashboard with stats (Protected, MainLayout)
- `/products` - Products management (Protected, MainLayout)
- `/jobs` - Validation jobs list (Protected, MainLayout)
- `/files` - File uploads (Protected, MainLayout)
- `/` - Redirects to /dashboard
- `*` - 404 Not Found page

Protected routes redirect unauthenticated users to `/login`. The ProtectedRoute component also supports role-based access control.

### Key Configuration
- **Vite Config:** Path alias `@/` points to `./src`, API proxy for `/api` routes, `allowedHosts: true` for Replit proxy
- **TypeScript:** Strict mode with path aliases (`@/*` maps to `./src/*`)
- **Tailwind:** Custom primary color palette, content scans ./src and index.html
- **Port:** Frontend runs on port 5000 (required for Replit webview)

## Development

### Running the Application
The application starts automatically via the "Start application" workflow. To manually start:
```bash
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server on port 5000
- `npm run build` - TypeScript compile and Vite build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Path Aliases
Use `@/` to import from the src directory:
```typescript
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
```

### Deployment
The project is configured for static site deployment:
- Build command: `npm run build`
- Output directory: `dist/`
- Deployment type: Static

## Dependencies

### Production Dependencies
- react: ^18.2.0
- react-dom: ^18.2.0
- react-router-dom: ^6.20.0
- @tanstack/react-query: ^5.8.0
- axios: ^1.6.0
- zustand: ^4.4.0
- clsx: ^2.0.0
- lucide-react: ^0.294.0

### Development Dependencies
- @vitejs/plugin-react: ^4.2.0
- typescript: ^5.3.0
- vite: ^5.0.0
- tailwindcss: ^3.3.0
- postcss: ^8.4.0
- autoprefixer: ^10.4.0
- @types/node: ^20.10.0
- @types/react: ^18.2.0
- @types/react-dom: ^18.2.0
- eslint and related plugins

## Notes
- The Vite dev server must bind to 0.0.0.0 (not localhost) for Replit's proxy to work
- Port 5000 is the only port automatically exposed for web previews in Replit
- HMR (Hot Module Replacement) is configured to work through Replit's proxy on port 443
- API requests to `/api/*` are proxied to http://localhost:5000

## Critical Rules

1. NEVER commit secrets to Git
2. All components must be accessible (WCAG 2.1 AA)
3. Use TypeScript strict mode
4. No inline styles - use Tailwind classes
5. Keep components small and focused
6. NEVER use Replit Agent for features - use approved Sprint Prompts only

## Accessibility Requirements

- All interactive elements must be keyboard accessible
- Include proper ARIA labels
- Maintain color contrast ratios
- Support screen readers

## Recovery Commands

If the Repl gets stuck:
- Restart: `kill 1`
- Clear cache: `rm -rf node_modules/.cache`
- Reinstall: `rm -rf node_modules && npm install`

## Development Workflow

1. Use approved Sprint Prompts from docs/sprint-prompts/ (in ninja-backend repo)
2. For debugging, use Claude Code (not Replit Agent)
3. Create feature branches: `git checkout -b feat/NINJA-XXX-description`
4. Commit with conventional prefixes: feat, fix, docs, chore, etc.

## Related Documentation

- [Main Documentation](https://github.com/s4cindia/ninja-backend/tree/main/docs)
- [Backend Repository](https://github.com/s4cindia/ninja-backend)
