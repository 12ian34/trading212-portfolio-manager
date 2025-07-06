import { useState, useMemo, useCallback } from 'react'
import { 
  FilterCriteria, 
  SortConfig, 
  FilterPreset,
  FilterSortState 
} from '@/lib/types'
import { 
  FilterablePosition,
  filterPositions,
  sortPositions,
  createInitialFilterState
} from '@/lib/filter-utils'

export function useFilterSort<T extends FilterablePosition>(
  positions: T[],
  totalPortfolioValue?: number,
  initialState?: FilterSortState
) {
  const [filterState, setFilterState] = useState<FilterSortState>(
    initialState || createInitialFilterState()
  )

  // Apply filters and sorting to positions
  const filteredAndSortedPositions = useMemo(() => {
    if (positions.length === 0) return []
    
    // First filter
    const filtered = filterPositions(positions, filterState.filters, totalPortfolioValue)
    
    // Then sort
    const sorted = sortPositions(filtered, filterState.sorts, totalPortfolioValue)
    
    return sorted
  }, [positions, filterState.filters, filterState.sorts, totalPortfolioValue])

  // Update filter criteria
  const updateFilters = useCallback((newFilters: FilterCriteria) => {
    setFilterState(prev => ({
      ...prev,
      filters: newFilters,
      activePresetId: undefined, // Clear active preset when manually filtering
    }))
  }, [])

  // Update sort configuration
  const updateSorts = useCallback((newSorts: SortConfig[]) => {
    setFilterState(prev => ({
      ...prev,
      sorts: newSorts,
      activePresetId: undefined, // Clear active preset when manually sorting
    }))
  }, [])

  // Update presets
  const updatePresets = useCallback((newPresets: FilterPreset[]) => {
    setFilterState(prev => ({
      ...prev,
      presets: newPresets,
    }))
  }, [])

  // Reset all filters and sorts
  const resetFilters = useCallback(() => {
    setFilterState(createInitialFilterState())
  }, [])

  // Apply a preset
  const applyPreset = useCallback((presetId: string) => {
    const preset = filterState.presets.find(p => p.id === presetId)
    if (preset) {
      setFilterState(prev => ({
        ...prev,
        filters: preset.criteria,
        sorts: preset.sortConfig || [],
        activePresetId: presetId,
      }))
    }
  }, [filterState.presets])

  // Get filter statistics
  const filterStats = useMemo(() => {
    const originalCount = positions.length
    const filteredCount = filteredAndSortedPositions.length
    const removedCount = originalCount - filteredCount
    
    return {
      originalCount,
      filteredCount,
      removedCount,
      hasFilters: Object.keys(filterState.filters).length > 0,
      hasSorts: filterState.sorts.length > 0,
      activePresetName: filterState.activePresetId 
        ? filterState.presets.find(p => p.id === filterState.activePresetId)?.name
        : undefined,
    }
  }, [positions.length, filteredAndSortedPositions.length, filterState])

  return {
    // Data
    positions: filteredAndSortedPositions,
    
    // State
    filterState,
    filters: filterState.filters,
    sorts: filterState.sorts,
    presets: filterState.presets,
    activePresetId: filterState.activePresetId,
    
    // Actions
    updateFilters,
    updateSorts,
    updatePresets,
    resetFilters,
    applyPreset,
    
    // Statistics
    filterStats,
    
    // Direct state setter (for advanced use cases)
    setFilterState,
  }
} 