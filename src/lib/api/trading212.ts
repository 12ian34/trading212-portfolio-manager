import axios, { AxiosInstance, AxiosError } from 'axios'
import { env } from '@/lib/env'
import { 
  Trading212Position, 
  Trading212Account, 
  Trading212PositionSchema, 
  Trading212AccountSchema,
  ApiResponse 
} from '@/lib/types'

class Trading212ApiClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: 'https://live.trading212.com/api/v0',
      headers: {
        'Authorization': `Bearer ${env.TRADING212_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    })

    // Add request/response interceptors
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Trading212] ${config.method?.toUpperCase()} ${config.url}`)
        return config
      },
      (error) => {
        console.error('[Trading212] Request error:', error)
        return Promise.reject(error)
      }
    )

    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Trading212] ${response.status} ${response.config.url}`)
        return response
      },
      (error: AxiosError) => {
        console.error('[Trading212] Response error:', error.response?.status, error.message)
        return Promise.reject(this.handleError(error))
      }
    )
  }

  private handleError<T>(error: AxiosError): ApiResponse<T> {
    const timestamp = new Date().toISOString()
    
    if (error.response?.status === 401) {
      return {
        success: false,
        data: null,
        error: 'Invalid Trading212 API key. Please check your configuration.',
        timestamp,
      }
    }

    if (error.response?.status === 429) {
      return {
        success: false,
        data: null,
        error: 'Trading212 API rate limit exceeded. Please try again later.',
        timestamp,
      }
    }

    if (error.response?.status === 503) {
      return {
        success: false,
        data: null,
        error: 'Trading212 API is temporarily unavailable. Please try again later.',
        timestamp,
      }
    }

    return {
      success: false,
      data: null,
      error: error.message || 'An error occurred while connecting to Trading212 API.',
      timestamp,
    }
  }

     /**
    * Get account information
    */
   async getAccount(): Promise<ApiResponse<Trading212Account>> {
     try {
       const response = await this.client.get('/equity/account/cash')
       const validatedData = Trading212AccountSchema.parse(response.data)
       
       return {
         success: true,
         data: validatedData,
         timestamp: new Date().toISOString(),
       }
     } catch (error) {
       if (error instanceof AxiosError) {
         return this.handleError(error) as ApiResponse<Trading212Account>
       }
       return {
         success: false,
         data: null,
         error: 'Failed to validate account data.',
         timestamp: new Date().toISOString(),
       }
     }
   }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<ApiResponse<Trading212Position[]>> {
    try {
      const response = await this.client.get('/equity/portfolio')
      const validatedData = response.data.map((position: unknown) =>
        Trading212PositionSchema.parse(position)
      )
      
      return {
        success: true,
        data: validatedData,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        return this.handleError(error)
      }
      return {
        success: false,
        data: null,
        error: 'Failed to validate positions data.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get specific position by ticker
   */
  async getPosition(ticker: string): Promise<ApiResponse<Trading212Position | null>> {
    try {
      const positionsResponse = await this.getPositions()
      
      if (!positionsResponse.success) {
        return positionsResponse as ApiResponse<Trading212Position | null>
      }

      const position = positionsResponse.data?.find(p => p.ticker === ticker) || null
      
      return {
        success: true,
        data: position,
        timestamp: new Date().toISOString(),
      }
    } catch (_error) {
      return {
        success: false,
        data: null,
        error: `Failed to get position for ${ticker}.`,
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(): Promise<ApiResponse<{ account: Trading212Account; positions: Trading212Position[] }>> {
    try {
      const [accountResponse, positionsResponse] = await Promise.all([
        this.getAccount(),
        this.getPositions(),
      ])

      if (!accountResponse.success) {
        return accountResponse as ApiResponse<{ account: Trading212Account; positions: Trading212Position[] }>
      }

      if (!positionsResponse.success) {
        return positionsResponse as ApiResponse<{ account: Trading212Account; positions: Trading212Position[] }>
      }

      return {
        success: true,
        data: {
          account: accountResponse.data!,
          positions: positionsResponse.data!,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (_error) {
      return {
        success: false,
        data: null,
        error: 'Failed to get portfolio summary.',
        timestamp: new Date().toISOString(),
      }
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.client.get('/equity/account/cash')
      
      return {
        success: true,
        data: response.status === 200,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      if (error instanceof AxiosError) {
        return this.handleError(error) as ApiResponse<boolean>
      }
      return {
        success: false,
        data: false,
        error: 'Failed to test Trading212 connection.',
        timestamp: new Date().toISOString(),
      }
    }
  }
}

// Export singleton instance
export const trading212Client = new Trading212ApiClient()
export type { Trading212Position, Trading212Account } 