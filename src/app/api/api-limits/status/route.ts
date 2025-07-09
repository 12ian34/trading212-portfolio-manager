import { NextResponse } from 'next/server'
import { getAllApiStatus, resetApiUsage, recordApiCall } from '@/lib/api-limits-service'

/**
 * GET /api/api-limits/status
 * Returns current API usage status across all providers
 */
export async function GET() {
  try {
    const status = getAllApiStatus()
    
    return NextResponse.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('API limits status error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to get API limits status',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/api-limits/status
 * Test endpoint to simulate API calls or reset usage
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action, provider, count = 1 } = body

    if (action === 'reset') {
      resetApiUsage(provider)
      return NextResponse.json({
        success: true,
        message: provider ? `Reset usage for ${provider}` : 'Reset usage for all providers',
        timestamp: new Date().toISOString()
      })
    }

    if (action === 'simulate' && provider) {
      for (let i = 0; i < count; i++) {
        recordApiCall(provider, true, undefined)
      }
      
      const status = getAllApiStatus()
      return NextResponse.json({
        success: true,
        message: `Simulated ${count} API calls for ${provider}`,
        data: status,
        timestamp: new Date().toISOString()
      })
    }

    return NextResponse.json(
      { 
        success: false,
        error: 'Invalid action. Use "reset" or "simulate" with provider name.',
        timestamp: new Date().toISOString()
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('API limits action error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process API limits action',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 