# 📊 Trading212 Portfolio Analysis Tool

A comprehensive portfolio analysis tool that integrates with Trading212 to fetch your portfolio positions and enhances them with detailed financial data from multiple providers. Get deep insights into your investments with sector allocation, risk analysis, performance monitoring, and intelligent API management.

![Next.js](https://img.shields.io/badge/Next.js-15.3.5-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![React](https://img.shields.io/badge/React-19-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8)

## ✨ Key Features

### 📈 Portfolio Analysis
- **Real-time position tracking** via Trading212 API integration
- **Enhanced financial data** from Alpha Vantage and Tiingo APIs
- **Sector allocation analysis** with interactive visualizations
- **Geographic diversification** breakdown by market regions
- **Exchange allocation** showing distribution across stock exchanges
- **Risk analysis** with comprehensive risk metrics
- **Performance monitoring** with historical data and trends

### 🛡️ Intelligent API Management
- **Unified rate limit tracking** across all API providers
- **Smart fallback system** with automatic provider switching
- **Graceful degradation** maintaining functionality when APIs are limited
- **Cost-aware operations** with pre-action warnings and estimates
- **Educational help system** with contextual tooltips and documentation
- **Real-time status monitoring** with usage indicators

### 🎯 User Experience
- **Modern, responsive design** built with Shadcn UI and Tailwind CSS
- **Dark/light theme support** with system preference detection
- **Interactive data tables** with sorting, filtering, and export capabilities
- **Real-time loading states** and error handling
- **Comprehensive help system** with context-sensitive guidance
- **Mobile-optimized interface** for analysis on the go

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **npm**, **yarn**, **pnpm**, or **bun**
- **Trading212 API key** (from your Trading212 account)
- **Alpha Vantage API key** (free tier: 25 calls/day)
- **Tiingo API key** (free tier: 1000 calls/day)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd t212
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # Trading212 API
   TRADING212_API_KEY=your_trading212_api_key_here
   
   # Financial Data Providers
   ALPHAVANTAGE_API_KEY=your_alphavantage_api_key_here
   TIINGO_API_KEY=your_tiingo_api_key_here
   
   # Environment
   NODE_ENV=development
   ```

4. **Run the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔑 API Keys Setup

### Trading212 API
1. Log into your Trading212 account
2. Navigate to Settings → API Keys
3. Generate a new API key
4. Copy the key to your `.env.local` file

### Alpha Vantage API
1. Visit [alphavantage.co](https://www.alphavantage.co/support/#api-key)
2. Sign up for a free account
3. Get your API key from the dashboard
4. **Free tier**: 25 calls/day + 5 calls/minute

### Tiingo API  
1. Visit [tiingo.com](https://www.tiingo.com/account/token)
2. Create a free account
3. Generate an API token
4. **Free tier**: 1000 calls/day + 50 calls/hour

## 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Build production application |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint code analysis |
| `npm run analyze` | Analyze bundle size with webpack-bundle-analyzer |

## 🏗️ Architecture Overview

### Core Components

- **`/src/app`** - Next.js App Router with API routes
- **`/src/components`** - Reusable UI components and widgets
- **`/src/lib`** - Business logic, API clients, and utilities
- **`/src/hooks`** - Custom React hooks for state management

### API Integration Layer

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Trading212    │    │  Alpha Vantage   │    │     Tiingo      │
│   Portfolio     │    │  Financial Data  │    │ Financial Data  │
│   Positions     │    │  (25/day limit)  │    │ (1000/day limit)│
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────────────┐
                    │   API Management Layer  │
                    │  • Rate Limit Tracking  │
                    │  • Smart Fallbacks      │
                    │  • Caching Strategy     │
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
- **`financial-data-service.ts`** - Centralized financial data aggregation
- **Cache services** - Provider-specific caching for optimal performance

## 🛠️ Tech Stack

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
- **[html2canvas](https://html2canvas.hertzen.com/)** - Screenshot generation
- **[jsPDF](https://github.com/parallax/jsPDF)** - PDF generation
- **[PapaParse](https://www.papaparse.com/)** - CSV parsing and generation

## 🎯 Usage Guide

### Getting Started
1. **Connect Trading212**: Enter your API key in settings
2. **View Portfolio**: Your positions will load automatically
3. **Explore Analysis**: Navigate through sector, geographic, and risk analyses
4. **Monitor APIs**: Check the API status dashboard for usage insights

### Key Features Walkthrough

#### Portfolio Overview
- View all your Trading212 positions in a enhanced table
- See real-time values, gains/losses, and performance metrics
- Filter and sort positions by various criteria
- Export data to CSV or PDF formats

#### Sector Analysis
- Interactive pie charts showing portfolio diversification
- Hover for detailed breakdowns and percentages
- Context-sensitive help explaining analysis methodology

#### Risk Analysis
- Comprehensive risk metrics and scores
- Historical volatility and correlation analysis
- Portfolio concentration and diversification metrics

#### API Management
- Real-time monitoring of API usage across all providers
- Smart warnings before operations that consume API calls
- Educational tooltips explaining API concepts and optimization

### Pro Tips
- **Optimize API usage**: Use the help system to understand when operations consume API calls
- **Monitor limits**: Check the API status dashboard regularly
- **Leverage caching**: Recent data is cached to minimize API consumption
- **Use fallbacks**: The system automatically switches providers when limits are reached

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `TRADING212_API_KEY` | ✅ | Your Trading212 API key | - |
| `ALPHAVANTAGE_API_KEY` | ✅ | Alpha Vantage API key | - |
| `TIINGO_API_KEY` | ✅ | Tiingo API key | - |
| `NODE_ENV` | ❌ | Application environment | `development` |

### API Rate Limits

| Provider | Free Tier Daily | Free Tier Per Minute/Hour | Features |
|----------|----------------|---------------------------|----------|
| **Alpha Vantage** | 25 calls | 5 calls/minute | Company overviews, fundamentals |
| **Tiingo** | 1000 calls | 50 calls/hour | Stock prices, company data |
| **Trading212** | Varies | Rate limited | Portfolio positions, account data |

## 🐛 Troubleshooting

### Common Issues

#### API Key Errors
```
Error: Trading212 API key is required
```
**Solution**: Ensure all required API keys are set in your `.env.local` file

#### Rate Limit Exceeded
```
API rate limit exceeded for Alpha Vantage
```
**Solution**: The system will automatically fall back to Tiingo or cached data. Check the API status dashboard for current usage.

#### Build Errors
```
Type error: Property 'xyz' does not exist
```
**Solution**: Run `npm run lint` to check for TypeScript errors and fix them before building.

### Performance Issues

- **Slow loading**: Check your internet connection and API provider status
- **High memory usage**: Clear browser cache and restart the development server
- **Failed requests**: Verify all API keys are valid and have remaining quota

### Getting Help

1. Check the **in-app help system** with comprehensive guides
2. Review the **API status dashboard** for current limitations
3. Consult the **troubleshooting section** in the help documentation
4. Check browser developer console for detailed error messages

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow the existing **TypeScript** and **React** patterns
- Use **Tailwind CSS** for styling with existing design tokens
- Add **comprehensive error handling** for all API operations
- Include **help documentation** for new user-facing features
- Write **clear commit messages** and document complex logic

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Trading212](https://www.trading212.com/)** for providing portfolio API access
- **[Alpha Vantage](https://www.alphavantage.co/)** for financial data services
- **[Tiingo](https://www.tiingo.com/)** for comprehensive market data
- **[Shadcn](https://ui.shadcn.com/)** for the beautiful component library
- **[Vercel](https://vercel.com/)** for hosting and deployment platform

---

**📊 Ready to analyze your portfolio?** Set up your API keys and start exploring your investment insights today!
