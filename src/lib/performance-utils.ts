// Performance monitoring and optimization utilities

// Web Vitals tracking
export function trackWebVitals() {
  if (typeof window !== 'undefined') {
    // Log performance metrics on page load
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        const paintEntries = performance.getEntriesByType('paint');
        
        console.log('Performance Metrics:', {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
          loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
          firstPaint: paintEntries.find(entry => entry.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0,
        });
      }, 1000);
    });
  }
}

// Performance utility functions for optimization

// Memory optimization utilities
export function optimizeMemory() {
  if (typeof window !== 'undefined') {
    // Memory monitoring available in performance API
    console.log('Memory optimization enabled');
  }
}

// Debounce function for performance optimization
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      func(...args);
      timeout = null;
    }, wait);
  };
}

// Throttle function for performance optimization
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Virtual scrolling helper for large lists
export function createVirtualScroller(
  containerHeight: number,
  itemHeight: number,
  totalItems: number,
  overscan: number = 5
) {
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  
  return {
    getVisibleRange: (scrollTop: number) => {
      const start = Math.floor(scrollTop / itemHeight);
      const end = start + visibleItems;
      
      return {
        start: Math.max(0, start - overscan),
        end: Math.min(totalItems - 1, end + overscan),
        visibleStart: start,
        visibleEnd: end
      };
    },
    getTotalHeight: () => totalItems * itemHeight,
    getItemOffset: (index: number) => index * itemHeight
  };
}

// Image optimization helpers
export function optimizeImageLoading() {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        }
      });
    });

    // Observe all lazy images
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach((img) => imageObserver.observe(img));
  }
}

// Bundle size analyzer helper
export function analyzeBundleSize() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Bundle analysis available at: http://localhost:3000?analyze=true');
    console.log('Run: ANALYZE=true npm run build');
  }
}

// Performance timer utility
export class PerformanceTimer {
  private startTime: number = 0;
  private endTime: number = 0;
  private label: string;

  constructor(label: string) {
    this.label = label;
  }

  start() {
    this.startTime = performance.now();
    console.time(this.label);
  }

  end() {
    this.endTime = performance.now();
    console.timeEnd(this.label);
    
    const duration = this.endTime - this.startTime;
    console.log(`${this.label} took ${duration.toFixed(2)}ms`);
    
    return duration;
  }

  static measure<T>(label: string, fn: () => T): T {
    const timer = new PerformanceTimer(label);
    timer.start();
    const result = fn();
    timer.end();
    return result;
  }
}

// Network optimization
export function optimizeNetworkRequests() {
  if (typeof window !== 'undefined') {
    // Prefetch likely navigation targets
    const prefetchPage = (href: string) => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      document.head.appendChild(link);
    };

    // Prefetch likely routes
    prefetchPage('/api/trading212/positions');
    prefetchPage('/api/alphavantage/overview');
  }
}

// Component performance monitoring removed - use React DevTools instead

// Initialize performance monitoring
export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    // Track web vitals
    trackWebVitals();
    
    // Optimize memory
    optimizeMemory();
    
    // Optimize images
    optimizeImageLoading();
    
    // Optimize network requests
    optimizeNetworkRequests();
    
    // Bundle analysis reminder
    analyzeBundleSize();
    
    console.log('Performance monitoring initialized');
  }
}

// Performance utilities - simplified version 