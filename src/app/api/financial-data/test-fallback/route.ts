import { NextResponse } from 'next/server'
import { financialDataService } from '@/lib/financial-data-service'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbols = searchParams.get('symbols')?.split(',') || ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA']
    
    console.log(`Testing fallback functionality for symbols: ${symbols.join(', ')}`)
    
    // Test multiple symbols to demonstrate fallback
    const startTime = Date.now()
    const fundamentalsResponse = await financialDataService.getMultipleFundamentals(symbols)
    const endTime = Date.now()
    
    // Get updated provider status after the requests
    const providerStatus = financialDataService.getProviderStatus()
    
    // Analyze results by source
    const resultsBySource: Record<string, number> = {}
    const resultDetails: Array<{
      symbol: string
      success: boolean
      source?: string
      confidence?: number
      hasData: boolean
      dataKeys?: string[]
    }> = []
    
    for (const symbol of symbols) {
      const data = fundamentalsResponse.data?.[symbol]
      if (data?.source) {
        resultsBySource[data.source] = (resultsBySource[data.source] || 0) + 1
      }
      
      resultDetails.push({
        symbol,
        success: !!data,
        source: data?.source,
        confidence: data?.confidence,
        hasData: !!data,
        dataKeys: data ? Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined) : undefined
      })
    }
    
    return NextResponse.json({
      success: true,
      data: {
        testInfo: {
          symbols: symbols,
          symbolCount: symbols.length,
          duration: `${endTime - startTime}ms`,
          overallSuccess: fundamentalsResponse.success
        },
        results: {
          bySource: resultsBySource,
          details: resultDetails,
          successCount: resultDetails.filter(r => r.success).length,
          failureCount: resultDetails.filter(r => !r.success).length
        },
        providerStatus: providerStatus,
        cacheStats: financialDataService.getCacheStats(),
        recommendations: {
          primaryProvider: Object.entries(resultsBySource).sort(([,a], [,b]) => b - a)[0]?.[0] || 'None',
          cacheHitRate: `${((fundamentalsResponse.data ? Object.keys(fundamentalsResponse.data).length : 0) / symbols.length * 100).toFixed(1)}%`,
          avgConfidence: resultDetails.filter(r => r.confidence).reduce((sum, r) => sum + (r.confidence || 0), 0) / resultDetails.filter(r => r.confidence).length || 0
        }
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Financial data fallback test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to test financial data fallback functionality',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 