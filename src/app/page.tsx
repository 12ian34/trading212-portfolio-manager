"use client"

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioStatus } from "@/components/portfolio-status";
import { RealPositionsTable } from "@/components/real-positions-table";
import { EnrichedPositionsTable } from "@/components/enriched-positions-table";
import { SectorAllocation } from "@/components/sector-allocation";
import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { trading212Cache } from "@/lib/trading212-cache";

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
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Portfolio Risk Analysis</h1>
        <p className="text-lg text-muted-foreground">
          Comprehensive analysis of your Trading212 portfolio with risk assessment and balancing recommendations
        </p>
        <div className="flex gap-4 justify-center">
          <Button 
            size="lg" 
            onClick={handleConnectTrading212}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              'Connect Trading212'
            )}
          </Button>
          <Button variant="outline" size="lg" onClick={handleViewDemo}>
            View Demo
          </Button>
        </div>
        
        {/* Connection Status */}
        {connectionStatus !== 'idle' && (
          <div className="mt-4 flex items-center justify-center">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background border">
              {connectionStatus === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className={`font-medium ${
                connectionStatus === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
              }`}>
                {connectionMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Portfolio Status - Test state management */}
      <PortfolioStatus />

      {/* Portfolio Overview Cards */}
      <div id="demo-content" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Total Portfolio Value</CardTitle>
            <CardDescription>Current market value</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$12,345.67</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">+2.34%</Badge>
              <span className="text-sm text-muted-foreground">vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Risk Score</CardTitle>
            <CardDescription>Portfolio risk assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Medium</div>
            <Progress value={65} className="mt-2" />
            <div className="text-sm text-muted-foreground mt-1">65/100</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Diversification</CardTitle>
            <CardDescription>Sector distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Good</div>
            <div className="flex gap-2 mt-2">
              <Badge>Tech 35%</Badge>
              <Badge variant="outline">Finance 25%</Badge>
              <Badge variant="outline">Healthcare 20%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="enhanced" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
          <TabsTrigger value="positions">Basic</TabsTrigger>
          <TabsTrigger value="sectors">Sectors</TabsTrigger>
          <TabsTrigger value="regions">Regions</TabsTrigger>
          <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
        </TabsList>
        
        <TabsContent value="enhanced" className="space-y-4">
          <EnrichedPositionsTable />
        </TabsContent>
        
        <TabsContent value="positions" className="space-y-4">
          <RealPositionsTable />
        </TabsContent>
        
        <TabsContent value="sectors" className="space-y-4">
          <SectorAllocation />
        </TabsContent>
        
        <TabsContent value="regions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Geographic Distribution</CardTitle>
              <CardDescription>Portfolio exposure by region</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>United States</span>
                  <span>70%</span>
                </div>
                <Progress value={70} />
                <div className="flex items-center justify-between">
                  <span>Europe</span>
                  <span>20%</span>
                </div>
                <Progress value={20} />
                <div className="flex items-center justify-between">
                  <span>Asia-Pacific</span>
                  <span>10%</span>
                </div>
                <Progress value={10} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Analysis</CardTitle>
              <CardDescription>Portfolio risk assessment and recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">Concentration Risk</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Your portfolio is heavily concentrated in technology stocks (35%). Consider diversifying.
                  </p>
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">Recommendation</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Consider adding exposure to energy, utilities, or emerging markets for better diversification.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
