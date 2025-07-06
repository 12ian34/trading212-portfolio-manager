import jsPDF from 'jspdf'
import Papa from 'papaparse'
import { Trading212Position } from './types'

export interface ExportablePosition extends Trading212Position {
  companyName?: string
  sector?: string
  industry?: string
  country?: string
  exchange?: string
  marketCap?: number
  peRatio?: number
  eps?: number
  marketValue?: number
  pnlPercent?: number
}

export interface PortfolioSummary {
  totalValue: number
  totalPnL: number
  totalPnLPercent: number
  positionCount: number
  sectorCount: number
  countryCount: number
  avgPeRatio: number
  topSector: string
  topCountry: string
  riskScore: number
  diversificationScore: number
  timestamp: string
}

export interface SectorAllocation {
  sector: string
  value: number
  percentage: number
  positionCount: number
  avgPeRatio: number
  pnl: number
  pnlPercent: number
}

export interface RegionalAllocation {
  country: string
  value: number
  percentage: number
  positionCount: number
  sectors: string[]
  pnl: number
  pnlPercent: number
}

// CSV Export Functions
export const exportPositionsToCSV = (positions: ExportablePosition[], filename?: string) => {
  const csvData = positions.map(position => ({
    Symbol: position.ticker.split('_')[0],
    'Company Name': position.companyName || 'N/A',
    Sector: position.sector || 'N/A',
    Industry: position.industry || 'N/A',
    Country: position.country || 'N/A',
    Exchange: position.exchange || 'N/A',
    Quantity: position.quantity,
    'Average Price': position.averagePrice.toFixed(2),
    'Current Price': position.currentPrice.toFixed(2),
    'Market Value': position.marketValue?.toFixed(2) || (position.currentPrice * position.quantity).toFixed(2),
    'P&L': position.ppl.toFixed(2),
    'P&L %': position.pnlPercent?.toFixed(2) || ((position.ppl / (position.currentPrice * position.quantity)) * 100).toFixed(2),
    'PE Ratio': position.peRatio?.toFixed(2) || 'N/A',
    'Market Cap': position.marketCap?.toFixed(0) || 'N/A',
    'EPS': position.eps?.toFixed(2) || 'N/A',
    'Export Date': new Date().toISOString().split('T')[0]
  }))

  const csv = Papa.unparse(csvData)
  downloadCSV(csv, filename || `portfolio-positions-${new Date().toISOString().split('T')[0]}.csv`)
}

export const exportSectorAllocationToCSV = (sectorData: SectorAllocation[], filename?: string) => {
  const csvData = sectorData.map(sector => ({
    Sector: sector.sector,
    'Value ($)': sector.value.toFixed(2),
    'Percentage (%)': sector.percentage.toFixed(2),
    'Position Count': sector.positionCount,
    'Average PE Ratio': sector.avgPeRatio.toFixed(2),
    'P&L ($)': sector.pnl.toFixed(2),
    'P&L (%)': sector.pnlPercent.toFixed(2),
    'Export Date': new Date().toISOString().split('T')[0]
  }))

  const csv = Papa.unparse(csvData)
  downloadCSV(csv, filename || `sector-allocation-${new Date().toISOString().split('T')[0]}.csv`)
}

export const exportRegionalAllocationToCSV = (regionalData: RegionalAllocation[], filename?: string) => {
  const csvData = regionalData.map(region => ({
    Country: region.country,
    'Value ($)': region.value.toFixed(2),
    'Percentage (%)': region.percentage.toFixed(2),
    'Position Count': region.positionCount,
    'Sectors': region.sectors.join(', '),
    'P&L ($)': region.pnl.toFixed(2),
    'P&L (%)': region.pnlPercent.toFixed(2),
    'Export Date': new Date().toISOString().split('T')[0]
  }))

  const csv = Papa.unparse(csvData)
  downloadCSV(csv, filename || `regional-allocation-${new Date().toISOString().split('T')[0]}.csv`)
}

export const exportPortfolioSummaryToCSV = (summary: PortfolioSummary, filename?: string) => {
  const csvData = [{
    'Total Portfolio Value': summary.totalValue.toFixed(2),
    'Total P&L': summary.totalPnL.toFixed(2),
    'Total P&L %': summary.totalPnLPercent.toFixed(2),
    'Position Count': summary.positionCount,
    'Sector Count': summary.sectorCount,
    'Country Count': summary.countryCount,
    'Average PE Ratio': summary.avgPeRatio.toFixed(2),
    'Top Sector': summary.topSector,
    'Top Country': summary.topCountry,
    'Risk Score': summary.riskScore,
    'Diversification Score': summary.diversificationScore,
    'Report Date': summary.timestamp
  }]

  const csv = Papa.unparse(csvData)
  downloadCSV(csv, filename || `portfolio-summary-${new Date().toISOString().split('T')[0]}.csv`)
}

// PDF Export Functions
export const exportPortfolioToPDF = async (
  positions: ExportablePosition[],
  summary: PortfolioSummary,
  sectorData: SectorAllocation[],
  regionalData: RegionalAllocation[],
  filename?: string
) => {
  const pdf = new jsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  let currentY = 20

  // Header
  pdf.setFontSize(20)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Portfolio Risk Analysis Report', pageWidth / 2, currentY, { align: 'center' })
  currentY += 10

  pdf.setFontSize(12)
  pdf.setFont('helvetica', 'normal')
  pdf.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, currentY, { align: 'center' })
  currentY += 20

  // Portfolio Summary
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Portfolio Summary', 20, currentY)
  currentY += 10

  pdf.setFontSize(10)
  pdf.setFont('helvetica', 'normal')
  const summaryLines = [
    `Total Portfolio Value: $${summary.totalValue.toLocaleString()}`,
    `Total P&L: $${summary.totalPnL.toLocaleString()} (${summary.totalPnLPercent.toFixed(2)}%)`,
    `Positions: ${summary.positionCount} | Sectors: ${summary.sectorCount} | Countries: ${summary.countryCount}`,
    `Average PE Ratio: ${summary.avgPeRatio.toFixed(2)}`,
    `Top Sector: ${summary.topSector} | Top Country: ${summary.topCountry}`,
    `Risk Score: ${summary.riskScore}/100 | Diversification Score: ${summary.diversificationScore}/100`
  ]

  summaryLines.forEach(line => {
    pdf.text(line, 20, currentY)
    currentY += 6
  })
  currentY += 10

  // Top Positions Table
  pdf.setFontSize(14)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Top 10 Positions', 20, currentY)
  currentY += 10

  const topPositions = positions
    .sort((a, b) => (b.currentPrice * b.quantity) - (a.currentPrice * a.quantity))
    .slice(0, 10)

  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'normal')
  
  // Table headers
  const headers = ['Symbol', 'Company', 'Sector', 'Value', 'P&L', 'P&L %', 'PE']
  const colWidths = [20, 35, 30, 25, 20, 20, 15]
  let startX = 20

  headers.forEach((header, i) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(header, startX, currentY)
    startX += colWidths[i]
  })
  currentY += 6

  // Table data
  topPositions.forEach(position => {
    const value = position.currentPrice * position.quantity
    const pnlPercent = (position.ppl / value) * 100
    
    startX = 20
    const rowData = [
      position.ticker.split('_')[0],
      (position.companyName || 'N/A').substring(0, 15),
      (position.sector || 'N/A').substring(0, 12),
      `$${value.toFixed(0)}`,
      `$${position.ppl.toFixed(0)}`,
      `${pnlPercent.toFixed(1)}%`,
      position.peRatio?.toFixed(1) || 'N/A'
    ]

    pdf.setFont('helvetica', 'normal')
    rowData.forEach((data, i) => {
      pdf.text(data, startX, currentY)
      startX += colWidths[i]
    })
    currentY += 5
  })

  // New page for sector allocation
  pdf.addPage()
  currentY = 20

  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Sector Allocation', 20, currentY)
  currentY += 15

  // Sector table
  pdf.setFontSize(8)
  const sectorHeaders = ['Sector', 'Value', 'Percentage', 'Positions', 'Avg PE', 'P&L']
  const sectorColWidths = [40, 25, 20, 20, 20, 25]
  startX = 20

  sectorHeaders.forEach((header, i) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(header, startX, currentY)
    startX += sectorColWidths[i]
  })
  currentY += 6

  sectorData.forEach(sector => {
    startX = 20
    const sectorRowData = [
      sector.sector,
      `$${sector.value.toFixed(0)}`,
      `${sector.percentage.toFixed(1)}%`,
      sector.positionCount.toString(),
      sector.avgPeRatio.toFixed(1),
      `$${sector.pnl.toFixed(0)}`
    ]

    pdf.setFont('helvetica', 'normal')
    sectorRowData.forEach((data, i) => {
      pdf.text(data, startX, currentY)
      startX += sectorColWidths[i]
    })
    currentY += 5
  })

  // Regional allocation
  currentY += 20
  pdf.setFontSize(16)
  pdf.setFont('helvetica', 'bold')
  pdf.text('Regional Allocation', 20, currentY)
  currentY += 15

  pdf.setFontSize(8)
  const regionHeaders = ['Country', 'Value', 'Percentage', 'Positions', 'P&L']
  const regionColWidths = [40, 30, 25, 25, 30]
  startX = 20

  regionHeaders.forEach((header, i) => {
    pdf.setFont('helvetica', 'bold')
    pdf.text(header, startX, currentY)
    startX += regionColWidths[i]
  })
  currentY += 6

  regionalData.forEach(region => {
    startX = 20
    const regionRowData = [
      region.country,
      `$${region.value.toFixed(0)}`,
      `${region.percentage.toFixed(1)}%`,
      region.positionCount.toString(),
      `$${region.pnl.toFixed(0)}`
    ]

    pdf.setFont('helvetica', 'normal')
    regionRowData.forEach((data, i) => {
      pdf.text(data, startX, currentY)
      startX += regionColWidths[i]
    })
    currentY += 5
  })

  // Footer
  pdf.setFontSize(8)
  pdf.setFont('helvetica', 'italic')
  pdf.text('Generated by Portfolio Risk Analysis Tool', pageWidth / 2, pageHeight - 10, { align: 'center' })

  // Save PDF
  pdf.save(filename || `portfolio-analysis-${new Date().toISOString().split('T')[0]}.pdf`)
}

// Utility function to download CSV
const downloadCSV = (csv: string, filename: string) => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

// Helper function to calculate portfolio summary
export const calculatePortfolioSummary = (positions: ExportablePosition[]): PortfolioSummary => {
  const totalValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0)
  const totalPnL = positions.reduce((sum, pos) => sum + pos.ppl, 0)
  const totalPnLPercent = (totalPnL / totalValue) * 100
  
  const sectors = [...new Set(positions.filter(p => p.sector).map(p => p.sector!))]
  const countries = [...new Set(positions.filter(p => p.country).map(p => p.country!))]
  
  const validPeRatios = positions.filter(p => p.peRatio && p.peRatio > 0)
  const avgPeRatio = validPeRatios.length > 0 
    ? validPeRatios.reduce((sum, pos) => sum + pos.peRatio!, 0) / validPeRatios.length 
    : 0

  // Calculate top sector and country by value
  const sectorValues = new Map<string, number>()
  const countryValues = new Map<string, number>()
  
  positions.forEach(pos => {
    const value = pos.currentPrice * pos.quantity
    if (pos.sector) {
      sectorValues.set(pos.sector, (sectorValues.get(pos.sector) || 0) + value)
    }
    if (pos.country) {
      countryValues.set(pos.country, (countryValues.get(pos.country) || 0) + value)
    }
  })

  const topSector = Array.from(sectorValues.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
  const topCountry = Array.from(countryValues.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'

  // Simple risk and diversification scores
  const riskScore = Math.min(100, Math.max(0, 50 + (totalPnLPercent * 2)))
  const diversificationScore = Math.min(100, (sectors.length * 10) + (countries.length * 5))

  return {
    totalValue,
    totalPnL,
    totalPnLPercent,
    positionCount: positions.length,
    sectorCount: sectors.length,
    countryCount: countries.length,
    avgPeRatio,
    topSector,
    topCountry,
    riskScore,
    diversificationScore,
    timestamp: new Date().toISOString()
  }
}

// Helper function to calculate sector allocation
export const calculateSectorAllocation = (positions: ExportablePosition[]): SectorAllocation[] => {
  const sectorMap = new Map<string, {
    value: number
    positions: ExportablePosition[]
    pnl: number
  }>()

  positions.forEach(pos => {
    const sector = pos.sector || 'Unknown'
    const value = pos.currentPrice * pos.quantity
    
    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, { value: 0, positions: [], pnl: 0 })
    }
    
    const sectorData = sectorMap.get(sector)!
    sectorData.value += value
    sectorData.positions.push(pos)
    sectorData.pnl += pos.ppl
  })

  const totalValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0)

  return Array.from(sectorMap.entries()).map(([sector, data]) => {
    const validPeRatios = data.positions.filter(p => p.peRatio && p.peRatio > 0)
    const avgPeRatio = validPeRatios.length > 0 
      ? validPeRatios.reduce((sum, pos) => sum + pos.peRatio!, 0) / validPeRatios.length 
      : 0

    return {
      sector,
      value: data.value,
      percentage: (data.value / totalValue) * 100,
      positionCount: data.positions.length,
      avgPeRatio,
      pnl: data.pnl,
      pnlPercent: (data.pnl / data.value) * 100
    }
  }).sort((a, b) => b.value - a.value)
}

// Helper function to calculate regional allocation
export const calculateRegionalAllocation = (positions: ExportablePosition[]): RegionalAllocation[] => {
  const regionMap = new Map<string, {
    value: number
    positions: ExportablePosition[]
    pnl: number
    sectors: Set<string>
  }>()

  positions.forEach(pos => {
    const country = pos.country || 'Unknown'
    const value = pos.currentPrice * pos.quantity
    
    if (!regionMap.has(country)) {
      regionMap.set(country, { value: 0, positions: [], pnl: 0, sectors: new Set() })
    }
    
    const regionData = regionMap.get(country)!
    regionData.value += value
    regionData.positions.push(pos)
    regionData.pnl += pos.ppl
    if (pos.sector) regionData.sectors.add(pos.sector)
  })

  const totalValue = positions.reduce((sum, pos) => sum + (pos.currentPrice * pos.quantity), 0)

  return Array.from(regionMap.entries()).map(([country, data]) => ({
    country,
    value: data.value,
    percentage: (data.value / totalValue) * 100,
    positionCount: data.positions.length,
    sectors: Array.from(data.sectors),
    pnl: data.pnl,
    pnlPercent: (data.pnl / data.value) * 100
  })).sort((a, b) => b.value - a.value)
} 