import { 
  FilterCriteria, 
  SortConfig, 
  FilterOptions, 
  FilterPreset, 
  FilterSortState,
  SortField,
  SortOrder
} from './types'

// EnrichedPosition interface for filtering
export interface FilterablePosition {
  ticker: string
  companyName?: string
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  marketCap?: number
  peRatio?: number
  dividendYield?: number
  eps?: number
  beta?: number
  currentPrice: number
  quantity: number
  ppl: number
  averagePrice: number
  initialFillDate: string
}

// Calculate derived values for filtering
export function calculatePositionValues(position: FilterablePosition) {
  const value = position.currentPrice * position.quantity
  const pplPercent = value > 0 ? (position.ppl / value) * 100 : 0
  const weight = 0 // This would need to be calculated from total portfolio value
  
  return {
    value,
    pplPercent,
    weight,
    isProfitable: position.ppl > 0,
    isLoser: position.ppl < 0,
    hasDividend: (position.dividendYield || 0) > 0,
  }
}

// Core filtering function
export function filterPositions(
  positions: FilterablePosition[],
  criteria: FilterCriteria,
  totalPortfolioValue?: number
): FilterablePosition[] {
  return positions.filter(position => {
    const values = calculatePositionValues(position)
    
    // Update weight if we have total portfolio value
    if (totalPortfolioValue && totalPortfolioValue > 0) {
      values.weight = (values.value / totalPortfolioValue) * 100
    }
    
    // Search filter
    if (criteria.search) {
      const searchTerm = criteria.search.toLowerCase()
      const matchesSearch = 
        position.ticker.toLowerCase().includes(searchTerm) ||
        (position.companyName && position.companyName.toLowerCase().includes(searchTerm)) ||
        (position.sector && position.sector.toLowerCase().includes(searchTerm))
      
      if (!matchesSearch) return false
    }
    
    // Categorical filters
    if (criteria.sectors && criteria.sectors.length > 0) {
      if (!position.sector || !criteria.sectors.includes(position.sector)) {
        return false
      }
    }
    
    if (criteria.countries && criteria.countries.length > 0) {
      if (!position.country || !criteria.countries.includes(position.country)) {
        return false
      }
    }
    
    if (criteria.exchanges && criteria.exchanges.length > 0) {
      if (!position.exchange || !criteria.exchanges.includes(position.exchange)) {
        return false
      }
    }
    
    // Numeric range filters
    if (criteria.minValue !== undefined && values.value < criteria.minValue) return false
    if (criteria.maxValue !== undefined && values.value > criteria.maxValue) return false
    
    if (criteria.minPE !== undefined && (position.peRatio || 0) < criteria.minPE) return false
    if (criteria.maxPE !== undefined && (position.peRatio || 0) > criteria.maxPE) return false
    
    if (criteria.minWeight !== undefined && values.weight < criteria.minWeight) return false
    if (criteria.maxWeight !== undefined && values.weight > criteria.maxWeight) return false
    
    if (criteria.minMarketCap !== undefined && (position.marketCap || 0) < criteria.minMarketCap) return false
    if (criteria.maxMarketCap !== undefined && (position.marketCap || 0) > criteria.maxMarketCap) return false
    
    if (criteria.minDividendYield !== undefined && (position.dividendYield || 0) < criteria.minDividendYield) return false
    if (criteria.maxDividendYield !== undefined && (position.dividendYield || 0) > criteria.maxDividendYield) return false
    
    if (criteria.minEPS !== undefined && (position.eps || 0) < criteria.minEPS) return false
    if (criteria.maxEPS !== undefined && (position.eps || 0) > criteria.maxEPS) return false
    
    if (criteria.minBeta !== undefined && (position.beta || 0) < criteria.minBeta) return false
    if (criteria.maxBeta !== undefined && (position.beta || 0) > criteria.maxBeta) return false
    
    // Performance filters
    if (criteria.minPnL !== undefined && position.ppl < criteria.minPnL) return false
    if (criteria.maxPnL !== undefined && position.ppl > criteria.maxPnL) return false
    
    if (criteria.minPnLPercent !== undefined && values.pplPercent < criteria.minPnLPercent) return false
    if (criteria.maxPnLPercent !== undefined && values.pplPercent > criteria.maxPnLPercent) return false
    
    // Boolean filters
    if (criteria.showOnlyProfitable && !values.isProfitable) return false
    if (criteria.showOnlyLosers && !values.isLoser) return false
    if (criteria.showOnlyDividendPayers && !values.hasDividend) return false
    
    return true
  })
}

// Sorting function
export function sortPositions(
  positions: FilterablePosition[],
  sortConfigs: SortConfig[],
  totalPortfolioValue?: number
): FilterablePosition[] {
  if (sortConfigs.length === 0) return positions
  
  return [...positions].sort((a, b) => {
    for (const config of sortConfigs) {
      const result = comparePositions(a, b, config.field, config.order, totalPortfolioValue)
      if (result !== 0) return result
    }
    return 0
  })
}

// Position comparison function
function comparePositions(
  a: FilterablePosition, 
  b: FilterablePosition, 
  field: SortField, 
  order: SortOrder,
  totalPortfolioValue?: number
): number {
  let aValue: string | number
  let bValue: string | number
  
  switch (field) {
    case 'ticker':
      aValue = a.ticker
      bValue = b.ticker
      break
    case 'companyName':
      aValue = a.companyName || a.ticker
      bValue = b.companyName || b.ticker
      break
    case 'sector':
      aValue = a.sector || ''
      bValue = b.sector || ''
      break
    case 'country':
      aValue = a.country || ''
      bValue = b.country || ''
      break
    case 'exchange':
      aValue = a.exchange || ''
      bValue = b.exchange || ''
      break
    case 'value':
      aValue = a.currentPrice * a.quantity
      bValue = b.currentPrice * b.quantity
      break
    case 'ppl':
      aValue = a.ppl
      bValue = b.ppl
      break
    case 'pplPercent':
      aValue = calculatePositionValues(a).pplPercent
      bValue = calculatePositionValues(b).pplPercent
      break
    case 'peRatio':
      aValue = a.peRatio || 0
      bValue = b.peRatio || 0
      break
    case 'marketCap':
      aValue = a.marketCap || 0
      bValue = b.marketCap || 0
      break
    case 'dividendYield':
      aValue = a.dividendYield || 0
      bValue = b.dividendYield || 0
      break
    case 'eps':
      aValue = a.eps || 0
      bValue = b.eps || 0
      break
    case 'beta':
      aValue = a.beta || 0
      bValue = b.beta || 0
      break
    case 'weight':
      if (totalPortfolioValue && totalPortfolioValue > 0) {
        aValue = ((a.currentPrice * a.quantity) / totalPortfolioValue) * 100
        bValue = ((b.currentPrice * b.quantity) / totalPortfolioValue) * 100
      } else {
        aValue = 0
        bValue = 0
      }
      break
    default:
      return 0
  }
  
  // Handle string comparison
  if (typeof aValue === 'string' && typeof bValue === 'string') {
    const result = aValue.localeCompare(bValue)
    return order === 'asc' ? result : -result
  }
  
  // Handle numeric comparison
  if (aValue < bValue) return order === 'asc' ? -1 : 1
  if (aValue > bValue) return order === 'asc' ? 1 : -1
  return 0
}

// Generate filter options from positions
export function generateFilterOptions(positions: FilterablePosition[]): FilterOptions {
  const sectors = new Set<string>()
  const countries = new Set<string>()
  const exchanges = new Set<string>()
  
  let minValue = Infinity
  let maxValue = -Infinity
  let minPE = Infinity
  let maxPE = -Infinity
  let minMarketCap = Infinity
  let maxMarketCap = -Infinity
  
  positions.forEach(position => {
    if (position.sector) sectors.add(position.sector)
    if (position.country) countries.add(position.country)
    if (position.exchange) exchanges.add(position.exchange)
    
    const value = position.currentPrice * position.quantity
    if (value < minValue) minValue = value
    if (value > maxValue) maxValue = value
    
    if (position.peRatio) {
      if (position.peRatio < minPE) minPE = position.peRatio
      if (position.peRatio > maxPE) maxPE = position.peRatio
    }
    
    if (position.marketCap) {
      if (position.marketCap < minMarketCap) minMarketCap = position.marketCap
      if (position.marketCap > maxMarketCap) maxMarketCap = position.marketCap
    }
  })
  
  return {
    sectors: Array.from(sectors).sort(),
    countries: Array.from(countries).sort(),
    exchanges: Array.from(exchanges).sort(),
    minValue: minValue === Infinity ? 0 : minValue,
    maxValue: maxValue === -Infinity ? 0 : maxValue,
    minPE: minPE === Infinity ? 0 : minPE,
    maxPE: maxPE === -Infinity ? 0 : maxPE,
    minMarketCap: minMarketCap === Infinity ? 0 : minMarketCap,
    maxMarketCap: maxMarketCap === -Infinity ? 0 : maxMarketCap,
  }
}

// Preset management
export function createPreset(
  name: string,
  description: string,
  criteria: FilterCriteria,
  sortConfig?: SortConfig[]
): FilterPreset {
  return {
    id: generatePresetId(),
    name,
    description,
    criteria,
    sortConfig,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function updatePreset(
  preset: FilterPreset,
  updates: Partial<Omit<FilterPreset, 'id' | 'createdAt'>>
): FilterPreset {
  return {
    ...preset,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

function generatePresetId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Default presets
export const defaultPresets: FilterPreset[] = [
  {
    id: 'profitable_positions',
    name: 'Profitable Positions',
    description: 'Show only positions with positive returns',
    criteria: {
      showOnlyProfitable: true,
    },
    sortConfig: [
      { field: 'ppl', order: 'desc' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'losing_positions',
    name: 'Losing Positions',
    description: 'Show only positions with negative returns',
    criteria: {
      showOnlyLosers: true,
    },
    sortConfig: [
      { field: 'ppl', order: 'asc' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'dividend_payers',
    name: 'Dividend Payers',
    description: 'Show only dividend-paying stocks',
    criteria: {
      showOnlyDividendPayers: true,
    },
    sortConfig: [
      { field: 'dividendYield', order: 'desc' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'low_pe_value',
    name: 'Low PE Value Stocks',
    description: 'Show stocks with PE ratio below 15',
    criteria: {
      maxPE: 15,
    },
    sortConfig: [
      { field: 'peRatio', order: 'asc' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'large_positions',
    name: 'Large Positions',
    description: 'Show positions worth more than $1000',
    criteria: {
      minValue: 1000,
    },
    sortConfig: [
      { field: 'value', order: 'desc' }
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

// Filter state management
export function createInitialFilterState(): FilterSortState {
  return {
    filters: {},
    sorts: [],
    presets: defaultPresets,
    activePresetId: undefined,
  }
}

export function resetFilters(state: FilterSortState): FilterSortState {
  return {
    ...state,
    filters: {},
    sorts: [],
    activePresetId: undefined,
  }
}

export function applyPreset(state: FilterSortState, presetId: string): FilterSortState {
  const preset = state.presets.find(p => p.id === presetId)
  if (!preset) return state
  
  return {
    ...state,
    filters: preset.criteria,
    sorts: preset.sortConfig || [],
    activePresetId: presetId,
  }
}

export function updateFilters(state: FilterSortState, filters: Partial<FilterCriteria>): FilterSortState {
  return {
    ...state,
    filters: { ...state.filters, ...filters },
    activePresetId: undefined, // Clear active preset when manually filtering
  }
}

export function updateSorts(state: FilterSortState, sorts: SortConfig[]): FilterSortState {
  return {
    ...state,
    sorts,
    activePresetId: undefined, // Clear active preset when manually sorting
  }
}

// Helper functions for UI
export function formatFilterValue(value: number, type: 'currency' | 'percentage' | 'number'): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
      return value.toString()
    default:
      return value.toString()
  }
}

export function getFieldLabel(field: SortField): string {
  const labels: Record<SortField, string> = {
    ticker: 'Ticker',
    companyName: 'Company Name',
    sector: 'Sector',
    country: 'Country',
    exchange: 'Exchange',
    value: 'Market Value',
    ppl: 'P&L',
    pplPercent: 'P&L %',
    peRatio: 'P/E Ratio',
    marketCap: 'Market Cap',
    dividendYield: 'Dividend Yield',
    eps: 'EPS',
    beta: 'Beta',
    weight: 'Portfolio Weight',
  }
  
  return labels[field] || field
} 