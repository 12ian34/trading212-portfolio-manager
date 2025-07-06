"use client"

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioStatus } from "@/components/portfolio-status";
import { useState } from "react";
import { CheckCircle, XCircle, Loader2, DollarSign, PieChart, Activity, BarChart3, Globe, Building2, AlertTriangle } from "lucide-react";
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
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');

  const handleConnectTrading212 = async () => {
    setIsConnecting(true);
    setConnectionStatus('idle');
    setConnectionMessage('');

    try {
      // Test Trading212 API connection using cache
      const data = await trading212Cache.getPositions();
      setConnectionStatus('success');
      setConnectionMessage(`Successfully connected! Found ${data.length || 0} positions.`);
    } catch (error) {
      setConnectionStatus('error');
      setConnectionMessage(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleViewDemo = () => {
    // For now, just scroll to the demo content below
    const demoSection = document.getElementById('demo-content');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Enhanced Welcome Section */}
        <div className="text-center space-y-6 py-12">
          <div className="space-y-4">
            <Badge variant="secondary" className="px-4 py-2 text-sm font-medium">
              <Activity className="h-4 w-4 mr-2" />
              Real-time Portfolio Analytics
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Portfolio Risk Analysis
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4 sm:px-0">
              Comprehensive analysis of your Trading212 portfolio with intelligent risk assessment, 
              sector diversification insights, and data-driven rebalancing recommendations
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={handleConnectTrading212}
              disabled={isConnecting}
              className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3 animate-spin" />
                  <span className="hidden sm:inline">Connecting to Trading212...</span>
                  <span className="sm:hidden">Connecting...</span>
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
                  <span className="hidden sm:inline">Connect Trading212</span>
                  <span className="sm:hidden">Connect</span>
                </>
              )}
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={handleViewDemo}
              className="w-full sm:w-auto px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-medium"
            >
              <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 sm:mr-3" />
              <span className="hidden sm:inline">View Demo Dashboard</span>
              <span className="sm:hidden">Demo</span>
            </Button>
          </div>
          
          {/* Enhanced Connection Status */}
          {connectionStatus !== 'idle' && (
            <div className="mt-8 flex justify-center">
              <Card className={`p-6 border-2 ${
                connectionStatus === 'success' 
                  ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/50' 
                  : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/50'
              }`}>
                <div className="flex items-center gap-4">
                  {connectionStatus === 'success' ? (
                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                  )}
                  <div>
                    <h3 className={`font-semibold text-lg ${
                      connectionStatus === 'success' 
                        ? 'text-green-900 dark:text-green-100' 
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {connectionStatus === 'success' ? 'Connection Successful!' : 'Connection Failed'}
                    </h3>
                    <p className={`${
                      connectionStatus === 'success' 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {connectionMessage}
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Portfolio Status - Enhanced */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-center">Portfolio Status</h2>
          <PortfolioStatus />
        </div>

        {/* Enhanced Portfolio Overview Widgets */}
        <div id="demo-content" className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Portfolio Overview</h2>
            <p className="text-muted-foreground">Comprehensive metrics and performance indicators</p>
          </div>
          
          <PortfolioOverviewWidgets />
        </div>

        {/* Enhanced Tabs Section */}
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold">Portfolio Analysis</h2>
            <p className="text-muted-foreground">Detailed breakdown and risk assessment tools</p>
          </div>
          
          <Tabs defaultValue="enhanced" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid grid-cols-3 md:grid-cols-6 h-auto p-1 bg-muted/50 w-full max-w-4xl">
                <TabsTrigger value="enhanced" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                  <Activity className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Enhanced</span>
                  <span className="sm:hidden">Enh</span>
                </TabsTrigger>
                <TabsTrigger value="positions" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                  <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Basic</span>
                  <span className="sm:hidden">Basic</span>
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
              <TabsContent value="enhanced" className="p-6 space-y-4">
                <EnrichedPositionsTable />
              </TabsContent>
              
              <TabsContent value="positions" className="p-6 space-y-4">
                <RealPositionsTable />
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
      </div>
    </div>
  );
}
