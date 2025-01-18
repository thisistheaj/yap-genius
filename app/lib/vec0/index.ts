import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';
import type {
  Vec0ConnectionOptions,
  Vec0TableSchema,
  Vec0SearchOptions,
  Vec0SearchResult,
  Vec0BatchResult,
  Vec0Metrics
} from './types';

export class Vec0SDK {
  private db: Database.Database;
  private metrics: Vec0Metrics[] = [];
  private readonly maxMetrics = 1000;

  constructor(options: Vec0ConnectionOptions) {
    const dbOptions: Database.Options = {};
    if (options.readonly !== undefined) {
      dbOptions.readonly = options.readonly;
    }
    this.db = new Database(options.path, dbOptions);
    sqliteVec.load(this.db);
  }

  // Create a new vector table
  createTable(schema: Vec0TableSchema): void {
    const start = Date.now();
    try {
      // Build column definitions
      const columns = [
        'id TEXT PRIMARY KEY',
        schema.partitionBy ? 'partition TEXT' : null,
        `embedding FLOAT[${schema.dimensions}]`,
        // Add auxiliary columns with + prefix
        ...(schema.auxiliaryColumns?.map(col => 
          `+${col.name} TEXT`
        ) || [])
      ].filter(Boolean);

      // Create table SQL
      const sql = `
        CREATE VIRTUAL TABLE IF NOT EXISTS ${schema.name} 
        USING vec0(
          ${columns.join(',\n')}
        );
      `;
      this.db.exec(sql);
      this.recordMetric({
        tableName: schema.name,
        operation: 'createTable',
        duration: Date.now() - start,
        success: true
      });
    } catch (error) {
      this.recordMetric({
        tableName: schema.name,
        operation: 'createTable',
        duration: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Insert or update a vector
  upsert(
    tableName: string,
    id: string | number,
    embedding: number[],
    options: {
      partition?: string;
      auxiliaryData?: Record<string, string>;
    } = {}
  ): void {
    const start = Date.now();
    try {
      const vec = Buffer.from(new Float32Array(embedding).buffer);
      const { partition, auxiliaryData } = options;

      // Get table info to find auxiliary columns
      const tableInfo = this.db.prepare(`SELECT * FROM pragma_table_info(?)`).all(tableName) as Array<{
        name: string;
      }>;

      // Get auxiliary columns (excluding id, embedding, and partition)
      const auxiliaryColumns = tableInfo
        .map(col => col.name)
        .filter(name => name !== 'id' && name !== 'embedding' && name !== 'partition');

      // Build SQL with auxiliary columns
      const sql = `
        INSERT OR REPLACE INTO ${tableName}
        (id, embedding${partition ? ', partition' : ''}${auxiliaryColumns.map(col => `, ${col}`).join('')})
        VALUES (?, ?${partition ? ', ?' : ''}${auxiliaryColumns.map(() => ', ?').join('')})
      `;

      const values = [id, vec];
      if (partition) values.push(partition);
      if (auxiliaryData) {
        auxiliaryColumns.forEach(col => {
          const key = col.startsWith('+') ? col.slice(1) : col;
          values.push(auxiliaryData[key] || '');
        });
      }

      this.db.prepare(sql).run(...values);
      
      this.recordMetric({
        tableName,
        operation: 'upsert',
        duration: Date.now() - start,
        success: true
      });
    } catch (error) {
      this.recordMetric({
        tableName,
        operation: 'upsert',
        duration: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Search for similar vectors
  search<T = any>(
    tableName: string,
    embedding: number[],
    options: Vec0SearchOptions = {}
  ): Vec0SearchResult<T>[] {
    const start = Date.now();
    try {
      const vec = Buffer.from(new Float32Array(embedding).buffer);
      const limit = options.limit || 10;

      // Get table info to find auxiliary columns
      const tableInfo = this.db.prepare(`SELECT * FROM pragma_table_info(?)`).all(tableName) as Array<{
        name: string;
      }>;

      // Get auxiliary columns (excluding id, embedding, and partition)
      const auxiliaryColumns = tableInfo
        .map(col => col.name)
        .filter(name => name !== 'id' && name !== 'embedding' && name !== 'partition')
        .map(name => name.startsWith('+') ? name : `+${name}`);

      // Build select columns including auxiliary data
      const selectColumns = [
        'id',
        'distance',
        ...auxiliaryColumns.map(col => `${col} as ${col.replace(/^\+/, '')}`)
      ];

      // Build search SQL with optional partition filter
      let sql: string;
      let params: any[];

      if (!options.partition) {
        sql = `
          SELECT ${selectColumns.join(', ')}
          FROM ${tableName}
          WHERE embedding MATCH ?
          ORDER BY distance ASC
          LIMIT ?
        `;
        params = [vec, limit];
      } else if (Array.isArray(options.partition)) {
        sql = `
          SELECT ${selectColumns.join(', ')}
          FROM ${tableName}
          WHERE embedding MATCH ?
          AND partition IN (${options.partition.map(() => '?').join(',')})
          ORDER BY distance ASC
          LIMIT ?
        `;
        params = [vec, ...options.partition, limit];
      } else {
        sql = `
          SELECT ${selectColumns.join(', ')}
          FROM ${tableName}
          WHERE embedding MATCH ?
          AND partition = ?
          ORDER BY distance ASC
          LIMIT ?
        `;
        params = [vec, options.partition, limit];
      }

      const rawResults = this.db.prepare(sql).all(...params);
      
      // Transform results to include auxiliary data
      const results = rawResults.map(row => {
        const { id, distance, ...auxiliary } = row as { id: string; distance: number; [key: string]: any };
        return {
          id,
          distance,
          ...(Object.keys(auxiliary).length > 0 ? { auxiliaryData: auxiliary } : {})
        };
      }) as Vec0SearchResult<T>[];

      this.recordMetric({
        tableName,
        operation: 'search',
        duration: Date.now() - start,
        success: true
      });

      return results;
    } catch (error) {
      this.recordMetric({
        tableName,
        operation: 'search',
        duration: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Batch insert/update vectors
  batchUpsert(
    tableName: string,
    items: Array<{
      id: string | number;
      embedding: number[];
      partition?: string;
      auxiliaryData?: Record<string, string>;
    }>
  ): Vec0BatchResult {
    const start = Date.now();
    const result: Vec0BatchResult = {
      successful: 0,
      failed: 0,
      errors: []
    };

    try {
      // Start transaction
      const tx = this.db.transaction(() => {
        for (const item of items) {
          try {
            this.upsert(tableName, item.id, item.embedding, {
              partition: item.partition,
              auxiliaryData: item.auxiliaryData
            });
            result.successful++;
          } catch (error) {
            result.failed++;
            result.errors.push({
              id: item.id,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        }
      });

      tx();

      this.recordMetric({
        tableName,
        operation: 'batchUpsert',
        duration: Date.now() - start,
        success: true
      });

      return result;
    } catch (error) {
      this.recordMetric({
        tableName,
        operation: 'batchUpsert',
        duration: Date.now() - start,
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  // Get performance metrics
  getMetrics(): Vec0Metrics[] {
    return [...this.metrics];
  }

  // Clear metrics
  clearMetrics(): void {
    this.metrics = [];
  }

  // Close connection
  close(): void {
    this.db.close();
  }

  private recordMetric(metric: Omit<Vec0Metrics, 'timestamp'>): void {
    this.metrics.push({
      ...metric,
      timestamp: new Date()
    });

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
} 