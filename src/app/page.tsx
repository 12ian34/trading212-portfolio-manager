"use client"

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioStatus } from "@/components/portfolio-status";
import { useState, useEffect } from "react";
import { XCircle, Loader2, DollarSign, PieChart, Activity, Globe, Building2, AlertTriangle, Zap } from "lucide-react";
import { trading212Cache } from "@/lib/trading212-cache";
import { 
  PositionsTableSkeleton, 
  SectorAnalysisSkeleton, 
  ChartSkeleton, 
  WidgetsSkeleton 
} from "@/components/loading-skeleton";
import dynamic from "next/dynamic";

// Lazy load heavy components with loading states
const EnrichedPositionsTable = dynamic(
  () => import("@/components/enriched-positions-table").then(mod => ({ default: mod.EnrichedPositionsTable })),
  { 
    loading: () => <PositionsTableSkeleton />,
    ssr: false
  }
);

const RealPositionsTable = dynamic(
  () => import("@/components/real-positions-table").then(mod => ({ default: mod.RealPositionsTable })),
  { 
    loading: () => <PositionsTableSkeleton />,
    ssr: false
  }
);

const SectorAllocation = dynamic(
  () => import("@/components/sector-allocation").then(mod => ({ default: mod.SectorAllocation })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

const GeographicAllocation = dynamic(
  () => import("@/components/geographic-allocation").then(mod => ({ default: mod.GeographicAllocation })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

const ExchangeAllocation = dynamic(
  () => import("@/components/exchange-allocation").then(mod => ({ default: mod.ExchangeAllocation })),
  { 
    loading: () => <ChartSkeleton />,
    ssr: false
  }
);

const RiskAnalysis = dynamic(
  () => import("@/components/risk-analysis").then(mod => ({ default: mod.RiskAnalysis })),
  { 
    loading: () => <SectorAnalysisSkeleton />,
    ssr: false
  }
);

const PortfolioOverviewWidgets = dynamic(
  () => import("@/components/portfolio-overview-widgets").then(mod => ({ default: mod.PortfolioOverviewWidgets })),
  { 
    loading: () => <WidgetsSkeleton />,
    ssr: false
  }
);





export default function Home() {
  const [isConnecting, setIsConnecting] = useState(true); // Start as true for automatic connection
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');
  const [positionsCount, setPositionsCount] = useState<number>(0);
  interface PortfolioMetrics {
    totalValue: number;
    dayChange: number;
    dayChangePercent: number;
    weekChange: number;
    monthChange: number;
    yearChange: number;
    volatility: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    diversificationScore: number;
    riskScore: number;
    performanceGrade: string;
    lastUpdated: string;
  }

  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);

  // Calculate portfolio metrics from Trading212 positions
  const calculatePortfolioMetrics = async () => {
    try {
      const positions = await trading212Cache.getPositions();
      
      if (positions.length === 0) {
        setPortfolioMetrics(null);
        return;
      }

      // Get account data for accurate portfolio totals
      // Trading212 handles all currency conversions internally
      const accountData = await trading212Cache.getAccount();
      const totalValue = accountData.total || 0;
      const totalPnL = accountData.ppl || 0;
      const investedAmount = accountData.invested || 0;
      const dayChangePercent = investedAmount > 0 ? (totalPnL / investedAmount) * 100 : 0;
      
      // Calculate performance grade based on overall P&L
      const getPerformanceGrade = (pnlPercent: number) => {
        if (pnlPercent >= 15) return 'A+';
        if (pnlPercent >= 10) return 'A';
        if (pnlPercent >= 5) return 'B+';
        if (pnlPercent >= 0) return 'B';
        if (pnlPercent >= -5) return 'C+';
        if (pnlPercent >= -10) return 'C';
        return 'D';
      };

      // Calculate basic diversification (number of positions)
      const diversificationScore = Math.min(100, positions.length * 5); // 5 points per position, max 100
      
      // Calculate risk score based on portfolio concentration
      const topPositionWeight = positions.length > 0 ? 
        Math.max(...positions.map(pos => ((pos.currentPrice * pos.quantity) / totalValue) * 100)) : 0;
      const riskScore = Math.min(100, topPositionWeight * 2); // Higher concentration = higher risk

      // Calculate win rate (percentage of profitable positions)
      const profitablePositions = positions.filter(pos => pos.ppl > 0).length;
      const winRate = positions.length > 0 ? (profitablePositions / positions.length) * 100 : 0;

      // Calculate average win and loss
      const winners = positions.filter(pos => pos.ppl > 0);
      const losers = positions.filter(pos => pos.ppl < 0);
      const avgWin = winners.length > 0 ? winners.reduce((sum, pos) => sum + pos.ppl, 0) / winners.length : 0;
      const avgLoss = losers.length > 0 ? losers.reduce((sum, pos) => sum + pos.ppl, 0) / losers.length : 0;

      // Simple volatility estimate based on P&L distribution
      const pnlValues = positions.map(pos => ((pos.ppl / (pos.currentPrice * pos.quantity)) * 100));
      const avgPnL = pnlValues.reduce((sum, val) => sum + val, 0) / pnlValues.length;
      const variance = pnlValues.reduce((sum, val) => sum + Math.pow(val - avgPnL, 2), 0) / pnlValues.length;
      const volatility = Math.sqrt(variance);

      // Simple Sharpe ratio estimate (return/volatility)
      const sharpeRatio = volatility > 0 ? dayChangePercent / volatility : 0;

      // Max drawdown - simplified as largest single loss percentage
      const maxDrawdown = Math.min(0, Math.min(...pnlValues));

      const metrics = {
        totalValue,
        dayChange: totalPnL, // All-time P&L
        dayChangePercent, // All-time return percentage
        weekChange: 0, // Not used anymore
        monthChange: 0, // Not used anymore
        yearChange: 0, // Not used anymore
        volatility: Math.abs(volatility),
        sharpeRatio: Math.max(0, sharpeRatio),
        maxDrawdown,
        winRate,
        avgWin: Math.abs(avgWin),
        avgLoss: Math.abs(avgLoss),
        diversificationScore,
        riskScore,
        performanceGrade: getPerformanceGrade(dayChangePercent),
        lastUpdated: new Date().toISOString()
      };

      setPortfolioMetrics(metrics);
    } catch (error) {
      console.error('Error calculating portfolio metrics:', error);
      setPortfolioMetrics(null);
    }
  };

  const handleConnectTrading212 = async () => {
    setIsConnecting(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      // Test Trading212 API connection using cache
      const data = await trading212Cache.getPositions();
      setConnectionStatus('success');
      setConnectionMessage(`Successfully connected! Found ${data.length || 0} positions.`);
      setPositionsCount(data.length || 0);
      
      // Calculate portfolio metrics from the real data
      await calculatePortfolioMetrics();
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Automatically connect on component mount
  useEffect(() => {
    handleConnectTrading212();
  }, []);



  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Simplified Header */}
        <div className="text-center space-y-4 py-6">
          <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
            <Activity className="h-4 w-4 mr-2" />
            Portfolio Analytics
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Trading212 Portfolio Analysis
          </h1>
          
          {/* Connection Status - Only show if loading or error */}
          {(isConnecting || connectionStatus === 'error') && (
            <div className="mt-6 flex justify-center">
              <Card className={`p-4 border-2 ${
                connectionStatus === 'error' 
                  ? 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50' 
                  : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/50'
              }`}>
                <div className="flex items-center gap-3">
                  {isConnecting ? (
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                  ) : (
                    <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <h3 className={`font-semibold ${
                      connectionStatus === 'error' 
                        ? 'text-red-900 dark:text-red-100' 
                        : 'text-blue-900 dark:text-blue-100'
                    }`}>
                      {isConnecting ? 'Connecting to Trading212...' : 'Connection Failed'}
                    </h3>
                    {connectionMessage && (
                      <p className={`text-sm ${
                        connectionStatus === 'error' 
                          ? 'text-red-700 dark:text-red-300' 
                          : 'text-blue-700 dark:text-blue-300'
                      }`}>
                        {connectionMessage}
                      </p>
                    )}
                  </div>
                  {connectionStatus === 'error' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleConnectTrading212}
                      className="ml-auto"
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Portfolio Overview - Show immediately after connection */}
        {connectionStatus === 'success' && (
          <>
                         <div className="space-y-4">
               <div className="text-center space-y-4">
                 <div className="space-y-2">
                   <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                   <p className="text-muted-foreground">
                     {positionsCount > 0 
                       ? `${positionsCount} positions loaded - showing basic data` 
                       : 'No positions found in your portfolio'
                     }
                   </p>
                 </div>
                 
                 {/* Unified Enrich Data Button */}
                 {positionsCount > 0 && (
                   <div className="flex justify-center">
                     <Button
                       size="lg"
                       className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                       onClick={() => {
                         // TODO: Implement unified enrichment logic
                         console.log('Enrich portfolio data clicked')
                       }}
                     >
                       <Zap className="h-5 w-5 mr-2" />
                       Enrich Portfolio Data
                     </Button>
                   </div>
                 )}
               </div>
               
               <PortfolioOverviewWidgets metrics={portfolioMetrics || undefined} />
             </div>

            {/* Portfolio Analysis Tabs - Default to Basic positions */}
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">Portfolio Analysis</h2>
                <p className="text-muted-foreground">Your positions with basic data - enrich for detailed analysis</p>
              </div>
              
              <Tabs defaultValue="positions" className="w-full">
                <div className="flex justify-center mb-8">
                  <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50 w-full max-w-4xl">
                    <TabsTrigger value="positions" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Basic</span>
                      <span className="sm:hidden">Basic</span>
                    </TabsTrigger>
                    <TabsTrigger value="enhanced" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Enhanced</span>
                      <span className="sm:hidden">Enh</span>
                    </TabsTrigger>
                    <TabsTrigger value="sectors" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <PieChart className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Sectors</span>
                      <span className="sm:hidden">Sec</span>
                    </TabsTrigger>
                    <TabsTrigger value="regions" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <Globe className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Regions</span>
                      <span className="sm:hidden">Reg</span>
                    </TabsTrigger>
                    <TabsTrigger value="exchanges" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <Building2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Exchanges</span>
                      <span className="sm:hidden">Exc</span>
                    </TabsTrigger>
                    <TabsTrigger value="risk" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Risk</span>
                      <span className="sm:hidden">Risk</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
                
                <div className="bg-card rounded-lg border shadow-sm">
                  <TabsContent value="positions" className="p-6 space-y-4">
                    <RealPositionsTable />
                  </TabsContent>
                  
                  <TabsContent value="enhanced" className="p-6 space-y-4">
                    <EnrichedPositionsTable />
                  </TabsContent>
                  
                  <TabsContent value="sectors" className="p-6 space-y-4">
                    <SectorAllocation />
                  </TabsContent>
                  
                  <TabsContent value="regions" className="p-6 space-y-4">
                    <GeographicAllocation />
                  </TabsContent>
                  
                  <TabsContent value="exchanges" className="p-6 space-y-4">
                    <ExchangeAllocation />
                  </TabsContent>
                  
                  <TabsContent value="risk" className="p-6 space-y-4">
                    <RiskAnalysis />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </>
        )}

                 {/* Portfolio Status - Enhanced */}
         <div className="space-y-4">
           <h2 className="text-2xl font-bold text-center">Portfolio Status</h2>
           <PortfolioStatus />
         </div>

        {/* Additional content when not connected */}
        {connectionStatus !== 'success' && !isConnecting && (
          <div id="demo-content" className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold">Portfolio Overview</h2>
              <p className="text-muted-foreground">Connect to Trading212 to see your portfolio data</p>
            </div>
            
            <PortfolioOverviewWidgets metrics={portfolioMetrics || undefined} />
          </div>
        )}
      </div>
    </div>
  );
}
