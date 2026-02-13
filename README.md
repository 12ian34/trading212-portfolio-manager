# Trading212 Portfolio Analysis Tool

A comprehensive portfolio analysis tool that integrates with Trading212 to fetch your portfolio positions and enhances them with detailed financial data from Tiingo. Get deep insights into your investments with sector allocation, risk analysis, performance monitoring, and intelligent API management.

![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

## Key Features

### Portfolio Analysis
- **Real-time position tracking** via Trading212 API integration
- **Enhanced financial data** from Tiingo API (Power tier)
- **Sector allocation analysis** with interactive visualizations
- **Geographic diversification** breakdown by market regions
- **Exchange allocation** showing distribution across stock exchanges
- **Risk analysis** with comprehensive risk metrics
- **Performance monitoring** with historical data and trends

### Intelligent API Management
- **Unified rate limit tracking** across all API providers
- **Smart fallback system** with automatic cache fallback
- **Graceful degradation** maintaining functionality when APIs are limited
- **Real-time status monitoring** with usage indicators

### User Experience
- **Modern, responsive design** built with Shadcn UI and Tailwind CSS
- **Dark/light theme support** with system preference detection
- **Interactive data tables** with sorting, filtering, and export capabilities
- **Real-time loading states** and error handling
- **Mobile-optimized interface** for analysis on the go

## Quick Start

### Prerequisites

- **Node.js** 18+
- **npm**, **yarn**, **pnpm**, or **bun**
- **Trading212 API key** (from your Trading212 account)
- **Tiingo API key** (Power tier recommended: 100,000 calls/day, 10,000/hour)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd trading212-portfolio-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.example` to `.env` and fill in your keys:
   ```env
   TRADING212_API_KEY=your_trading212_api_key_here
   TIINGO_API_KEY=your_tiingo_api_key_here
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## API Keys Setup

### Trading212 API
1. Log into your Trading212 account
2. Navigate to Settings → API Keys
3. Generate a new API key
4. Copy the key to your `.env` file

### Tiingo API
1. Visit [tiingo.com](https://www.tiingo.com/account/token)
2. Create an account (Power tier recommended @ $30/month)
3. Generate an API token
4. **Power tier**: 100,000 calls/day + 10,000 calls/hour

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint code analysis |
| `npm run analyze` | Analyze bundle size with webpack-bundle-analyzer |

## Architecture Overview

### Core Components

- **`/src/app`** - Next.js App Router with API routes
- **`/src/components`** - Reusable UI components and widgets
- **`/src/lib`** - Business logic, API clients, and utilities
- **`/src/hooks`** - Custom React hooks for state management

### API Integration Layer

```
┌─────────────────┐    ┌─────────────────┐
│   Trading212    │    │     Tiingo      │
│   Portfolio     │    │ Financial Data  │
│   Positions     │    │(100k/day limit) │
└─────────────────┘    └─────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
        ┌─────────────────────────┐
        │   API Management Layer  │
        │  • Rate Limit Tracking  │
        │  • Cache Fallbacks      │
        │  • Error Handling       │
        └─────────────────────────┘
                     │
        ┌─────────────────────────┐
        │    Portfolio Service    │
        │  • Data Enrichment      │
        │  • Analysis Engine      │
        │  • Performance Metrics  │
        └─────────────────────────┘
```

### Key Services

- **`portfolio-service.ts`** - Core portfolio analysis and data processing
- **`api-limits-service.ts`** - Unified API rate limit management
- **`api-fallback-service.ts`** - Intelligent fallback and degradation
- **`financial-data-service.ts`** - Financial data aggregation via Tiingo
- **Cache services** - Provider-specific caching for optimal performance

## Tech Stack

### Frontend
- **[Next.js 15](https://nextjs.org/)** - React framework with App Router
- **[React 19](https://react.dev/)** - UI library with modern hooks
- **[TypeScript 5](https://www.typescriptlang.org/)** - Type-safe development
- **[Tailwind CSS 4](https://tailwindcss.com/)** - Utility-first styling
- **[Shadcn UI](https://ui.shadcn.com/)** - High-quality component library
- **[Radix UI](https://www.radix-ui.com/)** - Accessible primitives

### Data & State Management
- **[TanStack Query](https://tanstack.com/query)** - Server state management
- **[Axios](https://axios-http.com/)** - HTTP client with interceptors
- **[Zod](https://zod.dev/)** - Schema validation and type safety

### Visualization & Export
- **[Recharts](https://recharts.org/)** - Composable charting library
- **[jsPDF](https://github.com/parallax/jsPDF)** - PDF generation
- **[PapaParse](https://www.papaparse.com/)** - CSV parsing and generation

## Usage Guide

### Getting Started
1. **Connect Trading212**: The app auto-connects using your API key from `.env`
2. **View Portfolio**: Your positions load automatically
3. **Explore Analysis**: Navigate through sector, geographic, and risk analyses
4. **Enrich Data**: Click "Enrich Portfolio Data" for Tiingo fundamentals

### Key Features

#### Portfolio Overview
- View all your Trading212 positions in an enhanced table
- See real-time values, gains/losses, and performance metrics
- Filter and sort positions by various criteria
- Export data to CSV or PDF formats

#### Sector Analysis
- Interactive pie charts showing portfolio diversification
- Hover for detailed breakdowns and percentages

#### Risk Analysis
- Comprehensive risk metrics and scores
- Portfolio concentration and diversification metrics

#### API Management
- Real-time monitoring of API usage
- Smart warnings before operations that consume API calls

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TRADING212_API_KEY` | Yes | Your Trading212 API key |
| `TIINGO_API_KEY` | Yes | Tiingo API key (Power tier recommended) |

### API Rate Limits

| Provider | Daily Limit | Hourly Limit | Features |
|----------|------------|--------------|----------|
| **Tiingo** (Power) | 100,000 calls | 10,000 calls | Company fundamentals, prices |
| **Trading212** | Varies | Rate limited | Portfolio positions, account data |

## Troubleshooting

### Common Issues

#### API Key Errors
```
Error: Trading212 API key is required
```
**Solution**: Ensure all required API keys are set in your `.env` file.

#### Rate Limit Exceeded
**Solution**: The system will automatically fall back to cached data. With Tiingo Power tier you get 100k calls/day so this should be rare.

#### Build Errors
```
Type error: Property 'xyz' does not exist
```
**Solution**: Run `npm run lint` to check for TypeScript errors and fix them before building.

## Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **[Trading212](https://www.trading212.com/)** for providing portfolio API access
- **[Tiingo](https://www.tiingo.com/)** for comprehensive market data
- **[Shadcn](https://ui.shadcn.com/)** for the beautiful component library
- **[Vercel](https://vercel.com/)** for hosting and deployment platform
