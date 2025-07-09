import { NextResponse } from 'next/server'
import { financialDataService } from '@/lib/financial-data-service'

export async function GET() {
  try {
    // Get provider status
    const providerStatus = financialDataService.getProviderStatus()
    
    // Get cache stats
    const cacheStats = financialDataService.getCacheStats()
    
    // Test a sample symbol to show fallback logic
    const sampleSymbol = 'AAPL'
    const sampleData = await financialDataService.getFundamentals(sampleSymbol)
    
    return NextResponse.json({
      success: true,
      data: {
        providers: providerStatus,
        cache: cacheStats,
        sampleTest: {
          symbol: sampleSymbol,
          success: sampleData.success,
          source: sampleData.data?.source,
          confidence: sampleData.data?.confidence,
          hasData: !!sampleData.data,
          error: sampleData.error
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Financial data status error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get financial data status',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 