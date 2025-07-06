import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol parameter is required' },
        { status: 400 }
      )
    }

    const response = await fetch(
      `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${env.ALPHAVANTAGE_API_KEY}`
    )

    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`)
    }

    const data = await response.json()

    // Check for API limit or error responses
    if (data.Note && data.Note.includes('API call frequency')) {
      return NextResponse.json(
        { error: 'Alpha Vantage API rate limit exceeded' },
        { status: 429 }
      )
    }

    if (data.Information && data.Information.includes('Invalid API call')) {
      return NextResponse.json(
        { error: 'Invalid Alpha Vantage API call' },
        { status: 400 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Alpha Vantage API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stock overview' },
      { status: 500 }
    )
  }
} 