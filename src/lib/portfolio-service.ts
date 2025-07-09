import { trading212Client } from './api/trading212'
import { financialDataService, type CompanyFundamentals } from './financial-data-service'
import { 
  EnhancedPosition, 
  PortfolioAnalysis, 
  PortfolioMetrics,
  SectorAllocation,
  RegionAllocation,
  ApiResponse,
  Trading212Position
} from './types'

export class PortfolioService {
  /**
   * Get enhanced portfolio data by combining Trading212 positions with Alpha Vantage fundamentals
   */
  async getEnhancedPortfolio(): Promise<ApiResponse<PortfolioAnalysis>> {
    try {
      // Get Trading212 positions
      const t212Response = await trading212Client.getPositions()
      
      if (!t212Response.success) {
        return {
          success: false,
          data: null,
          error: t212Response.error || 'Failed to get Trading212 positions',
          timestamp: new Date().toISOString(),
        }
      }

      const positions = t212Response.data || []
      
      // Get symbols for Alpha Vantage lookup
      const symbols = positions.map(p => p.ticker)
      
      // Get fundamentals from unified financial data service (with fallback logic)
      const fundamentalsResponse = await financialDataService.getMultipleFundamentals(symbols)
      
      if (!fundamentalsResponse.success) {
        console.warn('Financial data unavailable, using Trading212 data only')
      }

      const fundamentals = fundamentalsResponse.data || {}
      
      // Combine data to create enhanced positions
      const enhancedPositions: EnhancedPosition[] = positions.map(position => {
        const fundamental = fundamentals[position.ticker]
        
        // Calculate derived values
        const value = position.currentPrice * position.quantity
        const pplPercent = value > 0 ? (position.ppl / value) * 100 : 0
        
        return {
          // Trading212 data
          ticker: position.ticker,
          quantity: position.quantity,
          averagePrice: position.averagePrice,
          currentPrice: position.currentPrice,
          value,
          ppl: position.ppl,
          pplPercent,
          initialFillDate: position.initialFillDate,
          
          // Financial data from unified service (with fallbacks)
          companyName: fundamental?.name || position.ticker,
          sector: fundamental?.sector || 'Unknown',
          industry: fundamental?.industry || 'Unknown',
          country: fundamental?.country || 'Unknown',
          exchange: fundamental?.exchange || 'Unknown',
          marketCap: fundamental?.marketCap,
          peRatio: fundamental?.peRatio,
          eps: fundamental?.eps,
          dividendYield: fundamental?.dividendYield,
          bookValue: fundamental?.bookValue,
          beta: fundamental?.beta,
          
          // Calculated metrics
          weight: 0, // Will be calculated below
          riskScore: this.calculateRiskScore(position, fundamental),
          
          // Display helpers
          change: position.ppl,
          changePercent: pplPercent,
          formattedValue: `$${value.toFixed(2)}`,
        }
      })

      // Calculate weights
      const totalValue = enhancedPositions.reduce((sum, p) => sum + p.value, 0)
      enhancedPositions.forEach(p => {
        p.weight = totalValue > 0 ? (p.value / totalValue) * 100 : 0
      })

      // Calculate portfolio metrics
      const metrics = this.calculatePortfolioMetrics(enhancedPositions)
      
      // Calculate allocations
      const sectorAllocation = this.calculateSectorAllocation(enhancedPositions)
      const regionAllocation = this.calculateRegionAllocation(enhancedPositions)

      return {
        success: true,
        data: {
          positions: enhancedPositions,
          metrics,
          sectorAllocation,
          regionAllocation,
          lastUpdated: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get enhanced portfolio data',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Calculate risk score for a position
   */
  private calculateRiskScore(position: Trading212Position, fundamental: CompanyFundamentals | undefined): number {
    let score = 50 // Base score
    
    // Adjust based on volatility (beta)
    if (fundamental?.beta) {
      const beta = fundamental.beta
      if (beta > 1.5) score += 20
      else if (beta > 1.2) score += 10
      else if (beta < 0.8) score -= 10
    }
    
    // Adjust based on P/E ratio
    if (fundamental?.peRatio) {
      const pe = fundamental.peRatio
      if (pe > 30) score += 15
      else if (pe > 20) score += 5
      else if (pe < 10) score -= 5
    }
    
    // Adjust based on position size
    const positionValue = position.currentPrice * position.quantity
    if (positionValue > 10000) score += 10
    else if (positionValue < 1000) score -= 5
    
    return Math.max(0, Math.min(100, score))
  }

  /**
   * Calculate overall portfolio metrics
   */
  private calculatePortfolioMetrics(positions: EnhancedPosition[]): PortfolioMetrics {
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
    const totalPnL = positions.reduce((sum, p) => sum + p.ppl, 0)
    const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0
    
    // Calculate diversification score (inverse of concentration)
    const sectorConcentration = this.calculateHHI(positions, 'sector')
    const regionConcentration = this.calculateHHI(positions, 'country')
    const diversificationScore = Math.max(0, 100 - (sectorConcentration + regionConcentration) / 2)
    
    // Calculate risk score
    const riskScore = positions.reduce((sum, p) => sum + (p.riskScore || 50) * p.weight, 0) / 100
    
    // Calculate averages
    const validPEs = positions.filter(p => p.peRatio).map(p => p.peRatio!)
    const averagePE = validPEs.length > 0 ? validPEs.reduce((sum, pe) => sum + pe, 0) / validPEs.length : undefined
    
    const validEPS = positions.filter(p => p.eps).map(p => p.eps!)
    const averageEPS = validEPS.length > 0 ? validEPS.reduce((sum, eps) => sum + eps, 0) / validEPS.length : undefined
    
    const validDividends = positions.filter(p => p.dividendYield).map(p => p.dividendYield!)
    const dividendYield = validDividends.length > 0 ? validDividends.reduce((sum, d) => sum + d, 0) / validDividends.length : undefined

    return {
      totalValue,
      totalPnL,
      totalPnLPercent,
      diversificationScore,
      riskScore,
      sectorConcentration,
      regionConcentration,
      averagePE,
      averageEPS,
      dividendYield,
    }
  }

  /**
   * Calculate Herfindahl-Hirschman Index for concentration
   */
  private calculateHHI(positions: EnhancedPosition[], field: keyof EnhancedPosition): number {
    const groups = positions.reduce((acc, p) => {
      const key = String(p[field])
      acc[key] = (acc[key] || 0) + p.weight
      return acc
    }, {} as Record<string, number>)
    
    return Object.values(groups).reduce((sum, weight) => sum + weight * weight, 0)
  }

  /**
   * Calculate sector allocation
   */
  private calculateSectorAllocation(positions: EnhancedPosition[]): SectorAllocation[] {
    const sectors = positions.reduce((acc, p) => {
      const sector = p.sector
      if (!acc[sector]) {
        acc[sector] = { value: 0, count: 0 }
      }
      acc[sector].value += p.value
      acc[sector].count += 1
      return acc
    }, {} as Record<string, { value: number; count: number }>)
    
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
    
    return Object.entries(sectors).map(([sector, data]) => ({
      sector,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      count: data.count,
    }))
  }

  /**
   * Calculate region allocation
   */
  private calculateRegionAllocation(positions: EnhancedPosition[]): RegionAllocation[] {
    const regions = positions.reduce((acc, p) => {
      const country = p.country
      const region = this.getRegionFromCountry(country)
      const key = `${region}|${country}`
      
      if (!acc[key]) {
        acc[key] = { value: 0, count: 0, region, country }
      }
      acc[key].value += p.value
      acc[key].count += 1
      return acc
    }, {} as Record<string, { value: number; count: number; region: string; country: string }>)
    
    const totalValue = positions.reduce((sum, p) => sum + p.value, 0)
    
    return Object.values(regions).map(data => ({
      region: data.region,
      country: data.country,
      value: data.value,
      percentage: totalValue > 0 ? (data.value / totalValue) * 100 : 0,
      count: data.count,
    }))
  }

  /**
   * Get region from country
   */
  private getRegionFromCountry(country: string): string {
    const regionMap: Record<string, string> = {
      'USA': 'North America',
      'United States': 'North America',
      'Canada': 'North America',
      'Mexico': 'North America',
      'Germany': 'Europe',
      'United Kingdom': 'Europe',
      'France': 'Europe',
      'Italy': 'Europe',
      'Spain': 'Europe',
      'Netherlands': 'Europe',
      'Switzerland': 'Europe',
      'Japan': 'Asia-Pacific',
      'China': 'Asia-Pacific',
      'South Korea': 'Asia-Pacific',
      'Australia': 'Asia-Pacific',
      'India': 'Asia-Pacific',
      'Singapore': 'Asia-Pacific',
      'Brazil': 'South America',
      'Argentina': 'South America',
      'Chile': 'South America',
    }
    
    return regionMap[country] || 'Other'
  }

  /**
   * Test API connections
   */
  async testConnections(): Promise<{ trading212: boolean; financialData: boolean }> {
    const [t212Test, fdTest] = await Promise.all([
      trading212Client.testConnection(),
      financialDataService.getFundamentals('AAPL'), // Test with a common symbol
    ])
    
    return {
      trading212: t212Test.success && Boolean(t212Test.data),
      financialData: fdTest.success && Boolean(fdTest.data),
    }
  }
}

// Export singleton instance
export const portfolioService = new PortfolioService() 