// Connection options
export interface Vec0ConnectionOptions {
  path: string;
  readonly?: boolean;
}

// Table schema definition
export interface Vec0TableSchema {
  name: string;
  dimensions: number;
  partitionBy?: boolean;
}

// Search options
export interface Vec0SearchOptions {
  limit?: number;
  partition?: string | string[];
}

// Search result
export interface Vec0SearchResult<T = any> {
  id: string;
  distance: number;
}

// Batch operation result
export interface Vec0BatchResult {
  successful: number;
  failed: number;
  errors: Array<{
    id: string | number;
    error: string;
  }>;
}

// Performance metrics
export interface Vec0Metrics {
  tableName: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: Date;
} 