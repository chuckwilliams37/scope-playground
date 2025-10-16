/**
 * Scenario Storage Service
 * 
 * Manages scenario persistence using localStorage with a clean abstraction
 * for future backend integration. Implements LRU pruning to keep ≤50 scenarios.
 */

import { nanoid } from 'nanoid';
import type { Scenario, ScenarioSummary, ScenarioImportResult } from '../types/scenario';

const STORAGE_KEY = 'scope.scenarios.v1';
const MAX_SCENARIOS = 50;

/**
 * Storage interface for pluggable backends
 */
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Default localStorage adapter
 */
const localStorageAdapter: StorageAdapter = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(key);
  }
};

/**
 * Scenario Store Service
 */
class ScenarioStore {
  private adapter: StorageAdapter;

  constructor(adapter: StorageAdapter = localStorageAdapter) {
    this.adapter = adapter;
  }

  /**
   * Get all scenarios from storage
   */
  private getAll(): Scenario[] {
    try {
      const data = this.adapter.getItem(STORAGE_KEY);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load scenarios:', error);
      return [];
    }
  }

  /**
   * Save all scenarios to storage
   */
  private saveAll(scenarios: Scenario[]): void {
    try {
      this.adapter.setItem(STORAGE_KEY, JSON.stringify(scenarios));
    } catch (error) {
      console.error('Failed to save scenarios:', error);
      throw new Error('Failed to save scenarios to storage');
    }
  }

  /**
   * Prune scenarios using LRU (Least Recently Updated)
   * Keeps only the MAX_SCENARIOS most recently updated scenarios
   */
  private pruneIfNeeded(scenarios: Scenario[]): Scenario[] {
    if (scenarios.length <= MAX_SCENARIOS) {
      return scenarios;
    }

    // Sort by updatedAt descending (most recent first)
    const sorted = [...scenarios].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Keep only the most recent MAX_SCENARIOS
    return sorted.slice(0, MAX_SCENARIOS);
  }

  /**
   * List all scenarios (summary view)
   */
  list(): ScenarioSummary[] {
    const scenarios = this.getAll();
    
    return scenarios
      .map(s => ({
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt,
        createdAt: s.createdAt
      }))
      .sort((a, b) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }

  /**
   * Get a specific scenario by ID
   */
  get(id: string): Scenario | null {
    const scenarios = this.getAll();
    return scenarios.find(s => s.id === id) || null;
  }

  /**
   * Save a scenario (create or update)
   * Updates the updatedAt timestamp and prunes if needed
   */
  save(scenario: Partial<Scenario> & { name: string; payload: any }): Scenario {
    const scenarios = this.getAll();
    const now = new Date().toISOString();
    
    // Check if updating existing scenario
    const existingIndex = scenario.id 
      ? scenarios.findIndex(s => s.id === scenario.id)
      : -1;

    const savedScenario: Scenario = {
      id: scenario.id || nanoid(),
      name: scenario.name,
      createdAt: existingIndex >= 0 ? scenarios[existingIndex].createdAt : now,
      updatedAt: now,
      version: "1",
      payload: scenario.payload
    };

    if (existingIndex >= 0) {
      // Update existing
      scenarios[existingIndex] = savedScenario;
    } else {
      // Add new
      scenarios.push(savedScenario);
    }

    // Prune and save
    const pruned = this.pruneIfNeeded(scenarios);
    this.saveAll(pruned);

    return savedScenario;
  }

  /**
   * Remove a scenario by ID
   */
  remove(id: string): boolean {
    const scenarios = this.getAll();
    const filtered = scenarios.filter(s => s.id !== id);
    
    if (filtered.length === scenarios.length) {
      return false; // Scenario not found
    }

    this.saveAll(filtered);
    return true;
  }

  /**
   * Import scenarios from JSON
   * Validates and merges with existing scenarios
   */
  import(json: string): ScenarioImportResult {
    const result: ScenarioImportResult = {
      success: [],
      errors: []
    };

    try {
      const parsed = JSON.parse(json);
      const importData = Array.isArray(parsed) ? parsed : [parsed];

      importData.forEach((item, index) => {
        try {
          // Validate scenario structure
          if (!item.name || !item.payload) {
            throw new Error('Invalid scenario: missing name or payload');
          }

          // Generate new ID to avoid conflicts
          const scenario = this.save({
            name: item.name,
            payload: item.payload
          });

          result.success.push(scenario);
        } catch (error) {
          result.errors.push({
            index,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      });

      return result;
    } catch (error) {
      result.errors.push({
        index: -1,
        error: 'Invalid JSON format'
      });
      return result;
    }
  }

  /**
   * Export a scenario as JSON string
   * If no ID provided, exports all scenarios
   */
  export(id?: string): string {
    if (id) {
      const scenario = this.get(id);
      if (!scenario) {
        throw new Error(`Scenario not found: ${id}`);
      }
      return JSON.stringify(scenario, null, 2);
    }

    // Export all scenarios
    const scenarios = this.getAll();
    return JSON.stringify(scenarios, null, 2);
  }

  /**
   * Clear all scenarios (useful for testing)
   */
  clear(): void {
    this.adapter.removeItem(STORAGE_KEY);
  }

  /**
   * Get count of scenarios
   */
  count(): number {
    return this.getAll().length;
  }
}

// Export singleton instance
export const scenarioStore = new ScenarioStore();

// Export class for testing with custom adapters
export { ScenarioStore };
export type { StorageAdapter };
