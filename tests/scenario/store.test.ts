/**
 * Scenario Store Tests
 * Tests CRUD operations, import/export, and LRU pruning
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { ScenarioStore, type StorageAdapter } from '../../services/scenarioStore';
import type { Scenario } from '../../types/scenario';

// Mock storage adapter for testing
class MockStorageAdapter implements StorageAdapter {
  private storage: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.storage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    this.storage.set(key, value);
  }

  removeItem(key: string): void {
    this.storage.delete(key);
  }

  clear(): void {
    this.storage.clear();
  }
}

describe('ScenarioStore', () => {
  let store: ScenarioStore;
  let adapter: MockStorageAdapter;

  beforeEach(() => {
    adapter = new MockStorageAdapter();
    store = new ScenarioStore(adapter);
  });

  describe('CRUD Operations', () => {
    it('should create a new scenario', () => {
      const scenario = store.save({
        name: 'Test Scenario',
        payload: {
          stories: [],
          settings: { clientSafe: false },
          matrix: { positions: {} }
        }
      });

      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Test Scenario');
      expect(scenario.version).toBe('1');
      expect(scenario.createdAt).toBeDefined();
      expect(scenario.updatedAt).toBeDefined();
    });

    it('should list all scenarios', () => {
      store.save({ name: 'Scenario 1', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      store.save({ name: 'Scenario 2', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });

      const list = store.list();
      expect(list).toHaveLength(2);
      expect(list[0].name).toBeDefined();
      expect(list[0].updatedAt).toBeDefined();
    });

    it('should get a specific scenario by ID', () => {
      const saved = store.save({
        name: 'Test Scenario',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      });

      const retrieved = store.get(saved.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(saved.id);
      expect(retrieved?.name).toBe('Test Scenario');
    });

    it('should update an existing scenario', () => {
      const saved = store.save({
        name: 'Original Name',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      });

      const originalCreatedAt = saved.createdAt;
      
      // Wait a bit to ensure different timestamp
      const updated = store.save({
        id: saved.id,
        name: 'Updated Name',
        payload: { stories: [], settings: { clientSafe: true }, matrix: { positions: {} } }
      });

      expect(updated.id).toBe(saved.id);
      expect(updated.name).toBe('Updated Name');
      expect(updated.createdAt).toBe(originalCreatedAt);
      expect(updated.updatedAt).not.toBe(saved.updatedAt);
    });

    it('should delete a scenario', () => {
      const saved = store.save({
        name: 'To Delete',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      });

      const removed = store.remove(saved.id);
      expect(removed).toBe(true);

      const retrieved = store.get(saved.id);
      expect(retrieved).toBeNull();
    });

    it('should return false when deleting non-existent scenario', () => {
      const removed = store.remove('non-existent-id');
      expect(removed).toBe(false);
    });

    it('should get count of scenarios', () => {
      expect(store.count()).toBe(0);

      store.save({ name: 'S1', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      expect(store.count()).toBe(1);

      store.save({ name: 'S2', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      expect(store.count()).toBe(2);
    });
  });

  describe('Import/Export', () => {
    it('should export a single scenario as JSON', () => {
      const saved = store.save({
        name: 'Export Test',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      });

      const json = store.export(saved.id);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe(saved.id);
      expect(parsed.name).toBe('Export Test');
      expect(parsed.version).toBe('1');
    });

    it('should export all scenarios as JSON', () => {
      store.save({ name: 'S1', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      store.save({ name: 'S2', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });

      const json = store.export();
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('should import a single scenario', () => {
      const scenario = {
        name: 'Imported Scenario',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      };

      const json = JSON.stringify(scenario);
      const result = store.import(json);

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.success[0].name).toBe('Imported Scenario');
    });

    it('should import multiple scenarios', () => {
      const scenarios = [
        { name: 'S1', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } },
        { name: 'S2', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } }
      ];

      const json = JSON.stringify(scenarios);
      const result = store.import(json);

      expect(result.success).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle invalid JSON during import', () => {
      const result = store.import('invalid json');

      expect(result.success).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Invalid JSON');
    });

    it('should handle invalid scenario structure during import', () => {
      const invalid = [
        { name: 'Valid', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } },
        { name: 'Invalid' }, // Missing payload
        { payload: {} } // Missing name
      ];

      const json = JSON.stringify(invalid);
      const result = store.import(json);

      expect(result.success).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });

    it('should round-trip export and import', () => {
      const original = store.save({
        name: 'Round Trip Test',
        payload: {
          stories: [{ id: '1', title: 'Test Story' }],
          settings: { clientSafe: true, estimation: { factor: 1.5 } },
          matrix: { positions: { '1': { x: 0, y: 0, w: 1, h: 1 } }, view: 'grid' }
        }
      });

      const exported = store.export(original.id);
      store.clear();
      
      const imported = store.import(exported);

      expect(imported.success).toHaveLength(1);
      expect(imported.success[0].name).toBe(original.name);
      expect(imported.success[0].payload).toEqual(original.payload);
    });
  });

  describe('LRU Pruning', () => {
    it('should keep scenarios under MAX_SCENARIOS limit', () => {
      // Create 55 scenarios (over the 50 limit)
      for (let i = 0; i < 55; i++) {
        store.save({
          name: `Scenario ${i}`,
          payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
        });
      }

      const count = store.count();
      expect(count).toBe(50);
    });

    it('should keep most recently updated scenarios', () => {
      // Create 51 scenarios
      const scenarios: Scenario[] = [];
      for (let i = 0; i < 51; i++) {
        const s = store.save({
          name: `Scenario ${i}`,
          payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
        });
        scenarios.push(s);
      }

      // The first scenario should be pruned (oldest)
      const firstScenario = store.get(scenarios[0].id);
      expect(firstScenario).toBeNull();

      // The last scenario should still exist (newest)
      const lastScenario = store.get(scenarios[50].id);
      expect(lastScenario).not.toBeNull();
    });

    it('should update LRU order when scenario is modified', () => {
      // Create 50 scenarios
      const scenarios: Scenario[] = [];
      for (let i = 0; i < 50; i++) {
        const s = store.save({
          name: `Scenario ${i}`,
          payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
        });
        scenarios.push(s);
      }

      // Update the first scenario (making it most recent)
      store.save({
        id: scenarios[0].id,
        name: 'Updated First Scenario',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      });

      // Add one more scenario (should prune the second oldest, not the first)
      store.save({
        name: 'New Scenario',
        payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } }
      });

      // First scenario should still exist (was updated)
      const firstScenario = store.get(scenarios[0].id);
      expect(firstScenario).not.toBeNull();
      expect(firstScenario?.name).toBe('Updated First Scenario');

      // Second scenario should be pruned
      const secondScenario = store.get(scenarios[1].id);
      expect(secondScenario).toBeNull();
    });
  });

  describe('Sorting', () => {
    it('should list scenarios sorted by updatedAt descending', () => {
      const s1 = store.save({ name: 'S1', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      const s2 = store.save({ name: 'S2', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      const s3 = store.save({ name: 'S3', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });

      const list = store.list();

      // Most recent should be first
      expect(list[0].id).toBe(s3.id);
      expect(list[1].id).toBe(s2.id);
      expect(list[2].id).toBe(s1.id);
    });
  });

  describe('Clear', () => {
    it('should clear all scenarios', () => {
      store.save({ name: 'S1', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });
      store.save({ name: 'S2', payload: { stories: [], settings: { clientSafe: false }, matrix: { positions: {} } } });

      expect(store.count()).toBe(2);

      store.clear();

      expect(store.count()).toBe(0);
      expect(store.list()).toHaveLength(0);
    });
  });
});
