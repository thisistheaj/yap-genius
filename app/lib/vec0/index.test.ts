import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { Vec0SDK } from './index';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('Vec0SDK', () => {
  let vec0: Vec0SDK;
  const testDir = join(__dirname, 'test-db');
  const dbPath = join(testDir, 'test.db');

  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    vec0 = new Vec0SDK({ path: dbPath });
  });

  afterEach(() => {
    vec0.close();
    // Clean up test database
    if (existsSync(dbPath)) {
      rmSync(dbPath);
    }
  });

  test('creates a table with correct schema', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3
    });

    // No error means success
    expect(true).toBe(true);
  });

  test('creates a table with partitions', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      partitionBy: true
    });

    // No error means success
    expect(true).toBe(true);
  });

  test('upserts and searches vectors', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3
    });

    const vectors = [
      { id: 'vec1', embedding: [1, 0, 0] },
      { id: 'vec2', embedding: [0, 1, 0] },
      { id: 'vec3', embedding: [0, 0, 1] }
    ];

    // Insert vectors
    vectors.forEach(v => {
      vec0.upsert('test_vectors', v.id, v.embedding);
    });

    // Search for similar vectors
    const results = vec0.search('test_vectors', [1, 0, 0], { limit: 2 });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('vec1');
    expect(results[0].distance).toBeCloseTo(0, 5);
  });

  test('upserts and searches vectors with partitions', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      partitionBy: true
    });

    const vectors = [
      { id: 'vec1', embedding: [1, 0, 0], partition: 'A' },
      { id: 'vec2', embedding: [0, 1, 0], partition: 'A' },
      { id: 'vec3', embedding: [0, 0, 1], partition: 'B' },
      { id: 'vec4', embedding: [1, 0, 0], partition: 'B' }
    ];

    // Insert vectors
    vectors.forEach(v => {
      vec0.upsert('test_vectors', v.id, v.embedding, { partition: v.partition });
    });

    // Search in partition A
    const resultsA = vec0.search('test_vectors', [1, 0, 0], { 
      limit: 2,
      partition: 'A'
    });

    expect(resultsA).toHaveLength(2);
    expect(resultsA[0].id).toBe('vec1');
    expect(resultsA[1].id).toBe('vec2');

    // Search in partition B
    const resultsB = vec0.search('test_vectors', [1, 0, 0], {
      limit: 2,
      partition: 'B'
    });

    expect(resultsB).toHaveLength(2);
    expect(resultsB[0].id).toBe('vec4');
    expect(resultsB[1].id).toBe('vec3');
  });

  test('batch upserts vectors', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3
    });

    const vectors = [
      { id: 'vec1', embedding: [1, 0, 0] },
      { id: 'vec2', embedding: [0, 1, 0] },
      { id: 'vec3', embedding: [0, 0, 1] }
    ];

    const result = vec0.batchUpsert('test_vectors', vectors);

    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  test('batch upserts vectors with partitions', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      partitionBy: true
    });

    const vectors = [
      { id: 'vec1', embedding: [1, 0, 0], partition: 'A' },
      { id: 'vec2', embedding: [0, 1, 0], partition: 'A' },
      { id: 'vec3', embedding: [0, 0, 1], partition: 'B' }
    ];

    const result = vec0.batchUpsert('test_vectors', vectors);

    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Verify partitions by searching
    const resultsA = vec0.search('test_vectors', [1, 0, 0], { 
      limit: 2,
      partition: 'A'
    });
    expect(resultsA).toHaveLength(2);
    expect(resultsA[0].id).toBe('vec1');

    const resultsB = vec0.search('test_vectors', [1, 0, 0], {
      limit: 2,
      partition: 'B'
    });
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].id).toBe('vec3');
  });

  test('records and retrieves metrics', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3
    });

    vec0.upsert('test_vectors', 'vec1', [1, 0, 0]);
    
    const metrics = vec0.getMetrics();
    expect(metrics).toHaveLength(2); // createTable and upsert
    expect(metrics[0].operation).toBe('createTable');
    expect(metrics[1].operation).toBe('upsert');
    expect(metrics[0].success).toBe(true);
    expect(metrics[1].success).toBe(true);

    vec0.clearMetrics();
    expect(vec0.getMetrics()).toHaveLength(0);
  });

  test('searches vectors across multiple partitions', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      partitionBy: true
    });

    const vectors = [
      { id: 'vec1', embedding: [1, 0, 0], partition: 'A' },
      { id: 'vec2', embedding: [0, 1, 0], partition: 'A' },
      { id: 'vec3', embedding: [0, 0, 1], partition: 'B' },
      { id: 'vec4', embedding: [1, 0, 0], partition: 'B' },
      { id: 'vec5', embedding: [1, 0, 0], partition: 'C' }
    ];

    // Insert vectors
    vectors.forEach(v => {
      vec0.upsert('test_vectors', v.id, v.embedding, { partition: v.partition });
    });

    // Search across partitions A and B
    const resultsAB = vec0.search('test_vectors', [1, 0, 0], { 
      limit: 3,
      partition: ['A', 'B']
    });

    expect(resultsAB).toHaveLength(3);
    // Should find vec1 and vec4 first (exact matches)
    expect(resultsAB.slice(0, 2).map(r => r.id).sort()).toEqual(['vec1', 'vec4']);

    // Search across all three partitions
    const resultsABC = vec0.search('test_vectors', [1, 0, 0], {
      limit: 5,
      partition: ['A', 'B', 'C']
    });

    expect(resultsABC).toHaveLength(5);
    // Should find all three exact matches first
    expect(resultsABC.slice(0, 3).map(r => r.id).sort()).toEqual(['vec1', 'vec4', 'vec5']);
  });

  test('creates and queries table with auxiliary columns', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      auxiliaryColumns: [
        { name: 'contents' }
      ]
    });

    const vectors = [
      { 
        id: 'vec1', 
        embedding: [1, 0, 0],
        auxiliaryData: {
          contents: 'hello world'
        }
      },
      { 
        id: 'vec2', 
        embedding: [0, 1, 0],
        auxiliaryData: {
          contents: 'testing testing'
        }
      }
    ];

    // Insert vectors with auxiliary data
    vectors.forEach(v => {
      vec0.upsert('test_vectors', v.id, v.embedding, { 
        auxiliaryData: v.auxiliaryData 
      });
    });

    // Search and verify auxiliary data is returned
    const results = vec0.search('test_vectors', [1, 0, 0], { limit: 2 });

    expect(results).toHaveLength(2);
    expect(results[0].id).toBe('vec1');
    expect(results[0].auxiliaryData).toEqual({
      contents: 'hello world'
    });
    expect(results[1].id).toBe('vec2');
    expect(results[1].auxiliaryData).toEqual({
      contents: 'testing testing'
    });
  });

  test('combines auxiliary columns with partitions', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      partitionBy: true,
      auxiliaryColumns: [
        { name: 'contents' }
      ]
    });

    const vectors = [
      { 
        id: 'vec1', 
        embedding: [1, 0, 0],
        partition: 'A',
        auxiliaryData: {
          contents: 'first chunk'
        }
      },
      { 
        id: 'vec2', 
        embedding: [0, 1, 0],
        partition: 'B',
        auxiliaryData: {
          contents: 'second chunk'
        }
      }
    ];

    // Insert vectors with both partition and auxiliary data
    vectors.forEach(v => {
      vec0.upsert('test_vectors', v.id, v.embedding, { 
        partition: v.partition,
        auxiliaryData: v.auxiliaryData 
      });
    });

    // Search in partition A and verify auxiliary data
    const resultsA = vec0.search('test_vectors', [1, 0, 0], { 
      limit: 1,
      partition: 'A'
    });

    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].id).toBe('vec1');
    expect(resultsA[0].auxiliaryData).toEqual({
      contents: 'first chunk'
    });

    // Search in partition B and verify auxiliary data
    const resultsB = vec0.search('test_vectors', [1, 0, 0], {
      limit: 1,
      partition: 'B'
    });

    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].id).toBe('vec2');
    expect(resultsB[0].auxiliaryData).toEqual({
      contents: 'second chunk'
    });
  });

  test('batch upserts vectors with auxiliary data', () => {
    vec0.createTable({
      name: 'test_vectors',
      dimensions: 3,
      auxiliaryColumns: [
        { name: 'contents' }
      ]
    });

    const vectors = [
      { 
        id: 'vec1', 
        embedding: [1, 0, 0],
        auxiliaryData: {
          contents: 'first chunk'
        }
      },
      { 
        id: 'vec2', 
        embedding: [0, 1, 0],
        auxiliaryData: {
          contents: 'second chunk'
        }
      }
    ];

    const result = vec0.batchUpsert('test_vectors', vectors);

    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.errors).toHaveLength(0);

    // Verify auxiliary data was stored
    const searchResults = vec0.search('test_vectors', [1, 0, 0], { limit: 2 });
    expect(searchResults[0].auxiliaryData).toEqual({ contents: 'first chunk' });
    expect(searchResults[1].auxiliaryData).toEqual({ contents: 'second chunk' });
  });
}); 