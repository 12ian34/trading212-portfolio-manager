# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development Server
```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint analysis
```

### Bundle Analysis
```bash
npm run analyze      # Analyze bundle size
npm run build:analyze # Alternative bundle analysis
```

## Architecture Overview

This is a Next.js 15 application that provides comprehensive portfolio analysis for Trading212 users. The app integrates with multiple financial data providers to enhance basic portfolio data with detailed analytics.

### Core Services Architecture

**Data Flow:**
1. **Trading212 API** → Base portfolio positions
2. **Financial Data Service** → Enhanced fundamentals (Alpha Vantage + Tiingo fallback)
3. **Portfolio Service** → Analysis engine and metrics calculation
4. **API Limits Service** → Rate limiting and intelligent fallbacks

### Key Services

- **`src/lib/portfolio-service.ts`** - Core portfolio analysis engine that combines Trading212 positions with financial data
- **`src/lib/api-limits-service.ts`** - Unified API rate limiting across all providers (Alpha Vantage: 25/day, Tiingo: 1000/day)
- **`src/lib/financial-data-service.ts`** - Centralized financial data aggregation with smart fallbacks
- **`src/lib/api-fallback-service.ts`** - Intelligent provider switching and graceful degradation

### Data Sources & Limits

- **Alpha Vantage**: 25 calls/day, 5/minute (very restrictive)
- **Tiingo**: 1000 calls/day, 50/hour (more generous)
- **Trading212**: Portfolio positions (rate limited but no explicit limits)

### Component Structure

- **`src/components/`** - UI components built with Shadcn/UI and Radix
- **`src/app/api/`** - Next.js API routes for backend integration
- **`src/hooks/`** - Custom React hooks (`use-portfolio.ts`, `use-filter-sort.ts`)
- **`src/lib/types.ts`** - Comprehensive TypeScript types with Zod validation

### Technical Stack

- **Next.js 15** with App Router
- **React 19** with modern hooks
- **TypeScript 5** with strict configuration
- **Tailwind CSS 4** for styling
- **Shadcn/UI** component library
- **TanStack Query** for server state management
- **Zod** for schema validation

## Environment Variables

Required for development:
```env
TRADING212_API_KEY=your_trading212_api_key
ALPHAVANTAGE_API_KEY=your_alphavantage_api_key
TIINGO_API_KEY=your_tiingo_api_key
```

## Development Guidelines

### API Usage Patterns
- Always use the `apiLimitsTracker` before making API calls
- Prefer cached data when available
- Use fallback providers (Tiingo when Alpha Vantage is exhausted)
- Check `src/lib/api-limits-service.ts` for rate limiting logic

### Data Enhancement Flow
1. Fetch Trading212 positions
2. Extract symbols for financial data lookup
3. Query financial data service (with fallbacks)
4. Combine and calculate portfolio metrics
5. Generate sector/region allocations

### Error Handling
- All API responses use `ApiResponse<T>` type
- Services gracefully degrade when APIs are unavailable
- UI components handle loading states and errors

### Import Alias
Uses `@/` for `src/` directory imports

## Recent Development History

### Homepage Architecture (Phase 11)
- **Before**: Technical demo with manual connection flow
- **After**: User-centric tool with automatic Trading212 connection
- **Key Change**: App automatically connects on load and displays portfolio immediately
- **Removed**: Marketing welcome sections, manual connection buttons, overwhelming API sections

### API Limits Help System (Phase 10)
- **Removed**: Comprehensive help/education system per user request
- **Preserved**: Core API management functionality (tracking, warnings, graceful degradation)
- **Impact**: Cleaner UI, reduced bundle size, maintained essential features

### Current Focus
- Portfolio-first experience with automatic connection
- Single "Enrich Portfolio Data" button for enhanced analysis
- Clean, production-ready interface without technical noise