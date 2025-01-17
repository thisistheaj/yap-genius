// Connection options
export interface Vec0ConnectionOptions {
  path: string;
  readonly?: boolean;
}

// Table schema definition
export interface Vec0TableSchema {
  name: string;
  dimensions: number;
  metadata?: Vec0MetadataField[];
}

// Metadata field definition
export interface Vec0MetadataField {
  name: string;
  type: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB';
  primaryKey?: boolean;
  notNull?: boolean;
  unique?: boolean;
}

// Search options
export interface Vec0SearchOptions {
  limit?: number;
  offset?: number;
  filter?: string;
  orderBy?: 'distance' | 'id' | string;
  orderDir?: 'asc' | 'desc';
}

// Search result
export interface Vec0SearchResult<T = any> {
  id: string | number;
  distance: number;
  metadata?: T;
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
  timestamp: Date;
  success: boolean;
  error?: string;
} 