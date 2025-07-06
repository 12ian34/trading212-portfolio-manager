"use client"

import { useState, useEffect } from 'react'
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  X, 
  Save, 
  RotateCcw, 
  ChevronDown,
  Plus,
  Trash2,
  Star,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3
} from 'lucide-react'
import { 
  FilterCriteria, 
  SortConfig, 
  FilterOptions,
  FilterPreset,
  FilterSortState,
  SortField,
  SortOrder
} from '@/lib/types'
import { 
  FilterablePosition,
  generateFilterOptions,
  createInitialFilterState,
  resetFilters,
  applyPreset,
  updateFilters,
  updateSorts,
  getFieldLabel,
  defaultPresets
} from '@/lib/filter-utils'

interface FilterPanelProps {
  positions: FilterablePosition[]
  onFilterChange: (filters: FilterCriteria) => void
  onSortChange: (sorts: SortConfig[]) => void
  onPresetsChange?: (presets: FilterPreset[]) => void
  initialState?: FilterSortState
}

export function FilterPanel({ 
  positions, 
  onFilterChange, 
  onSortChange, 
  onPresetsChange,
  initialState 
}: FilterPanelProps) {
  const [filterState, setFilterState] = useState<FilterSortState>(
    initialState || createInitialFilterState()
  )
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [newPresetName, setNewPresetName] = useState('')
  const [isCreatePresetOpen, setIsCreatePresetOpen] = useState(false)
  // const [editingPresetId, setEditingPresetId] = useState<string | null>(null)

  // Generate filter options from positions
  useEffect(() => {
    if (positions.length > 0) {
      const options = generateFilterOptions(positions)
      setFilterOptions(options)
    }
  }, [positions])

  // Update parent components when filter state changes
  useEffect(() => {
    onFilterChange(filterState.filters)
    onSortChange(filterState.sorts)
    onPresetsChange?.(filterState.presets)
  }, [filterState, onFilterChange, onSortChange, onPresetsChange])

  const handleFilterUpdate = (newFilters: Partial<FilterCriteria>) => {
    setFilterState(prev => updateFilters(prev, newFilters))
  }

  const handleSortUpdate = (newSorts: SortConfig[]) => {
    setFilterState(prev => updateSorts(prev, newSorts))
  }

  const handleResetFilters = () => {
    setFilterState(resetFilters(filterState))
    setSearchTerm('')
  }

  const handleApplyPreset = (presetId: string) => {
    const newState = applyPreset(filterState, presetId)
    setFilterState(newState)
    
    // Update search term if preset includes search
    const preset = newState.presets.find(p => p.id === presetId)
    if (preset?.criteria.search) {
      setSearchTerm(preset.criteria.search)
    } else {
      setSearchTerm('')
    }
  }

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return
    
    const newPreset: FilterPreset = {
      id: `custom_${Date.now()}`,
      name: newPresetName,
      description: `Custom filter preset: ${newPresetName}`,
      criteria: { ...filterState.filters },
      sortConfig: [...filterState.sorts],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    setFilterState(prev => ({
      ...prev,
      presets: [...prev.presets, newPreset],
      activePresetId: newPreset.id,
    }))
    
    setNewPresetName('')
    setIsCreatePresetOpen(false)
  }

  const handleDeletePreset = (presetId: string) => {
    setFilterState(prev => ({
      ...prev,
      presets: prev.presets.filter(p => p.id !== presetId),
      activePresetId: prev.activePresetId === presetId ? undefined : prev.activePresetId,
    }))
  }

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    handleFilterUpdate({ search: value || undefined })
  }

  const addSort = (field: SortField, order: SortOrder) => {
    const newSort: SortConfig = { field, order }
    const existingSortIndex = filterState.sorts.findIndex(s => s.field === field)
    
    if (existingSortIndex >= 0) {
      // Replace existing sort for this field
      const newSorts = [...filterState.sorts]
      newSorts[existingSortIndex] = newSort
      handleSortUpdate(newSorts)
    } else {
      // Add new sort
      handleSortUpdate([...filterState.sorts, newSort])
    }
  }

  const removeSort = (field: SortField) => {
    const newSorts = filterState.sorts.filter(s => s.field !== field)
    handleSortUpdate(newSorts)
  }

  const getActiveFilterCount = () => {
    const filters = filterState.filters
    let count = 0
    
    if (filters.search) count++
    if (filters.sectors?.length) count++
    if (filters.countries?.length) count++
    if (filters.exchanges?.length) count++
    if (filters.minValue !== undefined) count++
    if (filters.maxValue !== undefined) count++
    if (filters.minPE !== undefined) count++
    if (filters.maxPE !== undefined) count++
    if (filters.minWeight !== undefined) count++
    if (filters.maxWeight !== undefined) count++
    if (filters.minMarketCap !== undefined) count++
    if (filters.maxMarketCap !== undefined) count++
    if (filters.minDividendYield !== undefined) count++
    if (filters.maxDividendYield !== undefined) count++
    if (filters.minEPS !== undefined) count++
    if (filters.maxEPS !== undefined) count++
    if (filters.minBeta !== undefined) count++
    if (filters.maxBeta !== undefined) count++
    if (filters.minPnL !== undefined) count++
    if (filters.maxPnL !== undefined) count++
    if (filters.minPnLPercent !== undefined) count++
    if (filters.maxPnLPercent !== undefined) count++
    if (filters.showOnlyProfitable) count++
    if (filters.showOnlyLosers) count++
    if (filters.showOnlyDividendPayers) count++
    
    return count
  }

  const activeFilterCount = getActiveFilterCount()
  const activePreset = filterState.presets.find(p => p.id === filterState.activePresetId)

  if (!filterOptions) {
    return (
      <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading filters...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ticker, company name, or sector..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex gap-2">
          {/* Filter Panel */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filter Positions</SheetTitle>
                <SheetDescription>
                  Filter and sort your portfolio positions by various criteria
                </SheetDescription>
              </SheetHeader>
              
              <div className="py-6 space-y-6">
                {/* Filter Presets */}
                <div className="space-y-3">
                  <h4 className="font-medium">Filter Presets</h4>
                  <div className="space-y-2">
                    {filterState.presets.map((preset) => (
                      <div key={preset.id} className="flex items-center gap-2">
                        <Button
                          variant={filterState.activePresetId === preset.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleApplyPreset(preset.id)}
                          className="flex-1 justify-start"
                        >
                          <Star className="h-3 w-3 mr-2" />
                          {preset.name}
                        </Button>
                        {!defaultPresets.some(dp => dp.id === preset.id) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePreset(preset.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Create New Preset */}
                  {isCreatePresetOpen ? (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Preset name"
                        value={newPresetName}
                        onChange={(e) => setNewPresetName(e.target.value)}
                        className="flex-1"
                      />
                      <Button size="sm" onClick={handleCreatePreset}>
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsCreatePresetOpen(false)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsCreatePresetOpen(true)}
                      className="w-full"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      Save Current Filters
                    </Button>
                  )}
                </div>

                {/* Category Filters */}
                <div className="space-y-4">
                  <h4 className="font-medium">Filter by Category</h4>
                  
                  {/* Sectors */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sectors</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>
                            {filterState.filters.sectors?.length 
                              ? `${filterState.filters.sectors.length} selected` 
                              : 'All sectors'}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Select Sectors</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {filterOptions.sectors.map((sector) => (
                          <DropdownMenuCheckboxItem
                            key={sector}
                            checked={filterState.filters.sectors?.includes(sector)}
                            onCheckedChange={(checked) => {
                              const currentSectors = filterState.filters.sectors || []
                              const newSectors = checked
                                ? [...currentSectors, sector]
                                : currentSectors.filter(s => s !== sector)
                              handleFilterUpdate({ 
                                sectors: newSectors.length > 0 ? newSectors : undefined 
                              })
                            }}
                          >
                            {sector}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Countries */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Countries</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>
                            {filterState.filters.countries?.length 
                              ? `${filterState.filters.countries.length} selected` 
                              : 'All countries'}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Select Countries</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {filterOptions.countries.map((country) => (
                          <DropdownMenuCheckboxItem
                            key={country}
                            checked={filterState.filters.countries?.includes(country)}
                            onCheckedChange={(checked) => {
                              const currentCountries = filterState.filters.countries || []
                              const newCountries = checked
                                ? [...currentCountries, country]
                                : currentCountries.filter(c => c !== country)
                              handleFilterUpdate({ 
                                countries: newCountries.length > 0 ? newCountries : undefined 
                              })
                            }}
                          >
                            {country}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Exchanges */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Exchanges</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          <span>
                            {filterState.filters.exchanges?.length 
                              ? `${filterState.filters.exchanges.length} selected` 
                              : 'All exchanges'}
                          </span>
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Select Exchanges</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {filterOptions.exchanges.map((exchange) => (
                          <DropdownMenuCheckboxItem
                            key={exchange}
                            checked={filterState.filters.exchanges?.includes(exchange)}
                            onCheckedChange={(checked) => {
                              const currentExchanges = filterState.filters.exchanges || []
                              const newExchanges = checked
                                ? [...currentExchanges, exchange]
                                : currentExchanges.filter(e => e !== exchange)
                              handleFilterUpdate({ 
                                exchanges: newExchanges.length > 0 ? newExchanges : undefined 
                              })
                            }}
                          >
                            {exchange}
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Numeric Range Filters */}
                <div className="space-y-4">
                  <h4 className="font-medium">Value Ranges</h4>
                  
                  {/* Market Value */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Market Value</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterState.filters.minValue || ''}
                        onChange={(e) => handleFilterUpdate({ 
                          minValue: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filterState.filters.maxValue || ''}
                        onChange={(e) => handleFilterUpdate({ 
                          maxValue: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                    </div>
                  </div>

                  {/* P/E Ratio */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">P/E Ratio</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterState.filters.minPE || ''}
                        onChange={(e) => handleFilterUpdate({ 
                          minPE: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filterState.filters.maxPE || ''}
                        onChange={(e) => handleFilterUpdate({ 
                          maxPE: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                    </div>
                  </div>

                  {/* P&L */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">P&L</label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Min"
                        value={filterState.filters.minPnL || ''}
                        onChange={(e) => handleFilterUpdate({ 
                          minPnL: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                      <Input
                        type="number"
                        placeholder="Max"
                        value={filterState.filters.maxPnL || ''}
                        onChange={(e) => handleFilterUpdate({ 
                          maxPnL: e.target.value ? Number(e.target.value) : undefined 
                        })}
                      />
                    </div>
                  </div>
                </div>

                {/* Boolean Filters */}
                <div className="space-y-4">
                  <h4 className="font-medium">Quick Filters</h4>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filterState.filters.showOnlyProfitable || false}
                        onChange={(e) => handleFilterUpdate({ 
                          showOnlyProfitable: e.target.checked || undefined 
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                        Show only profitable positions
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filterState.filters.showOnlyLosers || false}
                        onChange={(e) => handleFilterUpdate({ 
                          showOnlyLosers: e.target.checked || undefined 
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <TrendingDown className="h-3 w-3 text-red-500" />
                        Show only losing positions
                      </span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={filterState.filters.showOnlyDividendPayers || false}
                        onChange={(e) => handleFilterUpdate({ 
                          showOnlyDividendPayers: e.target.checked || undefined 
                        })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm flex items-center gap-1">
                        <DollarSign className="h-3 w-3 text-blue-500" />
                        Show only dividend payers
                      </span>
                    </label>
                  </div>
                </div>

                {/* Reset Filters */}
                <Button
                  variant="outline"
                  onClick={handleResetFilters}
                  className="w-full"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset All Filters
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Sort
                {filterState.sorts.length > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    {filterState.sorts.length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Sort Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(['ticker', 'companyName', 'sector', 'value', 'ppl', 'pplPercent', 'peRatio', 'marketCap'] as SortField[]).map((field) => (
                <div key={field} className="px-2 py-1">
                  <div className="text-sm font-medium mb-1">{getFieldLabel(field)}</div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSort(field, 'asc')}
                      className="flex-1 h-8 text-xs"
                    >
                      <SortAsc className="h-3 w-3 mr-1" />
                      Asc
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addSort(field, 'desc')}
                      className="flex-1 h-8 text-xs"
                    >
                      <SortDesc className="h-3 w-3 mr-1" />
                      Desc
                    </Button>
                  </div>
                </div>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Reset All */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetFilters}
            disabled={activeFilterCount === 0 && filterState.sorts.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Active Filters Display */}
      {(activeFilterCount > 0 || filterState.sorts.length > 0) && (
        <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg">
          {/* Active Preset */}
          {activePreset && (
            <Badge variant="default" className="flex items-center gap-1">
              <Star className="h-3 w-3" />
              {activePreset.name}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterState(prev => ({ ...prev, activePresetId: undefined }))}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Active Filters */}
          {filterState.filters.search && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Search: {filterState.filters.search}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('')
                  handleFilterUpdate({ search: undefined })
                }}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filterState.filters.sectors && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Sectors: {filterState.filters.sectors.length}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterUpdate({ sectors: undefined })}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {filterState.filters.showOnlyProfitable && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Profitable only
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFilterUpdate({ showOnlyProfitable: undefined })}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}

          {/* Active Sorts */}
          {filterState.sorts.map((sort, index) => (
            <Badge key={`${sort.field}-${index}`} variant="outline" className="flex items-center gap-1">
              {sort.order === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />}
              {getFieldLabel(sort.field)}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeSort(sort.field)}
                className="h-4 w-4 p-0 ml-1"
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
} 