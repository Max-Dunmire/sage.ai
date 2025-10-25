# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sage.ai is an intelligent call secretary service built as a marketing website. This is a Lovable-generated project that uses Vite, React, TypeScript, and shadcn-ui components with Tailwind CSS.

## Development Commands

```bash
# Install dependencies
npm i

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build for development mode
npm run build:dev

# Lint the codebase
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Application Structure

- **Entry Point**: `src/main.tsx` renders the root `App` component
- **Router**: Client-side routing via `react-router-dom` configured in `src/App.tsx`
- **State Management**: Uses `@tanstack/react-query` with a global `QueryClient` provider
- **Styling**: Tailwind CSS with custom design system defined in `src/index.css`

### Key Routes

Defined in `src/App.tsx`:
- `/` - Home page
- `/features` - Features page
- `/pricing` - Pricing page
- `/about` - About page
- `/contact` - Contact page
- `*` - 404 Not Found page

All pages are in `src/pages/` directory.

### Layout Components

The app has a consistent layout structure:
- **Navbar**: Top navigation (`src/components/Navbar.tsx`)
- **Footer**: Bottom footer (`src/components/Footer.tsx`)
- **ChatbotIcon**: Floating chatbot icon (`src/components/ChatbotIcon.tsx`)

These wrap all page content in a flex column layout.

### UI Components

All UI components are from shadcn-ui located in `src/components/ui/`. They use Radix UI primitives with Tailwind styling and follow the component pattern established by shadcn-ui.

### Path Aliases

TypeScript and Vite are configured with the `@/` alias pointing to `src/`:
```typescript
import { Button } from "@/components/ui/button";
```

### Design System

The design system is centralized in `src/index.css` using CSS custom properties:

**Brand Colors (Sage Green Theme)**:
- Primary: Sage green (`--primary: 160 28% 60%`)
- Accent: Darker sage (`--accent: 160 35% 45%`)
- All colors use HSL format

**Custom Utilities**:
- `.bg-gradient-hero` - Light sage gradient for hero sections
- `.bg-gradient-card` - Subtle gradient for cards
- `.bg-gradient-sage` - Primary sage gradient for CTAs
- `.shadow-soft` - Soft shadow for cards
- `.shadow-hover` - Enhanced shadow on hover

**Animations**:
- `fade-in` - Fade in with upward motion
- `wave` - Wave animation for sound bars

Dark mode is supported via the `.dark` class.

### TypeScript Configuration

The project has relaxed TypeScript settings for rapid development:
- `noImplicitAny: false`
- `noUnusedParameters: false`
- `noUnusedLocals: false`
- `strictNullChecks: false`
- `allowJs: true`

### Lovable Integration

This project is managed through Lovable (lovable.dev). Changes made via Lovable are automatically committed to the repository. The development build includes the `lovable-tagger` plugin for component tracking.

## Development Notes

- Dev server runs on `http://[::]:8080` (IPv6 localhost)
- Uses SWC for fast React compilation via `@vitejs/plugin-react-swc`
- Toast notifications available via both `sonner` and shadcn-ui `toast` components
- Forms use `react-hook-form` with `zod` validation
- Responsive design with mobile-first approach using Tailwind breakpoints