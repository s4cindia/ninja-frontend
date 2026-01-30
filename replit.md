# Ninja Platform Web Application

## Overview
This project is a React + Vite + TypeScript frontend web application for the Ninja Platform. Its primary purpose is to provide accessibility validation and compliance checking for educational publishers. The application offers a comprehensive workflow for EPUB accessibility auditing and remediation, aiming to streamline the process of creating compliant educational content. It features EPUB upload, detailed audit reports, and a guided remediation plan with both automated and manual task management. The platform seeks to enhance the accessibility of digital publications, ensuring adherence to standards like WCAG, Section 508, and FPC.

## User Preferences
- **Communication style**: I prefer simple language.
- **Coding style**: I like functional programming.
- **Workflow preferences**: I want iterative development.
- **Interaction preferences**: Ask before making major changes.
- **General working preferences**: I prefer detailed explanations.
- **Do not make changes to the folder `node_modules`**.
- **Do not make changes to the file `package-lock.json`**.
- **NEVER commit secrets to Git**.
- **All components must be accessible (WCAG 2.1 AA)**.
- **Use TypeScript strict mode**.
- **No inline styles - use Tailwind classes**.
- **Keep components small and focused**.
- **NEVER use Replit Agent for features - use approved Sprint Prompts only**.
- **For debugging, use Claude Code (not Replit Agent)**.
- **Create feature branches**: `git checkout -b feat/NINJA-XXX-description`.
- **Commit with conventional prefixes**: feat, fix, docs, chore, etc.

## System Architecture

### UI/UX Decisions
The application features a clean, responsive design built with Tailwind CSS. It uses a consistent component library for elements like buttons, inputs, cards, badges, and alerts to ensure a unified user experience. Key UI patterns include:
- **Dashboard**: Provides an overview of stats, compliance scores, and recent activity.
- **EPUB Workflow**: Guided multi-step process for uploading, auditing, and remediating EPUB files, featuring drag-and-drop upload, progress indicators, and detailed issue lists.
- **Accessibility Features**: Focus on WCAG 2.1 AA compliance, including keyboard accessibility, ARIA labels, color contrast, and screen reader support.
- **Branding**: Integrates S4Carlisle branding elements.

#### Button Variant Guide
- **`variant="default"`**: Primary actions (submit, save, confirm)
- **`variant="outline"`**: Secondary actions (view details, edit, cancel)
- **`variant="ghost"`**: Subtle actions (close buttons, icon-only buttons, dismiss)
- **`variant="destructive"`**: Destructive actions (delete, remove)

### Technical Implementations
- **Frontend Framework**: React 18.2 with Vite 5.0 for fast development and build times.
- **Language**: TypeScript 5.3 for type safety and improved developer experience.
- **Styling**: Tailwind CSS 3.3 for utility-first styling and easy customization.
- **Routing**: React Router DOM 6.20 for declarative navigation and protected routes with role-based access control.
- **State Management**: Zustand 4.4 for global state, with persistence for authentication.
- **Data Fetching**: TanStack Query 5.8 for efficient data fetching, caching, and synchronization, integrated with Axios.
- **Authentication**: JWT-based authentication with Axios interceptors for token refresh.
- **EPUB Processing**: Client-side logic for managing EPUB upload, displaying audit results, and orchestrating the remediation plan, including handling task statuses (pending, in_progress, completed, failed, skipped) and types (auto, manual).
- **Error Handling**: Robust error handling across the application, including user-friendly alerts and fallback mechanisms for API failures (e.g., demo mode with mock data).
- **Security**: XSS protection using DOMPurify, memory leak prevention, and proper cleanup of resources.

### Feature Specifications
- **EPUB Accessibility Audit**: Upload EPUB files, receive an accessibility score, and view a detailed list of issues categorized by severity and WCAG criteria.
- **EPUB Remediation Plan**: Generate a step-by-step remediation plan with auto-fixable and manual tasks. Track progress, cancel ongoing remediation, and view a comparison summary of the fixed EPUB.
- **Unified Remediation Workflow (FE-3.27)**: Unified PDF/EPUB remediation workflow with visual progress tracking at `/remediation` and `/remediation/:jobId`. Features RemediationStepper (horizontal/vertical step indicator), RemediationWorkflow (5-step process: audit, plan, remediate, review, export), RemediationSummary (circular progress ring), and RemediationHistory (job list with pagination). Content type is determined from URL query param or API fetch for proper routing.
- **ACR Editor**: Functionality for editing and verifying accessibility conformance remarks, with error handling and persistence of verification status.
- **Dashboard**: Displays key metrics (total files, processed, pending, failed), compliance scores, and recent activity, with real-time updates.
- **Compliance Pages**: Dedicated pages for Section 508 and Functional Performance Criteria (FPC) mapping.
- **User Authentication**: Secure login, registration, and user management with protected routes.
- **File Management**: Upload, list, and delete files.
- **Color Contrast Configuration**: Settings page (`/settings`) with toggle to control color contrast issue handling during remediation. Users can choose between auto-fix mode (automatic WCAG 2.1 AA correction) or manual review mode. Setting indicator displayed in RemediationPlanView with quick access to settings. Implements optimistic updates with React Query for instant UI feedback.
- **Backend-Handled Quick Fixes**: Quick Fix Panel now recognizes fix codes that are handled directly by the backend (EPUB-STRUCT-002, EPUB-META-002, EPUB-META-004, EPUB-NAV-001, EPUB-STRUCT-004). These display a streamlined "Apply Fix" button that calls the backend API directly, with proper code normalization to handle variations in case and underscores.

### System Design Choices
- **Modular Architecture**: Organized directory structure (`components`, `hooks`, `pages`, `services`, `stores`, `utils`) promoting reusability and maintainability.
- **API Client**: Centralized Axios client with authentication interceptors and error handling.
- **Custom Hooks**: Encapsulate data fetching and business logic for cleaner components.
- **Vite Configuration**: Path aliases (`@/`) for simplified imports, API proxy for backend integration, and specific configurations for Replit hosting (port 5000, 0.0.0.0 binding).

## External Dependencies

- **API Backend**: Custom backend API for user authentication, file operations, dashboard statistics, compliance data, and EPUB audit/remediation services. (Proxied via `/api` in Vite config).
- **Axios**: HTTP client for making API requests.
- **@tanstack/react-query**: For server state management and data synchronization.
- **Zustand**: For client-side state management, particularly authentication.
- **React Router DOM**: For client-side routing.
- **Lucide React**: Icon library for UI elements.
- **DOMPurify**: Used for sanitizing HTML content to prevent XSS vulnerabilities.