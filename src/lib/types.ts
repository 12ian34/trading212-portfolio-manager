import { z } from 'zod'

// Trading212 API Types (matching actual API response)
export const Trading212PositionSchema = z.object({
  ticker: z.string(),
  quantity: z.number(),
  averagePrice: z.number(),
  currentPrice: z.number(),
  ppl: z.number(), // profit/loss in currency
  fxPpl: z.number().optional(),
  initialFillDate: z.string(),
  frontend: z.string().optional(),
  maxBuy: z.number().optional(),
  maxSell: z.number().optional(),
  pieQuantity: z.number().optional(),
})

export const Trading212AccountSchema = z.object({
  cash: z.number(),
  free: z.number(),
  invested: z.number(),
  result: z.number(),
  total: z.number(),
  ppl: z.number(),
  fxPpl: z.number().optional(),
  blocked: z.number().optional(),
  dividend: z.number().optional(),
  interest: z.number().optional(),
})

// Alpha Vantage API Types
export const AlphaVantageOverviewSchema = z.object({
  Symbol: z.string(),
  AssetType: z.string(),
  Name: z.string(),
  Description: z.string(),
  Exchange: z.string(),
  Currency: z.string(),
  Country: z.string(),
  Sector: z.string(),
  Industry: z.string(),
  Address: z.string().optional(),
  FullTimeEmployees: z.string().optional(),
  MarketCapitalization: z.string(),
  EBITDA: z.string().optional(),
  PERatio: z.string().optional(),
  PEGRatio: z.string().optional(),
  BookValue: z.string().optional(),
  DividendPerShare: z.string().optional(),
  DividendYield: z.string().optional(),
  EPS: z.string().optional(),
  RevenuePerShareTTM: z.string().optional(),
  ProfitMargin: z.string().optional(),
  OperatingMarginTTM: z.string().optional(),
  ReturnOnAssetsTTM: z.string().optional(),
  ReturnOnEquityTTM: z.string().optional(),
  RevenueTTM: z.string().optional(),
  GrossProfitTTM: z.string().optional(),
  DilutedEPSTTM: z.string().optional(),
  QuarterlyEarningsGrowthYOY: z.string().optional(),
  QuarterlyRevenueGrowthYOY: z.string().optional(),
  AnalystTargetPrice: z.string().optional(),
  TrailingPE: z.string().optional(),
  ForwardPE: z.string().optional(),
  PriceToSalesRatioTTM: z.string().optional(),
  PriceToBookRatio: z.string().optional(),
  EVToRevenue: z.string().optional(),
  EVToEBITDA: z.string().optional(),
  Beta: z.string().optional(),
  "52WeekHigh": z.string().optional(),
  "52WeekLow": z.string().optional(),
  "50DayMovingAverage": z.string().optional(),
  "200DayMovingAverage": z.string().optional(),
  SharesOutstanding: z.string().optional(),
  SharesFloat: z.string().optional(),
  SharesShort: z.string().optional(),
  SharesShortPriorMonth: z.string().optional(),
  ShortRatio: z.string().optional(),
  ShortPercentOutstanding: z.string().optional(),
  ShortPercentFloat: z.string().optional(),
  PercentInsiders: z.string().optional(),
  PercentInstitutions: z.string().optional(),
  ForwardAnnualDividendRate: z.string().optional(),
  ForwardAnnualDividendYield: z.string().optional(),
  PayoutRatio: z.string().optional(),
  DividendDate: z.string().optional(),
  ExDividendDate: z.string().optional(),
  LastSplitFactor: z.string().optional(),
  LastSplitDate: z.string().optional(),
})

// Enhanced Portfolio Types (combining Trading212 + Alpha Vantage)
export const EnhancedPositionSchema = z.object({
  // Trading212 data
  ticker: z.string(),
  quantity: z.number(),
  averagePrice: z.number(),
  currentPrice: z.number(),
  value: z.number(),
  ppl: z.number(),
  pplPercent: z.number(),
  initialFillDate: z.string(),
  
  // Alpha Vantage fundamentals
  companyName: z.string(),
  sector: z.string(),
  industry: z.string(),
  country: z.string(),
  exchange: z.string(),
  marketCap: z.number().optional(),
  peRatio: z.number().optional(),
  eps: z.number().optional(),
  dividendYield: z.number().optional(),
  bookValue: z.number().optional(),
  beta: z.number().optional(),
  
  // Calculated metrics
  weight: z.number(), // percentage of portfolio
  riskScore: z.number().optional(),
  
  // Display helpers
  change: z.number(),
  changePercent: z.number(),
  formattedValue: z.string(),
})

// Portfolio analysis types
export const SectorAllocationSchema = z.object({
  sector: z.string(),
  value: z.number(),
  percentage: z.number(),
  count: z.number(),
})

export const RegionAllocationSchema = z.object({
  region: z.string(),
  country: z.string(),
  value: z.number(),
  percentage: z.number(),
  count: z.number(),
})

export const PortfolioMetricsSchema = z.object({
  totalValue: z.number(),
  totalPnL: z.number(),
  totalPnLPercent: z.number(),
  diversificationScore: z.number(),
  riskScore: z.number(),
  sectorConcentration: z.number(),
  regionConcentration: z.number(),
  averagePE: z.number().optional(),
  averageEPS: z.number().optional(),
  dividendYield: z.number().optional(),
})

export const PortfolioAnalysisSchema = z.object({
  positions: z.array(EnhancedPositionSchema),
  metrics: PortfolioMetricsSchema,
  sectorAllocation: z.array(SectorAllocationSchema),
  regionAllocation: z.array(RegionAllocationSchema),
  lastUpdated: z.string(),
})

// Risk assessment types
export const RiskAlertSchema = z.object({
  type: z.enum(['concentration', 'sector', 'region', 'valuation', 'volatility']),
  level: z.enum(['low', 'medium', 'high']),
  title: z.string(),
  description: z.string(),
  recommendation: z.string(),
  affectedPositions: z.array(z.string()),
})

export const RebalanceRecommendationSchema = z.object({
  action: z.enum(['reduce', 'increase', 'hold']),
  ticker: z.string(),
  currentWeight: z.number(),
  targetWeight: z.number(),
  reason: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
})

// API Response types
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().nullable(),
  error: z.string().optional(),
  timestamp: z.string(),
})

// Export types
export type Trading212Position = z.infer<typeof Trading212PositionSchema>
export type Trading212Account = z.infer<typeof Trading212AccountSchema>
export type AlphaVantageOverview = z.infer<typeof AlphaVantageOverviewSchema>
export type EnhancedPosition = z.infer<typeof EnhancedPositionSchema>
export type SectorAllocation = z.infer<typeof SectorAllocationSchema>
export type RegionAllocation = z.infer<typeof RegionAllocationSchema>
export type PortfolioMetrics = z.infer<typeof PortfolioMetricsSchema>
export type PortfolioAnalysis = z.infer<typeof PortfolioAnalysisSchema>
export type RiskAlert = z.infer<typeof RiskAlertSchema>
export type RebalanceRecommendation = z.infer<typeof RebalanceRecommendationSchema>
export type ApiResponse<T = unknown> = z.infer<typeof ApiResponseSchema> & { data: T | null }

// Enhanced Filtering and Sorting Types
export type SortField = 'ticker' | 'value' | 'ppl' | 'pplPercent' | 'peRatio' | 'sector' | 'weight' | 'companyName' | 'country' | 'exchange' | 'marketCap' | 'dividendYield' | 'eps' | 'beta'
export type SortOrder = 'asc' | 'desc'

export interface SortConfig {
  field: SortField
  order: SortOrder
}

export interface FilterCriteria {
  // Text search
  search?: string
  
  // Categorical filters
  sectors?: string[]
  countries?: string[]
  exchanges?: string[]
  
  // Numeric range filters
  minValue?: number
  maxValue?: number
  minPE?: number
  maxPE?: number
  minWeight?: number
  maxWeight?: number
  minMarketCap?: number
  maxMarketCap?: number
  minDividendYield?: number
  maxDividendYield?: number
  minEPS?: number
  maxEPS?: number
  minBeta?: number
  maxBeta?: number
  
  // Performance filters
  minPnL?: number
  maxPnL?: number
  minPnLPercent?: number
  maxPnLPercent?: number
  
  // Boolean filters
  showOnlyProfitable?: boolean
  showOnlyLosers?: boolean
  showOnlyDividendPayers?: boolean
}

export interface FilterPreset {
  id: string
  name: string
  description?: string
  criteria: FilterCriteria
  sortConfig?: SortConfig[]
  createdAt: string
  updatedAt: string
}

// Multi-column sorting
export interface MultiSort {
  sorts: SortConfig[]
}

// Filter and sort state
export interface FilterSortState {
  filters: FilterCriteria
  sorts: SortConfig[]
  presets: FilterPreset[]
  activePresetId?: string
}

// Filter options for dropdowns
export interface FilterOptions {
  sectors: string[]
  countries: string[]
  exchanges: string[]
  minValue: number
  maxValue: number
  minPE: number
  maxPE: number
  minMarketCap: number
  maxMarketCap: number
}

// Schema for validation
export const FilterCriteriaSchema = z.object({
  search: z.string().optional(),
  sectors: z.array(z.string()).optional(),
  countries: z.array(z.string()).optional(),
  exchanges: z.array(z.string()).optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  minPE: z.number().optional(),
  maxPE: z.number().optional(),
  minWeight: z.number().optional(),
  maxWeight: z.number().optional(),
  minMarketCap: z.number().optional(),
  maxMarketCap: z.number().optional(),
  minDividendYield: z.number().optional(),
  maxDividendYield: z.number().optional(),
  minEPS: z.number().optional(),
  maxEPS: z.number().optional(),
  minBeta: z.number().optional(),
  maxBeta: z.number().optional(),
  minPnL: z.number().optional(),
  maxPnL: z.number().optional(),
  minPnLPercent: z.number().optional(),
  maxPnLPercent: z.number().optional(),
  showOnlyProfitable: z.boolean().optional(),
  showOnlyLosers: z.boolean().optional(),
  showOnlyDividendPayers: z.boolean().optional(),
})

export const SortConfigSchema = z.object({
  field: z.enum(['ticker', 'value', 'ppl', 'pplPercent', 'peRatio', 'sector', 'weight', 'companyName', 'country', 'exchange', 'marketCap', 'dividendYield', 'eps', 'beta']),
  order: z.enum(['asc', 'desc']),
})

export const FilterPresetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  criteria: FilterCriteriaSchema,
  sortConfig: z.array(SortConfigSchema).optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const FilterSortStateSchema = z.object({
  filters: FilterCriteriaSchema,
  sorts: z.array(SortConfigSchema),
  presets: z.array(FilterPresetSchema),
  activePresetId: z.string().optional(),
}) 