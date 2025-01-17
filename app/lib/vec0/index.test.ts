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
}); 