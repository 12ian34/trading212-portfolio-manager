import { z } from 'zod'

const envSchema = z.object({
  TRADING212_API_KEY: z.string().min(1, 'Trading212 API key is required'),
  ALPHAVANTAGE_API_KEY: z.string().min(1, 'Alpha Vantage API key is required'),
  TIINGO_API_KEY: z.string().min(1, 'Tiingo API key is required'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

// Create a function to validate environment variables safely
function validateEnv() {
  return envSchema.parse({
    TRADING212_API_KEY: process.env.TRADING212_API_KEY,
    ALPHAVANTAGE_API_KEY: process.env.ALPHAVANTAGE_API_KEY,
    TIINGO_API_KEY: process.env.TIINGO_API_KEY,
    NODE_ENV: process.env.NODE_ENV || 'development',
  })
}

// Only validate environment variables on the server side
export const env = typeof window === 'undefined' ? validateEnv() : {
  TRADING212_API_KEY: '',
  ALPHAVANTAGE_API_KEY: '',
  TIINGO_API_KEY: '',
  NODE_ENV: 'development' as const,
}

export type Env = z.infer<typeof envSchema> 