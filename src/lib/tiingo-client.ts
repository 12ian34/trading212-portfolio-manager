import { env } from './env'

export interface TiingoFundamentals {
  ticker: string
  name: string
  description: string
  sector: string
  industry: string
  exchange: string
  currency: string
  country: string
  marketCap: number
  enterpriseValue: number
  peRatio: number
  pegRatio: number
  bookValue: number
  priceToBook: number
  beta: number
  eps: number
  dividendYield: number
  dividendsPerShare: number
  sharesOutstanding: number
  dailyList: boolean
  updatedDate: string
}

export interface TiingoMetaData {
  ticker: string
  name: string
  description: string
  startDate: string
  endDate: string
  exchangeCode: string
}

export interface TiingoFundamentalsMeta {
  ticker: string
  name: string
  description: string
  sector: string
  industry: string
  exchange: string
  currency: string
  country: string
  location: string
  marketCap: number
  [key: string]: string | number | boolean | undefined // For additional fields that may be present
}

export interface TiingoFundamentalsResponse {
  date: string
  marketCap: number
  enterpriseVal: number
  peRatio: number
  pbRatio: number
  trailingPEG1Y: number
  bookValue?: number
  beta?: number
  eps?: number
  dividendYield?: number
  dividendsPerShare?: number
  sharesOutstanding?: number
}

class TiingoClient {
  private readonly baseUrl = 'https://api.tiingo.com/tiingo'
  private readonly fundamentalsUrl = 'https://api.tiingo.com/tiingo/fundamentals'
  private readonly apiKey: string

  constructor() {
    this.apiKey = env.TIINGO_API_KEY
  }

  async getMetaData(ticker: string): Promise<TiingoMetaData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/daily/${ticker}?token=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Tiingo: Ticker ${ticker} not found`)
          return null
        }
        throw new Error(`Tiingo API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching Tiingo metadata for %s:', ticker, error)
      return null
    }
  }

  async getFundamentalsMeta(ticker: string): Promise<TiingoFundamentalsMeta | null> {
    try {
      const response = await fetch(
        `${this.fundamentalsUrl}/${ticker}/meta?token=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Tiingo: Fundamentals meta for ${ticker} not found`)
          return null
        }
        throw new Error(`Tiingo fundamentals API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching Tiingo fundamentals meta for %s:', ticker, error)
      return null
    }
  }

  async getFundamentalsStatements(ticker: string): Promise<Record<string, unknown> | null> {
    try {
      const response = await fetch(
        `${this.fundamentalsUrl}/${ticker}/statements?token=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Tiingo: Fundamentals statements for ${ticker} not found`)
          return null
        }
        throw new Error(`Tiingo statements API error: ${response.status}`)
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching Tiingo fundamentals statements for %s:', ticker, error)
      return null
    }
  }

  async getFundamentals(ticker: string): Promise<TiingoFundamentalsResponse | null> {
    try {
      const response = await fetch(
        `${this.fundamentalsUrl}/${ticker}/daily?token=${this.apiKey}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`Tiingo: Fundamentals for ${ticker} not found`)
          return null
        }
        throw new Error(`Tiingo API error: ${response.status}`)
      }

      const data = await response.json()
      
      // Tiingo returns an array, get the latest entry
      if (Array.isArray(data) && data.length > 0) {
        return data[0] // Most recent fundamentals
      }
      
      return data
    } catch (error) {
      console.error('Error fetching Tiingo fundamentals for %s:', ticker, error)
      return null
    }
  }

  async getCompanyOverview(ticker: string): Promise<TiingoFundamentals | null> {
    try {
      // First try to get fundamentals meta for sector/industry info
      const metaData = await this.getFundamentalsMeta(ticker)
      
      // Also try to get basic metadata
      const basicMeta = await this.getMetaData(ticker)
      
      // Try to get latest fundamentals for financial metrics
      const fundamentals = await this.getFundamentals(ticker)
      
      // Always use sector mapping regardless of API success/failure
      // Since Tiingo doesn't provide sector/industry info, we'll use a hardcoded mapping
      const sectorMapping: { [key: string]: { sector: string; industry: string } } = {
        'AAPL': { sector: 'Technology', industry: 'Consumer Electronics' },
        'MSFT': { sector: 'Technology', industry: 'Software' },
        'GOOGL': { sector: 'Technology', industry: 'Internet Services' },
        'GOOG': { sector: 'Technology', industry: 'Internet Services' },
        'AMZN': { sector: 'Consumer Discretionary', industry: 'E-commerce' },
        'TSLA': { sector: 'Consumer Discretionary', industry: 'Electric Vehicles' },
        'META': { sector: 'Technology', industry: 'Social Media' },
        'FB': { sector: 'Technology', industry: 'Social Media' },
        'NVDA': { sector: 'Technology', industry: 'Semiconductors' },
        'AMD': { sector: 'Technology', industry: 'Semiconductors' },
        'NFLX': { sector: 'Communication Services', industry: 'Streaming Media' },
        'COIN': { sector: 'Financial Services', industry: 'Cryptocurrency' },
        'PLTR': { sector: 'Technology', industry: 'Data Analytics' },
        'V': { sector: 'Financial Services', industry: 'Payment Processing' },
        'PYPL': { sector: 'Financial Services', industry: 'Payment Processing' },
        'IBM': { sector: 'Technology', industry: 'Enterprise Software' },
        'TSM': { sector: 'Technology', industry: 'Semiconductors' },
        'NVO': { sector: 'Healthcare', industry: 'Pharmaceuticals' },
        'IDXX': { sector: 'Healthcare', industry: 'Veterinary Diagnostics' },
        'LRCX': { sector: 'Technology', industry: 'Semiconductor Equipment' },
        'ABNB': { sector: 'Consumer Discretionary', industry: 'Travel & Hospitality' },
        'DOCU': { sector: 'Technology', industry: 'Cloud Software' },
        'WIX': { sector: 'Technology', industry: 'Website Development' },
        'PAYC': { sector: 'Technology', industry: 'Payroll Software' },
        'TCEHY': { sector: 'Technology', industry: 'Internet Services' },
        'BYDDY': { sector: 'Consumer Discretionary', industry: 'Electric Vehicles' }
      }

      const sectorInfo = sectorMapping[ticker] || { sector: 'Unknown', industry: 'Unknown' }

      // Combine all available data
      const result: TiingoFundamentals = {
        ticker: ticker,
        name: metaData?.name || basicMeta?.name || ticker,
        description: metaData?.description || basicMeta?.description || '',
        sector: sectorInfo.sector,
        industry: sectorInfo.industry,
        exchange: metaData?.exchange || basicMeta?.exchangeCode || 'Unknown',
        currency: metaData?.currency || 'USD',
        country: metaData?.country || metaData?.location || 'United States',
        marketCap: fundamentals?.marketCap || (typeof metaData?.marketCap === 'number' ? metaData.marketCap : 0),
        enterpriseValue: fundamentals?.enterpriseVal || 0,
        peRatio: fundamentals?.peRatio || 0,
        pegRatio: fundamentals?.trailingPEG1Y || 0,
        bookValue: fundamentals?.bookValue || 0,
        priceToBook: fundamentals?.pbRatio || 0,
        beta: fundamentals?.beta || 0,
        eps: fundamentals?.eps || 0,
        dividendYield: fundamentals?.dividendYield || 0,
        dividendsPerShare: fundamentals?.dividendsPerShare || 0,
        sharesOutstanding: fundamentals?.sharesOutstanding || 0,
        dailyList: true,
        updatedDate: new Date().toISOString()
      }

      return result
    } catch (error) {
      console.error('Error fetching Tiingo company overview for %s:', ticker, error)
      return null
    }
  }
}

export const tiingoClient = new TiingoClient() 