import { NextResponse } from 'next/server'
import { env } from '@/lib/env'

export async function GET() {
  try {
    const response = await fetch('https://live.trading212.com/api/v0/equity/account/cash', {
      headers: {
        'Authorization': env.TRADING212_API_KEY,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Invalid Trading212 API key' },
          { status: 401 }
        )
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        )
      }
      throw new Error(`Trading212 API error: ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Trading212 account API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch account info' },
      { status: 500 }
    )
  }
} 