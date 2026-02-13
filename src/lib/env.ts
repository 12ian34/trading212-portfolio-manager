import { z } from 'zod'

const envSchema = z.object({
  TRADING212_API_KEY: z.string().min(1, 'Trading212 API key is required'),
  TRADING212_API_SECRET: z.string().min(1, 'Trading212 API secret is required'),
  TIINGO_API_KEY: z.string().min(1, 'Tiingo API key is required'),
})

function validateEnv() {
  return envSchema.parse({
    TRADING212_API_KEY: process.env.TRADING212_API_KEY,
    TRADING212_API_SECRET: process.env.TRADING212_API_SECRET,
    TIINGO_API_KEY: process.env.TIINGO_API_KEY,
  })
}

// Only validate on the server side
export const env = typeof window === 'undefined'
  ? validateEnv()
  : { TRADING212_API_KEY: '', TRADING212_API_SECRET: '', TIINGO_API_KEY: '' }

export type Env = z.infer<typeof envSchema>
