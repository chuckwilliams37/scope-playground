/**
 * Scenario type definitions
 * Scenarios capture the complete state of the app for save/load functionality
 */

export type ScenarioVersion = "1";

export interface ScenarioMatrix {
  positions: Record<string, { x: number; y: number; w: number; h: number }>;
  view?: string;
}

export interface ScenarioSettings {
  clientSafe: boolean;
  estimation?: Record<string, unknown>;
}

export interface ScenarioPayload {
  stories: any[]; // Story type from your app
  settings: ScenarioSettings;
  matrix: ScenarioMatrix;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: ScenarioVersion;
  payload: ScenarioPayload;
}

export interface ScenarioSummary {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
}

export interface ScenarioImportResult {
  success: Scenario[];
  errors: Array<{ index: number; error: string }>;
}
