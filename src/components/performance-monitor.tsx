"use client"

import { useEffect } from 'react';
import { initPerformanceMonitoring } from '@/lib/performance-utils';

export function PerformanceMonitor() {
  useEffect(() => {
    // Initialize performance monitoring only on client side
    if (typeof window !== 'undefined') {
      initPerformanceMonitoring();
    }
  }, []);

  // This component renders nothing - it's just for side effects
  return null;
} 